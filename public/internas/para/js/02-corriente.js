/* ════════════════════════════════════════════════════════════════════
   La corriente (Cadence 2 · PIX), la misma de la landing: píxeles de voltaje
   que fluyen despacio. El mouse corre TODO el campo un poco (deriva lenta);
   nada se deforma alrededor del cursor. Quieta con movimiento reducido;
   sólo corre cuando se ve. El fondo sale de la paleta (claro u oscuro).
   ════════════════════════════════════════════════════════════════════ */
LF.corriente = (function () {
  var TINTAS = { papel: [[26, 64, 255], [96, 122, 255]], negro: [[26, 64, 255], [92, 118, 255]] };
  var FONDO = { papel: "--bg", negro: "--noche" };
  var VERT = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  var FRAG = [
    "precision highp float;",
    "uniform vec2 res;uniform float t;uniform float celda;uniform vec3 fondo;uniform vec3 tinta;uniform vec3 tinta2;uniform float semilla;uniform float forma;uniform float fuerza;uniform vec2 deriva;uniform float viveza;uniform float marco;",
    "float h(vec2 p){p=fract(p*vec2(443.897,441.423));p+=dot(p,p.yx+19.19);return fract((p.x+p.y)*p.x);}",
    "vec2 gr(vec2 p){float a=h(p+semilla)*6.2831853;return vec2(cos(a),sin(a));}",
    "float ru(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*f*(f*(f*6.-15.)+10.);return mix(mix(dot(gr(i),f),dot(gr(i+vec2(1,0)),f-vec2(1,0)),u.x),mix(dot(gr(i+vec2(0,1)),f-vec2(0,1)),dot(gr(i+vec2(1,1)),f-vec2(1,1)),u.x),u.y);}",
    "float fbm(vec2 p){float s=0.,a=.5;mat2 m=mat2(.8,.6,-.6,.8);for(int i=0;i<5;i++){s+=a*ru(p);p=m*p*2.02+vec2(3.1,1.7);a*=.5;}return s;}",
    "void main(){",
    " vec2 c=floor(gl_FragCoord.xy/celda);vec2 x=c*celda/res.x*3.1-deriva;float yN=1.-gl_FragCoord.y/res.y;float tt=t*.022;",
    " vec2 q=vec2(fbm(x+vec2(0.,tt)),fbm(x+vec2(5.2,1.3-tt)));",
    " vec2 r=vec2(fbm(x+2.4*q+vec2(1.7,9.2)+tt*.6),fbm(x+2.4*q+vec2(8.3,2.8)));",
    " float f=fbm(x+2.4*r)/.19;float I=smoothstep(.25,1.15,f);",
    " float vena=pow(max(0.,1.-abs(f-.1)*2.4),5.);I=max(I,vena*.55);",
    " float vac=smoothstep(-.7,.6,fbm(x*.4+vec2(17.3,3.9))/.19);I*=.2+.8*vac;",
    " if(forma>.5){I=min(1.,I*(.45+.95*smoothstep(.35,1.,yN))+.32*smoothstep(.7,1.04,yN)*smoothstep(-1.2,1.2,f));}",
    " float ruido=.004+.03*smoothstep(-.6,.5,f);",
    " if(marco>.5){vec2 uv=gl_FragCoord.xy/res-.5;uv.x*=res.x/res.y*.55;float rr=length(uv);float m=smoothstep(.2,.62,rr);I=smoothstep(.04,.62,I)*m;ruido*=.25*m;}",
    " float pr=min(.92,(ruido+.86*pow(I,.8))*fuerza*(1.+viveza*.07));",
    " float k=h(c+semilla*.13);vec3 col=fondo;",
    " if(k<pr){col=mix(tinta,tinta2,step(.62,h(c.yx+3.7)));}",
    " gl_FragColor=vec4(col,1.);",
    "}"
  ].join("\n");
  var quietoGlobal = !LF.MOV, lista = [], corriendo = false;
  function montar(cv) {
    var tipo = cv.dataset.corriente === "negro" ? "negro" : "papel", T = TINTAS[tipo];
    var gl = cv.getContext("webgl", { antialias: false, alpha: false });
    if (!gl) { cv.style.display = "none"; return null; }
    var sh = function (k, src) { var x = gl.createShader(k); gl.shaderSource(x, src); gl.compileShader(x); return x; };
    var pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { cv.style.display = "none"; return null; }
    gl.useProgram(pr);
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var u = function (k) { return gl.getUniformLocation(pr, k); };
    var c3 = function (a) { return a.map(function (v) { return v / 255; }); };
    gl.uniform3fv(u("tinta"), c3(T[0])); gl.uniform3fv(u("tinta2"), c3(T[1]));
    gl.uniform1f(u("semilla"), +(cv.dataset.semilla || 1)); gl.uniform1f(u("forma"), cv.dataset.forma === "horizonte" ? 1 : 0); gl.uniform1f(u("marco"), cv.dataset.marco != null ? 1 : 0);
    var o = { cv: cv, gl: gl, u: u, visible: false, t: 40 + Math.random() * 20, antes: 0, fuerza: +(cv.dataset.fuerza || 1), velocidad: +(cv.dataset.velocidad || 1), ox: 0, oy: 0, tox: 0, toy: 0, en: 0, ten: 0, px: null, py: null };
    o.fondo = function () { gl.useProgram(pr); gl.uniform3fv(u("fondo"), c3(LF.rgb(LF.token(FONDO[tipo])))); };
    o.fondo();
    /* el campo entero se corre un poco hacia el mouse (parallax lento) y se aviva apenas mientras se mueve */
    if (cv.dataset.raton != null && window.matchMedia("(hover:hover)").matches) {
      var zona = cv.closest(".heroe") || cv.parentElement, DERIVA = .34;
      zona.addEventListener("pointermove", function (e) {
        if (e.pointerType === "touch") return;
        var r = cv.getBoundingClientRect(), w = Math.max(1, r.width), mx = e.clientX - r.left, my = e.clientY - r.top;
        o.tox = (mx - r.width / 2) / w * DERIVA; o.toy = -(my - r.height / 2) / w * DERIVA;
        if (o.px !== null) o.ten = Math.min(1, o.ten + Math.hypot(mx - o.px, my - o.py) / 900);
        o.px = mx; o.py = my;
      });
      zona.addEventListener("pointerleave", function () { o.tox = 0; o.toy = 0; o.px = null; o.py = null; });
    }
    o.pintar = function (ahora) {
      var dpr = Math.min(window.devicePixelRatio || 1, 2), w = Math.max(2, Math.round(cv.clientWidth * dpr)), hh = Math.max(2, Math.round(cv.clientHeight * dpr));
      if (cv.width !== w || cv.height !== hh) { cv.width = w; cv.height = hh; }
      gl.viewport(0, 0, w, hh); gl.uniform2f(u("res"), w, hh); gl.uniform1f(u("celda"), Math.max(2, Math.round((+(cv.dataset.celda || 3)) * dpr)));
      gl.uniform1f(u("fuerza"), o.fuerza);
      var dt = o.antes ? Math.min(.05, Math.max(0, (ahora - o.antes) / 1000)) : .016; o.antes = ahora;
      var k = 1 - Math.pow(.972, dt * 60), ke = 1 - Math.pow(.96, dt * 60);
      o.ox += (o.tox - o.ox) * k; o.oy += (o.toy - o.oy) * k;
      o.ten *= Math.pow(.965, dt * 60); o.en += (o.ten - o.en) * ke;
      o.t += dt * o.velocidad * (1 + o.en * 1.2);
      gl.uniform2f(u("deriva"), o.ox, o.oy); gl.uniform1f(u("viveza"), o.en);
      gl.uniform1f(u("t"), quietoGlobal ? 40 : o.t);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    new IntersectionObserver(function (e) { o.visible = e[0].isIntersecting; if (o.visible) arrancar(); }, { rootMargin: "80px" }).observe(cv);
    return o;
  }
  function cuadro(ahora) {
    var alguno = false;
    lista.forEach(function (o) { if (o.visible) { alguno = true; o.pintar(ahora); } });
    if (alguno && !quietoGlobal) requestAnimationFrame(cuadro); else corriendo = false;
  }
  function arrancar() {
    if (quietoGlobal) { lista.forEach(function (o) { if (o.visible) o.pintar(performance.now()); }); return; }
    if (corriendo) return; corriendo = true; requestAnimationFrame(cuadro);
  }
  /* monta las corrientes de un bloque la primera vez que se muestra */
  function iniciar(cont) {
    LF.$$("canvas[data-corriente]", cont).forEach(function (cv) { if (cv._corriente) return; var o = montar(cv); if (o) { cv._corriente = o; lista.push(o); } });
    setTimeout(arrancar, 60);
  }
  function tema() { lista.forEach(function (o) { o.fondo(); }); arrancar(); }
  window.addEventListener("resize", function () { if (quietoGlobal) arrancar(); });
  return { iniciar: iniciar, tema: tema };
})();
