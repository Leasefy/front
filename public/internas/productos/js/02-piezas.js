/* ════════════════════════════════════════════════════════════════════
   Piezas compartidas (las de la landing 2)
   ════════════════════════════════════════════════════════════════════ */
window.LF = (function () {
  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var MOV = root.classList.contains("mov") && !!window.gsap && !!window.ScrollTrigger;
  if (!MOV) { root.classList.remove("mov"); root.classList.add("quieto"); }

  /* partir un título en palabras (respeta los <span class="acento"> y los <em>) */
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

  /* BrandMotif: estrías por inversión de tono (CSS) */
  var BLUE = "#1a40ff";
  var TONOS = {
    "on-navy": { stripe: BLUE, alt: "#6C84FF", solid: BLUE, pitch: 9, weight: 3.5 },
    "on-light": { stripe: BLUE, alt: "rgba(26,64,255,0.40)", solid: BLUE, pitch: 10, weight: 2 }
  };
  function rayas(c, p, w) { return "repeating-linear-gradient(to right," + c + " 0px," + c + " " + w + "px,transparent " + w + "px,transparent " + p + "px)"; }
  function motivo(el) {
    var t = TONOS[el.dataset.tono] || TONOS["on-light"];
    var st = rayas(t.stripe, t.pitch, t.weight), alt = rayas(t.alt, t.pitch, t.weight);
    var capas = el.dataset.motivo === "rings" ? [[st], [alt, "circle(36%)"], [st, "circle(26%)"], [t.solid, "circle(14.5%)"]] : [[st]];
    el.innerHTML = "";
    capas.forEach(function (c) {
      var d = document.createElement("div");
      d.style.background = c[0];
      if (c[1]) d.style.clipPath = c[1];
      el.appendChild(d);
    });
  }
  return { $: $, $$: $$, MOV: MOV, partir: partir, motivo: motivo };
})();
