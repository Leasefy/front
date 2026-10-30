'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * Los fondos de la marca sin puntos (Nico, 29-10-2026, el home; 30-10: «el marketplace todavía tiene cosas de dots»).
 * Son los mismos lienzos del home estático (`public/landing/js/09-campos.js`), con el mismo sombreador:
 *
 * - **`OlaEnPapel`**: cintas de tinta de voltaje que suben desde abajo sobre el papel; arriba queda papel limpio para
 *   el texto. Con `interactivo`, por donde pasa el cursor nacen ondas finas, como un dedo sobre el agua (la cuarta
 *   vuelta del home: reacción local, poca amplitud, se apaga sola); la marea sube apenas del lado del cursor y la
 *   corriente fluye un poco más rápido mientras se mueve. En el celular, el toque deja una onda y el scroll la empuja.
 * - **`CurvasDeNivel`**: las líneas finas de un mapa que se mueve despacio, para los bloques de medianoche.
 *
 * Reemplazan a `CorrienteDeVoltaje` (los píxeles). Sólo corren cuando se ven, el lienzo va a menor resolución (la
 * tinta es blanda), con «reducir movimiento» queda un cuadro quieto y sin WebGL no se pinta nada: son decoración.
 */

const ONDAS = 6;

const RUIDO = [
  'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
  'float n(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);}',
  'float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}',
].join('\n');

const VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';

// El de `09-campos.js` tal cual, con el papel como uniforme (la página puede ser papel, superficie o arena).
const OLA = [
  'precision highp float;',
  'uniform vec2 r; uniform float t; uniform vec2 m; uniform float fl; uniform float lado; uniform float pv; uniform float sube; uniform vec3 papel;',
  `uniform vec4 o[${ONDAS}];`,
  RUIDO,
  'void main(){',
  '  vec2 uv=gl_FragCoord.xy/r; vec2 p=uv; p.x*=r.x/r.y; float tt=fl*.04;',
  '  vec2 ond=vec2(0.); float brillo=0.;',
  `  for(int i=0;i<${ONDAS};i++){`,
  '    vec2 d=p-o[i].xy; float rr=length(d)+1e-4; float fr=o[i].z*.32;',
  '    float banda=exp(-pow((rr-fr)*6.,2.))*o[i].w*exp(-o[i].z*1.35)*smoothstep(0.,.1,o[i].z);',
  '    float w=sin((rr-fr)*38.)*banda; ond+=d/rr*w; brillo+=w;',
  '  }',
  '  vec2 pf=p+m*.03+ond*.007; vec2 pc=p+m*.1+vec2(0.,sube*.14)+ond*.02;',
  '  vec2 q=vec2(fbm(pf*1.1+tt),fbm(pf*1.1-tt+5.2));',
  '  vec2 w=vec2(fbm(pc*1.5+2.*q+vec2(1.7,9.2)+tt*1.3),fbm(pc*1.5+2.*q+vec2(8.3,2.8)-tt));',
  '  float f=fbm(pc*1.3+2.2*w);',
  '  float onda=sin((pc.y*2.4+f*3.6+w.x*1.8-pc.x*.6)*3.14159);',
  '  float cinta=smoothstep(.15,1.,onda)*smoothstep(.05,.85,f);',
  '  vec3 bruma=vec3(.87,.895,1.); vec3 volt=vec3(.102,.251,1.); vec3 noche=vec3(.086,.125,.361);',
  '  float dx=(uv.x-lado)*1.8;',
  '  float marea=.08*pv*exp(-dx*dx)*smoothstep(.72,.18,uv.y);',
  '  float zona=smoothstep(.92,.04,uv.y-marea);',
  '  vec3 col=mix(papel,bruma,smoothstep(.3,.9,f)*zona*.75);',
  '  col=mix(col,volt,cinta*.82*zona);',
  '  col=mix(col,noche,pow(cinta,3.)*.38*zona*smoothstep(.55,0.,uv.y));',
  '  float tinta=max(cinta,smoothstep(.3,.9,f)*.55)*zona;',
  '  col+=brillo*(.003+.07*tinta);',
  '  col+=(h(gl_FragCoord.xy*.73+fract(t)*91.)-.5)*.035*zona;',
  '  gl_FragColor=vec4(col,1.);',
  '}',
].join('\n');

