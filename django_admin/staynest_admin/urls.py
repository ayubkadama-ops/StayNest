from django.urls import include, path

urlpatterns = [
	path('admin/', include('console.urls')),
	path('', include('console.urls')),
]
