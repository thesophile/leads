import random
import re

from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import can

from .models import Branch, Category, Source


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'code', 'name']


class SourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Source
        fields = ['id', 'code', 'name']


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


def generate_category_code(name):
    prefix = re.sub(r'[^A-Za-z]', '', name)[:2].upper() or 'CT'
    base = f'{prefix}'
    existing = set(Category.objects.filter(code__startswith=base).values_list('code', flat=True))
    for _ in range(100):
        candidate = f'{base}{random.randint(10, 99)}'
        if candidate not in existing:
            return candidate
    return f'{base}{random.randint(100, 999)}'


def generate_source_code(name):
    prefix = re.sub(r'[^A-Za-z]', '', name)[:2].upper() or 'SC'
    base = f'{prefix}'
    existing = set(Source.objects.filter(code__startswith=base).values_list('code', flat=True))
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
        return Response(status=status.HTTP_204_NO_CONTENT)


class CategoryListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        categories = Category.objects.all().order_by('name')
        return Response(CategorySerializer(categories, many=True).data)

    def post(self, request):
        if not can(request.user, 'category.manage'):
            return Response(
                {'detail': 'You do not have permission to create categories.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        name = request.data.get('name', '').strip()
        if not name:
            return Response(
                {'detail': 'name: This field is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if Category.objects.filter(name__iexact=name).exists():
            return Response(
                {'detail': f'name: A category named "{name}" already exists.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        category = Category.objects.create(
            name=name,
            code=generate_category_code(name),
        )
        return Response(CategorySerializer(category).data, status=status.HTTP_201_CREATED)


class CategoryDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        try:
            return Category.objects.get(pk=pk)
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
                name__iexact=name
            ).exclude(pk=category.pk).exists():
                return Response(
                    {'detail': f'name: A category named "{name}" already exists.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            category.name = name
        category.save()
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
        return Response(status=status.HTTP_204_NO_CONTENT)


class SourceListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sources = Source.objects.all().order_by('name')
        return Response(SourceSerializer(sources, many=True).data)

    def post(self, request):
        if not can(request.user, 'source.manage'):
            return Response(
                {'detail': 'You do not have permission to create sources.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        name = request.data.get('name', '').strip()
        if not name:
            return Response(
                {'detail': 'name: This field is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if Source.objects.filter(name__iexact=name).exists():
            return Response(
                {'detail': f'name: A source named "{name}" already exists.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        source = Source.objects.create(
            name=name,
            code=generate_source_code(name),
        )
        return Response(SourceSerializer(source).data, status=status.HTTP_201_CREATED)


class SourceDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        try:
            return Source.objects.get(pk=pk)
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
                name__iexact=name
            ).exclude(pk=source.pk).exists():
                return Response(
                    {'detail': f'name: A source named "{name}" already exists.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            source.name = name
        source.save()
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
        return Response(status=status.HTTP_204_NO_CONTENT)