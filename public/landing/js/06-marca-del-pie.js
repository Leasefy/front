/* la marca del pie en puntos (Nico 23-10) */
(function () {
  var caja = document.querySelector(".marca-pie"), cv = caja && caja.querySelector(".marca-pix"), sim = document.getElementById("lfLogo");
  if (!cv || !sim || !cv.getContext) return;
  var ctx = cv.getContext("2d"), pts = [], dpr = Math.min(window.devicePixelRatio || 1, 2), raton = { x: -9999, y: -9999 }, llegada = 0, objetivo = 0, vivo = false;
  var quieto = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function armar() {
    var W = caja.clientWidth, H = Math.round(W * 235 / 947); if (!W) return;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 947 235" width="' + W + '" height="' + H + '"><g fill="#000">' + sim.innerHTML + '</g></svg>';
    var img = new Image();
    img.onload = function () {
      var o = document.createElement("canvas"); o.width = W; o.height = H; var oc = o.getContext("2d"); oc.drawImage(img, 0, 0, W, H);
      var d = oc.getImageData(0, 0, W, H).data, paso = Math.max(4, Math.round(W / 190)); pts = [];
      for (var y = 0; y < H; y += paso) for (var x = 0; x < W; x += paso) if (d[(y * W + x) * 4 + 3] > 128) {
        var a = Math.random() * Math.PI * 2, r = W * (.3 + Math.random() * .6);
        pts.push({ tx: x, ty: y, sx: x + Math.cos(a) * r, sy: y + Math.sin(a) * r * .6, x: x, y: y, c: Math.random() < .7 ? "#1A40FF" : "#5C76FF", s: paso * .72 });
      }
      caja.classList.add("con-pix"); if (!vivo) { vivo = true; requestAnimationFrame(cuadro); }
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }
  function cuadro() {
    llegada += (objetivo - llegada) * .05;
    var e = quieto ? 1 : 1 - Math.pow(1 - Math.min(1, llegada), 3);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i], bx = p.sx + (p.tx - p.sx) * e, by = p.sy + (p.ty - p.sy) * e;
      var dx = bx - raton.x, dy = by - raton.y, dd = dx * dx + dy * dy, R = 90;
      if (dd < R * R) { var k = (1 - Math.sqrt(dd) / R) * 26; bx += dx / (Math.sqrt(dd) + .01) * k; by += dy / (Math.sqrt(dd) + .01) * k; }
      p.x += (bx - p.x) * .2; p.y += (by - p.y) * .2;
      ctx.fillStyle = p.c; ctx.globalAlpha = .35 + .65 * e; ctx.fillRect(p.x, p.y, p.s, p.s);
    }
    ctx.globalAlpha = 1; requestAnimationFrame(cuadro);
  }
  caja.addEventListener("pointermove", function (ev) { var r = cv.getBoundingClientRect(); raton.x = ev.clientX - r.left; raton.y = ev.clientY - r.top; });
  caja.addEventListener("pointerleave", function () { raton.x = raton.y = -9999; });
  new IntersectionObserver(function (en) { objetivo = en[0].isIntersecting ? 1 : objetivo; }, { threshold: .25 }).observe(caja);
  var t; window.addEventListener("resize", function () { clearTimeout(t); t = setTimeout(armar, 200); });
  armar();
})();
