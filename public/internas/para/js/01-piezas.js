/* ════════════════════════════════════════════════════════════════════
   Leasefy para cada quien — piezas compartidas (las de la landing 2)
   ════════════════════════════════════════════════════════════════════ */
window.LF = (function () {
  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var MOV = root.classList.contains("mov") && !!window.gsap && !!window.ScrollTrigger;
  if (!MOV) { root.classList.remove("mov"); root.classList.add("quieto"); }

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

  /* ── BrandMotif: los anillos en estrías de la medianoche ── */
  var BLUE = "#1a40ff";
  var TONO = { stripe: BLUE, alt: "#6C84FF", solid: BLUE, pitch: 9, weight: 3.5 };
  function rayas(c, p, w) { return "repeating-linear-gradient(to right," + c + " 0px," + c + " " + w + "px,transparent " + w + "px,transparent " + p + "px)"; }
  function motivo(el) {
    var t = TONO, st = rayas(t.stripe, t.pitch, t.weight), alt = rayas(t.alt, t.pitch, t.weight);
    var capas = [[st], [alt, "circle(36%)"], [st, "circle(26%)"], [t.solid, "circle(14.5%)"]];
    el.innerHTML = "";
    capas.forEach(function (c) { var d = document.createElement("div"); d.style.background = c[0]; if (c[1]) d.style.clipPath = c[1]; el.appendChild(d); });
  }

  /* ── FotoEnEstrias: la foto en líneas de voltaje. Sobre papel, la línea es la sombra;
        sobre medianoche (o en oscuro), la línea es la luz ── */
  function pintarEstrias(cv, img, paso, fondo, tinta, invertir) {
    var W = cv.width, H = cv.height, c = cv.getContext("2d");
    var l = document.createElement("canvas"); l.width = W; l.height = H;
    var lc = l.getContext("2d", { willReadFrequently: true });
    var e = Math.max(W / img.naturalWidth, H / img.naturalHeight), w = img.naturalWidth * e, h = img.naturalHeight * e;
    lc.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
    var dat; try { dat = lc.getImageData(0, 0, W, H).data; } catch (er) { return false; }
    c.fillStyle = fondo; c.fillRect(0, 0, W, H); c.fillStyle = tinta;
    var m = paso / 2, xs = [], L = [], muestra = [];
    for (var x = m; x < W; x += paso) xs.push(x);
    var ny = Math.ceil(H / 2);
    xs.forEach(function (x) {
      for (var y = 0; y < H; y += 2) {
        var s = 0, n = 0;
        for (var dx = -m; dx < m; dx += 2) { var xi = Math.min(W - 1, Math.max(0, Math.round(x + dx))), i = (y * W + xi) * 4; s += 0.299 * dat[i] + 0.587 * dat[i + 1] + 0.114 * dat[i + 2]; n++; }
        var v = s / n / 255; L.push(v); if ((L.length & 15) === 0) muestra.push(v);
      }
    });
    /* fotos de interiores claros: se estira el contraste para que la foto se lea en las líneas */
    muestra.sort(function (p, q) { return p - q; });
    var lo = muestra[Math.floor(muestra.length * .03)] || 0, hi = muestra[Math.floor(muestra.length * .97)] || 1, rango = Math.max(.08, hi - lo);
    var k = 0;
    xs.forEach(function (x) {
      for (var y = 0; y < H; y += 2) {
        var crudo = L[k++], v = crudo * .45 + Math.min(1, Math.max(0, (crudo - lo) / rango)) * .55;
        var base = invertir ? Math.pow(v, 1.3) * .8 : 1 - Math.pow(v, .7);
        var a = Math.max(0.7, base * paso * 0.6);
        c.fillRect(x - a / 2, y, a, 2);
      }
    });
    return true;
  }

  /* un color de la paleta (#rrggbb) como [r,g,b] de 0 a 255 */
  function rgb(hex) {
    hex = (hex || "").trim();
    if (/^#[0-9a-f]{6}$/i.test(hex)) { var n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
    var m = hex.match(/\d+(\.\d+)?/g); return m && m.length >= 3 ? [+m[0], +m[1], +m[2]] : [251, 250, 248];
  }
  function token(nombre) { return getComputedStyle(root).getPropertyValue(nombre).trim(); }

  return { $: $, $$: $$, MOV: MOV, partir: partir, motivo: motivo, pintarEstrias: pintarEstrias, rgb: rgb, token: token };
})();
