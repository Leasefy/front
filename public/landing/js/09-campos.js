/* ════════════════════════════════════════════════════════════════════
   Los fondos sin puntos y las fotos sin rayas (Nico eligió el 29-10-2026
   entre las variaciones de ~/rent/propuestas-landing-29-10/variaciones):

   · héroe y cierre: «La ola en papel», tinta de voltaje sobre el papel. En el
     héroe el cursor la revuelve y deja una estela que se disipa, y la tinta se
     aviva cerca del puntero (Nico: «que se comporte mejor con el hover, algo
     más wow»); en el celular, el toque y el scroll hacen lo mismo;
   · bloque oscuro de los planes: «Curvas de nivel»;
   · fotos: «Duotono que florece» (medianoche, voltaje y papel → color real).

   Nada de esto frena el héroe: arranca cuando la página ya cargó, cada lienzo
   se pausa fuera de pantalla, el DPR va con tope y el texto nunca espera al
   canvas. Con «reducir movimiento» queda un cuadro quieto; sin WebGL, el
   degradado de respaldo del CSS (`.sin-gl`).

   Nico, 29-10 (segunda vuelta): «está muy mucho; haz algo más wow pero light».
   La tinta sólo se aparta y se curva un poco al paso del cursor, en un radio
   chico, con inercia y una estela corta que se disipa rápido; sin remolinos ni
   cambios bruscos de color. En el celular, apenas un eco al tocar o al bajar.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ESTELA = 12;

  var RUIDO = [
    "float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}",
    "float n(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);}",
    "float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}"
  ].join("\n");

  var VERT = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";

  /* la ola en papel: cintas de voltaje que suben desde abajo; `s` es la estela del cursor
     (x, y en el espacio de la tinta y su fuerza), `pm` el puntero suavizado y `pv` cuánto está encima */
  var OLA = [
    "precision highp float;",
    "uniform vec2 r; uniform float t; uniform vec2 m; uniform vec3 s[" + ESTELA + "]; uniform vec2 pm; uniform float pv;",
    RUIDO,
    "void main(){",
    "  vec2 uv=gl_FragCoord.xy/r; vec2 p=uv; p.x*=r.x/r.y; vec2 p0=p; float tt=t*.04; p+=m*.05;",
    "  vec2 rev=vec2(0.); float aviva=0.;",
    "  for(int i=0;i<" + ESTELA + ";i++){vec2 d=p0-s[i].xy; float k=s[i].z*exp(-dot(d,d)*42.); rev+=d*k*.42+vec2(-d.y,d.x)*k*.38; aviva+=k;}",
    "  p+=rev;",
    "  vec2 q=vec2(fbm(p*1.1+tt),fbm(p*1.1-tt+5.2));",
    "  vec2 w=vec2(fbm(p*1.5+2.*q+vec2(1.7,9.2)+tt*1.3),fbm(p*1.5+2.*q+vec2(8.3,2.8)-tt));",
    "  float f=fbm(p*1.3+2.2*w);",
    "  float onda=sin((p.y*2.4+f*3.6+w.x*1.8-p.x*.6)*3.14159);",
    "  float cinta=smoothstep(.15,1.,onda)*smoothstep(.05,.85,f);",
    "  vec3 papel=vec3(.984,.980,.973); vec3 bruma=vec3(.87,.895,1.); vec3 volt=vec3(.102,.251,1.); vec3 noche=vec3(.086,.125,.361);",
    "  vec2 dp=p0-pm; float cerca=exp(-dot(dp,dp)*30.)*pv;",
    /* arriba vive el texto: ahí la tinta que despierta el cursor tiene tope, para que se siga leyendo */
    "  float tope=mix(.7,.36,smoothstep(.42,.86,uv.y));",
    "  float zona=max(smoothstep(.92,.04,uv.y),clamp(aviva*.22+cerca*.2,0.,1.)*tope);",
    "  vec3 col=mix(papel,bruma,smoothstep(.3,.9,f)*zona*.75);",
    "  col=mix(col,volt,cinta*.82*zona);",
    "  col=mix(col,noche,pow(cinta,3.)*.38*zona*smoothstep(.55,0.,uv.y));",
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

  /* Un lienzo WebGL de un cuadro, con su tiempo, el mouse y (si es interactivo) la estela. */
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
    var ur = U("r"), ut = U("t"), um = U("m"), us = U("s"), upm = U("pm"), upv = U("pv");
    var escala = op.escala || 0.6, t = op.inicio || 6, visible = false, corre = false, prev = 0;
    var mx = 0, my = 0, fx = 0, fy = 0;
    /* la estela: ESTELA puntos (x, y, fuerza); el más viejo se reemplaza */
    var estela = new Float32Array(ESTELA * 3), k = 0, ux = -9, uy = -9;
    var px = -9, py = -9, spx = -9, spy = -9, encima = 0, aviva = 0, rect = null, fuerzaDelPaso = 1;
    var medir = function () {
      rect = cv.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      cv.width = Math.max(2, Math.round(rect.width * escala * dpr)); cv.height = Math.max(2, Math.round(rect.height * escala * dpr));
      gl.viewport(0, 0, cv.width, cv.height);
    };
    var pintar = function () {
      gl.uniform2f(ur, cv.width, cv.height); gl.uniform1f(ut, t); gl.uniform2f(um, fx, fy);
      if (us) gl.uniform3fv(us, estela);
      if (upm) gl.uniform2f(upm, spx, spy);
      if (upv) gl.uniform1f(upv, aviva);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    /* un punto del cursor en el espacio de la tinta (x en proporción del lienzo, y de abajo hacia arriba) */
    var marcar = function (cx, cy, fuerza) {
      if (!rect || !rect.width) return;
      var x = (cx - rect.left) / rect.width, y = (cy - rect.top) / rect.height;
      if (x < -.05 || x > 1.05 || y < -.05 || y > 1.05) { encima = 0; return; }
      var asp = rect.width / rect.height;
      px = x * asp; py = 1 - y; encima = 1; fuerzaDelPaso = Math.min(1, fuerza);
      if (spx < -8) { spx = px; spy = py; ux = px; uy = py; }
    };
    var cuadro = function (now) {
      if (!visible) { corre = false; return; }
      var dt = Math.min(.05, (now - prev) / 1000 || .016); prev = now; t += dt;
      fx += (mx - fx) * .03; fy += (my - fy) * .03;
      if (op.interactivo) {
        /* la estela se disipa sola; el puntero suavizado la sigue sin saltos */
        /* estela corta: se disipa en menos de medio segundo */
        for (var i = 0; i < ESTELA; i++) estela[i * 3 + 2] *= .9;
        if (px > -8) {
          /* el puntero suavizado (inercia) es el que deja la estela: nada salta */
          spx += (px - spx) * .06; spy += (py - spy) * .06;
          if (Math.hypot(spx - ux, spy - uy) > .018) {
            ux = spx; uy = spy;
            estela[k * 3] = spx; estela[k * 3 + 1] = spy; estela[k * 3 + 2] = fuerzaDelPaso;
            k = (k + 1) % ESTELA;
          }
        }
        aviva += (encima - aviva) * .04;
      }
      pintar(); requestAnimationFrame(cuadro);
    };
    medir(); pintar();
    var tr; window.addEventListener("resize", function () { clearTimeout(tr); tr = setTimeout(function () { medir(); pintar(); }, 120); });
    if (reducido) return;
    window.addEventListener("pointermove", function (e) {
      mx = e.clientX / window.innerWidth - .5; my = .5 - e.clientY / window.innerHeight;
      if (op.interactivo && visible && e.pointerType !== "touch") { rect = cv.getBoundingClientRect(); marcar(e.clientX, e.clientY, 1); }
    }, { passive: true });
    if (op.interactivo) {
      document.documentElement.addEventListener("pointerleave", function () { encima = 0; });
      /* celular: el dedo revuelve la tinta y el scroll también la mueve */
      var toque = function (e) { if (!visible || !e.touches || !e.touches[0]) return; rect = cv.getBoundingClientRect(); marcar(e.touches[0].clientX, e.touches[0].clientY, .45); };
      window.addEventListener("touchstart", toque, { passive: true });
      window.addEventListener("touchmove", toque, { passive: true });
      window.addEventListener("touchend", function () { encima = 0; }, { passive: true });
      var ultimoY = window.scrollY;
      window.addEventListener("scroll", function () {
        var dy = window.scrollY - ultimoY; ultimoY = window.scrollY;
        if (!visible || !dy) return;
        rect = cv.getBoundingClientRect();
        var x = rect.left + rect.width * (.5 + .34 * Math.sin(t * .7)), y = rect.top + rect.height * (.62 + .1 * Math.cos(t * .5));
        marcar(x, y, Math.min(.35, Math.abs(dy) / 160));
        encima = 0;
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
