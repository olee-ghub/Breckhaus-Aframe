(function () {
  var root = document.getElementById("bh-wx");
  var btn = document.getElementById("bh-wx-trigger");
  var panel = document.getElementById("bh-wx-panel");
  var daysEl = document.getElementById("bh-wx-days");
  if (!root || !btn || !panel || !daysEl) return;
  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  function pad(n) { return n < 10 ? "0" + n : String(n); }
  function label(iso) {
    var p = iso.split("-");
    var m = +p[1], d = +p[2];
    var dt = new Date(Date.UTC(+p[0], m - 1, d, 12));
    return DAYS[dt.getUTCDay()] + " " + pad(m) + "/" + pad(d);
  }
  function icon(code) {
    var c = +code;
    if (c === 0) return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="currentColor"/><g stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"><path d="M12 2v2.2M12 19.8V22M2 12h2.2M19.8 12H22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"/></g></svg>';
    if (c === 1 || c === 2) return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="10" r="3.2" fill="currentColor"/><path fill="currentColor" d="M8 16.5h9.2a3.3 3.3 0 0 0 .2-6.6 4.4 4.4 0 0 0-8.3-1.5A3.6 3.6 0 0 0 8 16.5z" opacity=".9"/></svg>';
    if (c >= 71 && c <= 77 || c >= 85 && c <= 86) return '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 11.8h10a3.2 3.2 0 0 0 .2-6.4 4.3 4.3 0 0 0-8.2-1.4A3.5 3.5 0 0 0 7 11.8z"/><g stroke="currentColor" stroke-width="1.4" stroke-linecap="round" fill="none"><path d="M9 14l.7.7L9 15.4l-.7-.7zm3.2.4l.7.7-.7.7-.7-.7zm3-.3l.7.7-.7.7-.7-.7z"/></g></svg>';
    if (c >= 51 && c <= 67 || c >= 80 && c <= 82) return '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 12.5h10a3.2 3.2 0 0 0 .2-6.4 4.3 4.3 0 0 0-8.2-1.4A3.5 3.5 0 0 0 7 12.5z"/><g stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"><path d="M9 14.5v3M12 15v3.2M15 14.5v3"/></g></svg>';
    if (c >= 95) return '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 12h10a3.2 3.2 0 0 0 .2-6.4 4.3 4.3 0 0 0-8.2-1.4A3.5 3.5 0 0 0 7 12z"/><path fill="currentColor" d="M11.2 13.2h2.1l-1.5 3.1h1.5L10.8 21l1.1-4.2H10z"/></svg>';
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7.2 17h10a3.6 3.6 0 0 0 .25-7.2 4.8 4.8 0 0 0-9.1-1.6A3.9 3.9 0 0 0 7.2 17z"/></svg>';
  }
  function setOpen(on) {
    if (on) { root.setAttribute("open", ""); btn.setAttribute("aria-expanded", "true"); panel.hidden = false; panel.scrollTop = 0; }
    else { root.removeAttribute("open"); btn.setAttribute("aria-expanded", "false"); panel.hidden = true; }
  }
  btn.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); setOpen(!root.hasAttribute("open")); });
  document.addEventListener("pointerdown", function (e) { if (!root.contains(e.target)) setOpen(false); }, true);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });
  var url = "https://api.open-meteo.com/v1/forecast?latitude=39.4817&longitude=-106.0384&daily=weather_code,temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=America%2FDenver&forecast_days=7";
  fetch(url, { credentials: "omit" }).then(function (r) {
    if (!r.ok) throw new Error("wx");
    return r.json();
  }).then(function (data) {
    var d = data && data.daily;
    if (!d || !d.time || !d.time.length) throw new Error("shape");
    btn.querySelector(".bh-wx-icon").innerHTML = icon(d.weather_code[0]);
    btn.querySelector(".bh-wx-hi").textContent = Math.round(d.temperature_2m_max[0]) + "°";
    btn.querySelector(".bh-wx-date").textContent = label(d.time[0]);
    var html = "";
    for (var i = 0; i < Math.min(7, d.time.length); i++) {
      html += '<div class="bh-wx-day"><span class="bh-wx-dlabel">' + label(d.time[i]) + '</span><span class="bh-wx-icon" aria-hidden="true">' + icon(d.weather_code[i]) + '</span><span class="bh-wx-hi">' + Math.round(d.temperature_2m_max[i]) + '°</span><span class="bh-wx-lo">' + Math.round(d.temperature_2m_min[i]) + '°</span></div>';
    }
    daysEl.innerHTML = html;
    root.setAttribute("data-state", "ready");
  }).catch(function () {
    root.setAttribute("data-state", "error");
    btn.querySelector(".bh-wx-date").textContent = "Forecast";
  });
})();
