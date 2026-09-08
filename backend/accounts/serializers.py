from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from rest_framework import serializers

from .models import Company, Role
from .rbac import FLAT_PERMISSIONS

User = get_user_model()


class CompanySerializer(serializers.ModelSerializer):
    termsSummaryHtml = serializers.CharField(source='terms_summary_html', required=False, allow_blank=True)
    termsFullHtml = serializers.CharField(source='terms_full_html', required=False, allow_blank=True)
    currency = serializers.CharField(source='base_currency', required=False, allow_blank=True)
    gstNo = serializers.CharField(source='gstin', required=False, allow_blank=True)
    defaultBank = serializers.CharField(source='default_bank', required=False, allow_blank=True)
    logo = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = [
            'id',
            'name',
            'email',
            'phone',
            'address',
            'website',
            'logo',
            'termsSummaryHtml',
            'termsFullHtml',
            'currency',
            'gstNo',
            'defaultBank',
        ]

    def get_logo(self, obj):
        if not obj.logo:
            return ''
        try:
            return obj.logo.url
        except Exception:
            return ''


class RoleSerializer(serializers.ModelSerializer):
    users_count = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = ['id', 'code', 'name', 'permissions', 'is_system', 'users_count']
        read_only_fields = ['id', 'code', 'is_system', 'users_count']

    def validate_name(self, value):
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError('Role name is required.')
        return value

    def validate_permissions(self, value):
        unknown = set(value) - FLAT_PERMISSIONS
        if unknown:
            raise serializers.ValidationError(f'Unknown permissions: {sorted(unknown)}')
        return sorted(set(value))

    def get_users_count(self, obj):
        return obj.users.count()


