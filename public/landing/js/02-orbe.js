/* ════════════════════════════════════════════════════════════════════
   La orbe Nebulosa — el mismo shader de @leasefy/cadence (AgentOrb,
   look «nebula», con su grano), portado tal cual a WebGL 1.
   ════════════════════════════════════════════════════════════════════ */
LF.orbes = (function () {
  var TAU = Math.PI * 2, K = 2;
  var PAL = {
    aurora: { deep: "#0A1270", core: "#2348FF", light: "#A8C4FF", accent: "#8B5CFF", spark: "#22D3EE", glow: "#4565FF", team: ["#22D3EE", "#A47BFF", "#FF6B8B", "#FFB547"] },
    coral: { deep: "#5E0C2A", core: "#EE3F66", light: "#FFC2AE", accent: "#FF8A3D", glow: "#FF5A7A" },
    jade: { deep: "#033F35", core: "#0FAF7B", light: "#A8F3D4", accent: "#B4E84A", glow: "#19C98E" },
    marigold: { deep: "#5E2D00", core: "#EE9608", light: "#FFE7A3", accent: "#FB7185", glow: "#F9A825" },
    tangerine: { deep: "#5E2000", core: "#F5641C", light: "#FFCFA3", accent: "#FACC15", glow: "#FF7A2E" }
  };
  var ESTADOS = {
    idle: { flujo: .32, giro: .08, torsion: 0, nucleo: 1, latido: 0, saturacion: 1, opacidad: 1, halo: 1, respiracion: 1, ritmo: TAU / 5.6, onda: .7, deformacion: 1, orbita: .32 },
    thinking: { flujo: .62, giro: .95, torsion: 1.6, nucleo: 1.55, latido: 0, saturacion: 1, opacidad: 1, halo: 1.22, respiracion: .55, ritmo: TAU / 2.6, onda: .7, deformacion: 1.25, orbita: 1.1 },
    working: { flujo: .5, giro: .22, torsion: .3, nucleo: 1.3, latido: 1, saturacion: 1, opacidad: 1, halo: 1.15, respiracion: .2, ritmo: TAU / 4, onda: .78, deformacion: 1.1, orbita: .7 }
  };
  var CLAVES = Object.keys(ESTADOS.idle);
  function hash32(t) { var h = 0x811c9dc5; for (var i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; }
  function lin(hex) { var n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (v) { return Math.pow(v / 255, 2.2); }); }
  function colores(p) {
    var spark = p.spark || p.accent, eq = p.team && p.team.length ? p.team : [p.accent, spark, p.light, p.glow];
    var l = [p.deep, p.core, p.light, p.accent, p.glow, spark];
    for (var i = 0; i < 4; i++) l.push(eq[i % eq.length]);
    var out = new Float32Array(30); l.forEach(function (h, i) { out.set(lin(h), i * 3); }); return out;
  }
  var VERT = "attribute vec2 a_pos;varying vec2 v_uv;void main(){v_uv=a_pos;gl_Position=vec4(a_pos,0.0,1.0);}";
  var FRAG = [
    "#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif",
    "varying vec2 v_uv;uniform vec4 u_a;uniform vec4 u_b;uniform vec4 u_c;uniform vec4 u_d;uniform vec4 u_e;uniform vec3 u_col[10];",
    "#define FLOW u_a.x\n#define SWIRL u_a.y\n#define BREATH u_a.z\n#define WAVE u_a.w\n#define PULSE u_b.x\n#define CORE u_b.y\n#define SAT u_b.z\n#define FADE u_b.w\n#define HALO u_c.x\n#define MORPH u_c.y\n#define SETTLE u_c.z\n#define DARK u_c.w\n#define SEED u_d.x\n#define ORQ u_d.y\n#define DETAIL u_d.z\n#define TWIST u_d.w\n#define ORBIT u_e.x\n#define AA u_e.y\n#define KX u_e.z",
    "float gF;float fF;",
    "vec3 permute(vec3 x){return mod(((x*34.0)+1.0)*x,289.0);}",
    "float snoise(vec2 v){const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod(i,289.0);vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);m=m*m;m=m*m;vec3 x=2.0*fract(p*C.www)-1.0;vec3 h=abs(x)-0.5;vec3 ox=floor(x+0.5);vec3 a0=x-ox;m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;return 130.0*dot(m,g);}",
    "vec2 rot(vec2 p,float a){float c=cos(a);float s=sin(a);return vec2(c*p.x-s*p.y,s*p.x+c*p.y);}",
    "float luma(vec3 c){return dot(c,vec3(0.2126,0.7152,0.0722));}",
    "vec3 teamColor(float h){h=mod(h,4.0);vec3 c=mix(u_col[6],u_col[7],smoothstep(0.0,1.0,clamp(h,0.0,1.0)));c=mix(c,u_col[8],smoothstep(0.0,1.0,clamp(h-1.0,0.0,1.0)));c=mix(c,u_col[9],smoothstep(0.0,1.0,clamp(h-2.0,0.0,1.0)));c=mix(c,u_col[6],smoothstep(0.0,1.0,clamp(h-3.0,0.0,1.0)));return c;}",
    "vec3 accentAt(float g,float f){if(ORQ<0.01)return u_col[3];vec3 t=teamColor(g*0.85+f*0.5+FLOW*0.04+0.5);return mix(u_col[3],t,ORQ*0.62);}",
    "vec3 motes(vec2 q,float count){float acc=0.0;float size=mix(0.16,0.055,DETAIL);for(int i=0;i<12;i++){float fi=float(i);if(fi>=count)break;float h1=fract(sin(fi*12.9898+SEED*0.731)*43758.5453);float h2=fract(sin(fi*78.233+SEED*1.37)*24634.6345);float rad=0.2+0.5*h1;float sp=(0.45+0.55*h2)*(h2>0.5?1.0:-1.0);float ang=ORBIT*sp+fi*2.39996;vec2 c=rot(rad*vec2(cos(ang),sin(ang)*(0.45+0.4*h1)),h2*3.14159);float depth=0.35+0.65*(0.5+0.5*sin(ang));float tw=0.65+0.35*sin(FLOW*2.6+fi*1.7);vec2 dd=q-c;acc+=exp(-dot(dd,dd)/(size*size))*depth*tw;}return acc*mix(u_col[2],vec3(1.0),0.55);}",
    "vec3 shoulder(vec3 c){vec3 k=vec3(0.8);vec3 over=max(c-k,0.0);return min(c,k)+(1.0-k)*(1.0-exp(-over/(1.0-k)));}",
    "#define EDGE_SOFT 0.0\n#define CORE_FALL 3.0\n#define CORE_GAIN 0.34\n#define RIM_POW 2.6\n#define RIM_GAIN 0.85\n#define HALO_GAIN 0.8\n#define MOTES_AGENT 6.0",
    "float fbm(vec2 p){float v=0.0;float a=0.55;float octs=2.0+floor(DETAIL+0.5);for(int i=0;i<3;i++){if(float(i)>=octs)break;v+=a*snoise(p);p=rot(p,0.9)*2.03+7.1;a*=0.45;}return v;}",
    "vec3 fluid(vec2 qb,float z){vec2 w=vec2(snoise(qb*0.55+vec2(0.0,FLOW*0.3)+SEED),snoise(qb*0.55+vec2(3.7,-FLOW*0.26)-SEED));float n=fbm(qb*0.8+w*1.1+vec2(FLOW*0.1,0.0));float g=fbm(qb*1.0-w*0.8+vec2(1.3,-FLOW*0.14));fF=n;gF=g;vec3 col=mix(u_col[0],u_col[1],0.3+0.7*z);col=mix(col,accentAt(g,n),smoothstep(0.0,0.6,g)*0.6);float fil=pow(1.0-abs(n),mix(5.0,9.0,DETAIL));col+=u_col[2]*fil*0.32;col=mix(col,u_col[1],(1.0-DARK)*0.2);return col;}",
    "void main(){vec2 p=v_uv*KX;float r=length(p);if(r>=KX){gl_FragColor=vec4(0.0);return;}vec2 dir=p/max(r,1e-4);float ph=fract(WAVE);float beat=sin(3.14159*clamp(ph/0.34,0.0,1.0));beat*=beat;",
    "float R=0.84*(1.0+0.024*BREATH+0.04*PULSE*beat+0.025*SETTLE);float e1=snoise(dir*0.85+vec2(FLOW*0.42+SEED,-FLOW*0.31));float e2=snoise(dir*1.9+vec2(-FLOW*0.55,FLOW*0.4+SEED*1.7));R*=1.0+MORPH*(0.019*e1+0.007*e2*DETAIL);float inside=1.0-smoothstep(R-AA-EDGE_SOFT,R+AA,r);",
    "vec2 q=p/R;float nr=min(length(q),1.0);float z=sqrt(max(1.0-nr*nr,0.0));vec2 qb=q/(0.58+0.42*z);qb=rot(qb,SWIRL+TWIST*(1.0-nr)*0.9+SEED);vec3 col=fluid(qb,z);",
    "vec2 cc=0.17*vec2(snoise(vec2(FLOW*0.21,SEED)),snoise(vec2(SEED+7.0,FLOW*0.21)));vec2 dq=q-cc;float core=exp(-dot(dq,dq)*CORE_FALL);float coreI=CORE*(1.0+0.55*PULSE*beat+0.7*SETTLE);col+=mix(u_col[2],vec3(1.0),mix(0.12,0.3,DARK))*core*CORE_GAIN*coreI*mix(0.72,1.0,DARK);",
    "float ringR=ph*1.3;float ring=exp(-pow((nr-ringR)/0.15,2.0))*(1.0-ph)*PULSE;col+=u_col[2]*ring*0.5;float nm=mix(MOTES_AGENT,9.0,ORQ);if(nm>0.5)col+=motes(q,nm)*(0.55+0.25*DARK);",
    "float fres=pow(1.0-z,RIM_POW);vec3 rimC=mix(u_col[4],u_col[2],0.45+0.3*gF);col=col*(1.0-0.3*fres)+rimC*fres*RIM_GAIN;",
    "float d=max(r-R,0.0);float hs=1.0+0.2*BREATH+0.45*PULSE*beat+0.6*SETTLE;float spread=mix(1.25,1.0,DARK);float h=(0.62*exp(-d*6.5*spread)+0.38*exp(-d*2.6*spread))*HALO*HALO_GAIN*hs;h*=1.0-smoothstep(KX*0.62,KX*0.97,r);",
    "float ang=atan(dir.y,dir.x+1e-5);float vis=0.5+0.5*sin(ang+FLOW*0.35+SEED);vec3 hc=mix(u_col[4],u_col[3],0.35*vis);hc=mix(hc,teamColor(ang/1.5707963+FLOW*0.12+SEED),ORQ*0.5);",
    "col=shoulder(col*mix(1.06,1.0,DARK));col=mix(vec3(luma(col)),col,SAT);hc=mix(vec3(luma(hc)),hc,SAT);float haloA=clamp(h*mix(0.42,0.78,DARK),0.0,1.0)*(1.0-inside);vec3 rgb=col*inside+shoulder(hc)*haloA;float a=inside+haloA;vec3 un=rgb/max(a,1e-4);un=pow(clamp(un,0.0,1.0),vec3(1.0/2.2));",
    "float gr=fract(sin(dot(floor(gl_FragCoord.xy),vec2(127.1,311.7)))*43758.5453)-0.5;un=clamp(un+gr*mix(0.045,0.16,inside),0.0,1.0);float dz=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-0.5;un+=dz/255.0;a=clamp(a+dz/255.0*step(0.002,a),0.0,1.0);a*=FADE;gl_FragColor=vec4(un*a,a);}"
  ].join("\n");

  var lista = [], corriendo = false, previo = 0;
  /* La landing va siempre en claro (Nico, 22-10): la orbe sólo se pinta «oscura» sobre la medianoche. */
  var oscuroTema = function () { return false; };

  function Orbe(host) {
    this.host = host;
    var cv = document.createElement("canvas");
    host.appendChild(cv);
    var gl = cv.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) { this.respaldo(); return; }
    var sh = function (tipo, src) { var s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
    var vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { this.respaldo(); return; }
    var pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { this.respaldo(); return; }
    gl.useProgram(pr);
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, "a_pos"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.u = {}; var self = this;
    ["u_a", "u_b", "u_c", "u_d", "u_e", "u_col"].forEach(function (n) { self.u[n] = gl.getUniformLocation(pr, n); });
    gl.clearColor(0, 0, 0, 0);
    this.gl = gl; this.cv = cv;
    var p = PAL[host.dataset.orbe] || PAL.aurora;
    this.col = colores(p);
    this.orq = host.dataset.orq === "1" ? 1 : 0;
    this.semilla = (hash32(host.dataset.semilla || "ori") % 997) / 997 * 40 + 3;
    this.obj = ESTADOS[host.dataset.estado] || ESTADOS.idle;
    this.act = {}; for (var k in this.obj) this.act[k] = this.obj[k];
    var r = Math.random() * 40;
    this.fF = r; this.fG = r * .3; this.fR = r; this.fO = r; this.fOr = r;
    this.visible = false;
    this.medir();
    var io = new IntersectionObserver(function (e) { self.visible = e[0].isIntersecting; if (self.visible) arrancar(); }, { rootMargin: "120px" });
    io.observe(host);
    lista.push(this);
  }
  Orbe.prototype.respaldo = function () {
    var p = PAL[this.host.dataset.orbe] || PAL.aurora;
    this.host.innerHTML = "";
    this.host.style.borderRadius = "50%";
    this.host.style.background = "radial-gradient(circle at 34% 30%," + p.light + " 0,transparent 42%),radial-gradient(circle at 66% 70%," + p.accent + " 0,transparent 55%)," + p.core;
  };
  Orbe.prototype.medir = function () {
    var lado = Math.max(1, this.host.offsetWidth);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.lado = lado;
    this.cv.width = Math.max(2, Math.round(lado * K * dpr));
    this.cv.height = this.cv.width;
    this.oscuro = this.host.closest(".noche") ? 1 : (oscuroTema() ? 1 : 0);
  };
  Orbe.prototype.estado = function (e) { this.obj = ESTADOS[e] || ESTADOS.idle; };
  Orbe.prototype.paso = function (dt) {
    var f = 1 - Math.exp(-dt / 0.35), s = this.act, o = this.obj;
    CLAVES.forEach(function (k) { s[k] += (o[k] - s[k]) * f; });
    this.fF += dt * s.flujo; this.fG += dt * s.giro; this.fR += dt * s.ritmo; this.fO += dt * s.onda; this.fOr += dt * s.orbita;
  };
  Orbe.prototype.pintar = function () {
    var gl = this.gl, s = this.act, u = this.u;
    gl.viewport(0, 0, this.cv.width, this.cv.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    var detalle = Math.min(1, Math.max(0, (this.lado - 18) / 90));
    var aa = (1.5 * 2 * K) / Math.max(this.cv.width, 1);
    gl.uniform4f(u.u_a, this.fF, this.fG, Math.sin(this.fR) * s.respiracion, this.fO);
    gl.uniform4f(u.u_b, s.latido, s.nucleo, s.saturacion, s.opacidad);
    gl.uniform4f(u.u_c, s.halo, s.deformacion, 0, this.oscuro);
    gl.uniform4f(u.u_d, this.semilla, this.orq, detalle, s.torsion);
    gl.uniform4f(u.u_e, this.fOr, aa, K, 0);
    gl.uniform3fv(u.u_col, this.col);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  function cuadro(t) {
    var dt = Math.min(0.05, (t - previo) / 1000 || 0.016); previo = t;
    var alguno = false;
    lista.forEach(function (o) { if (o.visible) { alguno = true; o.paso(dt); o.pintar(); } });
    if (alguno && LF.MOV) requestAnimationFrame(cuadro); else corriendo = false;
  }
  function arrancar() {
    if (!LF.MOV) { lista.forEach(function (o) { o.pintar(); }); return; }
    if (corriendo) return; corriendo = true; previo = performance.now(); requestAnimationFrame(cuadro);
  }
  function iniciar() {
    LF.$$("[data-orbe]").forEach(function (h) { h._orbe = new Orbe(h); });
    window.addEventListener("resize", function () { lista.forEach(function (o) { o.medir(); }); if (!LF.MOV) arrancar(); });
    if (!LF.MOV) setTimeout(arrancar, 50);
  }
  return { iniciar: iniciar };
})();
