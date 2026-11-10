(function () {
  var root = document.getElementById("bh-ev");
  var btn = document.getElementById("bh-ev-trigger");
  var panel = document.getElementById("bh-ev-panel");
  var list = document.getElementById("bh-ev-list");
  if (!root || !btn || !panel || !list) return;

  var EVENTS = [
    {
      name: "Opening Day — Kingdom of Breck",
      date: "Wed Nov 11, 2026",
      desc: "Peak 8 opens with donuts, DJ sets, and a first-chair banner break.",
      href: "https://gobreck.com/winter-spring/best-winter-events-in-breckenridge/"
    },
    {
      name: "Breck Sky Fest kickoff",
      date: "Wed Nov 11, 5:30–7:00 PM",
      desc: "Public dark-sky evening with BOEC at the Wilderness Campus.",
      href: "https://gobreck.com/guide/stargazing-in-breckenridge/"
    },
    {
      name: "Other Worlds immersive art",
      date: "Daily through mid-Nov",
      desc: "Immersive family art exhibition at Old Masonic Hall (Breck Create).",
      href: "https://gobreck.com/event/breckenridge-international-festival-of-arts/"
    },
    {
      name: "Summit Historical Society Holiday Bazaar",
      date: "Sat Nov 14, 2026",
      desc: "Community holiday bazaar at Summit High School.",
      href: "https://gobreck.com/events/"
    },
    {
      name: "AstroTours stargazing at Beaver Run",
      date: "Wed Nov 18, 5:30–7:15 PM",
      desc: "Guided telescope tour during Breck Sky Fest month.",
      href: "https://gobreck.com/guide/stargazing-in-breckenridge/"
    },
    {
      name: "Lighting of Breckenridge + Race of the Santas",
      date: "Sat Dec 5, 2026",
      desc: "Dog parade, Santa race, Moose March, and 5 PM lighting of 250k lights on Main Street.",
      href: "https://gobreck.com/event/lighting-breckenridge-race-santas/"
    },
    {
      name: "Breckenridge Ullr Fest",
      date: "Dec 17–19, 2026",
      desc: "63rd Pray-for-Snow fest: parade, Shotski attempt, bonfire, Rockstar Energy Open.",
      href: "https://gobreck.com/event/ullr-fest/"
    },
    {
      name: "New Year’s Eve Torchlight Parade + Fireworks",
      date: "Wed Dec 31, 2026",
      desc: "Peak 9 torchlight (Glow Worm for kids) then fireworks to ring in the year.",
      href: "https://gobreck.com/event/new-years-eve-in-breckenridge/"
    }
  ];

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function closeWeather() {
    var wx = document.getElementById("bh-wx");
    var wxBtn = document.getElementById("bh-wx-trigger");
    var wxPanel = document.getElementById("bh-wx-panel");
    if (!wx) return;
    wx.removeAttribute("open");
    if (wxBtn) wxBtn.setAttribute("aria-expanded", "false");
    if (wxPanel) wxPanel.hidden = true;
  }

  function setOpen(on) {
    if (on) {
      closeWeather();
      root.setAttribute("open", "");
      btn.setAttribute("aria-expanded", "true");
      panel.hidden = false;
      panel.scrollTop = 0;
    } else {
      root.removeAttribute("open");
      btn.setAttribute("aria-expanded", "false");
      panel.hidden = true;
    }
  }

  var html = "";
  for (var i = 0; i < EVENTS.length; i++) {
    var e = EVENTS[i];
    html +=
      '<a class="bh-ev-item" href="' +
      esc(e.href) +
      '" target="_blank" rel="noopener noreferrer">' +
      '<span class="bh-ev-item-name">' +
      esc(e.name) +
      "</span>" +
      '<span class="bh-ev-item-date">' +
      esc(e.date) +
      "</span>" +
      '<span class="bh-ev-item-desc">' +
      esc(e.desc) +
      "</span>" +
      "</a>";
  }
  list.innerHTML = html;

  btn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    setOpen(!root.hasAttribute("open"));
  });
  document.addEventListener(
    "pointerdown",
    function (e) {
      if (!root.contains(e.target)) setOpen(false);
    },
    true
  );
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setOpen(false);
  });
})();
