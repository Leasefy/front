/* ════════════════════════════════════════════════════════════════════
   La corriente (Cadence 2 · PIX): píxeles de voltaje que fluyen despacio,
   como en la referencia de Atlantic. Un campo de ruido con dominio
   deformado, pintado celda por celda en WebGL. Quieto con movimiento
   reducido; sólo corre cuando se ve.
   ════════════════════════════════════════════════════════════════════ */
LF.corriente = (function () {
  var FONDOS = {
    papel: { fondo: [251, 250, 248], t1: [26, 64, 255], t2: [96, 122, 255] },
    negro: { fondo: [7, 8, 12], t1: [26, 64, 255], t2: [92, 118, 255] },
    arena: { fondo: [243, 241, 237], t1: [26, 64, 255], t2: [96, 122, 255] }
  };
  var VERT = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  var FRAG = [
    "precision highp float;",
    "uniform vec2 res;uniform float t;uniform float celda;uniform vec3 fondo;uniform vec3 tinta;uniform vec3 tinta2;uniform float semilla;uniform float forma;uniform float fuerza;uniform sampler2D campo;uniform float conCampo;uniform float marco;",
    "float h(vec2 p){p=fract(p*vec2(443.897,441.423));p+=dot(p,p.yx+19.19);return fract((p.x+p.y)*p.x);}",
    "vec2 gr(vec2 p){float a=h(p+semilla)*6.2831853;return vec2(cos(a),sin(a));}",
    "float ru(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*f*(f*(f*6.-15.)+10.);return mix(mix(dot(gr(i),f),dot(gr(i+vec2(1,0)),f-vec2(1,0)),u.x),mix(dot(gr(i+vec2(0,1)),f-vec2(0,1)),dot(gr(i+vec2(1,1)),f-vec2(1,1)),u.x),u.y);}",
    "float fbm(vec2 p){float s=0.,a=.5;mat2 m=mat2(.8,.6,-.6,.8);for(int i=0;i<5;i++){s+=a*ru(p);p=m*p*2.02+vec2(3.1,1.7);a*=.5;}return s;}",
    "void main(){",
    /* la estela del mouse: corre el dominio del ruido en la dirección en que pasó el mouse (nunca en círculo) */
    " vec2 c=floor(gl_FragCoord.xy/celda);vec2 x=c*celda/res.x*3.1;float yN=1.-gl_FragCoord.y/res.y;float tt=t*.022;",
    " if(conCampo>.5){vec2 d=texture2D(campo,(c+.5)*celda/res).rg-.5;x-=d*.434;}",
    " vec2 q=vec2(fbm(x+vec2(0.,tt)),fbm(x+vec2(5.2,1.3-tt)));",
    " vec2 r=vec2(fbm(x+2.4*q+vec2(1.7,9.2)+tt*.6),fbm(x+2.4*q+vec2(8.3,2.8)));",
    " float f=fbm(x+2.4*r)/.19;float I=smoothstep(.25,1.15,f);",
    " float vena=pow(max(0.,1.-abs(f-.1)*2.4),5.);I=max(I,vena*.55);",
    " float vac=smoothstep(-.7,.6,fbm(x*.4+vec2(17.3,3.9))/.19);I*=.2+.8*vac;",
    " if(forma>.5){I=min(1.,I*(.45+.95*smoothstep(.35,1.,yN))+.32*smoothstep(.7,1.04,yN)*smoothstep(-1.2,1.2,f));}",
    " float ruido=.004+.03*smoothstep(-.6,.5,f);",
    " if(marco>.5){vec2 uv=gl_FragCoord.xy/res-.5;uv.x*=res.x/res.y*.55;float rr=length(uv);float m=smoothstep(.2,.62,rr);I=smoothstep(.04,.62,I)*m;ruido*=.25*m;}",
    " float pr=min(.92,(ruido+.86*pow(I,.8))*fuerza);",
    " float k=h(c+semilla*.13);vec3 col=fondo;",
    " if(k<pr){col=mix(tinta,tinta2,step(.62,h(c.yx+3.7)));}",
    " gl_FragColor=vec4(col,1.);",
    "}"
  ].join("\n");
  var quietoGlobal = !LF.MOV;
  /* La estela del mouse: una grilla chiquita de desplazamientos (64 × ~40) que el mouse pinta con su
     velocidad; cada cuadro se difumina con sus vecinas y se apaga sola. Viaja a la GPU como textura. */
  function estela(gl, u, cv) {
    var GW = 64, GH = 0, AMP = .07, GANANCIA = .45, vx, vy, ax, ay, buf, viva = false, raton = null, antes = null;
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    function subir() {
      for (var i = 0, j = 0; i < vx.length; i++, j += 4) {
        buf[j] = Math.max(0, Math.min(255, Math.round(127.5 + vx[i] / AMP * 127.5)));
        buf[j + 1] = Math.max(0, Math.min(255, Math.round(127.5 + vy[i] / AMP * 127.5)));
        buf[j + 2] = 0; buf[j + 3] = 255;
      }
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, GW, GH, 0, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    }
    function medir() {
      var gh = Math.max(12, Math.min(64, Math.round(GW * cv.clientHeight / Math.max(1, cv.clientWidth))));
      if (gh === GH) return;
      GH = gh; var n = GW * GH;
      vx = new Float32Array(n); vy = new Float32Array(n); ax = new Float32Array(n); ay = new Float32Array(n); buf = new Uint8Array(n * 4);
      viva = false; subir();
    }
    medir();
    gl.uniform1i(u("campo"), 0); gl.uniform1f(u("conCampo"), 1);
    function pincel(gx, gy, px, py) {
      var s = GW * .09, s2 = 2 * s * s, R = Math.ceil(s * 2.6);
      var i0 = Math.max(0, Math.floor(gx - R)), i1 = Math.min(GW - 1, Math.ceil(gx + R)), j0 = Math.max(0, Math.floor(gy - R)), j1 = Math.min(GH - 1, Math.ceil(gy + R));
      for (var j = j0; j <= j1; j++) for (var i = i0; i <= i1; i++) {
        var dx = i + .5 - gx, dy = j + .5 - gy, w = Math.exp(-(dx * dx + dy * dy) / s2);
        if (w > .01) { var k = j * GW + i; vx[k] += px * w; vy[k] += py * w; }
      }
    }
    var zona = cv.closest(".hero-pega") || cv.parentElement;
    zona.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      var r = cv.getBoundingClientRect(); raton = { x: e.clientX - r.left, y: e.clientY - r.top, w: Math.max(1, r.width), h: Math.max(1, r.height) };
    });
    zona.addEventListener("pointerleave", function () { raton = null; antes = null; });
    return function (dt) {
      medir();
      if (raton) {
        if (antes) {
          var dx = raton.x - antes.x, dy = raton.y - antes.y, dist = Math.hypot(dx, dy);
          if (dist > .3 && dist < 420) {
            var n = Math.max(1, Math.min(16, Math.ceil(dist / 12))), g = GANANCIA / n;
            for (var s = 1; s <= n; s++) pincel((antes.x + dx * s / n) / raton.w * GW, (1 - (antes.y + dy * s / n) / raton.h) * GH, dx / raton.w * g, -dy / raton.w * g);
            viva = true;
          }
        }
        antes = { x: raton.x, y: raton.y };
      }
      if (!viva) return;
      /* se difumina con las vecinas (la estela se ensancha) y se apaga en ~medio segundo */
      var f = Math.pow(.97, dt * 60), D = Math.min(.5, .22 * dt * 60), mx = 0;
      for (var j = 0; j < GH; j++) for (var i = 0; i < GW; i++) {
        var k = j * GW + i, l = i > 0 ? k - 1 : k, r = i < GW - 1 ? k + 1 : k, b = j > 0 ? k - GW : k, a = j < GH - 1 ? k + GW : k;
        var nx = (vx[k] * (1 - D) + D * .25 * (vx[l] + vx[r] + vx[b] + vx[a])) * f, ny = (vy[k] * (1 - D) + D * .25 * (vy[l] + vy[r] + vy[b] + vy[a])) * f;
        var m = Math.hypot(nx, ny); if (m > AMP) { nx *= AMP / m; ny *= AMP / m; m = AMP; }
        ax[k] = nx; ay[k] = ny; if (m > mx) mx = m;
      }
      var t1 = vx; vx = ax; ax = t1; var t2 = vy; vy = ay; ay = t2;
      if (mx < 2e-4) { vx.fill(0); vy.fill(0); viva = false; }
      subir();
    };
  }
  function montar(cv) {
    var F = FONDOS[cv.dataset.corriente] || FONDOS.papel;
    var gl = cv.getContext("webgl", { antialias: false, alpha: false });
    if (!gl) { cv.style.display = "none"; return null; }
    var sh = function (tipo, src) { var x = gl.createShader(tipo); gl.shaderSource(x, src); gl.compileShader(x); return x; };
    var pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { cv.style.display = "none"; return null; }
    gl.useProgram(pr);
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var u = function (k) { return gl.getUniformLocation(pr, k); };
    var c3 = function (a) { return a.map(function (v) { return v / 255; }); };
    gl.uniform3fv(u("fondo"), c3(F.fondo)); gl.uniform3fv(u("tinta"), c3(F.t1)); gl.uniform3fv(u("tinta2"), c3(F.t2));
    gl.uniform1f(u("semilla"), +(cv.dataset.semilla || 1)); gl.uniform1f(u("forma"), cv.dataset.forma === "horizonte" ? 1 : 0); gl.uniform1f(u("marco"), cv.dataset.marco != null ? 1 : 0);
    var o = { cv: cv, gl: gl, u: u, visible: false, t: 40 + Math.random() * 20, antes: 0, fuerza: +(cv.dataset.fuerza || 1), velocidad: +(cv.dataset.velocidad || 1), estela: null };
    /* Nico 23-10: la reacción al mouse como la de antes (los puntos se mueven por donde pasa el mouse), pero
       SIN la flor: antes se empujaba en círculo alrededor del cursor y eso armaba pétalos. Ahora el mouse
       arrastra los puntos en la dirección en que se mueve, como un dedo que pasa por arena: deja una estela
       que se difumina y vuelve sola a su sitio. Con el mouse quieto no se dibuja nada alrededor. */
    gl.uniform1f(u("conCampo"), 0);
    if (cv.dataset.raton != null && !quietoGlobal && window.matchMedia("(hover:hover)").matches) o.estela = estela(gl, u, cv);
    /* Nico 23-10 («el héroe anda lentico»): el dibujo es de celdas de 3–4 px y el shader las calculaba píxel por
       píxel (9 a 36 veces el mismo cálculo por celda). Ahora el lienzo tiene UNA muestra por celda y el navegador lo
       agranda sin suavizar (image-rendering: pixelated): se ve igual y la GPU hace una fracción del trabajo. */
    o.pintar = function (ahora) {
      var dpr = Math.min(window.devicePixelRatio || 1, 2), celda = Math.max(2, Math.round((+(cv.dataset.celda || 3)) * dpr));
      var w = Math.max(2, Math.ceil(cv.clientWidth * dpr / celda)), hh = Math.max(2, Math.ceil(cv.clientHeight * dpr / celda));
      if (cv.width !== w || cv.height !== hh) { cv.width = w; cv.height = hh; }
      gl.viewport(0, 0, w, hh); gl.uniform2f(u("res"), w, hh); gl.uniform1f(u("celda"), 1);
      gl.uniform1f(u("fuerza"), o.fuerza);
      /* lento y parejo a 60 o a 120 Hz: el paso se calcula con el tiempo real del cuadro */
      var dt = o.antes ? Math.min(.05, Math.max(0, (ahora - o.antes) / 1000)) : .016; o.antes = ahora;
      o.t += dt * o.velocidad;
      if (o.estela) o.estela(dt);
      gl.uniform1f(u("t"), quietoGlobal ? 40 : o.t);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    new IntersectionObserver(function (e) { o.visible = e[0].isIntersecting; if (o.visible) arrancar(); }, { rootMargin: "80px" }).observe(cv);
    return o;
  }
  var lista = [], corriendo = false;
  function cuadro(ahora) {
    var alguno = false;
    lista.forEach(function (o) { if (o.visible) { alguno = true; o.pintar(ahora); } });
    if (alguno && !quietoGlobal) requestAnimationFrame(cuadro); else corriendo = false;
  }
  function arrancar() {
    if (quietoGlobal) { lista.forEach(function (o) { o.pintar(performance.now()); }); return; }
    if (corriendo) return; corriendo = true; requestAnimationFrame(cuadro);
  }
  function iniciar() {
    LF.$$("canvas[data-corriente]").forEach(function (cv) { var o = montar(cv); if (o) { cv._corriente = o; lista.push(o); } });
    window.addEventListener("resize", function () { if (quietoGlobal) arrancar(); });
    if (quietoGlobal) setTimeout(arrancar, 60);
  }
  return { iniciar: iniciar };
})();
