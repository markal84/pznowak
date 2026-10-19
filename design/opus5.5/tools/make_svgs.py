"""Generate the Pracownia Nowak SVG set into design/opus5.5/svg/."""
import math
import os
import sys

OUT = sys.argv[1]

ICON_HEAD = ('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" '
             'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" '
             'stroke-linejoin="round" role="img" aria-labelledby="t">')

ICONS = {
    'pierscionek': ('Pierścionek', '<circle cx="12" cy="15" r="6"/><path d="M9.4 6.4 L12 9 L14.6 6.4 L13.3 4.4 H10.7 Z"/><path d="M9.4 6.4 H14.6"/>'),
    'obraczki': ('Obrączki', '<circle cx="9" cy="14" r="5.5"/><circle cx="15" cy="10" r="5.5"/>'),
    'rozmiar': ('Rozmiar pierścionka', '<circle cx="12" cy="9.5" r="5.5"/><path d="M7.6 9.5 H16.4"/><path d="M7.6 8.3 V10.7 M16.4 8.3 V10.7"/><path d="M3.5 19.5 H20.5"/><path d="M5 19.5 V17.3 M8.5 19.5 V18.3 M12 19.5 V17.3 M15.5 19.5 V18.3 M19 19.5 V17.3"/>'),
    'czyszczenie': ('Czyszczenie i polerowanie', '<circle cx="10" cy="15" r="5.5"/><path d="M8.1 7.8 L10 9.5 L11.9 7.8 L11 6.3 H9 Z"/><path d="M18 3 v5 M15.5 5.5 h5"/><path d="M20 11 v2.4 M18.8 12.2 h2.4"/>'),
    'oprawa': ('Oprawa kamienia na łapkach', '<circle cx="12" cy="12" r="6"/><path d="M12 8.6 L14.4 12 L12 15.4 L9.6 12 Z" stroke-opacity=".6"/><circle cx="7.8" cy="7.8" r="1.4" fill="currentColor" stroke="none"/><circle cx="16.2" cy="7.8" r="1.4" fill="currentColor" stroke="none"/><circle cx="7.8" cy="16.2" r="1.4" fill="currentColor" stroke="none"/><circle cx="16.2" cy="16.2" r="1.4" fill="currentColor" stroke="none"/>'),
    'kamien': ('Kamień szlachetny', '<path d="M5.5 9 L9 4.5 H15 L18.5 9 L12 19.5 Z"/><path d="M5.5 9 H18.5"/><path d="M9 4.5 L10.6 9 L12 19.5 L13.4 9 L15 4.5"/>'),
    'grawer': ('Grawer', '<rect x="2.5" y="10" width="15" height="7" rx="3.5"/><path d="M5.5 13.6 c.8 -1.3 1.6 1.3 2.4 0 s1.6 1.3 2.4 0 s1.6 1.3 2.4 0"/><path d="M15.2 12.2 L19.8 5.2"/><path d="M18.6 4.4 l2.4 1.6 a1 1 0 0 0 .3 -1.4 l-.8 -1.2 a1 1 0 0 0 -1.4 -.3 Z"/>'),
    'lancuszek': ('Naprawa łańcuszka', '<rect x="2.5" y="9" width="10" height="6" rx="3"/><rect x="11.5" y="9" width="10" height="6" rx="3"/>'),
    'renowacja': ('Renowacja', '<path d="M19.5 12 a7.5 7.5 0 1 1 -2.2 -5.3"/><path d="M17.4 3.8 L17.3 6.7 L20.2 6.9"/><circle cx="12" cy="13.6" r="3"/><path d="M10.8 9.1 L12 10.6 L13.2 9.1 L12.6 8.1 H11.4 Z"/>'),
    'przetopienie': ('Przetopienie złota', '<path d="M6 8.5 H18 L16.6 19 a1.5 1.5 0 0 1 -1.5 1.3 H8.9 a1.5 1.5 0 0 1 -1.5 -1.3 Z"/><path d="M7.3 12 c1.5 .8 3 .8 4.6 0 s3.1-.8 4.7 0"/><path d="M12 2.8 c1.6 1.6 1.6 3.1 0 3.6 c-1.6-.5-1.6-2 0-3.6 Z"/>'),
    'lupa': ('Lupa jubilerska', '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15 L20.5 20.5"/><path d="M8 9.5 a2.8 2.8 0 0 1 2-2"/>'),
    'szkic': ('Szkic projektu', '<path d="M14.5 3.5 H6 a1 1 0 0 0 -1 1 V19.5 a1 1 0 0 0 1 1 H18 a1 1 0 0 0 1 -1 V8 Z"/><path d="M14.5 3.5 V8 H19"/><circle cx="11" cy="14.5" r="3.2"/><path d="M9.9 10.2 L11 11.3 L12.1 10.2"/>'),
    'model-3d': ('Model 3D', '<ellipse cx="12" cy="10" rx="7.5" ry="3.2"/><path d="M4.5 10 V14 a7.5 3.2 0 0 0 15 0 V10"/><path d="M8 12.8 V16.8 M16 12.8 V16.8 M12 13.2 V17.2" stroke-dasharray="1 1.6"/>'),
    'polerowanie': ('Polerowanie', '<circle cx="9.5" cy="9.5" r="6"/><circle cx="9.5" cy="9.5" r="1.6"/><path d="M14 14 L20.5 20.5"/><path d="M3 15.5 a7.6 7.6 0 0 0 3.5 3.5"/>'),
    'rozmowa': ('Rozmowa o projekcie', '<path d="M4.5 4.5 H14 a1.2 1.2 0 0 1 1.2 1.2 V11.8 A1.2 1.2 0 0 1 14 13 H8.5 L5.5 15.8 V13 H4.5 a1.2 1.2 0 0 1 -1.2 -1.2 V5.7 A1.2 1.2 0 0 1 4.5 4.5 Z"/><path d="M17.8 8.5 H19.5 a1.2 1.2 0 0 1 1.2 1.2 V15.8 a1.2 1.2 0 0 1 -1.2 1.2 H18.5 V19.8 L15.5 17 H11 a1.2 1.2 0 0 1 -1.2 -1.2 V15.5"/>'),
    'telefon': ('Telefon', '<path d="M6.6 3.5 H9 L10.5 7.5 L8.5 9 a11 11 0 0 0 6.5 6.5 L16.5 13.5 L20.5 15 V17.4 a2 2 0 0 1 -2.1 2 A16.5 16.5 0 0 1 4.6 5.6 a2 2 0 0 1 2 -2.1 Z"/>'),
    'mail': ('E-mail', '<rect x="3" y="5.5" width="18" height="13" rx="1.6"/><path d="M3.6 6.6 L12 13 L20.4 6.6"/>'),
    'lokalizacja': ('Adres pracowni', '<path d="M12 21 s-6.5 -6 -6.5 -11 a6.5 6.5 0 0 1 13 0 c0 5 -6.5 11 -6.5 11 Z"/><circle cx="12" cy="10" r="2.3"/>'),
    'zegar': ('Godziny otwarcia', '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5 V12 L15 14"/>'),
    'kalendarz': ('Termin', '<rect x="3.5" y="5" width="17" height="15" rx="1.6"/><path d="M3.5 9.5 H20.5 M8 3 V7 M16 3 V7"/><circle cx="12" cy="14.5" r="2"/>'),
    'sklep': ('Sklep z gotową biżuterią', '<path d="M3.5 9 L5 4.5 H19 L20.5 9"/><path d="M3.5 9 a2.1 2.1 0 0 0 4.25 0 a2.1 2.1 0 0 0 4.25 0 a2.1 2.1 0 0 0 4.25 0 a2.1 2.1 0 0 0 4.25 0"/><path d="M5 11.3 V20 H19 V11.3"/><path d="M10 20 V15 H14 V20"/>'),
    'gwarancja': ('Gwarancja', '<path d="M12 3 L19 6 V11.5 c0 4.5 -3 7.8 -7 9.5 c-4 -1.7 -7 -5 -7 -9.5 V6 Z"/><path d="M9 12 L11.2 14.2 L15.5 9.9"/>'),
    'certyfikat': ('Certyfikat kamienia', '<path d="M13.5 20 H6 a1 1 0 0 1 -1 -1 V4.5 a1 1 0 0 1 1 -1 H15 L18.5 7 V12"/><path d="M8 8 H14 M8 11 H15"/><circle cx="16.5" cy="16" r="3"/><path d="M15 18.6 L14.5 21.5 L16.5 20.5 L18.5 21.5 L18 18.6"/>'),
    'proba-zlota': ('Próba złota i cecha', '<path d="M10 2.8 H14 V12.5 L13 14.5 H11 L10 12.5 Z"/><path d="M10 6 H14"/><rect x="6.5" y="17" width="11" height="4.5" rx="2.25"/><path d="M9.3 19.25 H14.7"/>'),
    'menu': ('Menu', '<path d="M4 8 H20 M4 16 H20"/>'),
    'zamknij': ('Zamknij', '<path d="M6 6 L18 18 M18 6 L6 18"/>'),
    'plus': ('Rozwiń', '<path d="M12 5 V19 M5 12 H19"/>'),
    'minus': ('Zwiń', '<path d="M5 12 H19"/>'),
    'chevron-dol': ('W dół', '<path d="M6 9 L12 15 L18 9"/>'),
    'chevron-lewo': ('Poprzednie', '<path d="M15 6 L9 12 L15 18"/>'),
    'chevron-prawo': ('Następne', '<path d="M9 6 L15 12 L9 18"/>'),
    'odtworz': ('Odtwórz film', '<circle cx="12" cy="12" r="9"/><path d="M10 8.5 L15.5 12 L10 15.5 Z"/>'),
    'gotowe': ('Gotowe', '<path d="M5 12.5 L9.5 17 L19 7"/>'),
    'informacja': ('Informacja', '<circle cx="12" cy="12" r="9"/><path d="M12 11 V16.5 M12 7.8 V7.9"/>'),
    'okazja': ('Okazja', '<path d="M12 20 c-4.5 -3 -8 -6 -8 -10 a4 4 0 0 1 8 -1.5 a4 4 0 0 1 8 1.5 c0 4 -3.5 7 -8 10 Z"/>'),
    'prezent': ('Prezent', '<rect x="4" y="9" width="16" height="11" rx="1"/><path d="M3 9 H21 V6.5 H3 Z"/><path d="M12 6.5 V20"/><path d="M12 6.5 C10 3 7 3.5 7.5 5.5 C8 6.5 10 6.5 12 6.5 C14 6.5 16 6.5 16.5 5.5 C17 3.5 14 3 12 6.5"/>'),
}


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)


