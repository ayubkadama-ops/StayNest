from django.http import JsonResponse
from django.urls import path
from . import views

app_name = 'console'

urlpatterns = [
    path('health/', lambda request: JsonResponse({'ok': True, 'service': 'staynest-django-admin'}), name='health'),
    path('', views.dashboard, name='dashboard'),
    path('users/<int:user_id>/', views.user_detail, name='user-detail'),
    path('listings/<int:listing_id>/', views.listing_detail, name='listing-detail'),
    path('posts/<int:post_id>/', views.post_detail, name='post-detail'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('action/<str:action>/', views.action, name='action'),
]
