/* Los botones responden con resorte al pasar y al presionar (Motion, la versión para JS de Framer Motion),
   con los números de Cadence, igual que en la landing: al pasar sube 2 px y crece apenas; al presionar se
   hunde al 97 % (resorte ágil: .25 s, rebote .1); al soltar vuelve con el rebote leve (.3 s, rebote .2).
   Sin Motion o con movimiento reducido funcionan igual, quietos. Ningún botón lleva sombra. */
(function () {
  var M = window.Motion, quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (quieto || !M || typeof M.hover !== "function" || typeof M.press !== "function" || typeof M.animate !== "function") return;
  var AGIL = { type: "spring", visualDuration: .25, bounce: .1 }, REBOTE = { type: "spring", visualDuration: .3, bounce: .2 };
  var ENCIMA = { y: -2, scale: 1.02 }, REPOSO = { y: 0, scale: 1 }, HUNDIDO = { y: 0, scale: .97 };
  document.documentElement.classList.add("con-motion");
  function resorte(el, blanco) {
    var encima = false; blanco = blanco || el;
    M.hover(el, function () {
      encima = true; M.animate(blanco, ENCIMA, AGIL);
      return function () { encima = false; M.animate(blanco, REPOSO, AGIL); };
    });
    M.press(el, function () {
      M.animate(blanco, HUNDIDO, AGIL);
      return function () { M.animate(blanco, encima ? ENCIMA : REPOSO, REBOTE); };
    });
  }
  document.querySelectorAll(".btn, .mbtn, .sel-tabs a, .aviso a, .aviso button").forEach(function (el) { resorte(el); });
  /* en las preguntas, el renglón entero es el botón; responde su botón redondo */
  document.querySelectorAll(".faq-q").forEach(function (q) { resorte(q, q.querySelector(".faq-x")); });
})();
