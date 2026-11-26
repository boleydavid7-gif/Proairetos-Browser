#!/usr/bin/env python3
"""Writes Vela's new tab stylesheet with the logo and the serif inside it as data.

Usage: build-vela-home.py OUTPUT.css
The new tab page loads nothing from outside its own stylesheet, so the logo (vela.svg) and the wordmark
(vela-wordmark.svg, drawn from EB Garamond by make-vela-wordmark.py) go in as data: URLs.
"""
import base64
import sys
from pathlib import Path

here = Path(__file__).resolve().parent
css = (here / "vela-home.css").read_text(encoding="utf-8")
logo = base64.b64encode((here / "vela.svg").read_bytes()).decode("ascii")
wordmark = base64.b64encode((here / "vela-wordmark.svg").read_bytes()).decode("ascii")
css = css.replace("@VELA_LOGO@", "data:image/svg+xml;base64," + logo)
css = css.replace("@VELA_WORDMARK@", "data:image/svg+xml;base64," + wordmark)
if "@VELA_" in css:
    raise SystemExit("vela-home.css has a placeholder build-vela-home.py does not know")
Path(sys.argv[1]).write_text(css, encoding="utf-8")
