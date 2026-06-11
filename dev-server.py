"""Dev server: serves the whole site and saves blog notes back to disk.

Plain `python3 -m http.server` is read-only — the writing entry's "edit mode"
needs the POST /save-notes endpoint below to persist notes into index.html.

    python3 dev-server.py [port]   # default 8799, binds all interfaces (tailnet)
"""
import http.server
import json
import re
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8799
ROOT = os.path.dirname(os.path.abspath(__file__))
# The entry whose notes are editable. Add more here if the series grows.
INDEX = os.path.join(ROOT, "writing", "building-ai-tools-for-life-sciences", "index.html")

NOTES_PATTERN = re.compile(
    r'(<script type="application/json" id="notes-data">)\s*(.*?)\s*(</script>)',
    re.DOTALL,
)


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_POST(self):
        if self.path != "/save-notes":
            self.send_response(404)
            self.end_headers()
            return

        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        try:
            notes_json = json.dumps(json.loads(body), indent=2)
        except json.JSONDecodeError:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b"Invalid JSON")
            return

        with open(INDEX, "r") as f:
            html = f.read()

        new_html, count = NOTES_PATTERN.subn(
            lambda m: f"{m.group(1)}\n  {notes_json}\n  {m.group(3)}", html
        )
        if count == 0:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(b"Could not find notes-data block in index.html")
            return

        with open(INDEX, "w") as f:
            f.write(new_html)

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps({"saved": True}).encode())
        print(f"  Notes saved to {INDEX}")

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()


class Server(http.server.ThreadingHTTPServer):
    # Threaded so concurrent requests (browser keep-alive connections + the
    # service worker precaching ~30 URLs at once) don't serialize and stall.
    daemon_threads = True


if __name__ == "__main__":
    print(f"Dev server at http://localhost:{PORT}/  (serving {ROOT})")
    print(f"POST /save-notes writes to {INDEX}")
    with Server(("", PORT), Handler) as s:
        s.serve_forever()
