/* ════════════════════════════════════════════════════════════════════
   Infraestructura: scroll suave, títulos, el hilo, el reloj y el héroe
   ════════════════════════════════════════════════════════════════════ */
(function () {
  var $ = LF.$, $$ = LF.$$, MOV = LF.MOV, root = document.documentElement;
  var DESK = "(min-width: 900px)";
  LF.desk = function () { return window.matchMedia(DESK).matches; };

  /* motivos, esferas y orbes (también sin movimiento) */
  $$("[data-motivo]").forEach(LF.motivo);
  LF.esferas();
  LF.orbes.iniciar();
  LF.corriente.iniciar();

  /* listings de la vitrina (en producción salen del marketplace) */
  var VIT = [
    ["fotos/01", "2.600.000", "Apartamento · 2 hab · Sabaneta"], ["fotos/04", "4.200.000", "Casa · 3 hab · Envigado"],
    ["fotos-co/torre-poblado", "1.750.000", "Apartaestudio · 1 hab · Laureles"], ["local-voltaje", "3.900.000", "Local · Belén"],
    ["fotos/00", "6.800.000", "Casa · 4 hab · Rionegro"], ["fotos/02", "5.300.000", "Apartamento · 3 hab · El Poblado"],
    ["fotos/03", "2.100.000", "Casa · 2 hab · Itagüí"], ["edificio-voltaje", "1.600.000", "Apartamento · 2 hab · Bello"]
  ];
  var vt = $("#vitTrack");
  if (vt) {
    var html = "";
    for (var k = 0; k < 2; k++) VIT.forEach(function (v) {
      html += '<a class="vi" href="/propiedades"' + (k ? ' aria-hidden="true" tabindex="-1"' : "") + '><span class="vi-foto"><img src="/landing/img/' + v[0] + '.webp" alt="" loading="lazy"></span><span><b>$ ' + v[1] + ' <em>' + LF.t("/mes") + '</em></b><span>' + LF.t(v[2]) + '</span><small>' + LF.t("Tu Inmobiliaria") + '</small></span></a>';
    });
    vt.innerHTML = html;
  }

  /* menú del celular y aviso del marketplace (funcionan siempre) */
  var mb = $("#mbtn");
  mb.addEventListener("click", function () {
    var a = root.classList.toggle("menu-abierto");
    mb.setAttribute("aria-expanded", a ? "true" : "false"); mb.textContent = a ? LF.t("Cerrar") : LF.t("Menú");
  });
  $$("#menu a").forEach(function (a) { a.addEventListener("click", function () { root.classList.remove("menu-abierto"); mb.setAttribute("aria-expanded", "false"); mb.textContent = LF.t("Menú"); }); });
  var aviso = $("#aviso"), avisoCerrado = false;
  $("#avisoX").addEventListener("click", function () { avisoCerrado = true; aviso.classList.remove("ver"); });

  /* reloj del día: 07:02 → 19:30 según dónde vas */
  var horaEl = $("#hora"), pista = $$("#pista i"), hdr = $("#hdr");
  /* el día del reloj es el de hoy (el día de la operación que cuenta la página) */
  (function () {
    var d = $(".reloj .dia"); if (!d) return;
    try {
      var hoy = new Date(), en = window.LFI && window.LFI.en;
      var sem = en ? ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] : ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
      var mes = en ? ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"] : ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
      d.textContent = sem[hoy.getDay()] + " " + hoy.getDate() + " " + mes[hoy.getMonth()];
    } catch (e) {}
  })();
  /* Nico 23-10 («las horas no coinciden»): el reloj marca la hora de la sección que estás leyendo. Cada sección
     dice su hora en su ceja (07:40, 08:00 … 19:30); entre dos cejas avanza parejo. La noche del piloto automático
     arranca recién al llegar al final (19:30 → 19:42 → …), no apenas asoma el cierre. */
  var anclas = null;
  function medirAnclas() {
    var ojo = innerHeight * .55;
    anclas = [{ y: ojo, m: 422 }];
    $$(".ceja b").forEach(function (b) {
      var t = /^(\d\d):(\d\d)$/.exec(b.textContent.trim()); if (!t) return;
      var m = +t[1] * 60 + +t[2], y = b.getBoundingClientRect().top + window.scrollY, u = anclas[anclas.length - 1];
      if (m > u.m && y > u.y) anclas.push({ y: y, m: m });
    });
  }
  LF.medirAnclas = medirAnclas;
  function minutosEn(y) {
    if (!anclas) medirAnclas();
    for (var i = 1; i < anclas.length; i++) if (y < anclas[i].y) { var a = anclas[i - 1], b = anclas[i]; return a.m + (b.m - a.m) * Math.max(0, y - a.y) / (b.y - a.y); }
    return anclas[anclas.length - 1].m;
  }
  function reloj(min) {
    min = Math.round(min);
    var h = Math.floor(min / 60), m = min % 60;
    horaEl.textContent = (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
    var n = Math.round(Math.max(0, Math.min(1, (min - 422) / (1170 - 422))) * pista.length);
    pista.forEach(function (i, j) { i.classList.toggle("on", j < n); });
  }
  var ctaFinal = $("#contacto .fin-cta");
  function alScroll() {
    var y = window.scrollY;
    var fondoP = ctaFinal.getBoundingClientRect().bottom < innerHeight * .8 || y + innerHeight >= document.documentElement.scrollHeight - 4;
    if (fondoP !== root.classList.contains("autopiloto-on")) { root.classList.toggle("autopiloto-on", fondoP); if (LF.autopiloto) LF.autopiloto(fondoP); }
    if (!fondoP) reloj(minutosEn(y + innerHeight * .55));
    hdr.classList.toggle("con-filete", y > 8);
    var ins = $("#inmuebles"), r = ins ? ins.getBoundingClientRect() : null;
    var enFondo = $("#contacto").getBoundingClientRect().top < innerHeight * .6;
    if (!avisoCerrado) var finHero = $(".hero-alto").offsetHeight - innerHeight * .4;
    aviso.classList.toggle("ver", y > finHero && !enFondo && !(r && r.top < innerHeight && r.bottom > 0));
  }
  window.addEventListener("scroll", alScroll, { passive: true });
  window.addEventListener("resize", function () { anclas = null; alScroll(); });
  window.addEventListener("load", function () { anclas = null; alScroll(); });
  alScroll();

  /* escalar las pantallas armadas en HTML a su marco */
  function escalar() {
    $$(".pantalla[data-w]").forEach(function (p) {
      var ui = p.querySelector(".ui"); if (!ui) return;
      var w = +p.dataset.w; ui.style.transform = "scale(" + (p.clientWidth / w) + ")";
    });
  }
  /* el mismo héroe: laptop en escritorio, celular en el teléfono */
  function montarHero() {
    var d = $("#dispHero"), app = $("#app"), p = d.querySelector(".pantalla");
    if (LF.desk()) { d.className = "disp laptop"; app.classList.remove("movil"); p.dataset.w = 1280; p.dataset.h = 800; }
    else { d.className = "disp celular"; app.classList.add("movil"); p.dataset.w = 390; p.dataset.h = 844; }
    escalar();
  }
  montarHero();
  if (window.ResizeObserver) { var ro = new ResizeObserver(escalar); $$(".pantalla[data-w]").forEach(function (p) { ro.observe(p); }); }
  window.matchMedia(DESK).addEventListener("change", function () { montarHero(); if (window.ScrollTrigger) ScrollTrigger.refresh(); });

  /* títulos y relatos partidos */
  var titulos = $$("[data-palabras]").map(function (el) { var w = LF.partir(el); el.style.visibility = "visible"; return { el: el, w: w }; });
  var relatos = $$("[data-relato]").map(function (el) { return { el: el, w: LF.partirRelato(el) }; });

  if (!MOV) { LF.listo = true; return; }

  /* ── scroll suave con Lenis, atado a ScrollTrigger ── */
  gsap.registerPlugin(ScrollTrigger);
  var lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ duration: 1.05, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  LF.lenis = lenis;
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href"); if (id.length < 2) return;
      var t = $(id); if (!t) return; e.preventDefault();
      if (lenis) lenis.scrollTo(t, { offset: id === "#inicio" ? 0 : -60, duration: 1.4 }); else t.scrollIntoView();
    });
  });

  /* títulos: palabra por palabra al entrar (el héroe y «Un solo sistema» van aparte) */
  titulos.forEach(function (t) {
    gsap.set(t.w, { yPercent: 110 });
    if (t.el.hasAttribute("data-manual")) return;
    if (t.el.closest(".hero")) { gsap.to(t.w, { yPercent: 0, duration: 1.1, ease: "expo.out", stagger: .06, delay: .15 }); return; }
    ScrollTrigger.create({ trigger: t.el, start: "top 86%", once: true, onEnter: function () { gsap.to(t.w, { yPercent: 0, duration: 1, ease: "expo.out", stagger: .045 }); } });
  });
  LF.titulos = titulos;
  /* relatos que se encienden al leer */
  relatos.forEach(function (r) {
    gsap.to(r.w, { opacity: 1, ease: "none", stagger: .1, scrollTrigger: { trigger: r.el, start: "top 78%", end: "bottom 48%", scrub: .5 } });
  });
  /* entradas */
  ScrollTrigger.batch("[data-r]", { start: "top 90%", once: true, onEnter: function (b) { gsap.to(b, { opacity: 1, y: 0, duration: .9, ease: "expo.out", stagger: .08, overwrite: "auto" }); } });
  gsap.to(".hero [data-r]", { opacity: 1, y: 0, duration: 1, ease: "expo.out", stagger: .1, delay: .55 });
  gsap.from(".mk-banda", { opacity: 0, y: -10, duration: .8, ease: "expo.out", delay: .05 });
  gsap.to(".hero-pix", { opacity: .9, duration: 2.2, ease: "power2.out", delay: .4 });

  /* parallax de los 3D */
  $$("[data-px]").forEach(function (el) {
    if (el.closest(".hero") && LF.desk()) return;
    gsap.to(el, { y: +el.dataset.px, ease: "none", scrollTrigger: { trigger: el.closest("section") || el, start: "top bottom", end: "bottom top", scrub: .6 } });
  });

  /* ── el hilo de dots: une el ojo de cada sección con la siguiente ── */
  var NS = "http://www.w3.org/2000/svg", nh = 0;
  $$(".hilo").forEach(function (h) {
    var id = "hm" + (nh++);
    h.innerHTML = '<svg aria-hidden="true"><defs><mask id="' + id + '" maskUnits="userSpaceOnUse"><path class="mk" fill="none" stroke="#fff" stroke-width="16" stroke-linecap="square"/></mask></defs><path class="dots" mask="url(#' + id + ')"/><rect class="cabeza" width="11" height="11" rx="2.5" x="-5.5" y="-5.5"/></svg>';
    h._svg = h.querySelector("svg"); h._dots = h.querySelector(".dots"); h._mk = h.querySelector(".mk"); h._cab = h.querySelector(".cabeza");
    h._dest = $(h.dataset.hasta);
    var desde = h.dataset.desde.split(",");
    h._fx = +desde[0]; h._dy = +desde[1];
  });
  function trazar(h) {
    if (!h._dest) return;
    var W = root.clientWidth, ph = LF.pos(h), pd = LF.pos(h._dest);
    var x1 = W * h._fx, y1 = h._dy;
    var x2 = pd.x + pd.w / 2, y2 = pd.y + pd.h / 2 - ph.y;
    var H = Math.max(10, y2 - y1);
    h._svg.setAttribute("width", W); h._svg.setAttribute("height", H);
    h._svg.style.top = y1 + "px";
    var d = "M" + x1 + ",0 C" + x1 + "," + (H * .55) + " " + x2 + "," + (H * .45) + " " + x2 + "," + (H - 10);
    h._dots.setAttribute("d", d); h._mk.setAttribute("d", d);
    h._L = h._dots.getTotalLength();
    h._mk.style.strokeDasharray = h._L + " " + h._L;
    h._y1 = y1; h._H = H;
    pintarHilo(h, h._p || 0);
  }
  function pintarHilo(h, p) {
    h._p = p;
    if (!h._L) return;
    h._mk.style.strokeDashoffset = h._L * (1 - p);
    var pt = h._dots.getPointAtLength(h._L * p), pt2 = h._dots.getPointAtLength(Math.max(0, h._L * p - 2));
    var a = Math.atan2(pt.y - pt2.y, pt.x - pt2.x) * 180 / Math.PI;
    h._cab.setAttribute("transform", "translate(" + pt.x + "," + pt.y + ") rotate(" + a + ")");
    h._cab.style.opacity = p > 0.01 && p < 0.995 ? 1 : 0;
    if (p > 0.985 && !h._llego) {
      h._llego = true;
      gsap.fromTo(h._dest, { scale: 2.4 }, { scale: 1, duration: .9, ease: "elastic.out(1,.45)" });
    } else if (p < 0.9) h._llego = false;
  }
  LF.trazarHilos = function () { $$(".hilo").forEach(trazar); };
  ScrollTrigger.addEventListener("refreshInit", LF.trazarHilos);
  ScrollTrigger.addEventListener("refresh", function () { anclas = null; });
  (function () {
    var t = 0, rehacer = function () { clearTimeout(t); t = setTimeout(function () { ScrollTrigger.refresh(); }, 220); };
    document.querySelectorAll("img").forEach(function (im) { if (!im.complete) im.addEventListener("load", rehacer, { once: true }); });
    window.addEventListener("load", rehacer, { once: true });
  })();
  LF.trazarHilos();
  $$(".hilo").forEach(function (h) {
    ScrollTrigger.create({
      trigger: h,
      start: function () { return "top+=" + (h._y1 || 0) + " 82%"; },
      end: function () { return "top+=" + ((h._y1 || 0) + (h._H || 100)) + " 62%"; },
      scrub: .4,
      onUpdate: function (s) { pintarHilo(h, s.progress); }
    });
  });

  /* ── la franja y la vitrina: corren solas y se aceleran con el scroll ── */
  function cinta(track, base, centro) {
    if (!track) return;
    var x = 0, vel = 0, dir = 1, cuadro = 0, visible = true, actual = null;
    var items = Array.prototype.slice.call(track.children);
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(track.parentNode);
    gsap.ticker.add(function (t, dt) {
      if (!visible) return;
      var v = lenis ? lenis.velocity : 0;
      vel += (v - vel) * .12;
      if (Math.abs(vel) > .6) dir = vel > 0 ? 1 : -1;
      var mitad = track.scrollWidth / 2;
      x -= dir * (base * dt / 16.7 + Math.min(36, Math.abs(vel)) * .5);
      if (x <= -mitad) x += mitad; if (x > 0) x -= mitad;
      var sesgo = Math.max(-8, Math.min(8, -vel * .3));
      track.style.transform = "translate3d(" + x + "px,0,0) skewX(" + sesgo + "deg)";
      if (centro && ++cuadro % 6 === 0) {
        var medio = innerWidth / 2, mejor = null, menor = 1e9;
        items.forEach(function (el) { var r = el.getBoundingClientRect(), dd = Math.abs(r.left + r.width / 2 - medio); if (dd < menor) { menor = dd; mejor = el; } });
        if (mejor !== actual) { if (actual) actual.removeAttribute("data-centro"); mejor.setAttribute("data-centro", ""); actual = mejor; }
      }
    });
  }
  cinta($(".marq .track"), .9, true);
  cinta($("#vitTrack"), .55, false);

  /* ════ HÉROE: la pantalla real se arma pieza por pieza ════ */
  var A = {
    cifra: $("#cifraFalta"), seg: $$("#app .a-barra i"), ley: $$("#app .a-ley > div"),
    filas: $$("#app .a-fila"), head: $("#app .a-head"), card: $("#app .a-card")
  };
  gsap.set([A.head, A.card], { opacity: 0, y: 16 });
  gsap.set(A.seg, { scaleX: 0 });
  gsap.set(A.ley, { opacity: 0, y: 6 });
  gsap.set(["#app .a-nota", "#app .a-tabs2", "#app .a-th"], { opacity: 0 });
  gsap.set(A.filas, { opacity: 0, y: 12 });
  A.cifra.textContent = LF.fmt(0);
  var hecho = {};
  var pasos = {
    cabecera: function () {
      return gsap.timeline().from("#app .lat a, #app .lat .g", { opacity: 0, x: -8, stagger: .018, duration: .4, ease: "power2.out" })
        .to(A.head, { opacity: 1, y: 0, duration: .7, ease: "expo.out" }, .15);
    },
    cifra: function () {
      var tl = gsap.timeline();
      tl.to(A.card, { opacity: 1, y: 0, duration: .7, ease: "expo.out" })
        .add(LF.contar(A.cifra, 0, 52580500.50, 1.6), .2)
        .to(A.seg[0], { scaleX: 1, duration: .35, ease: "power2.out" }, .35)
        .to(A.seg[1], { scaleX: 1, duration: .8, ease: "power2.inOut" }, .62)
        .to(A.seg[2], { scaleX: 1, duration: .2, ease: "power2.out" }, 1.36)
        .to(A.seg[3], { scaleX: 1, duration: .35, ease: "power2.out" }, 1.5)
        .to(A.ley, { opacity: 1, y: 0, duration: .5, stagger: .1, ease: "expo.out" }, .6)
        .to("#app .a-nota", { opacity: 1, duration: .4 }, 1.1);
      return tl;
    },
    filas: function () {
      return gsap.timeline().to(["#app .a-tabs2", "#app .a-th"], { opacity: 1, duration: .45, stagger: .1 })
        .to(A.filas, { opacity: 1, y: 0, duration: .6, ease: "expo.out", stagger: .08 }, .15);
    },
    pago: function () {
      var fila = $("#filaPago"), tl = gsap.timeline();
      tl.to("#btnPago", { scale: .94, duration: .12, yoyo: true, repeat: 1, ease: "power2.inOut" })
        .fromTo("#toast", { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: .55, ease: "expo.out" }, .3)
        .add(function () {
          fila.classList.add("pagada");
          var e = $("#filaPagoEst"); e.className = "est ok"; e.textContent = LF.t("Pagada");
          var s = $("#filaPagoSub"); s.className = ""; s.textContent = LF.t("pagó hoy, 9:12");
          $("#filaPagoVal").className = "falta"; $("#filaPagoVal").textContent = "$ 0,00";
          $("#tFalta").textContent = "6"; $("#tCart").textContent = "1"; $("#tPag").textContent = "4";
        }, .35)
        .add(LF.contar(A.cifra, 52580500.50, 51180500.50, 1.4), .4)
        .add(LF.contar($("#leyOk"), 6410000, 7810000, 1.2), .4)
        .add(LF.contar($("#leyCart"), 7700000, 6300000, 1.2), .4)
        .to(A.seg[0], { width: "13.24%", duration: 1.1, ease: "power3.inOut" }, .4)
        .to(A.seg[3], { width: "10.68%", duration: 1.1, ease: "power3.inOut" }, .4)
        .fromTo(fila, { backgroundColor: "#E3F1E8" }, { backgroundColor: "#F4FAF6", duration: 1.2 }, .35)
        .to("#toast", { opacity: 0, y: 10, duration: .4 }, 4.2);
      return tl;
    }
  };
  function hacer(n) { if (hecho[n]) return; hecho[n] = true; pasos[n](); }
  LF.hacerHero = hacer;

  var mm = gsap.matchMedia();
  mm.add(DESK, function () {
    gsap.delayedCall(.5, function () { hacer("cabecera"); });
    var esc = $(".hero-escena"), txt = $(".hero-txt"), banda = $(".mk-banda");
    /* el laptop termina centrado en lo que queda debajo de la barra y de la franja del marketplace */
    var subir = function () {
      var r = esc.offsetTop, alto = esc.offsetHeight, techo = banda ? banda.offsetTop + banda.offsetHeight : 0;
      var meta = techo + (innerHeight - techo - alto) / 2 + 8;
      return -(r - meta);
    };
    var tl = gsap.timeline({ scrollTrigger: { trigger: ".hero-alto", start: "top top", end: "bottom bottom", scrub: .7, invalidateOnRefresh: true,
      onUpdate: function (s) {
        var p = s.progress;
        if (p > .16) hacer("cifra");
        if (p > .38) hacer("filas");
        if (p > .62) hacer("pago");
      } } });
    tl.fromTo("#dispHero", { rotateX: 26, scale: .9 }, { rotateX: 0, scale: 1, ease: "power1.out", duration: .34 }, 0)
      .to(esc, { y: subir, ease: "power1.inOut", duration: .34 }, 0)
      .to(txt, { y: function () { return subir() - 120; }, ease: "power1.inOut", duration: .34 }, 0)
      .to(txt, { opacity: 0, ease: "power2.out", duration: .12 }, 0)
      .to(".baja", { opacity: 0, duration: .06 }, 0)
      .to(".hero-escena .f1", { y: -120, x: -30, ease: "none", duration: 1 }, 0)
      .to(".hero-escena .f2", { y: -150, ease: "none", duration: 1 }, 0)
      .to(".hero-escena .f3", { y: -170, x: 30, ease: "none", duration: 1 }, 0)
      .to("#dispHero", { scale: .94, y: 10, ease: "none", duration: .2 }, .8);
    return function () { gsap.set([esc, txt, "#dispHero"], { clearProps: "all" }); };
  });
  mm.add("(max-width: 899px)", function () {
    ScrollTrigger.create({ trigger: "#dispHero", start: "top 92%", once: true, onEnter: function () {
      hacer("cabecera");
      gsap.delayedCall(.5, function () { hacer("cifra"); });
      gsap.delayedCall(1.9, function () { hacer("filas"); });
    } });
    ScrollTrigger.create({ trigger: "#dispHero", start: "top 30%", once: true, onEnter: function () { gsap.delayedCall(.3, function () { hacer("filas"); hacer("pago"); }); } });
  });

  LF.listo = true;
})();