for name, (title, body) in ICONS.items():
    write(f'{OUT}/ikony/{name}.svg', f'{ICON_HEAD}<title id="t">{title}</title>{body}</svg>\n')

# ---------- stone cuts (unit shapes, cubic/linear only so scaling is exact) ----------
K = 0.5523


def ellipse(rx, ry):
    return [('M', [(-rx, 0)]),
            ('C', [(-rx, -ry * K), (-rx * K, -ry), (0, -ry)]),
            ('C', [(rx * K, -ry), (rx, -ry * K), (rx, 0)]),
            ('C', [(rx, ry * K), (rx * K, ry), (0, ry)]),
            ('C', [(-rx * K, ry), (-rx, ry * K), (-rx, 0)]), ('Z', [])]


def poly(pts):
    return [('M', [pts[0]])] + [('L', [p]) for p in pts[1:]] + [('Z', [])]


CUTS = {
    'okragly': ('Szlif okrągły', ellipse(1, 1), 'radial'),
    'owal': ('Owal', ellipse(.74, 1), 'radial'),
    'markiza': ('Markiza', [('M', [(0, -1)]), ('C', [(.56, -.55), (.56, .55), (0, 1)]), ('C', [(-.56, .55), (-.56, -.55), (0, -1)]), ('Z', [])], 'radial'),
    'gruszka': ('Gruszka', [('M', [(0, -1)]), ('C', [(.35, -.6), (.76, -.12), (.76, .32)]), ('C', [(.76, .74), (.42, 1), (0, 1)]), ('C', [(-.42, 1), (-.76, .74), (-.76, .32)]), ('C', [(-.76, -.12), (-.35, -.6), (0, -1)]), ('Z', [])], 'radial'),
    'szmaragdowy': ('Szlif szmaragdowy', poly([(-.5, -1), (.5, -1), (.72, -.78), (.72, .78), (.5, 1), (-.5, 1), (-.72, .78), (-.72, -.78)]), 'step'),
    'poduszka': ('Poduszka', [('M', [(-.5, -.9)]), ('C', [(-.17, -.95), (.17, -.95), (.5, -.9)]), ('C', [(.82, -.86), (.86, -.82), (.9, -.5)]), ('C', [(.95, -.17), (.95, .17), (.9, .5)]), ('C', [(.86, .82), (.82, .86), (.5, .9)]), ('C', [(.17, .95), (-.17, .95), (-.5, .9)]), ('C', [(-.82, .86), (-.86, .82), (-.9, .5)]), ('C', [(-.95, .17), (-.95, -.17), (-.9, -.5)]), ('C', [(-.86, -.82), (-.82, -.86), (-.5, -.9)]), ('Z', [])], 'radial'),
    'princessa': ('Princessa', poly([(-.86, -.86), (.86, -.86), (.86, .86), (-.86, .86)]), 'princess'),
    'serce': ('Serce', [('M', [(0, .92)]), ('C', [(-.38, .62), (-.98, .22), (-.98, -.3)]), ('C', [(-.98, -.74), (-.5, -.98), (0, -.56)]), ('C', [(.5, -.98), (.98, -.74), (.98, -.3)]), ('C', [(.98, .22), (.38, .62), (0, .92)]), ('Z', [])], 'radial'),
}


