import json
import ipaddress
import os
import re
from functools import wraps
from datetime import timedelta

import bcrypt
from django.contrib import messages
from django.db import connection, transaction
from django.http import Http404, HttpResponseForbidden
from django.shortcuts import redirect, render
from django.utils import timezone
from django.utils.http import url_has_allowed_host_and_scheme
from django.views.decorators.cache import never_cache
from urllib.parse import urlparse
from django.views.decorators.http import require_http_methods

SECTIONS = {'overview', 'users', 'access', 'agents', 'listings', 'posts', 'badges', 'bookings', 'verifications', 'reports', 'audit', 'settings', 'analytics'}
SETTING_KEYS = {'site_name', 'site_logo_url', 'contact_email', 'contact_phone', 'social_facebook_url', 'social_instagram_url', 'social_linkedin_url', 'social_tiktok_url', 'social_whatsapp_url', 'social_youtube_url', 'timezone', 'maintenance_mode', 'maintenance_message'}
ROLES = {'tenant', 'agent', 'administrator'}

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
        [action_name, entity_type, entity_id, 'django-admin', json.dumps(metadata or {})],
    )

def invalidate_api_sessions(user_id):
    for row in rows('SELECT sid,data FROM web_sessions'):
        try:
            session_user_id = int(json.loads(row['data']).get('user', {}).get('id') or 0)
        except (TypeError, ValueError, json.JSONDecodeError):
            continue
        if session_user_id == int(user_id):
            execute('DELETE FROM web_sessions WHERE sid=%s', [row['sid']])

def admin_required(view):
    @wraps(view)
    def wrapped(request, *args, **kwargs):
        if not request.session.get('admin_authenticated'):
            return redirect(f'/admin/login/?next={request.path}')
        return view(request, *args, **kwargs)
    return wrapped

def login_view(request):
    if request.session.get('admin_authenticated'):
        return redirect('/admin/')
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
            request.session.cycle_key()
            request.session['admin_authenticated'] = True
            request.session['admin_label'] = username
            next_url = request.GET.get('next', '')
            if not url_has_allowed_host_and_scheme(next_url, allowed_hosts={request.get_host()}, require_https=request.is_secure()):
                next_url = '/admin/'
            return redirect(next_url)
        messages.error(request, 'Invalid administrator credentials.')
    return render(request, 'login.html')

@require_http_methods(['POST'])
def logout_view(request):
    request.session.flush()
    return redirect('/admin/login/')

