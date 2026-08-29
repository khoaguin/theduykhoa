#!/usr/bin/env python3
"""Make a draw.io SVG export safe to publish on a dark-themed site.

Think of it as a two-stage repair on the file draw.io just wrote. draw.io
assumes your diagram was drawn on a WHITE canvas, so its "dark mode" export
writes every colour as `light-dark(<as-you-drew-it>, <auto-inverted>)`. Our
diagrams are drawn dark, so the browser picks the inverted (light) colour on a
dark page — a white slab in the middle of the article. Stage 1 swaps the pair
back. Stage 2 inlines the clip-art images, which draw.io leaves pointing at
`file:///Applications/draw.io.app/...` — fine locally, a broken image once the
page is served.

Stage 1 — swap every `light-dark(A, B)` to `light-dark(B, A)`.
    Args are matched by balancing parentheses, not by splitting on the first
    comma, because A and B are often `rgb(52, 211, 153)` — full of commas.
Stage 2 — replace every `file://` image href with a base64 `data:` URI,
    reading the bytes out of the draw.io app bundle (asar archives store
    files uncompressed, so a plain byte-scan finds the PNG in place).

Worked example — one real colour pair from zero-setup-fl.svg:
    before  light-dark(#dbe4f0, #232b35)   light page -> #dbe4f0 (near-white text) on a dark bg. unreadable
    after   light-dark(#232b35, #dbe4f0)   light page -> #232b35 (dark text),  dark page -> #dbe4f0. correct

Usage: python3 scripts/fix-drawio-svg.py content/_attachments/**/foo.svg
"""

import base64
import re
import subprocess
import sys
from pathlib import Path

APP_PREFIX = "file:///Applications/draw.io.app/Contents/Resources/"


def swap_light_dark(svg: str) -> tuple[str, int]:
    """Stage 1 — flip the two arguments of every light-dark() call."""
    out, i, swapped = [], 0, 0
    while True:
        start = svg.find("light-dark(", i)
        if start == -1:
            out.append(svg[i:])
            return "".join(out), swapped

        open_paren = start + len("light-dark(") - 1
        depth, split, end = 0, None, None
        for pos in range(open_paren, len(svg)):
            char = svg[pos]
            if char == "(":
                depth += 1
            elif char == ")":
                depth -= 1
                if depth == 0:
                    end = pos
                    break
            elif char == "," and depth == 1:
                split = pos  # the comma separating A from B, not one inside rgb()
        if end is None or split is None:
            out.append(svg[i : start + 1])
            i = start + 1
            continue

        light = svg[open_paren + 1 : split].strip()
        dark = svg[split + 1 : end].strip()
        out.append(svg[i:start])
        out.append(f"light-dark({dark}, {light})")
        i = end + 1
        swapped += 1


def asar_bytes(app_path: str) -> bytes | None:
    """Pull one file out of the draw.io app bundle (handles the asar archive)."""
    direct = Path(app_path)
    if direct.is_file():
        return direct.read_bytes()

    asar, _, inner = app_path.partition("app.asar/")
    if not inner:
        return None
    result = subprocess.run(
        ["npx", "--yes", "asar", "extract-file", asar + "app.asar", inner],
        capture_output=True,
        cwd="/tmp",
    )
    extracted = Path("/tmp") / Path(inner).name
    if result.returncode == 0 and extracted.is_file():
        return extracted.read_bytes()
    return None


def inline_images(svg: str) -> tuple[str, int]:
    """Stage 2 — turn app-bundle image references into self-contained data URIs."""
    inlined = 0
    for href in sorted(set(re.findall(r'xlink:href="(file://[^"]*)"', svg))):
        local = href.replace("file://", "")
        raw = asar_bytes(local)
        if raw is None:
            print(f"  ! could not inline {href}", file=sys.stderr)
            continue
        mime = "image/svg+xml" if local.endswith(".svg") else "image/png"
        data = f"data:{mime};base64,{base64.b64encode(raw).decode()}"
        svg = svg.replace(href, data)
        inlined += 1
    return svg, inlined


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 1
    for target in sys.argv[1:]:
        path = Path(target)
        svg = path.read_text()
        svg, swapped = swap_light_dark(svg)
        svg, inlined = inline_images(svg)
        path.write_text(svg)
        print(f"{path}: swapped {swapped} light-dark() pair(s), inlined {inlined} image(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