def fmt(v):
    s = f'{v:.2f}'.rstrip('0').rstrip('.')
    return '0' if s in ('-0', '') else s


def path_d(cmds, s, cx, cy):
    out = []
    for c, pts in cmds:
        out.append(c + ' '.join(f'{fmt(cx + x * s)} {fmt(cy + y * s)}' for x, y in pts))
    return ' '.join(out)


def vertices(cmds):
    return [pts[-1] for c, pts in cmds if pts]


def facets(cmds, kind, s, cx, cy, clip):
    parts = [f'<path d="{path_d(cmds, s * .5, cx, cy)}"/>']
    if kind == 'radial':
        lines = []
        for i in range(8):
            a = math.pi / 8 + i * math.pi / 4
            x1, y1 = cx + math.cos(a) * s * .35, cy + math.sin(a) * s * .35
            x2, y2 = cx + math.cos(a) * s * 1.6, cy + math.sin(a) * s * 1.6
            lines.append(f'M{fmt(x1)} {fmt(y1)} L{fmt(x2)} {fmt(y2)}')
        parts.append(f'<path d="{" ".join(lines)}" clip-path="url(#{clip})" stroke-opacity=".55"/>')
    else:
        parts.append(f'<path d="{path_d(cmds, s * .75, cx, cy)}" stroke-opacity=".6"/>')
        vs = vertices(cmds)
        lines = ' '.join(f'M{fmt(cx + x * s)} {fmt(cy + y * s)} L{fmt(cx + x * s * .5)} {fmt(cy + y * s * .5)}' for x, y in vs)
        if kind == 'princess':
            lines += f' M{fmt(cx - s*.43)} {fmt(cy - s*.43)} L{fmt(cx + s*.43)} {fmt(cy + s*.43)} M{fmt(cx + s*.43)} {fmt(cy - s*.43)} L{fmt(cx - s*.43)} {fmt(cy + s*.43)}'
        parts.append(f'<path d="{lines}" stroke-opacity=".55"/>')
    return ''.join(parts)


