/* ════════════════════════════════════════════════════════════════════
   El mega menú de «Producto» (ronda 30, Nico 23-10-2026): «la de producto
   en vivo debe ser la landing principal y esa es la que debe tener el mega
   menú al dar hover en productos». Las mismas opciones y rutas del front:
   el sistema (CRM, ERP), los agentes AI y para quién es (inmobiliarias,
   propietarios, inquilinos, agentes); cada una lleva a su página.
   - Abre al pasar el mouse, al tocar y con el teclado (Enter o Espacio).
   - Flecha abajo entra a la primera opción; Escape cierra y devuelve el foco.
   - Si lo abrió el mouse, un clic en «Producto» lo deja fijo.
   - En el celular vive dentro del «Menú», como un desplegable.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  var pm = document.getElementById("pm"), btn = document.getElementById("pmBtn"), panel = document.getElementById("pmPanel");
  if (pm && btn && panel) {
    var abierto = false, porMouse = false, espera = null;
    var abrir = function (conMouse) {
      clearTimeout(espera);
      if (abierto) { if (!conMouse) porMouse = false; return; }
      abierto = true; porMouse = !!conMouse;
      pm.classList.add("pm-abierto");
      btn.setAttribute("aria-expanded", "true");
    };
    var cerrar = function (devolverFoco) {
      clearTimeout(espera);
      if (!abierto) return;
      abierto = false; porMouse = false;
      pm.classList.remove("pm-abierto");
      btn.setAttribute("aria-expanded", "false");
      if (devolverFoco) btn.focus();
    };
    var esMouse = function (e) { return e.pointerType === "mouse"; };
    pm.addEventListener("pointerenter", function (e) { if (esMouse(e)) abrir(true); });
    pm.addEventListener("pointerleave", function (e) {
      if (!esMouse(e) || !porMouse) return;
      clearTimeout(espera);
      espera = setTimeout(function () { cerrar(false); }, 160);
    });
    btn.addEventListener("click", function () {
      if (abierto && porMouse) { porMouse = false; return; }
      if (abierto) cerrar(false); else abrir(false);
    });
    btn.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowDown") return;
      e.preventDefault();
      abrir(false);
      var primera = panel.querySelector("a");
      if (primera) setTimeout(function () { primera.focus(); }, 0);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && abierto) cerrar(pm.contains(document.activeElement));
    });
    pm.addEventListener("focusout", function (e) {
      if (abierto && e.relatedTarget && !pm.contains(e.relatedTarget)) cerrar(false);
    });
    document.addEventListener("pointerdown", function (e) {
      if (abierto && !pm.contains(e.target)) cerrar(false);
    });
    panel.addEventListener("click", function (e) {
      if (e.target && e.target.closest && e.target.closest("a")) cerrar(false);
    });
  }

  /* en el celular: «Producto» despliega las mismas opciones dentro del menú */
  var mBtn = document.getElementById("pmMBtn"), mLista = document.getElementById("pmM");
  if (mBtn && mLista) {
    mBtn.addEventListener("click", function () {
      var abre = mLista.hasAttribute("hidden");
      if (abre) mLista.removeAttribute("hidden"); else mLista.setAttribute("hidden", "");
      mBtn.setAttribute("aria-expanded", abre ? "true" : "false");
    });
  }
  /* Escape también cierra el menú del celular */
  var mb = document.getElementById("mbtn");
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && mb && document.documentElement.classList.contains("menu-abierto")) { mb.click(); mb.focus(); }
  });
})();
