import os
from functools import wraps

import bcrypt
from django.contrib import messages
from django.db import connection, transaction
from django.http import HttpResponseForbidden
from django.shortcuts import redirect, render
from django.views.decorators.http import require_http_methods

SECTIONS = {'overview', 'users', 'listings', 'posts', 'bookings', 'verifications', 'audit', 'settings', 'analytics'}
SETTING_KEYS = {'site_name', 'site_logo_url', 'contact_email', 'contact_phone', 'timezone', 'maintenance_mode', 'maintenance_message'}

def rows(sql, params=()):
    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        columns = [column[0] for column in cursor.description or []]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]

def scalar(sql, params=()):
    result = rows(sql, params)
    return next(iter(result[0].values()), 0) if result else 0

def execute(sql, params=()):
    with connection.cursor() as cursor:
        cursor.execute(sql, params)

def audit(action_name, entity_type, entity_id=None, metadata=None):
    execute(
        'INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, ip_address, user_agent, metadata) VALUES (NULL, %s, %s, %s, NULL, %s, %s)',
        [action_name, entity_type, entity_id, 'django-admin', str(metadata or {})],
    )

def admin_required(view):
    @wraps(view)
    def wrapped(request, *args, **kwargs):
        if not request.session.get('admin_authenticated'):
            return redirect(f'/login/?next={request.path}')
        return view(request, *args, **kwargs)
    return wrapped

def login_view(request):
    if request.session.get('admin_authenticated'):
        return redirect('/')
    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '').encode()
        expected_username = os.getenv('ADMIN_GATE_USERNAME', '')
        password_hash = os.getenv('ADMIN_GATE_PASSWORD_HASH', '').encode()
        valid = username == expected_username and bool(password_hash)
        try:
            valid = valid and bcrypt.checkpw(password, password_hash)
        except ValueError:
            valid = False
        if valid:
            request.session['admin_authenticated'] = True
            request.session['admin_label'] = username
            return redirect(request.GET.get('next') or '/')
        messages.error(request, 'Invalid administrator credentials.')
    return render(request, 'login.html')

@require_http_methods(['POST'])
def logout_view(request):
    request.session.flush()
    return redirect('/login/')

@admin_required
def dashboard(request):
    section = request.GET.get('section', 'overview')
    if section not in SECTIONS:
        section = 'overview'
    data = {'section': section, 'sections': [('overview', 'Founder dashboard'), ('users', 'People and access'), ('listings', 'Listings moderation'), ('posts', 'Posts and badges'), ('bookings', 'Reservations'), ('verifications', 'Trust and safety'), ('audit', 'Audit and security'), ('settings', 'Settings and controls'), ('analytics', 'Analytics')], 'stats': {}, 'rows': [], 'settings': [], 'features': [], 'templates': [], 'rules': [], 'error': ''}
    try:
        if section == 'overview':
            data['stats'] = {
                'Total people': scalar("SELECT COUNT(*) FROM users WHERE status!='deleted'"),
                'Active agents': scalar("SELECT COUNT(*) FROM user_roles ur JOIN roles r ON r.id=ur.role_id JOIN users u ON u.id=ur.user_id WHERE r.name='agent' AND u.status='active'"),
                'Published homes': scalar("SELECT COUNT(*) FROM listings WHERE status='published'"),
                'Pending bookings': scalar("SELECT COUNT(*) FROM bookings WHERE status='pending'"),
                'Audit events today': scalar('SELECT COUNT(*) FROM audit_logs WHERE created_at>=UTC_DATE()'),
            }
            data['rows'] = rows("SELECT u.id,u.email,u.status,u.created_at,COALESCE(p.display_name,CONCAT(p.first_name,' ',p.last_name),u.email) name FROM users u LEFT JOIN user_profiles p ON p.user_id=u.id WHERE u.status IN ('pending','suspended') ORDER BY u.created_at DESC LIMIT 20")
        elif section == 'users':
            data['rows'] = rows("SELECT u.id,u.email,u.phone,u.status,u.last_login_at,COALESCE(p.display_name,CONCAT(p.first_name,' ',p.last_name),u.email) name,COALESCE(GROUP_CONCAT(DISTINCT r.name SEPARATOR ', '),'') roles FROM users u LEFT JOIN user_profiles p ON p.user_id=u.id LEFT JOIN user_roles ur ON ur.user_id=u.id LEFT JOIN roles r ON r.id=ur.role_id GROUP BY u.id,u.email,u.phone,u.status,u.last_login_at,p.display_name,p.first_name,p.last_name ORDER BY u.created_at DESC LIMIT 200")
        elif section == 'listings':
            data['rows'] = rows("SELECT l.id,l.title,l.city,l.status,l.currency,l.nightly_price,l.monthly_price,l.updated_at,COALESCE(p.display_name,CONCAT(p.first_name,' ',p.last_name),u.email) owner_name FROM listings l JOIN users u ON u.id=l.owner_user_id LEFT JOIN user_profiles p ON p.user_id=u.id ORDER BY l.updated_at DESC LIMIT 200")
        elif section == 'posts':
            data['rows'] = rows("SELECT po.id,po.post_type,po.caption,po.status,po.created_at,l.title listing_title FROM posts po JOIN listings l ON l.id=po.listing_id ORDER BY po.created_at DESC LIMIT 200")
        elif section == 'bookings':
            data['rows'] = rows("SELECT b.id,b.booking_code,b.status,b.check_in,b.check_out,b.total_amount,b.currency,l.title,COALESCE(gp.display_name,guest.email) guest_name,COALESCE(hp.display_name,host.email) host_name FROM bookings b JOIN listings l ON l.id=b.listing_id JOIN users guest ON guest.id=b.guest_user_id LEFT JOIN user_profiles gp ON gp.user_id=guest.id JOIN users host ON host.id=b.host_user_id LEFT JOIN user_profiles hp ON hp.user_id=host.id ORDER BY b.created_at DESC LIMIT 200")
        elif section == 'verifications':
            data['rows'] = rows("SELECT v.id,v.status,v.document_type,v.created_at,u.email,COALESCE(p.display_name,CONCAT(p.first_name,' ',p.last_name),u.email) applicant_name FROM identity_verifications v JOIN users u ON u.id=v.user_id LEFT JOIN user_profiles p ON p.user_id=u.id ORDER BY v.created_at DESC LIMIT 200")
        elif section == 'audit':
            data['rows'] = rows("SELECT id,action,entity_type,entity_id,created_at,metadata FROM audit_logs ORDER BY created_at DESC LIMIT 300")
        elif section == 'settings':
            data['settings'] = rows('SELECT setting_key,setting_value,updated_at FROM app_settings ORDER BY setting_key')
            data['features'] = rows('SELECT feature_key,enabled,description FROM feature_flags ORDER BY feature_key')
            data['templates'] = rows('SELECT template_key,subject FROM email_templates ORDER BY template_key')
            data['rules'] = rows('SELECT id,rule_type,cidr,label,enabled FROM admin_ip_rules ORDER BY created_at DESC')
        elif section == 'analytics':
            data['error'] = 'Analytics remains available through the marketplace GA4 integration.'
    except Exception as error:
        data['error'] = f'Admin data unavailable: {error}'
    return render(request, 'dashboard.html', data)