for name, (title, cmds, kind) in CUTS.items():
    d = path_d(cmds, 26, 32, 32)
    clip = f'c-{name}'
    write(f'{OUT}/szlify/{name}.svg',
          '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none" '
          'stroke="currentColor" stroke-width="1.25" stroke-linejoin="round" role="img" aria-labelledby="t">'
          f'<title id="t">{title}</title><defs><clipPath id="{clip}"><path d="{d}"/></clipPath></defs>'
          f'<path d="{d}" stroke-width="1.5"/>{facets(cmds, kind, 26, 32, 32, clip)}</svg>\n')

# ---------- settings (top view of the head, 96x96) ----------
ROUND = ellipse(1, 1)


def stone(s, cx, cy, clip):
    d = path_d(ROUND, s, cx, cy)
    return (f'<defs><clipPath id="{clip}"><path d="{d}"/></clipPath></defs>'
            f'<path d="{d}" stroke-width="1.5"/>{facets(ROUND, "radial", s, cx, cy, clip)}')


def prongs(n, r, cx, cy, start):
    out = []
    for i in range(n):
        a = math.radians(start + i * 360 / n)
        out.append(f'<circle cx="{fmt(cx + math.cos(a) * r)}" cy="{fmt(cy + math.sin(a) * r)}" r="3.6" fill="#FBFBF8" stroke-width="1.4"/>')
    return ''.join(out)


