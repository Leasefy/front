/* Nico 23-10: los botones responden con resorte al pasar y al presionar (Motion, la versión para JS de
   Framer Motion), con los números de Cadence: al pasar sube 2 px (Pressable «lift») y crece apenas; al
   presionar se hunde al 97 % (motionScale.press) con el resorte ágil (motionSpring.snappy: .25 s, rebote .1);
   al soltar vuelve con el rebote leve (motionSpring.bouncy: .3 s, rebote .2). Sin Motion o con movimiento
   reducido los botones funcionan igual, quietos. */
(function () {
  var M = window.Motion, quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (quieto || !M || typeof M.hover !== "function" || typeof M.press !== "function" || typeof M.animate !== "function") return;
  var AGIL = { type: "spring", visualDuration: .25, bounce: .1 }, REBOTE = { type: "spring", visualDuration: .3, bounce: .2 };
  var ENCIMA = { y: -2, scale: 1.02 }, REPOSO = { y: 0, scale: 1 }, HUNDIDO = { y: 0, scale: .97 };
  document.documentElement.classList.add("con-motion");
  document.querySelectorAll(".btn, .boleto, .mbtn, .aviso a, .aviso button").forEach(function (el) {
    var encima = false;
    M.hover(el, function () {
      encima = true; M.animate(el, ENCIMA, AGIL);
      return function () { encima = false; M.animate(el, REPOSO, AGIL); };
    });
    M.press(el, function () {
      M.animate(el, HUNDIDO, AGIL);
      return function () { M.animate(el, encima ? ENCIMA : REPOSO, REBOTE); };
    });
  });
})();
