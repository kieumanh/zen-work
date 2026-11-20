"""Bundle the verified Vite build as a single HTML preview for Chromium."""

import base64
import mimetypes
import re
import sys
from pathlib import Path

dist = Path(__file__).resolve().parent.parent / "dist"
target = Path(sys.argv[1])

def data_url(path):
    kind = mimetypes.guess_type(path)[0] or "application/octet-stream"
    return f"data:{kind};base64," + base64.b64encode(path.read_bytes()).decode()

html = (dist / "index.html").read_text()
script = re.search(r'<script type="module"[^>]+src="([^"]+)"></script>', html)
style = re.search(r'<link rel="stylesheet"[^>]+href="([^"]+)">', html)
if not script or not style:
    raise SystemExit("Expected a single bundled JavaScript and CSS file")
logo = data_url(dist / "logo.png")
js = (dist / script[1]).read_text()
for quote in ('"', "'", chr(96)):
    js = js.replace(quote + "./logo.png" + quote, '"' + logo + '"')
if "logo.png" in js or 'data:image/png' not in js or "</script" in js.lower():
    raise SystemExit("Unexpected HTML bundle format")
css_path = dist / style[1]
css = re.sub(r"url\((\./[^)]+)\)", lambda match: "url(" + data_url(css_path.parent / match[1]) + ")", css_path.read_text())
html = html.replace(script[0], "").replace(style[0], "<style>" + css + "</style>")
html = html.replace('href="./logo.png"', 'href="' + logo + '"')
html = html.replace("</body>", '<script type="module">' + js + '</script></body>')
target.write_text(html)
