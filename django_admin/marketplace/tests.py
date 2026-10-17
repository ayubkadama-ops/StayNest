from django.test import SimpleTestCase, override_settings
from django.urls import reverse, resolve
from unittest.mock import patch


@override_settings(STORAGES={
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
})
class MarketplaceRoutingTests(SimpleTestCase):
    def test_public_routes_are_distinct_pages(self):
        self.assertEqual(resolve('/').url_name, 'home')
        self.assertEqual(resolve('/properties/').url_name, 'properties')
        self.assertEqual(resolve('/properties/17/').url_name, 'property-detail')
        self.assertEqual(resolve('/agents/').url_name, 'agents')
        self.assertEqual(resolve('/agents/23/').url_name, 'agent-detail')
        self.assertEqual(resolve('/account/').url_name, 'account')
        self.assertEqual(resolve('/login/').url_name, 'login')
        self.assertEqual(resolve('/signup/').url_name, 'signup')
        self.assertEqual(resolve('/account/dashboard/').url_name, 'tenant-dashboard')
        self.assertEqual(resolve('/agent/').url_name, 'agent-workspace')

    def test_public_pages_render_as_distinct_routes(self):
        with patch('marketplace.views._api_json', return_value={}):
            for path in ('/', '/properties/', '/agents/', '/login/', '/signup/'):
                with self.subTest(path=path):
                    response = self.client.get(path)
                    self.assertEqual(response.status_code, 200)
                    self.assertContains(response, 'Makazi Go')
                    self.assertContains(response, 'Browse property categories')
                    self.assertContains(response, '<svg', count=5)
                    self.assertContains(response, 'data-social-link="instagram"')
                    self.assertContains(response, 'footer-links')

    def test_login_and_signup_are_separate_connected_flows(self):
        login = self.client.get('/login/?next=/account/dashboard/')
        self.assertEqual(login.status_code, 200)
        self.assertContains(login, 'data-login-form')
        self.assertContains(login, 'data-mfa-field')
        self.assertContains(login, '/signup/?next=')
        signup = self.client.get('/signup/?role=agent&next=/agent/')
        self.assertEqual(signup.status_code, 200)
        self.assertContains(signup, 'data-signup-form')
        self.assertContains(signup, 'Agency or business name')
        self.assertContains(signup, 'Phone number')
        self.assertContains(signup, '/login/?next=')

    def test_agent_signup_selects_agent_wizard_and_optional_business_fields(self):
        response = self.client.get('/signup/?role=agent&next=/agent/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'value="agent" checked')
        self.assertContains(response, 'data-agent-only')
        self.assertContains(response, 'Agency or business name')

    @patch('marketplace.views._api_json', return_value={'listings': []})
    def test_home_uses_reference_category_photography(self, api_json):
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        for category in ('home', 'apartment', 'land', 'hotel', 'commercial'):
            self.assertContains(response, f'makazi-category-{category}.webp')

    @patch('marketplace.views._api_json')
    def test_stay_detail_uses_booking_flow(self, api_json):
        api_json.return_value = {'listing': {'id': 17, 'title': 'City apartment', 'propertyType': 'apartment', 'currency': 'TZS', 'nightlyPrice': 70000}, 'media': []}
        response = self.client.get('/properties/17/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'data-booking-form')
        self.assertContains(response, 'data-auth-required')
        self.assertContains(response, 'id="authPrompt"')
        self.assertNotContains(response, 'data-message-form')

    @patch('marketplace.views._api_json')
    def test_apartment_detail_shows_distinct_capacity_and_pinned_location(self, api_json):
        api_json.return_value = {
            'listing': {
                'id': 19,
                'title': 'City apartment',
                'propertyType': 'apartment',
                'currency': 'TZS',
                'beds': 2,
                'bathrooms': 1,
                'privacyType': 'entire_place',
                'latitude': -6.8,
                'longitude': 39.2,
            },
            'media': [],
        }
        response = self.client.get('/properties/19/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Apartment · 2 beds · Entire place · 1 bathroom')
        self.assertContains(response, 'https://www.openstreetmap.org/?mlat=-6.8&amp;mlon=39.2#map=17/-6.8/39.2')

    @patch('marketplace.views._api_json')
    def test_land_detail_uses_agent_enquiry_flow(self, api_json):
        api_json.return_value = {'listing': {'id': 18, 'title': 'Serviced plot', 'propertyType': 'land', 'currency': 'TZS', 'agentId': 4}, 'media': []}
        response = self.client.get('/properties/18/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'data-message-form')
        self.assertNotContains(response, 'data-booking-form')

    @patch('marketplace.views._api_json')
    def test_agent_route_renders_profile_page(self, api_json):
        api_json.return_value = {'profile': {'id': 23, 'firstName': 'Asha', 'lastName': 'Mrema'}, 'posts': []}
        response = self.client.get('/agents/23/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Asha Mrema')

    def test_health_endpoint_is_available_without_database(self):
        response = self.client.get(reverse('marketplace:health'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['service'], 'makazi-go-django-marketplace')

    @override_settings(API_UPSTREAM_URL='http://127.0.0.1:3000')
    def test_account_rejects_external_redirect_targets(self):
        response = self.client.get('/account/?next=https://example.com')
        self.assertEqual(response.status_code, 302)
        self.assertTrue(response['Location'].startswith('/login/?next='))
        self.assertNotIn('example.com', response['Location'])

    @patch('marketplace.views.build_opener')
    def test_api_proxy_preserves_oauth_redirects_and_session_cookies(self, build_opener):
        response_headers = {
            'Location': 'https://accounts.example.test/oauth',
            'Set-Cookie': 'staynest.sid=session-value; Path=/; HttpOnly; SameSite=Lax',
            'Content-Type': 'text/plain',
        }
        upstream_response = type('UpstreamResponse', (), {
            'status': 302,
            'headers': type('Headers', (), {'get': lambda self, key: response_headers.get(key)})(),
            'read': lambda self: b'',
        })()
        build_opener.return_value.open.return_value = upstream_response
        response = self.client.get('/api/auth/google', HTTP_X_FORWARDED_FOR='198.51.100.23', HTTP_X_FORWARDED_PROTO='https')
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response['Location'], response_headers['Location'])
        self.assertEqual(response['Set-Cookie'], response_headers['Set-Cookie'])
        forwarded_request = build_opener.return_value.open.call_args.args[0]
        self.assertEqual(forwarded_request.get_header('X-forwarded-for'), '198.51.100.23')
        self.assertEqual(forwarded_request.get_header('X-forwarded-proto'), 'https')

    @patch('marketplace.views.urlopen')
    def test_media_proxy_streams_partial_video_responses(self, urlopen):
        class UpstreamResponse:
            status = 206
            headers = {
                'Content-Type': 'video/mp4',
                'Content-Length': '4',
                'Content-Range': 'bytes 0-3/12',
                'Accept-Ranges': 'bytes',
            }

            def __init__(self):
                self.chunks = iter((b'part', b''))
                self.closed = False

            def read(self, size):
                return next(self.chunks)

            def close(self):
                self.closed = True

        upstream = UpstreamResponse()
        urlopen.return_value = upstream
        response = self.client.get('/media/listings/12/clip.mp4', HTTP_RANGE='bytes=0-3')
        self.assertEqual(response.status_code, 206)
        self.assertEqual(response['Content-Range'], 'bytes 0-3/12')
        self.assertEqual(response['Accept-Ranges'], 'bytes')
        self.assertEqual(list(response.streaming_content), [b'part'])
        self.assertTrue(upstream.closed)
        self.assertEqual(urlopen.call_args.args[0].get_header('Range'), 'bytes=0-3')

    @patch('marketplace.views._api_json', return_value={'user': None})
    def test_private_workspaces_redirect_anonymous_users_to_sign_in(self, api_json):
        tenant_response = self.client.get('/account/dashboard/')
        agent_response = self.client.get('/agent/')
        self.assertEqual(tenant_response.status_code, 302)
        self.assertIn('/account/?next=', tenant_response['Location'])
        self.assertEqual(agent_response.status_code, 302)
        self.assertIn('/account/?next=', agent_response['Location'])

    @patch('marketplace.views._api_json')
    def test_tenant_workspace_renders_booking_history(self, api_json):
        api_json.side_effect = lambda request, path: {
            'api/auth/me': {'user': {'firstName': 'Neema', 'roles': ['tenant']}},
            'api/account/summary': {'upcomingBookings': 1, 'savedHomes': 2, 'searchAlerts': 0},
            'api/account/bookings': {'bookings': []},
            'api/account/saved-listings': {'listings': []},
        }[path]
        response = self.client.get('/account/dashboard/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Welcome, Neema.')
        self.assertContains(response, 'Booking requests')

    @patch('marketplace.views._api_json')
    def test_agent_workspace_renders_listing_actions(self, api_json):
        api_json.side_effect = lambda request, path: {
            'api/auth/me': {'user': {'firstName': 'Asha', 'roles': ['agent']}},
            'api/host/listings': {'listings': []},
            'api/agent/summary': {'assignedListings': 0, 'pendingBookings': 0, 'verificationStatus': 0},
            'api/agent/bookings': {'bookings': []},
        }[path]
        response = self.client.get('/agent/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'List a property')
        self.assertContains(response, 'Submit for review')
        self.assertContains(response, 'listing-wizard.js')
        self.assertContains(response, 'data-agent-listing-form')
        self.assertContains(response, 'value="apartment"')
        self.assertContains(response, 'value="land_plot"')
        self.assertContains(response, 'value="commercial"')
        self.assertContains(response, 'data-listing-map')
        self.assertContains(response, 'name="amenities"')

    @patch('marketplace.views.urlopen')
    def test_leaflet_vendor_proxy_only_serves_allowlisted_assets(self, urlopen):
        upstream = type('UpstreamResponse', (), {
            'headers': type('Headers', (), {'get_content_type': lambda self: 'text/javascript'})(),
            'read': lambda self: b'window.L = true;',
        })()
        urlopen.return_value.__enter__.return_value = upstream
        response = self.client.get('/vendor/leaflet.js')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'window.L = true;')
        forwarded_request = urlopen.call_args.args[0]
        self.assertTrue(forwarded_request.full_url.endswith('/vendor/leaflet.js'))
        rejected = self.client.get('/vendor/../server/index.js')
        self.assertEqual(rejected.status_code, 404)
