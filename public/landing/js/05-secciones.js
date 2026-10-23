/* ════════════════════════════════════════════════════════════════════
   Las secciones: cada una cuenta una hora del día
   ════════════════════════════════════════════════════════════════════ */
(function () {
  var $ = LF.$, $$ = LF.$$, MOV = LF.MOV;

  /* ── el portafolio en dots (126 inmuebles) ── */
  var campo = $("#campo"), RIESGO = [27, 70, 101];
  if (campo) {
    var h = ""; for (var i = 0; i < 126; i++) h += "<i></i>"; campo.innerHTML = h;
    if (!MOV) $$("#campo i").forEach(function (d, j) { d.classList.add("vis"); if (RIESGO.indexOf(j) > -1) d.classList.add("riesgo"); });
  }

  /* ── la foto de Portofino en estrías (se revela al bajar) ── */
  var foto = $("#fotoPortofino");
  if (foto) {
    var cv = foto.querySelector("canvas"), img = foto.querySelector("img");
    var pintar = function () {
      var dpr = Math.min(window.devicePixelRatio || 1, 2), w = foto.clientWidth;
      if (!w || !img.naturalWidth) return;
      cv.width = Math.round(w * dpr); cv.height = Math.round(w * dpr);
      if (!LF.pintarEstrias(cv, img, 9 * dpr)) cv.style.display = "none";
    };
    if (img.complete) pintar(); else img.addEventListener("load", pintar);
    var to; window.addEventListener("resize", function () { clearTimeout(to); to = setTimeout(pintar, 150); });
    if (!MOV) cv.style.clipPath = "inset(0 0 0 100%)";
  }

  /* piloto automático: al llegar al final, la noche corre sola */
  var NOCHE = [
    ["19:42", "Mori cerró un acuerdo de pago con Mariana"], ["20:15", "Cobri envió 12 enlaces de pago de noviembre"],
    ["21:30", "Conciliación cuadró 118 movimientos del banco"], ["23:05", "Niti agendó 3 visitas para mañana"],
    ["01:10", "Vinci revisó los 126 contratos del portafolio"], ["03:40", "Fixi asignó el arreglo del Apto 301"],
    ["06:30", "Afinidad le envió 4 opciones a Julián"], ["07:02", "Ori te dejó el resumen del día. Buenos días."]
  ];
  var apH = $("#apHora"), apT = $("#apTx"), horaB = $("#hora"), apI = null, apK = 0;
  function apPaso() {
    var it = NOCHE[apK % NOCHE.length]; apK++;
    if (apH) apH.textContent = it[0]; if (horaB) horaB.textContent = it[0];
    if (apT) { if (window.gsap && MOV) gsap.fromTo(apT, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .45, ease: "expo.out", onStart: function () { apT.textContent = it[1]; } }); else apT.textContent = it[1]; }
  }
  LF.autopiloto = function (on) {
    clearInterval(apI); apI = null;
    if (on) { apK = 0; apPaso(); if (MOV) apI = setInterval(apPaso, 2300); }
  };

  /* fotos en estrías de voltaje (la de Portofino va aparte, abajo) */
  $$(".foto-estrias").forEach(function (box) {
    var cv = box.querySelector("canvas"), im = box.querySelector("img");
    var pintarF = function () {
      var dpr = Math.min(window.devicePixelRatio || 1, 2), w = box.clientWidth, h = box.clientHeight;
      if (!w || !h || !im.naturalWidth) return;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      if (!LF.pintarEstrias(cv, im, (box.classList.contains("ciudad") ? 8 : 7) * dpr)) cv.style.display = "none";
    };
    if (im.complete && im.naturalWidth) pintarF(); else im.addEventListener("load", pintarF);
    var tf; window.addEventListener("resize", function () { clearTimeout(tf); tf = setTimeout(pintarF, 160); });
    /* en el celular no hay puntero: la foto se revela cuando la tarjeta llega al centro */
    if (!box.classList.contains("ciudad") && window.matchMedia("(hover: none)").matches && "IntersectionObserver" in window) {
      new IntersectionObserver(function (e) { box.classList.toggle("ver", e[0].isIntersecting); }, { rootMargin: "-35% 0px -35% 0px" }).observe(box);
    }
  });

  /* llamada en curso: el reloj corre */
  var rl = $("#relojLlamada"), seg = 102;
  if (rl && MOV) setInterval(function () { seg++; rl.textContent = "0" + Math.floor(seg / 60) + ":" + ("0" + seg % 60).slice(-2); }, 1000);

  /* Ori piensa cuando le acercas el botón */
  var bo = $("#btnOri"), ori = $("#orbeOri");
  if (bo && ori) {
    bo.addEventListener("mouseenter", function () { ori._orbe && ori._orbe.estado && ori._orbe.estado("thinking"); });
    bo.addEventListener("mouseleave", function () { ori._orbe && ori._orbe.estado && ori._orbe.estado("idle"); });
  }

  if (!MOV) return;

  /* ── marketplace: las fichas se abren en abanico ── */
  gsap.timeline({ scrollTrigger: { trigger: ".mos-vis", start: "top 85%", end: "center 45%", scrub: .7 } })
    .fromTo(".ficha.f-c", { xPercent: -50, yPercent: -50, rotate: 0, x: 0, y: 40 }, { x: () => LF.desk() ? 150 : 70, y: -40, rotate: 9, ease: "none" }, 0)
    .fromTo(".ficha.f-b", { xPercent: -50, yPercent: -50, rotate: 0, x: 0, y: 40 }, { x: () => LF.desk() ? -150 : -70, y: -20, rotate: -8, ease: "none" }, 0)
    .fromTo(".ficha.f-a", { xPercent: -50, yPercent: -50, y: 120, rotateX: 18 }, { y: 30, rotateX: 0, ease: "none" }, 0);

  /* ── la operación de hoy → un solo sistema ── */
  var esc = $("#probEsc");
  if (esc) {
    var pp = $$(".pp", esc), chips = $$(".chip", esc), punto = $(".punto", esc);
    var tUno = LF.titulos.filter(function (t) { return t.el.closest(".prob-uno"); })[0];
    var rel = function (el) { var x = 0, y = 0, n = el; while (n && n !== esc) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; } return { x: x + el.offsetWidth / 2, y: y + el.offsetHeight / 2 }; };
    var cx = function () { return esc.offsetWidth / 2; }, cy = function () { return esc.offsetHeight * (LF.desk() ? .44 : .40); };
    var pt = gsap.timeline({ scrollTrigger: { trigger: ".prob-alto", start: "top top", end: "bottom bottom", scrub: .6, invalidateOnRefresh: true,
      onUpdate: function (s) { esc.classList.toggle("suena", s.progress > .16 && s.progress < .3); } } });
    ScrollTrigger.create({ trigger: ".prob-alto", start: "top 75%", once: true, onEnter: function () { gsap.from($$(".chip[data-pre] .chip-in", esc), { opacity: 0, scale: .7, y: 30, stagger: .07, duration: .7, ease: "back.out(1.6)" }); } });
    /* Nico 23-10: el caos crece con el scroll. Cada palabra abre su ventana: su cifra sube, llega su oleada
       de avisos (se apilan torcidos sobre los de antes) y al cerrar la ventana la palabra se tacha. */
    var visibles = chips.filter(function (c) { return getComputedStyle(c).display !== "none"; });
    var VENTANA = [[.03, .16], [.16, .29], [.29, .42]];
    pp.forEach(function (w, i) {
      var a = VENTANA[i][0], b = VENTANA[i][1], dato = w.querySelector(".pp-dato");
      var grupo = visibles.filter(function (c) { return +c.dataset.g === i; });
      var llegan = grupo.filter(function (c) { return !c.hasAttribute("data-pre"); });
      if (dato) pt.to(dato, { opacity: 1, x: 0, duration: .02, ease: "power2.out" }, a);
      llegan.forEach(function (c, k) {
        pt.to(c, { opacity: 1, scale: 1, y: 0, rotate: 0, duration: .03, ease: "back.out(2.2)" }, a + .012 + k * (b - a - .05) / Math.max(1, llegan.length));
      });
      $$("[data-de]", w).concat([].concat.apply([], grupo.map(function (c) { return $$("[data-de]", c); }))).forEach(function (n) {
        var o = { v: +n.dataset.de };
        pt.to(o, { v: +n.dataset.a, duration: b - a - .03, ease: "none", onUpdate: function () { n.textContent = Math.round(o.v); } }, a + .01);
      });
      pt.to(w.querySelector("s"), { scaleX: 1, duration: .03, ease: "power2.inOut" }, b - .03)
        .to(dato ? [w.querySelector("span"), dato] : w.querySelector("span"), { opacity: .3, duration: .03 }, b - .02)
        .to(grupo, { rotate: "+=3", duration: .03 }, b - .02)
        .to(grupo.map(function (c) { return c.firstElementChild; }), { color: "#A29D95", duration: .03 }, b - .02);
    });
    /* el punto estalla en puntos de voltaje: un anillo de choque y una constelación que queda detrás del título */
    var cvE = $(".estallido", esc), ctxE = cvE.getContext("2d"), part = [], estE = { e: 0 };
    (function () { var r = Math.random; for (var i = 0; i < 1300; i++) { var a = r() * Math.PI * 2; part.push({ a: a, v: Math.pow(r(), .55), s: 2 + Math.round(r() * 5), c: r() < .62 ? "#1A40FF" : r() < .7 ? "#5D78FF" : "#A9B8FF", j: r() }); } })();
    function medirE() { var d = Math.min(window.devicePixelRatio || 1, 2); cvE.width = Math.round(esc.offsetWidth * d); cvE.height = Math.round(esc.offsetHeight * d); cvE._d = d; dibujarE(); }
    function dibujarE() {
      var d = cvE._d || 1, W = cvE.width, H = cvE.height, e = estE.e; ctxE.clearRect(0, 0, W, H);
      if (e <= 0) return;
      var X = cx() * d, Y = cy() * d, R = Math.hypot(W, H) * .44, sale = 1 - Math.pow(1 - e, 3);
      if (e < .22) { var g = ctxE.createRadialGradient(X, Y, 0, X, Y, R * .22 * (e / .22 + .2)); g.addColorStop(0, "rgba(26,64,255," + (1 - e / .22) * .55 + ")"); g.addColorStop(1, "rgba(26,64,255,0)"); ctxE.fillStyle = g; ctxE.fillRect(0, 0, W, H); }
      for (var k = 0; k < 3; k++) {
        var rr = R * sale * (.55 + k * .22), al = Math.max(0, 1 - e * 1.25) * (1 - k * .25);
        if (al <= 0) continue; ctxE.fillStyle = "rgba(26,64,255," + al + ")";
        var n = Math.round(rr / (11 * d)); for (var i = 0; i < n; i++) { var aa = i / n * Math.PI * 2; ctxE.fillRect(X + Math.cos(aa) * rr * 1.25 - 2 * d, Y + Math.sin(aa) * rr - 2 * d, 4 * d, 4 * d); }
      }
      var queda = 1 - .62 * Math.min(1, Math.max(0, (e - .45) / .55));
      part.forEach(function (p) {
        var dist = R * sale * (.18 + .82 * p.v), x = X + Math.cos(p.a) * dist * 1.25, y = Y + Math.sin(p.a) * dist * .82;
        if (x < -10 || y < -10 || x > W + 10 || y > H + 10) return;
        ctxE.globalAlpha = queda * (p.j < .3 ? .55 : 1); ctxE.fillStyle = p.c;
        var t = p.s * d * (1 - .35 * e); ctxE.fillRect(x - t / 2, y - t / 2, t, t);
      });
      ctxE.globalAlpha = 1;
    }
    medirE(); window.addEventListener("resize", medirE);
    /* el anillo que se llena: de .47 a .63, justo antes de que el punto crezca y estalle */
    var carga = document.createElement("div"); carga.className = "punto-carga"; carga.setAttribute("aria-hidden", "true");
    carga.innerHTML = '<svg viewBox="0 0 84 84"><circle class="base" cx="42" cy="42" r="36"/><circle class="lleno" cx="42" cy="42" r="36"/></svg><b>0 %</b>';
    punto.parentNode.insertBefore(carga, punto);
    var arco = carga.querySelector(".lleno"), largo = 2 * Math.PI * 36, cifraC = carga.querySelector("b"), estC = { p: 0 };
    var pintarC = function () { var v = estC.p; arco.setAttribute("stroke-dasharray", "2 7"); arco.style.strokeDashoffset = 0; arco.setAttribute("pathLength", "1"); arco.style.strokeDasharray = v + " " + (1 - v + .0001); cifraC.textContent = Math.round(v * 100) + " %"; };
    pintarC();
    pt.to(carga, { opacity: 1, duration: .03 }, .45)
      .to(estC, { p: 1, duration: .17, ease: "none", onUpdate: pintarC }, .46)
      .to(carga, { scale: 1.6, opacity: 0, duration: .04, ease: "power2.in" }, .64);
    pt.to(pp, { x: function (i, el) { return cx() - rel(el).x; }, y: function (i, el) { return cy() - rel(el).y; }, scale: .05, opacity: 0, duration: .14, ease: "power3.in", stagger: .015 }, .46);
    /* el paso a Leasefy: uno por uno, cada aviso se vuelve voltaje y lo absorbe el punto que se carga */
    var anilloSvg = carga.querySelector("svg"), pasoAbs = (.6 - .47 - .075) / Math.max(1, visibles.length - 1);
    visibles.forEach(function (c, k) {
      var t = .47 + k * pasoAbs, ci = c.firstElementChild;
      pt.to(ci, { backgroundColor: "#1A40FF", color: "#FFFFFF", duration: .012, ease: "none" }, t)
        .to(c, { x: function () { return cx() - rel(c).x; }, y: function () { return cy() - rel(c).y; }, scale: .12, rotate: "+=" + (k % 2 ? 50 : -50), opacity: 0, duration: .065, ease: "power3.in" }, t + .01)
        .add(function () { gsap.fromTo(anilloSvg, { scale: 1.14 }, { scale: 1, duration: .4, ease: "power2.out", overwrite: true }); }, t + .074);
    });
    pt.to(punto, { scale: 1, duration: .05, ease: "back.out(3)" }, .6)
      .to(punto, { scale: 2.6, duration: .04, ease: "power2.in" }, .64)
      .to(punto, { scale: 0, duration: .02 }, .68)
      .to(estE, { e: 1, duration: .24, ease: "none", onUpdate: dibujarE }, .67);
    if (tUno) pt.fromTo(tUno.w, { yPercent: 110, scale: .6 }, { yPercent: 0, scale: 1, stagger: .025, duration: .12, ease: "power3.out" }, .7);
    pt.to(".prob-uno .lead", { opacity: 1, duration: .1 }, .8)
      .to(".capas-mini li", { opacity: 1, stagger: .03, duration: .08 }, .84)
      .to({}, { duration: .06 });
    chips.forEach(function (c, i) { gsap.to(c.firstElementChild, { y: i % 2 ? 7 : -7, duration: 2.4 + i * .3, ease: "sine.inOut", yoyo: true, repeat: -1 }); });
  }

  /* ── tres capas: un mismo registro (Camila) unido por dots a CRM, ERP y agentes ── */
  var capas = $(".capas");
  if (capas) {
    var red = $(".red", capas), items = $$(".capas-txt li", capas), lOn = $$(".rl-on", red), lOff = $$(".rl", red), centro = $(".nodo.centro", red);
    var nodos = [$(".n0", red), $(".n1", red), $(".n2", red)], largo = [0, 0, 0], prog = [0, 0, 0];
    var trazarRed = function () {
      var R = red.getBoundingClientRect(), c = centro.getBoundingClientRect(), cx0 = c.left + c.width / 2 - R.left, cy0 = c.top + c.height / 2 - R.top;
      nodos.forEach(function (n, i) {
        var b = n.getBoundingClientRect(), x = b.left + b.width / 2 - R.left, y = b.top + b.height / 2 - R.top;
        var d = "M" + cx0 + "," + cy0 + " C" + cx0 + "," + (cy0 + (y - cy0) * .6) + " " + x + "," + (y - (y - cy0) * .4) + " " + x + "," + y;
        lOff[i].setAttribute("d", d); lOn[i].setAttribute("d", d);
        largo[i] = lOn[i].getTotalLength(); dibujarParcial(i, prog[i]);
      });
    };
    var dibujarParcial = function (i, p) {
      // la línea encendida crece desde Camila hasta la capa: se recorta con su propio largo
      prog[i] = p; var L = largo[i]; if (!L) return;
      var n = Math.floor(L * p / 12), pat = []; for (var k = 0; k < n; k++) pat.push("0 12");
      lOn[i].style.strokeDasharray = n ? pat.join(" ") + " 0 " + (L + 24) : "0 " + (L + 24);
    };
    var activa = function (i) { capas.dataset.activa = i; items.forEach(function (li, j) { li.classList.toggle("on", j === i); }); };
    window.addEventListener("resize", trazarRed); trazarRed();
    ScrollTrigger.addEventListener("refresh", trazarRed);
    gsap.timeline({ scrollTrigger: { trigger: capas, start: "top 78%", end: "bottom 50%", scrub: .6,
      onUpdate: function (s) {
        var p = s.progress; activa(p < .4 ? 0 : p < .72 ? 1 : 2);
        [[0, .05, .3], [1, .38, .62], [2, .7, .92]].forEach(function (r) { dibujarParcial(r[0], Math.min(1, Math.max(0, (p - r[1]) / (r[2] - r[1])))); });
      } } })
      .fromTo(centro, { scale: .8, opacity: 0 }, { scale: 1, opacity: 1, duration: .1, ease: "back.out(2)" }, 0)
      .fromTo(nodos, { opacity: .35, y: 12 }, { opacity: 1, y: 0, stagger: .3, duration: .1 }, .05)
      .fromTo(".nbar i", { scaleX: 0 }, { scaleX: 1, duration: .2 }, .45)
      .to({}, { duration: .3 });
  }

  /* ── agentes: el chat de Laura y las tres tarjetas ── */
  var msgs = $$("#waMsgs .msg"), esc2 = $("#waMsgs .escribe");
  function chat() {
    gsap.killTweensOf(msgs);
    msgs.forEach(function (m) { m.style.display = "none"; });
    var tl = gsap.timeline();
    msgs.forEach(function (m, i) {
      var yo = m.classList.contains("yo");
      if (!yo) tl.add(function () { esc2.style.display = "flex"; }, "+=.25").to({}, { duration: .7 });
      tl.add(function () { esc2.style.display = "none"; m.style.display = "block"; gsap.fromTo(m, { opacity: 0, y: 10, scale: .97 }, { opacity: 1, y: 0, scale: 1, duration: .45, ease: "expo.out", transformOrigin: yo ? "100% 100%" : "0 100%" }); }, yo ? "+=.9" : undefined);
    });
    return tl;
  }
  ScrollTrigger.create({ trigger: "#celMori", start: "top 75%", onEnter: chat, onEnterBack: chat });
  gsap.from("#celMori", { rotateY: -18, rotateX: 6, y: 60, opacity: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: ".ag-cob", start: "top 70%" } });
  gsap.from(".llamada", { y: 30, opacity: 0, duration: .8, ease: "expo.out", delay: .6, scrollTrigger: { trigger: ".ag-cob", start: "top 60%" } });

  function puntaje(numEl, dots) {
    var o = { v: 0 };
    gsap.to(o, { v: 86, duration: 1.4, ease: "expo.out", onUpdate: function () {
      numEl.textContent = Math.round(o.v);
      var n = Math.round(o.v / 5); dots.forEach(function (d, j) { d.classList.toggle("on", j < n); });
    } });
  }
  function aseguradoras(cont) {
    $$(".badge[data-final]", cont).forEach(function (b, j) {
      b.textContent = "Consultando"; b.className = "badge p";
      gsap.delayedCall(.5 + j * .55, function () { b.textContent = b.dataset.final; b.className = "badge" + (b.dataset.tono === "a" ? " a" : ""); gsap.fromTo(b, { scale: .85 }, { scale: 1, duration: .4, ease: "back.out(2)" }); });
    });
  }
  ScrollTrigger.create({ trigger: "#agEstudio", start: "top 80%", once: true, onEnter: function () { puntaje($("#puntaje"), $$("#puntDots i")); } });
  ScrollTrigger.create({ trigger: "#agMatch", start: "top 80%", once: true, onEnter: function () { gsap.from("#agMatch .vfila", { opacity: 0, x: -12, stagger: .12, duration: .5, ease: "expo.out", delay: .2 }); } });
  ScrollTrigger.create({ trigger: "#agAseg", start: "top 80%", once: true, onEnter: function () { aseguradoras($("#agAseg")); } });
  gsap.from("#orbeOri", { scale: .4, opacity: 0, duration: 1.4, ease: "expo.out", scrollTrigger: { trigger: ".ag-pie", start: "top 80%" } });

  /* ── cómo funciona: el escenario cambia de pantalla y de marco ── */
  var pasos = $$(".paso"), chip = $("#escChip"), tres = $$(".esc-3d img"), vistas = $$("#appm .vista"), caps = $$("#escLap .cap");
  var cel = $("#escCel"), lap = $("#escLap"), actual = 0, enLaptop = false;
  gsap.set(lap, { autoAlpha: 0, rotateY: 70 });
  function introVista(i) {
    var v = vistas[i]; if (!v) return;
    gsap.fromTo($$(".vh, .vcard", v), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .55, stagger: .08, ease: "expo.out" });
    if (i === 0) { $("#vEnProceso").textContent = "23"; gsap.fromTo("#vNuevo", { opacity: 0, y: -16, scale: .96 }, { opacity: 1, y: 0, scale: 1, duration: .6, delay: .5, ease: "expo.out", onComplete: function () { $("#vEnProceso").textContent = "24"; } }); }
    if (i === 1) { aseguradoras(v); gsap.fromTo("#vVeredicto", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .5, delay: 2.3 }); }
    if (i === 2) puntaje($("#vPunt"), $$("#vDots i"));
    if (i === 3) { var b = $("#vEnviar"); b.classList.remove("hecho"); b.textContent = "Enviar las 4 opciones a Julián"; gsap.from($$(".vfila", v), { opacity: 0, x: -10, stagger: .1, duration: .45, delay: .25 }); gsap.delayedCall(1.6, function () { b.classList.add("hecho"); b.textContent = "Enviadas a Julián por correo"; }); }
  }
  function ponPaso(i) {
    if (i === actual) return;
    var antes = actual; actual = i;
    pasos.forEach(function (p, j) { p.classList.toggle("on", j === i); });
    gsap.fromTo(chip, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: .35, onStart: function () { chip.textContent = pasos[i].dataset.chip; } });
    tres.forEach(function (im, j) {
      if (j === i) gsap.fromTo(im, { opacity: 0, y: 40, rotate: -10, scale: .8 }, { opacity: 1, y: 0, rotate: 0, scale: 1, duration: .8, ease: "expo.out" });
      else if (j === antes) gsap.to(im, { opacity: 0, y: -30, rotate: 8, duration: .4 });
      else gsap.set(im, { opacity: 0 });
    });
    var quiereLaptop = i >= 4;
    if (quiereLaptop !== enLaptop) {
      enLaptop = quiereLaptop;
      var sale = quiereLaptop ? cel : lap, entra = quiereLaptop ? lap : cel;
      gsap.timeline().to(sale, { rotateY: -75, autoAlpha: 0, duration: .4, ease: "power2.in" })
        .fromTo(entra, { rotateY: 75, autoAlpha: 0 }, { rotateY: 0, autoAlpha: 1, duration: .7, ease: "expo.out" }, .25);
    }
    if (i < 4) {
      vistas.forEach(function (v, j) { v.classList.toggle("on", j === i); });
      introVista(i);
    } else {
      caps.forEach(function (c, j) { c.classList.toggle("on", j === i - 4); });
    }
  }
  pasos.forEach(function (p, i) {
    ScrollTrigger.create({ trigger: p, start: function () { return LF.desk() ? "top 55%" : "top 80%"; }, end: function () { return LF.desk() ? "bottom 55%" : "bottom 80%"; },
      onToggle: function (s) { if (s.isActive) ponPaso(i); } });
  });
  ScrollTrigger.create({ trigger: ".escenario", start: "top 80%", once: true, onEnter: function () { introVista(0); } });
  gsap.from("#escCel", { y: 80, rotateX: 16, opacity: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: ".como-grid", start: "top 80%" } });

  /* ── retención: Vinci barre el portafolio, encuentra a tres y se quedan ── */
  var dots = $$("#campo i");
  if (dots.length) {
    var riesgo = RIESGO.map(function (n) { return dots[n]; }).filter(Boolean);
    var sen = $$("#senales li"), estK = $("#retEstado"), est = $("#retEst"), tx = $("#retTexto"), pasosR = $$(".ret-pasos li"), barr = $(".barrido"), caja = $(".campo-caja");
    var cols = function () { return getComputedStyle($("#campo")).gridTemplateColumns.split(" ").length; };
    var fase = -1;
    var ponFase = function (f) {
      if (f === fase) return; fase = f;
      pasosR.forEach(function (li, j) { li.classList.toggle("on", j === Math.max(0, Math.min(2, f - 1))); });
      riesgo.forEach(function (d) { d.classList.toggle("riesgo", f === 2); d.classList.toggle("bien", f === 3); });
      sen.forEach(function (li, j) {
        li.classList.toggle("ok", f === 3 && j < 2);
        li.querySelector(".st").textContent = f === 3 ? (j < 2 ? "Renovó · 12 meses" : "Llamar hoy") : "Llamar hoy";
      });
      gsap.to(sen, { opacity: f >= 2 ? 1 : 0, y: f >= 2 ? 0 : 10, stagger: .12, duration: .5, ease: "expo.out", overwrite: true });
      if (f <= 1) { estK.textContent = "Revisando…"; estK.className = "r"; }
      if (f === 2) { estK.textContent = "3 con señales de irse"; estK.className = "r alerta"; est.textContent = "En riesgo · llama hoy"; est.className = "est2"; tx.textContent = "3 propietarios muestran señales de irse. Te dejé a quién llamar primero y qué decirle."; }
      if (f === 3) { estK.textContent = "2 renovaron hoy"; estK.className = "r ok"; est.textContent = "Renovaron · 12 meses más"; est.className = "est2 ok"; tx.textContent = "Llamaste a tiempo: Gloria y Jorge renovaron con ustedes. Inversiones Ríos sigue en tu lista de hoy."; }
    };
    /* Nico 23-10 («al final del scroll el bloque de Retención se daña»): cada fase cambia textos de distinto largo
       y el bloque crecía al llegar al final (80 px a 390, 21 px a 1440), empujando todo lo de abajo y saltando al
       volver. Cada caja reserva el alto de su texto más largo (los mismos textos de ponFase), así nada se mueve. */
    var VARIANTES = [
      [$("#retVis .campo-k"), estK, ["Revisando…", "3 con señales de irse", "2 renovaron hoy"]],
      [tx, tx, ["3 propietarios muestran señales de irse. Te dejé a quién llamar primero y qué decirle.", "Llamaste a tiempo: Gloria y Jorge renovaron con ustedes. Inversiones Ríos sigue en tu lista de hoy."]],
      [est, est, ["En riesgo · llama hoy", "Renovaron · 12 meses más"]]
    ].concat(sen.map(function (li) { return [li, li.querySelector(".st"), ["Llamar hoy", "Renovó · 12 meses"]]; }));
    var reservar = function () {
      VARIANTES.forEach(function (v) {
        var caja = v[0], el = v[1], antes = el.textContent, alto = 0;
        if (!caja || !el) return;
        caja.style.minHeight = "";
        v[2].forEach(function (t) { el.textContent = t; alto = Math.max(alto, caja.offsetHeight); });
        el.textContent = antes; caja.style.minHeight = alto + "px";
      });
    };
    reservar();
    window.addEventListener("resize", reservar);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(reservar);
    var rt = gsap.timeline({ scrollTrigger: { trigger: "#retVis", start: "top 75%", end: "bottom 30%", scrub: .6,
      onUpdate: function (s) {
        var p = s.progress, c = cols(), barrX = Math.min(1, Math.max(0, (p - .12) / .4));
        dots.forEach(function (d, j) { var x = (j % c) / (c - 1); d.classList.toggle("vis", x <= barrX && !d.classList.contains("riesgo") && !d.classList.contains("bien")); });
        ponFase(p < .12 ? 0 : p < .54 ? 1 : p < .8 ? 2 : 3);
      } } });
    rt.fromTo(dots, { opacity: 0, scale: .3 }, { opacity: 1, scale: 1, stagger: { each: .0015, from: "random" }, duration: .08, ease: "back.out(2)" }, 0)
      .fromTo(barr, { left: "0%", opacity: 0 }, { opacity: 1, duration: .02 }, .12)
      .to(barr, { left: "100%", ease: "none", duration: .4 }, .12)
      .to(barr, { opacity: 0, duration: .03 }, .52)
      .to({}, { duration: .46 }, .54);
    gsap.from(".ret-aviso", { y: 24, opacity: 0, duration: .8, ease: "expo.out", scrollTrigger: { trigger: ".ret-aviso", start: "top 95%" } });
  }

  /* ── finanzas: cobrar → recaudar → girar → conciliar ── */
  var fin = $(".fin-alto");
  if (fin) {
    var bloques = $$(".fin-b"), estR = $$(".est-r"), lleno = $("#rutaLleno"), f3d = $$(".fin-3d img");
    var fLap = $("#finLap"), fCel = $("#finCel"), fCaps = $$(".fin-esc .cap"), fAct = 0, fDisp = "laptop", fTl = null;
    gsap.set(fCel, { autoAlpha: 0, rotateY: 70 });
    var ponE = function (i) {
      if (i === fAct) return;
      var antes = fAct; fAct = i;
      estR.forEach(function (e, j) { e.classList.toggle("on", j === i); e.classList.toggle("hecho", j < i); });
      bloques.forEach(function (b, j) {
        if (j === i) {
          b.classList.add("on");
          gsap.fromTo(b, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: .6, ease: "expo.out" });
          var c = $(".cifra", b); LF.contar(c, 0, +c.dataset.v, 1.3, +c.dataset.d);
          gsap.from($$("li", b), { opacity: 0, x: -12, stagger: .08, duration: .5, delay: .2 });
        } else if (j === antes) { gsap.to(b, { opacity: 0, y: -16, duration: .3, onComplete: function () { b.classList.remove("on"); } }); }
        else b.classList.remove("on");
      });
      f3d.forEach(function (im, j) {
        if (j === i) gsap.fromTo(im, { opacity: 0, y: 50, rotate: -12, scale: .8 }, { opacity: 1, y: 0, rotate: 0, scale: 1, duration: .9, ease: "expo.out" });
        else gsap.to(im, { opacity: 0, y: -30, duration: .35 });
      });
      fCaps.forEach(function (c) { c.classList.toggle("on", +c.dataset.e === i); });
      var quiere = i % 2 ? "celular" : "laptop";
      if (quiere !== fDisp) {
        fDisp = quiere;
        var sale = quiere === "celular" ? fLap : fCel, entra = quiere === "celular" ? fCel : fLap;
        if (fTl) fTl.kill();
        gsap.killTweensOf([fLap, fCel]);
        fTl = gsap.timeline().to(sale, { rotateY: -80, autoAlpha: 0, duration: .4, ease: "power2.in" })
          .fromTo(entra, { rotateY: 80, autoAlpha: 0 }, { rotateY: 0, autoAlpha: 1, duration: .75, ease: "expo.out" }, .28);
      }
    };
    /* cada paso entra con un solo gesto: el primero cambia apenas el escenario se fija */
    var stF = ScrollTrigger.create({ trigger: fin, start: "top top+=68", end: "bottom bottom", onUpdate: function (s) { /* Nico 23-10: la ruta se llena con el scroll y se sabe cuándo llega al siguiente punto */ if (lleno) lleno.style.width = Math.min(100, s.progress * 3.6 / 3 * 100) + "%"; ponE(Math.min(3, Math.floor(s.progress * 3.6))); } });
    estR.forEach(function (e, i) { e.addEventListener("click", function () { var y = stF.start + (stF.end - stF.start) * Math.min(.98, (i + .15) / 3.6); if (LF.lenis) LF.lenis.scrollTo(y, { duration: 1 }); else window.scrollTo(0, y); }); });
    ScrollTrigger.create({ trigger: fin, start: "top 70%", once: true, onEnter: function () { var c = $(".fin-b.on .cifra"); LF.contar(c, 0, +c.dataset.v, 1.3, +c.dataset.d); } });
    gsap.from("#finLap", { y: 80, rotateX: 18, opacity: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: fin, start: "top 75%" } });
  }

  /* ── la ciudad: las estrías se abren al bajar y aparece Medellín (foto de 3200 px, nítida a todo lo ancho) ── */
  gsap.fromTo(".ciudad canvas", { clipPath: "inset(0 0% 0 0)" }, { clipPath: "inset(0 0% 0 100%)", ease: "none", scrollTrigger: { trigger: ".ciudad", start: "top 55%", end: "bottom 25%", scrub: .6 } });
  gsap.fromTo(".ciudad > img", { scale: 1.06 }, { scale: 1, ease: "none", scrollTrigger: { trigger: ".ciudad", start: "top bottom", end: "bottom top", scrub: .6 } });

  /* ── Portofino: de estrías a foto ── */
  if (foto) {
    gsap.fromTo(foto.querySelector("canvas"), { clipPath: "inset(0 0 0 0%)" }, { clipPath: "inset(0 0 0 100%)", ease: "none", scrollTrigger: { trigger: foto, start: "top 60%", end: "bottom 45%", scrub: .6 } });
    gsap.fromTo("#nota", { rotate: 7, y: 80, opacity: 0 }, { rotate: -1.6, y: 0, opacity: 1, ease: "none", scrollTrigger: { trigger: "#nota", start: "top 95%", end: "top 60%", scrub: .6 } });
    /* el timbre se estampa una vez, cuando la nota ya llegó; las ondas del matasellos aparecen detrás */
    gsap.timeline({ scrollTrigger: { trigger: "#nota", start: "top 62%", once: true } })
      .fromTo("#nota .timbre", { scale: 1.35, rotate: -9, opacity: 0 }, { scale: 1, rotate: 3, opacity: 1, duration: .55, ease: "back.out(1.7)" })
      .fromTo("#nota .ondas", { opacity: 0, x: -10 }, { opacity: .42, x: 0, duration: .5, ease: "expo.out" }, .3);
  }

  /* ── el cierre: la corriente sube y la noche corre sola ── */
  gsap.to(".fin-pix", { opacity: 1, y: 0, ease: "none", scrollTrigger: { trigger: ".contacto", start: "top 85%", end: "top 25%", scrub: .6 } });
  $$("#pista i").forEach(function (b, k) { b.style.animationDelay = (k * .09) + "s"; });
  gsap.from(".pl-todo .equipo .orbe-host", { scale: 0, stagger: .1, duration: .7, ease: "back.out(2)", scrollTrigger: { trigger: ".pl-todo", start: "top 80%" } });
  gsap.fromTo(".pl-todo", { clipPath: "inset(14% 10% 14% 10% round 28px)" }, { clipPath: "inset(0% 0% 0% 0% round 28px)", ease: "none", scrollTrigger: { trigger: ".pl-todo", start: "top 95%", end: "top 45%", scrub: .6 } });
  gsap.from(".pl-todo h3 .pwi", { yPercent: 110, stagger: .05, duration: 1, ease: "expo.out", scrollTrigger: { trigger: ".pl-todo", start: "top 70%" } });
  if (window.matchMedia("(hover:hover)").matches) $$("[data-tilt]").forEach(function (c) {
    c.addEventListener("mousemove", function (e) { var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; gsap.to(c, { rotateY: x * 8, rotateX: -y * 8, y: -8, transformPerspective: 900, duration: .5, ease: "power2.out" }); });
    c.addEventListener("mouseleave", function () { gsap.to(c, { rotateY: 0, rotateX: 0, y: 0, duration: .7, ease: "expo.out" }); });
  });

  window.addEventListener("load", function () { ScrollTrigger.refresh(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
})();
