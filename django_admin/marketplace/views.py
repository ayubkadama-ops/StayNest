import json
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import HTTPRedirectHandler, Request, build_opener, urlopen

from django.conf import settings
from django.http import Http404, HttpResponse, JsonResponse, StreamingHttpResponse
from django.shortcuts import redirect, render
from django.views.decorators.csrf import csrf_exempt

PROPERTY_TYPES = (
    ('house', 'Homes'),
    ('apartment', 'Apartments'),
    ('land', 'Land'),
    ('hotel', 'Hotels'),
    ('commercial', 'Commercial'),
)
HOME_CATEGORIES = (
    {'value': 'house', 'label': 'Homes', 'caption': 'Comfort for your family', 'image': '/assets/makazi-category-home.webp'},
    {'value': 'apartment', 'label': 'Apartments', 'caption': 'Modern living, made easy', 'image': '/assets/makazi-category-apartment.webp'},
    {'value': 'land', 'label': 'Land', 'caption': 'Build your future', 'image': '/assets/makazi-category-land.webp'},
    {'value': 'hotel', 'label': 'Hotels', 'caption': 'Investment in hospitality', 'image': '/assets/makazi-category-hotel.webp'},
    {'value': 'commercial', 'label': 'Commercial', 'caption': 'Space for business', 'image': '/assets/makazi-category-commercial.webp'},
)


class _NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, file_pointer, code, message, headers, new_url):
        return None


def _upstream_url(path):
    return f'{settings.API_UPSTREAM_URL.rstrip("/")}/{path.lstrip("/")}'


def _api_json(request, path):
    headers = {'Accept': 'application/json'}
    cookie = request.META.get('HTTP_COOKIE')
    if cookie:
        headers['Cookie'] = cookie
    try:
        with urlopen(Request(_upstream_url(path), headers=headers), timeout=8) as response:
            return json.loads(response.read().decode('utf-8'))
    except (HTTPError, URLError, TimeoutError, ValueError, OSError):
        return {}


def _render(request, page, **context):
    return render(request, 'marketplace/page.html', {
        'page': page,
        'property_types': PROPERTY_TYPES,
        **context,
    })


def _listing_view_model(listing):
    amenities = listing.get('amenities') or ''
    listing['amenityList'] = amenities if isinstance(amenities, list) else [item.strip() for item in amenities.split(',') if item.strip()]
    listing.setdefault('propertyType', 'property')
    listing.setdefault('structureType', listing['propertyType'])
    listing.setdefault('bedrooms', 0)
    listing.setdefault('beds', listing['bedrooms'])
    listing.setdefault('bathrooms', 0)
    listing.setdefault('maxGuests', 0)
    listing.setdefault('privacyType', '')
    return listing


def home(request):
    result = _api_json(request, 'api/listings/discover?limit=8')
    return _render(request, 'home', listings=[_listing_view_model(listing) for listing in result.get('listings', [])[:8]], categories=HOME_CATEGORIES)


def properties(request):
    filters = {
        key: request.GET.get(key, '').strip()
        for key in ('q', 'location', 'propertyType', 'rentalMode', 'sort')
    }
    query = urlencode({key: value for key, value in filters.items() if value})
    result = _api_json(request, f'api/listings/discover?{query}')
    return _render(request, 'properties', listings=[_listing_view_model(listing) for listing in result.get('listings', [])], filters=filters)


def property_detail(request, listing_id):
    result = _api_json(request, f'api/listings/{listing_id}/details')
    listing = result.get('listing')
    if not listing:
        raise Http404('Property not found')
    listing = _listing_view_model(listing)
    return render(request, 'marketplace/property_detail.html', {
        'listing': listing,
        'media': result.get('media', []),
        'property_types': PROPERTY_TYPES,
    })


def agents(request):
    result = _api_json(request, 'api/agents')
    return _render(request, 'agents', agents=result.get('agents', []))


def agent_detail(request, agent_id):
    result = _api_json(request, f'api/agents/{agent_id}/profile')
    profile = result.get('profile')
    if not profile:
        raise Http404('Agent not found')
    return render(request, 'marketplace/agent_detail.html', {
        'profile': profile,
        'posts': result.get('posts', []),
        'property_types': PROPERTY_TYPES,
    })


def account(request):
    next_url = request.GET.get('next', '/')
    if not next_url.startswith('/') or next_url.startswith('//'):
        next_url = '/'
    return redirect(f'/login/?next={quote(next_url)}')


def login_page(request):
    next_url = request.GET.get('next', '/')
    if not next_url.startswith('/') or next_url.startswith('//'):
        next_url = '/'
    return render(request, 'marketplace/auth.html', {
        'mode': 'login',
        'next_url': next_url,
        'next_query': quote(next_url, safe=''),
        'property_types': PROPERTY_TYPES,
    })


def signup_page(request):
    next_url = request.GET.get('next', '/')
    if not next_url.startswith('/') or next_url.startswith('//'):
        next_url = '/'
    role = request.GET.get('role', 'tenant')
    if role not in {'tenant', 'agent'}:
        role = 'tenant'
    return render(request, 'marketplace/auth.html', {
        'mode': 'signup',
        'next_url': next_url,
        'next_query': quote(next_url, safe=''),
        'signup_role': role,
        'property_types': PROPERTY_TYPES,
    })


