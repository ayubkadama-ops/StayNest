import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR.parent / '.env', override=True)
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY') or os.getenv('SESSION_SECRET', 'change-this-django-secret')
DEBUG = os.getenv('DJANGO_DEBUG', 'false').lower() == 'true'
ALLOWED_HOSTS = [host.strip() for host in os.getenv('DJANGO_ALLOWED_HOSTS', '*').split(',') if host.strip()]
ROOT_URLCONF = 'staynest_admin.urls'
WSGI_APPLICATION = 'staynest_admin.wsgi.application'
INSTALLED_APPS = ['django.contrib.sessions', 'django.contrib.messages', 'django.contrib.staticfiles', 'console']
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
]
TEMPLATES = [{
    'BACKEND': 'django.template.backends.django.DjangoTemplates',
    'DIRS': [BASE_DIR / 'templates'],
    'APP_DIRS': True,
    'OPTIONS': {'context_processors': ['django.template.context_processors.request', 'django.contrib.messages.context_processors.messages']},
}]
DATABASES = {'default': {
    'ENGINE': 'django.db.backends.mysql',
    'NAME': os.getenv('MYSQL_DATABASE', 'staynest'),
    'USER': os.getenv('MYSQL_USER', 'root'),
    'PASSWORD': os.getenv('MYSQL_PASSWORD', ''),
    'HOST': os.getenv('MYSQL_HOST', '127.0.0.1'),
    'PORT': os.getenv('MYSQL_PORT', '3306'),
    'OPTIONS': {'ssl': {} } if os.getenv('MYSQL_SSL', 'false').lower() == 'true' else {},
}}
LANGUAGE_CODE = 'en-us'
TIME_ZONE = os.getenv('TZ', 'UTC')
USE_TZ = True
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
SESSION_COOKIE_NAME = 'staynest.django.sid'
SESSION_COOKIE_SECURE = os.getenv('NODE_ENV') == 'production'
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SECURE = SESSION_COOKIE_SECURE
SESSION_ENGINE = 'django.contrib.sessions.backends.signed_cookies'
CSRF_TRUSTED_ORIGINS = [origin.strip() for origin in os.getenv('DJANGO_CSRF_TRUSTED_ORIGINS', '').split(',') if origin.strip()]
MARKETPLACE_URL = os.getenv('MARKETPLACE_URL', 'http://127.0.0.1:3000').rstrip('/')
