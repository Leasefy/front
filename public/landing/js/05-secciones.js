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

  /* la foto de Portofino florece del duotono a su color (js/09-campos.js, Nico 29-10) */
  var foto = $("#fotoPortofino");

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
    if (apT) { if (window.gsap && MOV) gsap.fromTo(apT, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .45, ease: "expo.out", onStart: function () { apT.textContent = LF.t(it[1]); } }); else apT.textContent = LF.t(it[1]); }
  }
  LF.autopiloto = function (on) {
    clearInterval(apI); apI = null;
    if (on) { apK = 0; apPaso(); if (MOV) apI = setInterval(apPaso, 2300); }
  };

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
      onUpdate: function (s) { var tt = s.progress * pt.duration(); esc.classList.toggle("suena", tt > .16 && tt < .3); } } });
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
    /* 29-10 (Nico eligió «Ondas del símbolo»): en vez del estallido de puntos, el techo de Leasefy en ondas que nacen
       del centro; el scroll las trae y las ondas siguen solas (CSS) */
    var ondasE = $(".ondas-uno", esc), estE = { e: 0 };
    function dibujarE() { if (!ondasE) return; var e = estE.e; ondasE.style.opacity = Math.min(1, e * 2.2); ondasE.style.transform = "scale(" + (.86 + .14 * Math.min(1, e * 1.6)) + ")"; }
    dibujarE();
    /* el anillo que se llena: de .47 a .63, justo antes de que el punto crezca y estalle */
    var carga = document.createElement("div"); carga.className = "punto-carga"; carga.setAttribute("aria-hidden", "true");
    carga.innerHTML = '<svg viewBox="0 0 84 84"><circle class="base" cx="42" cy="42" r="36"/><circle class="lleno" cx="42" cy="42" r="36"/></svg><b>0 %</b>';
    punto.parentNode.insertBefore(carga, punto);
    var arco = carga.querySelector(".lleno"), largo = 2 * Math.PI * 36, cifraC = carga.querySelector("b"), estC = { p: 0 };
    var pintarC = function () { var v = estC.p; arco.setAttribute("stroke-dasharray", "2 7"); arco.style.strokeDashoffset = 0; arco.setAttribute("pathLength", "1"); arco.style.strokeDasharray = v + " " + (1 - v + .0001); cifraC.textContent = Math.round(v * 100) + " %"; };
    pintarC();
    /* Nico 23-10: la carga y el estallido van despacio, para que se sienta el «boom» (el doble de scroll que antes) */
    pt.to(carga, { opacity: 1, duration: .03 }, .45)
      .to(estC, { p: 1, duration: .3, ease: "none", onUpdate: pintarC }, .46)
      .to(carga, { scale: 1.6, opacity: 0, duration: .05, ease: "power2.in" }, .8);
    pt.to(pp, { x: function (i, el) { return cx() - rel(el).x; }, y: function (i, el) { return cy() - rel(el).y; }, scale: .05, opacity: 0, duration: .18, ease: "power3.in", stagger: .02 }, .46);
    /* el paso a Leasefy: uno por uno, cada aviso se vuelve voltaje y lo absorbe el punto que se carga */
    var anilloSvg = carga.querySelector("svg"), pasoAbs = (.74 - .47 - .075) / Math.max(1, visibles.length - 1);
    visibles.forEach(function (c, k) {
      var t = .47 + k * pasoAbs, ci = c.firstElementChild;
      pt.to(ci, { backgroundColor: "#1A40FF", color: "#FFFFFF", duration: .012, ease: "none" }, t)
        .to(c, { x: function () { return cx() - rel(c).x; }, y: function () { return cy() - rel(c).y; }, scale: .12, rotate: "+=" + (k % 2 ? 50 : -50), opacity: 0, duration: .065, ease: "power3.in" }, t + .01)
        .add(function () { gsap.fromTo(anilloSvg, { scale: 1.14 }, { scale: 1, duration: .4, ease: "power2.out", overwrite: true }); }, t + .074);
    });
    pt.to(punto, { scale: 1, duration: .05, ease: "back.out(3)" }, .74)
      .to(punto, { scale: 2.6, duration: .05, ease: "power2.in" }, .79)
      .to(punto, { scale: 0, duration: .02 }, .84)
      .to(estE, { e: 1, duration: .4, ease: "none", onUpdate: dibujarE }, .83);
    if (tUno) pt.fromTo(tUno.w, { yPercent: 110, scale: .6 }, { yPercent: 0, scale: 1, stagger: .03, duration: .14, ease: "power3.out" }, .9);
    pt.to(".prob-uno .lead", { opacity: 1, duration: .1 }, 1.02)
      .to(".capas-mini li", { opacity: 1, stagger: .03, duration: .08 }, 1.06)
      .to({}, { duration: .08 });
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
    LF.alCambiarDeTamano(trazarRed); trazarRed();
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
      b.textContent = LF.t("Consultando"); b.className = "badge p";
      gsap.delayedCall(.5 + j * .55, function () { b.textContent = LF.t(b.dataset.final); b.className = "badge" + (b.dataset.tono === "a" ? " a" : ""); gsap.fromTo(b, { scale: .85 }, { scale: 1, duration: .4, ease: "back.out(2)" }); });
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
    if (i === 3) { var b = $("#vEnviar"); b.classList.remove("hecho"); b.textContent = LF.t("Enviar las 4 opciones a Julián"); gsap.from($$(".vfila", v), { opacity: 0, x: -10, stagger: .1, duration: .45, delay: .25 }); gsap.delayedCall(1.6, function () { b.classList.add("hecho"); b.textContent = LF.t("Enviadas a Julián por correo"); }); }
  }
  function ponPaso(i) {
    if (i === actual) return;
    var antes = actual; actual = i;
    pasos.forEach(function (p, j) { p.classList.toggle("on", j === i); });
    gsap.fromTo(chip, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: .35, onStart: function () { chip.textContent = LF.t(pasos[i].dataset.chip); } });
    /* en el celular la figura 3D sólo cambia con un fundido: entrar girando en cada paso se veía como un parpadeo */
    var suave = !LF.desk();
    tres.forEach(function (im, j) {
      if (j === i) {
        if (suave) gsap.fromTo(im, { opacity: 0 }, { opacity: 1, y: 0, rotate: 0, scale: 1, duration: .45, ease: "power1.out" });
        else gsap.fromTo(im, { opacity: 0, y: 40, rotate: -10, scale: .8 }, { opacity: 1, y: 0, rotate: 0, scale: 1, duration: .8, ease: "expo.out" });
      }
      else if (j === antes) gsap.to(im, suave ? { opacity: 0, duration: .35 } : { opacity: 0, y: -30, rotate: 8, duration: .4 });
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
  /* Nico 27-10 («en responsive, cuando llega a los lugares donde hay animación de scroll e imagen, la imagen
     comienza a rebotar»): con el dedo el scroll va y viene unos píxeles. Parado en el borde entre dos pasos, cada
     vaivén cambiaba de paso y la imagen volvía a entrar (subía, giraba y crecía) una y otra vez: 10 vaivenes de
     25 px = 10 cambios. Ahora el paso cambia sólo al pasar el borde con holgura, y para volver al anterior hay que
     devolverse esa misma holgura: el vaivén chico no cambia nada. */
  var stPasos = pasos.map(function (p) {
    return ScrollTrigger.create({ trigger: p, start: function () { return LF.desk() ? "top 55%" : "top 80%"; }, end: function () { return LF.desk() ? "bottom 55%" : "bottom 80%"; } });
  });
  var elegirPaso = function () {
    if (!stPasos.length) return;
    var s = stPasos[0].scroll(), h = LF.holgura(), i = actual;
    while (i < stPasos.length - 1 && s >= stPasos[i + 1].start + h) i++;
    while (i > 0 && s <= stPasos[i].start - h) i--;
    ponPaso(i);
  };
  ScrollTrigger.create({ start: 0, end: "max", onUpdate: elegirPaso, onRefresh: elegirPaso });
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
        li.querySelector(".st").textContent = LF.t(f === 3 ? (j < 2 ? "Renovó · 12 meses" : "Llamar hoy") : "Llamar hoy");
      });
      gsap.to(sen, { opacity: f >= 2 ? 1 : 0, y: f >= 2 ? 0 : 10, stagger: .12, duration: .5, ease: "expo.out", overwrite: true });
      if (f <= 1) { estK.textContent = LF.t("Revisando…"); estK.className = "r"; }
      if (f === 2) { estK.textContent = LF.t("3 con señales de irse"); estK.className = "r alerta"; est.textContent = LF.t("En riesgo · llama hoy"); est.className = "est2"; tx.textContent = LF.t("3 propietarios muestran señales de irse. Te dejé a quién llamar primero y qué decirle."); }
      if (f === 3) { estK.textContent = LF.t("2 renovaron hoy"); estK.className = "r ok"; est.textContent = LF.t("Renovaron · 12 meses más"); est.className = "est2 ok"; tx.textContent = LF.t("Llamaste a tiempo: Gloria y Jorge renovaron con ustedes. Inversiones Ríos sigue en tu lista de hoy."); }
    };
    /* Nico 23-10 («al final del scroll el bloque de Retención se daña»): cada fase cambia textos de distinto largo
       y el bloque crecía al llegar al final (80 px a 390, 21 px a 1440), empujando todo lo de abajo y saltando al
       volver. Cada caja reserva el alto de su texto más largo (los mismos textos de ponFase), así nada se mueve. */
    var VARIANTES = [
      [$("#retVis .campo-k"), estK, ["Revisando…", "3 con señales de irse", "2 renovaron hoy"]],
      [tx, tx, ["3 propietarios muestran señales de irse. Te dejé a quién llamar primero y qué decirle.", "Llamaste a tiempo: Gloria y Jorge renovaron con ustedes. Inversiones Ríos sigue en tu lista de hoy."]],
      [est, est, ["En riesgo · llama hoy", "Renovaron · 12 meses más"]]
    ].concat(sen.map(function (li) { return [li, li.querySelector(".st"), ["Llamar hoy", "Renovó · 12 meses"]]; }));
    VARIANTES.forEach(function (v) { v[2] = v[2].map(LF.t); });
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
    LF.alCambiarDeTamano(reservar);
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
    /* Nico 23-10: la ruta se llena con el scroll y llega a cada punto JUSTO cuando ese paso se enciende (antes los
       puntos estaban al 25/50/75 % y la línea se llenaba como si estuvieran al 33/66/100 %: pasaba el punto sin cambiar). */
    var centros = [], anchoRuta = 0, rutaEl = $("#ruta");
    var medirRuta = function () { anchoRuta = rutaEl.clientWidth; centros = estR.map(function (e) { var i = e.querySelector("i"); return e.offsetLeft + i.offsetLeft + i.offsetWidth / 2; }); };
    var llenar = function (p) {
      if (!lleno) return; if (!centros.length || !anchoRuta) medirRuta();
      var seg = p * 3.6, w;
      if (seg < 3) { var k = Math.floor(seg); w = centros[k] + (centros[k + 1] - centros[k]) * (seg - k); }
      else w = centros[3] + (anchoRuta - centros[3]) * Math.min(1, (seg - 3) / .6);
      lleno.style.width = Math.max(0, w) + "px";
    };
    LF.alCambiarDeTamano(function () { centros = []; });
    /* el mismo vaivén del dedo (ver «cómo funciona»): cada paso cambia con holgura, no justo en el borde */
    var elegirE = function (s) {
      var seg = s.progress * 3.6, largo = (s.end - s.start) / 3.6, h = largo > 0 ? LF.holgura() / largo : 0, i = fAct;
      while (i < 3 && seg >= i + 1 + h) i++;
      while (i > 0 && seg <= i - h) i--;
      ponE(i);
    };
    var stF = ScrollTrigger.create({ trigger: fin, start: "top top+=68", end: "bottom bottom", onUpdate: function (s) { llenar(s.progress); elegirE(s); } });
    estR.forEach(function (e, i) { e.addEventListener("click", function () { var y = stF.start + (stF.end - stF.start) * Math.min(.98, (i + .15) / 3.6); if (LF.lenis) LF.lenis.scrollTo(y, { duration: 1 }); else window.scrollTo(0, y); }); });
    ScrollTrigger.create({ trigger: fin, start: "top 70%", once: true, onEnter: function () { var c = $(".fin-b.on .cifra"); LF.contar(c, 0, +c.dataset.v, 1.3, +c.dataset.d); } });
    gsap.from("#finLap", { y: 80, rotateX: 18, opacity: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: fin, start: "top 75%" } });
  }

  /* ── la ciudad: Medellín florece del duotono (09-campos.js) y se acerca al bajar (foto de 3200 px, nítida a todo lo ancho) ── */
  gsap.fromTo(".ciudad > img", { scale: 1.06 }, { scale: 1, ease: "none", scrollTrigger: { trigger: ".ciudad", start: "top bottom", end: "bottom top", scrub: .6 } });

  /* ── Portofino: la nota y su timbre ── */
  if (foto) {
    gsap.fromTo("#nota", { rotate: 7, y: 80, opacity: 0 }, { rotate: -1.6, y: 0, opacity: 1, ease: "none", scrollTrigger: { trigger: "#nota", start: "top 95%", end: "top 60%", scrub: .6 } });
    /* el timbre se estampa una vez, cuando la nota ya llegó; las ondas del matasellos aparecen detrás */
    gsap.timeline({ scrollTrigger: { trigger: "#nota", start: "top 62%", once: true } })
      .fromTo("#nota .timbre", { scale: 1.35, rotate: -9, opacity: 0 }, { scale: 1, rotate: 3, opacity: 1, duration: .55, ease: "back.out(1.7)" })
      .fromTo("#nota .ondas", { opacity: 0, x: -10 }, { opacity: .42, x: 0, duration: .5, ease: "expo.out" }, .3);
  }

  /* ── el cierre: la corriente sube y la noche corre sola ── */
  gsap.to(".fin-campo", { opacity: 1, y: 0, ease: "none", scrollTrigger: { trigger: ".contacto", start: "top 85%", end: "top 25%", scrub: .6 } });
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
