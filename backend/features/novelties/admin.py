# backend/features/novelties/admin.py
from django.contrib import admin
from .models import NoveltyExecution, NoveltyFailure

@admin.register(NoveltyExecution)
class NoveltyExecutionAdmin(admin.ModelAdmin):
    list_display = [
        'execution_date', 'country', 'status', 'total_processed', 
        'successful', 'failed', 'success_rate', 'execution_time_minutes'
    ]
    list_filter = ['status', 'country', 'execution_date', 'found_pagination']
    search_fields = ['country', 'error_message']
    readonly_fields = ['execution_date', 'success_rate', 'execution_time_minutes']
    date_hierarchy = 'execution_date'
    ordering = ['-execution_date']
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('execution_date', 'country', 'status')
        }),
        ('Estatísticas', {
            'fields': ('total_processed', 'successful', 'failed', 'success_rate', 'tabs_closed')
        }),
        ('Performance', {
            'fields': ('execution_time', 'execution_time_minutes', 'found_pagination')
        }),
        ('Detalhes', {
            'fields': ('error_message', 'details'),
            'classes': ('collapse',)
        }),
    )

@admin.register(NoveltyFailure)
class NoveltyFailureAdmin(admin.ModelAdmin):
    list_display = ['execution', 'item_id', 'error_type', 'timestamp']
    list_filter = ['error_type', 'timestamp', 'execution__country']
    search_fields = ['item_id', 'error_message', 'error_type']
    readonly_fields = ['timestamp']
    date_hierarchy = 'timestamp'
    ordering = ['-timestamp']