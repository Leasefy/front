'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * La corriente (Cadence 2 · PIX): píxeles de voltaje que fluyen despacio, como en
 * la referencia de Atlantic que eligió Nico. Es la misma pieza de la landing nueva
 * (23-10-2026): un campo de ruido con dominio deformado, pintado celda por celda en
 * WebGL. Va detrás de los héroes públicos (marketplace, páginas de producto).
 *
 * - Sólo corre cuando se ve (IntersectionObserver) y se queda quieta con
 *   «reducir movimiento».
 * - Sin WebGL no pinta nada: es decoración (`aria-hidden`).
 * - `horizonte` la concentra abajo, para que el texto quede sobre papel limpio.
 */

type Fondo = 'papel' | 'arena' | 'noche';

const FONDOS: Record<Fondo, { fondo: number[]; t1: number[]; t2: number[] }> = {
  papel: { fondo: [251, 250, 248], t1: [26, 64, 255], t2: [96, 122, 255] },
  arena: { fondo: [243, 241, 237], t1: [26, 64, 255], t2: [96, 122, 255] },
  noche: { fondo: [7, 8, 12], t1: [26, 64, 255], t2: [92, 118, 255] },
};

const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
const FRAG = [
  'precision highp float;',
  'uniform vec2 res;uniform float t;uniform float celda;uniform vec3 fondo;uniform vec3 tinta;uniform vec3 tinta2;uniform float semilla;uniform float forma;uniform float fuerza;',
  'float h(vec2 p){p=fract(p*vec2(443.897,441.423));p+=dot(p,p.yx+19.19);return fract((p.x+p.y)*p.x);}',
  'vec2 gr(vec2 p){float a=h(p+semilla)*6.2831853;return vec2(cos(a),sin(a));}',
  'float ru(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*f*(f*(f*6.-15.)+10.);return mix(mix(dot(gr(i),f),dot(gr(i+vec2(1,0)),f-vec2(1,0)),u.x),mix(dot(gr(i+vec2(0,1)),f-vec2(0,1)),dot(gr(i+vec2(1,1)),f-vec2(1,1)),u.x),u.y);}',
  'float fbm(vec2 p){float s=0.,a=.5;mat2 m=mat2(.8,.6,-.6,.8);for(int i=0;i<5;i++){s+=a*ru(p);p=m*p*2.02+vec2(3.1,1.7);a*=.5;}return s;}',
  'void main(){',
  ' vec2 c=floor(gl_FragCoord.xy/celda);vec2 x=c*celda/res.x*3.1;float yN=1.-gl_FragCoord.y/res.y;float tt=t*.022;',
  ' vec2 q=vec2(fbm(x+vec2(0.,tt)),fbm(x+vec2(5.2,1.3-tt)));',
  ' vec2 r=vec2(fbm(x+2.4*q+vec2(1.7,9.2)+tt*.6),fbm(x+2.4*q+vec2(8.3,2.8)));',
  ' float f=fbm(x+2.4*r)/.19;float I=smoothstep(.25,1.15,f);',
  ' float vena=pow(max(0.,1.-abs(f-.1)*2.4),5.);I=max(I,vena*.55);',
  ' float vac=smoothstep(-.7,.6,fbm(x*.4+vec2(17.3,3.9))/.19);I*=.2+.8*vac;',
  ' if(forma>.5){I=min(1.,I*(.45+.95*smoothstep(.35,1.,yN))+.32*smoothstep(.7,1.04,yN)*smoothstep(-1.2,1.2,f));}',
  ' float pr=min(.9,((.004+.03*smoothstep(-.6,.5,f))+.84*pow(I,.85))*fuerza);',
  ' float k=h(c+semilla*.13);vec3 col=fondo;',
  ' if(k<pr){col=mix(tinta,tinta2,step(.62,h(c.yx+3.7)));}',
  ' gl_FragColor=vec4(col,1.);',
  '}',
].join('\n');

