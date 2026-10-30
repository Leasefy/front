/* ════════════════════════════════════════════════════════════════════
   La página: el selector de público, las vistas, el scroll suave, los títulos,
   las preguntas, el reloj del día y la pastilla del marketplace
   ════════════════════════════════════════════════════════════════════ */
(function () {
  var $ = LF.$, $$ = LF.$$, MOV = LF.MOV, root = document.documentElement;
  var VISTAS = ["inmobiliarias", "propietarios", "inquilinos", "agentes"];
  var LFT = window.LFI ? window.LFI.t : function (s) { return s; };
  var TITULOS = { inmobiliarias: "Para inmobiliarias", propietarios: "Para propietarios", inquilinos: "Para inquilinos", agentes: "Para agentes inmobiliarios" };
  var vistas = {}; $$(".vista").forEach(function (v) { vistas[v.dataset.vista] = v; });
  var iniciada = {}, actual = null;
  var SEO = {}; try { SEO = JSON.parse((document.getElementById("lf-seo") || {}).textContent || "{}"); } catch (e) {}

  $$("[data-motivo]").forEach(LF.motivo);


  /* ── las pantallas armadas en HTML se escalan a su marco ── */
  function escalar() {
    $$(".pantalla[data-w]").forEach(function (p) {
      var ui = p.querySelector(".ui"); if (!ui || !p.clientWidth) return;
      ui.style.transform = "scale(" + (p.clientWidth / +p.dataset.w) + ")";
    });
  }
  if (window.ResizeObserver) { var ro = new ResizeObserver(escalar); $$(".pantalla[data-w]").forEach(function (p) { ro.observe(p); }); }

  /* ── fotos en estrías (papel en claro; medianoche y oscuro, invertidas) ── */
  var fotos = [];
  function pintarFoto(box) {
    var cv = box.querySelector("canvas"), im = box.querySelector("img");
    var w = box.clientWidth, h = box.clientHeight;
    if (!cv || !w || !h || !im.naturalWidth) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    var noche = box.dataset.tono === "noche", oscuro = LF.token("--estria-oscuro") === "1";
    var ok = LF.pintarEstrias(cv, im, (+box.dataset.paso || 7) * dpr,
      noche ? LF.token("--noche") : LF.token("--estria-fondo"),
      noche ? "#4D6BFF" : LF.token("--estria-tinta"), noche || oscuro);
    if (!ok) cv.style.display = "none";
  }
  function prepararFotos(cont) {
    $$(".foto-estrias", cont).forEach(function (box) {
      if (box._lista) return; box._lista = true; fotos.push(box);
      var im = box.querySelector("img"), ir = function () { pintarFoto(box); };
      if (im.complete && im.naturalWidth) ir(); else im.addEventListener("load", ir);
      /* en el celular no hay puntero: la foto se revela cuando llega al centro */
      if (window.matchMedia("(hover: none)").matches && "IntersectionObserver" in window) {
        new IntersectionObserver(function (e) { box.classList.toggle("ver", e[0].isIntersecting); }, { rootMargin: "-35% 0px -35% 0px" }).observe(box);
      }
    });
  }
  function repintar() { fotos.forEach(function (b) { if (b.offsetParent) pintarFoto(b); }); }
  var tr; window.addEventListener("resize", function () { clearTimeout(tr); tr = setTimeout(repintar, 160); });
  function alCambiarTema() { setTimeout(function () { fotos.forEach(pintarFoto); LF.corriente.tema(); }, 30); }
  if (window.matchMedia) window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", alCambiarTema);
  new MutationObserver(alCambiarTema).observe(root, { attributes: true, attributeFilter: ["data-theme"] });


  /* ── preguntas frecuentes: una abierta a la vez, como en prod ── */
  $$(".faq-q").forEach(function (q) {
    q.addEventListener("click", function () {
      var it = q.parentNode, abrir = !it.classList.contains("abierto");
      $$(".faq-it").forEach(function (x) { x.classList.remove("abierto"); x.querySelector(".faq-q").setAttribute("aria-expanded", "false"); });
      if (abrir) { it.classList.add("abierto"); q.setAttribute("aria-expanded", "true"); }
      if (MOV) setTimeout(function () { ScrollTrigger.refresh(); }, 480);
    });
  });

  /* ── menú del celular y pastilla del marketplace ── */
  var mb = $("#mbtn");
  mb.addEventListener("click", function () {
    var a = root.classList.toggle("menu-abierto");
    mb.setAttribute("aria-expanded", a ? "true" : "false"); mb.textContent = a ? LFT("Cerrar") : LFT("Menú");
  });
  $$("#menu a").forEach(function (a) { a.addEventListener("click", function () { root.classList.remove("menu-abierto"); mb.setAttribute("aria-expanded", "false"); mb.textContent = LFT("Menú"); }); });
  var aviso = $("#aviso"), avisoCerrado = false;
  $("#avisoX").addEventListener("click", function () { avisoCerrado = true; aviso.classList.remove("ver"); });

  /* ── el reloj del día de la barra: 07:02 → 19:30 según dónde vas ── */
  var horaEl = $("#hora"), pista = $$("#pista i");
  (function () {
    var d = $(".reloj .dia"); if (!d) return;
    try {
      var hoy = new Date(), sem = (window.LFI && window.LFI.en) ? ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] : ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"], mes = (window.LFI && window.LFI.en) ? ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"] : ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
      d.textContent = sem[hoy.getDay()] + " " + hoy.getDate() + " " + mes[hoy.getMonth()];
    } catch (e) {}
  })();
  function reloj(p) {
    if (!horaEl) return; /* Nico 27-10: el reloj salió de la barra */
    var min = Math.round(422 + (1170 - 422) * p), h = Math.floor(min / 60), m = min % 60;
    horaEl.textContent = (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
    var n = Math.round(p * pista.length);
    pista.forEach(function (it, j) { it.classList.toggle("on", j < n); });
  }
  function alScroll() {
    var max = Math.max(1, document.documentElement.scrollHeight - innerHeight), y = window.scrollY;
    reloj(Math.min(1, y / max));
    if (avisoCerrado || !actual) return;
    var heroe = $(".heroe", vistas[actual]), finHeroe = heroe ? heroe.getBoundingClientRect().bottom : 0;
    var enCierre = $("#cierre").getBoundingClientRect().top < innerHeight * .7;
    aviso.classList.toggle("ver", finHeroe < innerHeight * .35 && !enCierre);
  }
  window.addEventListener("scroll", alScroll, { passive: true });

  /* ── scroll suave con Lenis, atado a ScrollTrigger (como la landing) ── */
  var lenis = null;
  if (MOV) {
    gsap.registerPlugin(ScrollTrigger);
    if (window.Lenis) {
      lenis = new Lenis({ lerp: .05, wheelMultiplier: .9, smoothWheel: true });
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    }
  }
  function arriba(inmediato) { if (lenis) lenis.scrollTo(0, { immediate: !!inmediato, duration: 1.2 }); else window.scrollTo(0, 0); }

  /* ── títulos palabra por palabra y entradas suaves ── */
  function animar(cont, conHeroe) {
    var titulos = $$("[data-palabras]", cont).map(function (el) { return { el: el, w: LF.partir(el) }; });
    if (!MOV) return;
    titulos.forEach(function (t) {
      gsap.set(t.w, { yPercent: 110 });
      if (conHeroe && t.el.closest(".heroe")) { gsap.to(t.w, { yPercent: 0, duration: 1.1, ease: "expo.out", stagger: .06, delay: .1 }); return; }
      ScrollTrigger.create({ trigger: t.el, start: "top 88%", once: true, onEnter: function () { gsap.to(t.w, { yPercent: 0, duration: 1, ease: "expo.out", stagger: .045 }); } });
    });
    var enHeroe = $$(".heroe [data-r]", cont);
    if (enHeroe.length) gsap.to(enHeroe, { opacity: 1, y: 0, duration: 1, ease: "expo.out", stagger: .09, delay: .35 });
    var resto = $$("[data-r]", cont).filter(function (el) { return !el.closest(".heroe"); });
    if (resto.length) ScrollTrigger.batch(resto, { start: "top 90%", once: true, onEnter: function (b) { gsap.to(b, { opacity: 1, y: 0, duration: .9, ease: "expo.out", stagger: .08, overwrite: "auto" }); } });
    var pix = $$(".heroe-pix", cont);
    if (pix.length) gsap.to(pix, { opacity: .95, duration: 2.2, ease: "power2.out", delay: .25 });
    $$("[data-px]", cont).forEach(function (el) {
      gsap.to(el, { y: +el.dataset.px, ease: "none", scrollTrigger: { trigger: el.closest("section") || el, start: "top top", end: "bottom top", scrub: .6 } });
    });
  }

  /* ── las vistas: una por público, con la misma estructura que su página en prod ── */
  function iniciarVista(nombre) {
    if (iniciada[nombre]) return; iniciada[nombre] = true;
    var v = vistas[nombre];
    escalar(); prepararFotos(v); LF.corriente.iniciar(v); animar(v, true);
  }
  function mostrar(nombre, subir) {
    if (VISTAS.indexOf(nombre) < 0) nombre = "inmobiliarias";
    /* SEO (24-10): la página armada de cada público trae sólo su vista; los demás viven en su dirección */
    if (!vistas[nombre]) { location.replace(PREFIJO + "/para/" + nombre); return; }
    if (nombre === actual) { if (subir) arriba(); return; }
    actual = nombre;
    VISTAS.forEach(function (k) { if (vistas[k]) vistas[k].hidden = k !== nombre; });
    $$(".sel-tabs a").forEach(function (a) { if (a.dataset.ir === nombre) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    $("#selRuta").textContent = nombre;
    /* la página armada trae el título y la descripción pensados para buscadores (#lf-seo, SEO 24-10) */
    var seo = SEO["/para/" + nombre], md = document.querySelector('meta[name="description"]');
    if (seo) { document.title = seo[0]; if (md) md.setAttribute("content", seo[1]); }
    else document.title = LFT(TITULOS[nombre]) + " | Leasefy";
    if (subir) arriba(true);
    iniciarVista(nombre);
    escalar(); repintar();
    if (MOV) { ScrollTrigger.refresh(); }
    alScroll();
  }
  /* ── el enrutador (Ronda 30): la RUTA del front dice el público — /para/<público>
        (con /es o /en delante, que se conserva al navegar) ── */
  var PREFIJO = (/^\/(es|en)(?=\/|$)/.exec(location.pathname) || [""])[0];
  function vistaDe(camino) {
    var m = /\/para\/([a-z]+)\/?$/.exec(camino || "");
    return m && VISTAS.indexOf(m[1]) > -1 ? m[1] : "inmobiliarias";
  }
  $$("a[data-ir]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      var destino = PREFIJO + "/para/" + a.dataset.ir;
      if (!vistas[a.dataset.ir]) { location.href = destino; return; }
      if (location.pathname !== destino) { try { history.pushState(null, "", destino); } catch (er) {} }
      mostrar(a.dataset.ir, true);
    });
  });
  window.addEventListener("popstate", function () { mostrar(vistaDe(location.pathname), true); });
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href").slice(1); e.preventDefault();
      if (id === "arriba" || !id) { arriba(); return; }
      var t = document.getElementById(id); if (!t) return;
      if (lenis) lenis.scrollTo(t, { offset: -130, duration: 1.3 }); else t.scrollIntoView();
    });
  });

  /* lo compartido (FAQ y cierre) se arma una vez */
  prepararFotos($("#ciudad"));
  LF.corriente.iniciar($("#cierre"));
  animar($("#faq")); animar($("#cierre"));
  /* los enlaces viejos con «#propietarios» llevan a su ruta */
  var h0 = location.hash.slice(1);
  if (VISTAS.indexOf(h0) > -1) { try { history.replaceState(null, "", PREFIJO + "/para/" + h0); } catch (er) {} }
  mostrar(VISTAS.indexOf(h0) > -1 ? h0 : vistaDe(location.pathname), false);
  if (MOV) {
    var rt = 0, rehacer = function () { clearTimeout(rt); rt = setTimeout(function () { ScrollTrigger.refresh(); }, 220); };
    document.querySelectorAll("img").forEach(function (im) { if (!im.complete) im.addEventListener("load", rehacer, { once: true }); });
    window.addEventListener("load", rehacer, { once: true });
  }
  alScroll();
})();
