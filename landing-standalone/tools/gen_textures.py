"""Genera las 9 texturas de marca a 1600px — gradientes orgánicos warped + grano fino.
Cada spec calca la paleta y composición de la referencia enviada por el usuario."""
import numpy as np
from PIL import Image, ImageFilter
from scipy.ndimage import gaussian_filter

S = 1600
rng = np.random.default_rng(7)

def hx(c):
    c = c.lstrip('#')
    return np.array([int(c[i:i+2], 16) for i in (0, 2, 4)], dtype=np.float64)

def vnoise(shape, scale, seed):
    r = np.random.default_rng(seed)
    h = max(2, int(shape[0] / scale)); w = max(2, int(shape[1] / scale))
    g = r.random((h, w))
    img = Image.fromarray((g * 255).astype(np.uint8)).resize((shape[1], shape[0]), Image.BICUBIC)
    return np.asarray(img, dtype=np.float64) / 255.0

def fbm(shape, base_scale, octaves, seed):
    out = np.zeros(shape); amp = 1.0; tot = 0.0
    for o in range(octaves):
        out += amp * vnoise(shape, base_scale / (2 ** o), seed + o * 101)
        tot += amp; amp *= 0.5
    return out / tot

def render(spec, seed, out):
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float64) / S
    # domain warp direccional: vetas largas a lo largo del eje de flujo
    wamp = spec.get('warp', 0.16)
    flow = np.deg2rad(spec.get('flow', -32))
    fa = fbm((S, S), 640, 5, seed) - 0.5        # a lo largo (fuerte)
    fb = fbm((S, S), 300, 4, seed + 500) - 0.5  # transversal (suave)
    wx = 2 * (fa * np.cos(flow) * wamp * 1.9 - fb * np.sin(flow) * wamp * 0.5)
    wy = 2 * (fa * np.sin(flow) * wamp * 1.9 + fb * np.cos(flow) * wamp * 0.5)
    u = np.clip(xx + wx, 0, 1); v = np.clip(yy + wy, 0, 1)
    img = np.zeros((S, S, 3)) + hx(spec['base'])[None, None, :]
    for (col, cx, cy, rx, ry, ang, inten) in spec['blobs']:
        a = np.deg2rad(ang)
        du = (u - cx) * np.cos(a) + (v - cy) * np.sin(a)
        dv = -(u - cx) * np.sin(a) + (v - cy) * np.cos(a)
        m = np.exp(-((du / rx) ** 2 + (dv / ry) ** 2)) * inten
        m = np.clip(m, 0, 1)[:, :, None]
        img = img * (1 - m) + hx(col)[None, None, :] * m
    # suavizado para fundir
    img = gaussian_filter(img, sigma=(7, 7, 0))
    # contraste (curva S) + saturacion de marca
    x = np.clip(img / 255.0, 0, 1)
    x = x ** 1.08
    x = x + (x - gaussian_filter(x, sigma=(30, 30, 0))) * 0.35   # local contrast
    mean = x.mean(axis=2, keepdims=True)
    x = np.clip(mean + (x - mean) * spec.get('sat', 1.45), 0, 1)
    x = 0.5 + (x - 0.5) * 1.13
    img = np.clip(x, 0, 1) * 255.0
    # vineta
    vin = spec.get('vin', 0.55)
    d2 = ((xx - 0.5) ** 2 + (yy - 0.5) ** 2)
    vmask = 1 - vin * np.clip((d2 - 0.16) / 0.36, 0, 1) ** 1.4
    img *= vmask[:, :, None]
    # grano fino de marca (dos frecuencias)
    g1 = rng.normal(0, 4.4, (S, S, 1))
    g2 = gaussian_filter(rng.normal(0, 7.5, (S, S, 1)), sigma=(1.1, 1.1, 0))
    img = img + g1 + g2
    im = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
    im = im.filter(ImageFilter.GaussianBlur(0.4))
    im.save(out, 'WEBP', quality=86, method=6)
    return out

