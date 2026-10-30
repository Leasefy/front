/* ════════════════════════════════════════════════════════════════════
   Los fondos sin puntos en las internas (Nico 30-10-2026: «creo que hay
   internas también en la landing que tienen cosas de dots»): los mismos
   lienzos que eligió para el home el 29-10 (ver 09-campos.js), con el mismo
   sombreador, en vez de la corriente de píxeles:

   · <canvas data-campo="ola">: «La ola en papel», la tinta de voltaje que sube
     desde abajo; con data-interactivo, por donde pasa el cursor nacen ondas
     finas (la cuarta vuelta del home), la marea sube apenas del lado del
     cursor y en el celular el toque deja una onda y el scroll la empuja;
   · <canvas data-campo="curvas">: «Curvas de nivel», para la medianoche.

   LF.campos.montarEn(alcance) arma los lienzos de una vista y LF.campos.podar()
   suelta los que ya no están en la página (productos cambia de vista sin
   recargar). Cada lienzo corre sólo cuando se ve, va a menor resolución, con
   «reducir movimiento» queda un cuadro quieto y sin WebGL no se pinta nada.

   El mismo archivo en las dos familias de internas (productos/js/03-campos.js y
   para/js/02-campos.js): cada familia carga sólo sus scripts. Una prueba exige
   que sean idénticos; si cambias uno, copia el otro.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  var LF = window.LF = window.LF || {};
  var reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ONDAS = 6;

  var RUIDO = [
    "float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}",
    "float n(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);}",
    "float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}"
  ].join("\n");

  var VERT = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";

  /* la ola en papel, tal cual la del héroe del home */
  var OLA = [
    "precision highp float;",
    "uniform vec2 r; uniform float t; uniform vec2 m; uniform float fl; uniform float lado; uniform float pv; uniform float sube;",
    "uniform vec4 o[" + ONDAS + "];",
    RUIDO,
    "void main(){",
    "  vec2 uv=gl_FragCoord.xy/r; vec2 p=uv; p.x*=r.x/r.y; float tt=fl*.04;",
    "  vec2 ond=vec2(0.); float brillo=0.;",
    "  for(int i=0;i<" + ONDAS + ";i++){",
    "    vec2 d=p-o[i].xy; float rr=length(d)+1e-4; float fr=o[i].z*.32;",
    "    float banda=exp(-pow((rr-fr)*6.,2.))*o[i].w*exp(-o[i].z*1.35)*smoothstep(0.,.1,o[i].z);",
    "    float w=sin((rr-fr)*38.)*banda; ond+=d/rr*w; brillo+=w;",
    "  }",
    "  vec2 pf=p+m*.03+ond*.007; vec2 pc=p+m*.1+vec2(0.,sube*.14)+ond*.02;",
    "  vec2 q=vec2(fbm(pf*1.1+tt),fbm(pf*1.1-tt+5.2));",
    "  vec2 w=vec2(fbm(pc*1.5+2.*q+vec2(1.7,9.2)+tt*1.3),fbm(pc*1.5+2.*q+vec2(8.3,2.8)-tt));",
    "  float f=fbm(pc*1.3+2.2*w);",
    "  float onda=sin((pc.y*2.4+f*3.6+w.x*1.8-pc.x*.6)*3.14159);",
    "  float cinta=smoothstep(.15,1.,onda)*smoothstep(.05,.85,f);",
    "  vec3 papel=vec3(.984,.980,.973); vec3 bruma=vec3(.87,.895,1.); vec3 volt=vec3(.102,.251,1.); vec3 noche=vec3(.086,.125,.361);",
    "  float dx=(uv.x-lado)*1.8;",
    "  float marea=.08*pv*exp(-dx*dx)*smoothstep(.72,.18,uv.y);",
    "  float zona=smoothstep(.92,.04,uv.y-marea);",
    "  vec3 col=mix(papel,bruma,smoothstep(.3,.9,f)*zona*.75);",
    "  col=mix(col,volt,cinta*.82*zona);",
    "  col=mix(col,noche,pow(cinta,3.)*.38*zona*smoothstep(.55,0.,uv.y));",
    "  float tinta=max(cinta,smoothstep(.3,.9,f)*.55)*zona;",
    "  col+=brillo*(.003+.07*tinta);",
    "  col+=(h(gl_FragCoord.xy*.73+fract(t)*91.)-.5)*.035*zona;",
    "  gl_FragColor=vec4(col,1.);",
    "}"
  ].join("\n");

  /* las curvas de nivel, tal cual las del bloque oscuro de los planes del home */
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

  var TIPOS = {
    ola: { frag: OLA, fijos: {} },
    curvas: { frag: CURVAS, fijos: { fondo: [0.027, 0.031, 0.047], linea: [0.24, 0.36, 1.0], luz: [0.62, 0.69, 1.0], densidad: 16, grano: 0.03 } }
  };

  /* Un lienzo WebGL de un cuadro, con su tiempo y el mouse (el Campo de 09-campos.js); devuelve cómo apagarlo. */
  function Campo(cv, frag, fijos, op) {
    var gl = null;
    try { gl = cv.getContext("webgl", { antialias: false, premultipliedAlpha: false, powerPreference: "low-power" }); } catch (e) { gl = null; }
    var sinGl = function () { cv.style.display = "none"; return null; };
    if (!gl) return sinGl();
    gl.getExtension("OES_standard_derivatives");
    var sh = function (tipo, src) { var s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
    var vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, frag);
    if (!vs || !fs) return sinGl();
    var pr = gl.createProgram();
    gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return sinGl();
    gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var at = gl.getAttribLocation(pr, "a"); gl.enableVertexAttribArray(at); gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
    var U = function (k) { return gl.getUniformLocation(pr, k); };
    Object.keys(fijos).forEach(function (k) { var v = fijos[k]; if (v.length === 3) gl.uniform3f(U(k), v[0], v[1], v[2]); else gl.uniform1f(U(k), v); });
    var ur = U("r"), ut = U("t"), um = U("m"), ufl = U("fl"), ulado = U("lado"), upv = U("pv"), usube = U("sube"), uo = U("o");
    var ondas = new Float32Array(ONDAS * 4), kOnda = 0, uOx = -9, uOy = -9, uOt = -9;
    for (var q = 0; q < ONDAS; q++) ondas[q * 4 + 2] = 9;
    var t = 20, visible = false, corre = false, prev = 0, cuadroId = 0, rect = cv.getBoundingClientRect();
    var mx = 0, my = 0, fx = 0, fy = 0, fl = t, impulso = 0, empuje = 0;
    var ladoObj = .5, lado = .5, encima = 0, pv = 0, subeObj = 0, sube = 0, lx = -1, ly = -1;
    var soltarOnda = function (cx, cy, fuerza) {
      if (!rect.width || !rect.height) return;
      var x = (cx - rect.left) / rect.width, y = (cy - rect.top) / rect.height;
      if (x < 0 || x > 1 || y < 0 || y > 1) return;
      var px = x * rect.width / rect.height, py = 1 - y;
      /* una onda cada tanto camino o cada tanto tiempo: un rastro de anillos, nunca una mancha */
      if (Math.hypot(px - uOx, py - uOy) < .085 && t - uOt < .45) return;
      uOx = px; uOy = py; uOt = t;
      ondas[kOnda * 4] = px; ondas[kOnda * 4 + 1] = py; ondas[kOnda * 4 + 2] = 0; ondas[kOnda * 4 + 3] = fuerza;
      kOnda = (kOnda + 1) % ONDAS;
    };
    var medir = function () {
      rect = cv.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      cv.width = Math.max(2, Math.round(rect.width * .6 * dpr)); cv.height = Math.max(2, Math.round(rect.height * .6 * dpr));
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
      pintar(); cuadroId = requestAnimationFrame(cuadro);
    };
    medir(); pintar();
    /* sólo el ancho rearma: la barra del navegador del celular cambia el alto y haría titilar el lienzo */
    var anchoAntes = rect.width, tr;
    var ro = window.ResizeObserver ? new ResizeObserver(function () {
      clearTimeout(tr);
      tr = setTimeout(function () { var w = cv.getBoundingClientRect().width; if (Math.abs(w - anchoAntes) < 1 && cv.height > 2) return; anchoAntes = w; medir(); pintar(); }, 120);
    }) : null;
    if (ro) ro.observe(cv);
    var oyentes = [];
    var oir = function (blanco, ev, fn, opc) { blanco.addEventListener(ev, fn, opc); oyentes.push([blanco, ev, fn]); };
    var apagar = function () {
      visible = false; cancelAnimationFrame(cuadroId); clearTimeout(tr);
      if (ro) ro.disconnect(); if (io) io.disconnect();
      oyentes.forEach(function (o) { o[0].removeEventListener(o[1], o[2]); });
      var ext = gl.getExtension("WEBGL_lose_context"); if (ext) ext.loseContext();
    };
    var io = null;
    if (reducido) return apagar;
    oir(window, "pointermove", function (e) {
      mx = e.clientX / window.innerWidth - .5; my = .5 - e.clientY / window.innerHeight;
      if (!op.interactivo || !visible || e.pointerType === "touch") return;
      rect = cv.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width, y = (e.clientY - rect.top) / rect.height;
      encima = x >= 0 && x <= 1 && y >= 0 && y <= 1 ? 1 : 0;
      if (encima) ladoObj = x;
      var paso = lx >= 0 ? Math.hypot(e.clientX - lx, e.clientY - ly) / window.innerWidth : 0;
      if (lx >= 0) impulso = Math.min(1, impulso + paso * 2.2);
      lx = e.clientX; ly = e.clientY;
      if (encima) soltarOnda(e.clientX, e.clientY, Math.min(1, .45 + paso * 14));
    }, { passive: true });
    if (op.interactivo) {
      oir(document.documentElement, "pointerleave", function () { encima = 0; lx = -1; });
      /* celular: el toque deja una onda */
      oir(window, "touchstart", function (e) {
        if (!visible || !e.touches || !e.touches[0]) return;
        rect = cv.getBoundingClientRect(); uOt = -9; soltarOnda(e.touches[0].clientX, e.touches[0].clientY, .8);
      }, { passive: true });
      /* celular y scroll: la tinta sube con lo que se bajó el héroe y la corriente se acelera un poco */
      var ultimoY = window.scrollY;
      oir(window, "scroll", function () {
        var dy = window.scrollY - ultimoY; ultimoY = window.scrollY;
        if (!visible) return;
        rect = cv.getBoundingClientRect();
        subeObj = Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height)));
        impulso = Math.min(1, impulso + Math.abs(dy) / 900);
      }, { passive: true });
    }
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (visible) { rect = cv.getBoundingClientRect(); if (!corre) { corre = true; prev = performance.now(); cuadroId = requestAnimationFrame(cuadro); } }
      });
      io.observe(cv);
    } else { visible = true; corre = true; cuadroId = requestAnimationFrame(cuadro); }
    return apagar;
  }

  var lista = [];
  function montarEn(alcance) {
    Array.prototype.slice.call((alcance || document).querySelectorAll("canvas[data-campo]")).forEach(function (cv) {
      if (cv._campo) return;
      var tipo = TIPOS[cv.getAttribute("data-campo")] || TIPOS.ola;
      var apagar = Campo(cv, tipo.frag, tipo.fijos, { interactivo: cv.hasAttribute("data-interactivo") });
      cv._campo = true;
      if (apagar) lista.push({ cv: cv, apagar: apagar });
    });
  }
  /* los lienzos de la vista anterior sueltan sus oyentes y su contexto de WebGL */
  function podar() {
    lista = lista.filter(function (o) {
      if (document.body.contains(o.cv)) return true;
      o.apagar();
      return false;
    });
  }
  LF.campos = { montarEn: montarEn, podar: podar };
})();
