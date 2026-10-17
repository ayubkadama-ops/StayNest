from django.http import JsonResponse
from django.urls import path
from . import views

app_name = 'console'

urlpatterns = [
    path('health/', lambda request: JsonResponse({'ok': True, 'service': 'staynest-django-admin'}), name='health'),
    path('', views.dashboard, name='dashboard'),
    path('users/<int:user_id>/', views.user_detail, name='user-detail'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('action/<str:action>/', views.action, name='action'),
]
