#!/usr/bin/env python3
# Generates the ¾-view "Eclipse Warden" layers. Each group is drawn twice: a thick black pass
# for the silhouette, then fills with thin inner lines — that gives the outer/inner line weight.
import math, os
OUT = os.path.dirname(os.path.abspath(__file__)) + '/'
INK = '#08070c'

DEFS = '''<linearGradient id="gold" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stop-color="#fff0b0"/><stop offset=".4" stop-color="#e2ae42"/><stop offset=".75" stop-color="#a86a1c"/><stop offset="1" stop-color="#6d3f12"/></linearGradient>
<linearGradient id="goldH" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a5518"/><stop offset=".45" stop-color="#ffe9a0"/><stop offset="1" stop-color="#a86a1c"/></linearGradient>
<linearGradient id="steel" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="#f2f7fb"/><stop offset=".45" stop-color="#a9bccb"/><stop offset="1" stop-color="#55677a"/></linearGradient>
<linearGradient id="black" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#34323f"/><stop offset=".5" stop-color="#17161e"/><stop offset="1" stop-color="#0b0a10"/></linearGradient>
<linearGradient id="skin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe2cc"/><stop offset="1" stop-color="#e0a988"/></linearGradient>
<linearGradient id="hair" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#b9c8e6"/><stop offset="1" stop-color="#5d6c9c"/></linearGradient>
<linearGradient id="feather" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1b1a33"/><stop offset=".7" stop-color="#2c2a5a"/><stop offset="1" stop-color="#5a58a8"/></linearGradient>
<radialGradient id="gem" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset=".3" stop-color="#8ef0ff"/><stop offset=".75" stop-color="#1c9fd0"/><stop offset="1" stop-color="#0a4a7a"/></radialGradient>
<filter id="glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="5"/></filter>'''

