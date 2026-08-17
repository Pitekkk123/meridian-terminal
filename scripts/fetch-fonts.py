#!/usr/bin/env python3
"""Download the finn-app font set (Newsreader / IBM Plex Mono / Instrument Sans,
latin + latin-ext, normal style only) into public/fonts and write public/fonts.css."""
import os, re, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FONTS = os.path.join(ROOT, "public", "fonts")
os.makedirs(FONTS, exist_ok=True)

UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"}
URL = ("https://fonts.googleapis.com/css2?"
       "family=Newsreader:opsz,wght@6..72,500;6..72,600&"
       "family=IBM+Plex+Mono:wght@400;500;600&"
       "family=Instrument+Sans:wght@400;500;600&display=swap")

css = urllib.request.urlopen(urllib.request.Request(URL, headers=UA), timeout=30).read().decode()
blocks = re.findall(r"/\* (\S+) \*/\s*@font-face\s*{([^}]+)}", css)
faces, seen = [], set()
for subset, body in blocks:
    if subset not in ("latin", "latin-ext"):
        continue
    fam = re.search(r"font-family:\s*'([^']+)'", body).group(1)
    wght = re.search(r"font-weight:\s*(\d+)", body).group(1)
    if "italic" in body:
        continue
    src = re.search(r"url\((https://[^)]+\.woff2)\)", body).group(1)
    key = (fam, wght, subset)
    if key in seen:
        continue
    seen.add(key)
    fname = f"{fam.replace(' ', '')}-{wght}-{subset}.woff2"
    urllib.request.urlretrieve(src, os.path.join(FONTS, fname))
    faces.append(
        f"@font-face{{font-family:'{fam}';font-style:normal;font-weight:{wght};font-display:swap;"
        f"src:url('/fonts/{fname}') format('woff2');}}")

with open(os.path.join(ROOT, "public", "fonts.css"), "w") as f:
    f.write("\n".join(faces))
print(f"OK: {len(faces)} faces -> public/fonts")