def dots_on_circle(n, r, cx, cy, rr, start=0, span=360):
    out = []
    for i in range(n):
        a = math.radians(start + i * span / (n if span == 360 else n - 1))
        out.append(f'<circle cx="{fmt(cx + math.cos(a) * r)}" cy="{fmt(cy + math.sin(a) * r)}" r="{rr}" stroke-width="1.1"/>')
    return ''.join(out)


SETTINGS = {
    'lapki-4': ('Cztery łapki', lambda: stone(22, 48, 48, 'k1') + prongs(4, 21, 48, 48, 45)),
    'lapki-6': ('Sześć łapek', lambda: stone(22, 48, 48, 'k2') + prongs(6, 21.5, 48, 48, 30)),
    'kaszta': ('Kaszta, oprawa pełna', lambda: '<circle cx="48" cy="48" r="28" stroke-width="1.5"/><circle cx="48" cy="48" r="25" stroke-opacity=".5"/>' + stone(21, 48, 48, 'k3')),
    'halo': ('Halo', lambda: '<circle cx="48" cy="48" r="34" stroke-opacity=".5"/>' + dots_on_circle(20, 29.5, 48, 48, 3.2) + stone(21, 48, 48, 'k4') + prongs(4, 20.5, 48, 48, 45)),
    'trylogia': ('Trylogia, trzy kamienie', lambda: stone(17, 48, 48, 'k5') + prongs(4, 16.5, 48, 48, 45) + stone(10, 19, 52, 'k6') + stone(10, 77, 52, 'k7')),
    'pave': ('Obrączka pavé', lambda: '<path d="M10 60 Q48 26 86 60" stroke-width="1.5"/><path d="M10 74 Q48 40 86 74" stroke-width="1.5"/><path d="M10 60 V74 M86 60 V74"/>' + ''.join(
        f'<circle cx="{fmt(14 + i * 7.6)}" cy="{fmt(67 - (1 - ((14 + i * 7.6 - 48) / 38) ** 2) * 17)}" r="2.6" stroke-width="1.1"/>' for i in range(10))),
}

for name, (title, fn) in SETTINGS.items():
    write(f'{OUT}/oprawy/{name}.svg',
          '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none" '
          'stroke="currentColor" stroke-width="1.25" stroke-linejoin="round" role="img" aria-labelledby="t">'
          f'<title id="t">{title}</title>{fn()}</svg>\n')

# ---------- band profiles (cross-section, 80x48) ----------
PROFILES = {
    'plaska': ('Profil płaski', 'M12 14 H68 Q70 14 70 16 V32 Q70 34 68 34 H12 Q10 34 10 32 V16 Q10 14 12 14 Z'),
    'polokragla': ('Profil półokrągły', 'M10 34 V26 C10 8 70 8 70 26 V34 Z'),
    'komfort': ('Profil komfort', 'M10 24 C10 8 70 8 70 24 C70 37 10 37 10 24 Z'),
    'fazowana': ('Profil fazowany', 'M10 34 V22 L18 14 H62 L70 22 V34 Z'),
}
for name, (title, d) in PROFILES.items():
    write(f'{OUT}/profile/{name}.svg',
          '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="48" viewBox="0 0 80 48" role="img" aria-labelledby="t">'
          f'<title id="t">{title}</title><path d="{d}" fill="currentColor" fill-opacity=".14" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>'
          '<path d="M10 42 H70" stroke="currentColor" stroke-opacity=".45" stroke-width="1"/><path d="M10 39 V45 M70 39 V45" stroke="currentColor" stroke-opacity=".45" stroke-width="1"/></svg>\n')

