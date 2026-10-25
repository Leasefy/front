/* ════════════════════════════════════════════════════════════════════
   La corriente (Cadence 2 · PIX): el mismo campo de la landing, pintado
   celda por celda en WebGL. Sin reacción al mouse (Nico, 23-10: nada de
   formas alrededor del cursor). Quieta con movimiento reducido; sólo corre
   cuando se ve. El fondo sale del token --pix-fondo (claro u oscuro).
   ════════════════════════════════════════════════════════════════════ */
LF.corriente = (function () {
  var VERT = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  var FRAG = [
    "precision highp float;",
    "uniform vec2 res;uniform float t;uniform float celda;uniform vec3 fondo;uniform vec3 tinta;uniform vec3 tinta2;uniform float semilla;uniform float forma;uniform float fuerza;uniform float marco;uniform float cy;uniform float radio;",
    "float h(vec2 p){p=fract(p*vec2(443.897,441.423));p+=dot(p,p.yx+19.19);return fract((p.x+p.y)*p.x);}",
    "vec2 gr(vec2 p){float a=h(p+semilla)*6.2831853;return vec2(cos(a),sin(a));}",
    "float ru(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*f*(f*(f*6.-15.)+10.);return mix(mix(dot(gr(i),f),dot(gr(i+vec2(1,0)),f-vec2(1,0)),u.x),mix(dot(gr(i+vec2(0,1)),f-vec2(0,1)),dot(gr(i+vec2(1,1)),f-vec2(1,1)),u.x),u.y);}",
    "float fbm(vec2 p){float s=0.,a=.5;mat2 m=mat2(.8,.6,-.6,.8);for(int i=0;i<5;i++){s+=a*ru(p);p=m*p*2.02+vec2(3.1,1.7);a*=.5;}return s;}",
    "void main(){",
    " vec2 c=floor(gl_FragCoord.xy/celda);vec2 x=c*celda/res.x*3.1;float yN=1.-gl_FragCoord.y/res.y;float tt=t*.022;",
    " vec2 q=vec2(fbm(x+vec2(0.,tt)),fbm(x+vec2(5.2,1.3-tt)));",
    " vec2 r=vec2(fbm(x+2.4*q+vec2(1.7,9.2)+tt*.6),fbm(x+2.4*q+vec2(8.3,2.8)));",
    " float f=fbm(x+2.4*r)/.19;float I=smoothstep(.25,1.15,f);",
    " float vena=pow(max(0.,1.-abs(f-.1)*2.4),5.);I=max(I,vena*.55);",
    " float vac=smoothstep(-.7,.6,fbm(x*.4+vec2(17.3,3.9))/.19);I*=.2+.8*vac;",
    " if(forma>.5){I=min(1.,I*(.45+.95*smoothstep(.35,1.,yN))+.32*smoothstep(.7,1.04,yN)*smoothstep(-1.2,1.2,f));}",
    " float ruido=.004+.03*smoothstep(-.6,.5,f);",
    " if(marco>.5){vec2 uv=vec2(gl_FragCoord.x/res.x-.5,1.-gl_FragCoord.y/res.y-cy);uv.x*=min(res.x/res.y,1.7)*.55;uv/=radio;float rr=length(uv);float m=smoothstep(.2,.62,rr);I=smoothstep(.04,.62,I)*m;ruido*=.25*m;}",
    " float pr=min(.92,(ruido+.86*pow(I,.8))*fuerza);",
    " float k=h(c+semilla*.13);vec3 col=fondo;",
    " if(k<pr){col=mix(tinta,tinta2,step(.62,h(c.yx+3.7)));}",
    " gl_FragColor=vec4(col,1.);",
    "}"
  ].join("\n");
  var quieto = !LF.MOV, lista = [], corriendo = false;
  function fondo() {
    var v = getComputedStyle(document.documentElement).getPropertyValue("--pix-fondo").split(",").map(function (n) { return parseFloat(n) / 255; });
    return v.length === 3 && !isNaN(v[0]) ? v : [251 / 255, 250 / 255, 248 / 255];
  }
  function montar(cv) {
    var gl = cv.getContext("webgl", { antialias: false, alpha: false });
    if (!gl) { cv.style.display = "none"; return null; }
    var sh = function (tipo, src) { var x = gl.createShader(tipo); gl.shaderSource(x, src); gl.compileShader(x); return x; };
    var pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { cv.style.display = "none"; return null; }
    gl.useProgram(pr);
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var u = function (k) { return gl.getUniformLocation(pr, k); };
    gl.uniform3fv(u("fondo"), fondo()); gl.uniform3fv(u("tinta"), [26 / 255, 64 / 255, 1]); gl.uniform3fv(u("tinta2"), [96 / 255, 122 / 255, 1]);
    gl.uniform1f(u("semilla"), +(cv.dataset.semilla || 1)); gl.uniform1f(u("forma"), cv.dataset.forma === "horizonte" ? 1 : 0); gl.uniform1f(u("marco"), cv.dataset.marco != null ? 1 : 0); gl.uniform1f(u("cy"), +(cv.dataset.claro || 0.5)); gl.uniform1f(u("radio"), +(cv.dataset.radio || 1));
    var o = { cv: cv, gl: gl, u: u, visible: false, t0: performance.now() - Math.random() * 20000, fuerza: +(cv.dataset.fuerza || 1), velocidad: +(cv.dataset.velocidad || 1) };
    o.pintar = function (ahora) {
      var dpr = Math.min(window.devicePixelRatio || 1, 2), w = Math.max(2, Math.round(cv.clientWidth * dpr)), hh = Math.max(2, Math.round(cv.clientHeight * dpr));
      if (cv.width !== w || cv.height !== hh) { cv.width = w; cv.height = hh; }
      gl.viewport(0, 0, w, hh); gl.uniform2f(u("res"), w, hh); gl.uniform1f(u("celda"), Math.max(2, Math.round((+(cv.dataset.celda || 3)) * dpr)));
      gl.uniform1f(u("fuerza"), o.fuerza);
      gl.uniform1f(u("t"), quieto ? 40 : 40 + (ahora - o.t0) / 1000 * o.velocidad);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    o.io = new IntersectionObserver(function (e) { o.visible = e[0].isIntersecting; if (o.visible) arrancar(); }, { rootMargin: "80px" });
    o.io.observe(cv);
    return o;
  }
  function cuadro(ahora) {
    var alguno = false;
    lista.forEach(function (o) { if (o.visible) { alguno = true; o.pintar(ahora); } });
    if (alguno && !quieto) requestAnimationFrame(cuadro); else corriendo = false;
  }
  function arrancar() {
    if (quieto) { lista.forEach(function (o) { o.pintar(performance.now()); }); return; }
    if (corriendo) return; corriendo = true; requestAnimationFrame(cuadro);
  }
  function montarEn(scope) {
    LF.$$("canvas[data-corriente]", scope).forEach(function (cv) { if (cv._corriente) return; var o = montar(cv); if (o) { cv._corriente = o; lista.push(o); } });
    if (quieto) setTimeout(arrancar, 60);
  }
  /* las corrientes de la vista anterior sueltan su contexto de WebGL */
  function podar() {
    lista = lista.filter(function (o) {
      if (document.body.contains(o.cv)) return true;
      o.io.disconnect();
      var ext = o.gl.getExtension("WEBGL_lose_context"); if (ext) ext.loseContext();
      return false;
    });
  }
  function tema() {
    var f = fondo();
    lista.forEach(function (o) { o.gl.uniform3fv(o.u("fondo"), f); o.pintar(performance.now()); });
  }
  window.addEventListener("resize", function () { if (quieto) arrancar(); });
  if (window.matchMedia) window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { setTimeout(tema, 30); });
  new MutationObserver(function () { setTimeout(tema, 30); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return { montarEn: montarEn, podar: podar, tema: tema };
})();