const CURVAS = [
  '#extension GL_OES_standard_derivatives : enable',
  'precision highp float;',
  'uniform vec2 r; uniform float t; uniform vec2 m; uniform vec3 fondo; uniform vec3 linea; uniform vec3 luz; uniform float densidad; uniform float grano;',
  RUIDO,
  'void main(){',
  '  vec2 uv=gl_FragCoord.xy/r; vec2 p=uv; p.x*=r.x/r.y; float tt=t*.022;',
  '  vec2 q=vec2(fbm(p*1.1+vec2(0.,tt)+m*.06),fbm(p*1.1+vec2(5.2,1.3)-tt));',
  '  float f=fbm(p*1.25+1.6*q);',
  '  float v=f*densidad; float fr=fract(v); float d=min(fr,1.-fr); float w=fwidth(v);',
  '  float idx=floor(v+.5); float maestra=step(mod(idx,5.),.5);',
  '  float g=mix(.6,1.35,maestra);',
  '  float l=1.-smoothstep(w*g,w*(g+1.),d);',
  '  float a=mix(.34,.78,maestra);',
  '  float L=floor(mix(.28,.78,fract(t*.035))*densidad+.5); float enc=1.-step(.5,abs(idx-L));',
  '  float masc=mix(.3,1.,smoothstep(.1,.8,uv.x));',
  '  vec3 col=mix(fondo,mix(linea,luz,enc),l*max(a,enc)*masc);',
  '  col+=(h(gl_FragCoord.xy*.71+fract(t)*37.)-.5)*grano;',
  '  gl_FragColor=vec4(col,1.);',
  '}',
].join('\n');

const PAPELES = {
  papel: [0.984, 0.98, 0.973],
  superficie: [1, 1, 1],
  arena: [0.953, 0.945, 0.929],
} as const;

type Fijos = Record<string, readonly number[] | number>;

interface Opciones {
  interactivo?: boolean;
  /** Segundos de corriente con los que arranca (así el primer cuadro ya tiene forma). */
  inicio?: number;
}

