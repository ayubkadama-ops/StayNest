import os
from contextlib import nullcontext
from unittest.mock import patch

from django.test import SimpleTestCase


class AdminConsoleAccessTests(SimpleTestCase):
    def authenticate_admin(self):
        with patch.dict(os.environ, {'ADMIN_GATE_USERNAME': 'founder', 'ADMIN_GATE_PASSWORD_HASH': 'test-hash'}):
            with patch('console.views.bcrypt.checkpw', return_value=True):
                return self.client.post('/admin/login/', {'username': 'founder', 'password': 'test-password'})

    def test_dashboard_redirects_without_admin_session(self):
        response = self.client.get('/admin/')
        self.assertRedirects(response, '/admin/login/?next=/admin/', fetch_redirect_response=False)

    @patch('console.views.rows', return_value=[])
    @patch('console.views.scalar', return_value=0)
    def test_dashboard_is_not_cached_and_exposes_refresh_controls(self, scalar, rows):
        self.authenticate_admin()

        response = self.client.get('/admin/')

        self.assertEqual(response.status_code, 200)
        self.assertIn('no-store', response['Cache-Control'])
        self.assertContains(response, 'id="refreshDashboard"')
        self.assertContains(response, 'Agent approvals')

    @patch.dict(os.environ, {'ADMIN_GATE_USERNAME': 'founder', 'ADMIN_GATE_PASSWORD_HASH': 'test-hash'})
    @patch('console.views.bcrypt.checkpw', return_value=True)
    def test_valid_admin_login_sets_console_session(self, checkpw):
        response = self.client.post('/admin/login/', {'username': 'founder', 'password': 'test-password'})
        self.assertRedirects(response, '/admin/', fetch_redirect_response=False)
        self.assertTrue(self.client.session['admin_authenticated'])
        checkpw.assert_called_once_with(b'test-password', b'test-hash')

    @patch.dict(os.environ, {'ADMIN_GATE_USERNAME': 'founder', 'ADMIN_GATE_PASSWORD_HASH': 'test-hash'})
    @patch('console.views.bcrypt.checkpw', return_value=True)
    def test_admin_login_rejects_external_return_urls(self, checkpw):
        response = self.client.post('/admin/login/?next=https://example.test/', {'username': 'founder', 'password': 'test-password'})
        self.assertRedirects(response, '/admin/', fetch_redirect_response=False)

    def test_admin_action_redirects_without_admin_session(self):
        response = self.client.post('/admin/action/feature/', {'key': 'sample', 'enabled': '1'})
        self.assertRedirects(response, '/admin/login/?next=/admin/action/feature/', fetch_redirect_response=False)

    @patch('console.views.audit')
    @patch('console.views.execute')
    @patch('console.views.transaction.atomic', return_value=nullcontext())
    def test_authenticated_admin_can_submit_a_feature_action(self, atomic, execute, audit):
        self.authenticate_admin()

        response = self.client.post('/admin/action/feature/', {
            'key': 'booking_requests',
            'enabled': '1',
            'section': 'settings',
        })

        self.assertRedirects(response, '/admin/?section=settings', fetch_redirect_response=False)
        execute.assert_called_once_with(
            'UPDATE feature_flags SET enabled=%s WHERE feature_key=%s',
            [1, 'booking_requests'],
        )
        audit.assert_called_once()

    @patch('console.views.audit')
    @patch('console.views.execute')
    @patch('console.views.transaction.atomic', return_value=nullcontext())
    def test_admin_can_edit_a_social_footer_link(self, atomic, execute, audit):
        self.authenticate_admin()
        response = self.client.post('/admin/action/setting/', {
            'key': 'social_instagram_url',
            'value': 'https://instagram.com/makazigo',
            'section': 'settings',
        })
        self.assertRedirects(response, '/admin/?section=settings', fetch_redirect_response=False)
        execute.assert_called_once_with(
            'INSERT INTO app_settings (setting_key, setting_value) VALUES (%s, %s) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)',
            ['social_instagram_url', 'https://instagram.com/makazigo'],
        )
        audit.assert_called_once()

    @patch('console.views.execute')
    @patch('console.views.transaction.atomic', return_value=nullcontext())
    def test_admin_rejects_insecure_social_footer_links(self, atomic, execute):
        self.authenticate_admin()
        response = self.client.post('/admin/action/setting/', {
            'key': 'social_instagram_url', 'value': 'javascript:alert(1)', 'section': 'settings'
        })
        self.assertRedirects(response, '/admin/?section=settings', fetch_redirect_response=False)
        execute.assert_not_called()

    @patch('console.views.rows', side_effect=[
        [{'setting_key': 'social_instagram_url', 'setting_value': 'https://instagram.com/makazigo'}],
        [],
        [],
    ])
    def test_admin_settings_labels_footer_social_controls(self, rows):
        self.authenticate_admin()
        response = self.client.get('/admin/?section=settings')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Marketplace footer')
        self.assertContains(response, 'Instagram profile URL')
        self.assertContains(response, 'type="url"')

    @patch('console.views.rows', side_effect=[
        [{'id': 12, 'email': 'agent@example.test', 'status': 'active', 'mfa_enabled': True, 'name': 'Asha Mrema'}],
        [{'user_id': 12, 'name': 'agent'}],
    ])
    def test_access_page_shows_role_removal_and_mfa_reset_actions(self, rows):
        self.authenticate_admin()
        response = self.client.get('/admin/?section=access')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Remove agent')
        self.assertContains(response, 'Reset MFA')

    @patch('console.views.rows', return_value=[{'id': 21, 'email': 'agent@example.test', 'user_status': 'pending', 'subaccount_id': 33, 'label': 'Bookings', 'subaccount_status': 'pending', 'name': 'Asha', 'main_agent': 'Neema'}])
    def test_agent_approval_page_renders_approve_and_reject_actions(self, rows):
        self.authenticate_admin()
        response = self.client.get('/admin/?section=agents')
        self.assertContains(response, 'Approve')
        self.assertContains(response, 'Reject')
        self.assertContains(response, 'Neema')

    @patch('console.views.rows', return_value=[{'id': 21, 'email': 'agent@example.test', 'name': 'Asha', 'badge_label': None, 'expires_at': None}])
    def test_badge_page_renders_duration_controls(self, rows):
        self.authenticate_admin()
        response = self.client.get('/admin/?section=badges')
        self.assertContains(response, '1 year')
        self.assertContains(response, 'Remove badge')

    @patch('console.views.rows', return_value=[{'id': 42, 'entity_type': 'listing', 'entity_id': 17, 'reason': 'Misleading details', 'details': 'Please review', 'status': 'open', 'created_at': '2026-10-17', 'reporter_email': 'tenant@example.test', 'reported_email': 'agent@example.test'}])
    def test_reports_page_renders_review_statuses(self, rows):
        self.authenticate_admin()
        response = self.client.get('/admin/?section=reports')
        self.assertContains(response, 'Misleading details')
        self.assertContains(response, 'Reviewing')

    @patch('console.views.audit')
    @patch('console.views.execute')
    @patch('console.views.transaction.atomic', return_value=nullcontext())
    def test_admin_can_update_a_safety_report(self, atomic, execute, audit):
        self.authenticate_admin()
        response = self.client.post('/admin/action/report-status/', {'id': '42', 'status': 'resolved', 'section': 'reports'})
        self.assertRedirects(response, '/admin/?section=reports', fetch_redirect_response=False)
        execute.assert_called_once_with('UPDATE user_reports SET status=%s WHERE id=%s', ['resolved', 42])
        audit.assert_called_once()

    @patch('console.views.audit')
    @patch('console.views.execute')
    @patch('console.views.rows', side_effect=[[{'id': 3}], []])
    @patch('console.views.transaction.atomic', return_value=nullcontext())
    def test_admin_can_assign_an_agent_role(self, atomic, rows, execute, audit):
        self.authenticate_admin()
        response = self.client.post('/admin/action/user-role/', {'id': '8', 'role': 'agent', 'operation': 'assign', 'section': 'access'})
        self.assertRedirects(response, '/admin/?section=access', fetch_redirect_response=False)
        execute.assert_any_call('INSERT IGNORE INTO user_roles (user_id,role_id,assigned_by) VALUES (%s,%s,NULL)', [8, 3])
        execute.assert_any_call('INSERT IGNORE INTO agent_profiles (user_id) VALUES (%s)', [8])
        audit.assert_called_once()

    @patch('console.views.audit')
    @patch('console.views.execute')
    @patch('console.views.rows', return_value=[{'id': 21}])
    @patch('console.views.transaction.atomic', return_value=nullcontext())
    def test_admin_can_assign_an_agent_badge(self, atomic, rows, execute, audit):
        self.authenticate_admin()
        response = self.client.post('/admin/action/badge/', {'id': '21', 'label': 'Trusted host', 'duration': '30', 'section': 'badges'})
        self.assertRedirects(response, '/admin/?section=badges', fetch_redirect_response=False)
        execute.assert_any_call('UPDATE agent_badges SET expires_at=UTC_TIMESTAMP() WHERE agent_user_id=%s AND (expires_at IS NULL OR expires_at>UTC_TIMESTAMP())', [21])
        self.assertEqual(execute.call_args_list[-1].args[0], 'INSERT INTO agent_badges (agent_user_id,badge_label,starts_at,expires_at,assigned_by) VALUES (%s,%s,UTC_TIMESTAMP(),%s,NULL)')
        audit.assert_called_once()

    @patch('console.views.audit')
    @patch('console.views.execute')
    @patch('console.views.rows', return_value=[{'id': 15, 'subaccount_id': 31}])
    @patch('console.views.transaction.atomic', return_value=nullcontext())
    def test_admin_can_approve_a_pending_subagent(self, atomic, rows, execute, audit):
        self.authenticate_admin()
        response = self.client.post('/admin/action/agent-status/', {'id': '15', 'status': 'approved', 'section': 'agents'})
        self.assertRedirects(response, '/admin/?section=agents', fetch_redirect_response=False)
        execute.assert_any_call('UPDATE users SET status=%s WHERE id=%s', ['active', 15])
        execute.assert_any_call('UPDATE agent_subaccounts SET status=%s WHERE id=%s', ['active', 31])
        audit.assert_called_once()

    @patch('console.views.audit')
    @patch('console.views.execute')
    @patch('console.views.rows', return_value=[{'sid': 'session-1', 'data': '{"user":{"id":8}}'}])
    @patch('console.views.transaction.atomic', return_value=nullcontext())
    def test_mfa_reset_clears_configuration_and_revokes_api_sessions(self, atomic, rows, execute, audit):
        self.authenticate_admin()
        response = self.client.post('/admin/action/mfa-reset/', {'id': '8', 'section': 'access'})
        self.assertRedirects(response, '/admin/?section=access', fetch_redirect_response=False)
        execute.assert_any_call('UPDATE users SET mfa_enabled=FALSE,mfa_secret_encrypted=NULL WHERE id=%s', [8])
        execute.assert_any_call('DELETE FROM web_sessions WHERE sid=%s', [rows.return_value[0]['sid']])