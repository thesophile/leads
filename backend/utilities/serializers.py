from rest_framework import serializers

from .models import Notification, StaffTarget
from .targets import compute_staff_done


class StaffTargetSerializer(serializers.ModelSerializer):
    rawLeadsTarget = serializers.IntegerField(source='raw_leads_target', read_only=True)
    callsTarget = serializers.IntegerField(source='calls_target', read_only=True)
    quotationTarget = serializers.IntegerField(source='quotation_target', read_only=True)
    salesTarget = serializers.IntegerField(source='sales_target', read_only=True)
    rawLeadsDone = serializers.SerializerMethodField()
    callsDone = serializers.SerializerMethodField()
    quotationDone = serializers.SerializerMethodField()
    salesDone = serializers.SerializerMethodField()

    class Meta:
        model = StaffTarget
        read_only_fields = ['id', 'tenant']
        fields = [
            'id',
            'name',
            'role',
            'month',
            'year',
            'rawLeadsTarget',
            'callsTarget',
            'quotationTarget',
            'salesTarget',
            'rawLeadsDone',
            'callsDone',
            'quotationDone',
            'salesDone',
        ]

    def get_rawLeadsDone(self, obj):
        return compute_staff_done(obj, 'raw_leads')

    def get_callsDone(self, obj):
        return compute_staff_done(obj, 'calls')

    def get_quotationDone(self, obj):
        return compute_staff_done(obj, 'quotations')

    def get_salesDone(self, obj):
        return compute_staff_done(obj, 'sales')


class StaffTargetWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffTarget
        fields = ['name', 'role', 'month', 'year', 'raw_leads_target', 'calls_target', 'quotation_target', 'sales_target']

    def validate_name(self, value):
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError('Employee name is required.')
        return value

    def validate_month(self, value):
        if not 1 <= value <= 12:
            raise serializers.ValidationError('Month must be between 1 and 12.')
        return value

    def validate_year(self, value):
        if not 2000 <= value <= 2200:
            raise serializers.ValidationError('Year is out of range.')
        return value


class NotificationSerializer(serializers.ModelSerializer):
    created = serializers.SerializerMethodField()
    entityType = serializers.CharField(source='entity_type', required=False, allow_blank=True)
    entityId = serializers.CharField(source='entity_id', required=False, allow_blank=True)

    class Meta:
        model = Notification
        fields = [
            'id',
            'type',
            'title',
            'message',
            'time',
            'url',
            'entityType',
            'entityId',
            'read',
            'created_at',
            'created',
        ]

    def get_created(self, obj):
        return obj.created_at.isoformat() if obj.created_at else None


class NotificationWriteSerializer(serializers.Serializer):
    read = serializers.BooleanField(required=True)