@admin_required
@require_http_methods(['POST'])
def action(request, action):
    try:
        with transaction.atomic():
            if action == 'user-status':
                user_id = int(request.POST['id']); status = request.POST['status']
                if status not in {'active', 'suspended', 'deleted'}: raise ValueError('Invalid user status')
                execute('UPDATE users SET status=%s WHERE id=%s', [status, user_id]); audit(f'user_{status}', 'user', user_id)
            elif action == 'listing-status':
                listing_id = int(request.POST['id']); status = request.POST['status']
                if status not in {'published', 'rejected', 'unpublished'}: raise ValueError('Invalid listing status')
                execute('UPDATE listings SET status=%s WHERE id=%s', [status, listing_id]); audit(f'listing_{status}', 'listing', listing_id)
            elif action == 'post-status':
                post_id = int(request.POST['id']); status = request.POST['status']
                if status not in {'draft', 'pending_review', 'published'}: raise ValueError('Invalid post status')
                execute('UPDATE posts SET status=%s WHERE id=%s', [status, post_id]); audit(f'post_{status}', 'post', post_id)
            elif action == 'booking-status':
                booking_id = int(request.POST['id']); status = request.POST['status']
                if status not in {'confirmed', 'declined', 'cancelled', 'completed'}: raise ValueError('Invalid booking status')
                execute('UPDATE bookings SET status=%s WHERE id=%s AND status NOT IN (\'completed\',\'cancelled\')', [status, booking_id]); audit(f'booking_{status}', 'booking', booking_id)
            elif action == 'verification-status':
                verification_id = int(request.POST['id']); status = request.POST['status']
                if status not in {'approved', 'rejected'}: raise ValueError('Invalid verification status')
                execute('UPDATE identity_verifications SET status=%s, reviewed_at=UTC_TIMESTAMP(), rejection_reason=%s WHERE id=%s', [status, None if status == 'approved' else 'Rejected by administrator', verification_id]); audit(f'verification_{status}', 'identity_verification', verification_id)
            elif action == 'feature':
                execute('UPDATE feature_flags SET enabled=%s WHERE feature_key=%s', [1 if request.POST.get('enabled') == '1' else 0, request.POST['key']]); audit('feature_updated', 'feature', None, {'key': request.POST['key']})
            elif action == 'setting':
                key = request.POST.get('key', '').strip()
                value = request.POST.get('value', '').strip()
                if key not in SETTING_KEYS: raise ValueError('Unknown marketplace setting')
                if key == 'maintenance_mode' and value not in {'0', '1'}: raise ValueError('Invalid maintenance mode value')
                if len(value) > 5000: raise ValueError('Setting value is too long')
                execute('INSERT INTO app_settings (setting_key, setting_value) VALUES (%s, %s) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)', [key, value]); audit('admin_setting_updated', 'app_setting', None, {'key': key})
            else:
                raise ValueError('Unknown admin action')
        messages.success(request, 'Administrative action completed.')
    except Exception as error:
        messages.error(request, str(error))
    return redirect(f'/?section={request.POST.get("section", "overview")}')