@admin_required
@never_cache
def dashboard(request):
    section = request.GET.get('section', 'overview')
    if section not in SECTIONS:
        section = 'overview'
    data = {'section': section, 'sections': [('overview', 'Founder dashboard'), ('users', 'People and access'), ('access', 'Roles and security'), ('agents', 'Agent approvals'), ('listings', 'Listings moderation'), ('posts', 'Posts moderation'), ('badges', 'Agent badges'), ('bookings', 'Reservations'), ('verifications', 'Identity checks'), ('reports', 'Safety reports'), ('audit', 'Audit and security'), ('settings', 'Settings and controls'), ('analytics', 'Analytics')], 'agent_decisions': [('approved', 'Approve'), ('rejected', 'Reject')], 'stats': {}, 'rows': [], 'access_rows': [], 'agents': [], 'badges': [], 'reports': [], 'settings': [], 'footer_settings': [], 'features': [], 'templates': [], 'rules': [], 'error': '', 'marketplace_url': os.getenv('MARKETPLACE_URL', 'http://127.0.0.1:8000').rstrip('/')}
    try:
        if section == 'overview':
            data['stats'] = {
                'Total people': scalar("SELECT COUNT(*) FROM users WHERE status!='deleted'"),
                'Pending accounts': scalar("SELECT COUNT(*) FROM users WHERE status='pending'"),
                'Agent approvals': scalar("SELECT COUNT(DISTINCT u.id) FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE r.name='agent' AND u.status='pending'"),
                'Active agents': scalar("SELECT COUNT(*) FROM user_roles ur JOIN roles r ON r.id=ur.role_id JOIN users u ON u.id=ur.user_id WHERE r.name='agent' AND u.status='active'"),
                'Published homes': scalar("SELECT COUNT(*) FROM listings WHERE status='published'"),
                'Pending bookings': scalar("SELECT COUNT(*) FROM bookings WHERE status='pending'"),
                'Audit events today': scalar('SELECT COUNT(*) FROM audit_logs WHERE created_at>=UTC_DATE()'),
            }
            data['rows'] = rows("SELECT u.id,u.email,u.status,u.created_at,COALESCE(p.display_name,CONCAT(p.first_name,' ',p.last_name),u.email) name FROM users u LEFT JOIN user_profiles p ON p.user_id=u.id WHERE u.status IN ('pending','suspended') ORDER BY u.created_at DESC LIMIT 20")
        elif section == 'users':
            data['rows'] = rows("SELECT u.id,u.email,u.phone,u.status,u.last_login_at,COALESCE(p.display_name,CONCAT(p.first_name,' ',p.last_name),u.email) name,COALESCE(GROUP_CONCAT(DISTINCT r.name SEPARATOR ', '),'') roles FROM users u LEFT JOIN user_profiles p ON p.user_id=u.id LEFT JOIN user_roles ur ON ur.user_id=u.id LEFT JOIN roles r ON r.id=ur.role_id GROUP BY u.id,u.email,u.phone,u.status,u.last_login_at,p.display_name,p.first_name,p.last_name ORDER BY u.created_at DESC LIMIT 200")
        elif section == 'access':
            data['access_rows'] = rows("SELECT u.id,u.email,u.status,u.mfa_enabled,COALESCE(p.display_name,CONCAT(p.first_name,' ',p.last_name),u.email) name FROM users u LEFT JOIN user_profiles p ON p.user_id=u.id ORDER BY u.created_at DESC LIMIT 200")
            roles_by_user = {}
            for assigned_role in rows('SELECT ur.user_id,r.name FROM user_roles ur JOIN roles r ON r.id=ur.role_id'):
                roles_by_user.setdefault(assigned_role['user_id'], []).append(assigned_role['name'])
            for user in data['access_rows']:
                user['assigned_roles'] = roles_by_user.get(user['id'], [])
        elif section == 'agents':
            data['agents'] = rows("SELECT u.id,u.email,u.status user_status,COALESCE(p.display_name,CONCAT(p.first_name,' ',p.last_name),u.email) name,sa.id subaccount_id,sa.label,sa.status subaccount_status,COALESCE(mp.display_name,CONCAT(mp.first_name,' ',mp.last_name),main.email) main_agent FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id LEFT JOIN user_profiles p ON p.user_id=u.id LEFT JOIN agent_subaccounts sa ON sa.subagent_user_id=u.id LEFT JOIN users main ON main.id=sa.main_agent_user_id LEFT JOIN user_profiles mp ON mp.user_id=main.id WHERE r.name='agent' AND (u.status='pending' OR sa.status IN ('pending','active','suspended','revoked')) ORDER BY u.created_at DESC LIMIT 200")
        elif section == 'listings':
            data['rows'] = rows("SELECT l.id,l.title,l.city,l.status,l.currency,l.nightly_price,l.monthly_price,l.updated_at,COALESCE(p.display_name,CONCAT(p.first_name,' ',p.last_name),u.email) owner_name FROM listings l JOIN users u ON u.id=l.owner_user_id LEFT JOIN user_profiles p ON p.user_id=u.id ORDER BY l.updated_at DESC LIMIT 200")
        elif section == 'posts':
            data['rows'] = rows("SELECT po.id,po.post_type,po.caption,po.status,po.created_at,l.title listing_title FROM posts po JOIN listings l ON l.id=po.listing_id ORDER BY po.created_at DESC LIMIT 200")
        elif section == 'badges':
            data['badges'] = rows("SELECT u.id,u.email,COALESCE(p.display_name,CONCAT(p.first_name,' ',p.last_name),u.email) name,ab.badge_label,ab.expires_at FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id LEFT JOIN user_profiles p ON p.user_id=u.id LEFT JOIN agent_badges ab ON ab.agent_user_id=u.id AND ab.starts_at<=UTC_TIMESTAMP() AND (ab.expires_at IS NULL OR ab.expires_at>UTC_TIMESTAMP()) WHERE r.name='agent' AND u.status='active' ORDER BY name LIMIT 200")
        elif section == 'bookings':
            data['rows'] = rows("SELECT b.id,b.booking_code,b.status,b.check_in,b.check_out,b.total_amount,b.currency,l.title,COALESCE(gp.display_name,guest.email) guest_name,COALESCE(hp.display_name,host.email) host_name FROM bookings b JOIN listings l ON l.id=b.listing_id JOIN users guest ON guest.id=b.guest_user_id LEFT JOIN user_profiles gp ON gp.user_id=guest.id JOIN users host ON host.id=b.host_user_id LEFT JOIN user_profiles hp ON hp.user_id=host.id ORDER BY b.created_at DESC LIMIT 200")
        elif section == 'verifications':
            data['rows'] = rows("SELECT v.id,v.status,v.document_type,v.created_at,u.email,COALESCE(p.display_name,CONCAT(p.first_name,' ',p.last_name),u.email) applicant_name FROM identity_verifications v JOIN users u ON u.id=v.user_id LEFT JOIN user_profiles p ON p.user_id=u.id ORDER BY v.created_at DESC LIMIT 200")
        elif section == 'reports':
            data['reports'] = rows("SELECT r.id,r.entity_type,r.entity_id,r.reason,r.details,r.status,r.created_at,reporter.email reporter_email,reported.email reported_email FROM user_reports r JOIN users reporter ON reporter.id=r.reporter_user_id LEFT JOIN users reported ON reported.id=r.reported_user_id ORDER BY r.created_at DESC LIMIT 300")
        elif section == 'audit':
            data['rows'] = rows("SELECT id,action,entity_type,entity_id,created_at,metadata FROM audit_logs ORDER BY created_at DESC LIMIT 300")
        elif section == 'settings':
            all_settings = rows('SELECT setting_key,setting_value,updated_at FROM app_settings ORDER BY setting_key')
            footer_labels = {
                'contact_email': 'Public contact email',
                'contact_phone': 'Public contact phone',
                'social_facebook_url': 'Facebook page URL',
                'social_instagram_url': 'Instagram profile URL',
                'social_linkedin_url': 'LinkedIn page URL',
                'social_tiktok_url': 'TikTok profile URL',
                'social_whatsapp_url': 'WhatsApp link',
                'social_youtube_url': 'YouTube channel URL',
            }
            data['footer_settings'] = []
            data['settings'] = []
            for setting in all_settings:
                key = setting['setting_key']
                if key in footer_labels:
                    setting['setting_label'] = footer_labels[key]
                    data['footer_settings'].append(setting)
                else:
                    data['settings'].append(setting)
            data['features'] = rows('SELECT feature_key,enabled,description FROM feature_flags ORDER BY feature_key')
            data['templates'] = rows('SELECT template_key,subject,body FROM email_templates ORDER BY template_key')
            data['rules'] = rows('SELECT id,rule_type,cidr,label,enabled FROM admin_ip_rules ORDER BY created_at DESC')
        elif section == 'analytics':
            data['stats'] = {
                'Accounts created, last 30 days': scalar('SELECT COUNT(*) FROM users WHERE created_at>=UTC_DATE()-INTERVAL 30 DAY'),
                'Listings submitted, last 30 days': scalar('SELECT COUNT(*) FROM listings WHERE created_at>=UTC_DATE()-INTERVAL 30 DAY'),
                'Bookings created, last 30 days': scalar('SELECT COUNT(*) FROM bookings WHERE created_at>=UTC_DATE()-INTERVAL 30 DAY'),
                'Messages sent, last 30 days': scalar('SELECT COUNT(*) FROM messages WHERE created_at>=UTC_DATE()-INTERVAL 30 DAY'),
            }
    except Exception as error:
        data['error'] = f'Admin data unavailable: {error}'
    return render(request, 'dashboard.html', data)

