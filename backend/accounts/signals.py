from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from .models import User


def _next_staff_code():
    from master.models import Staff

    used = set(Staff.objects.values_list('code', flat=True))
    num = 1
    while f'ST{num:03d}' in used:
        num += 1
    return f'ST{num:03d}'


@receiver(pre_save, sender=User)
def capture_old_name(sender, instance, **kwargs):
    if instance.pk:
        try:
            instance._old_name = User.objects.values_list('name', flat=True).get(pk=instance.pk)
        except User.DoesNotExist:
            instance._old_name = None
    else:
        instance._old_name = None


@receiver(post_save, sender=User)
def keep_staff_profile_in_sync(sender, instance, created, **kwargs):
    # Superusers and company-less accounts have no staff profile row.
    if instance.is_superuser or instance.company_id is None:
        return
    from master.models import Staff

    role_name = instance.role.name if instance.role_id else ''
    profile = Staff.objects.filter(user=instance).first()
    if profile is None:
        Staff.objects.create(
            code=_next_staff_code(),
            name=instance.name,
            email=instance.email,
            role=role_name,
            mobile=instance.phone,
            user=instance,
        )
    else:
        fields = {}
        if profile.name != instance.name:
            fields['name'] = instance.name
        if profile.email != instance.email:
            fields['email'] = instance.email
        if profile.role != role_name:
            fields['role'] = role_name
        if profile.mobile != instance.phone:
            fields['mobile'] = instance.phone
        if fields:
            for key, value in fields.items():
                setattr(profile, key, value)
            profile.save(update_fields=list(fields))

    old_name = getattr(instance, '_old_name', None)
    if old_name and old_name != instance.name:
        from transactions.models import CallHistory, Lead

        Lead.objects.filter(assigned_to=old_name).update(assigned_to=instance.name)
        Lead.objects.filter(added_by=old_name).update(added_by=instance.name)
        CallHistory.objects.filter(caller=old_name).update(caller=instance.name)