import os
import json
from contextlib import nullcontext
from unittest.mock import patch

from django.test import SimpleTestCase


class AdminConsoleAccessTests(SimpleTestCase):
    def authenticate_admin(self):
        with patch.dict(os.environ, {'ADMIN_GATE_USERNAME': 'founder', 'ADMIN_GATE_PASSWORD_HASH': 'test-hash'}):
            with patch('console.views.bcrypt.checkpw', return_value=True):
                return self.client.post('/admin/login/', {'username': 'founder', 'password': 'test-password'})

    @patch('console.views.execute')
    def test_audit_serializes_metadata_as_valid_json(self, execute):
        from console.views import audit

        audit('admin_setting_updated', 'app_setting', metadata={'key': 'contact_email'})

        serialized_metadata = execute.call_args.args[1][-1]
        self.assertEqual(json.loads(serialized_metadata), {'key': 'contact_email'})

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

    @patch('console.views.rows')
    @patch('console.views.scalar', return_value=3)
    def test_tenant_detail_shows_account_actions_and_related_activity(self, scalar, rows):
        self.authenticate_admin()
        rows.side_effect = [
            [{'id': 42, 'email': 'tenant@example.test', 'phone': '+255700000000', 'status': 'active',
              'email_verified_at': None, 'phone_verified_at': None, 'mfa_enabled': False,
              'last_login_at': None, 'created_at': '2026-10-01', 'updated_at': '2026-10-02',
              'deleted_at': None, 'deletion_requested_at': '2026-10-16', 'deletion_reason': 'No longer using Makazi Go',
              'first_name': 'Asha', 'last_name': 'Mrema', 'name': 'Asha Mrema',
              'city': 'Dar es Salaam', 'country_code': 'TZ', 'bio': None, 'avatar_url': None}],
            [{'name': 'tenant'}],
                        [{'id': 8, 'booking_code': 'BOOK00000042', 'status': 'confirmed', 'check_in': '2026-11-01',
                            'check_out': '2026-11-04', 'total_amount': 300, 'currency': 'TZS', 'title': 'Garden flat',
                            'relation': 'Tenant'}],
            [],
            [],
        ]

        response = self.client.get('/admin/users/42/')

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Asha Mrema')
        self.assertContains(response, 'tenant@example.test')
        self.assertContains(response, 'Suspend')
        self.assertContains(response, 'Permanently delete')
        self.assertContains(response, 'No longer using Makazi Go')
        self.assertContains(response, 'Assign role')
        self.assertContains(response, '3 saved homes')
        self.assertContains(response, 'Related bookings')

    @patch('console.views.rows', side_effect=[[], []])
    def test_user_detail_returns_not_found_for_unknown_id(self, rows):
        self.authenticate_admin()

        response = self.client.get('/admin/users/999999/')

        self.assertEqual(response.status_code, 404)

    @patch('console.views.rows')
    @patch('console.views.scalar', return_value=0)
    def test_agent_detail_shows_agent_approval_and_profile_actions(self, scalar, rows):
        self.authenticate_admin()
        rows.side_effect = [
            [{'id': 21, 'email': 'agent@example.test', 'phone': '+255700000001', 'status': 'pending',
              'email_verified_at': None, 'phone_verified_at': None, 'mfa_enabled': False,
              'last_login_at': None, 'created_at': '2026-10-01', 'updated_at': '2026-10-02',
              'deleted_at': None, 'first_name': 'Neema', 'last_name': 'Amani', 'name': 'Neema Amani',
              'city': 'Arusha', 'country_code': 'TZ', 'bio': 'Local agent', 'avatar_url': None}],
            [{'name': 'agent'}],
            [{'phone': '+255700000001', 'agency_name': 'Amani Homes', 'bio': 'Local agent',
              'followers_count': 2, 'following_count': 1, 'created_at': '2026-10-01', 'updated_at': '2026-10-02'}],
            [],
            [],
            [],
            [],
            [],
            [],
        ]

        response = self.client.get('/admin/users/21/')

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Amani Homes')
        self.assertContains(response, '>Approve<')
        self.assertContains(response, '>Reject<')
        self.assertContains(response, 'return_to')

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
    def test_admin_can_update_email_template(self, atomic, execute, audit):
        self.authenticate_admin()

        response = self.client.post('/admin/action/email-template/', {
            'key': 'agent_approved',
            'subject': 'Your Makazi Go account is approved',
            'body': 'Welcome {{firstName}}',
            'section': 'settings',
        })

        self.assertRedirects(response, '/admin/?section=settings', fetch_redirect_response=False)
        execute.assert_called_once_with(
            'INSERT INTO email_templates (template_key,subject,body,updated_by) VALUES (%s,%s,%s,NULL) ON DUPLICATE KEY UPDATE subject=VALUES(subject),body=VALUES(body),updated_by=NULL',
            ['agent_approved', 'Your Makazi Go account is approved', 'Welcome {{firstName}}'],
        )
        audit.assert_called_once()

    @patch('console.views.audit')
    @patch('console.views.execute')
    @patch('console.views.transaction.atomic', return_value=nullcontext())
    def test_admin_can_add_normalized_ip_rule(self, atomic, execute, audit):
        self.authenticate_admin()

        response = self.client.post('/admin/action/ip-rule/', {
            'rule_type': 'allow',
            'cidr': '192.0.2.19/24',
            'label': 'Office network',
            'section': 'settings',
        })

        self.assertRedirects(response, '/admin/?section=settings', fetch_redirect_response=False)
        execute.assert_called_once_with(
            'INSERT INTO admin_ip_rules (rule_type,cidr,label,enabled,created_by) VALUES (%s,%s,%s,TRUE,NULL)',
            ['allow', '192.0.2.0/24', 'Office network'],
        )
        audit.assert_called_once()

    @patch('console.views.execute')
    @patch('console.views.transaction.atomic', return_value=nullcontext())
    def test_admin_rejects_invalid_ip_rule(self, atomic, execute):
        self.authenticate_admin()

        response = self.client.post('/admin/action/ip-rule/', {
            'rule_type': 'allow', 'cidr': 'not-an-ip', 'section': 'settings'
        })

        self.assertRedirects(response, '/admin/?section=settings', fetch_redirect_response=False)
        execute.assert_not_called()

    @patch('console.views.audit')
    @patch('console.views.execute')
    @patch('console.views.transaction.atomic', return_value=nullcontext())
    def test_admin_action_returns_to_requested_user_detail(self, atomic, execute, audit):
        self.authenticate_admin()

        response = self.client.post('/admin/action/feature/', {
            'key': 'booking_requests',
            'enabled': '1',
            'section': 'settings',
            'return_to': '/admin/users/42/',
        })

        self.assertRedirects(response, '/admin/users/42/', fetch_redirect_response=False)

    @patch('console.views.audit')
    @patch('console.views.execute')
    @patch('console.views.rows', side_effect=[
        [{'id': 42}],
        [],
        [],
        [{'child_table': 'user_profiles', 'child_column': 'user_id', 'parent_table': 'users',
          'parent_column': 'id', 'child_nullable': 'NO', 'delete_rule': 'NO ACTION'}],
        [{'column_name': 'user_id'}],
        [{'pk_0': 42}],
    ])
    @patch('console.views.transaction.atomic', return_value=nullcontext())
    def test_admin_can_permanently_delete_user_and_profile(self, atomic, rows, execute, audit):
        self.authenticate_admin()

        response = self.client.post('/admin/action/user-hard-delete/', {'id': '42', 'section': 'users'})

        self.assertRedirects(response, '/admin/?section=users', fetch_redirect_response=False)
        execute.assert_any_call('DELETE FROM `user_profiles` WHERE `user_id`=%s AND `user_id`=%s', [42, 42])
        execute.assert_any_call('DELETE FROM users WHERE id=%s', [42])
        audit.assert_called_once_with('user_permanently_deleted', 'user', 42)

    @patch('console.views.audit')
    @patch('console.views.execute')
    @patch('console.views.scalar', return_value=1)
    @patch('console.views.rows', side_effect=[[{'id': 1}], [{'status': 'active'}]])
    @patch('console.views.transaction.atomic', return_value=nullcontext())
    def test_admin_cannot_permanently_delete_the_last_active_admin(self, atomic, rows, scalar, execute, audit):
        self.authenticate_admin()

        response = self.client.post('/admin/action/user-hard-delete/', {'id': '1', 'section': 'users'})

        self.assertRedirects(response, '/admin/?section=users', fetch_redirect_response=False)
        messages = list(response.wsgi_request._messages)
        self.assertTrue(any('last active administrator' in str(message).lower() for message in messages))
        execute.assert_not_called()
        audit.assert_not_called()

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
        [{'template_key': 'agent_approved', 'subject': 'Approved', 'body': 'Welcome {{firstName}}'}],
        [],
    ])
    def test_admin_settings_labels_footer_social_controls(self, rows):
        self.authenticate_admin()
        response = self.client.get('/admin/?section=settings')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Marketplace footer')
        self.assertContains(response, 'Instagram profile URL')
        self.assertContains(response, 'type="url"')
        self.assertContains(response, 'adminEmailTemplatesData')
        self.assertContains(response, 'Welcome')

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
        self.assertContains(response, '/admin/users/21/')
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