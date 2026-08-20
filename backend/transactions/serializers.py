from rest_framework import serializers

from .models import RawLead


class RawLeadSerializer(serializers.ModelSerializer):
    displayDate = serializers.CharField(source='display_date', required=False, allow_blank=True)
    addedBy = serializers.CharField(source='added_by', required=False, allow_blank=True)

    class Meta:
        model = RawLead
        fields = [
            'id',
            'company',
            'contact',
            'phone',
            'email',
            'category',
            'source',
            'city',
            'date',
            'displayDate',
            'addedBy',
        ]