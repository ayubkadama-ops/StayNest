# StayNest Django Admin

This is the Django operations console for the StayNest marketplace. It connects directly to the existing MySQL/TiDB schema and uses the same `ADMIN_GATE_USERNAME` and `ADMIN_GATE_PASSWORD_HASH` gate as the Node marketplace service.

## Local

```powershell
python -m venv django_admin/.venv
.\django_admin\.venv\Scripts\python.exe -m pip install -r django_admin/requirements.txt
.\django_admin\.venv\Scripts\python.exe django_admin/manage.py runserver 127.0.0.1:8001
```

Open `http://127.0.0.1:8001/login/`.

## Render

The root `render.yaml` defines a second web service named `staynest-django-admin`. Configure the same `MYSQL_*` and administrator gate variables used by the marketplace, plus:

- `DJANGO_SECRET_KEY`: generated secret
- `DJANGO_ALLOWED_HOSTS`: the Django service host
- `DJANGO_CSRF_TRUSTED_ORIGINS`: the HTTPS origin of the Django service

The service health endpoint is `/health/`. The Node marketplace remains the public service; the Django console is a separate operations URL connected to the same data and audit records.
