/* ════════════════════════════════════════════════════════════════════
   La landing estática conectada con Leasefy (Nico 24-10-2026: «la página
   con el publicar gratis, entrar, crear cuenta deben de quedar conectados
   con todo lo que hay en producción, que pasaba con la landing pasada»).
   La usan la home y sus internas; va en el <head> para que los botones de
   sesión salgan bien desde la primera pintada.
     1. Sesión: si hay cookie de Supabase, «Ir al panel» en vez de «Entrar» y
        «Crear cuenta» (el panel de cada quien lo decide /ir-al-panel).
     2. Franja del marketplace y número junto a «Marketplace»: lo publicado
        (/api/vitrina-de-la-home). Sin respuesta, sin tarjetas: nunca inventadas.
     3. «Publicar gratis» sin sesión: «¿Quién va a publicar?» encima de la
        página, como la ventana de la landing anterior; la cuenta sigue en /auth
        con el perfil elegido y vuelve al publicador rápido (/publica).
   ════════════════════════════════════════════════════════════════════ */
(function () {
  var raiz = document.documentElement;
  /* en el artefacto de revisión (sin el front) los enlaces van a leasefy.co; en el front, al mismo origen */
  var ORIGEN = window.LF_ORIGEN || "";

  /* 1 ── ¿hay sesión? Sólo SI hay (la cookie de @supabase/ssr), no de quién. */
  try {
    if (/(?:^|;\s*)sb-[a-z0-9]+-auth-token(?:\.0)?=/.test(document.cookie)) raiz.setAttribute("data-sesion", "");
  } catch (e) { /* sin cookies: sin sesión */ }
  var conSesion = raiz.hasAttribute("data-sesion");

  var estilo = document.createElement("style");
  estilo.textContent = [
    "html:not([data-sesion]) [data-con-sesion]{display:none!important}",
    "html[data-sesion] [data-sin-sesion]{display:none!important}",
    ".mk-n{display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:20px;margin-left:7px;padding:0 6px;border-radius:7px;background:var(--arena);font-family:var(--m);font-size:11px;font-weight:500;color:var(--tinta);letter-spacing:.02em;corner-shape:superellipse(1.5)}",
    ".mk-n[hidden]{display:none}",
    ".vit-track.vacia{opacity:0}.vit-track{transition:opacity .6s ease}",
    /* mientras llegan (o si el servidor tarda): tarjetas de espera, nunca la franja vacía (Nico 27-10) */
    ".vi-espera{pointer-events:none}.vi-espera .vi-foto{background:var(--arena,#F3F1ED)}",
    ".vi-espera b,.vi-espera i{display:block;height:11px;border-radius:6px;background:var(--piedra,#E7E3DC)}",
    ".vi-espera b{width:112px;height:13px;margin-bottom:9px}.vi-espera i{width:150px}",
    ".vi-espera{animation:lf-espera 1.4s ease-in-out infinite}",
    "@keyframes lf-espera{50%{opacity:.55}}",
    "@media (prefers-reduced-motion:reduce){.vi-espera{animation:none}}",
    ".vit-pista.sin-datos .vit-track{display:none}",
    ".vit-pista.sin-datos::before{content:attr(data-aviso);margin:auto 0;padding-left:6%;font-size:14px;color:var(--ceniza,#706B64)}",
    ".vi-foto img.foto{width:100%!important;height:100%!important;object-fit:cover;border-radius:inherit}",
    ".lf-pub{position:fixed;inset:0;margin:auto;height:fit-content;width:min(480px,calc(100vw - 32px));max-height:calc(100dvh - 32px);padding:28px;border:0;border-radius:28px;background:var(--sup,#fff);color:var(--tinta);box-shadow:0 30px 80px -20px rgba(20,22,40,.35),0 0 0 1px var(--filete);corner-shape:superellipse(1.5);overflow:auto}",
    ".lf-pub::backdrop{background:rgba(16,18,32,.42);backdrop-filter:blur(3px)}",
    ".lf-pub[open]{animation:lfPubEntra .32s cubic-bezier(.2,.8,.2,1)}",
    "@keyframes lfPubEntra{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}",
    ".lf-pub-x{position:absolute;top:16px;right:16px;width:36px;height:36px;display:grid;place-items:center;border:0;border-radius:12px;background:var(--arena);color:var(--tinta);cursor:pointer;corner-shape:superellipse(1.5)}",
    ".lf-pub-x:hover{background:var(--filete)}",
    ".lf-pub-k{display:flex;align-items:center;gap:10px;margin:0;font-family:var(--m);font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--ceniza)}",
    ".lf-pub-k i{width:8px;height:8px;border-radius:2px;background:var(--voltaje)}",
    ".lf-pub h2{margin:14px 40px 0 0;font-size:clamp(24px,2.6vw,29px);font-weight:420;line-height:1.12;letter-spacing:-.03em}",
    ".lf-pub-d{margin:8px 0 0;font-size:15px;line-height:1.5;color:var(--ceniza)}",
    ".lf-pub-op{display:grid;gap:12px;margin-top:24px}",
    ".lf-pub-c{display:flex;align-items:center;gap:16px;padding:16px;border:1px solid var(--filete);border-radius:20px;background:var(--bg);color:var(--tinta);text-decoration:none;corner-shape:superellipse(1.5);transition:transform .18s ease,border-color .18s ease}",
    ".lf-pub-c:hover{transform:translateY(-1px);border-color:var(--voltaje)}",
    ".lf-pub-c:focus-visible{outline:2px solid var(--voltaje);outline-offset:2px}",
    ".lf-pub-ic{width:48px;height:48px;flex:none;display:grid;place-items:center;border-radius:14px;background:var(--voltaje-suave,#E8ECFF);color:var(--voltaje);corner-shape:superellipse(1.5);transition:background .18s,color .18s}",
    ".lf-pub-c:hover .lf-pub-ic{background:var(--voltaje);color:#fff}",
    ".lf-pub-tx{flex:1;min-width:0}.lf-pub-tx b{display:block;font-size:16px;font-weight:500}.lf-pub-tx span{display:block;margin-top:2px;font-size:13.5px;line-height:1.4;color:var(--ceniza)}",
    ".lf-pub-fl{flex:none;color:var(--ceniza);transition:transform .18s,color .18s}.lf-pub-c:hover .lf-pub-fl{transform:translateX(2px);color:var(--voltaje)}",
    ".lf-pub-pie{margin:28px 0 0;padding-top:18px;border-top:1px solid var(--filete);font-size:13.5px;color:var(--ceniza)}",
    ".lf-pub-pie a{font-weight:500;color:var(--voltaje);text-decoration:none}.lf-pub-pie a:hover{text-decoration:underline}",
    "@media (max-width:560px){.lf-pub{padding:22px;border-radius:24px}}"
  ].join("\n");
  document.head.appendChild(estilo);

  /* 2 ── lo publicado; en el artefacto (sin el back) llega una muestra declarada como tal */
  /* Nico 27-10 («algo pasa acá que no cargan los inmuebles»): si el servidor tarda o se cae un momento, el primer
     pedido fallaba y la franja quedaba vacía para siempre. Ahora reintenta (1,5 · 4 · 9 · 20 s) antes de rendirse. */
  var ESPERAS = [1500, 4000, 9000, 20000];
  var pedirLaVitrina = function (intento) {
    return fetch("/api/vitrina-de-la-home", { credentials: "omit" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (v) {
        if ((v && v.inmuebles) || intento >= ESPERAS.length) return v;
        return new Promise(function (listo) { setTimeout(listo, ESPERAS[intento]); }).then(function () { return pedirLaVitrina(intento + 1); });
      });
  };
  var pedido = window.LF_VITRINA_DE_MUESTRA
    ? Promise.resolve(window.LF_VITRINA_DE_MUESTRA)
    : (window.fetch ? pedirLaVitrina(0) : Promise.resolve(null));

  function cuandoEsteLista(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  cuandoEsteLista(function () {
    /* LF.t en la home, LFI.t en las internas (las dos son el diccionario de idioma.js) */
    var LF = { t: (window.LF && window.LF.t) || (window.LFI && window.LFI.t) || function (s) { return s; } };
    var en = raiz.lang === "en" || (window.LFI && window.LFI.idioma === "en");
    var numero = function (n) { return Number(n).toLocaleString(en ? "en-US" : "es-CO"); };
    /* los enlaces cuyo href cumple (comparado en código: el prefijo de idioma o el origen del artefacto varían) */
    var enlacesQue = function (cumple) {
      return Array.prototype.filter.call(document.querySelectorAll("a[href]"), function (a) { return cumple(a.getAttribute("href") || ""); });
    };
    var crear = function (tag, clase, texto) {
      var el = document.createElement(tag);
      if (clase) el.className = clase;
      if (texto != null) el.textContent = texto;
      return el;
    };

    /* 1 ── con sesión, lo que crea cuenta o entra lleva al panel (los del encabezado ya vienen en pareja) */
    if (conSesion) {
      enlacesQue(function (h) { return h.indexOf(ORIGEN + "/auth") === 0; }).forEach(function (a) {
        if (a.hasAttribute("data-sin-sesion") || a.closest("[data-sin-sesion]")) return;
        a.setAttribute("href", ORIGEN + "/ir-al-panel");
        a.textContent = LF.t("Ir al panel");
      });
    }

    /* 2 ── la franja, el número y las fotos del aviso */
    var pistaDeLaFranja = document.getElementById("vitTrack");
    if (pistaDeLaFranja && !pistaDeLaFranja.children.length) {
      for (var e = 0; e < 8; e++) {
        var espera = crear("span", "vi vi-espera");
        espera.setAttribute("aria-hidden", "true");
        var cuerpo = crear("span");
        cuerpo.appendChild(crear("b")); cuerpo.appendChild(crear("i"));
        espera.appendChild(crear("span", "vi-foto")); espera.appendChild(cuerpo);
        pistaDeLaFranja.appendChild(espera);
      }
    }
    var sinInmuebles = function () {
      if (!pistaDeLaFranja || !pistaDeLaFranja.parentNode) return;
      pistaDeLaFranja.textContent = "";
      pistaDeLaFranja.parentNode.setAttribute("data-aviso", LF.t("Los inmuebles publicados están en el marketplace"));
      pistaDeLaFranja.parentNode.classList.add("sin-datos");
    };
    pedido.then(function (v) {
      if (!v) { sinInmuebles(); return; }
      var total = Number(v.total) || 0;
      if (total > 0) {
        Array.prototype.forEach.call(document.querySelectorAll("[data-mk-total]"), function (b) {
          b.textContent = numero(total);
          b.setAttribute("aria-label", numero(total) + " " + LF.t("inmuebles publicados"));
          b.hidden = false;
        });
      }
      var lista = (v.inmuebles || []).filter(function (i) { return i && i.id && i.foto; });
      var pista = document.getElementById("vitTrack");
      if (pista && lista.length) {
        var TIPOS = {
          APARTMENT: LF.t("Apartamento"), HOUSE: LF.t("Casa"), STUDIO: LF.t("Apartaestudio"), ROOM: LF.t("Habitación"),
          COMMERCIAL: LF.t("Local"), OFFICE: LF.t("Oficina"), WAREHOUSE: LF.t("Bodega"), PARKING: LF.t("Parqueadero"), LAND: LF.t("Lote")
        };
        var tarjeta = function (i, copia) {
          var a = crear("a", "vi");
          a.href = ORIGEN + "/propiedades/" + encodeURIComponent(i.id);
          if (copia) { a.setAttribute("aria-hidden", "true"); a.tabIndex = -1; }
          var foto = crear("span", "vi-foto");
          var img = crear("img", i.sinFoto ? "ilus" : "foto"); /* sin foto: la ilustración de su tipo (27-10) */
          img.src = i.foto; img.alt = ""; img.loading = "lazy"; img.width = 42; img.height = 42;
          foto.appendChild(img);
          var tx = crear("span");
          var precio = crear("b", null, "$ " + numero(i.precio) + " ");
          precio.appendChild(crear("em", null, i.venta ? LF.t("en venta") : LF.t("/mes")));
          var partes = [TIPOS[i.tipo] || LF.t("Inmueble")];
          if (i.habitaciones) partes.push(i.habitaciones + " " + LF.t("hab"));
          if (i.lugar) partes.push(i.lugar);
          tx.appendChild(precio);
          tx.appendChild(crear("span", null, partes.join(" · ")));
          a.appendChild(foto); a.appendChild(tx);
          return a;
        };
        pista.classList.add("vacia");
        pista.textContent = "";
        /* dos vueltas: la cinta corre la mitad y vuelve a empezar sin salto */
        for (var k = 0; k < 2; k++) lista.forEach(function (i) { pista.appendChild(tarjeta(i, k > 0)); });
        requestAnimationFrame(function () { pista.classList.remove("vacia"); });
      } else if (pista) sinInmuebles();
      var fotosDelAviso = document.querySelectorAll(".aviso-fotos img");
      lista.filter(function (i) { return !i.sinFoto; }).slice(0, fotosDelAviso.length).forEach(function (i, n) { fotosDelAviso[n].src = i.foto; });
    });

    /* 3 ── «Publicar gratis» sin sesión */
    var ventana = null;
    var lenis = function () { return window.LF && window.LF.lenis; };
    var svg = function (d) {
      return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + "</svg>";
    };
    var CASA = '<path d="M4 10.5 12 4l8 6.5"/><path d="M6 9v10h12V9"/><path d="M10 19v-5h4v5"/>';
    var EDIFICIOS = '<path d="M4 20V6l7-2v16"/><path d="M11 9h8v11"/><path d="M3 20h18"/><path d="M7 8h1M7 11h1M7 14h1M14 12h2M14 15h2"/>';
    var FLECHA = '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>';
    function opcion(href, icono, titulo, detalle, prueba) {
      var a = crear("a", "lf-pub-c");
      a.href = href;
      a.setAttribute("data-testid", prueba);
      var ic = crear("span", "lf-pub-ic"); ic.innerHTML = svg(icono);
      var tx = crear("span", "lf-pub-tx"); tx.appendChild(crear("b", null, titulo)); tx.appendChild(crear("span", null, detalle));
      var fl = crear("span", "lf-pub-fl"); fl.innerHTML = svg(FLECHA);
      a.appendChild(ic); a.appendChild(tx); a.appendChild(fl);
      return a;
    }
    function armarVentana() {
      var d = crear("dialog", "lf-pub");
      d.setAttribute("aria-labelledby", "lfPubTitulo");
      d.setAttribute("data-lenis-prevent", "");
      d.setAttribute("data-testid", "quien-publica");
      var x = crear("button", "lf-pub-x");
      x.type = "button"; x.setAttribute("aria-label", LF.t("Cerrar"));
      x.innerHTML = svg('<path d="M6 6l12 12M18 6 6 18"/>');
      x.addEventListener("click", function () { d.close(); });
      var k = crear("p", "lf-pub-k"); k.appendChild(crear("i")); k.appendChild(document.createTextNode(LF.t("Publica gratis")));
      var h = crear("h2", null, LF.t("¿Quién va a publicar?")); h.id = "lfPubTitulo";
      var op = crear("div", "lf-pub-op");
      op.appendChild(opcion(ORIGEN + "/auth?mode=register&role=landlord&returnUrl=" + encodeURIComponent("/publica?perfil=landlord"), CASA,
        LF.t("Soy propietario"), LF.t("Publico mi inmueble, sin inmobiliaria."), "publica-propietario"));
      op.appendChild(opcion(ORIGEN + "/auth?mode=register&role=agency&returnUrl=" + encodeURIComponent("/publica?perfil=agency"), EDIFICIOS,
        LF.t("Soy inmobiliaria"), LF.t("Publico los inmuebles que administro."), "publica-inmobiliaria"));
      var pie = crear("p", "lf-pub-pie", LF.t("¿Ya tienes cuenta?") + " ");
      var entrar = crear("a", null, LF.t("Inicia sesión"));
      entrar.href = ORIGEN + "/auth?returnUrl=" + encodeURIComponent("/publica");
      entrar.setAttribute("data-testid", "publicar-ya-tengo-cuenta");
      pie.appendChild(entrar);
      d.appendChild(x); d.appendChild(k); d.appendChild(h);
      d.appendChild(crear("p", "lf-pub-d", LF.t("Elige una opción y crea tu cuenta. Es gratis.")));
      d.appendChild(op); d.appendChild(pie);
      /* tocar fuera de la tarjeta la cierra */
      d.addEventListener("click", function (e) {
        var r = d.getBoundingClientRect();
        if (e.target === d && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) d.close();
      });
      d.addEventListener("close", function () { var l = lenis(); if (l) l.start(); });
      document.body.appendChild(d);
      return d;
    }
    /* 27-10-2026 (Nico: «¿por qué cambia si le doy desde el home o desde el marketplace?»): ya no se abre una
       ventana propia de dos opciones. «Publicar gratis» va a /publica, que abre DE UNA la misma ventana del
       marketplace (propietario, inmobiliaria y agente inmobiliario). `armarVentana` queda sin uso. */
    void conSesion;
  });
})();
