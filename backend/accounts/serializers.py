from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    initials = serializers.CharField(read_only=True)
    staff_code = serializers.SerializerMethodField()
    branch_name = serializers.SerializerMethodField()
    company = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'phone', 'company', 'role', 'initials', 'staff_code', 'branch_name', 'is_active', 'is_superuser', 'date_joined']
        read_only_fields = ['id', 'is_active', 'is_superuser', 'date_joined']

    def get_company(self, obj):
        return obj.company.name if obj.company else ''

    def get_staff_code(self, obj):
        profile = getattr(obj, 'staff_profile', None)
        return profile.code if profile else ''

    def get_branch_name(self, obj):
        profile = getattr(obj, 'staff_profile', None)
        return profile.branch.name if profile and profile.branch else ''


class AdminRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)
    company = serializers.CharField(max_length=200)

    class Meta:
        model = User
        fields = ['company', 'name', 'email', 'phone', 'password', 'password2']

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password2': 'Passwords do not match.'})
        return attrs

    def validate_company(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Company name is required.')
        return value

    def create(self, validated_data):
        from .models import Company

        company_name = validated_data.pop('company').strip()
        company, _ = Company.objects.get_or_create(name=company_name)
        validated_data.pop('password2')
        validated_data['role'] = User.Role.ADMIN
        validated_data['is_staff'] = True
        # Intentionally NOT a superuser: this endpoint is publicly reachable,
        # so the registering company admin must not get cross-tenant access.
        return User.objects.create_user(company=company, **validated_data)


class AdminManageSerializer(serializers.ModelSerializer):
    """Superuser-only: create an admin for an existing or new company."""

    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)
    company = serializers.CharField(max_length=200)

    class Meta:
        model = User
        fields = ['company', 'name', 'email', 'phone', 'password', 'password2']

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password2': 'Passwords do not match.'})
        return attrs

    def validate_company(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Company name is required.')
        return value

    def create(self, validated_data):
        from .models import Company

        company_name = validated_data.pop('company').strip()
        company, _ = Company.objects.get_or_create(name=company_name)
        validated_data.pop('password2')
        validated_data['role'] = User.Role.ADMIN
        validated_data['is_staff'] = True
        # Still never a superuser: platform-level access stays with the
        # superadmin who is creating this account.
        return User.objects.create_user(company=company, **validated_data)


class AdminUpdateSerializer(serializers.ModelSerializer):
    """Superuser-only: edit basic details of an admin account."""

    class Meta:
        model = User
        fields = ['name', 'phone', 'email', 'is_active']


class StaffCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    mobile = serializers.CharField(write_only=True, required=False, allow_blank=True)
    branch = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['name', 'email', 'phone', 'mobile', 'branch', 'role', 'password']

    def validate(self, attrs):
        if attrs.get('role') == User.Role.ADMIN:
            raise serializers.ValidationError({'role': 'Admins cannot be created here.'})
        return attrs

    def create(self, validated_data):
        from .models import User as UserModel
        from master.models import Staff as StaffModel

        owner = self.context['request'].user
        company = owner.company
        mobile = validated_data.pop('mobile', '') or validated_data.get('phone', '')
        branch_name = validated_data.pop('branch', '') or ''

        user = UserModel.objects.create_user(
            **validated_data,
            company=company,
        )

        branch = None
        if branch_name:
            branch = (
                StaffModel._meta.get_field('branch')
                .related_model.objects.filter(name=branch_name, company=company)
                .first()
            )

        code = self._next_staff_code()
        StaffModel.objects.create(
            code=code,
            name=user.name,
            role=user.get_role_display(),
            mobile=mobile,
            email=user.email,
            branch=branch,
            user=user,
        )
        return user

    @staticmethod
    def _next_staff_code():
        from master.models import Staff as StaffModel
        last = StaffModel.objects.order_by('-id').first()
        num = (last.id if last else 0) + 1
        return f'ST{num:03d}'


class StaffUpdateSerializer(serializers.ModelSerializer):
    mobile = serializers.CharField(write_only=True, required=False, allow_blank=True)
    branch = serializers.CharField(write_only=True, required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)

    class Meta:
        model = User
        fields = ['name', 'phone', 'mobile', 'branch', 'role', 'is_active']

    def validate(self, attrs):
        if attrs.get('role') == User.Role.ADMIN:
            raise serializers.ValidationError({'role': 'Admins cannot be reassigned here.'})
        return attrs

    def update(self, instance, validated_data):
        mobile = validated_data.pop('mobile', None)
        branch_name = validated_data.pop('branch', None)
        role = validated_data.pop('role', None)

        if mobile is not None:
            validated_data['phone'] = mobile
        if role is not None:
            validated_data['role'] = role

        instance = super().update(instance, validated_data)

        profile = getattr(instance, 'staff_profile', None)
        if profile:
            if mobile is not None:
                profile.mobile = mobile
            if branch_name is not None:
                branch = None
                if branch_name:
                    branch = profile._meta.get_field('branch').related_model.objects.filter(
                        name=branch_name, company=instance.company
                    ).first()
                profile.branch = branch
            profile.role = instance.get_role_display()
            profile.name = instance.name
            profile.email = instance.email
            profile.save()
        return instance


class PasswordResetByAdminSerializer(serializers.Serializer):
    new_password = serializers.CharField(write_only=True, validators=[validate_password])

    def validate_new_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError('Password must be at least 8 characters.')
        return value


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get('email', '').strip().lower()
        user = authenticate(request=self.context.get('request'), email=email, password=attrs.get('password'))
        if not user:
            raise serializers.ValidationError({'detail': 'Invalid email or password.'})
        if not user.is_active:
            raise serializers.ValidationError({'detail': 'This account has been deactivated. Contact your admin.'})
        attrs['user'] = user
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    new_password2 = serializers.CharField(write_only=True)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError({'new_password2': 'New passwords do not match.'})
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        try:
            self.user = User.objects.get(email__iexact=value)
        except User.DoesNotExist:
            self.user = None
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    email = serializers.EmailField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, validators=[validate_password])

    def validate(self, attrs):
        try:
            user = User.objects.get(email__iexact=attrs['email'])
        except User.DoesNotExist:
            raise serializers.ValidationError({'email': 'No account found with this email.'})
        if not default_token_generator.check_token(user, attrs['token']):
            raise serializers.ValidationError({'token': 'This reset code is invalid or has expired. Please request a new one.'})
        attrs['user'] = user
        return attrs
