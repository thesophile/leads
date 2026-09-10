import random
import re

from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import can
from utilities.models import log_activity

from .models import Branch, Category, Source


def _log(request, action, summary, entity_type='', entity_id=''):
    log_activity(
        request.user,
        getattr(request.user, 'company', None),
        action,
        summary,
        entity_type=entity_type,
        entity_id=entity_id,
    )


class CategorySerializer(serializers.ModelSerializer):
    company = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'code', 'name', 'company']

    def get_company(self, obj):
        return obj.company.name if obj.company else ''


class SourceSerializer(serializers.ModelSerializer):
    company = serializers.SerializerMethodField()

    class Meta:
        model = Source
        fields = ['id', 'code', 'name', 'company']

    def get_company(self, obj):
        return obj.company.name if obj.company else ''


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
    while True:
        candidate = f'{base}{random.randint(100, 999)}'
        if candidate not in existing:
            return candidate


def generate_category_code(name, company=None):
    prefix = re.sub(r'[^A-Za-z]', '', name)[:2].upper() or 'CT'
    base = f'{prefix}'
    qs = Category.objects.all()
    if company is not None:
        qs = qs.filter(company=company)
    existing = set(qs.filter(code__startswith=base).values_list('code', flat=True))
    for _ in range(100):
        candidate = f'{base}{random.randint(10, 99)}'
        if candidate not in existing:
            return candidate
    while True:
        candidate = f'{base}{random.randint(100, 999)}'
        if candidate not in existing:
            return candidate


def generate_source_code(name, company=None):
    prefix = re.sub(r'[^A-Za-z]', '', name)[:2].upper() or 'SC'
    base = f'{prefix}'
    qs = Source.objects.all()
    if company is not None:
        qs = qs.filter(company=company)
    existing = set(qs.filter(code__startswith=base).values_list('code', flat=True))
    for _ in range(100):
        candidate = f'{base}{random.randint(10, 99)}'
        if candidate not in existing:
            return candidate
    while True:
        candidate = f'{base}{random.randint(100, 999)}'
        if candidate not in existing:
            return candidate


class BranchListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        branches = Branch.objects.all()
        if not getattr(request.user, 'is_superuser', False):
            branches = branches.filter(company=request.user.company)
        return Response(BranchSerializer(branches.order_by('name'), many=True).data)

    def post(self, request):
        if not can(request.user, 'branch.manage'):
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
        if Branch.objects.filter(company=company, name__iexact=name).exists():
            return Response(
                {'detail': f'name: A branch named "{name}" already exists in this company.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        branch = Branch.objects.create(
            company=company,
            name=name,
            address=address,
            code=generate_branch_code(name),
        )
        _log(request, 'added branch', f'{request.user.name} added branch {branch.name}.', entity_type='branch', entity_id=str(branch.pk))
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
        if not can(request.user, 'branch.manage'):
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
            if name.lower() != branch.name.lower() and Branch.objects.filter(
                company=branch.company, name__iexact=name
            ).exclude(pk=branch.pk).exists():
                return Response(
                    {'detail': f'name: A branch named "{name}" already exists in this company.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            branch.name = name
        if address is not None:
            branch.address = address.strip()
        branch.save()
        _log(request, 'updated branch', f'{request.user.name} updated branch {branch.name}.', entity_type='branch', entity_id=str(branch.pk))
        return Response(BranchSerializer(branch).data)

    def delete(self, request, pk):
        if not can(request.user, 'branch.manage'):
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
        _log(request, 'deleted branch', f'{request.user.name} deleted branch {branch.name}.', entity_type='branch', entity_id=str(pk))
        return Response(status=status.HTTP_204_NO_CONTENT)


class CategoryListView(APIView):
    permission_classes = [IsAuthenticated]

    def _scoped(self, request):
        qs = Category.objects.all()
        if not getattr(request.user, 'is_superuser', False):
            qs = qs.filter(company=request.user.company)
        return qs

    def get(self, request):
        categories = self._scoped(request).order_by('name')
        return Response(CategorySerializer(categories, many=True).data)

    def post(self, request):
        if not can(request.user, 'category.manage'):
            return Response(
                {'detail': 'You do not have permission to create categories.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        company = getattr(request.user, 'company', None)
        if company is None:
            return Response(
                {'detail': 'A company is required to create a category.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        name = request.data.get('name', '').strip()
        if not name:
            return Response(
                {'detail': 'name: This field is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if Category.objects.filter(company=company, name__iexact=name).exists():
            return Response(
                {'detail': f'name: A category named "{name}" already exists in this company.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        category = Category.objects.create(
            company=company,
            name=name,
            code=generate_category_code(name, company),
        )
        _log(request, 'added category', f'{request.user.name} added category {category.name}.', entity_type='category', entity_id=str(category.pk))
        return Response(CategorySerializer(category).data, status=status.HTTP_201_CREATED)


class CategoryDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        qs = Category.objects.all()
        if not getattr(self.request.user, 'is_superuser', False):
            qs = qs.filter(company=self.request.user.company)
        try:
            return qs.get(pk=pk)
        except Category.DoesNotExist:
            return None

    def patch(self, request, pk):
        if not can(request.user, 'category.manage'):
            return Response(
                {'detail': 'You do not have permission to edit categories.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        category = self.get_object(pk)
        if category is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        name = request.data.get('name')
        if name is not None:
            name = name.strip()
            if not name:
                return Response(
                    {'detail': 'name: This field may not be blank.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if name.lower() != category.name.lower() and Category.objects.filter(
                company=category.company, name__iexact=name
            ).exclude(pk=category.pk).exists():
                return Response(
                    {'detail': f'name: A category named "{name}" already exists in this company.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            category.name = name
        category.save()
        _log(request, 'updated category', f'{request.user.name} updated category {category.name}.', entity_type='category', entity_id=str(category.pk))
        return Response(CategorySerializer(category).data)

    def delete(self, request, pk):
        if not can(request.user, 'category.manage'):
            return Response(
                {'detail': 'You do not have permission to delete categories.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        category = self.get_object(pk)
        if category is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            category.delete()
        except Exception:
            return Response(
                {'detail': 'This category is in use and cannot be deleted.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        _log(request, 'deleted category', f'{request.user.name} deleted category {category.name}.', entity_type='category', entity_id=str(pk))
        return Response(status=status.HTTP_204_NO_CONTENT)


class SourceListView(APIView):
    permission_classes = [IsAuthenticated]

    def _scoped(self, request):
        qs = Source.objects.all()
        if not getattr(request.user, 'is_superuser', False):
            qs = qs.filter(company=request.user.company)
        return qs

    def get(self, request):
        sources = self._scoped(request).order_by('name')
        return Response(SourceSerializer(sources, many=True).data)

    def post(self, request):
        if not can(request.user, 'source.manage'):
            return Response(
                {'detail': 'You do not have permission to create sources.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        company = getattr(request.user, 'company', None)
        if company is None:
            return Response(
                {'detail': 'A company is required to create a source.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        name = request.data.get('name', '').strip()
        if not name:
            return Response(
                {'detail': 'name: This field is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if Source.objects.filter(company=company, name__iexact=name).exists():
            return Response(
                {'detail': f'name: A source named "{name}" already exists in this company.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        source = Source.objects.create(
            company=company,
            name=name,
            code=generate_source_code(name, company),
        )
        _log(request, 'added source', f'{request.user.name} added source {source.name}.', entity_type='source', entity_id=str(source.pk))
        return Response(SourceSerializer(source).data, status=status.HTTP_201_CREATED)


class SourceDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        qs = Source.objects.all()
        if not getattr(self.request.user, 'is_superuser', False):
            qs = qs.filter(company=self.request.user.company)
        try:
            return qs.get(pk=pk)
        except Source.DoesNotExist:
            return None

    def patch(self, request, pk):
        if not can(request.user, 'source.manage'):
            return Response(
                {'detail': 'You do not have permission to edit sources.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        source = self.get_object(pk)
        if source is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        name = request.data.get('name')
        if name is not None:
            name = name.strip()
            if not name:
                return Response(
                    {'detail': 'name: This field may not be blank.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if name.lower() != source.name.lower() and Source.objects.filter(
                company=source.company, name__iexact=name
            ).exclude(pk=source.pk).exists():
                return Response(
                    {'detail': f'name: A source named "{name}" already exists in this company.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            source.name = name
        source.save()
        _log(request, 'updated source', f'{request.user.name} updated source {source.name}.', entity_type='source', entity_id=str(source.pk))
        return Response(SourceSerializer(source).data)

    def delete(self, request, pk):
        if not can(request.user, 'source.manage'):
            return Response(
                {'detail': 'You do not have permission to delete sources.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        source = self.get_object(pk)
        if source is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            source.delete()
        except Exception:
            return Response(
                {'detail': 'This source is in use and cannot be deleted.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        _log(request, 'deleted source', f'{request.user.name} deleted source {source.name}.', entity_type='source', entity_id=str(pk))
        return Response(status=status.HTTP_204_NO_CONTENT)