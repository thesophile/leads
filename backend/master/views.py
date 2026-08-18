from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Branch


class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = ['id', 'code', 'name']


class BranchListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        branches = Branch.objects.all()
        if not getattr(request.user, 'is_superuser', False):
            branches = branches.filter(company=request.user.company)
        return Response(BranchSerializer(branches.order_by('name'), many=True).data)