@admin_required
@never_cache
def user_detail(request, user_id):
    user_rows = rows(
        """SELECT u.id,u.email,u.phone,u.status,u.email_verified_at,u.phone_verified_at,
                  u.mfa_enabled,u.last_login_at,u.created_at,u.updated_at,u.deleted_at,
                  p.first_name,p.last_name,COALESCE(p.display_name,CONCAT(p.first_name,' ',p.last_name),u.email) name,
                  p.city,p.country_code,p.bio,p.avatar_url
           FROM users u LEFT JOIN user_profiles p ON p.user_id=u.id WHERE u.id=%s""",
        [user_id],
    )
    if not user_rows:
        raise Http404('User not found')

    user = user_rows[0]
    roles = [item['name'] for item in rows(
        'SELECT r.name FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=%s ORDER BY r.name',
        [user_id],
    )]
    is_agent = 'agent' in roles
    is_tenant = 'tenant' in roles
    context = {
        'section': 'user-detail',
        'sections': [('overview', 'Founder dashboard'), ('users', 'People and access'), ('access', 'Roles and security'), ('agents', 'Agent approvals'), ('listings', 'Listings moderation'), ('posts', 'Posts moderation'), ('badges', 'Agent badges'), ('bookings', 'Reservations'), ('verifications', 'Identity checks'), ('reports', 'Safety reports'), ('audit', 'Audit and security'), ('settings', 'Settings and controls'), ('analytics', 'Analytics')],
        'agent_decisions': [('approved', 'Approve'), ('rejected', 'Reject')],
        'user': user,
        'user_roles': roles,
        'is_agent': is_agent,
        'is_tenant': is_tenant,
        'is_administrator': 'administrator' in roles,
        'agent_profile': None,
        'agent_subaccounts': [],
        'user_badges': [],
        'user_listings': [],
        'user_bookings': [],
        'user_verifications': [],
        'user_audit': [],
        'saved_homes': 0,
        'marketplace_url': os.getenv('MARKETPLACE_URL', 'http://127.0.0.1:8000').rstrip('/'),
    }
    if is_agent:
        profile_rows = rows(
            'SELECT phone,bio,agency_name,followers_count,following_count,created_at,updated_at FROM agent_profiles WHERE user_id=%s',
            [user_id],
        )
        context['agent_profile'] = profile_rows[0] if profile_rows else None
        context['user_listings'] = rows(
            'SELECT id,title,city,status,updated_at FROM listings WHERE owner_user_id=%s OR agent_user_id=%s ORDER BY updated_at DESC LIMIT 30',
            [user_id, user_id],
        )
        context['user_badges'] = rows(
            'SELECT badge_label,starts_at,expires_at FROM agent_badges WHERE agent_user_id=%s AND starts_at<=UTC_TIMESTAMP() AND (expires_at IS NULL OR expires_at>UTC_TIMESTAMP()) ORDER BY starts_at DESC',
            [user_id],
        )
        context['agent_subaccounts'] = rows(
            """SELECT sa.id,sa.label,sa.status,sa.created_at,child.id user_id,
                      COALESCE(p.display_name,CONCAT(p.first_name,' ',p.last_name),child.email) name,
                      child.email,CASE WHEN sa.main_agent_user_id=%s THEN 'Sub-agent' ELSE 'Managed by' END relation
               FROM agent_subaccounts sa JOIN users main ON main.id=sa.main_agent_user_id
               JOIN users child ON child.id=sa.subagent_user_id
               LEFT JOIN user_profiles p ON p.user_id=child.id
               WHERE sa.main_agent_user_id=%s OR sa.subagent_user_id=%s ORDER BY sa.created_at DESC""",
            [user_id, user_id, user_id],
        )
    if is_tenant or is_agent:
        context['user_bookings'] = rows(
            """SELECT b.id,b.booking_code,b.status,b.check_in,b.check_out,b.total_amount,b.currency,
                      l.title,CASE WHEN b.guest_user_id=%s THEN 'Tenant' ELSE 'Agent' END relation
               FROM bookings b JOIN listings l ON l.id=b.listing_id
               WHERE b.guest_user_id=%s OR b.host_user_id=%s ORDER BY b.created_at DESC LIMIT 30""",
            [user_id, user_id, user_id],
        )
    if is_tenant:
        context['saved_homes'] = scalar('SELECT COUNT(*) FROM saved_listings WHERE user_id=%s', [user_id])
    context['user_verifications'] = rows(
        'SELECT id,document_type,status,created_at,reviewed_at,expires_at,rejection_reason FROM identity_verifications WHERE user_id=%s ORDER BY created_at DESC LIMIT 20',
        [user_id],
    )
    context['user_audit'] = rows(
        "SELECT action,entity_type,entity_id,created_at,metadata FROM audit_logs WHERE entity_type='user' AND entity_id=%s ORDER BY created_at DESC LIMIT 20",
        [user_id],
    )
    return render(request, 'user_detail.html', context)

