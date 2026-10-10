from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from rest_framework import serializers

from . import core_client, services
from .core_client import CoreError, bearer_token
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
    seal = serializers.SerializerMethodField()

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
            'seal',
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

    def get_seal(self, obj):
        if not obj.seal:
            return ''
        try:
            return obj.seal.url
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

        request = self.context.get('request')
        company_name = validated_data.pop('company').strip()
        company_email = validated_data.pop('company_email', '')
        company_phone = validated_data.pop('company_phone', '')
        company_gstin = validated_data.pop('company_gstin', '') or ''
        password = validated_data.pop('password')
        validated_data.pop('password2', None)
        email = validated_data.get('email', '')
        name = validated_data.get('name', '')
        phone = validated_data.get('phone', '')

        # Create the Core identity first — Core owns credentials.
        try:
            core_user = core_client.register_user(email, name, phone, password)
        except CoreError as exc:
            raise serializers.ValidationError({'email': exc.message})

        company, created = Company.objects.get_or_create(name=company_name)
        if created or not company.email:
            company.email = company_email
            company.phone = company_phone
            company.gstin = company_gstin
            company.save(update_fields=['email', 'phone', 'gstin'])

        access = bearer_token(request) if request else None
        if not company.core_org_id:
            try:
                org = core_client.create_organization(company_name, access)
                company.core_org_id = org['id']
                company.save(update_fields=['core_org_id'])
            except CoreError:
                pass
        if company.core_org_id:
            try:
                core_client.create_membership(core_user['id'], company.core_org_id, access, role='admin')
            except CoreError:
                pass

        validated_data['core_user_id'] = core_user['id']
        validated_data['role'] = company.roles.filter(code='admin').first()
        validated_data['is_staff'] = True
        # Intentionally NOT a superuser: this endpoint is publicly reachable,
        # so the registering company admin must not get cross-tenant access.
        user = User.objects.create_user(company=company, password=None, **validated_data)
        # Grant LEADS access so the new company admin can sign in immediately.
        services.push_access_to_core(user, actor=request.user if request else user, access=access)
        return user


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

    def update(self, instance, validated_data):
        actor = self.context.get('request').user if self.context.get('request') else None
        request = self.context.get('request')
        instance = super().update(instance, validated_data)
        core_fields = {
            key: validated_data[key]
            for key in ('name', 'phone', 'email')
            if key in validated_data
        }
        if instance.core_user_id and core_fields:
            try:
                core_client.patch_user(
                    instance.core_user_id, core_fields, actor=actor,
                    access=bearer_token(request),
                )
            except CoreError:
                pass
        return instance