export interface CorrienteDeVoltajeProps {
  /** El papel de la página que tiene detrás (los píxeles se pintan sobre ese color). */
  fondo?: Fondo;
  /** `horizonte` concentra los píxeles abajo; `corrientes` los reparte. */
  forma?: 'horizonte' | 'corrientes';
  /** Lado de cada píxel, en px de CSS. */
  celda?: number;
  /** 0–1: cuánto se llena. */
  fuerza?: number;
  /** Cambia la composición (cada héroe con la suya). */
  semilla?: number;
  velocidad?: number;
  className?: string;
}

export function CorrienteDeVoltaje({
  fondo = 'papel',
  forma = 'horizonte',
  celda = 4,
  fuerza = 0.65,
  semilla = 7,
  velocidad = 1,
  className,
}: CorrienteDeVoltajeProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    let gl: WebGLRenderingContext | null = null;
    try {
      gl = cv.getContext('webgl', { antialias: false, alpha: false });
    } catch {
      gl = null;
    }
    if (!gl) {
      cv.style.display = 'none';
      return;
    }
    const sh = (tipo: number, src: string) => {
      const s = gl!.createShader(tipo)!;
      gl!.shaderSource(s, src);
      gl!.compileShader(s);
      return s;
    };
    const pr = gl.createProgram()!;
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) {
      cv.style.display = 'none';
      return;
    }
    gl.useProgram(pr);
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (k: string) => gl!.getUniformLocation(pr, k);
    const F = FONDOS[fondo];
    const c3 = (a: number[]) => a.map((v) => v / 255);
    gl.uniform3fv(u('fondo'), c3(F.fondo));
    gl.uniform3fv(u('tinta'), c3(F.t1));
    gl.uniform3fv(u('tinta2'), c3(F.t2));
    gl.uniform1f(u('semilla'), semilla);
    gl.uniform1f(u('forma'), forma === 'horizonte' ? 1 : 0);

    const quieto = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t0 = performance.now();
    let visible = false;
    let corriendo = false;
    let cuadroId = 0;

    const pintar = (ahora: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(2, Math.round(cv.clientWidth * dpr));
      const h = Math.max(2, Math.round(cv.clientHeight * dpr));
      if (cv.width !== w || cv.height !== h) {
        cv.width = w;
        cv.height = h;
      }
      gl!.viewport(0, 0, w, h);
      gl!.uniform2f(u('res'), w, h);
      gl!.uniform1f(u('celda'), Math.max(2, Math.round(celda * dpr)));
      gl!.uniform1f(u('fuerza'), fuerza);
      gl!.uniform1f(u('t'), quieto ? 40 : 40 + ((ahora - t0) / 1000) * velocidad);
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
    };
    const cuadro = (ahora: number) => {
      if (!visible || quieto) {
        corriendo = false;
        return;
      }
      pintar(ahora);
      cuadroId = requestAnimationFrame(cuadro);
    };
    const arrancar = () => {
      if (quieto) {
        pintar(performance.now());
        return;
      }
      if (corriendo) return;
      corriendo = true;
      cuadroId = requestAnimationFrame(cuadro);
    };
    const io =
      typeof IntersectionObserver === 'function'
        ? new IntersectionObserver(
            (e) => {
              visible = e[0]?.isIntersecting ?? false;
              if (visible) arrancar();
            },
            { rootMargin: '80px' },
          )
        : null;
    if (io) io.observe(cv);
    else {
      visible = true;
      arrancar();
    }
    const alCambiar = () => {
      if (quieto) pintar(performance.now());
    };
    window.addEventListener('resize', alCambiar);
    return () => {
      io?.disconnect();
      cancelAnimationFrame(cuadroId);
      window.removeEventListener('resize', alCambiar);
    };
  }, [fondo, forma, celda, fuerza, semilla, velocidad]);

  return <canvas ref={ref} aria-hidden="true" data-testid="corriente-de-voltaje" className={cn('pointer-events-none block', className)} />;
}
