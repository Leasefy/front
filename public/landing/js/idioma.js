/* ════════════════════════════════════════════════════════════════════
   Español e inglés en toda la landing (Nico, 23-10-2026: «toda la landing,
   incluidas las internas, deben quedar en español e inglés»).

   Una sola fuente: el español del HTML. El inglés sale de un diccionario
   (`en.js`, junto a este archivo: window.LF_EN = { "texto en español": "in English" })
   que se aplica en el navegador ANTES de que corran los scripts de la página.

   Cómo se traduce, sin tocar etiquetas, clases ni enlaces:
   - Un «bloque» es un elemento con texto cuyo contenido es sólo texto y etiquetas
     en línea (span, b, a, em, br…). Su clave son sus textos con letras, en orden,
     unidos por « ¦ »; la traducción trae los mismos tramos, en el mismo orden.
   - Los textos sueltos entre bloques se traducen solos.
   - aria-label, alt, title y placeholder, por su valor.
   - Lo que escriben los scripts pasa por LFI.t("…").

   El idioma: /en/… en la ruta (el front lo pone); sin prefijo (los artefactos), lo
   que se eligió en el selector ES/EN y quedó guardado en el navegador.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  var root = document.documentElement;
  var prefijo = /^\/(es|en)(?=\/|$)/.exec(location.pathname);
  var guardado = null;
  try { guardado = localStorage.getItem("lf-idioma"); } catch (e) {}
  var idioma = prefijo ? prefijo[1] : (guardado === "en" ? "en" : "es");
  var EN = idioma === "en";
  var SEP = " ¦ ";
  var EN_LINEA = /^(SPAN|B|I|EM|STRONG|A|SMALL|U|S|BR|SUP|SUB|CODE|ABBR|MARK|TIME|DEL|INS|Q|WBR)$/;
  var SALTAR = /^(SCRIPT|STYLE|SVG|CANVAS|NOSCRIPT|TEMPLATE|VIDEO|AUDIO|IMG|PICTURE|IFRAME|svg|path|use)$/;
  var LETRA = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ¿¡]/;
  var ATRIBUTOS = ["aria-label", "alt", "title", "placeholder"];
  var registro = window.LFI_REGISTRO || null;

  function norm(s) { return String(s).replace(/\s+/g, " ").trim(); }
  function dic() { return window.LF_EN || {}; }
  function t(s) {
    if (s == null) return s;
    var k = norm(s);
    if (registro && k && LETRA.test(k)) registro.push(k);
    if (!EN || !k) return s;
    var v = dic()[k];
    return v == null ? s : v;
  }
  function esBloque(el) {
    var todos = el.getElementsByTagName("*");
    for (var i = 0; i < todos.length; i++) if (!EN_LINEA.test(todos[i].tagName)) return false;
    return LETRA.test(el.textContent || "");
  }
  function textosDe(el) {
    var out = [], w = document.createTreeWalker(el, 4 /* NodeFilter.SHOW_TEXT */, null), n;
    while ((n = w.nextNode())) if (LETRA.test(n.nodeValue)) out.push(n);
    return out;
  }
  function poner(n, v) {
    var s = n.nodeValue, ini = /^\s*/.exec(s)[0], fin = /\s*$/.exec(s)[0];
    n.nodeValue = (ini && v.charAt(0) !== " " ? ini : "") + v + (fin && v.charAt(v.length - 1) !== " " ? fin : "");
  }
  function traducirBloque(el) {
    var ns = textosDe(el); if (!ns.length) return;
    var clave = ns.map(function (n) { return norm(n.nodeValue); }).join(SEP);
    if (registro) registro.push(clave);
    if (!EN) return;
    var v = dic()[clave]; if (v == null) return;
    var partes = String(v).split(SEP);
    if (partes.length !== ns.length) { if (window.console) console.warn("[idioma] tramos distintos:", clave); return; }
    ns.forEach(function (n, i) { poner(n, partes[i]); });
  }
  function traducirAtributos(el) {
    ATRIBUTOS.forEach(function (a) {
      if (!el.hasAttribute || !el.hasAttribute(a)) return;
      var v = el.getAttribute(a); if (!LETRA.test(v)) return;
      var nv = t(v); if (nv !== v) el.setAttribute(a, nv);
    });
  }
  function recorrer(el) {
    for (var n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3) {
        if (LETRA.test(n.nodeValue)) { var k = norm(n.nodeValue), v = t(k); if (v !== k) poner(n, v); }
      } else if (n.nodeType === 1) {
        if (SALTAR.test(n.tagName)) { traducirAtributos(n); continue; }
        if (n.hasAttribute("data-sin-traducir")) continue;
        traducirAtributos(n);
        if (esBloque(n)) { traducirBloque(n); n.querySelectorAll("[aria-label],[alt],[title],[placeholder]").forEach(traducirAtributos); }
        else recorrer(n);
      }
    }
  }
  /* traduce un pedazo de la página (o toda): el HTML de entrada y lo que arman los scripts */
  function aplicar(el) {
    el = el || document.body;
    if (!el) return;
    if (el === document.body) {
      document.title = t(document.title);
      var md = document.querySelector('meta[name="description"]');
      if (md) md.setAttribute("content", t(md.getAttribute("content")));
    }
    if (!EN && !registro) return;
    traducirAtributos(el);
    recorrer(el);
  }
  function listo() { root.classList.remove("lf-traduciendo"); }

  /* el selector ES / EN de la barra: con prefijo en la ruta cambia de ruta; sin prefijo (artefacto), guarda y recarga */
  function cambiar(a) {
    if (a === idioma) return;
    try { localStorage.setItem("lf-idioma", a); } catch (e) {}
    if (prefijo) location.href = "/" + a + location.pathname.slice(3) + location.search + location.hash;
    else location.reload();
  }
  function selector() {
    var bs = document.querySelectorAll("[data-idioma]");
    Array.prototype.forEach.call(bs, function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-idioma") === idioma ? "true" : "false");
      if (!b._lfi) { b._lfi = true; b.addEventListener("click", function () { cambiar(b.getAttribute("data-idioma")); }); }
    });
  }

  window.LFI = { idioma: idioma, en: EN, t: t, aplicar: aplicar, listo: listo, selector: selector, SEP: SEP };
  if (EN) {
    root.setAttribute("lang", "en");
    root.classList.add("lf-en");
    /* la página armada (public/paginas/en, SEO 24-10) ya viene en inglés: no se esconde; en.js igual hace falta
       para lo que escriben los scripts (LFI.t) */
    if (root.getAttribute("data-armada") !== "en") {
      root.classList.add("lf-traduciendo");
      var st = document.createElement("style");
      st.textContent = ".lf-traduciendo body{visibility:hidden}";
      document.head.appendChild(st);
      /* si algo falla, la página igual se muestra (en español) */
      setTimeout(listo, 2500);
    }
    var src = (document.currentScript && document.currentScript.src || "").replace(/idioma\.js(\?.*)?$/, "en.js");
    if (src) document.write('<script src="' + src + '"><\/script>');
  }
})();
