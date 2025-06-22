from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ManagedCalendarViewSet

router = DefaultRouter()
router.register(r'calendars', ManagedCalendarViewSet, basename='managedcalendar')

urlpatterns = [
    path('', include(router.urls)),
]