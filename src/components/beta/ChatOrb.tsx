'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface ChatOrbProps {
  /** Diámetro en px del cuerpo del orbe. El resplandor vive fuera de esa caja. */
  size?: number;
  className?: string;
  /** Texto para lectores de pantalla; `null` lo marca decorativo. */
  label?: string | null;
}

// ============================================================================
// Shader
// ============================================================================

const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

/**
 * El orbe entero es este fragment shader. Referencia: «AI Orb» de Humandone.
 *
 * Lo que hace que se lea como MATERIA y no como un degradado, en orden de
 * importancia:
 *
 *  1. La silueta NO es un círculo: el radio del borde lo perturba ruido en
 *     función del ángulo y del tiempo, así que tiembla como una gota.
 *  2. El interior es un líquido: ruido fbm con distorsión de dominio (el ruido
 *     desplaza las coordenadas con las que se muestrea más ruido). Eso da las
 *     masas de cian / cobalto / casi-negro que se deslizan unas sobre otras.
 *  3. Estrías finas horizontales moduladas por el mismo ruido: la textura
 *     acanalada de la referencia.
 *  4. Un filo nacarado grueso e irregular — blanco que entra en el cuerpo
 *     según el ruido, no un anillo parejo.
 *  5. Resplandor difuso hacia afuera, para que tiña el fondo alrededor.
 *
 * Salida con alfa premultiplicado sobre canvas transparente: el orbe se apoya
 * sobre el fondo real de la app, sea el que sea (claro u oscuro).
 */
const FRAG = `
precision highp float;
varying vec2 v_uv;
uniform float u_time;

// ── Ruido ──────────────────────────────────────────────────────────────
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = rot * p * 2.05 + 11.3;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 p = v_uv;
  float t = u_time;
  float r = length(p);
  float ang = atan(p.y, p.x);

  // 1. Silueta que tiembla: el radio del borde depende del ángulo y del tiempo.
  float wob = fbm(vec2(cos(ang), sin(ang)) * 1.1 + t * 0.30);
  float edge = 0.62 + (wob - 0.5) * 0.05;

  // 2. Líquido interior por distorsión de dominio.
  vec2 q = p * 1.9;
  vec2 warp = vec2(
    fbm(q + vec2(0.0, 0.0) + t * 0.18),
    fbm(q + vec2(5.2, 1.3) - t * 0.14)
  );
  float liquid = fbm(q + 2.6 * warp + vec2(1.7, 9.2) + t * 0.05);

  // Profundidad: abajo más denso (casi negro), arriba más claro (cian).
  float depth = clamp(liquid * 1.10 + p.y * 0.32 + 0.06, 0.0, 1.0);

  vec3 ink    = vec3(0.016, 0.031, 0.125);   // #04081f
  vec3 cobalt = vec3(0.102, 0.251, 1.000);   // #1A40FF
  vec3 cyan   = vec3(0.169, 0.710, 0.910);   // #2BB5E8
  vec3 pearl  = vec3(0.93, 0.97, 1.00);

  // Cobalto como color dominante; la tinta sólo en el fondo de la masa y el
  // cian sólo en la cresta. Sin esto se lava en celeste (probado) o se
  // ennegrece (probado también).
  vec3 col = mix(ink, cobalt, smoothstep(0.14, 0.40, depth));
  col = mix(col, cyan, smoothstep(0.58, 0.80, depth));
  col = mix(col, pearl, smoothstep(0.88, 1.00, depth));

  // 3. Estrías: finas, horizontales, siguen el líquido.
  float stri = sin(p.y * 95.0 + liquid * 14.0 + t * 0.6);
  col *= 1.0 + 0.07 * stri * smoothstep(0.0, 0.35, 0.62 - r);

  // 4. Filo nacarado, grueso e irregular.
  float rimNoise = fbm(vec2(ang * 2.0, r * 6.0) + t * 0.2);
  float rimIn = edge - 0.17 - rimNoise * 0.10;
  float rim = smoothstep(rimIn, edge - 0.02, r);
  col = mix(col, pearl, rim * 0.94);

  // Brillo especular arriba a la izquierda.
  float spec = exp(-dot(p - vec2(-0.22, 0.24), p - vec2(-0.22, 0.24)) * 32.0);
  col += pearl * spec * 0.55;

  // Cuerpo: alfa con borde suave.
  float body = 1.0 - smoothstep(edge - 0.02, edge + 0.015, r);

  // 5. Resplandor hacia afuera.
  float glowF = exp(-max(r - edge, 0.0) * 9.0) * (1.0 - body);
  vec3 glowCol = mix(cyan, cobalt, 0.5);
  float glowA = glowF * 0.45;

  vec3 outCol = col * body + glowCol * glowA;
  float outA = body + glowA;

  gl_FragColor = vec4(outCol, outA);
}`;

