from rest_framework import serializers

from .models import CallHistory, Lead, ProposalDraft, ProposalTemplate, Quotation, QuotationApproval


class CallHistorySerializer(serializers.ModelSerializer):
    dateTime = serializers.CharField(source='date_time', read_only=True)
    followUp = serializers.CharField(source='follow_up', read_only=True)

    class Meta:
        model = CallHistory
        fields = ['id', 'dateTime', 'caller', 'report', 'followUp', 'status']


class ProposalTemplateSerializer(serializers.ModelSerializer):
    defaultTotal = serializers.CharField(source='default_total', required=False, allow_blank=True)
    defaultDiscount = serializers.CharField(source='default_discount', required=False, allow_blank=True)
    scopeHtml = serializers.CharField(source='scope_html', required=False, allow_blank=True)
    detailHtml = serializers.CharField(source='detail_html', required=False, allow_blank=True)

    class Meta:
        model = ProposalTemplate
        fields = [
            'id',
            'name',
            'category',
            'defaultTotal',
            'defaultDiscount',
            'currency',
            'scopeHtml',
            'detailHtml',
            'owner',
        ]
        read_only_fields = ['id', 'owner']


class ProposalDraftSerializer(serializers.ModelSerializer):
    proposalId = serializers.CharField(source='proposal_id', required=False, allow_blank=True)
    qtnBy = serializers.CharField(source='qtn_by', required=False, allow_blank=True)
    customerPerson = serializers.CharField(source='customer_person', required=False, allow_blank=True)
    companyName = serializers.CharField(source='company_name', required=False, allow_blank=True)
    scopeHtml = serializers.CharField(source='scope_html', required=False, allow_blank=True)
    termsHtml = serializers.CharField(source='terms_html', required=False, allow_blank=True)

    class Meta:
        model = ProposalDraft
        fields = [
            'proposalId',
            'bdm',
            'qtnBy',
            'customerPerson',
            'companyName',
            'mobile',
            'category',
            'scopeHtml',
            'termsHtml',
            'total',
            'discount',
            'source',
            'currency',
            'remarks',
        ]
        read_only_fields = ['user']


class QuotationApprovalSerializer(serializers.ModelSerializer):
    user = serializers.IntegerField(source='user_id', read_only=True)
    userName = serializers.CharField(source='user.name', read_only=True)
    signedBy = serializers.CharField(source='signed_by', read_only=True)
    signatureRef = serializers.CharField(source='signature_ref', read_only=True)
    signedAt = serializers.SerializerMethodField()
    rejectionReason = serializers.CharField(source='rejection_reason', read_only=True)

    class Meta:
        model = QuotationApproval
        fields = [
            'id',
            'user',
            'userName',
            'status',
            'signedBy',
            'signedAt',
            'signatureRef',
            'rejectionReason',
        ]

    def get_signedAt(self, obj):
        if obj.signed_at is None:
            return None
        return obj.signed_at.isoformat()


class QuotationSerializer(serializers.ModelSerializer):
    leadId = serializers.CharField(source='lead_id', required=False, allow_blank=True)
    qtnBy = serializers.CharField(source='qtn_by', required=False, allow_blank=True)
    netAmount = serializers.CharField(source='net_amount', required=False, allow_blank=True)
    proposalScope = serializers.CharField(source='proposal_scope', required=False, allow_blank=True)
    termsConditions = serializers.CharField(source='terms_conditions', required=False, allow_blank=True)
    revisionNo = serializers.CharField(source='revision_no', required=False, allow_blank=True)
    submittedBy = serializers.IntegerField(source='submitted_by_id', required=False, allow_null=True)
    approver = serializers.IntegerField(source='approver_id', required=False, allow_null=True)
    approverName = serializers.CharField(source='approver_name', required=False, allow_blank=True)
    signedBy = serializers.CharField(source='signed_by', required=False, allow_blank=True)
    signatureRef = serializers.CharField(source='signature_ref', required=False, allow_blank=True)
    approvalRequestedAt = serializers.SerializerMethodField()
    approvedAt = serializers.SerializerMethodField()
    rejectedAt = serializers.SerializerMethodField()
    rejectionReason = serializers.CharField(source='rejection_reason', required=False, allow_blank=True)
    approvalNote = serializers.CharField(source='approval_note', required=False, allow_blank=True)
    companyTerms = serializers.SerializerMethodField()
    approvals = serializers.SerializerMethodField()
    approvalsTotal = serializers.SerializerMethodField()
    approvalsApproved = serializers.SerializerMethodField()
    clientStatus = serializers.CharField(source='client_status', read_only=True)
    clientMessage = serializers.CharField(source='client_message', read_only=True)
    clientRespondedAt = serializers.SerializerMethodField()
    sentToClientAt = serializers.SerializerMethodField()

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
            'revisionNo',
            'status',
            'total',
            'discount',
            'netAmount',
            'currency',
            'source',
            'proposalScope',
            'termsConditions',
            'companyTerms',
            'remarks',
            'submittedBy',
            'approver',
            'approverName',
            'signedBy',
            'signatureRef',
            'approvalRequestedAt',
            'approvedAt',
            'rejectedAt',
            'rejectionReason',
            'approvalNote',
            'approvals',
            'approvalsTotal',
            'approvalsApproved',
            'clientStatus',
            'clientMessage',
            'clientRespondedAt',
            'sentToClientAt',
        ]

    def _iso(self, value):
        if value is None:
            return None
        try:
            return value.isoformat()
        except AttributeError:
            return str(value)

    def get_approvalRequestedAt(self, obj):
        return self._iso(obj.approval_requested_at)

    def get_approvedAt(self, obj):
        return self._iso(obj.approved_at)

    def get_rejectedAt(self, obj):
        return self._iso(obj.rejected_at)

    def get_approvals(self, obj):
        approvals = getattr(obj, 'approvals', None)
        if approvals is None:
            approvals = obj.approvals.all()
        return QuotationApprovalSerializer(approvals, many=True).data

    def get_approvalsTotal(self, obj):
        return obj.approvals.count()

    def get_approvalsApproved(self, obj):
        return obj.approvals.filter(status=QuotationApproval.STATUS_APPROVED).count()

    def get_clientRespondedAt(self, obj):
        return self._iso(obj.client_responded_at)

    def get_sentToClientAt(self, obj):
        return self._iso(obj.sent_to_client_at)

    def get_companyTerms(self, obj):
        tenant = getattr(obj, 'tenant', None)
        if tenant is None:
            return ''
        return tenant.terms_html or ''


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