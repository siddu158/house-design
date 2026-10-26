import http.server
import socketserver
import webbrowser
import os

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

if __name__ == '__main__':
    url = f"http://localhost:{PORT}/HomeHue_MasterAI.html"
    print("=" * 60)
    print("  🏠 HomeHue: Master AI Architectural Studio")
    print(f"  Live Studio URL: {url}")
    print("  Press Ctrl+C to stop the server.")
    print("=" * 60)
    try:
        webbrowser.open(url)
    except Exception:
        pass
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")