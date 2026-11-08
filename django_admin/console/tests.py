import os
import json
import hashlib
from urllib.parse import parse_qs, urlparse
from contextlib import nullcontext
from unittest.mock import patch

from django.test import SimpleTestCase, override_settings


@override_settings(STORAGES={
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
})
class AdminConsoleAccessTests(SimpleTestCase):
    def authenticate_admin(self):
        with patch.dict(os.environ, {'ADMIN_GATE_USERNAME': 'founder', 'ADMIN_GATE_PASSWORD_HASH': 'test-hash'}):
            with patch('console.views.load_founder_profile', return_value=None):
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

    @patch('console.views.rows', return_value=[{
        'id': 17, 'title': 'Garden flat', 'city': 'Arusha', 'status': 'pending_review',
        'currency': 'TZS', 'nightly_price': 70000, 'monthly_price': None, 'yearly_price': None,
        'updated_at': '2026-10-17', 'owner_user_id': 42, 'owner_name': 'Asha Mrema',
    }])
    def test_listing_moderation_exposes_clickable_listing_and_owner_ids(self, rows):
        self.authenticate_admin()

        response = self.client.get('/admin/?section=listings')

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'adminListingLinksData')
        self.assertContains(response, '"id": "17", "row": 0, "cell": 0')
        self.assertContains(response, '"id": "42", "row": 0, "cell": 1')
        self.assertContains(response, '/admin/listings/${encodeURIComponent(record.id)}/')

    @patch('console.views.rows', return_value=[])
    def test_listing_review_tab_filters_status_search_and_sort(self, rows):
        self.authenticate_admin()

        response = self.client.get('/admin/?section=listings&listing_tab=review&listing_status=pending_review&listing_q=garden&listing_sort=price_low')

        query, params = rows.call_args.args
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.context['listing_tab'], 'review')
        self.assertEqual(response.context['listing_status'], 'pending_review')
        self.assertIn('l.status=%s', query)
        self.assertIn('l.title LIKE %s', query)
        self.assertIn('ORDER BY COALESCE(l.nightly_price,l.monthly_price,l.yearly_price,0) ASC', query)
        self.assertEqual(params, ['pending_review', '%garden%', '%garden%', '%garden%', '%garden%'])

    @patch('console.views.rows', side_effect=[
        [{'low_id': 3, 'high_id': 9, 'low_title': 'Garden flat', 'high_title': 'Garden flat',
          'low_city': 'Arusha', 'high_city': 'Arusha', 'low_status': 'published',
          'high_status': 'pending_review', 'match_reason': 'Same normalized street address and city'}],
        [],
    ])
    @patch('console.views.scalar', return_value=0)
    def test_listing_moderation_surfaces_duplicate_candidates_as_review_signals(self, scalar, rows):
        self.authenticate_admin()

        response = self.client.get('/admin/?section=listings')

        query = rows.call_args_list[0].args[0]
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Possible duplicate listings')
        self.assertContains(response, 'Same normalized street address and city')
        self.assertContains(response, 'Confirm duplicate')
        self.assertContains(response, 'do not prove misconduct')
        self.assertIn('LIMIT 500', query)
        self.assertIn('listing_duplicate_reviews', query)
        self.assertIn('LOWER(TRIM(a.address_line1))', query)

    @patch('console.views.audit')
    @patch('console.views.execute')
    @patch('console.views.rows', return_value=[{'id': 3}])
    @patch('console.views.transaction.atomic', return_value=nullcontext())
    def test_admin_can_record_a_duplicate_review_without_automatic_penalties(self, atomic, rows, execute, audit):
        self.authenticate_admin()

        response = self.client.post('/admin/action/listing-duplicate-decision/', {
            'section': 'listings', 'listing_tab': 'review', 'low_id': '3', 'high_id': '9',
            'decision': 'confirmed_duplicate', 'resolution_note': 'Same address confirmed after checking the listing.',
        })

        self.assertRedirects(
            response,
            '/admin/?section=listings&listing_tab=review&listing_sort=updated&listing_q=&listing_status=all',
            fetch_redirect_response=False,
        )
        self.assertEqual(rows.call_args.args[1], [9, 3])
        self.assertIn('listing_duplicate_reviews', execute.call_args.args[0])
        self.assertEqual(execute.call_args.args[1], [
            3, 9, 'confirmed_duplicate', 'Same address confirmed after checking the listing.',
        ])
        audit.assert_called_once_with('listing_duplicate_reviewed', 'listing_pair', 3, {
            'otherListingId': 9,
            'decision': 'confirmed_duplicate',
            'resolutionNote': 'Same address confirmed after checking the listing.',
        })

    @patch('console.views.rows', return_value=[])
    def test_available_listings_tab_is_published_and_rejects_unsafe_sort(self, rows):
        self.authenticate_admin()

        response = self.client.get('/admin/?section=listings&listing_tab=available&listing_q=Arusha&listing_sort=title;DROP%20TABLE')

        query, params = rows.call_args.args
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.context['listing_tab'], 'available')
        self.assertEqual(response.context['listing_status'], 'published')
        self.assertEqual(response.context['listing_sort'], 'updated')
        self.assertIn('l.status=%s', query)
        self.assertIn('ORDER BY l.updated_at DESC', query)
        self.assertEqual(params, ['published', '%Arusha%', '%Arusha%', '%Arusha%', '%Arusha%'])

    @patch('console.views.audit')
    @patch('console.views.execute')
    @patch('console.views.transaction.atomic', return_value=nullcontext())
    def test_listing_action_returns_to_current_filtered_tab(self, atomic, execute, audit):
        self.authenticate_admin()

        response = self.client.post('/admin/action/listing-status/', {
            'section': 'listings', 'listing_tab': 'available', 'listing_query': 'Arusha & coast',
            'listing_sort': 'price_high', 'id': '17', 'status': 'unpublished',
        })

        self.assertRedirects(
            response,
            '/admin/?section=listings&listing_tab=available&listing_sort=price_high&listing_q=Arusha+%26+coast',
            fetch_redirect_response=False,
        )
        execute.assert_called_once_with(
            "UPDATE listings SET status=%s,published_at=IF(%s='published',COALESCE(published_at,UTC_TIMESTAMP()),published_at) WHERE id=%s",
            ['unpublished', 'unpublished', 17],
        )
        audit.assert_called_once_with('listing_unpublished', 'listing', 17)

    @patch('console.views.audit')
    @patch('console.views.execute')
    @patch('console.views.rows', return_value=[{
        'verification_status': 'submitted',
        'identity_status': 'not_reviewed',
        'location_status': 'not_reviewed',
        'authority_status': 'not_reviewed',
        'documents_status': 'not_reviewed',
    }])
    @patch('console.views.transaction.atomic', return_value=nullcontext())
    def test_property_check_records_founder_actor_and_event(self, atomic, rows, execute, audit):
        self.authenticate_admin()

        response = self.client.post('/admin/action/listing-verification/', {
            'section': 'listings', 'listing_tab': 'review', 'id': '17',
            'check': 'identity_status', 'status': 'checked',
        })

        self.assertRedirects(
            response,
            '/admin/?section=listings&listing_tab=review&listing_sort=updated&listing_q=&listing_status=all',
            fetch_redirect_response=False,
        )
        event_call = next(call for call in execute.call_args_list if 'INSERT INTO listing_verification_events' in call.args[0])
        self.assertEqual(
            event_call.args[1],
            [17, 'founder', 'identity_status', 'not_reviewed', 'checked', None],
        )
        update_call = next(call for call in execute.call_args_list if 'UPDATE listing_verifications SET' in call.args[0])
        self.assertNotIn('reviewed_by=NULL', update_call.args[0])
        audit.assert_called_once_with(
            'property_identity_checked',
            'listing',
            17,
            {
                'verification_status': 'under_review',
                'previous_status': 'submitted',
                'actor_label': 'founder',
            },
        )

    @patch('console.views.audit')
    @patch('console.views.execute')
    @patch('console.views.rows', return_value=[{
        'verification_status': 'verified',
        'is_current': 0,
    }])
    @patch('console.views.transaction.atomic', return_value=nullcontext())
    def test_expired_property_checks_block_publication(self, atomic, rows, execute, audit):
        self.authenticate_admin()

        response = self.client.post('/admin/action/listing-status/', {
            'section': 'listings', 'listing_tab': 'review', 'id': '17', 'status': 'published',
        })

        self.assertRedirects(
            response,
            '/admin/?section=listings&listing_tab=review&listing_sort=updated&listing_q=&listing_status=all',
            fetch_redirect_response=False,
        )
        self.assertTrue(any(
            'checks before publishing' in str(message).lower()
            for message in response.wsgi_request._messages
        ))
        execute.assert_not_called()
        audit.assert_not_called()

    @patch('console.views.rows', side_effect=[
        [{'id': 17, 'title': 'Garden flat', 'description': 'A sunny home', 'status': 'published',
          'currency': 'TZS', 'nightly_price': 70000, 'monthly_price': None, 'yearly_price': None,
          'city': 'Arusha', 'region': None, 'country_code': 'TZ', 'bedrooms': 2, 'beds': 2,
          'bathrooms': 1, 'max_guests': 4, 'created_at': '2026-10-01', 'updated_at': '2026-10-17',
          'owner_user_id': 42, 'owner_name': 'Asha Mrema', 'owner_email': 'asha@example.test'}],
        [{'media_type': 'image', 'public_url': '/media/listings/17/cover.webp', 'caption': 'Living room', 'is_cover': True}],
        [],
    ])
    def test_admin_listing_detail_renders_listing_and_media(self, rows):
        self.authenticate_admin()

        response = self.client.get('/admin/listings/17/')

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Garden flat')
        self.assertContains(response, '/admin/users/42/')
        self.assertContains(response, '/media/listings/17/cover.webp')

    @patch('console.views.rows', return_value=[{
        'id': 8, 'listing_id': 17, 'post_type': 'new_listing', 'caption': 'Now available',
        'amenity_tags': '[]', 'status': 'pending_review', 'created_at': '2026-10-17',
        'listing_title': 'Garden flat', 'owner_user_id': 42, 'owner_name': 'Asha Mrema',
        'owner_email': 'asha@example.test',
    }])
    def test_admin_post_detail_renders_post_and_related_links(self, rows):
        self.authenticate_admin()

        response = self.client.get('/admin/posts/8/')

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Now available')
        self.assertContains(response, '/admin/users/42/')
        self.assertContains(response, '/admin/listings/17/')

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
        with patch('console.views.load_founder_profile', return_value=None):
            response = self.client.post('/admin/login/', {'username': 'founder', 'password': 'test-password'})
        self.assertRedirects(response, '/admin/', fetch_redirect_response=False)
        self.assertTrue(self.client.session['admin_authenticated'])
        self.assertEqual(self.client.session['admin_username'], 'founder')
        checkpw.assert_called_once_with(b'test-password', b'test-hash')

    @patch.dict(os.environ, {'ADMIN_GATE_USERNAME': 'founder', 'ADMIN_GATE_PASSWORD_HASH': 'test-hash'})
    @patch('console.views.scalar', return_value=1)
    @patch('console.views.execute')
    @patch('console.views.rows')
    @patch('console.views.load_founder_profile', return_value=None)
    def test_created_admin_can_sign_in_with_username_and_password(
        self, founder_profile, rows, execute, scalar
    ):
        from console.views import bcrypt

        rows.side_effect = [
            [{
                'id': 42,
                'username': 'asha.admin',
                'email': 'asha@example.test',
                'password_hash': bcrypt.hashpw(
                    b'StrongPass123!',
                    bcrypt.gensalt(rounds=4),
                ).decode(),
                'email_verified_at': '2026-11-01',
                'mfa_enabled': False,
                'display_name': 'Asha Mrema',
            }],
            [{'user_id': 42}],
            [],
        ]

        response = self.client.post('/admin/login/', {
            'username': 'ASHA.ADMIN',
            'password': 'StrongPass123!',
        })

        self.assertRedirects(response, '/admin/', fetch_redirect_response=False)
        self.assertTrue(self.client.session['admin_authenticated'])
        self.assertFalse(self.client.session['admin_is_founder'])
        self.assertEqual(self.client.session['admin_user_id'], 42)
        self.assertEqual(self.client.session['admin_username'], 'asha.admin')
        execute.assert_called_once_with('UPDATE users SET last_login_at=UTC_TIMESTAMP() WHERE id=%s', [42])

        dashboard = self.client.get('/admin/')

        self.assertEqual(dashboard.status_code, 200)
        self.assertContains(dashboard, 'Your administrator account is active')
        self.assertNotContains(dashboard, 'Founder profile')

    @patch.dict(os.environ, {'ADMIN_GATE_USERNAME': 'founder', 'ADMIN_GATE_PASSWORD_HASH': 'test-hash'})
    @patch('console.views.scalar', return_value=1)
    @patch('console.views.execute')
    @patch('console.views.rows')
    @patch('console.views.bcrypt.checkpw', return_value=True)
    @patch('console.views.load_founder_profile', return_value=None)
    def test_delegated_admin_cannot_assign_an_administrator_role(
        self, founder_profile, checkpw, rows, execute, scalar
    ):
        rows.side_effect = [
            [{
                'id': 42,
                'username': 'asha.admin',
                'email': 'asha@example.test',
                'password_hash': 'created-account-hash',
                'email_verified_at': '2026-11-01',
                'mfa_enabled': False,
                'display_name': 'Asha Mrema',
            }],
            [{'user_id': 42}],
            [{'permission_key': 'access'}],
        ]
        self.client.post('/admin/login/', {
            'username': 'asha.admin',
            'password': 'StrongPass123!',
        })

        response = self.client.post('/admin/action/user-role/', {
            'id': '77',
            'role': 'administrator',
            'operation': 'assign',
        })

        self.assertEqual(response.status_code, 403)

    @patch.dict(os.environ, {'ADMIN_GATE_USERNAME': 'founder', 'ADMIN_GATE_PASSWORD_HASH': 'test-hash'})
    @patch('console.views.scalar', return_value=1)
    @patch('console.views.execute')
    @patch('console.views.rows')
    @patch('console.views.bcrypt.checkpw', return_value=True)
    @patch('console.views.load_founder_profile', return_value=None)
    def test_delegated_admin_cannot_run_unassigned_feature_action(
        self, founder_profile, checkpw, rows, execute, scalar
    ):
        rows.side_effect = [
            [{
                'id': 42,
                'username': 'asha.admin',
                'email': 'asha@example.test',
                'password_hash': 'created-account-hash',
                'email_verified_at': '2026-11-01',
                'mfa_enabled': False,
                'display_name': 'Asha Mrema',
            }],
            [{'user_id': 42}],
            [],
        ]
        self.client.post('/admin/login/', {
            'username': 'asha.admin',
            'password': 'StrongPass123!',
        })

        response = self.client.post('/admin/action/listing-status/', {
            'id': '77',
            'status': 'published',
        })

        self.assertEqual(response.status_code, 403)
        execute.assert_called_once_with('UPDATE users SET last_login_at=UTC_TIMESTAMP() WHERE id=%s', [42])

    @patch.dict(os.environ, {'ADMIN_GATE_USERNAME': 'founder', 'ADMIN_GATE_PASSWORD_HASH': 'test-hash'})
    @patch('console.views.bcrypt.checkpw', return_value=True)
    def test_admin_login_rejects_external_return_urls(self, checkpw):
        with patch('console.views.load_founder_profile', return_value=None):
            response = self.client.post('/admin/login/?next=https://example.test/', {'username': 'founder', 'password': 'test-password'})
        self.assertRedirects(response, '/admin/', fetch_redirect_response=False)

    @patch.dict(os.environ, {'ADMIN_GATE_USERNAME': 'founder', 'ADMIN_GATE_PASSWORD_HASH': 'test-hash'})
    @patch('console.views.bcrypt.checkpw', return_value=False)
    def test_invalid_admin_login_keeps_username_and_shows_error(self, checkpw):
        with patch('console.views.load_founder_profile', return_value=None):
            response = self.client.post('/admin/login/', {'username': 'founder', 'password': 'wrong-password'})

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'value="founder"')
        self.assertContains(response, 'Invalid administrator credentials.')
        self.assertNotContains(response, 'value="wrong-password"')

    def test_database_founder_profile_takes_precedence_over_environment_credentials(self):
        profile = {
            'username': 'kado-admin',
            'password_hash': 'database-hash',
            'display_name': 'Kado Founder',
            'email': 'kado@example.test',
            'phone': '+255700000000',
            'avatar_url': '/assets/founder.png',
        }
        with patch.dict(os.environ, {'ADMIN_GATE_USERNAME': 'old-founder', 'ADMIN_GATE_PASSWORD_HASH': 'old-hash'}):
            with patch('console.views.load_founder_profile', return_value=profile):
                with patch('console.views.bcrypt.checkpw', return_value=True) as checkpw:
                    response = self.client.post('/admin/login/', {
                        'username': 'kado-admin',
                        'password': 'new-password',
                    })

        self.assertRedirects(response, '/admin/', fetch_redirect_response=False)
        checkpw.assert_called_once_with(b'new-password', b'database-hash')
        self.assertEqual(self.client.session['admin_name'], 'Kado Founder')
        self.assertEqual(self.client.session['admin_username'], 'kado-admin')

    @patch('console.views.load_founder_profile', return_value={
        'username': 'kado-admin',
        'password_hash': 'database-hash',
        'display_name': 'Kado Founder',
        'email': 'kado@example.test',
        'phone': '+255700000000',
        'avatar_url': 'https://cdn.example.test/founder.png',
    })
    def test_founder_profile_page_shows_editable_identity_and_security(self, load_profile):
        self.authenticate_admin()

        response = self.client.get('/admin/profile/')

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Founder profile')
        self.assertContains(response, 'value="kado-admin"')
        self.assertContains(response, 'value="Kado Founder"')
        self.assertContains(response, 'name="current_password"')
        self.assertContains(response, 'name="new_password"')
        self.assertContains(response, 'name="avatar_url"')

    @patch('console.views.invalidate_founder_api_sessions')
    def test_founder_profile_updates_login_credentials_and_profile_fields(self, invalidate_sessions):
        self.authenticate_admin()

        with patch.dict(os.environ, {
            'ADMIN_GATE_USERNAME': 'founder',
            'ADMIN_GATE_PASSWORD_HASH': 'old-hash',
        }):
            with patch('console.views.load_founder_profile', return_value=None):
                with patch('console.views.bcrypt.checkpw', return_value=True) as checkpw:
                    with patch('console.views.bcrypt.gensalt', return_value=b'$2b$12$salt') as gensalt:
                        with patch('console.views.bcrypt.hashpw', return_value=b'$2b$12$new-hash') as hashpw:
                            with patch('console.views.execute') as execute:
                                with patch('console.views.audit') as audit:
                                    with patch('console.views.transaction.atomic', return_value=nullcontext()):
                                        response = self.client.post('/admin/profile/', {
                                            'display_name': 'Kado Founder',
                                            'username': 'kado-admin',
                                            'email': 'kado@example.test',
                                            'phone': '+255 700 000 000',
                                            'avatar_url': 'https://cdn.example.test/founder.png',
                                            'current_password': 'old-password',
                                            'new_password': 'NewStrongPass123!',
                                            'confirm_password': 'NewStrongPass123!',
                                        })

        self.assertRedirects(response, '/admin/profile/', fetch_redirect_response=False)
        checkpw.assert_called_once_with(b'old-password', b'old-hash')
        gensalt.assert_called_once_with(rounds=12)
        hashpw.assert_called_once_with(b'NewStrongPass123!', b'$2b$12$salt')
        query, parameters = execute.call_args.args
        self.assertIn('INSERT INTO admin_founder_profile', query)
        self.assertEqual(parameters, [
            'kado-admin',
            '$2b$12$new-hash',
            'Kado Founder',
            'kado@example.test',
            '+255 700 000 000',
            'https://cdn.example.test/founder.png',
        ])
        self.assertEqual(self.client.session['admin_username'], 'kado-admin')
        self.assertEqual(self.client.session['admin_name'], 'Kado Founder')
        invalidate_sessions.assert_called_once_with()
        audit.assert_called_once()

    def test_founder_profile_requires_current_password_before_changes(self):
        profile = {
            'username': 'kado-admin',
            'password_hash': 'database-hash',
            'display_name': 'Kado Founder',
            'email': '',
            'phone': '',
            'avatar_url': '',
        }
        self.authenticate_admin()

        with patch('console.views.load_founder_profile', return_value=profile):
            with patch('console.views.bcrypt.checkpw', return_value=False):
                with patch('console.views.execute') as execute:
                    response = self.client.post('/admin/profile/', {
                        'display_name': 'Changed Name',
                        'username': 'kado-admin',
                        'current_password': 'wrong-password',
                    })

        self.assertRedirects(response, '/admin/profile/', fetch_redirect_response=False)
        self.assertTrue(any('current founder password' in str(message).lower() for message in response.wsgi_request._messages))
        execute.assert_not_called()
        with patch('console.views.load_founder_profile', return_value=profile):
            preserved = self.client.get('/admin/profile/')
        self.assertContains(preserved, 'value="Changed Name"')
        self.assertContains(preserved, 'value="kado-admin"')
        self.assertContains(preserved, 'name="current_password"')
        self.assertNotContains(preserved, 'value="wrong-password"')

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
    @patch('console.views.purge_user_account')
    @patch('console.views.invalidate_api_sessions')
    @patch('console.views.rows', return_value=[{'id': 1}])
    @patch('console.views.scalar', return_value=1)
    @patch('console.views.transaction.atomic', return_value=nullcontext())
    def test_admin_can_permanently_delete_the_last_active_admin(self, atomic, scalar, rows, invalidate_sessions, purge_user, audit):
        self.authenticate_admin()

        response = self.client.post('/admin/action/user-hard-delete/', {'id': '1', 'section': 'users'})

        self.assertRedirects(response, '/admin/?section=users', fetch_redirect_response=False)
        scalar.assert_not_called()
        invalidate_sessions.assert_called_once_with(1)
        purge_user.assert_called_once_with(1)
        audit.assert_called_once_with('user_permanently_deleted', 'user', 1)

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
        [],
    ])
    def test_access_page_shows_role_removal_and_mfa_reset_actions(self, rows):
        self.authenticate_admin()
        response = self.client.get('/admin/?section=access')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Administrator accounts')
        self.assertContains(response, '/admin/admins/create/')
        self.assertContains(response, 'Founder Console')
        self.assertContains(response, 'Founder profile')
        self.assertContains(response, 'Protected')
        self.assertContains(response, 'Create administrator')
        self.assertContains(response, "keeps that person's current email address and password")
        self.assertContains(response, 'Remove agent')
        self.assertContains(response, 'Reset MFA')

    def test_create_admin_route_renders_multistep_wizard(self):
        self.authenticate_admin()

        response = self.client.get('/admin/admins/create/')

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, '1. Profile')
        self.assertContains(response, '2. Credentials')
        self.assertContains(response, '3. Confirm')
        self.assertContains(response, 'name="username"')
        self.assertContains(response, 'username or their email address')
        self.assertContains(response, 'name="confirmationPassword"')

    @patch('console.views.rows', side_effect=[
        [{'id': 15, 'email': 'admin@example.test', 'phone': '+255700000015', 'status': 'active',
          'mfa_enabled': True, 'email_verified_at': '2026-10-01', 'last_login_at': '2026-10-18',
          'created_at': '2026-10-01', 'name': 'Admin User'}],
        [{'name': 'administrator'}],
        [{'user_id': 15}],
        [{'permission_key': 'users'}],
    ])
    def test_admin_detail_shows_status_and_restricted_feature_grants(self, rows):
        self.authenticate_admin()

        response = self.client.get('/admin/admins/15/')

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Admin User')
        self.assertContains(response, 'Administrator feature access')
        self.assertContains(response, 'Marketplace operations')
        self.assertContains(response, 'value="users" checked')
        self.assertContains(response, 'Permanently delete administrator')
        self.assertContains(response, 'Suspend account')

    @patch('console.views.audit')
    @patch('console.views.execute')
    @patch('console.views.rows', return_value=[{'user_id': 15}])
    @patch('console.views.transaction.atomic', return_value=nullcontext())
    def test_admin_can_save_feature_grants_for_an_existing_admin(self, atomic, rows, execute, audit):
        self.authenticate_admin()

        response = self.client.post('/admin/action/admin-access-save/', {
            'id': '15',
            'section': 'access',
            'permissions': ['users', 'listings'],
            'return_to': '/admin/admins/15/',
        })

        self.assertRedirects(response, '/admin/admins/15/', fetch_redirect_response=False)
        execute.assert_any_call(
            'INSERT INTO admin_access_profiles (user_id,managed_by) VALUES (%s,NULL) ON DUPLICATE KEY UPDATE user_id=VALUES(user_id)',
            [15],
        )
        execute.assert_any_call('DELETE FROM admin_access_permissions WHERE user_id=%s', [15])
        execute.assert_any_call(
            'INSERT INTO admin_access_permissions (user_id,permission_key,assigned_by) VALUES (%s,%s,NULL)',
            [15, 'listings'],
        )
        execute.assert_any_call(
            'INSERT INTO admin_access_permissions (user_id,permission_key,assigned_by) VALUES (%s,%s,NULL)',
            [15, 'users'],
        )
        audit.assert_called_once_with('administrator_access_updated', 'user', 15, {'permissions': ['listings', 'users']})

    @patch('console.views.execute')
    @patch('console.views.rows', return_value=[{'user_id': 15}])
    @patch('console.views.transaction.atomic', return_value=nullcontext())
    def test_admin_access_save_rejects_unlisted_permissions(self, atomic, rows, execute):
        self.authenticate_admin()

        response = self.client.post('/admin/action/admin-access-save/', {
            'id': '15',
            'section': 'access',
            'permissions': ['users', 'administrator.delete'],
        })

        self.assertRedirects(response, '/admin/?section=access', fetch_redirect_response=False)
        self.assertTrue(any('only listed administrator features' in str(message) for message in response.wsgi_request._messages))
        execute.assert_not_called()

    @patch('console.views.audit')
    @patch('console.views.purge_user_account')
    @patch('console.views.invalidate_api_sessions')
    @patch('console.views.rows', return_value=[{'status': 'active'}])
    @patch('console.views.scalar', return_value=1)
    @patch('console.views.transaction.atomic', return_value=nullcontext())
    def test_admin_delete_can_remove_last_assigned_admin_without_removing_founder_gate(
        self, atomic, scalar, rows, invalidate_sessions, purge_user, audit
    ):
        self.authenticate_admin()

        response = self.client.post('/admin/action/admin-delete/', {'id': '15', 'section': 'access'})

        self.assertRedirects(response, '/admin/?section=access', fetch_redirect_response=False)
        self.assertTrue(self.client.session['admin_authenticated'])
        scalar.assert_not_called()
        invalidate_sessions.assert_called_once_with(15)
        purge_user.assert_called_once_with(15)
        audit.assert_called_once_with('administrator_permanently_deleted', 'user', 15)

    @patch('console.views.audit')
    @patch('console.views.purge_user_account')
    @patch('console.views.invalidate_api_sessions')
    @patch('console.views.rows', return_value=[{'id': 15}])
    @patch('console.views.scalar', return_value=1)
    @patch('console.views.transaction.atomic', return_value=nullcontext())
    def test_user_hard_delete_can_remove_last_assigned_admin(
        self, atomic, scalar, rows, invalidate_sessions, purge_user, audit
    ):
        self.authenticate_admin()

        response = self.client.post('/admin/action/user-hard-delete/', {'id': '15', 'section': 'users'})

        self.assertRedirects(response, '/admin/?section=users', fetch_redirect_response=False)
        scalar.assert_not_called()
        invalidate_sessions.assert_called_once_with(15)
        purge_user.assert_called_once_with(15)
        audit.assert_called_once_with('user_permanently_deleted', 'user', 15)

    @patch.dict(os.environ, {'MARKETPLACE_URL': 'https://makazigo.example'})
    @patch('console.views.audit')
    @patch('console.views.execute')
    @patch('console.views.rows', return_value=[{'id': 42}])
    @patch('console.views.transaction.atomic', return_value=nullcontext())
    def test_document_review_issues_only_a_short_lived_hashed_access_token(
        self, atomic, rows, execute, audit
    ):
        self.authenticate_admin()

        response = self.client.post('/admin/action/verification-document/', {
            'id': '42',
            'section': 'verifications',
        })

        self.assertEqual(response.status_code, 302)
        location = urlparse(response['Location'])
        token = parse_qs(location.query)['token'][0]
        self.assertEqual(location.scheme, 'https')
        self.assertEqual(location.path, '/api/admin/verifications/42/document')
        self.assertEqual(len(token), 43)
        self.assertEqual(execute.call_args.args[1][0], hashlib.sha256(token.encode('ascii')).digest())
        self.assertNotIn(token, execute.call_args.args[0])
        audit.assert_called_once_with('identity_document_access_granted', 'identity_verification', 42)

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
        response = self.client.post('/admin/action/report-status/', {
            'id': '42', 'status': 'resolved', 'section': 'reports',
            'resolution_note': 'Reviewed and addressed.',
        })
        self.assertRedirects(response, '/admin/?section=reports', fetch_redirect_response=False)
        execute.assert_called_once_with('UPDATE user_reports SET status=%s WHERE id=%s', ['resolved', 42])
        audit.assert_called_once_with('report_resolved', 'user_report', 42, {
            'resolutionNote': 'Reviewed and addressed.',
        })

    @patch('console.views.execute')
    @patch('console.views.transaction.atomic', return_value=nullcontext())
    def test_admin_cannot_close_a_safety_report_without_a_resolution_note(self, atomic, execute):
        self.authenticate_admin()

        response = self.client.post('/admin/action/report-status/', {
            'id': '42', 'status': 'dismissed', 'section': 'reports',
        })

        self.assertRedirects(response, '/admin/?section=reports', fetch_redirect_response=False)
        execute.assert_not_called()

    @patch('console.views.audit')
    @patch('console.views.execute')
    @patch('console.views.rows', side_effect=[[{'id': 3}], [], []])
    @patch('console.views.transaction.atomic', return_value=nullcontext())
    def test_admin_can_assign_an_agent_role(self, atomic, rows, execute, audit):
        self.authenticate_admin()
        response = self.client.post('/admin/action/user-role/', {'id': '8', 'role': 'agent', 'operation': 'assign', 'section': 'access'})
        self.assertRedirects(response, '/admin/?section=access', fetch_redirect_response=False)
        execute.assert_any_call('INSERT IGNORE INTO user_roles (user_id,role_id,assigned_by) VALUES (%s,%s,NULL)', [8, 3])
        execute.assert_any_call('INSERT IGNORE INTO agent_profiles (user_id) VALUES (%s)', [8])
        audit.assert_called_once()

    @patch('console.views.load_founder_profile', return_value=None)
    @patch.dict(os.environ, {'ADMIN_GATE_PASSWORD_HASH': 'gate-hash'})
    @patch('console.views.bcrypt.checkpw', return_value=True)
    @patch('console.views.bcrypt.hashpw', return_value=b'$2b$12$hashed-password')
    @patch('console.views.bcrypt.gensalt', return_value=b'$2b$12$salt')
    @patch('console.views.audit')
    @patch('console.views.execute')
    @patch('console.views.scalar', return_value=42)
    @patch('console.views.rows', side_effect=[[], [{'id': 3}]])
    @patch('console.views.transaction.atomic', return_value=nullcontext())
    def test_admin_can_create_another_admin_with_signup_credentials(
        self, atomic, rows, scalar, execute, audit, gensalt, hashpw, checkpw, founder_profile
    ):
        self.authenticate_admin()

        response = self.client.post('/admin/action/admin-create/', {
            'section': 'access',
            'firstName': 'Asha',
            'lastName': 'Mrema',
            'username': ' Asha.Admin ',
            'email': ' ASHA@example.test ',
            'phone': '+255 700 000 000',
            'city': 'Dar es Salaam',
            'password': 'StrongPass123!',
            'confirmPassword': 'StrongPass123!',
            'confirmationPassword': 'founder-password',
        })

        self.assertRedirects(response, '/admin/admins/42/', fetch_redirect_response=False)
        checkpw.assert_called_once_with(b'founder-password', b'gate-hash')
        gensalt.assert_called_once_with(rounds=12)
        hashpw.assert_called_once_with(b'StrongPass123!', b'$2b$12$salt')
        execute.assert_any_call(
            'INSERT INTO users (username,email,phone,password_hash,status,email_verified_at) VALUES (%s,%s,%s,%s,\'active\',UTC_TIMESTAMP())',
            ['asha.admin', 'asha@example.test', '+255 700 000 000', '$2b$12$hashed-password'],
        )
        rows.assert_any_call(
            'SELECT id FROM users WHERE email=%s OR phone=%s OR username=%s FOR UPDATE',
            ['asha@example.test', '+255 700 000 000', 'asha.admin'],
        )
        execute.assert_any_call(
            'INSERT INTO user_profiles (user_id,first_name,last_name,avatar_url,city) VALUES (%s,%s,%s,%s,%s)',
            [42, 'Asha', 'Mrema', '/assets/default-avatar.svg', 'Dar es Salaam'],
        )
        execute.assert_any_call(
            'INSERT INTO user_roles (user_id,role_id,assigned_by) VALUES (%s,%s,NULL)',
            [42, 3],
        )
        execute.assert_any_call(
            'INSERT INTO admin_access_profiles (user_id,managed_by) VALUES (%s,NULL)',
            [42],
        )
        audit.assert_called_once_with('administrator_created', 'user', 42, {'email': 'asha@example.test', 'username': 'asha.admin'})

    @patch('console.views.load_founder_profile', return_value=None)
    @patch.dict(os.environ, {'ADMIN_GATE_PASSWORD_HASH': 'gate-hash'})
    @patch('console.views.bcrypt.checkpw', return_value=True)
    @patch('console.views.execute')
    @patch('console.views.rows')
    @patch('console.views.transaction.atomic', return_value=nullcontext())
    def test_admin_creation_rejects_weak_signup_password(self, atomic, rows, execute, checkpw, founder_profile):
        self.authenticate_admin()

        response = self.client.post('/admin/action/admin-create/', {
            'firstName': 'Asha',
            'lastName': 'Mrema',
            'username': 'asha-admin',
            'email': 'asha@example.test',
            'phone': '+255 700 000 000',
            'city': 'Dar es Salaam',
            'password': 'password',
            'confirmPassword': 'password',
            'confirmationPassword': 'founder-password',
        })

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'at least 12 characters')
        self.assertContains(response, 'value="asha@example.test"')
        self.assertContains(response, 'value="asha-admin"')
        self.assertContains(response, 'value="Asha"')
        self.assertNotContains(response, 'value="password"')
        rows.assert_not_called()
        execute.assert_not_called()

    @patch('console.views.load_founder_profile', return_value=None)
    @patch.dict(os.environ, {'ADMIN_GATE_PASSWORD_HASH': 'gate-hash'})
    @patch('console.views.bcrypt.checkpw', return_value=False)
    @patch('console.views.execute')
    @patch('console.views.rows')
    @patch('console.views.transaction.atomic', return_value=nullcontext())
    def test_admin_creation_requires_console_password_confirmation(self, atomic, rows, execute, checkpw, founder_profile):
        self.authenticate_admin()

        response = self.client.post('/admin/action/admin-create/', {
            'firstName': 'Asha',
            'lastName': 'Mrema',
            'username': 'asha-admin',
            'email': 'asha@example.test',
            'phone': '+255 700 000 000',
            'city': 'Dar es Salaam',
            'password': 'StrongPass123!',
            'confirmPassword': 'StrongPass123!',
            'confirmationPassword': 'wrong-password',
        })

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'administrator password')
        self.assertContains(response, 'value="asha@example.test"')
        self.assertContains(response, 'name="formStep" value="2"')
        self.assertNotContains(response, 'value="wrong-password"')
        rows.assert_not_called()
        execute.assert_not_called()

    @patch('console.views.load_founder_profile', return_value=None)
    @patch.dict(os.environ, {'ADMIN_GATE_PASSWORD_HASH': 'gate-hash'})
    @patch('console.views.bcrypt.checkpw', return_value=True)
    @patch('console.views.execute')
    @patch('console.views.rows')
    @patch('console.views.transaction.atomic', return_value=nullcontext())
    def test_admin_creation_rejects_invalid_username_and_retains_it(self, atomic, rows, execute, checkpw, founder_profile):
        self.authenticate_admin()

        response = self.client.post('/admin/action/admin-create/', {
            'firstName': 'Asha',
            'lastName': 'Mrema',
            'username': 'asha admin',
            'email': 'asha@example.test',
            'phone': '+255 700 000 000',
            'city': 'Dar es Salaam',
            'password': 'StrongPass123!',
            'confirmPassword': 'StrongPass123!',
            'confirmationPassword': 'founder-password',
        })

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Use a username of 3 to 120')
        self.assertContains(response, 'value="asha admin"')
        rows.assert_not_called()
        execute.assert_not_called()

    @patch('console.views.audit')
    @patch('console.views.execute')
    @patch('console.views.rows', side_effect=[[{'id': 3}], [], []])
    @patch('console.views.transaction.atomic', return_value=nullcontext())
    def test_assigning_admin_role_preserves_existing_account_credentials(self, atomic, rows, execute, audit):
        self.authenticate_admin()

        response = self.client.post('/admin/action/user-role/', {
            'id': '8',
            'role': 'administrator',
            'operation': 'assign',
            'section': 'access',
        })

        self.assertRedirects(response, '/admin/?section=access', fetch_redirect_response=False)
        execute.assert_any_call(
            'INSERT IGNORE INTO user_roles (user_id,role_id,assigned_by) VALUES (%s,%s,NULL)',
            [8, 3],
        )
        execute.assert_any_call(
            'INSERT IGNORE INTO admin_access_profiles (user_id,managed_by) VALUES (%s,NULL)',
            [8],
        )
        self.assertNotIn('password_hash', execute.call_args.args[0])
        audit.assert_called_once_with('user_role_assign', 'user', 8, {'role': 'administrator'})

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