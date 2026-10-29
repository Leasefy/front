/* ════════════════════════════════════════════════════════════════════
   Leasefy · Opción 2 «El producto en vivo» — piezas compartidas
   ════════════════════════════════════════════════════════════════════ */
window.LF = (function () {
  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var MOV = root.classList.contains("mov") && !!window.gsap && !!window.ScrollTrigger;
  if (!MOV) { root.classList.remove("mov"); root.classList.add("quieto"); }

  /* Nico 29-10 (video en el celular: «titilea de feo cuando hace scroll»): en el celular la barra del navegador
     aparece y se esconde al bajar, y cada vez el navegador avisa un «resize» de sólo el alto. Los lienzos se
     borraban y se volvían a medir, y las animaciones del scroll se recalculaban: la página saltaba. Aquí, en un
     aparato táctil, un cambio de SÓLO el alto no rearma nada; uno de ancho (girar el celular) sí. */
  var tactil = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  var anchoVisto = window.innerWidth, altoVisto = window.innerHeight;
  var alRedimensionar = [];
  window.addEventListener("resize", function () {
    var w = window.innerWidth, h = window.innerHeight;
    if (tactil && w === anchoVisto) { altoVisto = h; return; }
    if (w === anchoVisto && h === altoVisto) return;
    anchoVisto = w; altoVisto = h;
    alRedimensionar.forEach(function (fn) { fn(); });
  });
  function alCambiarDeTamano(fn) { alRedimensionar.push(fn); }

  /* plata en pesos: $ 52.580.500,50 */
  function fmt(n, d) {
    if (d === undefined) d = 2;
    var s = Math.abs(n).toFixed(d).split(".");
    var e = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return (n < 0 ? "- " : "") + "$ " + e + (d ? "," + s[1] : "");
  }
  function contar(el, a, b, dur, d) {
    if (!MOV) { el.textContent = fmt(b, d); return null; }
    var o = { v: a };
    return gsap.to(o, { v: b, duration: dur || 1.2, ease: "expo.out", onUpdate: function () { el.textContent = fmt(o.v, d); } });
  }

  /* partir un título en palabras (respeta los <span class="acento">) */
  function partir(el) {
    var out = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
        if (ch.nodeType === 3) {
          var frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(" ")); return; }
            var w = document.createElement("span"); w.className = "pw";
            var i = document.createElement("span"); i.className = "pwi"; i.textContent = p;
            w.appendChild(i); frag.appendChild(w); out.push(i);
          });
          ch.parentNode.replaceChild(frag, ch);
        } else if (ch.nodeType === 1) walk(ch);
      });
    })(el);
    return out;
  }
  function partirRelato(el) {
    var out = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
        if (ch.nodeType === 3) {
          var frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(" ")); return; }
            var w = document.createElement("span"); w.className = "rw"; w.textContent = p;
            frag.appendChild(w); out.push(w);
          });
          ch.parentNode.replaceChild(frag, ch);
        } else if (ch.nodeType === 1) walk(ch);
      });
    })(el);
    return out;
  }

  /* posición en el documento sin transformaciones (cadena de offsetParent) */
  function pos(el) {
    var x = 0, y = 0, w = el.offsetWidth, h = el.offsetHeight;
    while (el) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; }
    return { x: x, y: y, w: w, h: h };
  }

  /* ── BrandMotif: estrías por inversión de tono (CSS) ── */
  var INK = "#14130f", BLUE = "#1a40ff";
  var TONOS = {
    "on-navy": { stripe: BLUE, alt: "#6C84FF", solid: BLUE, knock: "#07080C", pitch: 9, weight: 3.5 },
    "on-light": { stripe: BLUE, alt: "rgba(26,64,255,0.40)", solid: BLUE, knock: "#FFFFFF", pitch: 10, weight: 2 }
  };
  function rayas(c, p, w) { return "repeating-linear-gradient(to right," + c + " 0px," + c + " " + w + "px,transparent " + w + "px,transparent " + p + "px)"; }
  function motivo(el) {
    var t = TONOS[el.dataset.tono] || TONOS["on-light"], shape = el.dataset.motivo;
    var st = rayas(t.stripe, t.pitch, t.weight), alt = rayas(t.alt, t.pitch, t.weight);
    var capas = [];
    if (shape === "rings") capas = [[st], [alt, "circle(36%)"], [st, "circle(26%)"], [t.solid, "circle(14.5%)"]];
    else if (shape === "dome") capas = [[st, "ellipse(92% 110% at 50% 138%)"]];
    else capas = [[st]];
    el.innerHTML = "";
    capas.forEach(function (c) {
      var d = document.createElement("div");
      d.style.background = c[0];
      if (c[1]) d.style.clipPath = c[1];
      el.appendChild(d);
    });
  }

  /* ── EsferaDeGrano (pintada una vez en canvas, con grano) ── */
  var PAL_ESF = {
    ori: ["#1A40FF", "#5D78FF", "#9D8CFF", "#BFD3FF", "#3D5BFF", "#7DC4FF"],
    mori: ["#FF5A1F", "#FF8A5B", "#FFB3C8", "#FFD09A", "#B8321A", "#FF7A3D"],
    niti: ["#3D8BFF", "#7DC4FF", "#1A40FF", "#C9EEFF", "#8FE3BF", "#5D78FF"],
    fixi: ["#25876A", "#8FE3BF", "#7DC4FF", "#E3F8EE", "#14503F", "#4FC39A"],
    cuenti: ["#5B4BD9", "#9D8CFF", "#16205C", "#D7CFFF", "#FF9DB8", "#7B6BFF"]
  };
  function azar(s) { s = s | 0; return function () { s = (s + 0x6d2b79f5) | 0; var t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function numeroDe(tx) { var h = 7; for (var i = 0; i < tx.length; i++) h = (Math.imul(h, 31) + tx.charCodeAt(i)) | 0; return h; }
  function rgba(hex, a) { var n = parseInt(hex.slice(1), 16); return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")"; }
  function pintarEsfera(col, semilla, lado) {
    try {
      var r = azar(numeroDe(col.join("") + semilla));
      var ch = document.createElement("canvas"); ch.width = ch.height = 40;
      var o = ch.getContext("2d"); o.fillStyle = col[0]; o.fillRect(0, 0, 40, 40);
      for (var i = 0; i < 9; i++) {
        var x = 40 * (0.05 + r() * 0.9), y = 40 * (0.05 + r() * 0.9), rad = 40 * (0.18 + r() * 0.42);
        var c = col[1 + Math.floor(r() * (col.length - 1))];
        var g = o.createRadialGradient(x, y, 0, x, y, rad); g.addColorStop(0, rgba(c, 0.95)); g.addColorStop(1, rgba(c, 0));
        o.fillStyle = g; o.fillRect(0, 0, 40, 40);
      }
      var gr = document.createElement("canvas"); gr.width = gr.height = lado;
      var G = gr.getContext("2d"); G.imageSmoothingEnabled = true; G.imageSmoothingQuality = "high"; G.drawImage(ch, 0, 0, lado, lado);
      var luz = G.createRadialGradient(lado * 0.3, lado * 0.26, lado * 0.02, lado * 0.5, lado * 0.52, lado * 0.6);
      luz.addColorStop(0, "rgba(255,255,255,0.42)"); luz.addColorStop(0.42, "rgba(255,255,255,0)"); luz.addColorStop(0.82, "rgba(10,12,40,0.10)"); luz.addColorStop(1, "rgba(10,12,40,0.42)");
      G.fillStyle = luz; G.fillRect(0, 0, lado, lado);
      var im = G.getImageData(0, 0, lado, lado), d = im.data, f = lado < 80 ? 34 : 52;
      for (var k = 0; k < d.length; k += 4) { var n = (r() - 0.5) * f; d[k] += n; d[k + 1] += n; d[k + 2] += n; }
      G.putImageData(im, 0, 0);
      var fin = document.createElement("canvas"); fin.width = fin.height = lado;
      var F = fin.getContext("2d"); F.beginPath(); F.arc(lado / 2, lado / 2, lado / 2 - 0.5, 0, Math.PI * 2); F.clip(); F.drawImage(gr, 0, 0);
      return fin.toDataURL("image/png");
    } catch (e) { return null; }
  }
  function esferas() {
    $$("[data-esfera]").forEach(function (el) {
      var col = PAL_ESF[el.dataset.esfera] || PAL_ESF.ori;
      var size = el.offsetWidth || 48, dpr = Math.min(window.devicePixelRatio || 1, 2);
      var url = pintarEsfera(col, el.dataset.esfera, Math.max(16, Math.ceil(size * dpr / 8) * 8));
      el.style.background = url ? "center/cover no-repeat url(" + url + ")" :
        "radial-gradient(circle at 30% 28%,rgba(255,255,255,.55) 0,rgba(255,255,255,0) 34%),radial-gradient(circle at 70% 70%," + col[2] + " 0," + rgba(col[2], 0) + " 55%)," + col[0];
    });
  }

  /* el inglés de lo que escriben los scripts (ver idioma.js); sin el núcleo del idioma, el español tal cual */
  var t = window.LFI ? window.LFI.t : function (s) { return s; };
  return { t: t, $: $, $$: $$, MOV: MOV, tactil: tactil, alCambiarDeTamano: alCambiarDeTamano, fmt: fmt, contar: contar, partir: partir, partirRelato: partirRelato, pos: pos, motivo: motivo, esferas: esferas };
})();
