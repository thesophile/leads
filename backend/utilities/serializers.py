from rest_framework import serializers

from .models import Notification


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
