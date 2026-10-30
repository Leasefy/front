/* ════════════════════════════════════════════════════════════════════
   Los fondos sin puntos y las fotos sin rayas (Nico eligió el 29-10-2026
   entre las variaciones de ~/rent/propuestas-landing-29-10/variaciones):

   · héroe y cierre: «La ola en papel», tinta de voltaje sobre el papel. En el
     héroe la tinta responde al cursor (ver la tercera vuelta, abajo);
   · bloque oscuro de los planes: «Curvas de nivel»;
   · fotos: «Duotono que florece» (medianoche, voltaje y papel → color real).

   Nada de esto frena el héroe: arranca cuando la página ya cargó, cada lienzo
   se pausa fuera de pantalla, el DPR va con tope y el texto nunca espera al
   canvas. Con «reducir movimiento» queda un cuadro quieto; sin WebGL, el
   degradado de respaldo del CSS (`.sin-gl`).

   Nico, 29-10 (tercera vuelta): «sigue siendo muy mala, búscate otra». Ya no
   se deforma nada bajo el cursor (ni remolino ni estela): la tinta responde
   ENTERA, como vista por una ventana. La bruma de atrás casi no se corre y las
   cintas de adelante se corren más (profundidad, con inercia); la marea sube
   apenas del lado donde está el cursor, lejos del texto; y al mover el mouse
   la corriente fluye un poco más rápido y se calma sola al quedarse quieto.
   En el celular lo mismo lo hace el scroll.

   Nico, 29-10 (cuarta vuelta): «quiero que sea interactivo, no sólo que lo
   mueva: que uno pase el cursor y él reaccione, pero no como antes tan feo».
   Por donde pasa el cursor nacen ONDAS finas, como un dedo sobre el agua: la
   tinta no se revuelve ni se arrastra, se ondula un instante y vuelve sola
   (anillos que se abren y se apagan en ~2 s, con muy poca amplitud). En el
   celular, el toque deja una onda.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ONDAS = 6;

  var RUIDO = [
    "float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}",
    "float n(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);}",
    "float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}"
  ].join("\n");

  var VERT = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";

  /* la ola en papel: cintas de voltaje que suben desde abajo.
     `m` el cursor suavizado (profundidad), `fl` la fase de la corriente (se acelera al mover el mouse),
     `lado` dónde está el cursor (0–1 a lo ancho), `pv` cuánto está encima y `sube` cuánto se bajó la página */
  var OLA = [
    "precision highp float;",
    "uniform vec2 r; uniform float t; uniform vec2 m; uniform float fl; uniform float lado; uniform float pv; uniform float sube;",
    "uniform vec4 o[" + ONDAS + "];",
    RUIDO,
    "void main(){",
    "  vec2 uv=gl_FragCoord.xy/r; vec2 p=uv; p.x*=r.x/r.y; float tt=fl*.04;",
    /* las ondas del cursor: cada una (x, y, edad, fuerza) es un anillo que se abre y se apaga; corre el punto
       donde se lee la tinta a lo largo del radio, muy poco: la tinta se ondula, no se arrastra */
    "  vec2 ond=vec2(0.); float brillo=0.;",
    "  for(int i=0;i<" + ONDAS + ";i++){",
    "    vec2 d=p-o[i].xy; float rr=length(d)+1e-4; float fr=o[i].z*.32;",
    "    float banda=exp(-pow((rr-fr)*6.,2.))*o[i].w*exp(-o[i].z*1.35)*smoothstep(0.,.1,o[i].z);",
    "    float w=sin((rr-fr)*38.)*banda; ond+=d/rr*w; brillo+=w;",
    "  }",
    /* profundidad: la bruma (lejos) apenas se corre; las cintas (cerca) se corren más; las ondas, más en las cintas */
    "  vec2 pf=p+m*.03+ond*.007; vec2 pc=p+m*.1+vec2(0.,sube*.14)+ond*.02;",
    "  vec2 q=vec2(fbm(pf*1.1+tt),fbm(pf*1.1-tt+5.2));",
    "  vec2 w=vec2(fbm(pc*1.5+2.*q+vec2(1.7,9.2)+tt*1.3),fbm(pc*1.5+2.*q+vec2(8.3,2.8)-tt));",
    "  float f=fbm(pc*1.3+2.2*w);",
    "  float onda=sin((pc.y*2.4+f*3.6+w.x*1.8-pc.x*.6)*3.14159);",
    "  float cinta=smoothstep(.15,1.,onda)*smoothstep(.05,.85,f);",
    "  vec3 papel=vec3(.984,.980,.973); vec3 bruma=vec3(.87,.895,1.); vec3 volt=vec3(.102,.251,1.); vec3 noche=vec3(.086,.125,.361);",
    /* la marea sube apenas del lado del cursor, ancha y suave, y nunca en la franja del texto */
    "  float dx=(uv.x-lado)*1.8;",
    "  float marea=.08*pv*exp(-dx*dx)*smoothstep(.72,.18,uv.y);",
    "  float zona=smoothstep(.92,.04,uv.y-marea);",
    "  vec3 col=mix(papel,bruma,smoothstep(.3,.9,f)*zona*.75);",
    "  col=mix(col,volt,cinta*.82*zona);",
    "  col=mix(col,noche,pow(cinta,3.)*.38*zona*smoothstep(.55,0.,uv.y));",
    /* el filo de luz y sombra del anillo vive en la tinta; sobre el papel limpio casi no se ve (si no, quedan
       anillos grises que se ven sucios) */
    "  float tinta=max(cinta,smoothstep(.3,.9,f)*.55)*zona;",
    "  col+=brillo*(.003+.07*tinta);",
    "  col+=(h(gl_FragCoord.xy*.73+fract(t)*91.)-.5)*.035*zona;",
    "  gl_FragColor=vec4(col,1.);",
    "}"
  ].join("\n");

  /* las curvas de nivel: líneas finas de un mapa que se mueve despacio; cada quinta, más marcada,
     y una que se enciende y recorre el bloque */
  var CURVAS = [
    "#extension GL_OES_standard_derivatives : enable",
    "precision highp float;",
    "uniform vec2 r; uniform float t; uniform vec2 m; uniform vec3 fondo; uniform vec3 linea; uniform vec3 luz; uniform float densidad; uniform float grano;",
    RUIDO,
    "void main(){",
    "  vec2 uv=gl_FragCoord.xy/r; vec2 p=uv; p.x*=r.x/r.y; float tt=t*.022;",
    "  vec2 q=vec2(fbm(p*1.1+vec2(0.,tt)+m*.06),fbm(p*1.1+vec2(5.2,1.3)-tt));",
    "  float f=fbm(p*1.25+1.6*q);",
    "  float v=f*densidad; float fr=fract(v); float d=min(fr,1.-fr); float w=fwidth(v);",
    "  float idx=floor(v+.5); float maestra=step(mod(idx,5.),.5);",
    "  float g=mix(.6,1.35,maestra);",
    "  float l=1.-smoothstep(w*g,w*(g+1.),d);",
    "  float a=mix(.34,.78,maestra);",
    "  float L=floor(mix(.28,.78,fract(t*.035))*densidad+.5); float enc=1.-step(.5,abs(idx-L));",
    "  float masc=mix(.3,1.,smoothstep(.1,.8,uv.x));",
    "  vec3 col=mix(fondo,mix(linea,luz,enc),l*max(a,enc)*masc);",
    "  col+=(h(gl_FragCoord.xy*.71+fract(t)*37.)-.5)*grano;",
    "  gl_FragColor=vec4(col,1.);",
    "}"
  ].join("\n");

  /* Un lienzo WebGL de un cuadro, con su tiempo y el mouse; si es interactivo, la tinta responde entera. */
  function Campo(cv, frag, fijos, op) {
    op = op || {};
    var marco = cv.parentElement;
    var gl = null;
    try { gl = cv.getContext("webgl", { antialias: false, premultipliedAlpha: false, powerPreference: "low-power" }); } catch (e) { gl = null; }
    var sinGl = function () { cv.style.display = "none"; if (marco) marco.classList.add("sin-gl"); };
    if (!gl) return sinGl();
    gl.getExtension("OES_standard_derivatives");
    var sh = function (tipo, src) { var s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
    var vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, frag);
    if (!vs || !fs) return sinGl();
    var pr = gl.createProgram();
    gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return sinGl();
    gl.useProgram(pr);
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var at = gl.getAttribLocation(pr, "a"); gl.enableVertexAttribArray(at); gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
    var U = function (n) { return gl.getUniformLocation(pr, n); };
    Object.keys(fijos || {}).forEach(function (k) { var v = fijos[k]; if (v.length === 3) gl.uniform3f(U(k), v[0], v[1], v[2]); else gl.uniform1f(U(k), v); });
    var ur = U("r"), ut = U("t"), um = U("m"), ufl = U("fl"), ulado = U("lado"), upv = U("pv"), usube = U("sube"), uo = U("o");
    /* las ondas: ONDAS anillos (x, y en el espacio de la tinta, edad en segundos, fuerza); el más viejo se reemplaza */
    var ondas = new Float32Array(ONDAS * 4), kOnda = 0, uOx = -9, uOy = -9, uOt = -9;
    for (var q = 0; q < ONDAS; q++) ondas[q * 4 + 2] = 9;
    var soltarOnda = function (cx, cy, fuerza) {
      if (!rect || !rect.width) return;
      var x = (cx - rect.left) / rect.width, y = (cy - rect.top) / rect.height;
      if (x < 0 || x > 1 || y < 0 || y > 1) return;
      var px = x * rect.width / rect.height, py = 1 - y;
      /* una onda cada tanto camino o cada tanto tiempo: un rastro de anillos, nunca una mancha */
      if (Math.hypot(px - uOx, py - uOy) < .085 && t - uOt < .45) return;
      uOx = px; uOy = py; uOt = t;
      ondas[kOnda * 4] = px; ondas[kOnda * 4 + 1] = py; ondas[kOnda * 4 + 2] = 0; ondas[kOnda * 4 + 3] = fuerza;
      kOnda = (kOnda + 1) % ONDAS;
    };
    var escala = op.escala || 0.6, t = op.inicio || 6, visible = false, corre = false, prev = 0, rect = null;
    var mx = 0, my = 0, fx = 0, fy = 0;
    /* fl: la fase de la corriente; impulso: lo que la acelera (el mouse o el scroll), y se apaga solo */
    var fl = t, impulso = 0, empuje = 0;
    var ladoObj = .5, lado = .5, encima = 0, pv = 0, subeObj = 0, sube = 0, lx = -1, ly = -1;
    var medir = function () {
      rect = cv.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      cv.width = Math.max(2, Math.round(rect.width * escala * dpr)); cv.height = Math.max(2, Math.round(rect.height * escala * dpr));
      gl.viewport(0, 0, cv.width, cv.height);
    };
    var pintar = function () {
      gl.uniform2f(ur, cv.width, cv.height); gl.uniform1f(ut, t); gl.uniform2f(um, fx, fy);
      if (ufl) gl.uniform1f(ufl, fl);
      if (ulado) gl.uniform1f(ulado, lado);
      if (upv) gl.uniform1f(upv, pv);
      if (usube) gl.uniform1f(usube, sube);
      if (uo) gl.uniform4fv(uo, ondas);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    var cuadro = function (now) {
      if (!visible) { corre = false; return; }
      var dt = Math.min(.05, (now - prev) / 1000 || .016); prev = now; t += dt;
      /* todo con inercia: nada salta */
      fx += (mx - fx) * .035; fy += (my - fy) * .035;
      impulso *= .94; empuje += (impulso - empuje) * .05;
      fl += dt * (1 + 1.4 * empuje);
      lado += (ladoObj - lado) * .04; pv += (encima - pv) * .03; sube += (subeObj - sube) * .08;
      for (var j = 0; j < ONDAS; j++) ondas[j * 4 + 2] = Math.min(9, ondas[j * 4 + 2] + dt);
      pintar(); requestAnimationFrame(cuadro);
    };
    medir(); pintar();
    var tr, remedir = function () { clearTimeout(tr); tr = setTimeout(function () { medir(); pintar(); }, 120); };
    if (window.LF && LF.alCambiarDeTamano) LF.alCambiarDeTamano(remedir); else window.addEventListener("resize", remedir);
    if (reducido) return;
    window.addEventListener("pointermove", function (e) {
      mx = e.clientX / window.innerWidth - .5; my = .5 - e.clientY / window.innerHeight;
      if (!op.interactivo || !visible || e.pointerType === "touch") return;
      rect = cv.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width, y = (e.clientY - rect.top) / rect.height;
      encima = x >= 0 && x <= 1 && y >= 0 && y <= 1 ? 1 : 0;
      if (encima) ladoObj = x;
      /* la corriente se acelera con lo que se movió el mouse (relativo al ancho), con tope */
      var paso = lx >= 0 ? Math.hypot(e.clientX - lx, e.clientY - ly) / window.innerWidth : 0;
      if (lx >= 0) impulso = Math.min(1, impulso + paso * 2.2);
      lx = e.clientX; ly = e.clientY;
      /* por donde pasa el cursor nace una onda; más fuerte si se mueve rápido, pero siempre suave */
      if (encima) soltarOnda(e.clientX, e.clientY, Math.min(1, .45 + paso * 14));
    }, { passive: true });
    if (op.interactivo) {
      document.documentElement.addEventListener("pointerleave", function () { encima = 0; lx = -1; });
      /* celular: el toque deja una onda */
      window.addEventListener("touchstart", function (e) {
        if (!visible || !e.touches || !e.touches[0]) return;
        rect = cv.getBoundingClientRect(); uOt = -9; soltarOnda(e.touches[0].clientX, e.touches[0].clientY, .8);
      }, { passive: true });
      /* celular y scroll: la tinta sube con lo que se bajó el héroe y la corriente se acelera un poco */
      var ultimoY = window.scrollY;
      window.addEventListener("scroll", function () {
        var dy = window.scrollY - ultimoY; ultimoY = window.scrollY;
        if (!visible) return;
        rect = cv.getBoundingClientRect();
        subeObj = Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height)));
        impulso = Math.min(1, impulso + Math.abs(dy) / 900);
      }, { passive: true });
    }
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible) { rect = cv.getBoundingClientRect(); if (!corre) { corre = true; prev = performance.now(); requestAnimationFrame(cuadro); } }
    }).observe(cv);
  }

  /* ── el duotono que florece: la foto llega en medianoche, voltaje y papel y al aparecer toma su color ── */
  function duotonos() {
    $$(".foto-duo").forEach(function (box) {
      var im = box.querySelector("img");
      if (!im || reducido) return;
      var tinta = im.cloneNode(false);
      tinta.className = "duo-tinta"; tinta.alt = ""; tinta.setAttribute("aria-hidden", "true");
      tinta.removeAttribute("width"); tinta.removeAttribute("height");
      im.insertAdjacentElement("afterend", tinta);
      box.classList.add("duo-listo");
      if (!("IntersectionObserver" in window)) { box.classList.add("ver"); return; }
      /* florece al llegar a la franja del centro y se vuelve a teñir sólo si sale por abajo (al subir) */
      new IntersectionObserver(function (e) {
        var x = e[0];
        if (x.isIntersecting) box.classList.add("ver");
        else if (x.boundingClientRect.top > 0) box.classList.remove("ver");
      }, { rootMargin: "-18% 0px -18% 0px" }).observe(box);
    });
  }
  duotonos();

  /* los lienzos arrancan cuando la página ya pintó: el héroe nunca espera al WebGL */
  function arrancar() {
    var hero = document.querySelector("canvas.hero-campo");
    if (hero) Campo(hero, OLA, {}, { inicio: 20, interactivo: true });
    var todo = document.querySelector("canvas.todo-campo");
    if (todo) Campo(todo, CURVAS, { fondo: [0.027, 0.031, 0.047], linea: [0.24, 0.36, 1.0], luz: [0.62, 0.69, 1.0], densidad: 16, grano: 0.03 });
    var fin = document.querySelector("canvas.fin-campo");
    if (fin) Campo(fin, OLA, {}, { inicio: 20 });
  }
  var despues = function () { if ("requestIdleCallback" in window) requestIdleCallback(arrancar, { timeout: 700 }); else setTimeout(arrancar, 60); };
  if (document.readyState === "complete") despues(); else window.addEventListener("load", despues);
})();