/** El lienzo WebGL de un cuadro, con su tiempo y el mouse: el `Campo` de `09-campos.js` en un efecto de React. */
function montarCampo(cv: HTMLCanvasElement, frag: string, fijos: Fijos, op: Opciones): () => void {
  let gl: WebGLRenderingContext | null = null;
  try {
    gl = cv.getContext('webgl', { antialias: false, premultipliedAlpha: false, powerPreference: 'low-power' });
  } catch {
    gl = null;
  }
  const sinGl = () => {
    cv.style.display = 'none';
    return () => {};
  };
  if (!gl) return sinGl();
  gl.getExtension('OES_standard_derivatives');
  const sh = (tipo: number, src: string) => {
    const s = gl!.createShader(tipo);
    if (!s) return null;
    gl!.shaderSource(s, src);
    gl!.compileShader(s);
    return gl!.getShaderParameter(s, gl!.COMPILE_STATUS) ? s : null;
  };
  const vs = sh(gl.VERTEX_SHADER, VERT);
  const fs = sh(gl.FRAGMENT_SHADER, frag);
  const pr = gl.createProgram();
  if (!vs || !fs || !pr) return sinGl();
  gl.attachShader(pr, vs);
  gl.attachShader(pr, fs);
  gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return sinGl();
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const at = gl.getAttribLocation(pr, 'a');
  gl.enableVertexAttribArray(at);
  gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
  const U = (n: string) => gl!.getUniformLocation(pr, n);
  for (const [k, v] of Object.entries(fijos)) {
    if (typeof v === 'number') gl.uniform1f(U(k), v);
    else gl.uniform3f(U(k), v[0], v[1], v[2]);
  }
  const ur = U('r'), ut = U('t'), um = U('m'), ufl = U('fl'), ulado = U('lado'), upv = U('pv'), usube = U('sube'), uo = U('o');

  // Las ondas: ONDAS anillos (x, y en el espacio de la tinta, edad en segundos, fuerza); el más viejo se reemplaza.
  const ondas = new Float32Array(ONDAS * 4);
  for (let q = 0; q < ONDAS; q++) ondas[q * 4 + 2] = 9;
  let kOnda = 0, uOx = -9, uOy = -9, uOt = -9;
  let t = op.inicio ?? 6, visible = false, corre = false, prev = 0, cuadroId = 0;
  let rect = cv.getBoundingClientRect();
  let mx = 0, my = 0, fx = 0, fy = 0;
  // fl: la fase de la corriente; impulso: lo que la acelera (el mouse o el scroll), y se apaga solo.
  let fl = t, impulso = 0, empuje = 0;
  let ladoObj = 0.5, lado = 0.5, encima = 0, pv = 0, subeObj = 0, sube = 0, lx = -1, ly = -1;

  const soltarOnda = (cx: number, cy: number, fuerza: number) => {
    if (!rect.width || !rect.height) return;
    const x = (cx - rect.left) / rect.width, y = (cy - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    const px = (x * rect.width) / rect.height, py = 1 - y;
    // Una onda cada tanto camino o cada tanto tiempo: un rastro de anillos, nunca una mancha.
    if (Math.hypot(px - uOx, py - uOy) < 0.085 && t - uOt < 0.45) return;
    uOx = px;
    uOy = py;
    uOt = t;
    ondas.set([px, py, 0, fuerza], kOnda * 4);
    kOnda = (kOnda + 1) % ONDAS;
  };
  const medir = () => {
    rect = cv.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    cv.width = Math.max(2, Math.round(rect.width * 0.6 * dpr));
    cv.height = Math.max(2, Math.round(rect.height * 0.6 * dpr));
    gl!.viewport(0, 0, cv.width, cv.height);
  };
  const pintar = () => {
    gl!.uniform2f(ur, cv.width, cv.height);
    gl!.uniform1f(ut, t);
    gl!.uniform2f(um, fx, fy);
    if (ufl) gl!.uniform1f(ufl, fl);
    if (ulado) gl!.uniform1f(ulado, lado);
    if (upv) gl!.uniform1f(upv, pv);
    if (usube) gl!.uniform1f(usube, sube);
    if (uo) gl!.uniform4fv(uo, ondas);
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
  };
  const cuadro = (ahora: number) => {
    if (!visible) {
      corre = false;
      return;
    }
    const dt = Math.min(0.05, (ahora - prev) / 1000 || 0.016);
    prev = ahora;
    t += dt;
    // Todo con inercia: nada salta.
    fx += (mx - fx) * 0.035;
    fy += (my - fy) * 0.035;
    impulso *= 0.94;
    empuje += (impulso - empuje) * 0.05;
    fl += dt * (1 + 1.4 * empuje);
    lado += (ladoObj - lado) * 0.04;
    pv += (encima - pv) * 0.03;
    sube += (subeObj - sube) * 0.08;
    for (let j = 0; j < ONDAS; j++) ondas[j * 4 + 2] = Math.min(9, ondas[j * 4 + 2] + dt);
    pintar();
    cuadroId = requestAnimationFrame(cuadro);
  };

  medir();
  pintar();
  let tr: ReturnType<typeof setTimeout> | undefined;
  const ro =
    typeof ResizeObserver === 'function'
      ? new ResizeObserver(() => {
          clearTimeout(tr);
          tr = setTimeout(() => {
            medir();
            pintar();
          }, 120);
        })
      : null;
  ro?.observe(cv);
  const quieto = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (quieto) {
    return () => {
      clearTimeout(tr);
      ro?.disconnect();
    };
  }

  const alMover = (e: PointerEvent) => {
    mx = e.clientX / window.innerWidth - 0.5;
    my = 0.5 - e.clientY / window.innerHeight;
    if (!op.interactivo || !visible || e.pointerType === 'touch') return;
    rect = cv.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width, y = (e.clientY - rect.top) / rect.height;
    encima = x >= 0 && x <= 1 && y >= 0 && y <= 1 ? 1 : 0;
    if (encima) ladoObj = x;
    // La corriente se acelera con lo que se movió el mouse (relativo al ancho), con tope.
    const paso = lx >= 0 ? Math.hypot(e.clientX - lx, e.clientY - ly) / window.innerWidth : 0;
    if (lx >= 0) impulso = Math.min(1, impulso + paso * 2.2);
    lx = e.clientX;
    ly = e.clientY;
    // Por donde pasa el cursor nace una onda; más fuerte si se mueve rápido, pero siempre suave.
    if (encima) soltarOnda(e.clientX, e.clientY, Math.min(1, 0.45 + paso * 14));
  };
  const alSalir = () => {
    encima = 0;
    lx = -1;
  };
  // Celular: el toque deja una onda.
  const alTocar = (e: TouchEvent) => {
    const toque = e.touches?.[0];
    if (!visible || !toque) return;
    rect = cv.getBoundingClientRect();
    uOt = -9;
    soltarOnda(toque.clientX, toque.clientY, 0.8);
  };
  // Celular y scroll: la tinta sube con lo que se bajó el héroe y la corriente se acelera un poco.
  let ultimoY = window.scrollY;
  const alBajar = () => {
    const dy = window.scrollY - ultimoY;
    ultimoY = window.scrollY;
    if (!visible) return;
    rect = cv.getBoundingClientRect();
    subeObj = Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height)));
    impulso = Math.min(1, impulso + Math.abs(dy) / 900);
  };
  window.addEventListener('pointermove', alMover, { passive: true });
  if (op.interactivo) {
    document.documentElement.addEventListener('pointerleave', alSalir);
    window.addEventListener('touchstart', alTocar, { passive: true });
    window.addEventListener('scroll', alBajar, { passive: true });
  }
  const io =
    typeof IntersectionObserver === 'function'
      ? new IntersectionObserver((es) => {
          visible = es[0]?.isIntersecting ?? false;
          if (visible) {
            rect = cv.getBoundingClientRect();
            if (!corre) {
              corre = true;
              prev = performance.now();
              cuadroId = requestAnimationFrame(cuadro);
            }
          }
        })
      : null;
  if (io) io.observe(cv);
  else {
    visible = true;
    corre = true;
    cuadroId = requestAnimationFrame(cuadro);
  }

  return () => {
    visible = false;
    cancelAnimationFrame(cuadroId);
    clearTimeout(tr);
    ro?.disconnect();
    io?.disconnect();
    window.removeEventListener('pointermove', alMover);
    document.documentElement.removeEventListener('pointerleave', alSalir);
    window.removeEventListener('touchstart', alTocar);
    window.removeEventListener('scroll', alBajar);
    // Sin `loseContext`: si React vuelve a montar el MISMO lienzo (modo estricto, recarga en caliente, otra prop),
    // getContext devolvería el contexto perdido y el fondo no volvería a pintar. Al salir de la página se libera solo.
  };
}

