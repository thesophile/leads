from rest_framework import serializers

from .models import CallHistory, Lead, Quotation


class CallHistorySerializer(serializers.ModelSerializer):
    dateTime = serializers.CharField(source='date_time', read_only=True)
    followUp = serializers.CharField(source='follow_up', read_only=True)

    class Meta:
        model = CallHistory
        fields = ['id', 'dateTime', 'caller', 'report', 'followUp', 'status']


class QuotationSerializer(serializers.ModelSerializer):
    leadId = serializers.CharField(source='lead_id', required=False, allow_blank=True)
    qtnBy = serializers.CharField(source='qtn_by', required=False, allow_blank=True)
    netAmount = serializers.CharField(source='net_amount', required=False, allow_blank=True)
    proposalScope = serializers.CharField(source='proposal_scope', required=False, allow_blank=True)
    termsConditions = serializers.CharField(source='terms_conditions', required=False, allow_blank=True)

    class Meta:
        model = Quotation
        fields = [
            'id',
            'leadId',
            'customer',
            'company',
            'mobile',
            'email',
            'category',
            'city',
            'bdm',
            'qtnBy',
            'staff',
            'date',
            'status',
            'total',
            'discount',
            'netAmount',
            'currency',
            'source',
            'proposalScope',
            'termsConditions',
            'remarks',
        ]


class LeadSerializer(serializers.ModelSerializer):
    history = CallHistorySerializer(many=True, read_only=True)
    quotation = serializers.SerializerMethodField()
    displayDate = serializers.CharField(source='display_date', required=False, allow_blank=True)
    addedBy = serializers.CharField(source='added_by', required=False, allow_blank=True)
    assignedTo = serializers.CharField(source='assigned_to', required=False, allow_blank=True)
    callStatus = serializers.CharField(source='call_status', required=False, allow_blank=True)
    lastCallDate = serializers.CharField(source='last_call_date', required=False, allow_blank=True)
    nextFollowUpDate = serializers.CharField(source='next_follow_up_date', required=False, allow_blank=True)
    nextFollowUpTime = serializers.CharField(source='next_follow_up_time', required=False, allow_blank=True)
    hasFollowUp = serializers.BooleanField(source='has_follow_up', required=False)

    class Meta:
        model = Lead
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
            'assignedTo',
            'status',
            'callStatus',
            'priority',
            'remarks',
            'lastCallDate',
            'nextFollowUpDate',
            'nextFollowUpTime',
            'hasFollowUp',
            'history',
            'quotation',
        ]

    def get_quotation(self, obj):
        quotations = self.context.get('quotations')
        if quotations is not None:
            quotation = quotations.get(obj.id)
            if quotation is None:
                return None
            return QuotationSerializer(quotation).data
        quotation = Quotation.objects.filter(lead_id=obj.id).first()
        if quotation is None:
            return None
        return QuotationSerializer(quotation).data