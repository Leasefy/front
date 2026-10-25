  (function () {
    var r = document.documentElement;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      r.classList.add("mov");
      setTimeout(function () { if (!window.gsap) { r.classList.remove("mov"); r.classList.add("quieto"); } }, 4000);
    } else r.classList.add("quieto");
  })();
