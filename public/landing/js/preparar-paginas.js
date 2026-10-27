/* Nico 27-10 («no quiero interacciones toscas entre secciones»): al pasar el mouse (o tocar) un enlace de la landing,
   el navegador va trayendo esa página; al hacer clic llega al instante y entra con la transición común. Nunca las de
   cuenta, panel ni API. Una vez por dirección. Sin scripts en línea: es este archivo. */
(function () {
  var hechas = {};
  var NO = /^\/(?:(?:es|en)\/)?(?:auth|panel|publica|ir-al-panel|onboarding|api|inquilino|admin)(?:\/|$)/;
  function preparar(a) {
    if (!a || !a.href || a.target === "_blank" || a.hasAttribute("download")) return;
    var u; try { u = new URL(a.href, location.href); } catch (e) { return; }
    if (u.origin !== location.origin || NO.test(u.pathname)) return;
    var clave = u.pathname + u.search;
    if (hechas[clave] || clave === location.pathname + location.search) return;
    hechas[clave] = 1;
    var l = document.createElement("link"); l.rel = "prefetch"; l.href = clave; l.as = "document";
    document.head.appendChild(l);
  }
  function alPasar(ev) { var a = ev.target && ev.target.closest ? ev.target.closest("a[href]") : null; if (a) preparar(a); }
  document.addEventListener("pointerover", alPasar, { passive: true });
  document.addEventListener("touchstart", alPasar, { passive: true });
  document.addEventListener("focusin", alPasar);
})();
