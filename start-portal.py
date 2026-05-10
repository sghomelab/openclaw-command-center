#!/usr/bin/env python3
"""Simple Claw Portal launcher — serves frontend static files + proxies /v3 to backend API."""
import subprocess
import sys
import os
import signal
import time
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse
import urllib.request
import urllib.error

BACKEND_URL = "http://localhost:9000"  # Backend runs on 9000
FRONTEND_PORT = 5713  # User-facing port
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend", "dist")
BACKEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
VENV_PYTHON = sys.executable

backend_proc = None
backend_ready = threading.Event()

def start_backend():
    """Start the FastAPI backend on port 9000."""
    global backend_proc
    print(f"🔧 Starting backend API on {BACKEND_URL}...")
    print(f"   Using Python: {VENV_PYTHON}")
    
    # Disable reload for cleaner startup
    os.environ["BACKEND_PORT"] = "9000"
    
    backend_proc = subprocess.Popen(
        [VENV_PYTHON, "run.py"],
        cwd=BACKEND_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        bufsize=1,
        universal_newlines=True,
    )
    
    # Stream backend output
    def stream_output():
        for line in backend_proc.stdout:
            print(f"  [API] {line.rstrip()}")
    
    threading.Thread(target=stream_output, daemon=True).start()
    
    # Wait for backend to be ready
    print("   Waiting for API to start...")
    for i in range(30):
        try:
            resp = urllib.request.urlopen(f"{BACKEND_URL}/docs", timeout=2)
            if resp.status == 200:
                print("✅ Backend API ready")
                backend_ready.set()
                return
        except Exception as e:
            if i < 5:
                time.sleep(1)
            else:
                time.sleep(0.5)
    
    print(f"⚠️  Backend didn't respond in 30s")
    backend_ready.set()  # Continue anyway

class PortalHandler(SimpleHTTPRequestHandler):
    """Serves frontend static files and proxies /v3 to backend."""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)
    
    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/v3") or parsed.path.startswith("/docs"):
            self.proxy_request("GET", parsed)
        else:
            super().do_GET()
    
    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/v3"):
            self.proxy_request("POST", parsed)
        else:
            self.send_error(404)
    
    def do_PUT(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/v3"):
            self.proxy_request("PUT", parsed)
        else:
            self.send_error(404)
    
    def do_DELETE(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/v3"):
            self.proxy_request("DELETE", parsed)
        else:
            self.send_error(404)
    
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
    
    def proxy_request(self, method, parsed):
        """Forward request to backend API."""
        backend_path = parsed.path + ("?" + parsed.query if parsed.query else "")
        backend_url = f"{BACKEND_URL}{backend_path}"
        
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length) if content_length > 0 else None
            
            req = urllib.request.Request(
                backend_url,
                data=body,
                method=method,
            )
            for header in ["Content-Type", "Authorization", "Accept"]:
                if self.headers.get(header):
                    req.add_header(header, self.headers[header])
            
            response = urllib.request.urlopen(req)
            
            self.send_response(response.status)
            for header in ["Content-Type", "Content-Length"]:
                if response.getheader(header):
                    self.send_header(header, response.getheader(header))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(response.read())
            
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(e.read())
        except Exception as e:
            print(f"  [Proxy error] {e}")
            self.send_error(502, f"Backend error: {e}")
    
    def log_message(self, format, *args):
        print(f"  [Web] {format % args}")

if __name__ == "__main__":
    print("🗿 Claw Portal — Mission Control")
    print("=" * 40)
    
    # Start backend
    start_backend()
    
    # Start frontend proxy
    print(f"🌐 Starting frontend server on port {FRONTEND_PORT}...")
    server = HTTPServer(("0.0.0.0", FRONTEND_PORT), PortalHandler)
    print(f"✅ Claw Portal running on http://localhost:{FRONTEND_PORT}")
    print("=" * 40)
    print("   Frontend: React SPA (nginx replacement)")
    print("   Backend:  FastAPI on :9000")
    print("   Press Ctrl+C to stop")
    print("=" * 40)
    
    def shutdown(signum, frame):
        print("\n🛑 Shutting down...")
        if backend_proc and backend_proc.poll() is None:
            backend_proc.terminate()
            backend_proc.wait(timeout=5)
            print("   Backend stopped")
        server.shutdown()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        shutdown(None, None)
