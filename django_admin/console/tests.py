import os
from contextlib import nullcontext
from unittest.mock import patch

from django.test import SimpleTestCase


class AdminConsoleAccessTests(SimpleTestCase):
    def test_dashboard_redirects_without_admin_session(self):
        response = self.client.get('/admin/')
        self.assertRedirects(response, '/admin/login/?next=/admin/', fetch_redirect_response=False)

    @patch.dict(os.environ, {'ADMIN_GATE_USERNAME': 'founder', 'ADMIN_GATE_PASSWORD_HASH': 'test-hash'})
    @patch('console.views.bcrypt.checkpw', return_value=True)
    def test_valid_admin_login_sets_console_session(self, checkpw):
        response = self.client.post('/admin/login/', {'username': 'founder', 'password': 'test-password'})
        self.assertRedirects(response, '/admin/', fetch_redirect_response=False)
        self.assertTrue(self.client.session['admin_authenticated'])
        checkpw.assert_called_once_with(b'test-password', b'test-hash')

    def test_admin_action_redirects_without_admin_session(self):
        response = self.client.post('/admin/action/feature/', {'key': 'sample', 'enabled': '1'})
        self.assertRedirects(response, '/admin/login/?next=/admin/action/feature/', fetch_redirect_response=False)

    @patch('console.views.audit')
    @patch('console.views.execute')
    @patch('console.views.transaction.atomic', return_value=nullcontext())
    def test_authenticated_admin_can_submit_a_feature_action(self, atomic, execute, audit):
        with patch.dict(os.environ, {'ADMIN_GATE_USERNAME': 'founder', 'ADMIN_GATE_PASSWORD_HASH': 'test-hash'}):
            with patch('console.views.bcrypt.checkpw', return_value=True):
                self.client.post('/admin/login/', {'username': 'founder', 'password': 'test-password'})

        response = self.client.post('/admin/action/feature/', {
            'key': 'booking_requests',
            'enabled': '1',
            'section': 'settings',
        })

        self.assertRedirects(response, '/?section=settings', fetch_redirect_response=False)
        execute.assert_called_once_with(
            'UPDATE feature_flags SET enabled=%s WHERE feature_key=%s',
            [1, 'booking_requests'],
        )
        audit.assert_called_once()