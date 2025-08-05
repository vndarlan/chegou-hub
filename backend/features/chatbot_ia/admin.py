from django.contrib import admin
from .models import ChatMessage, DocumentCache


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ['user', 'created_at', 'response_time_ms']
    list_filter = ['created_at', 'user']
    search_fields = ['user__username', 'message', 'response']
    readonly_fields = ['created_at', 'response_time_ms']
    ordering = ['-created_at']


@admin.register(DocumentCache)
class DocumentCacheAdmin(admin.ModelAdmin):
    list_display = ['file_path', 'last_modified', 'updated_at']
    list_filter = ['last_modified', 'updated_at']
    search_fields = ['file_path', 'content']
    readonly_fields = ['created_at', 'updated_at']