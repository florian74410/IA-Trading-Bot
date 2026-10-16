(function () {
  "use strict";
  function boot() {
    var host = document.getElementById("chartBox"),
      graph = document.getElementById("iaChartHost");
    if (!host || !graph || host.querySelector(".iatbDrawDock")) return;
    var dock = document.createElement("div");
    dock.className = "iatbDrawDock";
    dock.setAttribute("aria-label", "Outils de dessin du graphique");
    var definitions = [
      ["cursor", "↖", "Curseur / navigation"],
      ["trend", "╱", "Ligne de tendance"],
      ["horizontal", "━", "Ligne horizontale"],
      ["rectangle", "▭", "Rectangle"],
      ["fib", "≋", "Retracement de Fibonacci"],
      ["select", "◇", "Sélectionner / déplacer"],
      ["delete", "×", "Supprimer la sélection"],
      ["redo", "↷", "Rétablir"],
      ["undo", "↶", "Annuler le dernier dessin"],
      ["clear", "⌫", "Effacer les dessins"],
    ];
    var overlay = document.createElement("canvas");
    overlay.id = "iatbDrawSurface";
    overlay.setAttribute("aria-label", "Surface de dessin graphique");
    host.appendChild(overlay);
    host.appendChild(dock);
    var ctx = overlay.getContext("2d"),
      mode = "cursor",
      items = [],
      start = null,
      preview = null,
      activeContext = "",
      selected = -1,
      drag = null,
      undo = [],
      redo = [];
    function clone(v) {
      return JSON.parse(JSON.stringify(v));
    }
    function save() {
      try {
        localStorage.setItem(
          "iatb.draw." + activeContext,
          JSON.stringify(items),
        );
      } catch (e) {}
    }
    function checkpoint() {
      undo.push(clone(items));
      if (undo.length > 60) undo.shift();
      redo = [];
    }
    function history(from, to) {
      if (!from.length) return;
      to.push(clone(items));
      items = from.pop();
      selected = -1;
      start = preview = null;
      save();
      paint();
    }

    definitions.forEach(function (def, i) {
      if (i === 5) {
        var divider = document.createElement("div");
        divider.className = "iatbDrawRule";
        dock.appendChild(divider);
      }
      var btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.tool = def[0];
      btn.textContent = def[1];
      btn.title = def[2];
      btn.setAttribute("aria-label", def[2]);
      btn.setAttribute("aria-pressed", def[0] === "cursor" ? "true" : "false");
      dock.appendChild(btn);
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        if (def[0] === "undo") {
          history(undo, redo);
          return;
        }
        if (def[0] === "redo") {
          history(redo, undo);
          return;
        }
        if (def[0] === "delete") {
          if (selected >= 0) {
            checkpoint();
            items.splice(selected, 1);
            selected = -1;
            save();
            paint();
          }
          return;
        }
        if (def[0] === "clear") {
          if (
            !items.length ||
            !confirm("Effacer les dessins de ce marché et intervalle ?")
          )
            return;
          checkpoint();
          items = [];
          save();
          start = null;
          preview = null;
          paint();
          return;
        }
        mode = def[0];
        start = null;
        preview = null;
        overlay.style.pointerEvents = mode === "cursor" ? "none" : "auto";
        overlay.style.cursor = mode === "cursor" ? "default" : "crosshair";
        [].forEach.call(
          dock.querySelectorAll("button[data-tool]"),
          function (b) {
            b.setAttribute(
              "aria-pressed",
              b.dataset.tool === mode ? "true" : "false",
            );
          },
        );
        paint();
      });
    });
    function controller() {
      return window.IATBActiveChartController;
    }
    function getKey() {
      var chart = controller(),
        c = (chart && chart.context) || {};
      return [c.source || "", c.symbol || "", c.timeframe || ""].join("|");
    }
    function geometry() {
      var chart = controller(),
        g = chart && chart._geom,
        rows = chart && chart.visibleRows && chart.visibleRows();
      return g && rows && rows.length ? { g: g, rows: rows } : null;
    }
    function point(event) {
      var rect = overlay.getBoundingClientRect(),
        x = event.clientX - rect.left,
        y = event.clientY - rect.top,
        layout = geometry();
      if (!layout) return null;
      var g = layout.g,
        rows = layout.rows;
      if (
        x < g.L ||
        x > g.L + g.cw ||
        y < g.priceTop ||
        y > g.priceTop + g.priceH
      )
        return null;
      var idx = Math.min(
        rows.length - 1,
        Math.max(0, Math.floor(((x - g.L) / g.cw) * rows.length)),
      );
      return {
        time: rows[idx].time,
        price: g.hi - ((y - g.priceTop) / g.priceH) * (g.hi - g.lo),
      };
    }
    function xy(p, layout) {
      var g = layout.g,
        rows = layout.rows,
        idx = 0;
      if (rows.length > 1) {
        var i = 0;
        while (i < rows.length - 2 && rows[i + 1].time < p.time) i++;
        idx =
          i + (p.time - rows[i].time) / (rows[i + 1].time - rows[i].time || 1);
      }
      return {
        x: g.L + ((idx + 0.5) * g.cw) / rows.length,
        y: g.priceTop + ((g.hi - p.price) / (g.hi - g.lo)) * g.priceH,
      };
    }
    function drawItem(item, layout) {
      var a = xy(item.a, layout),
        b = xy(item.b, layout);
      if (!a || !b) return;
      var g = layout.g;
      ctx.save();
      ctx.strokeStyle = "#40c9d2";
      ctx.fillStyle = "rgba(64,201,210,.10)";
      ctx.lineWidth = 1.6;
      if (item.type === "horizontal") {
        ctx.beginPath();
        ctx.moveTo(g.L, a.y);
        ctx.lineTo(g.L + g.cw, a.y);
        ctx.stroke();
      } else if (item.type === "rectangle") {
        ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
        ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
      } else if (item.type === "fib") {
        var levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
        levels.forEach(function (r) {
          var y = a.y + (b.y - a.y) * r;
          ctx.globalAlpha = r === 0.5 ? 1 : 0.72;
          ctx.beginPath();
          ctx.moveTo(Math.min(a.x, b.x), y);
          ctx.lineTo(g.L + g.cw, y);
          ctx.stroke();
          ctx.font = "10px Menlo,monospace";
          ctx.fillStyle = "#7fdce4";
          ctx.fillText(
            (r * 100).toFixed(1) +
              "% · " +
              (item.a.price + (item.b.price - item.a.price) * r).toFixed(4),
            Math.min(g.L + g.cw - 50, Math.max(a.x, b.x) + 5),
            y - 3,
          );
        });
      } else {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      ctx.restore();
    }
    function paint() {
      var d = Math.min(window.devicePixelRatio || 1, 2),
        w = host.clientWidth,
        h = host.clientHeight;
      if (w < 2 || h < 2) return;
      if (
        overlay.width !== Math.round(w * d) ||
        overlay.height !== Math.round(h * d)
      ) {
        overlay.width = Math.round(w * d);
        overlay.height = Math.round(h * d);
      }
      ctx.setTransform(d, 0, 0, d, 0, 0);
      ctx.clearRect(0, 0, w, h);
      var next = getKey();
      if (next !== activeContext) {
        items = [];
        try {
          var stored = JSON.parse(
            localStorage.getItem("iatb.draw." + next) || "[]",
          );
          if (Array.isArray(stored))
            items = stored
              .filter(function (x) {
                return (
                  x &&
                  ["trend", "horizontal", "rectangle", "fib"].indexOf(x.type) >=
                    0 &&
                  x.a &&
                  x.b &&
                  [x.a.time, x.a.price, x.b.time, x.b.price].every(
                    Number.isFinite,
                  )
                );
              })
              .slice(0, 120);
        } catch (e) {}
        start = null;
        preview = null;
        drag = null;
        selected = -1;
        undo = [];
        redo = [];
        activeContext = next;
      }
      var layout = geometry();
      if (!layout) return;
      ctx.save();
      ctx.beginPath();
      ctx.rect(layout.g.L, layout.g.priceTop, layout.g.cw, layout.g.priceH);
      ctx.clip();
      items.forEach(function (item, i) {
        drawItem(item, layout);
        if (i === selected) {
          [item.a, item.b].forEach(function (p) {
            var q = xy(p, layout);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(q.x - 4, q.y - 4, 8, 8);
          });
        }
      });
      if (start && preview)
        drawItem({ type: mode, a: start, b: preview }, layout);
      ctx.restore();
    }
    overlay.addEventListener("pointerdown", function (e) {
      if (e.button !== 0 || mode === "cursor") return;
      var p = point(e);
      if (!p) return;
      if (mode === "select") {
        selected = -1;
        var l = geometry(),
          pos = xy(p, l);
        for (var i = items.length - 1; i >= 0; i--) {
          var a = xy(items[i].a, l),
            b = xy(items[i].b, l),
            da = Math.hypot(a.x - pos.x, a.y - pos.y),
            db = Math.hypot(b.x - pos.x, b.y - pos.y),
            dx = b.x - a.x,
            dy = b.y - a.y,
            t = Math.max(
              0,
              Math.min(
                1,
                ((pos.x - a.x) * dx + (pos.y - a.y) * dy) /
                  (dx * dx + dy * dy || 1),
              ),
            ),
            dist = Math.hypot(pos.x - a.x - t * dx, pos.y - a.y - t * dy);
          if (
            da < 10 ||
            db < 10 ||
            dist < 9 ||
            (items[i].type === "horizontal" && Math.abs(pos.y - a.y) < 9) ||
            (items[i].type === "rectangle" &&
              pos.x >= Math.min(a.x, b.x) &&
              pos.x <= Math.max(a.x, b.x) &&
              pos.y >= Math.min(a.y, b.y) &&
              pos.y <= Math.max(a.y, b.y))
          ) {
            selected = i;
            checkpoint();
            drag = {
              point: p,
              original: clone(items[i]),
              handle: da < 10 ? "a" : db < 10 ? "b" : null,
            };
            break;
          }
        }
        paint();
        overlay.setPointerCapture(e.pointerId);
        return;
      }
      start = p;
      preview = p;
      overlay.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    overlay.addEventListener("pointermove", function (e) {
      if (drag) {
        var p = point(e);
        if (!p) return;
        var o = drag.original,
          it = items[selected];
        if (drag.handle) it[drag.handle] = p;
        else
          ["a", "b"].forEach(function (k) {
            it[k] = {
              time: o[k].time + p.time - drag.point.time,
              price: o[k].price + p.price - drag.point.price,
            };
          });
        paint();
        return;
      }
      if (!start) return;
      preview = point(e) || preview;
      paint();
    });
    overlay.addEventListener("pointerup", function (e) {
      if (drag) {
        drag = null;
        save();
        return;
      }
      if (!start) return;
      var end = point(e) || preview || start;
      if (
        end &&
        (mode === "horizontal" ||
          end.time !== start.time ||
          Math.abs(end.price - start.price) > 1e-10)
      ) {
        checkpoint();
        items.push({ type: mode, a: start, b: end });
        if (items.length > 120) items.shift();
      }
      start = null;
      preview = null;
      save();
      paint();
      if (overlay.hasPointerCapture(e.pointerId))
        overlay.releasePointerCapture(e.pointerId);
    });
    overlay.addEventListener("pointercancel", function () {
      if (drag) {
        items[selected] = drag.original;
        undo.pop();
        drag = null;
      }
      start = null;
      preview = null;
      paint();
    });
    document.addEventListener("keydown", function (e) {
      if (
        /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) ||
        e.target.isContentEditable
      )
        return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) history(redo, undo);
        else history(undo, redo);
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        var del = dock.querySelector("[data-tool=delete]");
        if (selected >= 0) {
          e.preventDefault();
          del.click();
        }
        return;
      }
      if (e.key === "Escape" && drag) {
        items[selected] = drag.original;
        undo.pop();
        drag = null;
        paint();
      }
      if (e.key === "Escape" && mode !== "cursor") {
        var button = dock.querySelector("[data-tool=cursor]");
        if (button) button.click();
      }
    });
    if (window.ResizeObserver) new ResizeObserver(paint).observe(host);
    window.addEventListener("resize", paint);
    host.addEventListener("ia-tb:chart-hover", paint);
    host.addEventListener("ia-tb:chart-candles-loaded", paint);
    window.IATBChartDrawingTools = {
      refresh: paint,
      state: function () {
        return {
          context: activeContext,
          items: clone(items),
          selected: selected,
          undo: undo.length,
          redo: redo.length,
        };
      },
    };
    var last = "";
    function sync() {
      var c = controller(),
        g = c && c._geom,
        key =
          getKey() +
          "|" +
          JSON.stringify(g) +
          "|" +
          (c ? c.visibleCount + ":" + c.panOffset + ":" + c.rows.length : "");
      if (key !== last) {
        last = key;
        paint();
      }
      requestAnimationFrame(sync);
    }
    requestAnimationFrame(sync);
    paint();
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
