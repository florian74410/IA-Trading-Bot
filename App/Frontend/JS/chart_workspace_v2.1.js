(function () {
  "use strict";
  function boot() {
    var bar = document.querySelector("#chartArea .controls"),
      symbol = document.getElementById("symbol");
    if (!bar || !symbol) return;
    var search = document.createElement("input");
    search.className = "iatbPairSearch";
    search.type = "search";
    search.placeholder = "Rechercher une paire";
    search.setAttribute("aria-label", "Rechercher dans le marché sélectionné");
    bar.insertBefore(search, symbol);
    function filter() {
      var q = search.value.toUpperCase();
      Array.from(symbol.options).forEach(function (o) {
        o.hidden = (o.textContent + " " + o.value).toUpperCase().indexOf(q) < 0;
      });
    }
    search.addEventListener("input", filter);
    new MutationObserver(filter).observe(symbol, { childList: true });
    search.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        var o = Array.from(symbol.options).find(function (x) {
          return !x.hidden;
        });
        if (o) {
          symbol.value = o.value;
          symbol.dispatchEvent(new Event("change", { bubbles: true }));
          symbol.focus();
        }
      }
    });
    function action(label, fn) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "navBtn";
      b.textContent = label;
      b.title = label;
      b.onclick = function () {
        var c = window.IATBActiveChartController;
        if (c) fn(c);
      };
      bar.insertBefore(b, document.getElementById("wsState"));
    }
    action("Ajuster", function (c) {
      c.fitContent();
    });
    action("Zoom +", function (c) {
      c.setVisibleCount(c.visibleCount * 0.8, false);
    });
    action("Zoom −", function (c) {
      c.setVisibleCount(c.visibleCount * 1.2, false);
    });
    action("Échelle", function (c) {
      c.priceScale = 1;
      c.priceOffset = 0;
      c.invalidate();
    });
    ["interval", "visible"].forEach(function (id) {
      var n = document.getElementById(id);
      n.setAttribute(
        "aria-label",
        id === "interval" ? "Intervalle temporel" : "Nombre de bougies",
      );
      try {
        var v = localStorage.getItem("iatb.chart." + id);
        if (
          v &&
          Array.from(n.options).some(function (o) {
            return o.value === v;
          })
        ) {
          n.value = v;
          n.dispatchEvent(new Event("change", { bubbles: true }));
        }
      } catch (e) {}
      n.addEventListener("change", function () {
        try {
          localStorage.setItem("iatb.chart." + id, n.value);
        } catch (e) {}
      });
    });
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