SPECS = {
 # t1 <- ref: azul profundo, teal izq, dorado abajo-izq, crema centro
 't1': dict(base='#081d4e', vin=0.72, warp=0.20, blobs=[
    ('#1a40ff', .74, .22, .40, .30, -20, .85), ('#0a2f68', .18, .14, .34, .26, 15, .9),
    ('#1f6f5f', .12, .52, .30, .22, 25, .8), ('#e8c25a', .30, .78, .34, .16, 28, .85),
    ('#f2e9d8', .55, .48, .26, .15, 32, .9), ('#d9dfe8', .47, .30, .20, .10, 30, .6),
    ('#04102e', .88, .90, .30, .24, 0, .85)]),
 # t2 <- ref: verde/teal arriba-izq, blanco/crema centro-arriba, azul dcha, lima abajo
 't2': dict(base='#0d3a66', vin=0.62, warp=0.18, blobs=[
    ('#123a2a', .10, .12, .30, .24, 20, .9), ('#f4efe2', .52, .16, .26, .16, 18, .95),
    ('#f0b98a', .78, .10, .16, .10, 10, .8), ('#1747d8', .88, .48, .34, .30, -12, .9),
    ('#2a8f7a', .16, .48, .26, .18, 22, .75), ('#b8c93a', .38, .82, .30, .16, 20, .85),
    ('#7fd0c8', .60, .55, .20, .12, 25, .6)]),
 # t3 <- ref: plasma violeta/azul/rosa con vetas
 't3': dict(base='#1522a8', vin=0.6, warp=0.26, blobs=[
    ('#7a3df0', .22, .22, .30, .16, -35, .9), ('#d36ae8', .80, .16, .22, .12, -30, .85),
    ('#9fd4ff', .58, .38, .26, .10, -38, .9), ('#f0b48a', .52, .62, .28, .11, -32, .85),
    ('#b06ae0', .18, .70, .26, .14, -28, .8), ('#0a1060', .92, .88, .30, .26, 0, .9),
    ('#e8f0ff', .68, .30, .14, .06, -36, .7)]),
 # t4 <- ref: azul + diagonal dorada/crema
 't4': dict(base='#0d2f8f', vin=0.68, warp=0.17, blobs=[
    ('#071540', .10, .16, .34, .28, 0, .9), ('#1a40ff', .34, .52, .38, .30, -18, .8),
    ('#d9a24a', .82, .18, .30, .13, -38, .9), ('#f2e3c0', .62, .40, .30, .11, -40, .9),
    ('#c8974f', .40, .74, .24, .11, -35, .8), ('#7c93c4', .20, .46, .22, .12, -30, .6),
    ('#050f33', .90, .88, .28, .22, 0, .85)]),
 # t5 <- ref: azul rey arriba, crema/durazno abajo-izq
 't5': dict(base='#1240c9', vin=0.6, warp=0.16, blobs=[
    ('#081a55', .12, .10, .34, .26, 12, .9), ('#f3ead6', .26, .66, .30, .18, 18, .95),
    ('#ecb27c', .48, .78, .24, .13, 15, .85), ('#cfe8f0', .16, .44, .20, .12, 22, .7),
    ('#1a49e8', .78, .30, .36, .30, -15, .85), ('#0a1f66', .88, .82, .28, .22, 0, .8)]),
 # t6 <- ref: azul suave, teal-verde izq, crema/dorado centro
 't6': dict(base='#2a6bd8', vin=0.55, warp=0.16, blobs=[
    ('#5f9a7a', .12, .42, .28, .20, 18, .85), ('#efe6cc', .42, .52, .28, .17, 20, .9),
    ('#e0b26a', .72, .24, .20, .12, 15, .8), ('#7db3e8', .22, .12, .24, .16, 10, .7),
    ('#1747d8', .90, .55, .30, .26, -10, .85), ('#d8b878', .20, .84, .18, .10, 18, .7)]),
 # t7 <- ref: azul + lima/amarillo-verde + aguamarina
 't7': dict(base='#1449d6', vin=0.6, warp=0.18, blobs=[
    ('#c0d93a', .14, .16, .26, .16, 25, .85), ('#0d3a3a', .06, .60, .24, .20, 15, .8),
    ('#bfe8ea', .72, .48, .30, .13, -28, .9), ('#4a9ee8', .48, .12, .24, .14, -20, .75),
    ('#a8c93a', .22, .78, .26, .14, 22, .8), ('#0a2470', .90, .86, .30, .24, 0, .85)]),
 # t8 <- ref: azul rey + nubes blancas (limpio, confianza)
 't8': dict(base='#1330b8', vin=0.62, warp=0.19, blobs=[
    ('#060e46', .10, .14, .32, .26, 10, .9), ('#f2f4f8', .74, .28, .28, .13, -35, .95),
    ('#6f8fe8', .40, .52, .30, .14, -32, .8), ('#dce6f4', .34, .68, .26, .12, -30, .8),
    ('#0a1a66', .12, .86, .28, .22, 0, .85), ('#2a52e0', .88, .70, .30, .24, -15, .7)]),
 # t9 <- ref: azul + gran resplandor durazno/crema al centro-dcha
 't9': dict(base='#1746c4', vin=0.58, warp=0.17, blobs=[
    ('#edb27f', .78, .22, .26, .16, -25, .9), ('#f4ead8', .56, .48, .30, .19, -20, .95),
    ('#8fa3d0', .22, .20, .26, .13, -30, .7), ('#0a1a5e', .10, .82, .30, .24, 0, .9),
    ('#e8c9a0', .70, .74, .22, .12, -22, .8), ('#2a52e0', .16, .50, .26, .20, -12, .7)]),
}

import sys
tot = 0
for i, (name, spec) in enumerate(SPECS.items()):
    out = f'/root/u-{name}.webp'
    render(spec, 1000 + i * 37, out)
    import os
    kb = os.path.getsize(out) // 1024
    tot += kb
    print(name, f'{kb}KB')
print('TOTAL', tot, 'KB')
