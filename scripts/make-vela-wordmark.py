#!/usr/bin/env python3
"""Draws the "Vela" wordmark as SVG shapes from EB Garamond (scripts/fonts, SIL Open Font License), kerned by HarfBuzz.

The new tab page allows no web fonts (its content rules set default-src 'none'), so the serif goes in as a picture.
Usage: make-vela-wordmark.py   (writes scripts/vela-wordmark.svg; needs fonttools, brotli and uharfbuzz)
The page draws it as a mask filled with its text color, so one black copy serves light, dark and system colors.
"""
from pathlib import Path
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen

here = Path(__file__).resolve().parent
font_path = here / "fonts" / "eb-garamond-500.woff2"
font = TTFont(font_path)
font.flavor = None
import io
buf = io.BytesIO(); font.save(buf)
face = hb.Face(buf.getvalue()); hbfont = hb.Font(face)
text = "Vela"
b = hb.Buffer(); b.add_str(text); b.guess_segment_properties(); hb.shape(hbfont, b, {"kern": True, "liga": True})
glyphs = font.getGlyphSet(); order = font.getGlyphOrder()
x = 0; d = []; minx = miny = 1e9; maxx = maxy = -1e9
for info, pos in zip(b.glyph_infos, b.glyph_positions):
    name = order[info.codepoint]
    pen = SVGPathPen(glyphs)
    glyphs[name].draw(TransformPen(pen, (1, 0, 0, -1, x + pos.x_offset, -pos.y_offset)))
    d.append(pen.getCommands())
    bounds = BoundsPen(glyphs); glyphs[name].draw(bounds)
    if bounds.bounds:
        a, bb, c, dd = bounds.bounds
        minx, maxx = min(minx, a + x), max(maxx, c + x)
        miny, maxy = min(miny, bb), max(maxy, dd)
    x += pos.x_advance
pad = 8
view = f"{minx - pad:.0f} {-maxy - pad:.0f} {maxx - minx + 2 * pad:.0f} {maxy - miny + 2 * pad:.0f}"
(here / "vela-wordmark.svg").write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view}"><path d="{"".join(d)}"/></svg>\n')
print("viewBox", view)
