// @ts-nocheck
/* eslint-disable */
/**
 * landing-fx — comportamientos de la landing-v2, port fiel de los scripts del
 * index.html standalone (shader WebGL del hero, reveals por IntersectionObserver,
 * split de palabras, header sticky, menú móvil, stepper de "cómo funciona", y el
 * gran scrubber scroll-driven de todas las secciones, más el motor de scroll con
 * inercia estilo Lenis y el "video" WebP del cierre).
 *
 * Se monta sobre el DOM ya renderizado por <LandingHome/> vía useEffect y devuelve
 * un cleanup que remueve los listeners globales y detiene los loops de rAF.
 *
 * NO es idiomático React a propósito: es la lógica imperativa original, adaptada al
 * ciclo de vida de React (por eso @ts-nocheck). Editar con cuidado y en paralelo a
 * ./landing.css. Ver docs/DESIGN.md §10 (Brand & Landing).
 */

export function initLandingFx(): () => void {
  if (typeof window === "undefined") return () => {};

  const disposers: Array<() => void> = [];
  let killed = false;
  const W = (type: any, fn: any, opts?: any) => {
    window.addEventListener(type, fn, opts);
    disposers.push(() => window.removeEventListener(type, fn, opts));
  };
  const D = (type: any, fn: any, opts?: any) => {
    document.addEventListener(type, fn, opts);
    disposers.push(() => document.removeEventListener(type, fn, opts));
  };

  /* ===================== script2: header, menú, words, reveals, shader, sheets, stepper ===================== */
  (function(){
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Header */
  var hdr = document.getElementById('hdr');
  requestAnimationFrame(function(){ hdr.classList.add('on'); });
  function onScrollHdr(){
    var ov = /(?:contact|blog|product)-open/.test(document.documentElement.className);
    hdr.classList.toggle('scrolled', ov || window.scrollY > 24);
  }
  window.__syncHdr = onScrollHdr;
  W('scroll', onScrollHdr, {passive:true}); onScrollHdr();

  /* Menú móvil */
  var menu = document.getElementById('mmenu');
  document.getElementById('menuBtn').addEventListener('click', function(){
    menu.classList.add('open'); document.body.style.overflow='hidden';
    menu.querySelectorAll('nav a').forEach(function(a,i){ a.style.transitionDelay = (0.12 + i*0.07) + 's'; });
  });
  function closeMenu(){ menu.classList.remove('open'); document.body.style.overflow=''; }
  document.getElementById('closeBtn').addEventListener('click', closeMenu);
  menu.querySelectorAll('a').forEach(function(a){ a.addEventListener('click', closeMenu); });

  /* Split de palabras */
  document.querySelectorAll('.words').forEach(function(el){
    if(el.getAttribute('data-wsplit')) return; el.setAttribute('data-wsplit','1');
    var accents = (el.getAttribute('data-accent')||'').split(',').map(function(s){return s.trim().toLowerCase();}).filter(Boolean);
    var accentMode = el.getAttribute('data-accent-mode') || 'color';
    var words = el.textContent.trim().split(/ +/);
    el.setAttribute('aria-label', words.join(' '));
    el.textContent = '';
    words.forEach(function(w,i){
      var outer = document.createElement('span'); outer.className='w'; outer.setAttribute('aria-hidden','true');
      var inner = document.createElement('span'); inner.className='wi';
      inner.textContent = w;
      inner.style.transitionDelay = (i*0.05) + 's';
      var clean = w.replace(/[.,;:!?()«»"]/g,'').toLowerCase();
      if(accents.indexOf(clean) !== -1){
        if(accentMode === 'hl') inner.classList.add('wal');
        else inner.style.color = 'var(--blue)';
      }
      outer.appendChild(inner);
      if(i < words.length-1) outer.appendChild(document.createTextNode('\u00A0'));
      el.appendChild(outer);
    });
  });

  /* Wordmark del footer */
  var wm = document.getElementById('wm').firstElementChild;
  if(!wm.childElementCount) 'Leasefy.'.split('').forEach(function(ch,i){
    var s = document.createElement('span');
    s.textContent = ch;
    s.style.setProperty('--d', (0.1 + i*0.05) + 's');
    if(ch === '.') s.className = 'bd';
    wm.appendChild(s);
  });

  /* Observador de scroll (todo dispara una sola vez) */
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(!e.isIntersecting) return;
      e.target.classList.add('in');
      if(e.target.classList.contains('cnt')) startCount(e.target);
      io.unobserve(e.target);
    });
  }, {rootMargin:'-10% 0px'});
  document.querySelectorAll('[data-reveal]:not([data-load]), .words:not([data-load-words]), .clip:not([data-load-clip]), .grow, .conn, .mconn, .frag, .frag2, .lrow, .cnt, #wm').forEach(function(el){ io.observe(el); });

  /* Elementos del hero: animan al cargar */
  setTimeout(function(){
    document.querySelectorAll('[data-load]').forEach(function(el){ el.classList.add('in'); });
    document.querySelectorAll('[data-load-words]').forEach(function(el){ el.classList.add('in'); });
    document.querySelectorAll('[data-load-clip]').forEach(function(el){ el.classList.add('in'); });
    document.querySelectorAll('.float').forEach(function(f){ f.classList.add('in'); });
  }, reduced ? 0 : 200);

  /* Contadores */
  function startCount(el){
    if(reduced){ el.textContent = el.getAttribute('data-to'); return; }
    var to = parseInt(el.getAttribute('data-to'),10), t0 = null;
    function tick(t){
      if(!t0) t0 = t;
      var p = Math.min((t - t0)/1200, 1);
      el.textContent = Math.round(to * (1 - Math.pow(1-p,3)));
      if(p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* Parallax de cards flotantes + progreso del timeline */
  var floats = Array.prototype.slice.call(document.querySelectorAll('.float'));
  var hv = document.getElementById('hvisual');
  var tl = document.getElementById('tl');
  var tlp = document.getElementById('tlp');
  function lerp(a,b,t){ return a + (b-a)*t; }
  function onScroll(){
    if(!reduced && hv){
      var r = hv.getBoundingClientRect();
      var vh = window.innerHeight;
      var p = Math.min(Math.max((vh - r.top) / (vh + r.height), 0), 1);
      floats.forEach(function(f){
        var range = f.getAttribute('data-p').split(',').map(Number);
        f.style.transform = 'rotate(var(--r)) translateY(' + lerp(range[0], range[1], p).toFixed(1) + 'px)';
      });
    }
    if(tl){
      var tr = tl.getBoundingClientRect();
      var mark = window.innerHeight * 0.72;
      var prog = Math.min(Math.max((mark - tr.top) / tr.height, 0), 1);
      tlp.style.transform = 'scaleY(' + prog.toFixed(4) + ')';
    }
    pDraw();
  }
  W('scroll', onScroll, {passive:true});
  W('resize', onScroll);
  onScroll();

  /* Convergencia del problema: escenario fijo, cards que viajan a la carpeta */
  var ptall = document.getElementById('ptall');
  var pstage = document.getElementById('pstage');
  var psvg = document.getElementById('psvg');
  var lwrap = document.getElementById('lwrap');
  var lport = document.getElementById('lport');
  var plbgs = lwrap ? Array.prototype.slice.call(lwrap.querySelectorAll('.lbg,.lbg2')) : [];
  var pfr = Array.prototype.slice.call(document.querySelectorAll('.fragT'));
  var ptiles = Array.prototype.slice.call(document.querySelectorAll('.pdesk .ptile'));
  var plines = [], plens = [], pdots = [], ptrav = [], pconnected = false;
  var P_TOPS = [0,90,180,270,360,450,540], P_LEFTS = [0,48,16,56,24,40,8];

  function twin(i){ var t0 = 0.4 + i * 0.045; return [t0, t0 + 0.16]; }
  function clamp01(v){ return Math.min(Math.max(v, 0), 1); }

  function pMeasure(){
    if(!ptall || !pstage || !psvg || !lwrap) return;
    if(window.innerWidth < 1024){ psvg.innerHTML = ''; plines = []; plens = []; pdots = []; ptrav = []; return; }
    var W = pstage.clientWidth, H = pstage.clientHeight;
    var tx = W / 2; /* el panel reposa siempre al 50%: destino estable */
    var ty = H / 2;
    psvg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    psvg.innerHTML = ''; plines = []; plens = []; pdots = []; ptrav = [];
    pfr.forEach(function(el, i){
      var x1 = P_LEFTS[i] + el.offsetWidth;
      var y1 = P_TOPS[i] + el.offsetHeight / 2;
      var cx = P_LEFTS[i] + el.offsetWidth / 2;
      var fan = (i - 3) * 9;
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M ' + x1 + ' ' + y1 + ' C ' + (x1 + (tx - x1) * 0.42) + ' ' + y1 + ', ' + (tx - (tx - x1) * 0.28) + ' ' + (ty + fan) + ', ' + (tx - 1) + ' ' + ty);
      path.setAttribute('stroke', 'rgba(17,17,17,0.30)');
      path.setAttribute('stroke-width', '1.1');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('fill', 'none');
      psvg.appendChild(path);
      var len = path.getTotalLength();
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
      plines.push(path); plens.push(len);
      var dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', x1); dot.setAttribute('cy', y1); dot.setAttribute('r', '2.5');
      dot.setAttribute('fill', '#1A40FF'); dot.style.opacity = 0;
      psvg.appendChild(dot); pdots.push(dot);
      ptrav.push({ dx: tx - cx, dy: ty - y1 });
    });
    pDraw();
  }

  function pDraw(){
    if(!ptall || !pstage || window.innerWidth < 1024) return;
    var r = ptall.getBoundingClientRect();
    var vh = window.innerHeight;
    var p = clamp01((vh * 0.8 - r.top) / (r.height - vh * 0.2));
    if(reduced) p = 1;

    plines.forEach(function(el, i){
      var ds = 0.04 + i * 0.03, de = 0.30 + i * 0.02;
      var lp = clamp01((p - ds) / (de - ds));
      el.style.strokeDashoffset = plens[i] * (1 - lp);
      var t0 = twin(i)[0];
      var o = Math.min(clamp01((p - ds) / 0.05), 1 - clamp01((p - t0) / 0.07));
      el.style.opacity = o;
      if(pdots[i]) pdots[i].style.opacity = o;
    });

    pfr.forEach(function(el, i){
      var w = twin(i), e = clamp01((p - w[0]) / (w[1] - w[0]));
      var ee = 1 - Math.pow(1 - e, 3);
      var t = ptrav[i] || { dx: 0, dy: 0 };
      el.style.transform = 'translate(' + (t.dx * ee) + 'px,' + (t.dy * ee) + 'px) scale(' + (1 - 0.88 * ee) + ')';
      el.style.opacity = 1 - clamp01((p - (w[1] - 0.035)) / 0.035);
    });

    if(lwrap) lwrap.style.width = (50 + 50 * clamp01((p - 0.78) / 0.18)) + '%';
    if(plbgs.length){
      var pg = clamp01((p - 0.86) / 0.12);
      for(var gi = 0; gi < plbgs.length; gi++) plbgs[gi].style.opacity = pg;
    }
    if(lport){
      lport.style.opacity = 1 - clamp01((p - 0.8) / 0.1);
      lport.classList.toggle('on', clamp01((p - 0.12) / 0.18) > 0.5);
    }
    ptiles.forEach(function(el, i){
      var t1 = twin(i)[1];
      var e2 = clamp01((p - (t1 - 0.02)) / 0.07);
      el.style.opacity = e2;
      el.style.transform = 'scale(' + (0.4 + 0.6 * e2) + ')';
    });

    if(p > 0.84 && !pconnected){ pconnected = true; pstage.classList.add('connected'); }
    else if(pconnected && p < 0.72){ pconnected = false; pstage.classList.remove('connected'); }
  }

  W('resize', pMeasure);
  W('load', pMeasure);
  setTimeout(pMeasure, 800);
  setTimeout(pMeasure, 1600);
  setTimeout(pMeasure, 2600);
  pMeasure();

  /* Campo Leasefy en WebGL: gradiente fluido (FBM + domain warping) + halftone de discos en GPU */
  function initFluid(fxc){
    if(!fxc) return;
    if(fxc.getAttribute('data-fx')) return; fxc.setAttribute('data-fx','1');
    var gl = fxc.getContext('webgl', { alpha:false, antialias:false, powerPreference:'high-performance' });
    if(!gl){
      var par = fxc.parentElement;
      if(par){ par.style.background = 'url(/landing-v2/assets/aba85d2e51.jpg) 50% 25% / cover no-repeat #F8F7F5'; par.style.opacity = '0.55'; }
      return;
    }
    var host = fxc.closest('section') || fxc.parentElement;
    var raf = 0, running = true, visible = true, dead = false;
    var t = 0, mx = -1e4, my = -1e4, emx = 0, emy = 0, mact = 0;
    var dpr = 1, cw = 1, ch = 1;

    var VERT = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }';
    var FRAG = [
      'precision highp float;',
      'uniform vec2 u_res;',
      'uniform float u_time;',
      'uniform vec2 u_mouse;',
      'uniform float u_mact;',
      'uniform sampler2D u_tex;',
      'uniform vec2 u_uvs;',
      'uniform vec2 u_uvo;',
      'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }',
      'float vnoise(vec2 p){',
      '  vec2 i = floor(p); vec2 f = fract(p);',
      '  f = f * f * (3.0 - 2.0 * f);',
      '  float a = hash(i);',
      '  float b = hash(i + vec2(1.0, 0.0));',
      '  float c = hash(i + vec2(0.0, 1.0));',
      '  float d = hash(i + vec2(1.0, 1.0));',
      '  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);',
      '}',
      'float fbm(vec2 p){',
      '  float v = 0.0; float a = 0.5;',
      '  for(int i = 0; i < 4; i++){ v += a * vnoise(p); p = p * 2.03 + 11.3; a *= 0.5; }',
      '  return v;',
      '}',
      'vec3 grad(vec2 uv){ vec2 s = uv * u_uvs + u_uvo; s = 1.0 - abs(1.0 - 2.0 * fract(s * 0.5)); return texture2D(u_tex, s).rgb; }',
      'void main(){',
      '  vec2 px = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y);',
      '  vec2 uv = px / u_res;',
      '  vec2 asp = vec2(u_res.x / u_res.y, 1.0);',
      '  vec2 p = uv * asp;',
      '  float t = u_time;',
      '  vec2 q = vec2(fbm(p * 1.6 + vec2(0.0, t * 0.055)), fbm(p * 1.6 + vec2(5.2, -t * 0.05)));',
      '  vec2 m = (u_mouse / u_res) * asp;',
      '  float md = length(p - m);',
      '  float mf = u_mact * exp(-md * md * 16.0);',
      '  vec2 r = vec2(fbm(p * 2.4 + 3.0 * q + vec2(1.7, 9.2) + t * 0.075),',
      '                fbm(p * 2.4 + 3.0 * q + vec2(8.3, 2.8) - t * 0.065));',
      '  vec2 dm = p - m;',
      '  vec2 warp = (q - 0.5) * 0.34 + (r - 0.5) * 0.22 + (vec2(-dm.y, dm.x) * 0.38 - dm * 0.14) * mf;',
      '  float ea = smoothstep(0.0, 0.20, uv.x) * smoothstep(0.0, 0.20, 1.0 - uv.x) * smoothstep(0.0, 0.14, uv.y) * smoothstep(0.0, 0.14, 1.0 - uv.y);',
      '  warp *= mix(0.12, 1.0, ea);',
      '  vec3 col = grad(uv + warp / asp);',
      '  float shade = fbm(p * 2.0 + r * 2.0 - t * 0.03);',
      '  col *= 0.78 + 0.44 * shade + mf * 0.07;',
      '  vec2 vc = uv - vec2(0.5, 0.42);',
      '  col *= 1.0 - dot(vc, vc) * 0.5;',
      '  gl_FragColor = vec4(col, 1.0);',
      '}'
    ].join('\n');

    function compile(type, src){
      var sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if(!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(sh));
      return sh;
    }
    var prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    var aLoc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(aLoc);
    gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);

    function U(n){ return gl.getUniformLocation(prog, n); }
    var uRes = U('u_res'), uTime = U('u_time'), uCell = U('u_cell');
    var uMouse = U('u_mouse'), uMact = U('u_mact'), uR = U('u_r'), uRg = U('u_rg');
    var uUvs = U('u_uvs'), uUvo = U('u_uvo');

    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.uniform1i(U('u_tex'), 0);

    var img = new Image();

    function resize(){
      var parent = fxc.parentElement;
      if(!parent) return;
      var r = parent.getBoundingClientRect();
      var w = Math.max(r.width, 1), h = Math.max(r.height, 1);
      dpr = Math.min(window.devicePixelRatio || 1, 2) * 0.6;
      cw = Math.round(w * dpr); ch = Math.round(h * dpr);
      fxc.width = cw; fxc.height = ch;
      fxc.style.width = w + 'px'; fxc.style.height = h + 'px';
      gl.viewport(0, 0, cw, ch);
      gl.uniform2f(uRes, cw, ch);
      var S = w < 768
        ? Math.min(12, Math.max(8, Math.sqrt(w * h / 9000)))
        : Math.min(10, Math.max(6, Math.sqrt(w * h / 34000)));
      gl.uniform1f(uCell, S * dpr);
      gl.uniform1f(uR, 200 * dpr);
      gl.uniform1f(uRg, 330 * dpr);
      if(img.naturalWidth > 0){
        var iw = img.naturalWidth, ih = img.naturalHeight;
        var scale = Math.max(w / iw, h / ih);
        var sw = w / scale, sh = h / scale;
        gl.uniform2f(uUvs, sw / iw, sh / ih);
        gl.uniform2f(uUvo, (iw - sw) / 2 / iw, (ih - sh) * 0.25 / ih);
      }
    }

    function draw(tt, interactive){
      if(dead) return;
      if(interactive){
        emx += (mx - emx) * 0.05;
        emy += (my - emy) * 0.05;
        mact += ((mx > -9000 ? 1 : 0) - mact) * 0.045;
      }
      gl.uniform1f(uTime, tt);
      gl.uniform2f(uMouse, emx * dpr, emy * dpr);
      gl.uniform1f(uMact, interactive ? mact : 0.0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    function loop(){
      if(killed) return;
      raf = requestAnimationFrame(loop);
      if(!running || !visible) return;
      t += 0.016;
      draw(t, true);
    }

    function start(){
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, (function(){ try{ var sw = img.naturalWidth, sh = img.naturalHeight, cur = img; while(Math.max(sw, sh) > 512){ var nw = Math.max(1, Math.round(sw / 2)), nh = Math.max(1, Math.round(sh / 2)); var cc = document.createElement('canvas'); cc.width = nw; cc.height = nh; var cx = cc.getContext('2d'); cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = 'high'; cx.drawImage(cur, 0, 0, nw, nh); cur = cc; sw = nw; sh = nh; } var fc = document.createElement('canvas'); fc.width = sw; fc.height = sh; var fx2 = fc.getContext('2d'); fx2.filter = 'blur(1.6px)'; fx2.drawImage(cur, 0, 0); return fc; }catch(_e){ return img; } })());
      resize();
      if(reduced){ draw(1.6, false); return; }
      loop();
    }
    try{
      var gtile = document.createElement('canvas'); gtile.width = gtile.height = 160;
      var g2 = gtile.getContext('2d'); var gid = g2.createImageData(160, 160);
      for(var gi = 0; gi < gid.data.length; gi += 4){ var gv = 100 + (Math.random() * 56 | 0); gid.data[gi] = gid.data[gi + 1] = gid.data[gi + 2] = gv; gid.data[gi + 3] = 255; }
      g2.putImageData(gid, 0, 0);
      var gdiv = document.createElement('div');
      gdiv.setAttribute('aria-hidden', 'true');
      gdiv.style.cssText = 'position:absolute;inset:0;pointer-events:none;background-image:url(' + gtile.toDataURL('image/png') + ');background-repeat:repeat;background-size:80px 80px;mix-blend-mode:overlay;opacity:.5';
      fxc.insertAdjacentElement('afterend', gdiv);
    }catch(_e){}
    img.onload = start;
    img.src = '/landing-v2/assets/8d1ae5848f.jpg';

    if(!reduced){
      host.addEventListener('mousemove', function(e){
        var r = fxc.getBoundingClientRect();
        mx = e.clientX - r.left; my = e.clientY - r.top;
        if(mact === 0 && emx === 0 && emy === 0){ emx = mx; emy = my; }
      });
      host.addEventListener('mouseleave', function(){ mx = my = -1e4; });
      host.addEventListener('touchmove', function(e){
        var tc = e.touches[0]; if(!tc) return;
        var r = fxc.getBoundingClientRect();
        mx = tc.clientX - r.left; my = tc.clientY - r.top;
      }, {passive:true});
      D('visibilitychange', function(){ running = !document.hidden; });
    }
    fxc.addEventListener('webglcontextlost', function(e){ e.preventDefault(); dead = true; cancelAnimationFrame(raf); });
    W('resize', function(){ resize(); if(reduced) draw(1.6, false); });
    if('IntersectionObserver' in window){
      new IntersectionObserver(function(es){ visible = es[0] ? es[0].isIntersecting : true; }).observe(fxc);
    }
  }
  initFluid(document.getElementById('hfx'));

  /* La plataforma se endereza al hacer scroll (tilt 3D → plano) */
  var hfwrap = document.querySelector('.hfwrap');
  var hframeEl = document.querySelector('.hframe');
  function hframeDraw(){
    if(!hfwrap || !hframeEl) return;
    if(reduced){ hframeEl.style.transform = 'none'; return; }
    var r = hfwrap.getBoundingClientRect();
    var vh = window.innerHeight;
    var e = Math.min(Math.max((1.05 * vh - r.top) / (0.7 * vh), 0), 1);
    hframeEl.style.transform = 'perspective(1200px) rotateX(' + (20 * (1 - e)) + 'deg) scale(' + (0.94 + 0.06 * e) + ') translateY(' + (26 * (1 - e)) + 'px)';
  }
  W('scroll', hframeDraw, { passive: true });
  W('resize', hframeDraw);
  hframeDraw();

  /* Sheets: las secciones de color se deslizan sobre la anterior */
  (function(){
    var sheets = Array.prototype.slice.call(document.querySelectorAll('[data-sheet]'));
    if(!sheets.length) return;
    var raf = 0;
    function draw(){
      raf = 0;
      var vh = window.innerHeight;
      sheets.forEach(function(el){
        var amp = parseFloat(el.getAttribute('data-sheet')) || 40;
        if(reduced){ el.style.transform = 'none'; return; }
        var r = el.getBoundingClientRect();
        var e = Math.min(Math.max((vh - r.top) / (vh * 0.85), 0), 1);
        el.style.transform = 'translateY(' + (amp * (1 - e)) + 'px) scale(' + (0.965 + 0.035 * e) + ')';
      });
    }
    function onScroll(){ if(!raf) raf = requestAnimationFrame(draw); }
    W('scroll', onScroll, { passive: true });
    W('resize', onScroll);
    draw();
  })();

  /* Cómo funciona: escenario sticky dirigido por scroll (paso más cercano al centro) */
  (function(){
    var steps = Array.prototype.slice.call(document.querySelectorAll('.hstep'));
    if(!steps.length) return;
    var scns = Array.prototype.slice.call(document.querySelectorAll('#hwscenes .scn'));
    var fill = document.getElementById('hwfill');
    var rf = document.getElementById('rfill');
    var ctr = document.getElementById('hwctr');
    var tagEl = document.getElementById('hwtag');
    var TAGS = [['CRM',0],['Agente AI',1],['Agente AI',1],['Agente AI',1],['ERP',0],['ERP',0]];
    var cur = -1, raf = 0;
    function setActive(i){
      if(i === cur) return;
      cur = i;
      steps.forEach(function(st, k){
        st.classList.toggle('act', k === i);
        st.classList.toggle('on', k <= i);
      });
      scns.forEach(function(sc, k){
        sc.classList.toggle('on', k === i);
        sc.classList.toggle('in', k === i);
      });
      /* barra continua: la maneja el scrubber global */
      /* rfill ahora se dibuja continuo desde el scrubber global */
      if(ctr){
        ctr.textContent = '0' + (i + 1) + ' / 0' + steps.length;
        ctr.classList.remove('roll'); void ctr.offsetWidth; ctr.classList.add('roll');
      }
      if(tagEl){
        tagEl.textContent = TAGS[i][0];
        tagEl.className = 'tag ' + (TAGS[i][1] ? 't-bluesoft' : 't-out');
        void tagEl.offsetWidth;
        tagEl.classList.add('pop');
      }
    }
    function update(){
      raf = 0;
      var mid = window.innerHeight / 2;
      var best = 0, bestDist = Infinity;
      steps.forEach(function(st, k){
        var r = st.getBoundingClientRect();
        var d = Math.abs(r.top + r.height / 2 - mid);
        if(d < bestDist){ bestDist = d; best = k; }
      });
      setActive(best);
    }
    function onScroll(){ if(!raf) raf = requestAnimationFrame(update); }
    W('scroll', onScroll, { passive: true });
    W('resize', onScroll);
    update();
  })();

  /* Agentes: preview que cambia al pasar el cursor */
  var agRows = Array.prototype.slice.call(document.querySelectorAll('.agli'));
  if(agRows.length){
    var agFade = document.getElementById('agfade');
    var agNum = document.getElementById('agnum'), agName = document.getElementById('agname'),
        agDesc = document.getElementById('agdesc'), agRv = document.getElementById('agrv'),
        agFlow = document.getElementById('agflow');
    var agTimer = null;
    var setAgent = function(i){
      agRows.forEach(function(r,j){ r.classList.toggle('act', i === j); });
      var d = agRows[i].dataset;
      var apply = function(){
        agNum.textContent = '( ' + d.num + ' )';
        agName.textContent = d.name;
        agDesc.textContent = d.desc;
        agRv.textContent = d.result;
        agFlow.textContent = d.flow;
        agFade.style.opacity = '1';
      };
      if(reduced){ apply(); return; }
      agFade.style.opacity = '0';
      if(agTimer) clearTimeout(agTimer);
      agTimer = setTimeout(apply, 140);
    };
    agRows.forEach(function(r,i){
      ['mouseenter','focus','click'].forEach(function(ev){
        r.addEventListener(ev, function(){ setAgent(i); });
      });
    });
  }

  /* Formulario de contacto: compone un mailto */
  var send = document.getElementById('cfsend');
  if(send){
    send.addEventListener('click', function(){
      var val = function(id){ var el = document.getElementById(id); return el ? el.value.trim() : ''; };
      var body = 'Nombre: ' + val('cf1') + '\nEmail: ' + val('cf2') + '\nInmobiliaria: ' + val('cf3') + '\nInterés: ' + (window.__cfChip || 'Todo el sistema') + '\nQué queremos resolver: ' + val('cf4');
      window.location.href = 'mailto:hola@leasefy.com?subject=' + encodeURIComponent('Empezar con Leasefy') + '&body=' + encodeURIComponent(body);
    });
  }
  })();

  /* Router mínimo (Fase 1): anclas in-page con glide + toggle del mega-menú.
     Escape y cierre por click-fuera del mega-menú los maneja el bloque script3.
     Los links a rutas reales (/landing-v2/...) navegan normal. */
  (function(){
    function inPage(id){
      if(id === '#top' || id === '#'){ if(window.__glide){ window.__glide(0); } else { window.scrollTo(0, 0); } return; }
      var el = null; try{ el = document.querySelector(id); }catch(_e){}
      if(!el) return;
      var y = el.getBoundingClientRect().top + window.pageYOffset - 96;
      if(window.__glide){ window.__glide(Math.max(0, y)); } else { window.scrollTo(0, Math.max(0, y)); }
    }
    D('click', function(e){
      var t = e.target;
      var a = t && t.closest ? t.closest('a[href]') : null;
      if(!a) return;
      var href = a.getAttribute('href') || '';
      var root = document.documentElement;
      if(a.id === 'pmTrigger'){ e.preventDefault(); root.classList.toggle('pm-open'); return; }
      root.classList.remove('pm-open');
      if(href.charAt(0) !== '#'){ return; }   /* rutas reales -> navegación normal */
      if(href.length < 2){ return; }
      e.preventDefault();
      inPage(href);
    }, true);
  })();

  /* ===================== script3: glide scroll, video del cierre, scrubbers scroll-driven ===================== */
  (function(){
  var tall = document.getElementById('ocTall');
  if(!tall) return;
  var shell = document.getElementById('ocShell');
  var morph = document.getElementById('ocMorph');
  var lines = Array.prototype.slice.call(tall.querySelectorAll('.oc-line'));
  var fin = tall.querySelector('.oc-final');
  var em = fin.querySelector('em');
  var sub = tall.querySelector('.oc-sub');
  var wal = null;
  var diagSet = null;
  var arqTall = document.getElementById('arqTall');
  var arqStick = document.getElementById('arqStick');
  var zoomC = null;
  var pdTall = document.getElementById('pdTall');
  var pdChars = [], pdLead = null;
  var hwH2 = null, hwChars = [], hwOr = 0, hwLeadEl = null, hwStage = null, hwBarEl = null, hSteps = [];
  var nightEl = null, sheetEl = null, dot6 = null;
  var rtWis = [], rtLead2 = null, rtQuote = null, rtImps = [], rtRows = [];
  var cols = [], bentoEl = null, bcells = [], hwRail = null, hwFill = null, foRows = [];
  var finPanel = null, finTotal = null;
  var bannerEl = null, bannerIn = null;
  var ENTR = [
    {sel:'#finanzas', h2:null, wis:[], lead:null, ignite:'fin-case'},
    {sel:'#testimonios', h2:null, wis:[], lead:null, ignite:'tst-case'}
  ];
  function splitChars(sel, arr){
    var h2 = document.querySelector(sel);
    if(!h2) return;
    var wis = h2.querySelectorAll('.wi');
    Array.prototype.forEach.call(wis, function(wi){
      if(wi.__ch) return;
      wi.__ch = 1;
      var txt = wi.textContent;
      wi.textContent = '';
      for(var i = 0; i < txt.length; i++){
        var s = document.createElement('span');
        s.className = 'ch';
        s.textContent = txt.charAt(i);
        s.style.opacity = 0;
        wi.appendChild(s);
        arr.push(s);
      }
    });
  }
  var rm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.__cfChip = 'Todo el sistema';
  var PRODUCTS = {
    crm: { k:'Sistema · Módulo 01', badge:'CRM', t:'CRM inmobiliario',
      promise:'Tu comercial, de punta a punta',
      lead:'Cada interesado, cada inmueble y cada asesor viviendo en un solo pipeline — sin planillas ni chats sueltos.',
      win:{ t:'Leasefy · CRM — Pipeline', tag:'En vivo', v:[
        { t:'rows', hd:['Hoy','23 solicitudes','sys'], d:{ r:[['Sin atender','0','ok'],['Respuesta media','12 min'],['Visitas agendadas','7','mb']] } },
        { t:'steps', hd:['Caso L-2481','Pipeline','sys'], d:{ s:[['Solicitud capturada','WhatsApp · 8:02 a.m.','done'],['Contexto armado','presupuesto, fechas, mascotas','done'],['Asignada a Laura','SLA 15 min','on'],['Visita','por agendar','']] } },
        { t:'chat', hd:['WhatsApp · Laura','8:14 a.m.','chat'], d:{ m:[['in','Busco apto de 2 alcobas en Laureles, presupuesto $3M','8:02'],['out','Te tengo 3 opciones que encajan. ¿Te las envío y agendamos visita hoy?','8:14']] } } ] },
      feats:[
        { k:'Captura', h:'Todo entra solo, con contexto', p:'WhatsApp, portales y referidos caen al mismo pipeline con presupuesto, fechas y necesidad ya organizados. Nada de copiar y pegar entre chats y planillas.',
          v:{ t:'chat', hd:['WhatsApp · entrada','8:02 a.m.','chat'], d:{ m:[['in','Hola! vi el apto de la Cra 34, ¿sigue disponible? Tengo un perrito 🐶','8:02'],['out','¡Sigue! Y acepta mascotas. ¿Para cuándo lo necesitas?','8:03'],['in','Para el 1 de agosto','8:04']] } } },
        { k:'Seguimiento', h:'Cada asesor sabe qué sigue', p:'Tareas, tiempos de respuesta y recordatorios viven en el caso. Si una conversación se enfría, el CRM la sube antes de que se pierda el cierre.',
          v:{ t:'rows', hd:['Equipo','Hoy','sys'], d:{ r:[['Laura','8 casos · 12 min resp.'],['Andrés','6 casos · 9 min resp.'],['Sin atender','0','ok']] } } },
        { k:'Cierre', h:'La historia completa en el expediente', p:'Cada visita, oferta y documento queda en su caso. Cuando llega la firma, el contrato se arma con lo que ya existe — y pasa directo al ERP.',
          v:{ t:'doc', hd:['Expediente','CT-1042','sys'], st:'Listo para firma', d:{ t:'CT-1042 · Apto 402', l:['3 visitas · oferta aceptada','Estudio del inquilino aprobado','Documentos completos','Pasa a ERP de arriendos'] } } } ],
      caps:[ ['Pipeline en tiempo real','Cada solicitud con su etapa, su dueño y su siguiente paso, visible para todos.'],['Matching automático','Cruza interesado e inventario al instante y sugiere opciones que sí van a cerrar.'],['Tiempos por asesor','Sabes quién responde en minutos y quién deja enfriar — sin perseguir a nadie.'],['Historial completo','Cada conversación, visita y oferta queda en el caso, no en el teléfono de alguien.'] ],
      specs:[ ['Módulo','<b>CRM inmobiliario</b> · núcleo comercial del sistema'],['Reemplaza a','Planillas, chats sueltos y agendas personales'],['Se conecta con','WhatsApp, portales, correo'],['Alimenta a','Matching, Estudio del inquilino, ERP'],['Entrada en operación','Primera semana, con tu inventario cargado'],['Incluido en','Todos los planes'] ],
      steps:[ ['Cargamos tu inventario y tu equipo','Inmuebles, asesores y etapas quedan montados contigo, no a punta de manuales.'],['Conectamos tus canales','WhatsApp, portales y correo empiezan a alimentar el pipeline solos.'],['Tu pipeline queda vivo','Desde ese día, ninguna solicitud vuelve a depender de la memoria de nadie.'] ],
      night:{ k:'Un martes cualquiera, 8:02 a.m.', h:'Ningún interesado se queda <em>sin respuesta</em>', q:'El pipeline deja de depender de la memoria del equipo: cada conversación queda donde toca, con su historia completa.', logs:[ ['08:02','Nueva solicitud · Apto 402 · Laureles → <span class="lb">pipeline</span>'],['08:02','Contexto armado: presupuesto, fechas, mascotas'],['08:03','Asignada a Laura · SLA de respuesta 15 min'],['08:14','Primera respuesta enviada · <span class="lb">WhatsApp</span>'],['18:40','Resumen del día: 23 solicitudes · 0 sin atender'] ] },
      cx:'Te mostramos el CRM operando con tu inventario y tus canales reales.' },

    erp: { k:'Sistema · Módulo 02', badge:'ERP', t:'ERP de arriendos',
      promise:'La plata, en orden y sola',
      lead:'La parte más pesada del arriendo, el dinero, en una operación trazable y sin sorpresas al cierre de mes.',
      win:{ t:'Leasefy · ERP — Recaudo de marzo', tag:'Conciliado', v:[
        { t:'stat', hd:['Recaudo','Marzo','sys'], d:{ big:'$182.4M', l:'Recaudado este mes', s:'de $184.2M · 214 contratos' } },
        { t:'ledger', hd:['Cobros de hoy','Banco','sys'], d:{ c:['Contrato','Pago','Estado'], r:[['CT-1042','$2.450.000','Conciliado','ok'],['CT-1103','$1.980.000','Conciliado','ok'],['CT-0977','$3.120.000','→ Cobranza','mb']] } },
        { t:'rows', hd:['Salidas','Programadas','sys'], d:{ r:[['Propietarios','41 pagos · viernes'],['Comisiones','Liquidadas solas','ok'],['Cierre de mes','En horas','mb']] } } ] },
      feats:[
        { k:'Contratos', h:'Vigencias que se cuidan solas', p:'Cada contrato sabe cuándo vence, cuándo ajusta canon y qué debe cobrar este mes. Las renovaciones avisan antes de volverse un problema.',
          v:{ t:'steps', hd:['CT-1042','Vigencia','sys'], d:{ s:[['Contrato firmado','CT-1042 · hace 4 meses','done'],['Ajuste de canon','enero · IPC aplicado','done'],['Aviso de renovación','8 meses antes del vencimiento','on'],['Renovación anticipada','+12 meses aceptada','']] } } },
        { k:'Recaudo', h:'Cada pago, cuadrado contra el banco', p:'El cobro sale solo, el pago entra y se concilia contra el extracto. Lo que no cuadra salta de una — no en la semana del cierre.',
          v:{ t:'ledger', hd:['Extracto','6:12 a.m.','sys'], d:{ c:['Movimiento','Contrato','Match'], r:[['$2.450.000','CT-1042','Exacto','ok'],['$1.980.000','CT-1103','Exacto','ok'],['$840.000','—','Revisar','mb']] } } },
        { k:'Propietarios', h:'Pagos e informes puntuales', p:'Cada propietario recibe su pago programado y su informe mensual sin que nadie los arme a mano. La retención empieza por ahí.',
          v:{ t:'doc', hd:['Informe mensual','Marzo','sys'], st:'Enviado ✓', d:{ t:'Carlos M. · Propietario', l:['Informe enviado · pago recibido','Pago programado · viernes','Renovación anticipada · +12 meses'] } } } ],
      caps:[ ['Contratos y vigencias','Cánones, ajustes y vencimientos bajo control, con alertas antes de que duelan.'],['Cobros automáticos','El cobro del mes se genera y se recuerda solo, contrato por contrato.'],['Conciliación bancaria','Cada pago encuentra su contrato contra el extracto, todos los días.'],['Comisiones solas','Se calculan y liquidan con cada recaudo, sin planilla de fin de mes.'] ],
      specs:[ ['Módulo','<b>ERP de arriendos</b> · núcleo financiero del sistema'],['Reemplaza a','El Excel del cierre y las planillas de cobros'],['Se conecta con','Tu banco (extractos), CRM, agentes de Cobranza y Conciliación'],['Cierre de mes','<b>Horas, no semanas</b>'],['Entrada en operación','Desde la segunda semana, con contratos migrados'],['Incluido en','Planes con módulo financiero'] ],
      steps:[ ['Migramos tus contratos','Cánones, vigencias y condiciones entran al sistema tal como son.'],['Conectamos extractos y cobros','El recaudo y la conciliación empiezan a correr en automático.'],['El mes se cierra solo','Tesorería revisa excepciones, no persigue pagos.'] ],
      night:{ k:'Día 1 del mes, 1:00 a.m.', h:'El cierre de mes deja de ser <em>una pelea</em>', q:'Contratos, cobros, pagos y comisiones en una sola línea trazable — sin el Excel de los viernes.', logs:[ ['01:00','Cobros del mes generados · 214 contratos'],['06:12','Pago recibido · CT-1042 · <span class="lb">$2.450.000</span>'],['06:12','Conciliado contra el banco · match exacto'],['09:00','Pago a propietario programado · viernes'],['09:01','Comisión liquidada sola · sin planilla'] ] },
      cx:'Te mostramos el ERP con contratos y cobros como los tuyos.' },

    cobranza: { k:'Agentes AI · 01', badge:'Agente', t:'Cobranza',
      promise:'La mora se persigue sola',
      lead:'Recordatorios, seguimiento y escalamiento con tono humano, sin que nadie de tu equipo levante el teléfono.',
      win:{ t:'Leasefy · Agente de cobranza', tag:'Corriendo 24/7', v:[
        { t:'rows', hd:['Cartera','Hoy','ag'], d:{ r:[['En mora','3 de 214','mb'],['Promesas de pago','2 registradas'],['Escalados a humano','1 · con contexto','ok']] } },
        { t:'chat', hd:['WhatsApp · CT-1077','2:14 a.m.','chat'], d:{ m:[['out','Hola Carlos, ¿cómo estás? Te recuerdo el pago del apto 402, venció hace 3 días. ¿Te reenvío los datos?','2:14'],['in','Uy sí, se me pasó. El viernes pago','2:20'],['out','Listo, queda registrada tu promesa para el viernes ✓','2:20']] } },
        { t:'steps', hd:['Escalamiento','Reglas tuyas','ag'], d:{ s:[['Día 1 · recordatorio suave','WhatsApp · tono cordial','done'],['Día 5 · seguimiento','con datos de pago','done'],['Día 10 · tono firme','aviso de reporte','on'],['Día 14 · escala a humano','llamada sugerida','']] } } ] },
      feats:[
        { k:'Detección', h:'La mora se ve venir', p:'El agente cruza cobros y pagos todos los días: detecta el atraso el día uno, no cuando el propietario llama a preguntar por su plata.',
          v:{ t:'stat', hd:['Detección','Cruce diario','ag'], d:{ big:'Día <em>1</em>', l:'Detección del atraso', s:'no el día 30 · cruce diario banco–contratos' } } },
        { k:'Gestión', h:'Cobra con tono humano', p:'Recordatorios por WhatsApp que suenan a tu inmobiliaria — cordiales primero, firmes después. Cada respuesta queda registrada en el contrato.',
          v:{ t:'chat', hd:['WhatsApp · seguimiento','9:00 a.m.','chat'], d:{ m:[['out','Carlos, seguimos sin registrar tu pago. ¿Pasa algo con lo acordado del viernes?','9:00'],['in','Disculpa, hoy en la tarde queda','9:12'],['out','Gracias por confirmar. Queda anotado — cualquier cosa me escribes','9:12']] } } },
        { k:'Escalamiento', h:'Tu equipo entra al final', p:'Solo los casos que necesitan criterio humano llegan a tu equipo — con la historia completa y el siguiente paso sugerido.',
          v:{ t:'doc', hd:['Caso escalado','Día 14','ag'], st:'→ Humano', d:{ t:'CT-0912 · Sin respuesta', l:['6 gestiones registradas','2 promesas incumplidas','Contexto completo en el caso','Siguiente paso: llamada directa'] } } } ],
      caps:[ ['Recordatorios automáticos','Por WhatsApp y correo, con la voz de tu inmobiliaria, sin turnos ni festivos.'],['Detección temprana','El atraso se ve el día uno, cuando todavía es fácil de resolver.'],['Escalamiento con criterio','De suave a firme, y a humano solo cuando de verdad hace falta.'],['Registro completo','Cada gestión y cada respuesta quedan en el contrato, auditable.'] ],
      specs:[ ['Agente','<b>Cobranza</b> · L-AG-01'],['Corre','24/7, sin turnos ni festivos'],['Canales','WhatsApp, correo'],['Se alimenta de','ERP de arriendos (cobros y pagos)'],['Supervisión','Tu equipo aprueba los casos escalados'],['Incluido en','Planes con agentes AI'] ],
      steps:[ ['Define tono y reglas','Decides cómo suena tu cobranza y cuándo escala. El agente obedece eso.'],['El agente toma tu cartera','Desde el primer día gestiona la mora existente, no solo la nueva.'],['Solo revisas los escalados','Tu equipo ve excepciones con contexto, no listas de morosos.'] ],
      night:{ k:'Mientras duermes, 2:14 a.m.', h:'A las 2 a.m. el agente <em>sigue cobrando</em>', q:'Recordatorios con tono humano, cada gestión registrada, y tu equipo solo entra cuando de verdad hace falta.', logs:[ ['02:14','Recordatorio enviado · CT-1077 · día 3 · <span class="lb">WhatsApp</span>'],['02:15','Respuesta recibida: promesa de pago · viernes'],['02:15','Promesa registrada en el contrato'],['08:00','Caso escalado a humano · día 14 · llamada sugerida'],['08:01','Resumen: 12 gestiones · 9 respuestas · 3 promesas'] ] },
      cx:'Te mostramos al agente gestionando una cartera como la tuya.' },

    inquilino: { k:'Agentes AI · 02', badge:'Agente', t:'Estudio del inquilino',
      promise:'Verificación real, en minutos',
      lead:'Identidad, capacidad de pago y comportamiento de cada candidato, verificados contra fuentes reales — sin papeleo.',
      win:{ t:'Leasefy · Estudio A-118', tag:'4 minutos', v:[
        { t:'steps', hd:['Estudio A-118','4 minutos','ag'], d:{ s:[['Identidad verificada','documento válido · 10:22','done'],['Capacidad de pago','ingresos 2.4× el canon','done'],['Comportamiento','sin moras en 24 meses','done'],['Veredicto','riesgo bajo → firma','on']] } },
        { t:'rows', hd:['Andrés F.','CC 1.043.···','ag'], d:{ r:[['Ingresos vs canon','2.4×','ok'],['Obligaciones','Al día'],['Moras últimos 24 m.','0','ok']] } },
        { t:'doc', hd:['Veredicto','A-118','ag'], st:'Riesgo bajo', d:{ t:'Andrés Felipe R.', l:['Identidad y antecedentes en orden','Capacidad de pago verificada','Listo para Asegurabilidad'] } } ] },
      feats:[
        { k:'Identidad', h:'Sabes quién es, de verdad', p:'Documento, antecedentes y consistencia de datos se verifican solos. Lo que un asistente tarda una mañana en llamar, el agente lo resuelve en minutos.',
          v:{ t:'steps', hd:['Identidad','90 segundos','ag'], d:{ s:[['Documento válido','registro nacional','done'],['Antecedentes','sin señales','done'],['Datos cruzados','teléfono, correo, empleador','done'],['Identidad confirmada','en 90 segundos','on']] } } },
        { k:'Capacidad', h:'Sabes si puede pagar', p:'Ingresos contra canon, obligaciones vigentes y comportamiento de pago, leídos de las fuentes — no del formulario que llenó el candidato.',
          v:{ t:'stat', hd:['Capacidad de pago','Verificada','ag'], d:{ big:'2.4×', l:'Ingresos sobre el canon', s:'obligaciones al día · sin moras 24 m.' } } },
        { k:'Veredicto', h:'Decides con score, no con corazonadas', p:'Un semáforo claro con su sustento: por qué sí, por qué no, y qué condiciones mitigarían el riesgo. Listo para pasar a la firma o a Asegurabilidad.',
          v:{ t:'doc', hd:['Estudio A-118','4 min','ag'], st:'Riesgo bajo', d:{ t:'Veredicto con sustento', l:['Score claro por candidato','Razones detalladas en el caso','Pase directo a Asegurabilidad'] } } } ],
      caps:[ ['Identidad y antecedentes','Verificación real contra fuentes, no una foto de la cédula en un chat.'],['Capacidad de pago','Ingresos, obligaciones y comportamiento leídos en minutos.'],['Score de riesgo','Un veredicto claro con sustento, por candidato.'],['Minutos, no días','El candidato bueno no se enfría esperando un estudio de 3 días.'] ],
      specs:[ ['Agente','<b>Estudio del inquilino</b> · L-AG-02'],['Tiempo por estudio','Minutos'],['Revisa','Identidad, ingresos, obligaciones, comportamiento de pago'],['Se conecta con','CRM (candidatos), Asegurabilidad'],['Entrega','Score + veredicto con sustento, listo para firma'],['Incluido en','Planes con agentes AI'] ],
      steps:[ ['El candidato llega del CRM','Con su caso ya armado: inmueble, canon y datos de contacto.'],['El agente verifica y puntúa','Identidad, capacidad y comportamiento, contra fuentes reales.'],['Firmas con el semáforo claro','Veredicto con sustento — y pase directo a Asegurabilidad.'] ],
      night:{ k:'10:21 a.m., un estudio real', h:'El estudio deja de tardar <em>tres días</em>', q:'Identidad, capacidad de pago y comportamiento en un solo veredicto — antes de que el candidato se enfríe.', logs:[ ['10:21','Solicitud de estudio · Andrés F. · CC 1.043.···'],['10:22','Identidad verificada · documento válido'],['10:23','Capacidad de pago: ingresos <span class="lb">2.4×</span> el canon'],['10:24','Señales de riesgo: ninguna'],['10:24','Veredicto: <span class="lb">riesgo bajo</span> → listo para firmar'] ] },
      cx:'Corremos un estudio real de principio a fin contigo.' },

    avaluos: { k:'Agentes AI · 03', badge:'Agente', t:'Avalúos',
      promise:'El precio correcto, con datos',
      lead:'Cada inmueble con el canon del mercado real de tu ciudad: ni sobrevalorado ni regalado.',
      win:{ t:'Leasefy · Avalúo — Apto 301, Envigado', tag:'En segundos', v:[
        { t:'ledger', hd:['Comparables','Envigado','ag'], d:{ c:['Comparable','Canon','m²'], r:[['Apto 502 · Envigado','$2.65M','70'],['Apto 218 · Envigado','$2.58M','66'],['Casa 12 · Envigado','$2.90M','84']] } },
        { t:'stat', hd:['Canon sugerido','Apto 301','ag'], d:{ big:'$2.6–2.75M', l:'Canon sugerido', s:'14 comparables reales de la zona' } },
        { t:'rows', hd:['Ajustes','Apto 301','ag'], d:{ r:[['Piso alto + balcón','+4%','ok'],['Parqueadero','+6%','ok'],['Tiempo estimado','3 semanas','mb']] } } ] },
      feats:[
        { k:'Comparables', h:'Tu zona, no promedios nacionales', p:'El agente arma el comparativo con arriendos reales del sector — mismo estrato, misma tipología, mismo momento del mercado.',
          v:{ t:'ledger', hd:['Comparables','Zona real','ag'], d:{ c:['Comparable','Canon','Estado'], r:[['Apto 502 · Envigado','$2.65M','Activo','ok'],['Apto 218 · Envigado','$2.58M','Arrendado'],['Apto 114 · Envigado','$2.70M','Activo','ok']] } } },
        { k:'Ajustes', h:'El inmueble real, no el ideal', p:'Piso, estado, parqueadero, años del edificio: cada ajuste queda explícito, para que el canon refleje lo que se está arrendando de verdad.',
          v:{ t:'rows', hd:['Ajustes aplicados','Apto 301','ag'], d:{ r:[['Piso alto + balcón','+4%','ok'],['8 años · buen estado','—'],['Parqueadero doble','+6%','ok']] } } },
        { k:'Sustento', h:'Un precio que se puede defender', p:'Cuando el propietario pida más, no discutes con opiniones: le muestras el comparativo, los ajustes y el tiempo estimado de arriendo a cada precio.',
          v:{ t:'stat', hd:['Sustento','Propietario','ag'], d:{ big:'3 sem <em>vs</em> 8+', l:'Tiempo de arriendo estimado', s:'a $2.7M vs a $3.1M · con sustento' } } } ],
      caps:[ ['Comparables de zona','Arriendos reales del sector, no promedios de portal.'],['Canon en segundos','Pides el avalúo y sale el rango con su sustento.'],['Ajustes explícitos','Estado, piso, amenidades: cada peso del ajuste se explica.'],['Historial del sector','Cómo se ha movido el precio de la zona, para conversar con datos.'] ],
      specs:[ ['Agente','<b>Avalúos</b> · L-AG-03'],['Datos','Mercado real de tu ciudad, por zona'],['Responde en','Segundos'],['Entrega','Rango de canon + comparativo + tiempo estimado'],['Se conecta con','CRM (inventario), Matching'],['Incluido en','Planes con agentes AI'] ],
      steps:[ ['Cargas el inmueble','Dirección, tipología y estado. Lo demás lo trae el agente.'],['El agente arma el comparativo','Comparables, ajustes y rango sugerido, con sustento.'],['Publicas con precio defendible','Y el propietario recibe el porqué, no una cifra suelta.'] ],
      night:{ k:'11:02 a.m., un avalúo real', h:'Ni sobrevalorado <em>ni regalado</em>', q:'Un canon anclado al mercado real de tu ciudad arrienda más rápido y discute menos.', logs:[ ['11:02','Solicitud de canon · Apto 301 · Envigado'],['11:02','14 comparables reales encontrados en la zona'],['11:03','Ajustes aplicados: piso alto, parqueadero, 8 años'],['11:03','Canon sugerido: <span class="lb">$2.6M – $2.75M</span>'],['11:04','Tiempo estimado de arriendo: 3 semanas'] ] },
      cx:'Avaluamos en vivo un inmueble tuyo, con comparables reales.' },

    conciliacion: { k:'Agentes AI · 04', badge:'Agente', t:'Conciliación',
      promise:'Cuadre contra el banco, sin Excel',
      lead:'El match entre extracto y contrato deja de ser un Excel de viernes: cada pago encuentra su contrato solo.',
      win:{ t:'Leasefy · Conciliación — Extracto de hoy', tag:'6:12 a.m.', v:[
        { t:'stat', hd:['Match','Hoy 6:12 a.m.','ag'], d:{ big:'209<em>/214</em>', l:'Match exacto automático', s:'3 ambiguas con sugerencia · 2 alertas' } },
        { t:'ledger', hd:['Extracto','214 mov.','ag'], d:{ c:['Movimiento','Contrato','Match'], r:[['$2.450.000','CT-1042','Exacto','ok'],['$1.980.000','CT-1103','Exacto','ok'],['$840.000','—','Revisar','mb']] } },
        { t:'rows', hd:['Excepciones','Hoy','ag'], d:{ r:[['Referencia ambigua','3 · sugerencia lista','mb'],['Sin identificar','2 · alerta enviada'],['Duplicados','0','ok']] } } ] },
      feats:[
        { k:'Match', h:'Banco y contratos, en la misma línea', p:'El agente lee el extracto y encuentra el contrato de cada pago: por referencia, por monto, por historia. El cuadre deja de ser un deporte de viernes.',
          v:{ t:'ledger', hd:['Match banco','Automático','ag'], d:{ c:['Movimiento','Contrato','Match'], r:[['$2.450.000','CT-1042','Exacto','ok'],['$1.980.000','CT-1103','Exacto','ok'],['$3.120.000','CT-0977','Exacto','ok']] } } },
        { k:'Excepciones', h:'Lo raro salta solo', p:'Referencias ambiguas, montos parciales, pagos duplicados: el agente los separa con una sugerencia de resolución, en vez de esconderlos en el promedio.',
          v:{ t:'rows', hd:['Excepciones','2 de 214','ag'], d:{ r:[['Ref. ambigua','Sugerencia lista','mb'],['Pago parcial','Marcado al contrato'],['Duplicado','Ninguno','ok']] } } },
        { k:'Trazabilidad', h:'Cada peso con su historia', p:'De cada movimiento del extracto puedes llegar al contrato, al cobro y al informe del propietario. Auditoría sin arqueología.',
          v:{ t:'steps', hd:['Trazabilidad','Mov. #118','ag'], d:{ s:[['Movimiento #118','extracto · 6:12 a.m.','done'],['Cobro de marzo','generado el día 1','done'],['Contrato CT-1042','canon $2.450.000','done'],['Informe al propietario','enviado ✓','done']] } } } ],
      caps:[ ['Match automático','Extracto contra contratos, todos los días, sin planilla.'],['Alertas de no identificados','Lo que no cuadra se ve hoy, no al cierre.'],['Cierre en horas','La conciliación deja de definir la fecha del cierre de mes.'],['Trazabilidad total','Del peso en el banco al contrato y al informe, en clics.'] ],
      specs:[ ['Agente','<b>Conciliación</b> · L-AG-04'],['Corre','Con cada extracto, todos los días'],['Se alimenta de','Extractos bancarios + ERP de arriendos'],['Resuelve','Match banco–contrato, referencias ambiguas, parciales'],['Escala','Solo pagos sin identificar'],['Incluido en','Planes con agentes AI'] ],
      steps:[ ['Conectas el extracto','El banco entra al sistema tal como llega.'],['El agente cruza todo','Match por referencia, monto e historia de pago.'],['Tesorería solo ve excepciones','Dos casos con sugerencia, no doscientas filas.'] ],
      night:{ k:'6:10 a.m., llega el extracto', h:'El extracto se cuadra <em>solo</em>', q:'Cada peso del extracto sabe a qué contrato pertenece — y lo que no cuadra salta de una.', logs:[ ['06:10','Extracto recibido · 214 movimientos'],['06:11','209 pagos con match exacto · <span class="lb">automático</span>'],['06:11','3 referencias ambiguas → sugerencia lista'],['06:12','2 sin identificar → alerta a tesorería'],['06:12','Conciliado: 209 de 214 · quedan 5 con gestión'] ] },
      cx:'Conciliamos un extracto real contigo en la demo.' },

    matching: { k:'Agentes AI · 05', badge:'Agente', t:'Matching',
      promise:'Opciones reales, el mismo día',
      lead:'El agente cruza necesidad, presupuesto e inventario al instante — cada interesado recibe opciones que sí aplican.',
      win:{ t:'Leasefy · Matching — Interesado M-77', tag:'Mismo día', v:[
        { t:'rows', hd:['Interesado M-77','9:31 a.m.','ag'], d:{ r:[['Necesidad','2 alcobas · Laureles'],['Presupuesto','$2.5M – $3M'],['Aplican','6 de 86','mb']] } },
        { t:'ledger', hd:['Opciones','Top 3','ag'], d:{ c:['Opción','Canon','Encaje'], r:[['Apto 402 · Laureles','$2.8M','Alto','ok'],['Casa 12 · Conquistadores','$2.9M','Alto','ok'],['Apto 118 · Estadio','$2.6M','Alterna']] } },
        { t:'chat', hd:['WhatsApp · M-77','9:33 a.m.','chat'], d:{ m:[['out','Te tengo 3 opciones que encajan con lo que buscas. ¿Agendamos visita para hoy?','9:33'],['in','¡La del 402 me gustó! ¿A las 4?','10:05']] } } ] },
      feats:[
        { k:'Cruce', h:'Inventario y necesidad, al instante', p:'Zona, presupuesto, alcobas, mascotas, fechas: el agente cruza todo contra el inventario vivo y descarta lo que no aplica antes de que nadie pierda una visita.',
          v:{ t:'rows', hd:['Cruce','M-77','ag'], d:{ r:[['Inventario vivo','86 inmuebles'],['Aplican','6 candidatos','mb'],['Descartados','Fuera de presupuesto']] } } },
        { k:'Prioridad', h:'Primero lo que sí va a cerrar', p:'No son 20 links: son 3 opciones ordenadas por probabilidad de cierre, con el porqué de cada una. El asesor sale a visitar con tiro hecho.',
          v:{ t:'ledger', hd:['Prioridad','Por cierre','ag'], d:{ c:['Opción','Encaje','Por qué'], r:[['Apto 402','Alto','zona + canon','ok'],['Casa 12','Alto','espacio + fecha','ok'],['Apto 118','Alterna','canon menor']] } } },
        { k:'Aprendizaje', h:'Cada cierre lo vuelve mejor', p:'El agente registra qué se visitó, qué gustó y qué cerró. Con cada arriendo, las próximas opciones llegan más afinadas para tu zona.',
          v:{ t:'chat', hd:['Feedback · M-77','5:05 p.m.','chat'], d:{ m:[['in','Al final el parqueadero fue lo que definió','17:05'],['out','Anotado ✓ — lo tendré en cuenta para las próximas opciones de la zona','17:06']] } } } ],
      caps:[ ['Cruce automático','Necesidad contra inventario vivo, sin repasar listas a mano.'],['Mismo día','Las opciones salen mientras el interesado sigue caliente.'],['Prioriza por cierre','Pocas opciones bien ordenadas, no un catálogo.'],['Menos visitas perdidas','El asesor visita lo que tiene probabilidad real.'] ],
      specs:[ ['Agente','<b>Matching</b> · L-AG-05'],['Responde en','El mismo día, normalmente en minutos'],['Cruza','Necesidad, presupuesto, inventario vivo'],['Se alimenta de','CRM + Avalúos'],['Mejora con','Cada arriendo cerrado'],['Incluido en','Planes con agentes AI'] ],
      steps:[ ['Llega el interesado','Del CRM, con su necesidad ya estructurada.'],['El agente cruza y prioriza','Contra el inventario vivo, con probabilidad de cierre.'],['El asesor visita con tiro hecho','Opciones enviadas, visita agendada, feedback registrado.'] ],
      night:{ k:'9:31 a.m., entra un interesado', h:'Nadie espera <em>una semana</em> por opciones', q:'El agente cruza necesidad, presupuesto e inventario al instante — y aprende de cada arriendo cerrado.', logs:[ ['09:31','Interesado nuevo · 2 alcobas · $2.5M – $3M · Laureles'],['09:31','Inventario cruzado: 6 candidatos'],['09:32','3 opciones priorizadas por probabilidad de cierre'],['09:33','Enviadas por <span class="lb">WhatsApp</span> · visita sugerida'],['17:05','Feedback registrado → aprende para la próxima'] ] },
      cx:'Cruzamos tu inventario real con casos de interesados.' },

    asegurabilidad: { k:'Agentes AI · 06', badge:'Agente', t:'Asegurabilidad',
      promise:'Contratos protegidos desde la firma',
      lead:'El agente evalúa y gestiona la asegurabilidad de cada contrato — propietarios tranquilos desde el día uno.',
      win:{ t:'Leasefy · Asegurabilidad — CT-1103', tag:'Firma hoy', v:[
        { t:'steps', hd:['CT-1103','Firma hoy','ag'], d:{ s:[['Estudio del inquilino','riesgo bajo · aprobado','done'],['Cotización en paralelo','3 aseguradoras · 12:05','done'],['Veredicto','póliza sugerida · 12:07','done'],['Cobertura activa','desde la firma','on']] } },
        { t:'ledger', hd:['Cotización','En paralelo','ag'], d:{ c:['Aseguradora','Respuesta','Tiempo'], r:[['Aseguradora A','Cotizó','2 min','ok'],['Aseguradora B','Cotizó','3 min','ok'],['Aseguradora C','Cotizó','5 min','ok']] } },
        { t:'doc', hd:['Póliza','CT-1103','ag'], st:'Aprobado ✓', d:{ t:'Póliza recomendada', l:['Mejor cobertura/costo','Activa desde la firma','Renovación vigilada'] } } ] },
      feats:[
        { k:'Evaluación', h:'Asegurable o no, antes de firmar', p:'Con el estudio del inquilino en la mano, el agente evalúa la asegurabilidad del contrato antes de que se firme — no cuando ya hay un problema.',
          v:{ t:'steps', hd:['Evaluación','CT-1103','ag'], d:{ s:[['Estudio recibido','riesgo bajo','done'],['Canon vs cobertura','dentro de póliza','done'],['Evaluación','asegurable','on']] } } },
        { k:'Gestión', h:'Las aseguradoras cotizan a la vez', p:'Nada de mandar correos uno por uno: las aseguradoras integradas cotizan en paralelo y llega un veredicto listo para firmar.',
          v:{ t:'ledger', hd:['Aseguradoras','Paralelo','ag'], d:{ c:['Aseguradora','Respuesta','Tiempo'], r:[['Aseguradora A','Cotizó','2 min','ok'],['Aseguradora B','Cotizó','3 min','ok'],['Recomendada','Mejor c/c','—','mb']] } } },
        { k:'Vigencia', h:'Renovaciones que avisan solas', p:'Las pólizas no se vencen en silencio: el agente avisa con tiempo, gestiona la renovación y deja el rastro en el contrato.',
          v:{ t:'rows', hd:['Vigencias','Cartera','ag'], d:{ r:[['Pólizas activas','198','ok'],['Por renovar','4 · avisadas','mb'],['Vencidas sin gestión','0','ok']] } } } ],
      caps:[ ['Evaluación por contrato','Cada firma pasa por su filtro de asegurabilidad, sin excepción.'],['Cotización integrada','Aseguradoras en paralelo, veredicto en minutos.'],['Cobertura desde la firma','El contrato nace protegido, no queda en trámite.'],['Alertas de renovación','Vencimientos avisados con tiempo, gestionados y registrados.'] ],
      specs:[ ['Agente','<b>Asegurabilidad</b> · L-AG-06'],['Evalúa','Cada contrato antes de la firma'],['Cotiza con','Aseguradoras integradas, en paralelo'],['Se conecta con','Estudio del inquilino, ERP'],['Avisa','Vencimientos y renovaciones, con tiempo'],['Incluido en','Planes con agentes AI'] ],
      steps:[ ['El contrato llega del CRM','Con el estudio del inquilino ya resuelto.'],['El agente evalúa y cotiza','Aseguradoras en paralelo, veredicto listo para firma.'],['Se firma con cobertura activa','Y las renovaciones quedan vigiladas desde el día uno.'] ],
      night:{ k:'12:04 p.m., contrato nuevo', h:'El propietario duerme <em>tranquilo</em>', q:'Cada contrato se firma con su protección resuelta — y las renovaciones no se vencen en silencio.', logs:[ ['12:04','Contrato nuevo · CT-1103 → evaluación'],['12:05','Cotizado con 3 aseguradoras a la vez'],['12:07','Veredicto: <span class="lb">aprobado</span> · póliza sugerida'],['12:08','Cobertura activa desde la firma'],['—30 d','Renovación: avisada sola, antes de vencer'] ] },
      cx:'Evaluamos la asegurabilidad de un contrato tuyo en vivo.' }
  };
  var TEXOF = { crm:'t2', erp:'t5', cobranza:'t1', inquilino:'t4', avaluos:'t7', conciliacion:'t6', matching:'t3', asegurabilidad:'t6' };
  var ppRevealBound = false;
  function ppMark(){
    var host = document.getElementById('productPage');
    if(!host){ return; }
    var lim = host.clientHeight * 0.94;
    var items = host.querySelectorAll('.pp-shead:not(.pin),.pp-story:not(.pin),.pp-cap:not(.pin),.pp-step:not(.pin),.pp-spec .sr:not(.pin),.pp-npanel:not(.pin)');
    for(var i4 = 0; i4 < items.length; i4++){
      var r4 = items[i4].getBoundingClientRect();
      if(r4.top < lim && r4.bottom > -20){ items[i4].classList.add('pin'); }
    }
  }
  function ppReveal(){
    var host = document.getElementById('productPage');
    if(!host){ return; }
    var items = host.querySelectorAll('.pp-shead,.pp-story,.pp-cap,.pp-step,.pp-spec .sr,.pp-npanel');
    Array.prototype.forEach.call(items, function(el, i3){
      el.classList.remove('pin');
      el.style.setProperty('--pi', (i3 % 5) * 0.06 + 's');
    });
    if(!ppRevealBound){
      ppRevealBound = true;
      var tick = false;
      host.addEventListener('scroll', function(){
        if(tick){ return; }
        tick = true;
        requestAnimationFrame(function(){ tick = false; ppMark(); });
      }, {passive:true});
      W('resize', ppMark);
    }
    ppMark();
    setTimeout(ppMark, 400);
    setTimeout(ppMark, 1200);
  }
  var SHV = { sys:'sh-erp', ag:'sh-agent', chat:'sh-chat' };
  function vgHead(hd){
    return '<div class="schead ' + (SHV[hd[2]] || 'sh-chat') + '"><span class="shl"><span class="adot pingw"><span class="pinga"></span><span class="pingb"></span></span><span class="shm">' + hd[0] + '</span></span><span class="shr">' + (hd[1] || '') + '</span></div>';
  }
  function vgCard(v, inner){
    return '<div class="scard vgc">' + vgHead(v.hd) + '<div class="scbody">' + inner + '</div>' + (v.st ? '<span class="stamp sm">' + v.st + '</span>' : '') + '</div>';
  }
  var VG = {
    rows: function(dd){
      var hh = '';
      dd.r.forEach(function(rr){ hh += '<div class="srow"><span>' + rr[0] + '</span><b class="' + (rr[2] || '') + '">' + rr[1] + '</b></div>'; });
      return hh;
    },
    chat: function(dd){
      var hh = '<div class="pchat">';
      dd.m.forEach(function(mm){
        var out = mm[0] === 'out';
        hh += '<div class="pb ' + (out ? 'pbb' : 'pba') + '">' + mm[1] + '</div>' + (mm[2] ? '<div class="pmeta' + (out ? '' : ' pml') + '">' + mm[2] + '</div>' : '');
      });
      return hh + '</div>';
    },
    steps: function(dd){
      var hh = '<div class="vg-steps">';
      dd.s.forEach(function(ss){ hh += '<div class="st ' + (ss[2] || '') + '"><span class="dot"></span><div><b>' + ss[0] + '</b>' + (ss[1] ? '<span>' + ss[1] + '</span>' : '') + '</div></div>'; });
      return hh + '</div>';
    },
    stat: function(dd){
      return '<div class="vg-stat"><span class="big">' + dd.big + '</span><span class="lb2">' + dd.l + '</span>' + (dd.s ? '<span class="sb">' + dd.s + '</span>' : '') + '</div>';
    },
    ledger: function(dd){
      var hh = '<div class="vg-ledger"><div class="lgr lgh"><span>' + dd.c[0] + '</span><span>' + dd.c[1] + '</span><span>' + dd.c[2] + '</span></div>';
      dd.r.forEach(function(rr){ hh += '<div class="lgr"><b>' + rr[0] + '</b><span>' + rr[1] + '</span><span class="' + (rr[3] || '') + '">' + rr[2] + '</span></div>'; });
      return hh + '</div>';
    },
    doc: function(dd){
      var hh = '<div class="vg-doc"><h4>' + dd.t + '</h4><div class="dl">';
      dd.l.forEach(function(xx){ hh += '<span>' + xx + '</span>'; });
      return hh + '</div></div>';
    }
  };
  function vgOne(v){ return v && VG[v.t] ? vgCard(v, VG[v.t](v.d)) : ''; }
  window.__renderProduct = function(slug){
    var d = PRODUCTS[slug] || PRODUCTS.crm;
    var set = function(id, v){ var el = document.getElementById(id); if(el){ el.textContent = v; } };
    var seth = function(id, v){ var el = document.getElementById(id); if(el){ el.innerHTML = v; } };
    set('ppK', d.k);
    set('ppBadge', d.badge);
    set('ppL', d.lead);
    seth('ppT', d.promise + '<span class="cp-dot">.</span>');
    var ptex = TEXOF[slug] || 't5';
    seth('ppCover', '<span class="bg ' + ptex + '"></span><span class="cshade"></span><i>' + d.k + '</i><b>' + d.t + '</b>');
    var nbg = document.getElementById('ppNbg');
    if(nbg){ nbg.className = 'bg ' + ptex; }
    seth('ppArt', '<div class="pp-win"><div class="wbar"><span class="wt"><span class="wdots"><i></i><i></i><i></i></span>' + d.win.t + '</span><span class="wtag">' + d.win.tag + '</span></div><div class="wbody">' + d.win.v.map(vgOne).join('') + '</div></div>');
    var fx = '';
    d.feats.forEach(function(f2, fi){
      fx += '<div class="pp-story' + (fi % 2 === 1 ? ' alt' : '') + '"><div><p class="sk">' + f2.k + '</p><h3>' + f2.h + '</h3><p>' + f2.p + '</p></div>' +
            '<div class="pp-pane">' + vgOne(f2.v) + '</div></div>';
    });
    seth('ppFeats', fx);
    var cpx = '';
    d.caps.forEach(function(c2, ci){ cpx += '<div class="pp-cap"><i>C-0' + (ci + 1) + '</i><b>' + c2[0] + '</b><p>' + c2[1] + '</p></div>'; });
    seth('ppCaps', cpx);
    var spx = '';
    d.specs.forEach(function(s5){ spx += '<div class="sr"><span class="sk">' + s5[0] + '</span><span class="sv">' + s5[1] + '</span></div>'; });
    seth('ppSpecs', spx);
    var stx = '';
    d.steps.forEach(function(s6, si){ stx += '<div class="pp-step"><i>Paso 0' + (si + 1) + '</i><b>' + s6[0] + '</b><p>' + s6[1] + '</p></div>'; });
    seth('ppSteps', stx);
    set('ppNK', d.night.k);
    seth('ppNH', d.night.h);
    set('ppNW', (d.night.logs[0] && d.night.logs[0][0]) || '');
    var lgx = '<div class="lh"><span>Registro de actividad · ' + d.t + '</span><b>En vivo</b></div>';
    d.night.logs.forEach(function(l2){ lgx += '<div class="lr"><span class="lt">' + l2[0] + '</span><span>' + l2[1] + '</span></div>'; });
    seth('ppLog', lgx);
    set('ppNQ', d.night.q);
    set('ppCX', d.cx);
    var ox = document.getElementById('ppO');
    if(ox){
      ox.innerHTML = '';
      Object.keys(PRODUCTS).forEach(function(s2){
        if(s2 === slug) return;
        var o2 = PRODUCTS[s2];
        var a2 = document.createElement('a');
        a2.href = '#/p/' + s2;
        a2.innerHTML = '<span class="otx"><i>' + o2.k + '</i><span>' + o2.t + '</span></span><span class="oth ' + (TEXOF[s2] || 't5') + '"></span>';
        ox.appendChild(a2);
      });
    }
    if(window.__stripAnchors){ window.__stripAnchors(document.getElementById('productPage')); }
    ppReveal();
  };
  /* Cierre de las internas: el banner del video y el footer reales, clonados y saneados */
  (function(){
    var pp = document.getElementById('productPage');
    var end2 = document.getElementById('ppEnd');
    var srcB = document.querySelector('#contacto .banner');
    var srcF = document.querySelector('footer');
    if(!pp || !end2 || !srcB || !srcF){ return; }
    var wrap = document.createElement('div');
    wrap.className = 'pp-close';
    var inner = document.createElement('div');
    inner.className = 'container';
    var b2 = srcB.cloneNode(true);
    b2.removeAttribute('data-reveal');
    b2.classList.add('in');
    Array.prototype.forEach.call(b2.querySelectorAll('[data-reveal]'), function(el){ el.removeAttribute('data-reveal'); el.classList.add('in'); });
    Array.prototype.forEach.call(b2.querySelectorAll('.words'), function(el){ el.classList.add('in'); });
    var v2 = b2.querySelector('.banner-video');
    if(v2){ v2.removeAttribute('id'); }
    inner.appendChild(b2);
    wrap.appendChild(inner);
    var f2 = srcF.cloneNode(true);
    Array.prototype.forEach.call(f2.querySelectorAll('[id]'), function(el){ el.removeAttribute('id'); });
    Array.prototype.forEach.call(f2.querySelectorAll('[data-reveal]'), function(el){ el.removeAttribute('data-reveal'); el.classList.add('in'); });
    var wm2 = f2.querySelector('.wm');
    if(wm2){ wm2.classList.add('in'); }
    var ft2 = f2.querySelector('.ftop');
    if(ft2){ ft2.setAttribute('href', '#top'); }
    end2.appendChild(wrap);
    end2.appendChild(f2);
    if(v2){
      var armClone = function(){
        if(v2.src){ return; }
        var s0 = document.getElementById('bvid');
        var real = (s0 && s0.src) ? s0.src : v2.getAttribute('data-vsrc');
        if(!real){ return; }
        v2.src = real;
        v2.removeAttribute('data-vsrc');
        if(!rm){ setTimeout(function(){ b2.classList.add('vdone'); }, 13200); }
        else { b2.classList.add('vdone'); }
      };
      if('IntersectionObserver' in window){
        var vio3 = new IntersectionObserver(function(es){
          if(es[0] && es[0].isIntersecting){ armClone(); vio3.disconnect(); }
        }, { root: pp, threshold: 0.1 });
        vio3.observe(b2);
      } else { armClone(); }
    }
    if(window.__stripAnchors){ window.__stripAnchors(end2); }
  })();
  if(window.__pendingProduct){ window.__renderProduct(window.__pendingProduct); window.__pendingProduct = null; }
  D('keydown', function(e){
    if(e.key === 'Escape'){
      document.documentElement.classList.remove('pm-open', 'contact-open', 'blog-open', 'product-open');
      if(window.__syncHdr){ window.__syncHdr(); }
    }
  });
  D('click', function(e){
    var root = document.documentElement;
    if(!root.classList.contains('pm-open')) return;
    var inMenu = e.target.closest ? (e.target.closest('#pmenu') || e.target.closest('#pmTrigger')) : null;
    if(!inMenu){ root.classList.remove('pm-open'); }
  });
  var bpTabs = document.getElementById('bpTabs');
  if(bpTabs){
    bpTabs.addEventListener('click', function(e){
      var b = e.target.closest ? e.target.closest('button[data-f]') : null;
      if(!b) return;
      Array.prototype.forEach.call(bpTabs.children, function(c){ c.classList.remove('on'); });
      b.classList.add('on');
      var f = b.getAttribute('data-f');
      Array.prototype.forEach.call(document.querySelectorAll('#blogPage [data-cat]'), function(card){
        var show = f === '*' || card.getAttribute('data-cat') === f;
        card.classList.toggle('bp-hidden', !show);
        if(show){ card.classList.remove('bp-pop'); void card.offsetWidth; card.classList.add('bp-pop'); }
      });
    });
  }
  var chipBox = document.getElementById('cfChips');
  if(chipBox){
    chipBox.addEventListener('click', function(e){
      var b = e.target.closest ? e.target.closest('button[data-v]') : null;
      if(!b) return;
      Array.prototype.forEach.call(chipBox.children, function(c){ c.classList.remove('on'); });
      b.classList.add('on');
      window.__cfChip = b.getAttribute('data-v');
    });
  }
  Array.prototype.forEach.call(document.querySelectorAll('#planes .plc, #blogPage .bp-card, #blogPage .bp-feat'), function(c){
    c.addEventListener('pointermove', function(e){
      var r = c.getBoundingClientRect();
      c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      c.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll('#como-funciona .hstep'), function(st){
    st.addEventListener('click', function(){
      var r = st.getBoundingClientRect();
      var jy = window.pageYOffset + r.top + r.height / 2 - window.innerHeight / 2;
      if(window.__glide){ window.__glide(jy); }
      else { window.scrollTo(0, jy); }
    });
  });

  /* Fase 1: motor de scroll propio DESACTIVADO — el app usa Lenis global.
     __glide usa scroll nativo suave; los scrubbers siguen el 'scroll' de Lenis. */
  (function(){
    window.__glide = function(y){
      try{ window.scrollTo({ top: Math.max(0, y), behavior: rm ? 'auto' : 'smooth' }); }
      catch(_e){ window.scrollTo(0, Math.max(0, y)); }
    };
  })();

  /* Video del cierre (WebP animado, autoplay garantizado): corre una vez y funde a la foto */
  (function(){
    var bn = document.querySelector('#contacto .banner');
    var v = document.getElementById('bvid');
    if(!bn || !v) return;
    if(rm){ bn.classList.add('vdone'); return; }
    var VDUR = 13200, fired = false;
    function finish(){ if(!fired){ fired = true; bn.classList.add('vdone'); } }
    v.addEventListener('load', function(){ setTimeout(finish, VDUR); });
    v.addEventListener('error', finish);
    function arm(){
      if(v.src) return;
      v.src = v.getAttribute('data-vsrc');
      v.removeAttribute('data-vsrc');
    }
    if('IntersectionObserver' in window){
      var vio2 = new IntersectionObserver(function(es){
        if(es[0] && es[0].isIntersecting){ arm(); vio2.disconnect(); }
      }, {threshold: 0.2, rootMargin: '0px 0px 15% 0px'});
      vio2.observe(bn);
    } else { arm(); }
  })();

  function clamp01(v){ return Math.min(1, Math.max(0, v)); }
  function setLine(l, t){
    l.style.setProperty('--k', t);
    l.style.color = 'rgba(244,241,234,' + (0.32 - 0.16 * t).toFixed(3) + ')';
  }
  function setFin(t){
    fin.style.opacity = t;
    fin.style.transform = 'translateY(' + (14 * (1 - t)).toFixed(2) + 'px)';
    sub.style.opacity = t;
  }

  if(rm){
    lines.forEach(function(l){ setLine(l, 1); });
    setFin(1);
    document.body.classList.add('oc-arrived');
    document.body.classList.add('hw-case');
    document.body.classList.add('ag-case');
    document.body.classList.add('fin-case');
    document.body.classList.add('tst-case');
    var ft0 = document.querySelector('#finanzas .fototal');
    if(ft0){ ft0.style.opacity = 1; }
    var rf0 = document.getElementById('rfill');
    if(rf0){ rf0.style.height = '100%'; }
    return;
  }

  tall.classList.add('on');
  shell.style.transformOrigin = 'center bottom';
  if(arqTall){ document.body.classList.add('arq-on'); }
  var STEP = 0.13, FINS = 0.70, FINE = 0.90; /* 5 tachados de 0 a .65, cierre de .70 a .90 */

  function update(){
    var vh = window.innerHeight;
    var r = tall.getBoundingClientRect();
    var total = r.height - vh;
    var p = total > 0 ? clamp01(-r.top / total) : 1;
    lines.forEach(function(l, i){
      setLine(l, clamp01((p - i * STEP) / STEP));
    });
    setFin(clamp01((p - FINS) / (FINE - FINS)));
    /* soltada: el panel se comprime un pelo antes de liberar el anclaje */
    var rel = clamp01((p - 0.92) / 0.08);
    shell.style.transform = 'scale(' + (1 - 0.02 * rel).toFixed(4) + ')';

    /* diagramas de las capas: se dibujan y retraen con el scroll */
    if(!diagSet){
      var ds = document.querySelectorAll('#arquitectura .diag');
      if(ds.length){
        diagSet = [];
        Array.prototype.forEach.call(ds, function(svg, k){
          svg.classList.add('scrub');
          var parts = svg.querySelectorAll('.dp,.ddot,.dnode');
          var n = parts.length;
          Array.prototype.forEach.call(parts, function(el, j){
            diagSet.push({
              el: el,
              dash: el.classList.contains('dp'),
              s: k * 0.18 + (n > 1 ? j / (n - 1) : 0) * 0.35
            });
          });
        });
      }
    }
    if(diagSet && diagSet.length){
      var d0 = diagSet[0].el.ownerSVGElement.getBoundingClientRect();
      var P = (vh * 0.95 - d0.top) / (vh * 0.45);
      diagSet.forEach(function(it){
        var t = clamp01((P - it.s) / 0.35);
        if(it.dash){ it.el.style.strokeDashoffset = (1 - t).toFixed(4); }
        else{ it.el.style.transform = 'scale(' + t.toFixed(4) + ')'; }
      });
    }

    /* zoom cinematográfico: la cámara entra a la capa 03 */
    if(arqTall){
      var ar = arqTall.getBoundingClientRect();
      if(!cols.length){ cols = Array.prototype.slice.call(document.querySelectorAll('#arquitectura .lcol')); }
      cols.forEach(function(c, k){
        var cr = c.getBoundingClientRect();
        var ent = clamp01((vh * 0.94 - (cr.top - (c.__ty || 0))) / (vh * 0.14) - k * 0.5);
        var ey = 22 * (1 - ent);
        c.__ty = ey;
        c.style.transform = 'translateY(' + ey.toFixed(1) + 'px)';
        c.style.opacity = ent.toFixed(3);
      });
      var zp = 0;
      if(arqStick && window.innerWidth >= 1024){
        var travel = ar.height - arqStick.offsetHeight;
        zp = travel > 40 ? clamp01(-ar.top / travel) : 0;
        var zt = zp < 0.5 ? 2 * zp * zp : 1 - Math.pow(-2 * zp + 2, 2) / 2;
        if(zp > 0 && cols.length === 3){
          if(!zoomC){
            var h3z = cols[2].querySelector('h3');
            var fr3 = (h3z || cols[2]).getBoundingClientRect();
            var sr0 = arqStick.getBoundingClientRect();
            zoomC = { ox: fr3.left + fr3.width / 2 - sr0.left, oy: fr3.top + fr3.height / 2 - sr0.top, h3: h3z, lx: 0, ly: 0, ls: 1 };
            arqStick.style.transformOrigin = zoomC.ox.toFixed(1) + 'px ' + zoomC.oy.toFixed(1) + 'px';
          }
          var sr = arqStick.getBoundingClientRect();
          var baseL = sr.left - zoomC.lx + zoomC.ox * (zoomC.ls - 1);
          var baseT = sr.top - zoomC.ly + zoomC.oy * (zoomC.ls - 1);
          var pt = clamp01(zt / 0.45); /* la cámara se engancha al título temprano y luego solo empuja */
          var zs = 1 + 1.35 * zt;
          var ztx = (window.innerWidth / 2 - (baseL + zoomC.ox)) * pt;
          var zty = (vh * 0.45 - (baseT + zoomC.oy)) * pt;
          zoomC.lx = ztx; zoomC.ly = zty; zoomC.ls = zs;
          arqStick.style.transform = 'translate(' + ztx.toFixed(1) + 'px,' + zty.toFixed(1) + 'px) scale(' + zs.toFixed(4) + ')';
          arqStick.style.opacity = (1 - clamp01((zt - 0.7) / 0.3)).toFixed(3);
          if(zoomC.h3){ zoomC.h3.style.setProperty('--zk', clamp01(zt / 0.68).toFixed(3)); }
        } else if(arqStick.style.transform){
          arqStick.style.transform = '';
          arqStick.style.opacity = '';
          if(zoomC){
            zoomC.lx = 0; zoomC.ly = 0; zoomC.ls = 1;
            if(zoomC.h3){ zoomC.h3.style.setProperty('--zk', 0); }
          }
        }
      }
      document.body.classList.toggle('arq-hand', zp > 0.05);
    }

    /* entrada: los titulares se arman palabra a palabra con el scroll */
    ENTR.forEach(function(s){
      if(!s.h2){ s.h2 = document.querySelector(s.sel + ' .h-big'); if(!s.h2) return; }
      if(!s.wis.length){ s.wis = Array.prototype.slice.call(s.h2.querySelectorAll('.wi')); }
      var pr = s.h2.getBoundingClientRect();
      var en = clamp01((vh * 1.02 - pr.top) / (vh * 0.62));
      var nW = s.wis.length || 1;
      s.wis.forEach(function(w, i){
        var wt = clamp01((en - (i / nW) * 0.68) / 0.32);
        w.style.transform = 'translateY(' + ((1 - wt) * 115).toFixed(1) + '%)';
      });
      if(s.lead === null){ s.lead = document.querySelector(s.sel + ' .archlead') || false; }
      if(s.lead){
        var el2 = clamp01((en - 0.6) / 0.4);
        s.lead.style.opacity = el2.toFixed(3);
        s.lead.style.transform = 'translateY(' + (22 * (1 - el2)).toFixed(1) + 'px)';
      }
      if(s.ignite){ document.body.classList.toggle(s.ignite, en >= 1); }
    });

    /* producto: el titular se deletrea desde que asoma; el bento espera su turno */
    if(pdTall){
      if(!pdChars.length){ splitChars('#producto .h-big', pdChars); }
      var pdr = pdTall.getBoundingClientRect();
      var ptr = pdr.height - vh;
      var pre = vh * 0.55; /* el deletreo arranca durante la aproximación, no en blanco */
      var pen = ptr > 40 ? clamp01((pre - pdr.top) / (pre + ptr)) : clamp01((vh * 0.9 - pdr.top) / (vh * 0.5));
      var nC = pdChars.length;
      for(var ci = 0; ci < nC; ci++){
        var ct = clamp01((pen * 1.5 * nC - ci) / 2);
        var cs = pdChars[ci].style;
        cs.opacity = ct.toFixed(3);
        cs.transform = ct >= 1 ? 'none' : 'translateY(' + (0.12 * (1 - ct)).toFixed(3) + 'em)';
      }
      if(pdLead === null){ pdLead = document.querySelector('#producto .archlead') || false; }
      if(pdLead){
        var plt = clamp01((pen - 0.7) / 0.16);
        pdLead.style.opacity = plt.toFixed(3);
        pdLead.style.transform = 'translateY(' + (18 * (1 - plt)).toFixed(1) + 'px)';
      }
      document.body.classList.toggle('ag-case', pen >= 0.9);
    }

    /* el mazo: las cuatro celdas se apilan en un solo expediente */
    if(bentoEl === null){ bentoEl = document.querySelector('#producto .bento') || false; }
    if(bentoEl){
      if(!bcells.length){ bcells = Array.prototype.slice.call(bentoEl.querySelectorAll('.bcell')); }
      var bb = bentoEl.getBoundingClientRect();
      var xp = clamp01((vh * 0.78 - bb.bottom) / (vh * 0.6));
      var xe = xp < 0.5 ? 2 * xp * xp : 1 - Math.pow(-2 * xp + 2, 2) / 2;
      var bcx = bb.left + bb.width / 2;
      var bcy = bb.top + bb.height / 2;
      var ROT = [-3.2, 2.4, -1.6, 3.0, -2.2, 1.8];
      bcells.forEach(function(b, k){
        var br2 = b.getBoundingClientRect();
        var bent = clamp01((vh * 0.94 - (br2.top - (b.__ty || 0))) / (vh * 0.14) - k * 0.3);
        var baseCx = br2.left + br2.width / 2 - (b.__tx || 0);
        var baseCy = br2.top + br2.height / 2 - (b.__ty || 0);
        var btx = (bcx - baseCx) * xe;
        var bty = 24 * (1 - bent) + (bcy - baseCy) * xe;
        b.__tx = btx; b.__ty = bty;
        b.style.transform = 'translate(' + btx.toFixed(1) + 'px,' + bty.toFixed(1) + 'px) rotate(' + (ROT[k % 6] * xe).toFixed(2) + 'deg) scale(' + (1 - 0.16 * xe).toFixed(4) + ')';
        b.style.opacity = (bent * (1 - clamp01((xp - 0.68) / 0.32) * 0.9)).toFixed(3);
      });
    }

    /* finanzas: la ecuación se salda tarjeta a tarjeta, la barra nunca se desnivela */
    if(!foRows.length){ foRows = Array.prototype.slice.call(document.querySelectorAll('#finanzas .forow')); }
    foRows.forEach(function(r, rk){
      var fr = r.getBoundingClientRect();
      var ft = clamp01((vh * 0.92 - fr.top) / (vh * 0.2) - rk * 0.16);
      r.style.setProperty('--fk', ft.toFixed(3));
      r.style.opacity = (0.25 + 0.75 * ft).toFixed(3);
      if(!r.__sp){ r.__sp = r.querySelector('span'); }
      if(r.__sp){ r.__sp.style.color = 'rgba(17,17,17,' + (0.4 + 0.6 * ft).toFixed(3) + ')'; }
    });

    /* finanzas: la lámina negra dispensa la pantalla por su borde inferior */
    if(finPanel === null){ finPanel = document.querySelector('#finanzas .fscreen') || false; }
    if(finPanel){
      if(!finPanel.__o){ finPanel.__o = 1; finPanel.style.transformOrigin = '50% 0%'; finPanel.style.opacity = '1'; }
      if(sheetEl === null){ sheetEl = document.querySelector('.dark-sec[data-sheet]') || false; }
      var fpr = finPanel.getBoundingClientRect();
      var fBaseTop = fpr.top - (finPanel.__ty || 0);
      var fH = finPanel.offsetHeight;
      var shB = sheetEl ? sheetEl.getBoundingClientRect().bottom : -1e9;
      var dspP = clamp01((vh * 0.92 - shB) / (vh * 0.6));
      var dspE = dspP < 0.5 ? 2 * dspP * dspP : 1 - Math.pow(-2 * dspP + 2, 2) / 2;
      var hiddenTy = Math.min(0, (shB - 12 - fH) - fBaseTop);
      var fy2 = hiddenTy * (1 - dspE);
      finPanel.__ty = fy2;
      finPanel.style.transform = 'perspective(1200px) translateY(' + fy2.toFixed(1) + 'px) rotateX(' + (10 * (1 - dspE)).toFixed(2) + 'deg) scale(' + (0.96 + 0.04 * dspE).toFixed(4) + ')';
    }
    if(finTotal === null){ finTotal = document.querySelector('#finanzas .fototal') || false; }
    if(finTotal){
      var ftr = finTotal.getBoundingClientRect();
      var ft3 = clamp01((vh * 0.9 - ftr.top) / (vh * 0.14));
      finTotal.style.opacity = ft3.toFixed(3);
    }

    /* banner final: entra escalando, esquinas afinándose y contenido en parallax */
    if(bannerEl === null){
      bannerEl = document.querySelector('#contacto .banner') || false;
      bannerIn = bannerEl ? bannerEl.querySelector('.banner-in') : false;
    }
    if(bannerEl){
      var bbr = bannerEl.getBoundingClientRect();
      var bpv = clamp01((vh - bbr.top) / (vh * 0.55));
      var bpe = bpv < 0.5 ? 2 * bpv * bpv : 1 - Math.pow(-2 * bpv + 2, 2) / 2;
      bannerEl.style.transform = 'none';
      bannerEl.style.opacity = (0.4 + 0.6 * bpe).toFixed(3);
      if(bannerIn){ bannerIn.style.transform = 'translateY(' + (34 * (1 - bpe)).toFixed(1) + 'px)'; }
    }

    /* cómo funciona: el titular voltea carácter a carácter, como tablero de ruta */
    if(!hwH2){ hwH2 = document.querySelector('#como-funciona .h-big') || false; }
    if(hwH2){
      if(!hwChars.length){ splitChars('#como-funciona .h-big', hwChars); }
      if(!hwOr && hwChars.length){
        hwOr = 1;
        hwChars.forEach(function(s){ s.style.transformOrigin = '50% 85%'; });
      }
      var hr2 = hwH2.getBoundingClientRect();
      var hen = clamp01((vh - hr2.top) / (vh * 0.55));
      var nH = hwChars.length;
      for(var hi = 0; hi < nH; hi++){
        var ht = clamp01((hen * 1.4 * nH - hi) / 2.2);
        var hs = hwChars[hi].style;
        hs.opacity = Math.min(1, ht * 2).toFixed(3);
        hs.transform = ht >= 1 ? 'none' : 'perspective(620px) rotateX(' + (-88 * (1 - ht)).toFixed(1) + 'deg)';
      }
      if(hwLeadEl === null){ hwLeadEl = document.querySelector('#como-funciona .archlead') || false; }
      if(hwLeadEl){
        var hlt = clamp01((hen - 0.66) / 0.22);
        hwLeadEl.style.opacity = hlt.toFixed(3);
        hwLeadEl.style.transform = 'translateY(' + (18 * (1 - hlt)).toFixed(1) + 'px)';
      }
      if(hwStage === null){ hwStage = document.querySelector('#como-funciona .hwstage') || false; }
      if(hwStage){
        var srSt = hwStage.getBoundingClientRect();
        var sst = clamp01((vh * 0.92 - (srSt.top - (hwStage.__ty || 0))) / (vh * 0.22));
        var sty = 40 * (1 - sst);
        hwStage.__ty = sty;
        hwStage.style.opacity = sst.toFixed(3);
        hwStage.style.transform = 'translateY(' + sty.toFixed(1) + 'px) scale(' + (0.975 + 0.025 * sst).toFixed(4) + ')';
      }
      document.body.classList.toggle('hw-case', hen >= 0.96);
    }

    /* riel: cada etapa entra y se acopla a la espina */
    if(!hSteps.length){ hSteps = Array.prototype.slice.call(document.querySelectorAll('#como-funciona .hstep')); }
    hSteps.forEach(function(st){
      var sr2 = st.getBoundingClientRect();
      var et = clamp01((vh * 0.96 - (sr2.top - (st.__ty || 0))) / (vh * 0.16));
      var ty3 = 34 * (1 - et);
      st.__ty = ty3;
      st.style.transform = 'translateY(' + ty3.toFixed(1) + 'px)';
      st.style.opacity = et.toFixed(3);
    });

    /* riel del caso: el progreso azul se dibuja continuo con el scroll */
    if(hwRail === null){ hwRail = document.querySelector('#como-funciona .hwrail') || false; }
    if(hwRail){
      if(hwFill === null){ hwFill = document.getElementById('rfill') || false; }
      if(hwFill){
        var hr = hwRail.getBoundingClientRect();
        var rp = clamp01((vh * 0.5 - (hr.top + 36)) / (hr.height - 72));
        hwFill.style.height = (rp * 100).toFixed(2) + '%';
        if(hwBarEl === null){ hwBarEl = document.getElementById('hwfill') || false; }
        if(hwBarEl){ hwBarEl.style.transform = 'scaleX(' + Math.max(0.04, rp).toFixed(4) + ')'; }
      }
    }

    /* eclipse: el punto 06 se dilata, cubre, y se funde en la silueta de la lámina */
    if(!nightEl){ nightEl = document.getElementById('nightBirth'); }
    if(nightEl){
      if(sheetEl === null){ sheetEl = document.querySelector('.dark-sec[data-sheet]') || false; }
      if(!dot6 && hSteps.length){ dot6 = hSteps[hSteps.length - 1].querySelector('.hdot') || false; }
      if(sheetEl && dot6){
        var shr = sheetEl.getBoundingClientRect();
        var br = clamp01((vh * 0.95 - shr.top) / (vh * 0.4));
        var ph2 = clamp01((vh * 0.12 - shr.top) / (vh * 0.24));
        if(br <= 0 || ph2 >= 1){
          nightEl.style.opacity = 0;
        } else {
          var be = br < 0.5 ? 2 * br * br : 1 - Math.pow(-2 * br + 2, 2) / 2;
          var pe = ph2 < 0.5 ? 2 * ph2 * ph2 : 1 - Math.pow(-2 * ph2 + 2, 2) / 2;
          var drc = dot6.getBoundingClientRect();
          var ncx = drc.left + drc.width / 2;
          var ncy = drc.top + drc.height / 2;
          var nrx = Math.max(ncx, window.innerWidth - ncx);
          var nry = Math.max(ncy, vh - ncy);
          var need = Math.sqrt(nrx * nrx + nry * nry) + 60;
          var dia = 10 + (need * 2 - 10) * be;
          var gx = (ncx - dia / 2) + (shr.left - (ncx - dia / 2)) * pe;
          var gy = (ncy - dia / 2) + (shr.top - (ncy - dia / 2)) * pe;
          var gw = dia + (shr.width - dia) * pe;
          var gh = dia + (shr.height - dia) * pe;
          var gr = (dia / 2) + (36 - dia / 2) * pe;
          nightEl.style.opacity = 1;
          nightEl.style.width = gw.toFixed(1) + 'px';
          nightEl.style.height = gh.toFixed(1) + 'px';
          nightEl.style.borderRadius = Math.max(36, gr).toFixed(1) + 'px';
          nightEl.style.transform = 'translate(' + gx.toFixed(1) + 'px,' + gy.toFixed(1) + 'px)';
          /* el punto es negro como la lámina que nace de él; el anillo azul
             se apaga antes de cubrir para no dejar brillo sucio sobre lo oscuro */
          var nfu = Math.max(clamp01((br - 0.62) / 0.33), clamp01(pe * 1.15));
          nightEl.style.boxShadow = '0 0 0 2px rgba(26,64,255,' + (0.35 * (1 - nfu)).toFixed(3) + '),0 0 90px 24px rgba(26,64,255,' + (0.16 * (1 - nfu)).toFixed(3) + ')';
        }

        /* revelado en foco: el titular se enfoca palabra a palabra en la oscuridad */
        var rv = clamp01((vh * 0.55 - shr.top) / (vh * 0.43));
        if(!rtWis.length){
          rtWis = Array.prototype.slice.call(document.querySelectorAll('.dark-sec[data-sheet] .rgrid h2 .wi'));
          rtLead2 = document.querySelector('.dark-sec[data-sheet] .rgrid .lead') || false;
          rtQuote = document.querySelector('.dark-sec[data-sheet] .rquote') || false;
          rtImps = Array.prototype.slice.call(document.querySelectorAll('.dark-sec[data-sheet] .impacts>div'));
          rtRows = Array.prototype.slice.call(document.querySelectorAll('.dark-sec[data-sheet] .rt>*'));
        }
        var nwR = rtWis.length || 1;
        rtWis.forEach(function(w, wi2){
          var wt2 = clamp01((rv * 1.25 - (wi2 / nwR) * 0.6) / 0.35);
          var ws = w.style;
          ws.opacity = wt2.toFixed(3);
          ws.filter = wt2 >= 1 ? 'none' : 'blur(' + (10 * (1 - wt2)).toFixed(1) + 'px)';
          ws.transform = wt2 >= 1 ? 'none' : 'translateY(' + (14 * (1 - wt2)).toFixed(1) + 'px) scale(' + (1 + 0.04 * (1 - wt2)).toFixed(4) + ')';
        });
        if(rtLead2){
          var lt2 = clamp01((rv - 0.45) / 0.25);
          rtLead2.style.opacity = lt2.toFixed(3);
          rtLead2.style.transform = 'translateY(' + (16 * (1 - lt2)).toFixed(1) + 'px)';
        }
        if(rtQuote){
          rtQuote.style.setProperty('--qk', clamp01((rv - 0.55) / 0.2).toFixed(3));
          var qt2 = clamp01((rv - 0.62) / 0.22);
          rtQuote.style.opacity = qt2.toFixed(3);
          rtQuote.style.transform = 'translateY(' + (14 * (1 - qt2)).toFixed(1) + 'px)';
        }
        rtImps.forEach(function(im, ki){
          var it2 = clamp01((rv - 0.7 - ki * 0.07) / 0.18);
          im.style.setProperty('--ik', it2.toFixed(3));
          im.style.opacity = it2.toFixed(3);
          im.style.transform = 'translateY(' + (12 * (1 - it2)).toFixed(1) + 'px)';
        });
        rtRows.forEach(function(rw, kr){
          var rt2 = clamp01((rv * 1.15 - kr * 0.09) / 0.3);
          rw.style.opacity = rt2.toFixed(3);
          rw.style.transform = 'translateY(' + (16 * (1 - rt2)).toFixed(1) + 'px)';
        });
      }
    }

    /* morph: el punto viaja hasta el highlight de «Tres capas» */
    if(!morph) return;
    if(!wal){ wal = document.querySelector('#arquitectura .h-big .wal'); }
    if(!wal || !em) return;
    var wr = wal.getBoundingClientRect();
    var bp = clamp01((vh * 1.05 - wr.top) / (vh * 0.5));
    document.body.classList.toggle('oc-arrived', bp >= 1);
    if(bp <= 0 || bp >= 1){
      morph.style.opacity = 0;
      em.style.opacity = '';
      return;
    }
    var er = em.getBoundingClientRect();
    var t = bp < 0.5 ? 2 * bp * bp : 1 - Math.pow(-2 * bp + 2, 2) / 2; /* easeInOut */
    var s0 = Math.max(8, er.width);
    var x0 = er.left + er.width / 2;
    var y0 = er.bottom - s0 * 0.7;
    var x1 = wr.left + wr.width / 2;
    var y1 = wr.top + wr.height / 2;
    var lift = Math.sin(t * Math.PI) * -0.06 * vh; /* arco leve */
    var w = s0 + (wr.width - s0) * t;
    var h = s0 + (wr.height - s0) * t;
    var x = x0 + (x1 - x0) * t;
    var y = y0 + (y1 - y0) * t + lift;
    morph.style.opacity = 1;
    morph.style.width = w.toFixed(1) + 'px';
    morph.style.height = h.toFixed(1) + 'px';
    morph.style.borderRadius = Math.max(6, (1 - t) * Math.max(w, h) / 2 + t * 10).toFixed(1) + 'px';
    morph.style.transform = 'translate(' + (x - w / 2).toFixed(1) + 'px,' + (y - h / 2).toFixed(1) + 'px)';
    em.style.opacity = String(clamp01(1 - bp * 3)); /* el punto se despega del texto */
  }

  var tick = false;
  function onScroll(){
    if(tick) return;
    tick = true;
    requestAnimationFrame(function(){ update(); tick = false; });
  }
  W('scroll', onScroll, {passive:true});
  W('resize', function(){
    zoomC = null;
    if(arqStick){ arqStick.style.transform = ''; arqStick.style.opacity = ''; arqStick.style.transformOrigin = ''; }
    onScroll();
  });
  W('load', update);
  update();
  })();


  return () => {
    killed = true;
    for (const d of disposers) { try { d(); } catch (_e) {} }
  };
}
