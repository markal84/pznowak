#!/usr/bin/env python3
"""Lokalny serwer przeglądu zdjęć z FB: pliki z data/facebook + zapis decyzji w selection.json.

Użycie (z katalogu głównego repo):  python3 scripts/facebook/review_server.py
Potem:  http://127.0.0.1:3011/review.html

Tylko stdlib. Nasłuchuje wyłącznie na 127.0.0.1.
  GET  /api/selection   aktualne decyzje (albo pusty stan, gdy pliku jeszcze nie ma)
  PUT  /api/selection   {"rev": N, "state": {...}}; zapis atomowy, kopia poprzedniej wersji w selection.json.bak,
                        409 gdy rev nie zgadza się z plikiem (zmiana z innej karty)
  POST /api/export      uruchamia export_selection.py
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import threading
from datetime import datetime, timezone
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HERE = Path(__file__).resolve().parent
MAX_BODY = 5 * 1024 * 1024
BUCKETS = ("cards", "existing", "skipped")
LOCK = threading.Lock()


def blank():
    return {"version": 1, "rev": 0, "cards": {}, "existing": {}, "skipped": {}}


class Limited:
    """Czyta najwyżej n bajtów z pliku (do odpowiedzi 206)."""

    def __init__(self, f, n):
        self.f, self.left = f, n

    def read(self, size=-1):
        if self.left <= 0:
            return b""
        size = self.left if size is None or size < 0 else min(size, self.left)
        data = self.f.read(size)
        self.left -= len(data)
        return data

    def close(self):
        self.f.close()


class Handler(SimpleHTTPRequestHandler):
    server_version = "review-server"
    root: Path
    port: int

    # ---- pomocnicze ----
    def log_message(self, fmt, *args):
        if "/api/" in (self.path or ""):
            super().log_message(fmt, *args)

    def end_headers(self):
        self.send_header("Accept-Ranges", "bytes")
        if self.path.startswith("/api/") or self.path.split("?")[0].endswith((".html", ".json")):
            self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def allowed_hosts(self):
        return {f"127.0.0.1:{self.port}", f"localhost:{self.port}"}

    def host_ok(self):
        # Ochrona przed DNS rebinding: tylko własny adres.
        return (self.headers.get("Host") or "") in self.allowed_hosts()

    def origin_ok(self):
        origin = self.headers.get("Origin")
        return origin is None or origin in {f"http://{h}" for h in self.allowed_hosts()}

    def send_json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_json_body(self):
        if (self.headers.get("Content-Type") or "").split(";")[0].strip() != "application/json":
            raise ValueError("wymagany Content-Type: application/json")
        n = int(self.headers.get("Content-Length") or 0)
        if n <= 0 or n > MAX_BODY:
            raise ValueError("zły rozmiar żądania")
        return json.loads(self.rfile.read(n).decode("utf-8"))

    # ---- stan ----
    @property
    def sel_path(self):
        return self.root / "selection.json"

    def load_state(self):
        if not self.sel_path.exists():
            return blank()
        data = json.loads(self.sel_path.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            raise ValueError("selection.json nie jest obiektem")
        for b in BUCKETS:
            data.setdefault(b, {})
        data.setdefault("rev", 0)
        return data

    def write_state(self, state):
        path = self.sel_path
        tmp = path.with_name(path.name + ".tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(state, f, ensure_ascii=False, indent=1)
            f.flush()
            os.fsync(f.fileno())
        if path.exists():
            shutil.copy2(path, path.with_name(path.name + ".bak"))
        os.replace(tmp, path)

    # ---- routing ----
    def guard(self, write=False):
        if not self.host_ok() or (write and not self.origin_ok()):
            self.send_json(403, {"error": "niedozwolony Host/Origin"})
            return False
        return True

    def do_GET(self):
        if not self.guard():
            return
        path = self.path.split("?")[0]
        if path == "/api/selection":
            with LOCK:
                try:
                    self.send_json(200, self.load_state())
                except (ValueError, OSError) as e:
                    self.send_json(500, {"error": f"selection.json nieczytelny: {e}"})
            return
        if path == "/":
            self.send_response(302)
            self.send_header("Location", "/review.html")
            self.end_headers()
            return
        super().do_GET()

    def do_HEAD(self):
        if self.guard():
            super().do_HEAD()

    def do_PUT(self):
        if not self.guard(write=True):
            return
        if self.path.split("?")[0] != "/api/selection":
            self.send_json(404, {"error": "nie ma"})
            return
        try:
            body = self.read_json_body()
            state, rev = body["state"], body["rev"]
            if not isinstance(state, dict) or not isinstance(rev, int):
                raise ValueError("zły format")
            for b in BUCKETS:
                if not isinstance(state.get(b), dict):
                    raise ValueError(f"brak sekcji {b}")
        except (ValueError, KeyError, TypeError) as e:
            self.send_json(400, {"error": f"błędne dane: {e}"})
            return
        with LOCK:
            try:
                cur = self.load_state()
            except (ValueError, OSError) as e:
                self.send_json(500, {"error": f"selection.json nieczytelny, nie nadpisuję: {e}"})
                return
            if cur["rev"] != rev:
                self.send_json(409, {"error": "rev", "rev": cur["rev"]})
                return
            new = {k: v for k, v in state.items() if k not in ("rev", "savedAt", "version")}
            new = {"version": 1, "rev": rev + 1, "savedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"), **new}
            try:
                self.write_state(new)
            except OSError as e:
                self.send_json(500, {"error": f"zapis się nie udał: {e}"})
                return
        self.send_json(200, {"rev": new["rev"], "savedAt": new["savedAt"]})

    def do_POST(self):
        if not self.guard(write=True):
            return
        if self.path.split("?")[0] != "/api/export":
            self.send_json(404, {"error": "nie ma"})
            return
        with LOCK:
            r = subprocess.run([sys.executable, "-I", str(HERE / "export_selection.py"), str(self.root)], capture_output=True, text=True, timeout=60)
        if r.returncode != 0:
            self.send_json(500, {"ok": False, "error": (r.stderr or r.stdout).strip()[-800:]})
        else:
            self.send_json(200, {"ok": True, "summary": r.stdout.strip()})

    # ---- Range (Safari wymaga go do filmów) ----
    def send_head(self):
        rng = self.headers.get("Range")
        fs_path = self.translate_path(self.path)
        if not rng or not os.path.isfile(fs_path):
            return super().send_head()
        size = os.path.getsize(fs_path)
        m = re.fullmatch(r"bytes=(\d*)-(\d*)", rng.strip())
        if not m or not (m.group(1) or m.group(2)):
            self.send_error(416)
            return None
        if m.group(1):
            start = int(m.group(1))
            end = int(m.group(2)) if m.group(2) else size - 1
        else:
            start, end = max(size - int(m.group(2)), 0), size - 1
        end = min(end, size - 1)
        if start > end or start >= size:
            self.send_response(416)
            self.send_header("Content-Range", f"bytes */{size}")
            self.end_headers()
            return None
        f = open(fs_path, "rb")
        f.seek(start)
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(fs_path))
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Content-Length", str(end - start + 1))
        self.end_headers()
        return Limited(f, end - start + 1)


class Server(ThreadingHTTPServer):
    daemon_threads = True

    def handle_error(self, request, client_address):
        if isinstance(sys.exc_info()[1], (BrokenPipeError, ConnectionResetError)):
            return  # przeglądarka przerwała pobieranie filmu (przewijanie)
        super().handle_error(request, client_address)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dir", default=str(HERE.parent.parent / "data" / "facebook"), help="katalog z review.html i media/")
    ap.add_argument("--port", type=int, default=3011)
    a = ap.parse_args()
    root = Path(a.dir).resolve()
    if not (root / "media").is_dir():
        sys.exit(f"Brak {root}/media. Podaj --dir z danymi z Facebooka.")
    handler = type("H", (Handler,), {"root": root, "port": a.port})
    try:
        srv = Server(("127.0.0.1", a.port), partial(handler, directory=str(root)))
    except OSError as e:
        sys.exit(f"Nie mogę wystartować na 127.0.0.1:{a.port}: {e} (może serwer już działa?)")
    print(f"Przegląd: http://127.0.0.1:{a.port}/review.html  (decyzje: {root / 'selection.json'})", flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nKoniec.")


if __name__ == "__main__":
    main()