def svg(name, title, body):
    open(OUT + name + '.svg', 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 768" width="512" height="768">\n<title>{title}</title>\n<defs>{DEFS}</defs>\n{body}\n</svg>\n')

def part(shapes, outer=5.5, inner=1.3):
    """shapes: (path, fill). Thick pass first, then fills with thin lines."""
    a = ''.join(f'<path d="{d}" fill="{INK}" stroke="{INK}" stroke-width="{outer}" stroke-linejoin="round"/>' for d, _ in shapes)
    b = ''.join(f'<path d="{d}" fill="{f}" stroke="{INK}" stroke-width="{inner}" stroke-linejoin="round"/>' for d, f in shapes)
    return a + b

G, GH, ST, BK, SK = 'url(#gold)', 'url(#goldH)', 'url(#steel)', 'url(#black)', 'url(#skin)'

def line(d, col='#ffd97a', w=2.2):
    return f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{w+1.6}" stroke-linecap="round" stroke-linejoin="round"/><path d="{d}" fill="none" stroke="{col}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>'

def curl(x, y, s=1, rot=0, flip=1):
    """gold filigree scroll"""
    d = 'M0,0 C6,-16 26,-20 36,-8 C44,2 34,14 24,9 C17,5 22,-4 28,0 M12,-9 C8,-20 14,-28 24,-28 M4,-4 C-8,-8 -14,-2 -12,6 M36,-8 C46,-14 56,-12 60,-4'
    return f'<g transform="translate({x},{y}) rotate({rot}) scale({s*flip},{s})">{line(d, "#e9bb55", 2/s)}</g>'

def gem(x, y, r):
    d = f'M{x},{y-r} L{x+r*.8},{y-r*.2} L{x+r*.5},{y+r} L{x-r*.5},{y+r} L{x-r*.8},{y-r*.2} Z'
    return f'<circle cx="{x}" cy="{y}" r="{r*1.5}" fill="#49d6ff" opacity=".65" filter="url(#glow)"/>' + part([(d, 'url(#gem)')], 3.4, 1)

# ---- back: feathered wings fanning from behind the shoulders ----
def feather(rx, ry, ang, L, w, sx=1):
    a = math.radians(ang); c, s = math.cos(a), math.sin(a)
    n = (-s, c)
    tip = (rx + c * L * sx, ry + s * L)
    p = lambda k, o: f'{rx + c*L*k*sx + n[0]*o:.1f},{ry + s*L*k + n[1]*o:.1f}'
    return f'M{rx},{ry} Q{p(.5, w)} {tip[0]:.1f},{tip[1]:.1f} Q{p(.55, -w*.35)} {rx},{ry} Z'

def wing(rx, ry, sx, start, end, n, L0, L1, w):
    out = []
    for i in range(n):
        k = i / (n - 1)
        out.append((feather(rx, ry, start + (end - start) * k, L0 + (L1 - L0) * k, w, sx), 'url(#feather)'))
    return out

back = part(wing(300, 240, 1, 232, 112, 15, 290, 200, 40)[::-1], 4, 1)
back += part(wing(300, 240, 1, 228, 125, 11, 180, 130, 32)[::-1], 3, 1)
back += part(wing(325, 240, .8, -50, 66, 13, 260, 180, 38)[::-1], 4, 1)
back += part(wing(325, 240, .8, -44, 54, 9, 160, 120, 30)[::-1], 3, 1)
svg('back', 'Back — eclipse wings', back)

# ---- base: far limbs are a pure black silhouette, the near side carries the detail ----
far = (f'<g fill="{INK}"><path d="M292,396 C318,450 336,520 334,566 C338,620 346,670 348,704 C372,716 392,728 400,740 L322,744 C316,700 306,640 296,580 C286,520 272,470 262,420 Z"/>'
       f'<path d="M322,214 C352,226 372,268 380,318 C388,350 380,392 358,428 L340,436 L336,410 C352,380 354,350 342,322 C328,296 316,270 310,250 Z"/></g>')
torso = 'M240,188 C218,196 200,202 192,212 C192,240 198,264 206,284 C212,312 218,330 222,350 C216,370 212,386 212,404 L316,404 C314,384 310,366 306,350 C318,320 332,286 336,250 C338,232 334,218 326,210 C312,202 298,194 286,188 Z'
leg = 'M216,396 C206,450 196,510 192,556 C186,600 184,650 184,696 L216,702 C222,650 232,600 238,560 C248,510 262,460 274,410 Z'
foot = 'M184,694 L216,698 C222,714 224,730 222,742 L132,744 C138,726 160,712 184,694 Z'
arm = 'M198,214 C176,226 156,262 146,306 C136,346 126,386 122,426 L150,434 C160,392 176,352 188,316 C200,284 210,258 212,238 Z'
hand = 'M120,424 L152,432 C156,448 152,464 142,472 C130,478 116,472 112,458 C110,446 114,434 120,424 Z'
neck = 'M246,160 L286,160 L288,200 L262,214 L240,198 Z'
base = far + part([(leg, '#3a3442'), (foot, '#3a2a22')]) + part([(torso, '#c8bea8')]) + part([(neck, SK)], 3) + part([(arm, SK), (hand, SK)])

face = 'M222,118 C222,84 250,70 276,70 C306,70 324,92 322,122 C322,146 306,166 284,178 C268,184 246,170 234,152 C228,142 222,132 222,118 Z'
ear = 'M224,118 C214,114 208,124 212,136 C216,146 224,148 230,144 Z'
head = part([(ear, SK), (face, SK)], 4.5, 1.2)
head += '<path d="M226,136 C232,156 250,172 282,178 C258,178 236,162 226,136 Z" fill="#c98a6c" opacity=".55"/>'
# anime eyes: thick upper lash, tall iris, hard highlight; narrower far eye; no nose
head += '''<path d="M240,116 L270,124" stroke="#2b2a44" stroke-width="4.5" stroke-linecap="round"/><path d="M314,112 L291,122" stroke="#2b2a44" stroke-width="4" stroke-linecap="round"/>
<path d="M240,130 C248,122 262,122 271,132 C264,146 248,146 240,130 Z" fill="#fff"/><path d="M292,130 C298,122 308,122 314,128 C310,142 298,144 292,130 Z" fill="#fff"/>
<ellipse cx="258" cy="134" rx="8" ry="10.5" fill="#d98a10"/><ellipse cx="258" cy="136" rx="4.2" ry="6.5" fill="#2a1204"/><circle cx="254.5" cy="129" r="3" fill="#fff"/><circle cx="262" cy="140" r="1.4" fill="#ffe9a8"/>
<ellipse cx="302" cy="133" rx="6.5" ry="10" fill="#d98a10"/><ellipse cx="302" cy="135" rx="3.4" ry="6" fill="#2a1204"/><circle cx="299.5" cy="129" r="2.6" fill="#fff"/>
<path d="M237,131 C246,119 263,119 273,133" fill="none" stroke="#08070c" stroke-width="3.6" stroke-linecap="round"/><path d="M290,130 C297,120 309,120 316,127" fill="none" stroke="#08070c" stroke-width="3.2" stroke-linecap="round"/>
<path d="M276,160 C282,162 288,161 293,158" fill="none" stroke="#7a3f33" stroke-width="2.2" stroke-linecap="round"/>'''
hairback = 'M216,150 L196,172 L212,120 C204,76 244,42 284,46 C326,50 346,88 336,132 L350,164 L320,150 Z'
hair = 'M224,128 L206,140 L218,112 L194,108 L222,88 L206,64 L240,70 L238,40 L268,62 L286,32 L300,62 L332,48 L324,80 L352,86 L330,106 L340,130 L322,118 L316,92 L296,108 L286,86 L268,112 L256,88 L238,118 Z'
head = part([(hairback, 'url(#hair)')], 4.5, 1.2) + head + part([(hair, 'url(#hair)')], 4.5, 1.2)
head += '<g fill="none" stroke="#6a7aa8" stroke-width="1.6" stroke-linecap="round"><path d="M268,62 L262,92"/><path d="M300,62 L300,96"/><path d="M240,70 L240,102"/></g>'
svg('base', 'Base — body in ¾ view', base + f'<g transform="translate(280,180) scale(.88) translate(-280,-180)">{head}</g>')

# ---- boots: near leg gets the full plate, the far leg stays silhouette ----
greave = 'M186,574 C182,620 180,660 180,700 L220,704 C226,650 236,610 240,572 C224,586 200,586 186,574 Z'
kneeP = 'M182,566 C176,540 196,522 222,524 C246,526 254,548 244,572 C226,592 198,590 182,566 Z'
kneeW = 'M186,556 C166,544 150,526 146,504 C168,512 186,520 200,532 Z'
sabaton = 'M178,698 L222,702 C230,716 232,732 228,746 L120,748 C124,734 150,716 178,698 Z'
toe = 'M120,748 C110,742 106,732 112,720 C124,724 138,722 152,716 C142,728 132,738 120,748 Z'
cuff = 'M174,686 L226,692 L230,712 L172,708 Z'
boots = part([(toe, G), (sabaton, ST), (greave, ST), (cuff, G), (kneeW, G), (kneeP, G)], 5.5, 1.2)
boots += line('M196,596 C194,630 192,660 192,686', '#e9bb55', 2) + line('M216,600 C212,640 208,660 206,686', '#e9bb55', 1.8)
boots += curl(190, 640, .55, -80) + gem(214, 556, 11)
boots += '<path d="M190,590 L196,590 L190,682 L185,682 Z" fill="#fff" opacity=".7"/>'
svg('boots', 'Boots — eclipse greaves', boots)

# ---- weapon: oversized ornate blade, grip sits under the near hand ----
wb = 'M-20,70 C-30,110 -26,170 -20,230 C-16,290 -10,340 0,372 C10,340 16,290 20,230 C26,170 30,110 20,70 C10,84 -10,84 -20,70 Z'
wg = 'M-10,44 C-40,30 -74,2 -82,-34 C-58,-16 -36,-6 -14,-2 C-30,10 -34,30 -24,52 Z M10,44 C40,30 74,2 82,-34 C58,-16 36,-6 14,-2 C30,10 34,30 24,52 Z'
wc = 'M-24,40 C-14,30 14,30 24,40 C30,56 20,72 0,92 C-20,72 -30,56 -24,40 Z'
w = '<rect x="-7" y="-48" width="14" height="96" fill="#2a1a12" stroke="#08070c" stroke-width="3"/>'
w += part([(wb, ST)], 5.5, 1.2) + '<path d="M0,84 L0,352 L-16,230 C-20,170 -22,120 -14,86 Z" fill="#fff" opacity=".42"/>'
w += line('M0,110 L0,330', '#e9bb55', 2.4) + curl(-4, 150, .42, 90) + curl(4, 220, .4, 90, -1)
w += part([(wg, G), (wc, G)], 5.5, 1.2) + gem(0, 58, 13)
w += part([('M-9,-48 L9,-48 L12,-66 L0,-82 L-12,-66 Z', G)], 4, 1)
svg('weapon', 'Weapon — eclipse blade', f'<g transform="translate(132,452) rotate(25) scale(.82)">{w}</g>')

# ---- armour ----
tailN = 'M214,376 C178,430 138,500 98,566 L128,590 L134,566 L170,618 L184,590 L232,640 C240,560 250,470 258,396 Z'
tailF = 'M300,376 C340,430 392,500 430,572 L398,590 L392,566 L356,616 L344,590 L300,632 C294,560 284,470 272,396 Z'
trimN = 'M98,566 L128,590 L134,566 L170,618 L184,590 L232,640 L236,606 L190,558 L176,582 L142,532 L136,556 L116,540 Z'
trimF = 'M430,572 L398,590 L392,566 L356,616 L344,590 L300,632 L298,600 L338,558 L350,580 L384,532 L392,556 L410,540 Z'
inner = 'M226,380 C222,450 226,520 232,600 L300,600 C306,520 310,450 304,380 Z'
vest = 'M236,184 C214,192 198,200 190,212 C190,240 196,264 204,286 C210,314 216,334 220,356 L308,356 C320,322 336,288 340,250 C342,232 338,218 328,208 C314,198 300,192 288,184 C282,204 276,222 272,244 C262,224 248,204 236,184 Z'
collarN = 'M234,182 L212,150 C204,176 204,198 214,216 L268,246 Z'
collarF = 'M290,182 L318,150 C326,176 324,198 314,214 L272,246 Z'
plate = 'M222,226 C240,240 258,250 270,256 C286,250 304,236 320,222 C326,256 318,296 302,326 L272,344 L236,326 C224,296 216,258 222,226 Z'
belt1 = 'M212,352 L316,352 L320,376 L208,376 Z'
buckle = 'M250,346 L290,346 L296,382 L270,396 L244,382 Z'
ar = part([(tailF, BK), (tailN, BK), (trimF, G), (trimN, G)], 5.5, 1.2)
for c in [(150, 516, .8, 40, 1), (196, 490, .7, 70, 1), (214, 570, .62, 60, 1), (376, 520, .8, 140, -1 ), (338, 490, .7, 110, -1), (314, 572, .62, 120, -1)]:
    ar += curl(c[0], c[1], c[2], c[3] if c[4] > 0 else c[3] - 180, c[4])
ar += part([(vest, BK), (plate, G), (collarF, ST), (collarN, ST)], 5.5, 1.2)
ar += '<path d="M232,240 C240,262 250,290 262,320 L246,318 C234,290 226,262 226,236 Z" fill="#fff" opacity=".55"/>'
ar += curl(232, 312, .5, -55) + curl(306, 312, .5, -125, 1)
ar += part([(belt1, BK), (buckle, G)], 4.5, 1.2) + gem(270, 366, 12) + gem(271, 288, 17)
ar += line('M214,358 L316,358', '#e9bb55', 1.6) + line('M210,372 L318,372', '#e9bb55', 1.6)
# near arm: vambrace + clawed gauntlet + huge layered pauldron
vam = 'M150,318 C142,352 130,392 122,430 L156,440 C168,396 184,360 196,328 C184,310 164,306 150,318 Z'
elbow = 'M152,330 C134,324 118,312 104,292 C126,292 148,298 168,310 Z'
gaunt = 'M116,424 L160,438 C166,456 158,476 142,484 C124,490 106,480 102,462 C100,446 106,434 116,424 Z'
fingers = 'M104,470 L96,492 L112,482 L112,500 L126,486 L132,502 L142,484 Z'
upper = 'M200,226 C180,240 164,270 152,316 C166,304 186,308 198,326 C208,292 216,264 216,240 Z'
ar += part([(upper, BK), (elbow, G), (vam, ST), (gaunt, G), (fingers, ST)], 5.5, 1.2)
ar += curl(150, 392, .6, -72) + gem(134, 454, 9)
ar += '<path d="M150,336 L158,338 L132,424 L126,422 Z" fill="#fff" opacity=".65"/>'
p3 = 'M214,262 C186,282 150,288 118,276 C112,262 112,250 118,238 C150,250 184,246 216,232 Z'
p2 = 'M224,232 C190,258 142,262 98,240 C92,224 94,208 102,194 C140,216 186,214 226,196 Z'
p1 = 'M240,196 C210,150 150,136 104,164 C84,178 78,204 92,220 C130,236 190,232 232,212 Z'
horn = 'M112,160 C88,146 72,122 72,92 C92,112 118,126 146,132 Z'
horn2 = 'M168,142 C160,120 164,96 178,76 C184,100 196,120 214,134 Z'
pd = ''
pd += part([(p3, ST), (p2, G), (horn, G), (horn2, G), (p1, ST)], 5.5, 1.2)
pd += '<path d="M112,176 C140,158 180,158 212,180 C176,172 140,176 108,196 Z" fill="#fff" opacity=".6"/>'
pd += line('M92,218 C132,234 190,230 232,210', '#ffd97a', 3) + line('M100,240 C142,260 190,256 224,232', '#fff0b0', 1.6)
pd += curl(120, 212, .5, -8) + gem(164, 192, 15)
ar += f'<g transform="translate(226,206) scale(.8) translate(-226,-206)">{pd}</g>'
svg('armor', 'Armor — eclipse warden coat', ar)

# ---- helm: open crest, the hair and face stay visible ----
band = 'M216,104 C240,84 290,78 330,96 L332,114 C296,100 246,104 222,124 Z'
wn = 'M220,104 C192,92 170,66 166,28 C184,50 206,62 232,70 C222,54 222,34 232,14 C240,38 252,54 268,64 L246,92 Z'
wf = 'M330,98 C350,84 362,60 362,30 C348,48 334,58 318,64 C324,50 324,34 316,20 C310,38 302,50 292,58 L306,84 Z'
crest = 'M272,92 C262,74 262,48 276,18 C290,48 292,74 282,92 Z'
h = part([(wf, G), (wn, G), (band, G), (crest, G)], 5, 1.2) + gem(277, 92, 12)
h += '<path d="M226,102 C210,88 192,72 182,54 C198,70 214,78 234,86 Z" fill="#fff" opacity=".6"/>'
svg('helm', 'Helm — eclipse crest', f'<g transform="translate(280,180) scale(.88) translate(-280,-180)"><g transform="translate(275,100) scale(.72) translate(-275,-100)">{h}</g></g>')
print('ok')
