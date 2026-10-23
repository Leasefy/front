/* la marca del pie en puntos: llegan volando cuando se ve (sin reacción al mouse) */
(function () {
  var caja = document.querySelector(".marca-pie"), cv = caja && caja.querySelector(".marca-pix"), sim = document.getElementById("lfLogo");
  if (!cv || !sim || !cv.getContext) return;
  var ctx = cv.getContext("2d"), pts = [], dpr = Math.min(window.devicePixelRatio || 1, 2), llegada = 0, objetivo = 0, vivo = false;
  var quieto = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function armar() {
    var W = caja.clientWidth, H = Math.round(W * 235 / 947); if (!W) return;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 947 235" width="' + W + '" height="' + H + '"><g fill="#000">' + sim.innerHTML + '</g></svg>';
    var im = new Image();
    im.onload = function () {
      var o = document.createElement("canvas"); o.width = W; o.height = H; var oc = o.getContext("2d"); oc.drawImage(im, 0, 0, W, H);
      var d = oc.getImageData(0, 0, W, H).data, paso = Math.max(4, Math.round(W / 190)); pts = [];
      for (var y = 0; y < H; y += paso) for (var x = 0; x < W; x += paso) if (d[(y * W + x) * 4 + 3] > 128) {
        var a = Math.random() * Math.PI * 2, r = W * (.3 + Math.random() * .6);
        pts.push({ tx: x, ty: y, sx: x + Math.cos(a) * r, sy: y + Math.sin(a) * r * .6, c: Math.random() < .7 ? "#1A40FF" : "#5C76FF", s: paso * .72 });
      }
      caja.classList.add("con-pix"); dibujar();
    };
    im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }
  function dibujar() {
    var e = quieto ? 1 : 1 - Math.pow(1 - Math.min(1, llegada), 3);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      ctx.fillStyle = p.c; ctx.globalAlpha = .35 + .65 * e;
      ctx.fillRect(p.sx + (p.tx - p.sx) * e, p.sy + (p.ty - p.sy) * e, p.s, p.s);
    }
    ctx.globalAlpha = 1;
  }
  function cuadro() {
    llegada += (objetivo - llegada) * .05;
    dibujar();
    if (Math.abs(objetivo - llegada) > .002) requestAnimationFrame(cuadro); else { llegada = objetivo; dibujar(); vivo = false; }
  }
  new IntersectionObserver(function (en) {
    if (en[0].isIntersecting && objetivo < 1) { objetivo = 1; if (quieto) { llegada = 1; dibujar(); } else if (!vivo) { vivo = true; requestAnimationFrame(cuadro); } }
  }, { threshold: .25 }).observe(caja);
  var t; window.addEventListener("resize", function () { clearTimeout(t); t = setTimeout(armar, 200); });
  armar();
})();