def tenant_dashboard(request):
    user = _api_json(request, 'api/auth/me').get('user')
    if not user:
        return redirect(f'/account/?next={quote("/account/dashboard/")}')
    if 'tenant' not in user.get('roles', []):
        return redirect('/agent/')
    summary = _api_json(request, 'api/account/summary')
    bookings = _api_json(request, 'api/account/bookings').get('bookings', [])
    saved_listings = _api_json(request, 'api/account/saved-listings').get('listings', [])
    return render(request, 'marketplace/tenant_dashboard.html', {
        'user': user,
        'summary': summary,
        'bookings': bookings,
        'saved_listings': saved_listings,
        'property_types': PROPERTY_TYPES,
    })


def agent_workspace(request):
    user = _api_json(request, 'api/auth/me').get('user')
    if not user:
        return redirect(f'/account/?next={quote("/agent/")}')
    if 'agent' not in user.get('roles', []):
        return redirect('/account/dashboard/')
    listings = _api_json(request, 'api/host/listings').get('listings', [])
    summary = _api_json(request, 'api/agent/summary')
    bookings = _api_json(request, 'api/agent/bookings').get('bookings', [])
    bookings = _api_json(request, 'api/agent/bookings').get('bookings', [])
    return render(request, 'marketplace/agent_workspace.html', {
        'user': user,
        'listings': listings,
        'summary': summary,
        'bookings': bookings,
        'bookings': bookings,
        'property_types': PROPERTY_TYPES,
    })


@csrf_exempt
def api_proxy(request, api_path):
    target = _upstream_url(f'api/{api_path}')
    if request.META.get('QUERY_STRING'):
        target = f'{target}?{request.META["QUERY_STRING"]}'
    headers = {}
    for source, destination in (
        ('CONTENT_TYPE', 'Content-Type'),
        ('HTTP_ACCEPT', 'Accept'),
        ('HTTP_COOKIE', 'Cookie'),
        ('HTTP_AUTHORIZATION', 'Authorization'),
        ('HTTP_X_FORWARDED_FOR', 'X-Forwarded-For'),
        ('HTTP_X_FORWARDED_PROTO', 'X-Forwarded-Proto'),
        ('HTTP_X_CSRF_TOKEN', 'X-CSRF-Token'),
        ('HTTP_IDEMPOTENCY_KEY', 'Idempotency-Key'),
        ('HTTP_X_STAYNEST_GUEST', 'X-StayNest-Guest'),
    ):
        value = request.META.get(source)
        if value:
            headers[destination] = value
    body = request.body if request.method not in {'GET', 'HEAD'} else None
    upstream_request = Request(target, data=body, headers=headers, method=request.method)
    try:
        upstream = build_opener(_NoRedirect()).open(upstream_request, timeout=30)
    except HTTPError as error:
        upstream = error
    except (URLError, TimeoutError, OSError):
        return JsonResponse({'error': 'Marketplace services are temporarily unavailable.'}, status=502)
    response = HttpResponse(upstream.read(), status=upstream.status)
    for header in ('Content-Type', 'Set-Cookie', 'Location', 'Cache-Control', 'Retry-After', 'X-Request-Id'):
        value = upstream.headers.get(header)
        if value:
            response[header] = value
    return response


@csrf_exempt
def media_proxy(request, media_path):
    if request.method not in {'GET', 'HEAD'}:
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    headers = {}
    for source, destination in (
        ('HTTP_RANGE', 'Range'),
        ('HTTP_IF_NONE_MATCH', 'If-None-Match'),
        ('HTTP_IF_MODIFIED_SINCE', 'If-Modified-Since'),
    ):
        value = request.META.get(source)
        if value:
            headers[destination] = value
    try:
        upstream = urlopen(Request(_upstream_url(f'media/{media_path}'), headers=headers, method=request.method), timeout=20)
    except HTTPError as error:
        upstream = error
    except (URLError, TimeoutError, OSError):
        return HttpResponse(status=502)
    response = StreamingHttpResponse(_stream_response(upstream), status=upstream.status)
    response._resource_closers.append(upstream.close)
    for header in ('Content-Type', 'Content-Length', 'Content-Range', 'Accept-Ranges', 'Cache-Control', 'Last-Modified', 'ETag'):
        value = upstream.headers.get(header)
        if value:
            response[header] = value
    return response

def vendor_proxy(request, asset_path):
    allowed_assets = {
        'leaflet.js', 'leaflet.css', 'images/layers.png', 'images/layers-2x.png',
        'images/marker-icon.png', 'images/marker-icon-2x.png', 'images/marker-shadow.png',
    }
    if asset_path not in allowed_assets:
        raise Http404('Vendor asset not found')
    try:
        with urlopen(Request(_upstream_url(f'vendor/{asset_path}')), timeout=8) as upstream:
            response = HttpResponse(upstream.read(), content_type=upstream.headers.get_content_type())
            response['Cache-Control'] = 'public, max-age=86400'
            return response
    except (HTTPError, URLError, TimeoutError, OSError):
        return HttpResponse(status=502)

def _stream_response(upstream):
    try:
        while chunk := upstream.read(64 * 1024):
            yield chunk
    finally:
        upstream.close()


def health(request):
    return JsonResponse({'ok': True, 'service': 'makazi-go-django-marketplace'})