@admin_required
@require_http_methods(['POST'])
def action(request, action):
    try:
        with transaction.atomic():
            if action == 'user-status':
                user_id = int(request.POST['id']); status = request.POST['status']
                if status not in {'active', 'suspended', 'deleted'}: raise ValueError('Invalid user status')
                admin_rows = rows("SELECT 1 administrator FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=%s AND r.name='administrator'", [user_id])
                if status != 'active' and admin_rows and scalar("SELECT COUNT(*) FROM user_roles ur JOIN roles r ON r.id=ur.role_id JOIN users u ON u.id=ur.user_id WHERE r.name='administrator' AND u.status='active'") <= 1:
                    raise ValueError('The last active administrator cannot be deactivated')
                execute('UPDATE users SET status=%s,deleted_at=IF(%s=\'deleted\',UTC_TIMESTAMP(),NULL) WHERE id=%s', [status, status, user_id]); audit(f'user_{status}', 'user', user_id)
                execute('UPDATE agent_subaccounts SET status=%s WHERE subagent_user_id=%s', [{'active': 'active', 'suspended': 'suspended', 'deleted': 'revoked'}[status], user_id])
                if status != 'active':
                    invalidate_api_sessions(user_id)
            elif action == 'user-role':
                user_id = int(request.POST['id']); role = request.POST.get('role', ''); operation = request.POST.get('operation', 'assign')
                if user_id < 1 or role not in ROLES or operation not in {'assign', 'remove'}: raise ValueError('Invalid role action')
                role_rows = rows('SELECT id FROM roles WHERE name=%s', [role])
                if not role_rows: raise ValueError('Role not found')
                if operation == 'remove':
                    if role == 'administrator' and scalar("SELECT COUNT(*) FROM user_roles ur JOIN roles r ON r.id=ur.role_id JOIN users u ON u.id=ur.user_id WHERE r.name='administrator' AND u.status='active'") <= 1:
                        raise ValueError('The last active administrator cannot be removed')
                    execute('DELETE ur FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=%s AND r.name=%s', [user_id, role])
                else:
                    if role in {'tenant', 'agent'}:
                        execute('DELETE ur FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=%s AND r.name IN (\'tenant\',\'agent\')', [user_id])
                    execute('INSERT IGNORE INTO user_roles (user_id,role_id,assigned_by) VALUES (%s,%s,NULL)', [user_id, role_rows[0]['id']])
                    if role == 'agent': execute('INSERT IGNORE INTO agent_profiles (user_id) VALUES (%s)', [user_id])
                invalidate_api_sessions(user_id)
                audit(f'user_role_{operation}', 'user', user_id, {'role': role})
            elif action == 'mfa-reset':
                user_id = int(request.POST['id'])
                if user_id < 1: raise ValueError('Invalid user ID')
                execute('UPDATE users SET mfa_enabled=FALSE,mfa_secret_encrypted=NULL WHERE id=%s', [user_id])
                invalidate_api_sessions(user_id)
                audit('user_mfa_reset', 'user', user_id)
            elif action == 'agent-status':
                user_id = int(request.POST['id']); status = request.POST.get('status', '')
                if user_id < 1 or status not in {'approved', 'rejected'}: raise ValueError('Invalid agent decision')
                agent_rows = rows("SELECT u.id,sa.id subaccount_id FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id LEFT JOIN agent_subaccounts sa ON sa.subagent_user_id=u.id WHERE u.id=%s AND r.name='agent' AND u.status='pending'", [user_id])
                if not agent_rows: raise ValueError('Pending agent or sub-agent not found')
                next_user_status = 'active' if status == 'approved' else 'suspended'
                execute('UPDATE users SET status=%s WHERE id=%s', [next_user_status, user_id])
                if agent_rows[0]['subaccount_id']:
                    execute('UPDATE agent_subaccounts SET status=%s WHERE id=%s', ['active' if status == 'approved' else 'revoked', agent_rows[0]['subaccount_id']])
                audit(f'agent_{status}', 'user', user_id)
            elif action == 'badge':
                user_id = int(request.POST['id']); duration = request.POST.get('duration', '30'); label = request.POST.get('label', 'Featured agent').strip()[:80] or 'Featured agent'
                if user_id < 1 or duration not in {'7', '30', '90', '365', 'forever', 'remove'}: raise ValueError('Choose a valid badge duration')
                agents = rows("SELECT u.id FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE u.id=%s AND r.name='agent' AND u.status='active'", [user_id])
                if not agents: raise ValueError('Active agent not found')
                execute('UPDATE agent_badges SET expires_at=UTC_TIMESTAMP() WHERE agent_user_id=%s AND (expires_at IS NULL OR expires_at>UTC_TIMESTAMP())', [user_id])
                if duration != 'remove':
                    expires_at = None if duration == 'forever' else timezone.now() + timedelta(days=int(duration))
                    execute('INSERT INTO agent_badges (agent_user_id,badge_label,starts_at,expires_at,assigned_by) VALUES (%s,%s,UTC_TIMESTAMP(),%s,NULL)', [user_id, label, expires_at])
                audit('agent_badge_updated', 'user', user_id, {'label': label, 'duration': duration})
            elif action == 'report-status':
                report_id = int(request.POST['id']); status = request.POST.get('status', '')
                if report_id < 1 or status not in {'open', 'reviewing', 'resolved', 'dismissed'}: raise ValueError('Invalid report status or ID')
                execute('UPDATE user_reports SET status=%s WHERE id=%s', [status, report_id])
                audit(f'report_{status}', 'user_report', report_id)
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
            elif action == 'email-template':
                template_key = request.POST.get('key', '').strip()
                subject = request.POST.get('subject', '').strip()
                body = request.POST.get('body', '').strip()
                if not re.fullmatch(r'[a-z0-9_.-]{1,80}', template_key): raise ValueError('Invalid email template key')
                if not subject or len(subject) > 255 or not body or len(body) > 20000: raise ValueError('Enter a subject and body within the allowed lengths')
                execute('INSERT INTO email_templates (template_key,subject,body,updated_by) VALUES (%s,%s,%s,NULL) ON DUPLICATE KEY UPDATE subject=VALUES(subject),body=VALUES(body),updated_by=NULL', [template_key, subject, body])
                audit('email_template_updated', 'email_template', None, {'templateKey': template_key})
            elif action == 'ip-rule':
                rule_type = request.POST.get('rule_type', '')
                cidr = request.POST.get('cidr', '').strip()
                label = request.POST.get('label', '').strip()[:120] or None
                if rule_type not in {'allow', 'deny'}: raise ValueError('Choose allow or deny for the IP rule')
                try:
                    network = ipaddress.ip_network(cidr, strict=False)
                except ValueError as error:
                    raise ValueError('Enter a valid IP address or CIDR range') from error
                normalized_cidr = str(network)
                execute('INSERT INTO admin_ip_rules (rule_type,cidr,label,enabled,created_by) VALUES (%s,%s,%s,TRUE,NULL)', [rule_type, normalized_cidr, label])
                audit('admin_ip_rule_created', 'admin_ip_rule', None, {'ruleType': rule_type, 'cidr': normalized_cidr})
            elif action == 'ip-rule-delete':
                rule_id = int(request.POST.get('id', '0'))
                if rule_id < 1: raise ValueError('Choose a valid IP rule')
                execute('DELETE FROM admin_ip_rules WHERE id=%s', [rule_id])
                audit('admin_ip_rule_deleted', 'admin_ip_rule', rule_id)
            elif action == 'setting':
                key = request.POST.get('key', '').strip()
                value = request.POST.get('value', '').strip()
                if key not in SETTING_KEYS: raise ValueError('Unknown marketplace setting')
                if key == 'maintenance_mode' and value not in {'0', '1'}: raise ValueError('Invalid maintenance mode value')
                if len(value) > 5000: raise ValueError('Setting value is too long')
                if key.startswith('social_') and value and (urlparse(value).scheme != 'https' or not urlparse(value).netloc): raise ValueError('Social links must use a secure https URL')
                execute('INSERT INTO app_settings (setting_key, setting_value) VALUES (%s, %s) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)', [key, value]); audit('admin_setting_updated', 'app_setting', None, {'key': key})
            else:
                raise ValueError('Unknown admin action')
        messages.success(request, 'Administrative action completed.')
    except Exception as error:
        messages.error(request, str(error))
    return_to = request.POST.get('return_to', '')
    if return_to.startswith('/admin/users/') and return_to.endswith('/') and url_has_allowed_host_and_scheme(return_to, allowed_hosts={request.get_host()}, require_https=request.is_secure()):
        return redirect(return_to)
    return redirect(f'/admin/?section={request.POST.get("section", "overview")}')
