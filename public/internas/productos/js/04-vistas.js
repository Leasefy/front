/* ════════════════════════════════════════════════════════════════════
   Las vistas: el índice (#productos) y una interna por producto
   (#crm, #erp, #cobranza, #inquilino, #avaluos, #conciliacion, #matching,
   #asegurabilidad), cada una con la estructura de producción.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  var $ = LF.$, $$ = LF.$$, MOV = LF.MOV, root = document.documentElement;
  var PROD = window.PROD, ORDEN = window.ORDEN, ALT = window.ALT;
  var main = $("#vista"), hdr = $("#hdr"), aviso = $("#aviso"), pista = $$("#pista i");
  var vista = null, limpieza = [], avisoCerrado = false;
  var DEMO = "/contacto", PLANES = "/#planes";

  /* ── utilidades de la pantalla real ── */
  function img(src) { return "/internas/productos/img/" + src + ".webp"; }
  function tf(v) { return "translate(" + v.tx.toFixed(3) + "%," + v.ty.toFixed(3) + "%) scale(" + v.s.toFixed(4) + ")"; }
  function anillo(v, r) { return "left:" + (v.tx + r[0] * v.s).toFixed(2) + "%;top:" + (v.ty + r[1] * v.s).toFixed(2) + "%;width:" + (r[2] * v.s).toFixed(2) + "%;height:" + (r[3] * v.s).toFixed(2) + "%"; }
  /* El encuadre que nunca parte palabras (corrección del coordinador, 23-10): el acercamiento queda siempre pegado
     arriba (sin cortar líneas) y de lado sólo corta donde no hay texto: en el panel, justo en el borde del menú
     lateral (16,6 % del ancho, medido en cada captura), también con un cajón abierto encima; en los
     avalúos, en el margen blanco alrededor de la tarjeta. Si lo que cuenta la historia no cabe así, no se acerca:
     la pantalla queda entera y el marco señala la parte. */
  var CENTRO = /ava-(comparables|canon|estado|tiempo)$/, ENTERA = /ctr-respaldo$/;
  function encuadre(src, r) {
    var bajo = r[1] + r[3], s;
    if (ENTERA.test(src)) return { s: 1, tx: 0, ty: 0, ox: 0 };
    if (CENTRO.test(src)) { s = Math.min(1.35, 100 / bajo); if (s < 1.05) s = 1; return { s: s, tx: 50 - 50 * s, ty: 0, ox: 50 }; }
    /* panel o cajón abierto: el borde izquierdo cae justo en el borde del menú lateral (100 − 100/1,2 = 16,67 %) */
    s = 100 / bajo >= 1.2 ? 1.2 : 1;
    return { s: s, tx: 100 - 100 * s, ty: 0, ox: 100 };
  }
  function laptop(inner, id) {
    return '<div class="disp laptop"' + (id ? ' id="' + id + '"' : "") + '><div class="marco"><span class="camara"></span><span class="isla"></span><div class="pantalla">' + inner + '</div></div><span class="base"></span></div>';
  }
  function recorte(r) {
    var v = encuadre(r[0], r[1]);
    return '<div class="recorte"><div class="capa" style="transform:' + tf(v) + '"><img class="on" src="' + img(r[0]) + '" alt="' + (ALT[r[0]] || "") + '" loading="lazy" decoding="async"></div><span class="anillo" style="' + anillo(v, r[1]) + '"></span><span class="etq"><i aria-hidden="true"></i><span>' + r[2] + '</span></span></div>';
  }
  function ctas(xl) {
    return '<a class="btn btn-p' + (xl ? " btn-xl" : "") + '" href="' + DEMO + '">Agendar una demo</a><a class="btn btn-s' + (xl ? " btn-xl" : "") + '" href="' + PLANES + '">Ver planes</a>';
  }
  function shead(tipo, ceja, titulo, lede) {
    return '<div class="shead shead--' + tipo + '"><div><p class="ceja"><i aria-hidden="true"></i>' + ceja + '</p><h2 class="t-l" data-palabras>' + titulo + '</h2></div><p class="lead" data-r>' + lede + '</p></div>';
  }
  function cierre(prompt) {
    return '<section class="contacto" id="demo"><canvas class="corriente fin-pix" data-corriente data-forma="horizonte" data-semilla="41" data-celda="4" data-velocidad="1.6" data-fuerza=".72" aria-hidden="true"></canvas>' +
      '<div class="wrap"><p class="ceja"><i aria-hidden="true"></i>Demo</p><h2 class="t-xl" data-palabras>Pon tu operación en <span class="acento">piloto automático</span> y dedícate a traer clientes.</h2>' +
      (prompt ? '<p class="lead" data-r>' + prompt + '</p>' : "") + '<div class="fin-cta" data-r>' + ctas(true) + '</div></div></section>';
  }

  /* ── la interna de un producto: portada → por qué importa → capacidades → ficha → puesta en marcha → noche → demo ── */
  function htmlProducto(p, slug) {
    var semilla = ORDEN.indexOf(slug) * 7 + 3;
    var h = "";
    h += '<section class="hero" id="arriba"><canvas class="corriente hero-pix" data-corriente data-marco data-claro=".37" data-semilla="' + semilla + '" data-celda="3" data-fuerza="1.1" aria-hidden="true"></canvas>' +
      '<div class="wrap"><div class="hero-txt"><p class="boleto"><i aria-hidden="true"></i><span>' + p.eyebrow + '</span><b>' + p.badge + '</b></p>' +
      '<h1 class="t-xl" data-palabras>' + p.h1 + '</h1><p class="lead" data-r>' + p.lead + '</p><div class="hero-cta" data-r>' + ctas() + '</div></div>' +
      '<div class="hero-escena">' + laptop('<div class="capa" id="heroCapa"><img class="on" src="' + img(p.portada) + '" alt="' + ALT[p.portada] + '" width="2400" height="1500" fetchpriority="high"></div><span class="pin" id="pin" aria-hidden="true"></span><span class="nota-chip" id="notaChip" aria-hidden="true"></span>', "dispHero") +
      '<p class="nota-pie" id="notaPie"></p></div></div></section>';

    h += '<section class="sec" id="por-que"><div class="wrap">' + shead("split", "Por qué importa", "Lo que cambia en tu operación", "Tres cambios que se sienten desde la primera semana, contados sobre la pantalla real.") +
      '<div class="reco"><div class="reco-txt">' + p.stories.map(function (s, i) {
        return '<article class="hist' + (i ? "" : " on") + '" data-i="' + i + '"><p class="hist-k"><span class="n">0' + (i + 1) + '</span>' + s[0] + '</p><h3>' + s[1] + '</h3><p class="cu">' + s[2] + '</p>' + recorte(p.reco[i]) + '</article>';
      }).join("") + '</div><div class="reco-fijo" aria-hidden="true"><div class="reco-pega">' +
      laptop('<div class="capa" id="recoCapa"><img class="on" src="' + img(p.reco[0][0]) + '" alt=""><img alt=""></div><span class="anillo" id="recoAnillo"></span><span class="etq" id="recoEtq"><i></i><span></span></span>') +
      '<ol class="reco-puntos"><li class="on"></li><li></li><li></li></ol></div></div></div></div></section>';

    h += '<section class="sec arena" id="capacidades"><div class="wrap">' + shead("center", "Capacidades", "Qué hace por ti", "Cada pieza, tal como se ve en el panel.") +
      '<div class="caps">' + p.caps.map(function (c, i) {
        var k = p.clips[i], r = k[1];
        var e = encuadre(k[0], r);
        return '<article class="cap" data-r><div class="clip' + (e.s > 1 ? "" : " quieta") + '" style="--ox:' + e.ox + '%;--oy:0%;--zoom:' + e.s.toFixed(3) + '"><div class="clip-camara">' +
          (k[0].indexOf("p/") === 0 ? '<img src="' + img(k[0]) + '" alt="' + (ALT[k[0]] || c[0]) + '" loading="lazy" decoding="async">' :
          '<video muted loop playsinline preload="none" poster="/internas/productos/img/clips/' + k[0] + '.webp" aria-label="' + c[0] + ', en el panel de Leasefy"><source src="/internas/productos/img/clips/' + k[0] + '.mp4" type="video/mp4"></video>') + '</div></div>' +
          '<div class="cap-tx"><p class="cap-k">' + k[2] + '</p><h3>' + c[0] + '</h3><p>' + c[1] + '</p></div></article>';
      }).join("") + '</div></div></section>';

    h += '<section class="sec" id="ficha"><div class="wrap ficha-grid"><div class="ficha-cab"><p class="ceja"><i aria-hidden="true"></i>Ficha</p><h2 class="t-l" data-palabras>La ficha, sin adornos</h2>' +
      '<p class="lead" data-r>Los datos duros para decidir rápido — qué es, qué reemplaza y cuándo está operando.</p>' +
      '<div class="obj3d-caja" data-px="-50"><img class="obj3d" src="/internas/productos/img/3d/' + p.obj + '-voltaje.webp" alt="" width="640" height="640" loading="lazy"></div></div>' +
      '<dl class="spec">' + p.ficha.map(function (f) { return '<div class="spec-f" data-r><dt>' + f[0] + '</dt><dd>' + f[1] + '</dd></div>'; }).join("") + '</dl></div></section>';

    h += '<section class="sec arena" id="puesta"><div class="wrap">' + shead("right", "Puesta en marcha", "Así entra a operar", "Sin proyectos eternos: se prende por fases, contigo al volante.") +
      '<div class="ruta3"><span class="linea" aria-hidden="true"><i class="lleno"></i></span><ol>' + p.pasos.map(function (s, i) {
        return '<li><span class="sq" aria-hidden="true"></span><span class="n">0' + (i + 1) + '</span><b>' + s[0] + '</b><p>' + s[1] + '</p></li>';
      }).join("") + '</ol></div></div></section>';

    h += '<section class="sec noche" id="noche"><div class="rayas-noche" data-motivo="rings" data-tono="on-navy" aria-hidden="true"></div><div class="wrap noche-grid"><div class="noche-tx">' +
      '<p class="ceja"><i aria-hidden="true"></i>' + p.noche[0] + '</p><h2 class="t-l" data-palabras>' + p.noche[1] + '</h2><p class="lead" data-r>' + p.noche[2] + '</p></div>' +
      '<div class="noche-esc">' + laptop('<div class="capa"><img class="on" src="' + img(p.oscura) + '" alt="' + ALT[p.portada] + ', en modo oscuro" loading="lazy" decoding="async"></div>', "dispNoche") + '</div></div></section>';

    h += cierre(p.demo);
    return h;
  }

  /* ── el índice: las ocho piezas, agrupadas como en el menú «Producto» de producción ── */
  function tarjeta(slug) {
    var p = PROD[slug];
    return '<a class="pz" href="/productos/' + slug + '"><span class="recorte"><span class="capa"><img class="on" src="' + img(p.portada) + '" alt="" loading="lazy" decoding="async"></span></span>' +
      '<span class="pz-tx"><span class="pz-k">' + p.eyebrow + '</span><h3>' + p.name + '</h3><p>' + p.tag + '</p><span class="ver">Ver producto →</span></span></a>';
  }
  function htmlIndice() {
    var sis = ORDEN.filter(function (s) { return PROD[s].grupo === "sistema"; }), ags = ORDEN.filter(function (s) { return PROD[s].grupo === "agentes"; });
    return '<section class="hero hero-ind" id="arriba"><canvas class="corriente hero-pix" data-corriente data-marco data-claro=".44" data-radio="1.3" data-semilla="11" data-celda="3" data-fuerza="1" aria-hidden="true"></canvas>' +
      '<div class="wrap"><div class="hero-txt"><p class="boleto"><i aria-hidden="true"></i><span>Producto</span><b>CRM · ERP · Agentes AI</b></p>' +
      '<h1 class="t-xl" data-palabras>El sistema operativo <span class="acento">inteligente</span> para inmobiliarias</h1>' +
      '<p class="lead" data-r>CRM, ERP y agentes AI para operar arriendos de punta a punta.</p><div class="hero-cta" data-r>' + ctas() + '</div></div></div></section>' +
      '<section class="sec ind" id="el-sistema"><div class="wrap"><p class="ceja"><i aria-hidden="true"></i>El sistema</p><h2 class="t-l" data-palabras>CRM y ERP</h2><div class="ind-g dos">' + sis.map(tarjeta).join("") + '</div></div></section>' +
      '<section class="sec arena ind" id="agentes-ai"><div class="wrap"><p class="ceja"><i aria-hidden="true"></i>Agentes AI</p><h2 class="t-l" data-palabras>Seis agentes</h2><div class="ind-g tres">' + ags.map(tarjeta).join("") + '</div>' +
      '<div class="ind-pie"><a class="lnk" href="/#producto">Visión general en el home ↓</a></div></div></section>' +
      cierre("");
  }

  /* ── barra, menú y pie: se llenan una vez ── */
  function llenarNav() {
    var it = function (s) { var p = PROD[s]; return '<a class="desp-it" href="/productos/' + s + '" data-v="' + s + '"><span class="n">' + p.n + '</span><span><b>' + p.name + '</b><small>' + p.tag + '</small></span></a>'; };
    var de = function (g) { return ORDEN.filter(function (s) { return PROD[s].grupo === g; }).map(it).join(""); };
    $("#despProd").innerHTML = '<div class="desp-col"><p>El sistema</p>' + de("sistema") + '</div><div class="desp-col"><p>Agentes AI</p>' + de("agentes") + '</div>' +
      '<div class="desp-todo"><a class="lnk" href="/productos">Ver todos los productos</a><a class="lnk" href="/#producto">Visión general en el home ↓</a></div>';
    $("#menuSub").innerHTML = ORDEN.map(function (s) { return '<a href="/productos/' + s + '" data-v="' + s + '">' + PROD[s].name + '</a>'; }).join("");
    $("#pieProd").innerHTML = ORDEN.map(function (s) { return '<li><a href="/productos/' + s + '">' + PROD[s].name + '</a></li>'; }).join("");
  }
  function marcarNav(v) {
    $$("[data-v]").forEach(function (a) { if (a.dataset.v === v) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
  }

  /* ── el reloj: la hora del momento que cuenta cada producto (la de su noche) ── */
  (function () {
    try {
      var hoy = new Date(), sem = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"], mes = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
      $("#relojDia").textContent = sem[hoy.getDay()] + " " + hoy.getDate() + " " + mes[hoy.getMonth()];
    } catch (e) {}
  })();
  function ponerHora(v) {
    var t;
    if (PROD[v]) t = PROD[v].hora;
    else { var d = new Date(); t = ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); }
    $("#hora").textContent = t;
  }

  /* ── gestos de los botones con Motion: suben 2 px al pasar y se hunden al presionar, con resorte ──
     (los valores de Pressable de Cadence: lift −2 px, presión 0,97, resorte ágil 0,25 s con rebote 0,1) */
  var M = window.Motion && window.Motion.hover && window.Motion.press && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? window.Motion : null;
  var RESORTE = { type: "spring", visualDuration: 0.25, bounce: 0.1 };
  function gestos(scope) {
    if (!M) return;
    $$(".btn,.pz,.mbtn,.aviso a,.desp-it", scope).forEach(function (el) {
      if (el._gesto) return; el._gesto = true;
      var hundir = el.classList.contains("pz") ? 0.99 : 0.97;
      M.hover(el, function () { M.animate(el, { y: -2 }, RESORTE); return function () { M.animate(el, { y: 0 }, RESORTE); }; });
      M.press(el, function () { M.animate(el, { scale: hundir }, RESORTE); return function () { M.animate(el, { scale: 1 }, RESORTE); }; });
    });
  }

  /* ── scroll suave con Lenis, atado a ScrollTrigger (una vez) ── */
  var lenis = null;
  if (MOV) {
    gsap.registerPlugin(ScrollTrigger);
    if (window.Lenis) {
      lenis = new Lenis({ duration: 1.05, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    }
  }
  function irA(id) {
    var t = document.getElementById(id); if (!t) return;
    if (lenis) lenis.scrollTo(t, { offset: -(hdr.offsetHeight + 12), duration: 1.2 }); else t.scrollIntoView();
  }
  function irArriba(inmediato) {
    if (lenis) lenis.scrollTo(0, { immediate: !!inmediato, force: true, duration: 1.2 });
    if (inmediato || !lenis) window.scrollTo(0, 0);
  }

  /* ── menú del celular y desplegable «Producto» ── */
  var mb = $("#mbtn"), db = $("#despBtn"), dp = $("#despProd"), cierreDesp = 0;
  function abrirDesp(si) { dp.classList.toggle("abierto", si); db.setAttribute("aria-expanded", si ? "true" : "false"); }
  function cerrarMenus() {
    root.classList.remove("menu-abierto"); mb.setAttribute("aria-expanded", "false"); mb.textContent = "Menú";
    abrirDesp(false); if (lenis) lenis.start();
  }
  mb.addEventListener("click", function () {
    var a = root.classList.toggle("menu-abierto");
    mb.setAttribute("aria-expanded", a ? "true" : "false"); mb.textContent = a ? "Cerrar" : "Menú";
    if (lenis) { if (a) lenis.stop(); else lenis.start(); }
  });
  db.addEventListener("click", function () { abrirDesp(!dp.classList.contains("abierto")); });
  if (window.matchMedia("(hover: hover)").matches) {
    var desp = db.parentNode;
    desp.addEventListener("mouseenter", function () { clearTimeout(cierreDesp); abrirDesp(true); });
    desp.addEventListener("mouseleave", function () { cierreDesp = setTimeout(function () { abrirDesp(false); }, 220); });
  }
  document.addEventListener("click", function (e) { if (!e.target.closest(".desp")) abrirDesp(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { if (dp.classList.contains("abierto")) { abrirDesp(false); db.focus(); } if (root.classList.contains("menu-abierto")) { cerrarMenus(); mb.focus(); } } });
  $("#avisoX").addEventListener("click", function () { avisoCerrado = true; aviso.classList.remove("ver"); });

  /* ── la portada: un punto de voltaje va a lo importante y deja su nota, una a la vez ── */
  function notas(p) {
    var capa = $("#heroCapa"), pin = $("#pin"), chip = $("#notaChip"), pie = $("#notaPie");
    if (!capa) return;
    function poner(k, conZoom) {
      if (k < 0) { capa.style.transform = ""; pin.classList.remove("ver"); chip.classList.remove("ver"); return; }
      var n = p.notas[k], v = { s: 1, tx: 0, ty: 0 };
      capa.style.transform = "";
      var x = v.tx + n[0] * v.s, y = v.ty + n[1] * v.s;
      pin.style.left = x + "%"; pin.style.top = y + "%"; pin.classList.add("ver");
      chip.classList.remove("ver"); chip.textContent = n[2];
      chip.style.top = "calc(" + y.toFixed(2) + "% - 18px)";
      if (x > 56) { chip.style.left = "auto"; chip.style.right = "calc(" + (100 - x).toFixed(2) + "% + 22px)"; }
      else { chip.style.right = "auto"; chip.style.left = "calc(" + x.toFixed(2) + "% + 22px)"; }
      if (conZoom) { var t = setTimeout(function () { chip.classList.add("ver"); }, 650); limpieza.push(function () { clearTimeout(t); }); } else chip.classList.add("ver");
      pie.innerHTML = '<i aria-hidden="true"></i>' + n[2];
    }
    if (!MOV) { poner(0, false); pie.innerHTML = p.notas.map(function (n) { return '<i aria-hidden="true"></i>' + n[2]; }).join(" &nbsp; "); return; }
    var k = -1, total = p.notas.length;
    var t0 = setTimeout(function () { k = 0; poner(0, true); }, 1100);
    var ciclo = setInterval(function () { k = (k + 1) % (total + 1); poner(k === total ? -1 : k, true); }, 3800);
    limpieza.push(function () { clearTimeout(t0); clearInterval(ciclo); });
  }

  /* ── por qué importa: la pantalla fija cambia y se acerca a la historia que se lee ── */
  function recorrido(p) {
    var capa = $("#recoCapa"); if (!capa) return;
    var hs = $$(".hist", main), imgs = $$("img", capa), an = $("#recoAnillo"), et = $("#recoEtq span"), puntos = $$(".reco-puntos li", main), act = -1, cara = 0;
    p.reco.forEach(function (r) { var im = new Image(); im.src = img(r[0]); });
    function ir(i) {
      if (i === act) return; act = i;
      var r = p.reco[i], src = img(r[0]), vis = imgs[cara];
      if (vis.getAttribute("src") !== src) { cara = 1 - cara; var nueva = imgs[cara]; nueva.src = src; nueva.classList.add("on"); vis.classList.remove("on"); }
      var v = encuadre(r[0], r[1]); capa.style.transform = tf(v); an.setAttribute("style", anillo(v, r[1])); et.textContent = r[2];
      hs.forEach(function (h, k) { h.classList.toggle("on", k === i); });
      puntos.forEach(function (d, k) { d.classList.toggle("on", k === i); });
    }
    ir(0);
    if (!("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) ir(+e.target.dataset.i); }); }, { rootMargin: "-45% 0px -45% 0px" });
    hs.forEach(function (h) { io.observe(h); });
    limpieza.push(function () { io.disconnect(); });
  }

  /* ── capacidades: el panel en uso, sólo corre lo que se ve ── */
  function videos() {
    var vs = $$("video", main); if (!vs.length || !MOV || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) { v.muted = true; var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); } else v.pause();
      });
    }, { rootMargin: "120px" });
    vs.forEach(function (v) { v.muted = true; v.defaultMuted = true; v.setAttribute("muted", ""); io.observe(v); });
    limpieza.push(function () { io.disconnect(); vs.forEach(function (v) { v.pause(); }); });
  }

  /* ── montar una vista ── */
  function montar() {
    $$("[data-motivo]", main).forEach(LF.motivo);
    LF.corriente.montarEn(main);
    var titulos = $$("[data-palabras]", main).map(function (el) { var w = LF.partir(el); el.style.visibility = "visible"; return { el: el, w: w }; });
    gestos(main);
    videos();
    var p = PROD[vista];
    if (p) { notas(p); recorrido(p); }
    var lis = $$(".ruta3 li", main);
    if (!MOV) { lis.forEach(function (li) { li.classList.add("on"); }); return; }

    titulos.forEach(function (t) {
      gsap.set(t.w, { yPercent: 110 });
      if (t.el.closest(".hero")) { gsap.to(t.w, { yPercent: 0, duration: 1.1, ease: "expo.out", stagger: .06, delay: .15 }); return; }
      ScrollTrigger.create({ trigger: t.el, start: "top 88%", once: true, onEnter: function () { gsap.to(t.w, { yPercent: 0, duration: 1, ease: "expo.out", stagger: .045 }); } });
    });
    var resto = $$("[data-r]", main).filter(function (el) { return !el.closest(".hero"); });
    if (resto.length) ScrollTrigger.batch(resto, { start: "top 92%", once: true, onEnter: function (b) { gsap.to(b, { opacity: 1, y: 0, duration: .9, ease: "expo.out", stagger: .08, overwrite: "auto" }); } });
    gsap.to($$(".hero [data-r]", main), { opacity: 1, y: 0, duration: 1, ease: "expo.out", stagger: .1, delay: .55 });
    gsap.from($$(".hero .boleto", main), { opacity: 0, y: 14, duration: .8, ease: "expo.out", delay: .05 });
    gsap.to($$(".hero-pix", main), { opacity: 1, duration: 2.2, ease: "power2.out", delay: .3 });

    /* la portada entra inclinada y se aplana al bajar, como quien pone la pantalla sobre la mesa */
    var dh = $("#dispHero");
    if (dh) {
      gsap.fromTo(dh, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1.2, ease: "expo.out", delay: .5 });
      gsap.fromTo(dh, { rotateX: 16, scale: .93 }, { rotateX: 0, scale: 1, ease: "none", immediateRender: true, scrollTrigger: { trigger: dh, start: "top bottom", end: "top 25%", scrub: .6 } });
    }
    var dn = $("#dispNoche");
    if (dn) gsap.fromTo(dn, { rotateX: 14, y: 50 }, { rotateX: 0, y: 0, ease: "none", scrollTrigger: { trigger: dn, start: "top bottom", end: "center 55%", scrub: .6 } });
    $$("[data-px]", main).forEach(function (el) {
      gsap.to(el, { y: +el.dataset.px, ease: "none", scrollTrigger: { trigger: el.closest("section") || el, start: "top bottom", end: "bottom top", scrub: .6 } });
    });
    /* la ruta de puntos se llena y cada paso se enciende al pasar */
    var r3 = $(".ruta3", main);
    if (r3) {
      var vert = !window.matchMedia("(min-width: 761px)").matches, ll = $(".lleno", r3);
      var umbral = vert ? [0.02, 0.4, 0.78] : [0.02, 0.5, 0.97];
      gsap.fromTo(ll, vert ? { scaleY: 0 } : { scaleX: 0 }, Object.assign(vert ? { scaleY: 1 } : { scaleX: 1 }, {
        ease: "none",
        scrollTrigger: { trigger: r3, start: "top 78%", end: vert ? "bottom 70%" : "top 30%", scrub: .5,
          onUpdate: function (s) { lis.forEach(function (li, i) { li.classList.toggle("on", s.progress >= umbral[i]); }); } }
      }));
    }
    var fp = $(".fin-pix", main);
    if (fp) gsap.to(fp, { opacity: 1, y: 0, ease: "none", scrollTrigger: { trigger: fp.closest("section"), start: "top 85%", end: "top 25%", scrub: .6 } });

    var t = 0, rehacer = function () { clearTimeout(t); t = setTimeout(function () { ScrollTrigger.refresh(); }, 220); };
    $$("img", main).forEach(function (im) { if (!im.complete) im.addEventListener("load", rehacer, { once: true }); });
    rehacer();
  }
  function limpiar() {
    limpieza.forEach(function (f) { try { f(); } catch (e) {} }); limpieza = [];
    if (MOV) { ScrollTrigger.getAll().forEach(function (t) { t.kill(); }); gsap.killTweensOf(main.querySelectorAll("*")); }
    main.innerHTML = "";
    LF.corriente.podar();
  }

  /* ── el enrutador (Ronda 30): la RUTA del front dice la vista — /productos es el índice y
        /productos/<producto> su interna (con /es o /en delante, que se conserva al navegar) ── */
  function mostrar(v, ancla, enfocar) {
    cerrarMenus();
    if (v === vista) { if (ancla) irA(ancla); else irArriba(); return; }
    limpiar();
    vista = v;
    main.innerHTML = v === "productos" ? htmlIndice() : htmlProducto(PROD[v], v);
    marcarNav(v); ponerHora(v);
    document.title = (v === "productos" ? "Productos" : PROD[v].name) + " | Leasefy";
    var md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute("content", v === "productos" ? md.dataset.indice || md.getAttribute("content") : PROD[v].lead);
    irArriba(true);
    montar();
    alScroll();
    if (ancla) setTimeout(function () { irA(ancla); }, 120);
    if (enfocar) try { main.focus({ preventScroll: true }); } catch (e) {}
  }
  var PREFIJO = (/^\/(es|en)(?=\/|$)/.exec(location.pathname) || [""])[0];
  function vistaDe(camino) {
    var m = /\/productos(?:\/([a-z]+))?\/?$/.exec(camino || "");
    return m && m[1] && PROD[m[1]] ? m[1] : "productos";
  }
  /* ¿el enlace es de esta página? Sólo /productos y /productos/<uno de los ocho>. */
  function deEstaPagina(camino) {
    var m = /^\/productos(?:\/([a-z]+))?$/.exec(camino);
    return !!m && (!m[1] || !!PROD[m[1]]);
  }
  function ruta(enfocar) {
    var h = (location.hash || "").slice(1), v = vistaDe(location.pathname);
    /* los enlaces viejos con «#crm» llevan a su ruta */
    if (v === "productos" && PROD[h]) { try { history.replaceState(null, "", PREFIJO + "/productos/" + h); } catch (er) {} return mostrar(h, null, enfocar); }
    return mostrar(v, h && h !== "arriba" ? h : null, enfocar);
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]"); if (!a) return;
    var href = a.getAttribute("href");
    if (href.charAt(0) === "/") {
      var partes = href.split("#"), camino = partes[0], ancla = partes[1] || null;
      if (!deEstaPagina(camino) || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === "_blank") return;
      e.preventDefault();
      var destino = PREFIJO + camino + (ancla ? "#" + ancla : "");
      if (location.pathname + location.hash !== destino) { try { history.pushState(null, "", destino); } catch (er) {} }
      return mostrar(vistaDe(camino), ancla, true);
    }
    if (href.charAt(0) !== "#") return;
    var id = href.slice(1); if (!id) return;
    e.preventDefault();
    cerrarMenus();
    if (id === "arriba") return irArriba();
    if (id === "vista") { irA("vista"); try { main.focus({ preventScroll: true }); } catch (er) {} return; }
    irA(id);
  });
  window.addEventListener("popstate", function () { ruta(); });

  /* ── al bajar: el filete de la barra, la pista del reloj y la pastilla del marketplace ── */
  function alScroll() {
    var y = window.scrollY, max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    var n = Math.round(Math.min(1, y / max) * pista.length);
    pista.forEach(function (i, j) { i.classList.toggle("on", j < n); });
    hdr.classList.toggle("con-filete", y > 8);
    var hero = $(".hero", main), fin = $(".contacto", main);
    var pasoHero = hero ? y > hero.offsetHeight * 0.75 : y > 400;
    var enFondo = fin ? fin.getBoundingClientRect().top < innerHeight * 0.85 : false;
    aviso.classList.toggle("ver", !avisoCerrado && pasoHero && !enFondo);
  }
  window.addEventListener("scroll", alScroll, { passive: true });

  llenarNav();
  gestos(document);
  ruta();
  if (MOV) {
    window.addEventListener("load", function () { ScrollTrigger.refresh(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }
})();