# ---------- printable ring sizer (A4, millimetres) ----------
# Polish ring size = inner circumference in mm minus 40.
rows = []
sizes = list(range(8, 26))
for i, size in enumerate(sizes):
    col, row = i % 6, i // 6
    cx, cy = 30 + col * 30, 92 + row * 42
    dia = (size + 40) / math.pi
    rows.append(f'<circle cx="{cx}" cy="{cy}" r="{dia / 2:.3f}" fill="none" stroke="#22262A" stroke-width=".25"/>'
                f'<path d="M{cx - 1} {cy} H{cx + 1} M{cx} {cy - 1} V{cy + 1}" stroke="#22262A" stroke-width=".15"/>'
                f'<text x="{cx}" y="{cy + 16.5:.1f}" text-anchor="middle" font-size="4.2" font-family="Georgia, serif" fill="#22262A">{size}</text>'
                f'<text x="{cx}" y="{cy + 21:.1f}" text-anchor="middle" font-size="2.6" font-family="Helvetica, Arial, sans-serif" fill="#575C5F">{dia:.1f} mm</text>')
sizer = (
    '<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297" role="img" aria-labelledby="t">'
    '<title id="t">Miarka rozmiaru pierścionka do wydruku</title>'
    '<rect width="210" height="297" fill="#FFFFFF"/>'
    '<text x="20" y="26" font-size="9" font-family="Georgia, serif" fill="#22262A">Miarka rozmiaru pierścionka</text>'
    '<text x="20" y="34" font-size="3.6" font-family="Helvetica, Arial, sans-serif" fill="#3A3F43">Wydrukuj w skali 100%, bez dopasowania do strony. Połóż pierścionek na kółkach:</text>'
    '<text x="20" y="39" font-size="3.6" font-family="Helvetica, Arial, sans-serif" fill="#3A3F43">właściwy rozmiar to kółko, którego linia jest widoczna dokładnie po wewnętrznej krawędzi.</text>'
    '<path d="M20 50 H70" stroke="#22262A" stroke-width=".4"/>'
    + ''.join(f'<path d="M{20 + i * 10} 48 V52" stroke="#22262A" stroke-width=".3"/>' for i in range(6)) +
    '<text x="74" y="51.3" font-size="3.4" font-family="Helvetica, Arial, sans-serif" fill="#3A3F43">kontrola wydruku: ten odcinek ma mieć dokładnie 50 mm</text>'
    '<text x="20" y="62" font-size="3.2" font-family="Helvetica, Arial, sans-serif" fill="#575C5F">Rozmiar polski = obwód wewnętrzny w mm minus 40. Pod numerem: średnica wewnętrzna.</text>'
    + ''.join(rows) +
    '<text x="20" y="282" font-size="3.4" font-family="Helvetica, Arial, sans-serif" fill="#3A3F43">Pracownia Złotnicza Michał Nowak, Kilińskiego 12, Busko-Zdrój, +48 501 321 347</text>'
    '<text x="20" y="288" font-size="3" font-family="Helvetica, Arial, sans-serif" fill="#575C5F">Miarka jest orientacyjna. Ostateczny rozmiar zmierzymy w pracowni.</text>'
    '</svg>\n')
write(f'{OUT}/druk/miarka-rozmiaru-a4.svg', sizer)

# ---------- tag (przywieszka) ----------
write(f'{OUT}/marka/przywieszka.svg',
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="96" viewBox="0 0 200 96" role="img" aria-labelledby="t">'
      '<title id="t">Przywieszka pracowni</title>'
      '<path d="M40 8 C24 2 10 10 14 30" fill="none" stroke="#B9B3A5" stroke-width="1.2" stroke-linecap="round"/>'
      '<path d="M44 24 H188 V88 H44 L24 70 V42 Z" fill="#FBFBF8" stroke="#22262A" stroke-opacity=".25" stroke-width="1"/>'
      '<circle cx="36" cy="56" r="6" fill="#E7E8E3" stroke="#B9B3A5" stroke-width="1.5"/>'
      '<path d="M14 30 C16 44 26 52 32 54" fill="none" stroke="#B9B3A5" stroke-width="1.2" stroke-linecap="round"/>'
      '<path d="M58 48 H150 M58 64 H120" stroke="#22262A" stroke-opacity=".35" stroke-width="2" stroke-linecap="round"/>'
      '</svg>\n')
print('ok', sum(len(f) for _, _, f in os.walk(OUT)))
