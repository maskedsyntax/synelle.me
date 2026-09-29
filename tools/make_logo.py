"""Generate Synelle's mark: a halftone eye set inside a printer's registration mark.

Run from the repo root:  python3 tools/make_logo.py
Writes public/assets/logo-mark.svg (ink on transparent) and public/assets/favicon.svg,
and inlines the mark into public/index.html's masthead, coloured by CSS custom properties
so it prints correctly in both the Day and Night editions.
"""

import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "public"
ASSETS = ROOT / "assets"
INK = "#1C1B19"
PAPER = "#E6DFCC"


def darkness(x, y):
    """How much ink the eye needs at (x, y), centred on 0,0. Returns 0..1."""
    r = math.hypot(x, y)
    a = math.atan2(y, x)
    # Catch-light: the one spot the eye reflects instead of absorbs.
    if math.hypot(x + 20, y + 22) < 13:
        return 0.0
    if r < 30:  # pupil
        return 1.0
    if r < 76:  # iris, with radial striations
        t = (r - 30) / 46
        stria = 0.5 + 0.5 * math.sin(a * 13 + r * 0.08)
        return 0.78 - 0.34 * t + 0.16 * stria
    if r < 86:  # limbal ring
        return 0.95
    if r < 112:  # white of the eye, fading out to paper
        return max(0.0, 0.26 * (1 - (r - 86) / 26))
    return 0.0


def dots(spacing, angle_deg=45, max_r=112):
    """Yield (x, y, radius) for a rotated halftone screen, clipped to a circle."""
    ang = math.radians(angle_deg)
    ca, sa = math.cos(ang), math.sin(ang)
    n = int(max_r / spacing) + 2
    for i in range(-n, n + 1):
        for j in range(-n, n + 1):
            gx, gy = i * spacing, j * spacing
            x = gx * ca - gy * sa
            y = gx * sa + gy * ca
            if math.hypot(x, y) > max_r:
                continue
            d = darkness(x, y)
            rad = math.sqrt(d) * spacing * 0.68
            if rad >= 0.45:
                yield x, y, rad


def circles(spacing):
    return "".join(
        f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.2f}"/>' for x, y, r in dots(spacing)
    )


def registration(color, stroke):
    """Ring plus crosshair ticks, like the marks printers use to align plates."""
    ticks = "".join(
        f'<line x1="{dx * 132}" y1="{dy * 132}" x2="{dx * 150}" y2="{dy * 150}"/>'
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
    )
    return (
        f'<g fill="none" stroke="{color}" stroke-width="{stroke}">'
        f'<circle r="124"/>{ticks}</g>'
    )


def mark_svg(color):
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-150 -150 300 300" '
        'role="img" aria-label="Synelle">'
        f'<g fill="{color}">{circles(10.5)}</g>{registration(color, 7)}</svg>'
    )


def inline_mark_svg():
    # For the page. Colours come from CSS custom properties so the Night edition
    # can print the eye as dark dots on a lit disc; otherwise it reads as a negative.
    # The group has an id so the colophon can <use> it.
    return (
        '<svg viewBox="-150 -150 300 300" focusable="false">'
        '<g id="synelle-mark">'
        '<circle r="112" style="fill:var(--mark-disc)"/>'
        f'<g style="fill:var(--mark-dot)">{circles(10.5)}</g>'
        f'{registration("currentColor", 7)}</g></svg>'
    )


def favicon_svg():
    # At 16-32px the fine screen turns to mush, so the favicon uses a coarse
    # screen, a solid pupil and a heavier ring, on a newsprint disc.
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-150 -150 300 300">'
        f'<circle r="146" fill="{PAPER}"/>'
        f'<g fill="{INK}">{circles(19)}<circle r="36"/></g>'
        f'<circle cx="-20" cy="-22" r="12" fill="{PAPER}"/>'
        f'<circle r="126" fill="none" stroke="{INK}" stroke-width="16"/>'
        "</svg>"
    )


if __name__ == "__main__":
    (ASSETS / "logo-mark.svg").write_text(mark_svg(INK) + "\n")
    (ASSETS / "favicon.svg").write_text(favicon_svg() + "\n")
    index = ROOT / "index.html"
    html = index.read_text()
    inline = inline_mark_svg()
    html, n = re.subn(
        r"<!-- mark:start -->.*?<!-- mark:end -->",
        lambda _: f"<!-- mark:start -->{inline}<!-- mark:end -->",
        html,
        flags=re.S,
    )
    index.write_text(html)
    print(f"wrote public/assets/logo-mark.svg, public/assets/favicon.svg; inlined mark in public/index.html ({n})")
