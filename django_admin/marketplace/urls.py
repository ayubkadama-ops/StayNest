from django.urls import path

from . import views

app_name = 'marketplace'

urlpatterns = [
    path('', views.home, name='home'),
    path('properties/', views.properties, name='properties'),
    path('properties/<int:listing_id>/', views.property_detail, name='property-detail'),
    path('agents/', views.agents, name='agents'),
    path('agents/<int:agent_id>/', views.agent_detail, name='agent-detail'),
    path('account/', views.account, name='account'),
    path('login/', views.login_page, name='login'),
    path('signup/', views.signup_page, name='signup'),
    path('account/dashboard/', views.tenant_dashboard, name='tenant-dashboard'),
    path('agent/', views.agent_workspace, name='agent-workspace'),
    path('api/<path:api_path>', views.api_proxy, name='api-proxy'),
    path('media/<path:media_path>', views.media_proxy, name='media-proxy'),
    path('vendor/<path:asset_path>', views.vendor_proxy, name='vendor-proxy'),
    path('health/', views.health, name='health'),
]
