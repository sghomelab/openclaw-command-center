"""Production static server for Claw Portal frontend with API proxy."""
import http.server
import socketserver
import threading
import urllib.request
import os
import sys

PORT = 5713
BACKEND_URL = "http://localhost:9000"
DIST_DIR = "/home/node/.openclaw/workspace/memnew/claw-portal/frontend/dist"


class PortalHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST_DIR, **kwargs)

    def do_GET(self):
        if self.path.startswith("/v3/"):
            return self._proxy_request("GET")
        super().do_GET()

    def do_POST(self):
        if self.path.startswith("/v3/"):
            return self._proxy_request("POST")
        # For SPA fallback
        super().do_POST()

    def do_PUT(self):
        if self.path.startswith("/v3/"):
            return self._proxy_request("PUT")

    def do_DELETE(self):
        if self.path.startswith("/v3/"):
            return self._proxy_request("DELETE")

    def _proxy_request(self, method):
        """Proxy request to backend API."""
        backend_path = BACKEND_URL + self.path
        headers = {k: v for k, v in self.headers.items() if k.lower() != 'host'}
        body = None
        content_length = self.headers.get('Content-Length')
        if content_length:
            body = self.rfile.read(int(content_length))

        req = urllib.request.Request(backend_path, data=body, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req) as resp:
                self.send_response(resp.status)
                for header, value in resp.getheaders():
                    if header.lower() not in ('transfer-encoding', 'connection'):
                        self.send_header(header, value)
                self.end_headers()
                self.wfile.write(resp.read())
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            for header, value in e.headers.items():
                self.send_header(header, value)
            self.end_headers()
            self.wfile.write(e.read())
        except Exception as e:
            self.send_response(502)
            self.end_headers()
            self.wfile.write(str(e).encode())

    def log_message(self, format, *args):
        # Suppress logs
        pass


if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), PortalHandler) as httpd:
        print(f"Claw Portal frontend serving on http://0.0.0.0:{PORT}")
        print(f"API proxy -> {BACKEND_URL}")
        httpd.serve_forever()