export interface OlaEnPapelProps {
  /** El papel de la página que tiene detrás (la tinta sube sobre ese color). */
  fondo?: keyof typeof PAPELES;
  /** Ondas donde pasa el cursor (o el dedo), marea del lado del cursor y la corriente que se acelera al moverlo. */
  interactivo?: boolean;
  className?: string;
}

export function OlaEnPapel({ fondo = 'papel', interactivo = false, className }: OlaEnPapelProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    return montarCampo(cv, OLA, { papel: PAPELES[fondo] }, { inicio: 20, interactivo });
  }, [fondo, interactivo]);
  return <canvas ref={ref} aria-hidden="true" data-testid="ola-en-papel" className={cn('pointer-events-none block', className)} />;
}

export interface CurvasDeNivelProps {
  className?: string;
}

/** Sobre medianoche (`#07080C`): el fondo del lienzo es ese mismo negro. */
export function CurvasDeNivel({ className }: CurvasDeNivelProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    return montarCampo(
      cv,
      CURVAS,
      { fondo: [0.027, 0.031, 0.047], linea: [0.24, 0.36, 1.0], luz: [0.62, 0.69, 1.0], densidad: 16, grano: 0.03 },
      {},
    );
  }, []);
  return <canvas ref={ref} aria-hidden="true" data-testid="curvas-de-nivel" className={cn('pointer-events-none block', className)} />;
}