// ============================================================================
// WebGL
// ============================================================================

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    // En dev conviene verlo; en prod el fallback CSS cubre.
    console.warn('[ChatOrb] shader:', gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

/**
 * Monta el shader en el canvas y devuelve la función para desmontarlo.
 * `null` si WebGL no está: el llamador deja el fallback CSS.
 */
function mountOrb(canvas: HTMLCanvasElement, reducedMotion: boolean): (() => void) | null {
  const gl = canvas.getContext('webgl', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: true,
    powerPreference: 'low-power',
  });
  if (!gl || gl.isContextLost()) return null;

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  const uTime = gl.getUniformLocation(prog, 'u_time');

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.viewport(0, 0, canvas.width, canvas.height);

  let raf = 0;
  let visible = true;
  const start = performance.now();
  // Un desfase por instancia: dos orbes en pantalla no deben moverse en
  // sincronía perfecta, se ve a copia-pega.
  const phase = Math.random() * 100;

  const draw = () => {
    gl.uniform1f(uTime, (performance.now() - start) / 1000 + phase);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  const loop = () => {
    if (!visible) return;
    draw();
    raf = requestAnimationFrame(loop);
  };

  // Quieto para quien pidió menos movimiento: un solo cuadro, pero sigue
  // siendo un orbe.
  if (reducedMotion) {
    draw();
    return () => {};
  }

  // No dibujar lo que nadie ve: pestaña oculta o canvas fuera de pantalla.
  const onVis = () => {
    visible = document.visibilityState === 'visible';
    if (visible) {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
    }
  };
  document.addEventListener('visibilitychange', onVis);
  const io = new IntersectionObserver(([e]) => {
    const now = e?.isIntersecting ?? true;
    if (now && !visible) {
      visible = true;
      raf = requestAnimationFrame(loop);
    } else if (!now) {
      visible = false;
    }
  });
  io.observe(canvas);

  raf = requestAnimationFrame(loop);

  return () => {
    visible = false;
    cancelAnimationFrame(raf);
    document.removeEventListener('visibilitychange', onVis);
    io.disconnect();
    // NO se llama `loseContext()` acá. Parece limpio, y fue el bug del
    // círculo blanco (Nico, 2026-08-27): en desarrollo React monta cada
    // efecto dos veces (StrictMode), y el segundo montaje reutiliza el MISMO
    // canvas — con el contexto ya perdido, todo `compileShader` devuelve
    // false con log vacío, y el orbe caía al fallback. Los shaders compilaban
    // perfecto (verificado en el navegador real, ANGLE Metal / M3 Pro). El
    // navegador libera el contexto solo cuando el canvas sale del DOM.
  };
}

// ============================================================================
// Componente
// ============================================================================

/**
 * ChatOrb — el estado «pensando» del chat.
 *
 * ── Por qué un shader (Nico, 2026-08-27) ──────────────────────────────────
 *
 * La primera versión era CSS: capas con degradados cónicos girando. Se veía
 * como lo que era, una bola azul borrosa. Nico: «uy no, eso está horrible,
 * yo realmente quiero algo top». Y tenía razón: lo que hace que la referencia
 * se lea como materia —la silueta que tiembla, el interior que fluye, las
 * estrías, el filo irregular— es ruido evaluado por píxel, y eso no sale de
 * un degradado. Sale de un fragment shader.
 *
 * Sobre el costo: es un canvas de ~50px. Un cuadro son unos pocos miles de
 * píxeles con un fbm de 5 octavas — microsegundos en cualquier GPU
 * integrada. Se pausa con la pestaña oculta y fuera de pantalla, y con
 * `prefers-reduced-motion` dibuja un solo cuadro. Si no hay WebGL, queda un
 * fallback CSS que al menos es una esfera azul y no un hueco.
 */
export function ChatOrb({ size = 30, className, label = null }: ChatOrbProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  // El canvas es más grande que el cuerpo para que quepa el resplandor.
  const box = Math.round(size * 1.9);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(box * dpr);
    canvas.height = Math.round(box * dpr);
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const unmount = mountOrb(canvas, reduced);
    if (!unmount) {
      // Sin WebGL: una esfera con degradado, en línea para no depender de que
      // Tailwind haya generado una clase arbitraria con paréntesis y comas.
      canvas.style.borderRadius = '9999px';
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      canvas.style.background =
        'radial-gradient(circle at 35% 30%, #2bb5e8 0%, #1a40ff 45%, #04081f 100%)';
      canvas.style.boxShadow = '0 0 12px rgba(26,64,255,0.35)';
    }
    return () => unmount?.();
  }, [box, size]);

  return (
    <span
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: box, height: box }}
      role={label ? 'status' : undefined}
      aria-label={label ?? undefined}
      aria-hidden={label ? undefined : true}
    >
      <canvas ref={ref} style={{ width: box, height: box, display: 'block' }} />
    </span>
  );
}
