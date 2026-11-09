import re


class ContentSecurityPolicyMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if not request.path.startswith('/admin/'):
            return response
        document_preview = re.fullmatch(r'/admin/identity-documents/[1-9]\d*/', request.path) is not None
        frame_ancestors = "'self'" if document_preview else "'none'"
        response['Content-Security-Policy'] = (
            f"default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors {frame_ancestors}; "
            "form-action 'self'; script-src 'self'; script-src-attr 'none'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "img-src 'self' data: blob: https:; "
            "font-src 'self' data: https://fonts.gstatic.com; connect-src 'self'; "
            "media-src 'self' blob: https://res.cloudinary.com"
        )
        if document_preview:
            response['X-Frame-Options'] = 'SAMEORIGIN'
        if not response.has_header('Referrer-Policy'):
            response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        return response