class StaffCreateSerializer(serializers.ModelSerializer):
    """Add staff without a password.

    The Core identity is created with no usable password and as inactive; it
    stays locked until a Core admin sets a password and activates the account.
    """

    mobile = serializers.CharField(write_only=True, required=False, allow_blank=True)
    branch = serializers.CharField(write_only=True, required=False, allow_blank=True)
    role = serializers.PrimaryKeyRelatedField(queryset=Role.objects.none(), required=False, allow_null=True)

    class Meta:
        model = User
        fields = ['name', 'email', 'phone', 'mobile', 'branch', 'role']

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
            # Authority is measured through the permission system only: a role
            # may be granted to someone only if every permission it carries is
            # one the caller already holds. The Admin role carries the full
            # catalog, so only an Admin (or a platform superuser) can assign it.
            if not owner.is_superuser and role.permission_names - owner.get_permissions():
                raise serializers.ValidationError(
                    {'role': 'You cannot assign a role with permissions you do not have yourself.'}
                )
        return attrs

    def create(self, validated_data):
        from .models import User as UserModel

        request = self.context['request']
        owner = request.user
        company = owner.company
        mobile = validated_data.pop('mobile', '') or validated_data.get('phone', '')
        branch_name = validated_data.pop('branch', '') or ''
        email = validated_data.get('email', '')
        name = validated_data.get('name', '')
        phone = validated_data.get('phone', '')
        role = validated_data.get('role')

        # Create the Core identity (no password, inactive) + LEADS access.
        provisioned = services.provision_staff(
            company, email, name, phone, role, actor=owner, access=bearer_token(request)
        )
        if provisioned is None:
            raise serializers.ValidationError(
                {'email': 'Unable to create the SystemSoft identity. Check that the company is linked to SystemSoft.'}
            )
        validated_data['core_user_id'] = provisioned['id']

        user = UserModel.objects.create_user(
            **validated_data,
            company=company,
            password=None,
            is_active=False,
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
        request = self.context.get('request')
        actor = request.user if request else None
        target = self.instance

        # A user may only administer another staff record whose authority is
        # equal or below their own (measured through the permission system).
        if (
            actor is not None
            and target is not None
            and target.pk
            and not actor.can_manage(target)
        ):
            raise serializers.ValidationError(
                {'detail': 'You cannot manage a user with greater authority than your own.'}
            )

        new_email = attrs.get('email')
        if (
            new_email is not None
            and target is not None
            and target.email
            and new_email != target.email
            and actor is not None
            and actor.pk == target.pk
        ):
            # Self-service email changes go through the OTP flow: the code is
            # sent to the new address and the new email is only persisted once
            # it is verified. Never let the plain staff edit path change it.
            raise serializers.ValidationError({
                'email': (
                    'To change your own email, use the verification flow — '
                    'a one-time code will be sent to your new email address.'
                )
            })

        role = attrs.get('role')
        if role is not None and actor is not None and target is not None and actor.pk == target.pk:
            # A user can never change their own role / permissions.
            if role != target.role:
                raise serializers.ValidationError(
                    {'role': 'You cannot change your own role.'}
                )

        if role is not None and actor is not None and not actor.is_superuser:
            # Equal or lower authority is allowed; never grant more than the
            # caller holds. The Admin (system) role carries the full catalog,
            # so only an Admin may assign it to another user.
            if role.permission_names - actor.get_permissions():
                raise serializers.ValidationError(
                    {'role': 'You cannot assign a role with permissions you do not have yourself.'}
                )

        # You cannot lock yourself out of your own account.
        if (
            attrs.get('is_active') is False
            and target is not None
            and actor is not None
            and actor.pk == target.pk
        ):
            raise serializers.ValidationError(
                {'detail': 'You cannot deactivate your own account.'}
            )

        # Block deactivating a staff member only while work still depends on
        # them:
        #   * raw leads they entered that nobody has been assigned yet
        #     (assigning them moves the lead out of the raw stage), and
        #   * tele-call leads currently assigned to them (reassign those).
        # Leads that have moved past those stages (quotation / order / client)
        # keep the assignee as a historical snapshot and cannot be reassigned,
        # so they must not block deactivation.
        if attrs.get('is_active') is False and target is not None and target.pk:
            from transactions.models import Lead

            raw_added = Lead.objects.filter(
                tenant=target.company,
                added_by=target.name,
                status=Lead.STATUS_RAW,
            ).count()
            assigned = Lead.objects.filter(
                tenant=target.company,
                assigned_to=target.name,
                status=Lead.STATUS_ASSIGNED,
            ).count()
            if raw_added or assigned:
                parts = []
                if raw_added:
                    parts.append(f'{raw_added} raw lead(s) they added')
                if assigned:
                    parts.append(f'{assigned} lead(s) assigned to them')
                raise serializers.ValidationError(
                    {'detail': (
                        f'{target.name} still has ' + ' and '.join(parts) +
                        '. Assign/reassign those leads before deactivating this account.'
                    )}
                )
        return attrs

    def update(self, instance, validated_data):
        mobile = validated_data.pop('mobile', None)
        branch_name = validated_data.pop('branch', None)
        role = validated_data.pop('role', None)
        actor = self.context.get('request').user if self.context.get('request') else None

        if mobile is not None:
            validated_data['phone'] = mobile
        if role is not None:
            validated_data['role'] = role

        role_changed = role is not None and instance.role_id != (role.pk if role else None)
        active_changed = 'is_active' in validated_data
        access_token = bearer_token(self.context.get('request'))
        instance = super().update(instance, validated_data)

        # Keep the Core identity in sync with local name/phone/email. Is-active
        # is NOT pushed to the Core identity; deactivation only disables the
        # LEADS access grant below.
        core_fields = {
            key: validated_data[key]
            for key in ('name', 'email', 'phone')
            if key in validated_data
        }
        if core_fields and instance.core_user_id:
            try:
                core_client.patch_user(
                    instance.core_user_id, core_fields, actor=actor, access=access_token
                )
            except CoreError:
                pass

        if role_changed or active_changed:
            services.push_access_to_core(instance, actor=actor, access=access_token)

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