class UserSerializer(serializers.ModelSerializer):
    initials = serializers.CharField(read_only=True)
    staff_code = serializers.SerializerMethodField()
    branch_name = serializers.SerializerMethodField()
    company = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    role_name = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'phone', 'company', 'role', 'role_name', 'permissions', 'initials', 'staff_code', 'branch_name', 'is_active', 'is_superuser', 'date_joined']
        read_only_fields = ['id', 'is_active', 'is_superuser', 'date_joined']

    def get_company(self, obj):
        return obj.company.name if obj.company else ''

    def get_role(self, obj):
        if obj.role_id is None:
            return None
        return {'id': obj.role_id, 'name': obj.role.name, 'code': obj.role.code}

    def get_role_name(self, obj):
        return obj.role.name if obj.role_id else ''

    def get_permissions(self, obj):
        return obj.permissions

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
    company_email = serializers.EmailField(write_only=True)
    company_phone = serializers.CharField(write_only=True)
    company_gstin = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')

    class Meta:
        model = User
        fields = ['company', 'company_email', 'company_phone', 'company_gstin', 'name', 'email', 'phone', 'password', 'password2']

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password2': 'Passwords do not match.'})
        if not attrs.get('company_phone', '').strip():
            raise serializers.ValidationError({'company_phone': 'Company phone number is required.'})
        return attrs

    def validate_company(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Company name is required.')
        from .models import Company

        if Company.objects.filter(name__iexact=value).exists():
            raise serializers.ValidationError(
                'A company with this name is already registered. '
                'Ask your company admin or the platform administrator to create your account instead.'
            )
        return value

    def create(self, validated_data):
        from .models import Company

        company_name = validated_data.pop('company').strip()
        company_email = validated_data.pop('company_email', '')
        company_phone = validated_data.pop('company_phone', '')
        company_gstin = validated_data.pop('company_gstin', '') or ''
        company, created = Company.objects.get_or_create(name=company_name)
        if not created or not company.email:
            company.email = company_email
            company.phone = company_phone
            company.gstin = company_gstin
            company.save(update_fields=['email', 'phone', 'gstin'])
        validated_data.pop('password2')
        validated_data['role'] = company.roles.filter(code='admin').first()
        validated_data['is_staff'] = True
        # Intentionally NOT a superuser: this endpoint is publicly reachable,
        # so the registering company admin must not get cross-tenant access.
        return User.objects.create_user(company=company, **validated_data)


class AdminManageSerializer(AdminRegisterSerializer):
    """Superuser-only: create an admin for an existing or new company.

    Reuses the shared registration logic; the difference is purely the
    permission guard on the calling view. Unlike self-registration, an
    existing company may be reused (verified by the superuser).
    """

    def validate_company(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Company name is required.')
        return value


class AdminUpdateSerializer(serializers.ModelSerializer):
    """Superuser-only: edit basic details of an admin account."""

    class Meta:
        model = User
        fields = ['name', 'phone', 'email', 'is_active']


class StaffCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    mobile = serializers.CharField(write_only=True, required=False, allow_blank=True)
    branch = serializers.CharField(write_only=True, required=False, allow_blank=True)
    role = serializers.PrimaryKeyRelatedField(queryset=Role.objects.none(), required=False, allow_null=True)

    class Meta:
        model = User
        fields = ['name', 'email', 'phone', 'mobile', 'branch', 'role', 'password']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        company = getattr(request.user, 'company', None) if request else None
        if company is not None:
            self.fields['role'].queryset = company.roles.all()

    def validate(self, attrs):
        role = attrs.get('role')
        if role is not None:
            owner = self.context['request'].user
            if role.company != owner.company:
                raise serializers.ValidationError({'role': 'This role does not belong to your company.'})
            if role.is_system:
                raise serializers.ValidationError({'role': 'The system admin role cannot be assigned here.'})
        return attrs

    def create(self, validated_data):
        from .models import User as UserModel

        owner = self.context['request'].user
        company = owner.company
        mobile = validated_data.pop('mobile', '') or validated_data.get('phone', '')
        branch_name = validated_data.pop('branch', '') or ''

        user = UserModel.objects.create_user(
            **validated_data,
            company=company,
        )

        # The staff profile (code/name/role/email/mobile) is created and kept
        # in sync by the accounts post_save signal; only branch is set here.
        profile = user.staff_profile
        if branch_name:
            from master.models import Branch

            profile.branch = Branch.objects.filter(name=branch_name, company=company).first()
        if mobile:
            profile.mobile = mobile
        if profile.branch is not None or mobile:
            profile.save()
        return user


class StaffUpdateSerializer(serializers.ModelSerializer):
    mobile = serializers.CharField(write_only=True, required=False, allow_blank=True)
    branch = serializers.CharField(write_only=True, required=False, allow_blank=True)
    role = serializers.PrimaryKeyRelatedField(queryset=Role.objects.none(), required=False, allow_null=True)
    is_active = serializers.BooleanField(required=False)

    class Meta:
        model = User
        fields = ['name', 'email', 'phone', 'mobile', 'branch', 'role', 'is_active']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        company = getattr(request.user, 'company', None) if request else None
        if company is not None:
            self.fields['role'].queryset = company.roles.all()

    def validate(self, attrs):
        role = attrs.get('role')
        if role is not None and role.is_system:
            raise serializers.ValidationError({'role': 'The system admin role cannot be assigned here.'})

        request = self.context.get('request')
        actor = request.user if request else None
        target = self.instance

        # The company's system-admin account is protected: only the admin
        # themselves (or a platform superuser) may edit it, and never deactivate
        # it. This prevents a manager from demoting/locking out the admin.
        if target is not None and target.pk and target.role_id and target.role.is_system:
            can_edit_admin = actor is not None and (
                actor.is_superuser or actor.pk == target.pk
            )
            if not can_edit_admin:
                raise serializers.ValidationError(
                    {'detail': 'The company admin account cannot be edited by another staff member.'}
                )
            if attrs.get('is_active') is False and not (actor and actor.is_superuser):
                raise serializers.ValidationError(
                    {'detail': 'The company admin account cannot be deactivated.'}
                )

        # Block deactivating a staff member who still owns working leads;
        # leads must be reassigned first so they are not orphaned.
        if attrs.get('is_active') is False and target is not None and target.pk:
            from transactions.models import Lead

            owns_leads = Lead.objects.filter(
                tenant=target.company,
                assigned_to=target.name,
            ).exclude(status='client').exists()
            if owns_leads:
                raise serializers.ValidationError(
                    {'detail': (
                        f'{target.name} still has assigned leads. '
                        'Reassign those leads before deactivating this account.'
                    )}
                )
        return attrs

    def update(self, instance, validated_data):
        mobile = validated_data.pop('mobile', None)
        branch_name = validated_data.pop('branch', None)
        role = validated_data.pop('role', None)

        if mobile is not None:
            validated_data['phone'] = mobile
        if role is not None:
            # If the user being edited is the admin, keep their admin role.
            if instance.role_id and instance.role.is_system:
                pass
            else:
                validated_data['role'] = role

        instance = super().update(instance, validated_data)

        # Rename propagation and profile field sync are handled by the accounts
        # post_save signal; only the branch assignment lives here.
        if branch_name is not None:
            profile = getattr(instance, 'staff_profile', None)
            if profile:
                branch = None
                if branch_name:
                    from master.models import Branch

                    branch = Branch.objects.filter(name=branch_name, company=instance.company).first()
                profile.branch = branch
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
