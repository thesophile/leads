import random
import re

from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Branch


def is_admin(user):
    return bool(
        user
        and user.is_authenticated
        and (user.is_superuser or getattr(user, 'role', '') == 'admin')
    )


class BranchSerializer(serializers.ModelSerializer):
    company = serializers.SerializerMethodField()

    class Meta:
        model = Branch
        fields = ['id', 'code', 'name', 'address', 'company']

    def get_company(self, obj):
        return obj.company.name if obj.company else ''


def generate_branch_code(name):
    prefix = re.sub(r'[^A-Za-z]', '', name)[:2].upper() or 'BR'
    base = f'{prefix}'
    existing = set(Branch.objects.filter(code__startswith=base).values_list('code', flat=True))
    for _ in range(100):
        candidate = f'{base}{random.randint(10, 99)}'
        if candidate not in existing:
            return candidate
    return f'{base}{random.randint(100, 999)}'


class BranchListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        branches = Branch.objects.all()
        if not getattr(request.user, 'is_superuser', False):
            branches = branches.filter(company=request.user.company)
        return Response(BranchSerializer(branches.order_by('name'), many=True).data)

    def post(self, request):
        if not is_admin(request.user):
            return Response(
                {'detail': 'You do not have permission to create branches.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        company = getattr(request.user, 'company', None)
        if company is None:
            return Response(
                {'detail': 'A company is required to create a branch.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        name = request.data.get('name', '').strip()
        address = request.data.get('address', '').strip()
        if not name:
            return Response(
                {'detail': 'name: This field is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        branch = Branch.objects.create(
            company=company,
            name=name,
            address=address,
            code=generate_branch_code(name),
        )
        return Response(BranchSerializer(branch).data, status=status.HTTP_201_CREATED)


class BranchDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        queryset = Branch.objects.all()
        if not getattr(self.request.user, 'is_superuser', False):
            queryset = queryset.filter(company=self.request.user.company)
        try:
            return queryset.get(pk=pk)
        except Branch.DoesNotExist:
            return None

    def patch(self, request, pk):
        if not is_admin(request.user):
            return Response(
                {'detail': 'You do not have permission to edit branches.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        branch = self.get_object(pk)
        if branch is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        name = request.data.get('name')
        address = request.data.get('address')
        if name is not None:
            name = name.strip()
            if not name:
                return Response(
                    {'detail': 'name: This field may not be blank.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            branch.name = name
        if address is not None:
            branch.address = address.strip()
        branch.save()
        return Response(BranchSerializer(branch).data)

    def delete(self, request, pk):
        if not is_admin(request.user):
            return Response(
                {'detail': 'You do not have permission to delete branches.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        branch = self.get_object(pk)
        if branch is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            branch.delete()
        except Exception:
            return Response(
                {'detail': 'This branch is in use and cannot be deleted.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)