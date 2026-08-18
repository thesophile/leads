class CompanyScopedAdminMixin:
    """Restrict a ModelAdmin's queryset to the current company.

    Platform superusers (is_superuser=True) retain full visibility; any other
    admin/staff user only sees rows belonging to their own company and can only
    write rows for their own company.

    Set `company_field` to a model field or lookup path (e.g. 'user__company')
    pointing at the company to scope by.
    """

    company_field = 'company'

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if not getattr(request.user, 'is_superuser', False):
            return qs.filter(**{self.company_field: request.user.company})
        return qs

    def save_model(self, request, obj, form, change):
        # Only force the company on direct fields — never on lookup paths like
        # 'user__company' (which would set obj.user = <Company>!).
        if (
            not getattr(request.user, 'is_superuser', False)
            and '__' not in self.company_field
            and hasattr(obj, self.company_field)
        ):
            setattr(obj, self.company_field, request.user.company)
        super().save_model(request, obj, form, change)
