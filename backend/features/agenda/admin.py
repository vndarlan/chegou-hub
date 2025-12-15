from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import ManagedCalendar

@admin.register(ManagedCalendar)
class ManagedCalendarAdmin(ModelAdmin):
    list_display = ('name', 'get_iframe_preview', 'added_at')
    search_fields = ('name', 'iframe_code')
    list_filter = ('added_at',)

    def get_iframe_preview(self, obj):
        if obj.iframe_code:
             return obj.iframe_code[:100] + '...' if len(obj.iframe_code) > 100 else obj.iframe_code
        return "N/A"
    get_iframe_preview.short_description = 'Preview do Iframe'