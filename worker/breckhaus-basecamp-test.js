import { EmailMessage } from "cloudflare:email";

const TRACKING_JS = "/*\n * Breckhaus Aframe — Meta Pixel + GA4 scaffold\n *\n * META_PIXEL_ID is still the placeholder. fbevents.js is not requested until\n * Oliver pastes the numeric Pixel ID from Events Manager.\n * GA4_MEASUREMENT_ID is set. gtag.js loads for that property.\n *\n * Event choice (this site is one property page; booking is a request, not a charge):\n *   ViewContent          once per page that contains #property.\n *                        There is no separate property URL. index.html is the listing.\n *   Schedule             when a guest clicks a link to #book (fixed nav\n *                        \"Check Availability\" and footer \"Book Direct\" are the\n *                        same in-page booking flow) and once when they first\n *                        click into the Hospitable booking panel.\n *                        Schedule, not Lead: the click starts date selection.\n *                        It does not submit guest details.\n *   CompleteRegistration only if the guest comes back to this site with\n *                        ?booking=confirmed (or #booking-confirmed) after the\n *                        Hospitable request. Not Purchase: the widget's Reserve\n *                        step is \"Request to book\" and says the guest is not\n *                        charged yet. The request itself finishes on\n *                        booking.hospitable.com, which this repo cannot tag.\n *                        If Review & Confirm actually captures payment, change\n *                        this one event to Purchase / GA4 purchase.\n *\n * Page hits: Meta PageView once (base code) and GA4 page_view once (config).\n * ViewContent is an extra event, not a second pageview.\n */\n(function () {\n  if (window.BreckhausTracking && window.BreckhausTracking.installed) return;\n\n  var META_PIXEL_ID = \"META_PIXEL_ID\";\n  var GA4_MEASUREMENT_ID = \"G-L4XM6LG9WK\";\n\n  var LISTING = {\n    content_name: \"Breckhaus Aframe\",\n    content_category: \"vacation_rental\",\n    content_type: \"home_listing\",\n    content_ids: [\"breckhaus-aframe\"]\n  };\n\n  function isPixelId(id) {\n    return /^\\d{8,20}$/.test(id);\n  }\n  function isMeasurementId(id) {\n    return /^G-[A-Z0-9]{4,}$/.test(id);\n  }\n\n  var metaReady = isPixelId(META_PIXEL_ID);\n  var gaReady = isMeasurementId(GA4_MEASUREMENT_ID);\n  var events = [];\n\n  var status = {\n    installed: true,\n    meta: metaReady ? \"ready\" : \"placeholder\",\n    ga4: gaReady ? \"ready\" : \"placeholder\",\n    events: events\n  };\n  window.BreckhausTracking = status;\n\n  function remember(channel, name, params) {\n    events.push({ channel: channel, name: name, params: params, at: Date.now() });\n  }\n\n  function loadMeta() {\n    if (window.fbq) {\n      status.meta = \"skipped_existing_fbq\";\n      return;\n    }\n    !function (f, b, e, v, n, t, s) {\n      if (f.fbq) return;\n      n = f.fbq = function () {\n        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);\n      };\n      if (!f._fbq) f._fbq = n;\n      n.push = n;\n      n.loaded = !0;\n      n.version = \"2.0\";\n      n.queue = [];\n      t = b.createElement(e);\n      t.async = !0;\n      t.src = v;\n      s = b.getElementsByTagName(e)[0];\n      s.parentNode.insertBefore(t, s);\n    }(window, document, \"script\", \"https://connect.facebook.net/en_US/fbevents.js\");\n    window.fbq(\"init\", META_PIXEL_ID);\n    window.fbq(\"track\", \"PageView\");\n    remember(\"meta\", \"PageView\", {});\n  }\n\n  function loadGa4() {\n    if (window.gtag || (window.dataLayer && window.google_tag_data)) {\n      status.ga4 = \"skipped_existing_gtag\";\n      return;\n    }\n    window.dataLayer = window.dataLayer || [];\n    window.gtag = function () { window.dataLayer.push(arguments); };\n    window.gtag(\"js\", new Date());\n    window.gtag(\"config\", GA4_MEASUREMENT_ID, { send_page_view: true });\n    var s = document.createElement(\"script\");\n    s.async = true;\n    s.src = \"https://www.googletagmanager.com/gtag/js?id=\" + encodeURIComponent(GA4_MEASUREMENT_ID);\n    document.head.appendChild(s);\n    remember(\"ga4\", \"page_view\", { send_page_view: true });\n  }\n\n  function meta(eventName, params) {\n    remember(\"meta\", eventName, params);\n    if (status.meta === \"ready\" && window.fbq) window.fbq(\"track\", eventName, params);\n  }\n\n  function ga(eventName, params) {\n    remember(\"ga4\", eventName, params);\n    if (status.ga4 === \"ready\" && window.gtag) window.gtag(\"event\", eventName, params);\n  }\n\n  function listingParams(extra) {\n    var params = {\n      content_name: LISTING.content_name,\n      content_category: LISTING.content_category,\n      content_type: LISTING.content_type,\n      content_ids: LISTING.content_ids\n    };\n    if (extra) {\n      for (var key in extra) {\n        if (Object.prototype.hasOwnProperty.call(extra, key)) params[key] = extra[key];\n      }\n    }\n    return params;\n  }\n\n  function trackViewContent() {\n    if (!document.getElementById(\"property\")) return;\n    var params = listingParams({ cta: \"property_page\" });\n    meta(\"ViewContent\", params);\n    ga(\"ViewContent\", params);\n  }\n\n  function trackSchedule(cta) {\n    var params = listingParams({ cta: cta });\n    meta(\"Schedule\", params);\n    ga(\"Schedule\", params);\n  }\n\n  function trackCompleteRegistration() {\n    var params = listingParams({ cta: \"booking_return\" });\n    var storageKey = \"breckhaus_complete_registration\";\n    try {\n      if (window.sessionStorage.getItem(storageKey)) return;\n      window.sessionStorage.setItem(storageKey, \"1\");\n    } catch (err) { /* private mode: still send once this load */ }\n    meta(\"CompleteRegistration\", params);\n    ga(\"CompleteRegistration\", params);\n  }\n\n  function bookingConfirmedInUrl() {\n    var query = new URLSearchParams(window.location.search);\n    if (query.get(\"booking\") === \"confirmed\") return true;\n    return window.location.hash === \"#booking-confirmed\";\n  }\n\n  function ctaName(anchor) {\n    if (anchor.closest && anchor.closest(\"nav\")) return \"sticky_nav\";\n    if (anchor.closest && anchor.closest(\"footer\")) return \"footer\";\n    return \"booking_link\";\n  }\n\n  if (metaReady) loadMeta();\n  if (gaReady) loadGa4();\n\n  trackViewContent();\n  if (bookingConfirmedInUrl()) trackCompleteRegistration();\n\n  document.addEventListener(\"click\", function (event) {\n    var anchor = event.target && event.target.closest ? event.target.closest('a[href=\"#book\"]') : null;\n    if (!anchor) return;\n    trackSchedule(ctaName(anchor));\n  }, true);\n\n  var panelTracked = false;\n  window.addEventListener(\"blur\", function () {\n    if (panelTracked) return;\n    var frame = document.getElementById(\"booking-iframe\");\n    if (frame && document.activeElement === frame) {\n      panelTracked = true;\n      trackSchedule(\"booking_panel\");\n    }\n  });\n})();\n";

const FLYOVER_FILES = new Set([
  "/video/flyover-480-text.mp4",
  "/video/flyover-720-text.mp4",
  "/video/flyover-1080-text.mp4",
]);
const CACHE_BUSTER_FROM = "v=text1";
const CACHE_BUSTER_TO = "v=hq2";

const LIVE_HOSTS = new Set(["breckhausaframe.com", "www.breckhausaframe.com"]);
const LIVE_TITLE = "Breckhaus Aframe · Breckenridge Vacation Rental, Sleeps 8";
const LIVE_TITLE_FROM = "Base Camp Photos · Breckhaus Aframe · Breckenridge Vacation Rental, Sleeps 8";

function isLiveHost(request) {
  return LIVE_HOSTS.has(new URL(request.url).hostname);
}

function isLiveHomepage(request) {
  if (!isLiveHost(request)) return false;
  const path = new URL(request.url).pathname;
  return path === "/" || path === "/index.html";
}

function applyRobotsTag(headers, request) {
  if (isLiveHost(request)) headers.delete("X-Robots-Tag");
  else headers.set("X-Robots-Tag", "noindex, nofollow");
}
// BEGIN bh-discovery-v1
const CANONICAL_ORIGIN = "https://www.breckhausaframe.com";
const ROBOTS_TXT = "# Breckhaus Aframe — https://www.breckhausaframe.com\nUser-agent: *\nContent-Signal: search=yes, ai-input=yes, ai-train=yes\nAllow: /\n\n# Booking handoff (noindex interstitial)\nDisallow: /book\nDisallow: /book/\nDisallow: /api/\n\nSitemap: https://www.breckhausaframe.com/sitemap.xml\n\n# AI agent briefing\n# https://www.breckhausaframe.com/llms.txt\n";
const SITEMAP_XML = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n  <url>\n    <loc>https://www.breckhausaframe.com/</loc>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>\n  <url>\n    <loc>https://breckhausaframe.com/</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>\n</urlset>\n";
function discoveryHeaders(request, contentType) {
  const h = new Headers({ "content-type": contentType, "cache-control": "public, max-age=300" });
  applyRobotsTag(h, request);
  return h;
}
function ensureCanonical(html, request) {
  if (!isLiveHost(request)) return { html, changed: false };
  if (/rel=["']canonical["']/i.test(html)) return { html, changed: false };
  const path = new URL(request.url).pathname || "/";
  const clean = path === "/index.html" ? "/" : path;
  const href = CANONICAL_ORIGIN + (clean === "/" ? "/" : clean);
  const tag = '<link rel="canonical" href="' + href + '" />';
  if (html.includes("</head>")) {
    return { html: html.replace("</head>", tag + "</head>"), changed: true };
  }
  return { html, changed: false };
}
// END bh-discovery-v1


// Caller logo mark (cropped, no wordmark text) served from R2
const LOGO_MARK_PATH = "/assets/logo-mark-nav.png";
const LOGO_MARK_R2_KEY = "video/logo-mark-nav.png";
const LOGO_MARK_SRC = "assets/logo-mark-nav.png?v=v257";
const LOGO_MARK_HIRES_B64 = "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";

function serveLogoMarkHires(request) {
  const bin = Uint8Array.from(atob(LOGO_MARK_HIRES_B64), function(c) { return c.charCodeAt(0); });
  const h = new Headers();
  h.set("content-type", "image/png");
  h.set("Cache-Control", "public, max-age=31536000, immutable");
  h.set("Content-Length", String(bin.byteLength));
  applyRobotsTag(h, request);
  return new Response(bin, { status: 200, headers: h });
}

function videoCache(pathname) {
  if (pathname.startsWith("/video/") && (pathname.endsWith(".ts") || pathname.endsWith(".mp4")))
    return "public, max-age=31536000, immutable";
  if (pathname.endsWith(".m3u8")) return "public, max-age=0, must-revalidate";
  return null;
}

async function serveFlyoverFromR2(request, env, pathname) {
  const key = pathname.slice(1); // video/flyover-...
  const range = request.headers.get("range");
  if (range && request.method === "GET") {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    const head = await env.DRONE.head(key);
    if (m && head && head.size != null && (m[1] !== "" || m[2] !== "")) {
      const size = head.size;
      let start, end;
      if (m[1] === "") {
        start = Math.max(0, size - Number(m[2]));
        end = size - 1;
      } else {
        start = Number(m[1]);
        end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
      }
      const h = new Headers();
      h.set("content-type", "video/mp4");
      h.set("Accept-Ranges", "bytes");
      applyRobotsTag(h, request);
      h.set("Cache-Control", videoCache(pathname));
      if (start >= size || start > end) {
        h.set("Content-Range", `bytes */${size}`);
        return new Response(null, { status: 416, headers: h });
      }
      const obj = await env.DRONE.get(key, { range: { offset: start, length: end - start + 1 } });
      if (!obj) return new Response("not found", { status: 404 });
      h.set("Content-Range", `bytes ${start}-${end}/${size}`);
      h.set("Content-Length", String(end - start + 1));
      return new Response(obj.body, { status: 206, headers: h });
    }
  }
  const obj = await env.DRONE.get(key);
  if (!obj) return new Response("not found", { status: 404 });
  const h = new Headers();
  h.set("content-type", "video/mp4");
  h.set("Accept-Ranges", "bytes");
  applyRobotsTag(h, request);
  h.set("Cache-Control", videoCache(pathname));
  if (obj.size != null) h.set("Content-Length", String(obj.size));
  return new Response(obj.body, { status: 200, headers: h });
}


async function serveR2Object(request, env, key, contentType, cacheControl) {
  const obj = await env.DRONE.get(key);
  if (!obj) return new Response("not found", { status: 404 });
  const h = new Headers();
  h.set("content-type", contentType);
  applyRobotsTag(h, request);
  if (cacheControl) h.set("Cache-Control", cacheControl);
  if (obj.size != null) h.set("Content-Length", String(obj.size));
  return new Response(obj.body, { status: 200, headers: h });
}

const TEXT_CRISPNESS_CSS = "/* text crispness \u2014 weight / tracking / light shadow on dark grounds */\n    body {\n      font-weight: 400;\n      letter-spacing: 0.01em;\n    }\n    .section-title,\n    .gallery-group-title {\n      font-weight: 400;\n      letter-spacing: -0.008em;\n      text-shadow: 0 1px 0 rgba(0, 0, 0, 0.45);\n    }\n    .eyebrow,\n    .nav-links a,\n    .fact-l,\n    .caption,\n    .gallery-note,\n    .shot figcaption,\n    .shot .lbl,\n    .flyover-play-label,\n    .gallery-group-title .eyebrow {\n      letter-spacing: 0.12em;\n    }\n    .nav-logo .nav-eyebrow {\n      letter-spacing: 0.22em;\n      font-weight: 500;\n    }\n    .nav-logo .nav-wordmark {\n      letter-spacing: 0.02em;\n      text-shadow: 0 1px 0 rgba(0, 0, 0, 0.35);\n    }\n    .lede,\n    .amenity-list li,\n    .faq-item p,\n    .faq-facts li,\n    .rule p,\n    .rule-facts li,\n    .rule-note,\n    .floor p,\n    .place-card p,\n    .gallery-intro .lede {\n      font-weight: 400;\n      letter-spacing: 0.015em;\n    }\n    .fact-n,\n    .hero-fact-val,\n    .place-card-img .place-n,\n    .faq-item h3,\n    .rule h3,\n    .floor h3,\n    .place-card h3,\n    .contact-card h3 {\n      font-weight: 400;\n      letter-spacing: 0.01em;\n    }\n    .faq-item h3,\n    .rule h3,\n    .floor h3,\n    .place-card h3 {\n      text-shadow: 0 1px 0 rgba(0, 0, 0, 0.4);\n    }\n    .caption,\n    .gallery-note,\n    .amenity-list li,\n    .nav-links a {\n      text-shadow: 0 1px 0 rgba(0, 0, 0, 0.28);\n    }\n    /* cream/contact panel: no dark-ground shadow */\n    .contact .section-title,\n    .contact .lede,\n    .contact-card h3,\n    .contact-card p,\n    .contact-form label {\n      text-shadow: none;\n      letter-spacing: 0.01em;\n      font-weight: 400;\n    }\n    .contact-form input,\n    .contact-form textarea {\n      font-weight: 400;\n      letter-spacing: 0.01em;\n    }\n    @media (max-width: 767px) {\n      body { letter-spacing: 0.005em; }\n      .section-title,\n      .gallery-group-title,\n      .faq-item h3,\n      .rule h3,\n      .floor h3,\n      .place-card h3,\n      .caption,\n      .gallery-note,\n      .amenity-list li,\n      .nav-links a,\n      .nav-logo .nav-wordmark {\n        text-shadow: none;\n      }\n      .eyebrow,\n      .nav-links a,\n      .fact-l,\n      .caption,\n      .gallery-note,\n      .shot figcaption,\n      .shot .lbl,\n      .flyover-play-label,\n      .gallery-group-title .eyebrow {\n        letter-spacing: 0.1em;\n      }\n    }";
const TEXT_CRISPNESS_MARK = "text crispness — weight";

// +20% nav height vs Base Camp (78→94 / 88→106), larger mark, hero starts below bar
const NAV_TALLER_MARK = "bh-nav-taller";
const NAV_TALLER_CSS = `/* bh-nav-taller: ~20% taller black bar, larger logo mark, hero clears roof */
    :root { --nav-h: 94px !important; }
    @media (min-width: 768px) { :root { --nav-h: 106px !important; } }
    .nav-logo.has-mark .nav-mark {
      width: 82px !important;
      height: 74px !important;
    }
    @media (max-width: 767px) {
      .nav-logo.has-mark .nav-mark { width: 65px !important; height: 60px !important; }
    }
    @media (max-width: 480px) {
      .nav-logo.has-mark .nav-mark { width: 58px !important; height: 53px !important; }
    }
    @media (max-width: 430px) {
      .nav-logo.has-mark .nav-mark { width: 53px !important; height: 48px !important; }
    }
    @media (max-width: 400px) {
      .nav-logo.has-mark .nav-mark { width: 50px !important; height: 46px !important; }
    }
    .hero-media {
      top: var(--nav-h) !important;
      right: 0 !important;
      bottom: 0 !important;
      left: 0 !important;
    }
    .hero {
      background-position: center calc(40% + 14px);
    }
    @media (max-width: 767px) {
      .hero-media {
        top: var(--nav-h) !important;
        right: 0 !important;
        left: 0 !important;
        bottom: auto !important;
        height: var(--mh-h, 64%) !important;
      }
    }`;


// Dominant brand wordmark in nav (eyebrow size unchanged)
const NAV_WORDMARK_LG_MARK = "bh-nav-wordmark-lg";
const NAV_WORDMARK_LG_CSS = `/* bh-nav-wordmark-lg: brand name larger than location eyebrow */
    .nav-logo .nav-wordmark {
      font-size: 1.9rem !important;
    }
    @media (max-width: 767px) {
      .nav-logo .nav-wordmark { font-size: 1.55rem !important; }
    }
    @media (max-width: 480px) {
      .nav-logo.has-mark .nav-wordmark { font-size: 1.4rem !important; }
    }
    @media (max-width: 430px) {
      .nav-logo.has-mark .nav-wordmark { font-size: 1.28rem !important; }
    }
    @media (max-width: 400px) {
      .nav-logo.has-mark .nav-wordmark { font-size: 1.2rem !important; }
    }`;

const AREA_SKIER_BTN = "<button data-slot=\"around-05-skier\" class=\"shot s4\" type=\"button\" data-full=\"img/area-skier.jpg?v=area1\" data-cap=\"skiing\"><img src=\"img/area-skier.jpg?v=area1\" alt=\"Skier carving powder above a mountain valley\" width=\"720\" height=\"479\" loading=\"eager\" decoding=\"async\" /></button>";
const AREA_SCULPTURE_BTN = "<button data-slot=\"around-06-snow-sculpture\" class=\"shot s4\" type=\"button\" data-full=\"img/area-snow-sculpture.jpg?v=area1\" data-cap=\"International Snow Sculpture Championships\"><img src=\"img/area-snow-sculpture.jpg?v=area1\" alt=\"Night snow sculpture of a horned figure with a dog\" width=\"720\" height=\"613\" loading=\"eager\" decoding=\"async\" /></button>";
const AREA_TROLL_BTN = "<button data-slot=\"around-07-troll\" class=\"shot s4\" type=\"button\" data-full=\"img/area-troll.jpg?v=area1\" data-cap=\"Isak Heartstone Breckenridge Troll\"><img src=\"img/area-troll.jpg?v=area1\" alt=\"Wooden troll sculpture in the forest near Breckenridge\" width=\"720\" height=\"479\" loading=\"eager\" decoding=\"async\" /></button>";
const AREA_CYCLISTS_BTN = "<button data-slot=\"around-08-cyclists\" class=\"shot s4\" type=\"button\" data-full=\"img/area-cyclists.jpg?v=area1\" data-cap=\"biking\"><img src=\"img/area-cyclists.jpg?v=area1\" alt=\"Four cyclists on a paved mountain trail\" width=\"720\" height=\"479\" loading=\"eager\" decoding=\"async\" /></button>";
const AREA_R2_KEYS = new Set(["img/area-skier.jpg","img/area-snow-sculpture.jpg","img/area-troll.jpg","img/area-cyclists.jpg"]);
function replaceBalancedOpenTag(html, openRe, replacement) {
  const m = openRe.exec(html);
  if (!m) return { html, changed: false };
  const start = m.index;
  const openEnd = start + m[0].length;
  // Determine tag name from match
  const tagMatch = /^<([a-zA-Z0-9:-]+)/.exec(m[0]);
  if (!tagMatch) return { html, changed: false };
  const tag = tagMatch[1].toLowerCase();
  const lower = html.toLowerCase();
  let i = openEnd;
  let depth = 1;
  while (i < html.length && depth > 0) {
    const nextOpen = lower.indexOf('<' + tag, i);
    const nextClose = lower.indexOf('</' + tag, i);
    if (nextClose < 0) break;
    if (nextOpen >= 0 && nextOpen < nextClose) {
      // make sure it's a real open tag not a prefix of another tag
      const ch = lower[nextOpen + 1 + tag.length];
      if (ch === '>' || ch === ' ' || ch === '\t' || ch === '\n' || ch === '/') {
        depth++;
        i = nextOpen + 1 + tag.length;
        continue;
      }
      i = nextOpen + 1 + tag.length;
      continue;
    }
    depth--;
    if (depth === 0) {
      const closeEnd = lower.indexOf('>', nextClose) + 1;
      return { html: html.slice(0, start) + replacement + html.slice(closeEnd), changed: true };
    }
    i = nextClose + 2 + tag.length;
  }
  return { html, changed: false };
}

async function maybeRewriteHtml(request, env, res) {
  const url = new URL(request.url);
  const path = url.pathname;
  const ct = res.headers.get("content-type") || "";
  const isHtml =
    ct.includes("text/html") ||
    path === "/" ||
    path === "/index.html" ||
    path.endsWith(".html");
  if (!isHtml || !res.ok) return null;
  let html = await res.text();
  let changed = false;
  if (isLiveHomepage(request)) {
    if (html.includes("<title>" + LIVE_TITLE_FROM + "</title>")) {
      html = html.replace("<title>" + LIVE_TITLE_FROM + "</title>", "<title>" + LIVE_TITLE + "</title>");
      changed = true;
    }
    const robotsRe = /<meta\s+name=["']robots["']\s+content=["']noindex,\s*nofollow["']\s*\/?>\s*/i;
    if (robotsRe.test(html)) {
      html = html.replace(robotsRe, "");
      changed = true;
    }
  }
  if (html.includes("flyover-") && html.includes(CACHE_BUSTER_FROM)) {
    html = html
      .replaceAll(`flyover-480-text.mp4?${CACHE_BUSTER_FROM}`, `flyover-480-text.mp4?${CACHE_BUSTER_TO}`)
      .replaceAll(`flyover-720-text.mp4?${CACHE_BUSTER_FROM}`, `flyover-720-text.mp4?${CACHE_BUSTER_TO}`)
      .replaceAll(`flyover-1080-text.mp4?${CACHE_BUSTER_FROM}`, `flyover-1080-text.mp4?${CACHE_BUSTER_TO}`);
    changed = true;
  }
  if (!html.includes(TEXT_CRISPNESS_MARK)) {
    const tag = "<style id=\"bh-text-crisp\">\n" + TEXT_CRISPNESS_CSS + "\n</style>";
    if (html.includes("</head>")) {
      html = html.replace("</head>", tag + "</head>");
      changed = true;
    }
  }
  // Also bump body font-weight 300 → 400 if still present in base CSS
  if (html.includes("line-height: 1.6;\n      font-weight: 300;")) {
    html = html.replace("line-height: 1.6;\n      font-weight: 300;", "line-height: 1.6;\n      font-weight: 400;");
    changed = true;
  } else if (html.includes("line-height: 1.6;\r\n      font-weight: 300;")) {
    html = html.replace("line-height: 1.6;\r\n      font-weight: 300;", "line-height: 1.6;\r\n      font-weight: 400;");
    changed = true;
  } else if (html.includes("font-weight: 300;") && html.includes("font-family: \"Jost\"")) {
    // fallback: first body font-weight 300 only via targeted replace already handled; leave
  }
    if (!html.includes(NAV_TALLER_MARK)) {
    const tag = "<style id=\"bh-nav-taller\">\n" + NAV_TALLER_CSS + "\n</style>";
    if (html.includes("</head>")) {
      html = html.replace("</head>", tag + "</head>");
      changed = true;
    }
  }
  if (!html.includes(NAV_WORDMARK_LG_MARK)) {
    const tag = "<style id=\"bh-nav-wordmark-lg\">\n" + NAV_WORDMARK_LG_CSS + "\n</style>";
    if (html.includes("</head>")) {
      html = html.replace("</head>", tag + "</head>");
      changed = true;
    }
  }
// Swap header logo mark to caller crop (graphic only, no baked-in text)
  if (html.includes("logo-lockup.png") || html.includes("site-logo")) {
    const next = html
      .replace(/src="assets\/logo-lockup\.png\?v=[^"]+"/g, 'src="' + LOGO_MARK_SRC + '"')
      .replace(/src='assets\/logo-lockup\.png\?v=[^']+'/g, "src='" + LOGO_MARK_SRC + "'");
    if (next !== html) { html = next; changed = true; }
  }

  // BEGIN bh-hero-scrim-v1
  if (!html.includes("bh-hero-scrim-v1")) {
    const heroScrimCss = `<style id="bh-hero-scrim-v1">
.hero-scrim{
  background: linear-gradient(to bottom,
    rgba(13,13,11,0.1152) 0%,
    rgba(13,13,11,0.09216) 38%,
    rgba(13,13,11,0.24192) 68%,
    rgba(13,13,11,0.44928) 100%) !important;
}
</style>`;
    if (html.includes("</head>")) {
      html = html.replace("</head>", heroScrimCss + "</head>");
      changed = true;
    }
  }
  // bh-hero-pos-v1: nudge hero text block ~3% up and left
  if (!html.includes("bh-hero-pos-v1")) {
    const heroPosCss = `<style id="bh-hero-pos-v1">
.hero-inner{
  transform: translate(-1vw, -10vh) !important;
}
</style>`;
    if (html.includes("</head>")) {
      html = html.replace("</head>", heroPosCss + "</head>");
      changed = true;
    }
  }
  // bh-hero-text-sharp-v1: sharper hero headline/caption/amenities (shadow + weight only)
  if (!html.includes("bh-hero-text-sharp-v1")) {
    const heroTextSharpCss = `<style id="bh-hero-text-sharp-v1">
.hero h1{
  font-weight: 450 !important;
  text-shadow:
    0 0 1px rgba(0,0,0,0.48),
    0 1px 2px rgba(0,0,0,0.70),
    0 2px 10px rgba(0,0,0,0.54),
    0 4px 9px rgba(0,0,0,0.22) !important;
}
.hero h1 em{
  font-weight: 450 !important;
  text-shadow:
    0 0 1px rgba(0,0,0,0.48),
    0 1px 2px rgba(0,0,0,0.675),
    0 2px 9px rgba(0,0,0,0.515),
    0 4px 8px rgba(0,0,0,0.21) !important;
}
.hero-lede{
  font-weight: 450 !important;
  text-shadow:
    0 0 1px rgba(0,0,0,0.48),
    0 1px 2px rgba(0,0,0,0.715),
    0 2px 7px rgba(0,0,0,0.51),
    0 3px 7px rgba(0,0,0,0.225) !important;
}
.hero-fact-val{
  font-weight: 350 !important;
  text-shadow:
    0 0 1px rgba(0,0,0,0.48),
    0 1px 2px rgba(0,0,0,0.65),
    0 2px 4px rgba(0,0,0,0.275) !important;
}
.hero-fact-lbl{
  font-weight: 450 !important;
  text-shadow:
    0 0 1px rgba(0,0,0,0.45),
    0 1px 2px rgba(0,0,0,0.40),
    0 2px 3px rgba(0,0,0,0.25) !important;
}
</style>`;
    if (html.includes("</head>")) {
      html = html.replace("</head>", heroTextSharpCss + "</head>");
      changed = true;
    }
  }
  // bh-nav-lockup-v1: big mark + location at logo base; hide stacked wordmark; leave hero-inner alone
  if (!html.includes("bh-nav-lockup-v1")) {
    const navLockupCss = `<style id="bh-nav-lockup-v1">
:root{ --nav-h: 112px !important; }
@media (min-width: 768px){ :root{ --nav-h: 138px !important; } }
.nav-logo.has-mark{
  align-items: center !important;
  gap: 0 !important;
  flex: 0 0 auto !important;
  max-width: none !important;
}
.nav-logo.has-mark .nav-mark{
  width: 133px !important;
  height: 122px !important;
}
@media (max-width: 767px){
  .nav-logo.has-mark .nav-mark{ width: 84px !important; height: 76px !important; }
  :root{ --nav-h: 96px !important; }
}
@media (max-width: 430px){
  .nav-logo.has-mark .nav-mark{ width: 72px !important; height: 66px !important; }
  :root{ --nav-h: 88px !important; }
}
.nav-logo .nav-text,
.nav-logo .nav-wordmark,
.nav-logo.has-mark .nav-wordmark,
.nav-logo .nav-eyebrow,
.nav-logo.has-mark .nav-eyebrow{
  display: none !important;
}
@media (min-width: 768px){
  nav{ gap: 1rem !important; }
  .nav-end{
    flex: 1 1 auto !important;
    min-width: 0 !important;
    justify-content: flex-end !important;
  }
  #header-reserve, nav .nav-end > a.btn-gold{
    flex: 0 0 auto !important;
  }
}
</style>`;
    if (html.includes("</head>")) {
      html = html.replace("</head>", navLockupCss + "</head>");
      changed = true;
    }
  }
  // bh-logo-bold2: cache-bust thicker mark on all breakpoints
  if (!html.includes("bh-logo-bold2")) {
    const nextLogo = html
      .replace(/assets\/logo-mark-nav\.png\?v=[^"'\s>]+/g, "assets/logo-mark-nav.png?v=bold2");
    if (nextLogo !== html) { html = nextLogo; changed = true; }
    // marker comment so we don't thrash
    if (html.includes("</head>")) {
      html = html.replace("</head>", "<!-- bh-logo-bold2 -->" + "</head>");
      changed = true;
    }
  }
  // bh-logo-v257: sharper 1024 nav mark (vectorized current art, same framing)
  if (!html.includes("bh-logo-v257")) {
    const nextLogo257 = html
      .replace(/assets\/logo-mark-nav\.png\?v=[^"'\s>]+/g, "assets/logo-mark-nav.png?v=v257");
    if (nextLogo257 !== html) { html = nextLogo257; changed = true; }
    if (html.includes("</head>")) {
      html = html.replace("</head>", "<!-- bh-logo-v257 -->" + "</head>");
      changed = true;
    }
  }
  // bh-scrub-test-artifacts-v1: remove TEST badge/label and related test UI from public pages
  {
    var scrubCss = "<style id=\"bh-scrub-test-artifacts-v1\">.photo-set-label,#photo-set-label,[class*=\"photo-set-label\"],.test-badge,[data-test-badge]{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;position:absolute!important;left:-9999px!important;width:0!important;height:0!important;overflow:hidden!important;font-size:0!important}</style>";
    if (!html.includes("bh-scrub-test-artifacts-v1") && html.includes("</head>")) {
      html = html.replace("</head>", scrubCss + "</head>");
      changed = true;
    }
    (function () {
      var open = "<style id=\"photo-set-label-css\">";
      var close = "</style>";
      var g = 0;
      while (g++ < 5) {
        var i = html.indexOf(open);
        if (i < 0) break;
        var c = html.indexOf(close, i);
        if (c < 0) break;
        html = html.slice(0, i) + html.slice(c + close.length);
        changed = true;
      }
    })();
    (function () {
      var open = "<div class=\"photo-set-label\"";
      var close = "</div>";
      var g = 0;
      while (g++ < 8) {
        var i = html.indexOf(open);
        if (i < 0) break;
        var c = html.indexOf(close, i);
        if (c < 0) break;
        html = html.slice(0, i) + html.slice(c + close.length);
        changed = true;
      }
    })();
    var before = html;
    html = html.split("Base Camp Photos · TEST").join("");
    html = html.split("Basecamp Photos · TEST").join("");
    html = html.split("Basecamp Photos test").join("");
    html = html.split("Base Camp Photos test").join("");
    (function () {
      var tOpen = "<title>";
      var tClose = "</title>";
      var ti = html.indexOf(tOpen);
      if (ti < 0) return;
      var tc = html.indexOf(tClose, ti);
      if (tc < 0) return;
      var cur = html.slice(ti, tc + tClose.length);
      if (cur.indexOf("Base Camp Photos") >= 0 || cur.indexOf("TEST") >= 0) {
        html = html.slice(0, ti) + "<title>Breckhaus Aframe · Breckenridge Vacation Rental, Sleeps 8</title>" + html.slice(tc + tClose.length);
        changed = true;
      }
    })();
    if (html !== before) changed = true;
  }
  // bh-dedupe-hero-loc-v2: delete top hero .eyebrow Breckenridge; keep .hero-loc
  {
    const dedupeCss = "<style id=\"bh-dedupe-hero-loc-v2\">.hero-inner > p.eyebrow,.hero p.eyebrow{display:none!important;visibility:hidden!important;height:0!important;max-height:0!important;margin:0!important;padding:0!important;overflow:hidden!important;font-size:0!important;line-height:0!important;position:absolute!important;left:-9999px!important;width:1px!important}</style>";
    if (!html.includes("bh-dedupe-hero-loc-v2") && html.includes("</head>")) {
      html = html.replace("</head>", dedupeCss + "</head>");
      changed = true;
    }
    var _before = html;
    html = html.split("<p class=\"eyebrow\">Breckenridge, Colorado</p>").join("");
    html = html.split("<p class=\"eyebrow\">BRECKENRIDGE, COLORADO</p>").join("");
        (function () {
      var needle = "<p class=\"eyebrow\">";
      var closeTag = "</p>";
      var g = 0;
      while (g++ < 10) {
        var i = html.indexOf(needle);
        if (i < 0) break;
        var c = html.indexOf(closeTag, i);
        if (c < 0) break;
        var chunk = html.slice(i, c + closeTag.length);
        if (chunk.toLowerCase().indexOf("breckenridge") >= 0) {
          html = html.slice(0, i) + html.slice(c + closeTag.length);
          changed = true;
        } else break;
      }
    })();
    // Keep .nav-eyebrow in the header lockup — only hero copy is deduped above.
    if (html !== _before) changed = true;
  }



  // bh-gallery-filter-pills-v2
  if (!html.includes("bh-gallery-filter-pills-v2")) {
    var pillCss = "<style id=\"bh-gallery-filter-pills-v2\">.gallery-filters{gap:.8rem!important;padding-top:.85rem!important;padding-bottom:.85rem!important}.gallery-filter{padding:.72rem 1.28rem!important;border-radius:999px!important}</style>";
    if (html.includes("</head>")) { html = html.replace("</head>", pillCss + "</head>"); changed = true; }
  }

  // bh-favicon-v1: wire icon links to /favicon.ico
  if (!html.includes("bh-favicon-v1")) {
    var favLinks = '<link rel="icon" href="/favicon.ico" sizes="any" /><link rel="icon" type="image/png" href="/assets/logo-mark-nav.png?v=v257" /><link rel="apple-touch-icon" href="/assets/logo-mark-nav.png?v=v257" /><!-- bh-favicon-v1 -->';
    if (html.includes("</head>")) {
      html = html.replace(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]*>/gi, "");
      html = html.replace(/<link[^>]+rel=["']apple-touch-icon["'][^>]*>/gi, "");
      html = html.replace("</head>", favLinks + "</head>");
      changed = true;
    }
  }

  // bh-header-brand-v3: BRECKENRIDGE, COLORADO above Breckhaus A-frame (locked casing)
  if (!html.includes("bh-header-brand-v3")) {
    html = html.replace(/<style id="bh-header-brand-v\d+"[\s\S]*?<\/style>/g, "");
    var brandCss = "<style id=\"bh-header-brand-v3\">.nav-logo.has-mark{display:flex!important;flex-direction:row!important;align-items:center!important;gap:.85rem!important;max-width:none!important}.nav-logo .nav-text{display:flex!important;flex-direction:column!important;justify-content:center!important;align-items:flex-start!important;gap:.18rem!important}.nav-logo .nav-eyebrow{display:block!important;font-family:\"Jost\",system-ui,sans-serif!important;font-size:.78rem!important;font-weight:500!important;letter-spacing:.18em!important;text-transform:uppercase!important;color:rgba(201,169,110,.92)!important;line-height:1.1!important}.nav-logo .nav-wordmark{display:block!important;font-family:\"Playfair Display\",\"Cormorant Garamond\",serif!important;font-size:clamp(1.15rem,1.6vw,1.85rem)!important;font-weight:400!important;color:var(--white,#f2ede4)!important;line-height:1.05!important;white-space:nowrap!important;text-transform:none!important}.nav-logo .nav-wordmark em{font-style:italic!important;text-transform:none!important}@media (max-width:767px){.nav-logo .nav-eyebrow{font-size:.52rem!important;letter-spacing:.14em!important}.nav-logo .nav-wordmark{font-size:1.05rem!important}}@media (min-width:1024px){.nav-links{gap:1.2rem!important;justify-content:flex-end!important;margin-left:auto!important}}</style>";
    if (html.includes("</head>")) { html = html.replace("</head>", brandCss + "</head>"); changed = true; }
    html = html.replace(/(<span class="nav-wordmark">)[\s\S]*?(<\/span>)/i, '$1Breckhaus <em>A-frame</em>$2');
    if (/<span class="nav-eyebrow">/i.test(html)) {
      html = html.replace(/<span class="nav-eyebrow">[\s\S]*?<\/span>/i, '<span class="nav-eyebrow">BRECKENRIDGE, COLORADO</span>');
      changed = true;
    } else if (/<span class="nav-text">/i.test(html)) {
      html = html.replace(
        /<span class="nav-text">(\s*)<span class="nav-wordmark">/,
        '<span class="nav-text">$1<span class="nav-eyebrow">BRECKENRIDGE, COLORADO</span>$1<span class="nav-wordmark">'
      );
      changed = true;
    }
  }

  // bh-nav-logo-only-v1: hide BRECKENRIDGE / Breckhaus A-frame text beside logo (all breakpoints)
  if (!html.includes("bh-nav-logo-only-v1")) {
    html = html.replace(/<style id="bh-nav-logo-only-v\d+"[\s\S]*?<\/style>/g, "");
    var logoOnlyCss = "<style id=\"bh-nav-logo-only-v1\">"
      + ".nav-logo .nav-text,.nav-logo.has-mark .nav-text,"
      + ".nav-logo .nav-eyebrow,.nav-logo.has-mark .nav-eyebrow,"
      + ".nav-logo .nav-wordmark,.nav-logo.has-mark .nav-wordmark,"
      + ".nav-logo .nav-wordmark em{display:none!important;visibility:hidden!important;opacity:0!important;width:0!important;height:0!important;max-width:0!important;max-height:0!important;margin:0!important;padding:0!important;overflow:hidden!important;font-size:0!important;line-height:0!important;position:absolute!important;left:-10000px!important;clip:rect(0,0,0,0)!important;pointer-events:none!important}"
      + ".nav-logo.has-mark{gap:0!important}"
      + "</style>";
    if (html.includes("</head>")) { html = html.replace("</head>", logoOnlyCss + "</head>"); changed = true; }
    changed = true;
  }



  // bh-hero-debrand-v3: remove hero Breckhaus/Aframe + location; keep lede + facts; header brand stays
  if (!html.includes("bh-hero-debrand-v3")) {
    html = html.replace(/<style id="bh-hero-title-v\d+"[\s\S]*?<\/style>/g, "");
    html = html.replace(/<style id="bh-hero-debrand-v\d+"[\s\S]*?<\/style>/g, "");
    html = html.replace(/<style id="bh-hero-loc-v\d+"[\s\S]*?<\/style>/g, "");
    html = html.replace(/<style id="bh-loc-color-v\d+"[\s\S]*?<\/style>/g, "");
    var heroDebrandCss = "<style id=\"bh-hero-loc-v2\"></style><style id=\"bh-hero-debrand-v3\">"
      + ".hero-inner>h1,.hero h1,.hero-inner>.hero-loc,.hero-inner>p.eyebrow,.hero p.eyebrow,.hero-loc{display:none!important;visibility:hidden!important;height:0!important;max-height:0!important;margin:0!important;padding:0!important;overflow:hidden!important;font-size:0!important;line-height:0!important;position:absolute!important;left:-9999px!important;width:1px!important;clip:rect(0,0,0,0)!important}"
      + ".hero-inner>.hero-facts,.hero .hero-facts,.hero-facts{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}"
      + ".nav-logo .nav-wordmark{font-family:\"Playfair Display\",\"Cormorant Garamond\",serif!important;font-weight:400!important;letter-spacing:-.02em!important;word-spacing:-.1em!important}"
      + ".nav-logo .nav-wordmark em{font-style:italic!important;margin-left:.06em!important}"
      + "</style>";
    if (html.includes("</head>")) {
      html = html.replace("</head>", heroDebrandCss + "</head>");
      changed = true;
    }
    html = html.replace(/<p class=\"hero-loc\">[\s\S]*?<\/p>/gi, "");
    html = html.replace(/<p class=\"eyebrow\">\s*Breckenridge,\s*Colorado\s*<\/p>/gi, "");
    html = html.replace(/<p class=\"eyebrow\">\s*BRECKENRIDGE,\s*COLORADO\s*<\/p>/gi, "");
    (function () {
      var inner = html.indexOf('<div class="hero-inner">');
      if (inner < 0) return;
      var h1 = html.indexOf("<h1", inner);
      if (h1 < 0) return;
      var close = html.indexOf("</h1>", h1);
      if (close < 0) return;
      var lede = html.indexOf('class="hero-lede"', inner);
      if (lede > 0 && h1 > lede) return;
      html = html.slice(0, h1) + html.slice(close + 5);
      changed = true;
    })();
    changed = true;
  }


  // bh-discovery-v1 canonical for live hosts
  {
    const c = ensureCanonical(html, request);
    html = c.html;
    if (c.changed) changed = true;
  }






  // bh-nav-tabs-v30: mobile Basecamp/Photos/FAQ/Contact; Flyover in Basecamp dropdown
  if (!html.includes('bh-nav-tabs-v30')) {
    html = html.replace(/<style id="bh-nav-tabs-v\d+"[\s\S]*?<\/style>/g, '');
    html = html.replace(/<div class="bh-mnav" id="bh-mnav"[\s\S]*?<\/div>(?=\s*<a class="btn-gold" id="header-reserve")/g, '');

    html = html.replace(/<a href="#house">The house<\/a>/g, '<a href="#house">The House</a>');
    html = html.replace(/<a href="#house">House<\/a>/g, '<a href="#house">The House</a>');

    const navTabsCss = "<style id=\"bh-nav-tabs-v30\">\n@media (min-width: 1024px) {\n  nav { display: flex !important; align-items: center !important; gap: 2rem !important; }\n  .nav-logo { flex: 0 0 auto !important; }\n  .nav-end {\n    flex: 1 1 auto !important;\n    min-width: 0 !important;\n    display: flex !important;\n    align-items: center !important;\n    justify-content: space-between !important;\n    gap: 0 !important;\n    padding-left: 0.35rem !important;\n  }\n  .nav-links { display: contents !important; }\n  .nav-links > li { display: contents !important; }\n  .nav-links a { white-space: nowrap !important; flex: 0 0 auto !important; }\n    .nav-more { display: none !important; }\n  .bh-mnav { display: none !important; }\n  #header-reserve, nav .nav-end > a.btn-gold {\n    flex: 0 0 auto !important;\n    margin-left: 0 !important;\n  }\n}\n@media (min-width: 768px) and (max-width: 1023px) {\n  nav { display: flex !important; align-items: center !important; gap: 1rem !important; }\n  .nav-logo { flex: 0 0 auto !important; transform: none !important; }\n  .nav-links { display: none !important; }\n  .nav-more { display: none !important; }\n  .nav-end {\n    flex: 1 1 auto !important;\n    min-width: 0 !important;\n    display: flex !important;\n    align-items: center !important;\n    justify-content: space-between !important;\n    gap: 0 !important;\n  }\n  .bh-mnav { display: contents !important; }\n  .bh-mnav-house {\n    position: relative !important;\n    display: flex !important;\n    align-items: center !important;\n    flex: 0 0 auto !important;\n    width: auto !important;\n    min-width: 0 !important;\n  }\n  .bh-mnav-house > summary {\n    list-style: none !important;\n    cursor: pointer !important;\n    display: inline-flex !important;\n    align-items: center !important;\n    justify-content: center !important;\n    font-size: 0.936rem !important;\n    letter-spacing: 0.1em !important;\n    text-transform: uppercase !important;\n    color: var(--cream-dim) !important;\n    white-space: nowrap !important;\n    padding: 0.2rem 0.1rem !important;\n  }\n  .bh-mnav-house > summary::-webkit-details-marker { display: none; }\n  .bh-mnav-house > summary::after {\n    content: \"\";\n    display: inline-block;\n    box-sizing: border-box;\n    width: 0;\n    height: 0;\n    margin-left: 0.32em;\n    border-style: solid;\n    border-width: 0.42em 0.34em 0 0.34em;\n    border-color: currentColor transparent transparent transparent;\n    font-size: 1.25em;\n    opacity: 1;\n    vertical-align: middle;\n    transform: translateY(0.08em);\n  }\n  .bh-mnav > a {\n    text-decoration: none !important;\n    font-size: 0.936rem !important;\n    letter-spacing: 0.1em !important;\n    text-transform: uppercase !important;\n    color: var(--cream-dim) !important;\n    white-space: nowrap !important;\n    padding: 0.2rem 0.1rem !important;\n    flex: 0 0 auto !important;\n  }\n  /* Tablet dropdown stays Layout / Reviews / The area / Seasons */\n  .bh-mnav-panel a[href=\"#flyover\"],\n  .bh-mnav-panel a[href=\"#gallery\"] { display: none !important; }\n  .bh-mnav-panel {\n    position: absolute !important;\n    top: calc(100% + 0.45rem) !important;\n    left: 0 !important;\n    right: auto !important;\n    min-width: 10.5rem !important;\n    background: rgba(13,13,11,0.96) !important;\n    border: 1px solid rgba(242,237,228,0.18) !important;\n    padding: 0.45rem 0 !important;\n    z-index: 300 !important;\n    display: flex !important;\n    flex-direction: column !important;\n  }\n  .bh-mnav-panel a {\n    display: block !important;\n    padding: 0.55rem 0.85rem !important;\n    text-decoration: none !important;\n    font-size: 0.72rem !important;\n    letter-spacing: 0.12em !important;\n    text-transform: uppercase !important;\n    color: var(--cream) !important;\n    white-space: nowrap !important;\n  }\n  #header-reserve, nav .nav-end > a.btn-gold {\n    flex: 0 0 auto !important;\n    margin-left: 0 !important;\n    font-size: 0.884rem !important;\n  }\n}\n@media (max-width: 767px) {\n  .nav-links { display: none !important; }\n  .nav-more { display: none !important; }\n  .nav-logo { max-width: 56px !important; }\n  .nav-mark, .nav-mark .site-logo, nav img.site-logo {\n    width: 56px !important;\n    max-width: 56px !important;\n    height: auto !important;\n    max-height: 52px !important;\n  }\n  .nav-end {\n    display: flex !important;\n    align-items: center !important;\n    gap: 0.45rem !important;\n    flex: 1 1 auto !important;\n    min-width: 0 !important;\n    justify-content: flex-start !important;\n    width: 100% !important;\n  }\n  .bh-mnav {\n    display: flex !important;\n    align-items: center !important;\n    justify-content: space-between !important;\n    gap: 0 !important;\n    flex: 1 1 auto !important;\n    min-width: 0 !important;\n    width: auto !important;\n    margin-left: 0.65rem !important;\n    margin-right: 0.2rem !important;\n  }\n  .bh-mnav > a {\n    text-decoration: none !important;\n    font-size: 0.7728rem !important;\n    letter-spacing: 0.05em !important;\n    text-transform: uppercase !important;\n    color: var(--cream-dim) !important;\n    white-space: nowrap !important;\n    padding: 0.2rem 0 !important;\n    text-align: center !important;\n    flex: 0 0 auto !important;\n    min-width: 0 !important;\n  }\n  /* Mobile: Flyover is in dropdown, not a top tab */\n  .bh-mnav > a[href=\"#flyover\"] { display: none !important; }\n  .bh-mnav-house {\n    position: relative !important;\n    display: inline-flex !important;\n    align-items: center !important;\n    justify-content: flex-start !important;\n    flex: 0 0 auto !important;\n    width: max-content !important;\n    max-width: none !important;\n    min-width: 0 !important;\n  }\n  .bh-mnav-house > summary {\n    list-style: none !important;\n    cursor: pointer !important;\n    display: inline-flex !important;\n    align-items: center !important;\n    justify-content: center !important;\n    font-size: 0.7728rem !important;\n    letter-spacing: 0.05em !important;\n    text-transform: uppercase !important;\n    color: var(--cream-dim) !important;\n    white-space: nowrap !important;\n    padding: 0.2rem 0.05rem !important;\n  }\n  .bh-mnav-house > summary::-webkit-details-marker { display: none; }\n  .bh-mnav-house > summary::after {\n    content: \"\";\n    display: inline-block;\n    box-sizing: border-box;\n    width: 0;\n    height: 0;\n    margin-left: 0.32em;\n    border-style: solid;\n    border-width: 0.42em 0.34em 0 0.34em;\n    border-color: currentColor transparent transparent transparent;\n    font-size: 1.25em;\n    opacity: 1;\n    vertical-align: middle;\n    transform: translateY(0.08em);\n  }\n  .bh-mnav-panel {\n    position: absolute !important;\n    top: calc(100% + 0.45rem) !important;\n    right: 0 !important;\n    min-width: 10.5rem !important;\n    background: rgba(13,13,11,0.96) !important;\n    border: 1px solid rgba(242,237,228,0.18) !important;\n    padding: 0.45rem 0 !important;\n    z-index: 300 !important;\n    display: flex !important;\n    flex-direction: column !important;\n  }\n  .bh-mnav-panel a {\n    display: block !important;\n    padding: 0.55rem 0.85rem !important;\n    text-decoration: none !important;\n    font-size: 0.7rem !important;\n    letter-spacing: 0.12em !important;\n    text-transform: uppercase !important;\n    color: var(--cream) !important;\n    white-space: nowrap !important;\n  }\n  #header-reserve, nav .nav-end > a.btn-gold { flex: 0 0 auto !important; }\n}\n\n@media (max-width: 1023px) {\n  .bh-mnav-house > .bh-mnav-panel { display: none !important; }\n  .bh-mnav-house:hover > .bh-mnav-panel,\n  .bh-mnav-house:focus-within > .bh-mnav-panel,\n  .bh-mnav-house[open] > .bh-mnav-panel { display: flex !important; }\n\n  .bh-mnav-house.bh-mnav-dismissed > .bh-mnav-panel { display: none !important; }\n  .bh-mnav-house.bh-mnav-dismissed:hover > .bh-mnav-panel { display: none !important; }}\n</style>";
    if (html.includes('</head>')) {
      html = html.replace('</head>', navTabsCss + '</head>');
      changed = true;
    }
    if (!html.includes('id="bh-mnav"') && html.includes('id="header-reserve"')) {
      html = html.replace(
        '<a class="btn-gold" id="header-reserve"',
        "<div class=\"bh-mnav\" id=\"bh-mnav\"><details class=\"bh-mnav-house\"><summary>The House</summary><div class=\"bh-mnav-panel\"><a href=\"#flyover\">Flyover</a><a href=\"#reviews\">Reviews</a><a href=\"#gallery\">Photos</a><a href=\"#area\">The area</a><a href=\"#seasons\">Seasons</a></div></details><a href=\"#flyover\">Flyover</a><a href=\"#gallery\">Photos</a><a href=\"#faq\">FAQ</a><a href=\"#contact\">Contact</a></div>" + '<a class="btn-gold" id="header-reserve"'
      );
      changed = true;
    }
  }

  const h = new Headers(res.headers);
  applyRobotsTag(h, request);
  // bh-remove-vicinity-map-v1: strip map if previously injected
  if (html.includes("vicinity-map-section") || html.includes("bh-vicinity-map")) {
    html = html.replace(/<style id="bh-vicinity-map-v\d+">[\s\S]*?<\/style>/g, "");
    html = html.replace(/<section[^>]*id="vicinity-map-section"[\s\S]*?<\/section>/i, "");
    html = html.replace(/<link[^>]*maplibre-gl[^>]*>/gi, "");
    html = html.replace(/<script[^>]*maplibre-gl[^>]*>\s*<\/script>/gi, "");
    html = html.replace(/<script id="bh-vicinity-map-js"[\s\S]*?<\/script>/gi, "");
    changed = true;
  }
  // bh-mnav-outside-dismiss-v1: close Basecamp dropdown on outside tap (mobile/tablet)
  if (!html.includes("bh-mnav-outside-dismiss-v1")) {
    var dismissJs = "<script id=\"bh-mnav-outside-dismiss-v1\">(function(){function mq(){return window.matchMedia(\"(max-width: 1023px)\").matches;}function houses(){return Array.prototype.slice.call(document.querySelectorAll(\".bh-mnav-house\"));}function dismiss(h){if(!h)return;h.removeAttribute(\"open\");h.classList.add(\"bh-mnav-dismissed\");var s=h.querySelector(\"summary\");if(s)s.blur();}function clearDismiss(h){if(h)h.classList.remove(\"bh-mnav-dismissed\");}document.addEventListener(\"pointerdown\",function(e){  if(!mq())return;  houses().forEach(function(h){    if(h.contains(e.target)){clearDismiss(h);return;}    dismiss(h);  });},true);document.addEventListener(\"pointerenter\",function(e){  if(!mq())return;  var h=e.target&&e.target.closest&&e.target.closest(\".bh-mnav-house\");  if(h)clearDismiss(h);},true);document.addEventListener(\"focusin\",function(e){  if(!mq())return;  var h=e.target&&e.target.closest&&e.target.closest(\".bh-mnav-house\");  if(h)clearDismiss(h);},true);})();</script>";
    if (html.includes("</body>")) {
      html = html.replace("</body>", dismissJs + "</body>");
      changed = true;
    }
  }
  // bh-area-around-v3: area mosaic 3-across; reset .s4 grid-column span
  if (!html.includes("bh-area-around-v3")) {
    var areaCss = "<style id=\"bh-area-around-v3\">/* Area activity mosaic: 3-across; reset .s4 span */.around .shot .lbl,.around .bh-area-mosaic .shot .lbl{display:block!important;position:absolute!important;left:0!important;right:0!important;bottom:0!important;padding:1.4rem .7rem .55rem!important;background:linear-gradient(to top,rgba(13,13,11,.82),transparent)!important;font-size:.7rem!important;letter-spacing:.12em!important;text-transform:uppercase!important;color:var(--cream,#F2EDE4)!important;text-align:left!important;pointer-events:none!important;z-index:2!important;}.around .bh-area-mosaic{display:grid!important;grid-template-columns:1fr 1fr!important;gap:6px!important;grid-auto-rows:auto!important;}@media (min-width:768px){.around .bh-area-mosaic{grid-template-columns:repeat(3,minmax(0,1fr))!important;}}.around .bh-area-mosaic > .shot,.around .bh-area-mosaic > .shot.s4,.around .bh-area-mosaic > .shot.s6,.around .bh-area-mosaic > .shot.wide{position:relative!important;grid-column:auto!important;grid-row:auto!important;width:100%!important;height:auto!important;min-height:0!important;max-width:none!important;aspect-ratio:3/2!important;align-self:stretch!important;}.around .bh-area-mosaic > .shot img{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;min-height:0!important;max-height:none!important;aspect-ratio:auto!important;object-fit:cover!important;}</style>";
    var areaMosaic = "<div class=\"mosaic bh-area-mosaic\"><button data-slot=\"around-02-dog-sledding\" class=\"shot s4\" type=\"button\" data-full=\"img/around-dog-sledding.jpg?v=area6\" data-cap=\"Dog sledding\"><img src=\"img/around-dog-sledding.jpg?v=area6\" alt=\"Dog sled team running through the snow\" width=\"1439\" height=\"960\" loading=\"eager\" decoding=\"async\" /><span class=\"lbl\">Dog sledding</span></button><button data-slot=\"around-04-skiing\" class=\"shot s4\" type=\"button\" data-full=\"img/area-skier.jpg?v=area1\" data-cap=\"Skiing\"><img src=\"img/area-skier.jpg?v=area1\" alt=\"Skier carving powder above a mountain valley\" width=\"720\" height=\"479\" loading=\"eager\" decoding=\"async\" /><span class=\"lbl\">Skiing</span></button><button data-slot=\"around-09-snowboarding\" class=\"shot s4\" type=\"button\" data-full=\"img/around-ski-snowboard.jpg?v=bc1\" data-cap=\"Snowboarding\"><img src=\"img/around-ski-snowboard.jpg?v=bc1\" alt=\"Skier and snowboarder on an open snowy slope\" width=\"1440\" height=\"960\" loading=\"eager\" decoding=\"async\" /><span class=\"lbl\">Snowboarding</span></button><button data-slot=\"around-07-troll\" class=\"shot s4\" type=\"button\" data-full=\"img/area-troll.jpg?v=area1\" data-cap=\"Isak the troll\"><img src=\"img/area-troll.jpg?v=area1\" alt=\"Wooden troll sculpture in the forest near Breckenridge\" width=\"720\" height=\"479\" loading=\"eager\" decoding=\"async\" /><span class=\"lbl\">Isak the troll</span></button><button data-slot=\"around-08-cyclists\" class=\"shot s4\" type=\"button\" data-full=\"img/area-cyclists.jpg?v=area1\" data-cap=\"Biking\"><img src=\"img/area-cyclists.jpg?v=area1\" alt=\"Four cyclists on a paved mountain trail\" width=\"720\" height=\"479\" loading=\"eager\" decoding=\"async\" /><span class=\"lbl\">Biking</span></button><button data-slot=\"around-06-snow-sculpture\" class=\"shot s4\" type=\"button\" data-full=\"img/area-snow-sculpture.jpg?v=area1\" data-cap=\"Viking ice sculpture\"><img src=\"img/area-snow-sculpture.jpg?v=area1\" alt=\"Night snow sculpture of a horned figure with a dog\" width=\"720\" height=\"613\" loading=\"eager\" decoding=\"async\" /><span class=\"lbl\">Viking ice sculpture</span></button></div>";
    if (html.includes("</head>")) {
      html = html.replace("</head>", areaCss + "</head>");
      changed = true;
    }
    (function () {
      var aroundIdx = html.indexOf("class=\"around\"");
      if (aroundIdx < 0) aroundIdx = html.indexOf("class='around'");
      if (aroundIdx < 0) return;
      var mosaicIdx = html.indexOf("class=\"mosaic\"", aroundIdx);
      if (mosaicIdx < 0) return;
      var mosaicStart = html.lastIndexOf("<div", mosaicIdx);
      // find matching close for this mosaic div via simple scan
      var i = mosaicStart;
      var depth = 0;
      var end = -1;
      while (i < html.length) {
        var nextOpen = html.indexOf("<div", i);
        var nextClose = html.indexOf("</div>", i);
        if (nextClose < 0) break;
        if (nextOpen >= 0 && nextOpen < nextClose) { depth++; i = nextOpen + 4; continue; }
        depth--; i = nextClose + 6;
        if (depth === 0) { end = i; break; }
      }
      if (end < 0) return;
      html = html.slice(0, mosaicStart) + areaMosaic + html.slice(end);
      changed = true;
    })();
  }







  // bh-wx-7day-v3: Open-Meteo trigger + dropdown; tablet visible; mobile panel scroll
  if (!html.includes("bh-wx-7day-v3")) {
    html = html.replace(/<style id="bh-wx-7day-v\d+"[\s\S]*?<\/style>/g, "");
    html = html.replace(/<script id="bh-wx-7day-js"[\s\S]*?<\/script>/g, "");
    html = html.replace(/<div class="bh-wx"[\s\S]*?<\/div>(?=\s*<a class="btn-gold" id="header-reserve")/g, "");
    var wxCss = "<style id=\"bh-wx-7day-v3\">.bh-wx{position:relative;flex:0 0 auto;display:inline-flex;align-items:center;margin:0 .35rem;z-index:320;visibility:visible;opacity:1}\n.bh-wx-trigger{appearance:none;border:1px solid rgba(242,237,228,.22);background:rgba(20,20,16,.55);color:var(--cream,#F2EDE4);cursor:pointer;display:inline-flex;align-items:center;gap:.4rem;padding:.35rem .55rem;border-radius:999px;font-family:Jost,system-ui,sans-serif;line-height:1;min-height:2rem;flex:0 0 auto;white-space:nowrap}\n.bh-wx-trigger:focus-visible{outline:2px solid rgba(201,169,110,.7);outline-offset:2px}\n.bh-wx-trigger .bh-wx-icon,.bh-wx-day .bh-wx-icon{width:1rem;height:1rem;display:inline-flex;flex:0 0 auto}\n.bh-wx-trigger .bh-wx-icon svg,.bh-wx-day .bh-wx-icon svg{width:100%;height:100%;display:block;fill:rgba(201,169,110,.95);stroke:rgba(201,169,110,.95)}\n.bh-wx-trigger .bh-wx-hi{font-size:.72rem;font-weight:500;letter-spacing:.03em}\n.bh-wx-trigger .bh-wx-date{font-size:.58rem;font-weight:500;letter-spacing:.04em;color:rgba(242,237,228,.78);white-space:nowrap}\n.bh-wx-trigger .bh-wx-caret{width:.45rem;height:.45rem;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(45deg);opacity:.7;margin-left:.1rem;transition:transform .18s ease}\n.bh-wx[open] .bh-wx-caret{transform:rotate(225deg);margin-top:.2rem}\n.bh-wx-panel{display:none;position:absolute;top:calc(100% + 10px);right:0;left:auto;min-width:15.5rem;max-height:min(70vh,24rem);overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:.55rem;background:rgba(13,13,11,.97);border:1px solid rgba(242,237,228,.2);border-radius:12px;box-shadow:0 14px 40px rgba(0,0,0,.45);z-index:400}\n.bh-wx[open] .bh-wx-panel{display:flex;flex-direction:column;gap:.15rem}\n.bh-wx-panel-title{font-family:Jost,system-ui,sans-serif;font-size:.58rem;letter-spacing:.14em;text-transform:uppercase;color:rgba(201,169,110,.9);padding:.2rem .35rem .45rem;flex:0 0 auto}\n.bh-wx-days{display:flex;flex-direction:column;gap:.15rem}\n.bh-wx-day{display:grid;grid-template-columns:minmax(0,1fr) auto auto auto;align-items:center;gap:.45rem;padding:.42rem .4rem;border-radius:8px;color:var(--cream,#F2EDE4);font-family:Jost,system-ui,sans-serif}\n.bh-wx-day:hover{background:rgba(242,237,228,.06)}\n.bh-wx-day .bh-wx-dlabel{font-size:.68rem;letter-spacing:.03em;min-width:0}\n.bh-wx-day .bh-wx-icon{width:.95rem;height:.95rem}\n.bh-wx-day .bh-wx-hi{font-size:.7rem;font-weight:500}\n.bh-wx-day .bh-wx-lo{font-size:.66rem;color:rgba(242,237,228,.62)}\n/* Keep weather + Reserve visible; let nav cluster shrink */\n@media (max-width:1023px){\n  header,nav,.nav-end{overflow:visible!important}\n  .nav-end{gap:.35rem!important;min-width:0!important}\n  .bh-mnav,.bh-mnav-house,.nav-more{min-width:0!important;flex:1 1 auto!important}\n  .bh-wx{display:inline-flex!important;visibility:visible!important;opacity:1!important;flex:0 0 auto!important;margin-left:.2rem!important;margin-right:.2rem!important;order:2}\n  #header-reserve,nav .nav-end>a.btn-gold{display:inline-flex!important;visibility:visible!important;flex:0 0 auto!important;order:3;margin-left:0!important}\n  .bh-wx-trigger{padding:.3rem .48rem;gap:.32rem}\n  .bh-wx-trigger .bh-wx-date{font-size:.52rem}\n  .bh-wx-panel{min-width:14.5rem;max-height:min(65vh,22rem)}\n}\n@media (max-width:767px){\n  .bh-wx{margin-left:auto!important}\n  .bh-wx-trigger .bh-wx-date{max-width:4.8rem;overflow:hidden;text-overflow:ellipsis}\n  .bh-wx-panel{position:absolute;top:calc(100% + 8px);right:0;left:auto;width:min(18rem,calc(100vw - 24px));min-width:0;max-height:min(60vh,20rem)}\n}</style>";
    var wxHtml = "<div class=\"bh-wx\" id=\"bh-wx\" data-state=\"loading\"><button type=\"button\" class=\"bh-wx-trigger\" id=\"bh-wx-trigger\" aria-expanded=\"false\" aria-controls=\"bh-wx-panel\" aria-label=\"Breckenridge 7-day forecast\"><span class=\"bh-wx-icon\" aria-hidden=\"true\"></span><span class=\"bh-wx-hi\">\u2014</span><span class=\"bh-wx-date\">\u2026</span><span class=\"bh-wx-caret\" aria-hidden=\"true\"></span></button><div class=\"bh-wx-panel\" id=\"bh-wx-panel\" role=\"region\" aria-label=\"Seven day forecast\" hidden><div class=\"bh-wx-panel-title\">Breckenridge \u00b7 7-day</div><div class=\"bh-wx-days\" id=\"bh-wx-days\"></div></div></div>";
    var wxJs = "<script id=\"bh-wx-7day-js\">(function () {\n  var root = document.getElementById(\"bh-wx\");\n  var btn = document.getElementById(\"bh-wx-trigger\");\n  var panel = document.getElementById(\"bh-wx-panel\");\n  var daysEl = document.getElementById(\"bh-wx-days\");\n  if (!root || !btn || !panel || !daysEl) return;\n  var DAYS = [\"Sun\", \"Mon\", \"Tue\", \"Wed\", \"Thu\", \"Fri\", \"Sat\"];\n  function pad(n) { return n < 10 ? \"0\" + n : String(n); }\n  function label(iso) {\n    var p = iso.split(\"-\");\n    var m = +p[1], d = +p[2];\n    var dt = new Date(Date.UTC(+p[0], m - 1, d, 12));\n    return DAYS[dt.getUTCDay()] + \" \" + pad(m) + \"/\" + pad(d);\n  }\n  function icon(code) {\n    var c = +code;\n    if (c === 0) return '<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"4\" fill=\"currentColor\"/><g stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" fill=\"none\"><path d=\"M12 2v2.2M12 19.8V22M2 12h2.2M19.8 12H22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6\"/></g></svg>';\n    if (c === 1 || c === 2) return '<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><circle cx=\"9\" cy=\"10\" r=\"3.2\" fill=\"currentColor\"/><path fill=\"currentColor\" d=\"M8 16.5h9.2a3.3 3.3 0 0 0 .2-6.6 4.4 4.4 0 0 0-8.3-1.5A3.6 3.6 0 0 0 8 16.5z\" opacity=\".9\"/></svg>';\n    if (c >= 71 && c <= 77 || c >= 85 && c <= 86) return '<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M7 11.8h10a3.2 3.2 0 0 0 .2-6.4 4.3 4.3 0 0 0-8.2-1.4A3.5 3.5 0 0 0 7 11.8z\"/><g stroke=\"currentColor\" stroke-width=\"1.4\" stroke-linecap=\"round\" fill=\"none\"><path d=\"M9 14l.7.7L9 15.4l-.7-.7zm3.2.4l.7.7-.7.7-.7-.7zm3-.3l.7.7-.7.7-.7-.7z\"/></g></svg>';\n    if (c >= 51 && c <= 67 || c >= 80 && c <= 82) return '<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M7 12.5h10a3.2 3.2 0 0 0 .2-6.4 4.3 4.3 0 0 0-8.2-1.4A3.5 3.5 0 0 0 7 12.5z\"/><g stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" fill=\"none\"><path d=\"M9 14.5v3M12 15v3.2M15 14.5v3\"/></g></svg>';\n    if (c >= 95) return '<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M7 12h10a3.2 3.2 0 0 0 .2-6.4 4.3 4.3 0 0 0-8.2-1.4A3.5 3.5 0 0 0 7 12z\"/><path fill=\"currentColor\" d=\"M11.2 13.2h2.1l-1.5 3.1h1.5L10.8 21l1.1-4.2H10z\"/></svg>';\n    return '<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M7.2 17h10a3.6 3.6 0 0 0 .25-7.2 4.8 4.8 0 0 0-9.1-1.6A3.9 3.9 0 0 0 7.2 17z\"/></svg>';\n  }\n  function setOpen(on) {\n    if (on) { root.setAttribute(\"open\", \"\"); btn.setAttribute(\"aria-expanded\", \"true\"); panel.hidden = false; panel.scrollTop = 0; }\n    else { root.removeAttribute(\"open\"); btn.setAttribute(\"aria-expanded\", \"false\"); panel.hidden = true; }\n  }\n  btn.addEventListener(\"click\", function (e) { e.preventDefault(); e.stopPropagation(); setOpen(!root.hasAttribute(\"open\")); });\n  document.addEventListener(\"pointerdown\", function (e) { if (!root.contains(e.target)) setOpen(false); }, true);\n  document.addEventListener(\"keydown\", function (e) { if (e.key === \"Escape\") setOpen(false); });\n  var url = \"https://api.open-meteo.com/v1/forecast?latitude=39.4817&longitude=-106.0384&daily=weather_code,temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=America%2FDenver&forecast_days=7\";\n  fetch(url, { credentials: \"omit\" }).then(function (r) {\n    if (!r.ok) throw new Error(\"wx\");\n    return r.json();\n  }).then(function (data) {\n    var d = data && data.daily;\n    if (!d || !d.time || !d.time.length) throw new Error(\"shape\");\n    btn.querySelector(\".bh-wx-icon\").innerHTML = icon(d.weather_code[0]);\n    btn.querySelector(\".bh-wx-hi\").textContent = Math.round(d.temperature_2m_max[0]) + \"\u00b0\";\n    btn.querySelector(\".bh-wx-date\").textContent = label(d.time[0]);\n    var html = \"\";\n    for (var i = 0; i < Math.min(7, d.time.length); i++) {\n      html += '<div class=\"bh-wx-day\"><span class=\"bh-wx-dlabel\">' + label(d.time[i]) + '</span><span class=\"bh-wx-icon\" aria-hidden=\"true\">' + icon(d.weather_code[i]) + '</span><span class=\"bh-wx-hi\">' + Math.round(d.temperature_2m_max[i]) + '\u00b0</span><span class=\"bh-wx-lo\">' + Math.round(d.temperature_2m_min[i]) + '\u00b0</span></div>';\n    }\n    daysEl.innerHTML = html;\n    root.setAttribute(\"data-state\", \"ready\");\n  }).catch(function () {\n    root.setAttribute(\"data-state\", \"error\");\n    btn.querySelector(\".bh-wx-date\").textContent = \"Forecast\";\n  });\n})();</script>";
    if (html.includes("</head>")) { html = html.replace("</head>", wxCss + "</head>"); changed = true; }
    if (html.includes('id="header-reserve"') && !html.includes('id="bh-wx"')) {
      html = html.replace(/(<a class="btn-gold" id="header-reserve")/, wxHtml + "$1");
      changed = true;
    }
    if (html.includes("</body>")) { html = html.replace("</body>", wxJs + "</body>"); changed = true; }
  }


  // bh-wx-7day-fix-v1: force tablet visibility + scrollable 7-day panel
  if (!html.includes("bh-wx-7day-fix-v1")) {
    var wxFixCss = "<style id=\"bh-wx-7day-fix-v1\">.bh-wx{display:inline-flex!important;visibility:visible!important;opacity:1!important;flex:0 0 auto!important;position:relative!important;z-index:320!important}.bh-wx-panel{position:absolute!important;top:calc(100% + 10px)!important;right:0!important;left:auto!important;max-height:min(70vh,24rem)!important;overflow-y:auto!important;-webkit-overflow-scrolling:touch!important;overscroll-behavior:contain!important}.bh-wx-days{display:flex!important;flex-direction:column!important;gap:.15rem!important}@media (max-width:1023px){header,nav,.nav-end{overflow:visible!important}.nav-end{gap:.35rem!important;min-width:0!important}.bh-mnav,.bh-mnav-house,.nav-more{min-width:0!important;flex:1 1 auto!important}.bh-wx{display:inline-flex!important;visibility:visible!important;opacity:1!important;flex:0 0 auto!important;margin-left:.2rem!important;margin-right:.2rem!important}#header-reserve,nav .nav-end>a.btn-gold{display:inline-flex!important;visibility:visible!important;flex:0 0 auto!important;margin-left:0!important}.bh-wx-panel{max-height:min(65vh,22rem)!important}}@media (max-width:767px){.bh-wx{margin-left:auto!important}.bh-wx-panel{position:absolute!important;top:calc(100% + 8px)!important;right:0!important;left:auto!important;width:min(18rem,calc(100vw - 24px))!important;min-width:0!important;max-height:min(60vh,20rem)!important}}</style>";
    if (html.includes("</head>")) { html = html.replace("</head>", wxFixCss + "</head>"); changed = true; }
  }


  // bh-wx-trigger-nodate-v1: trigger shows icon + temp only; dates stay in dropdown
  if (!html.includes("bh-wx-trigger-nodate-v1")) {
    var wxNoDateCss = "<style id=\"bh-wx-trigger-nodate-v1\">.bh-wx-trigger .bh-wx-date{display:none!important;width:0!important;height:0!important;overflow:hidden!important;margin:0!important;padding:0!important}</style>";
    if (html.includes("</head>")) {
      html = html.replace("</head>", wxNoDateCss + "</head>");
      changed = true;
    }
    // Patch inline weather script if present: stop writing date onto trigger
    html = html.replace(
      /btn\.querySelector\(\"\.bh-wx-date\"\)\.textContent\s*=\s*label\(d\.time\[0\]\);/g,
      'var __bhWxDate=btn.querySelector(".bh-wx-date");if(__bhWxDate){__bhWxDate.textContent="";__bhWxDate.hidden=true;}'
    );
    html = html.replace(
      /btn\.querySelector\(\"\.bh-wx-date\"\)\.textContent\s*=\s*\"Forecast\";/g,
      'var __bhWxDate=btn.querySelector(".bh-wx-date");if(__bhWxDate){__bhWxDate.hidden=true;}'
    );
    changed = true;
  }




  // bh-wx-ev-panel-viewport-v1: keep weather/events dropdowns fully on-screen (tablet/mobile)
  if (!html.includes("bh-wx-ev-panel-viewport-v1")) {
    var panelViewCss = "<style id=\"bh-wx-ev-panel-viewport-v1\">"
      + "@media (max-width:1023px){.bh-wx-panel,.bh-ev-panel{position:fixed!important;top:calc(var(--nav-h,68px) + 8px)!important;left:8px!important;right:8px!important;width:auto!important;min-width:0!important;max-width:none!important}}"
      + "@media (max-width:767px){.bh-wx-panel,.bh-ev-panel{left:8px!important;right:8px!important;max-height:min(60vh,20rem)!important}}"
      + "</style>";
    if (html.includes("</head>")) { html = html.replace("</head>", panelViewCss + "</head>"); changed = true; }
  }

  // bh-wx-panel-tight-v1: mobile — close day/condition gap; shrink panel to content width
  if (!html.includes("bh-wx-panel-tight-v1")) {
    var wxTightCss = "<style id=\"bh-wx-panel-tight-v1\">"
      + "@media (max-width:767px){"
      + ".bh-wx-panel{width:max-content!important;max-width:calc(100vw - 16px)!important;min-width:0!important;left:auto!important;right:8px!important;padding:.42rem .45rem!important}"
      + ".bh-wx-day{grid-template-columns:auto auto auto auto!important;gap:.25rem .32rem!important;padding:.36rem .28rem!important;justify-content:start!important}"
      + ".bh-wx-day .bh-wx-dlabel{white-space:nowrap!important}"
      + "}"
      + "</style>";
    if (html.includes("</head>")) { html = html.replace("</head>", wxTightCss + "</head>"); changed = true; }
  }


  // bh-local-events-v3: Local Events left of weather; click-throughs; omit expired; static shortlist (show 6-8)
  if (!html.includes("bh-local-events-v3")) {
    html = html.replace(/<style id="bh-local-events-v\d+"[\s\S]*?<\/style>/g, "");
    html = html.replace(/<script id="bh-local-events-js"[\s\S]*?<\/script>/g, "");
    html = html.replace(/<div class="bh-ev"[\s\S]*?<\/div>(?=\s*(?:<div class="bh-wx"|<a class="btn-gold" id="header-reserve"))/g, "");
    var evCss = "<style id=\"bh-local-events-v3\">.bh-ev{position:relative;flex:0 0 auto;display:inline-flex;align-items:center;margin:0 .2rem 0 .35rem;z-index:321;visibility:visible;opacity:1}\n.bh-ev-trigger{appearance:none;border:1px solid rgba(242,237,228,.22);background:rgba(20,20,16,.55);color:var(--cream,#F2EDE4);cursor:pointer;display:inline-flex;align-items:center;gap:.4rem;padding:.35rem .6rem;border-radius:999px;font-family:Jost,system-ui,sans-serif;line-height:1;min-height:2.25rem;flex:0 0 auto;white-space:nowrap}\n.bh-ev-trigger:focus-visible{outline:2px solid rgba(201,169,110,.7);outline-offset:2px}\n.bh-ev-trigger .bh-ev-label{font-size:.68rem;font-weight:500;letter-spacing:.06em;text-transform:uppercase}\n.bh-ev-trigger .bh-ev-label-short{display:none}\n.bh-ev-trigger .bh-ev-caret{width:.45rem;height:.45rem;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(45deg);opacity:.7;margin-left:.05rem;transition:transform .18s ease}\n.bh-ev[open] .bh-ev-caret{transform:rotate(225deg);margin-top:.2rem}\n.bh-ev-panel{display:none;position:absolute;top:calc(100% + 10px);right:0;left:auto;width:min(22rem,calc(100vw - 24px));max-height:min(70vh,28rem);overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:.55rem;background:rgba(13,13,11,.97);border:1px solid rgba(242,237,228,.2);border-radius:12px;box-shadow:0 14px 40px rgba(0,0,0,.45);z-index:410}\n.bh-ev[open] .bh-ev-panel{display:flex;flex-direction:column;gap:.2rem}\n.bh-ev-panel-title{font-family:Jost,system-ui,sans-serif;font-size:.58rem;letter-spacing:.14em;text-transform:uppercase;color:rgba(201,169,110,.9);padding:.2rem .35rem .45rem;flex:0 0 auto}\n.bh-ev-list{display:flex;flex-direction:column;gap:.15rem}\n.bh-ev-item{display:flex;flex-direction:column;gap:.18rem;padding:.55rem .5rem;border-radius:8px;color:var(--cream,#F2EDE4);text-decoration:none;font-family:Jost,system-ui,sans-serif;border:1px solid transparent}\n.bh-ev-item:hover,.bh-ev-item:focus-visible{background:rgba(242,237,228,.06);border-color:rgba(201,169,110,.28);outline:none}\n.bh-ev-item-name{font-size:.78rem;font-weight:500;letter-spacing:.02em;line-height:1.25;color:var(--cream,#F2EDE4)}\n.bh-ev-item-date{font-size:.62rem;letter-spacing:.04em;color:rgba(201,169,110,.92)}\n.bh-ev-item-desc{font-size:.66rem;line-height:1.35;color:rgba(242,237,228,.72)}\n.bh-ev-empty{margin:0;padding:.55rem .45rem;font-family:Jost,system-ui,sans-serif;font-size:.68rem;line-height:1.4;color:rgba(242,237,228,.72)}\n.bh-ev-empty a{color:rgba(201,169,110,.95)}\n@media (max-width:1023px){\n  header,nav,.nav-end{overflow:visible!important}\n  .bh-ev{display:inline-flex!important;visibility:visible!important;opacity:1!important;flex:0 0 auto!important;margin-left:.15rem!important;margin-right:.15rem!important;order:1}\n  .bh-wx{order:2}\n  #header-reserve,nav .nav-end>a.btn-gold{order:3}\n  .bh-ev-trigger{padding:.3rem .5rem;gap:.32rem}\n  .bh-ev-trigger .bh-ev-label{font-size:.6rem;letter-spacing:.05em}\n  .bh-ev-panel{max-height:min(65vh,26rem)}\n}\n@media (max-width:767px){\n  .bh-ev{margin-left:auto!important;margin-right:.18rem!important}\n  .bh-wx{margin-left:0!important;margin-right:.18rem!important}\n  .bh-ev-trigger{min-height:2.25rem;min-width:2.25rem;padding:.38rem .48rem}\n  .bh-ev-trigger .bh-ev-label-full{display:none}\n  .bh-ev-trigger .bh-ev-label-short{display:inline}\n  .bh-ev-panel{position:absolute;top:calc(100% + 8px);right:0;left:auto;width:min(20rem,calc(100vw - 16px));min-width:0;max-height:min(58vh,22rem)}\n  .bh-ev-item{padding:.62rem .5rem}\n}</style>";
    var evHtml = "<div class=\"bh-ev\" id=\"bh-ev\"><button type=\"button\" class=\"bh-ev-trigger\" id=\"bh-ev-trigger\" aria-expanded=\"false\" aria-controls=\"bh-ev-panel\" aria-label=\"Local events in Breckenridge\"><span class=\"bh-ev-label bh-ev-label-full\">Local Events</span><span class=\"bh-ev-label bh-ev-label-short\">Events</span><span class=\"bh-ev-caret\" aria-hidden=\"true\"></span></button><div class=\"bh-ev-panel\" id=\"bh-ev-panel\" role=\"region\" aria-label=\"Local events\" hidden><div class=\"bh-ev-panel-title\">Breckenridge · Local events</div><div class=\"bh-ev-list\" id=\"bh-ev-list\"></div></div></div>";
    var evJs = "<script id=\"bh-local-events-js\">(function () {\n  var root = document.getElementById(\"bh-ev\");\n  var btn = document.getElementById(\"bh-ev-trigger\");\n  var panel = document.getElementById(\"bh-ev-panel\");\n  var list = document.getElementById(\"bh-ev-list\");\n  if (!root || !btn || !panel || !list) return;\n\n  // Static guest shortlist. Live GoBreck pull is not feasible from the page:\n  // no public events REST route, and gobreck.com/events HTML is CORS-blocked\n  // for browser fetch. Worker-side scrape would be fragile without a stable feed.\n  var EVENTS = [\n    {\n      name: \"Opening Day — Kingdom of Breck\",\n      date: \"Wed Nov 11, 2026\",\n      end: \"2026-11-11\",\n      desc: \"Peak 8 opens with donuts, DJ sets, and a first-chair banner break.\",\n      href: \"https://gobreck.com/winter-spring/best-winter-events-in-breckenridge/\"\n    },\n    {\n      name: \"Breck Sky Fest kickoff\",\n      date: \"Wed Nov 11, 5:30–7:00 PM\",\n      end: \"2026-11-11\",\n      desc: \"Public dark-sky evening with BOEC at the Wilderness Campus.\",\n      href: \"https://gobreck.com/guide/stargazing-in-breckenridge/\"\n    },\n    {\n      name: \"Other Worlds immersive art\",\n      date: \"Daily through mid-Nov\",\n      end: \"2026-11-15\",\n      desc: \"Immersive family art exhibition at Old Masonic Hall (Breck Create).\",\n      href: \"https://gobreck.com/event/breckenridge-international-festival-of-arts/\"\n    },\n    {\n      name: \"Summit Historical Society Holiday Bazaar\",\n      date: \"Sat Nov 14, 2026\",\n      end: \"2026-11-14\",\n      desc: \"Community holiday bazaar at Summit High School.\",\n      href: \"https://gobreck.com/events/\"\n    },\n    {\n      name: \"AstroTours stargazing at Beaver Run\",\n      date: \"Wed Nov 18, 5:30–7:15 PM\",\n      end: \"2026-11-18\",\n      desc: \"Guided telescope tour during Breck Sky Fest month.\",\n      href: \"https://gobreck.com/guide/stargazing-in-breckenridge/\"\n    },\n    {\n      name: \"Lighting of Breckenridge + Race of the Santas\",\n      date: \"Sat Dec 5, 2026\",\n      end: \"2026-12-05\",\n      desc: \"Dog parade, Santa race, Moose March, and 5 PM lighting of 250k lights on Main Street.\",\n      href: \"https://gobreck.com/event/lighting-breckenridge-race-santas/\"\n    },\n    {\n      name: \"Breckenridge Ullr Fest\",\n      date: \"Dec 17–19, 2026\",\n      end: \"2026-12-19\",\n      desc: \"63rd Pray-for-Snow fest: parade, Shotski attempt, bonfire, Rockstar Energy Open.\",\n      href: \"https://gobreck.com/event/ullr-fest/\"\n    },\n    {\n      name: \"New Year’s Eve Torchlight Parade + Fireworks\",\n      date: \"Wed Dec 31, 2026\",\n      end: \"2026-12-31\",\n      desc: \"Peak 9 torchlight (Glow Worm for kids) then fireworks to ring in the year.\",\n      href: \"https://gobreck.com/event/new-years-eve-in-breckenridge/\"\n    }\n  ];\n\n  function esc(s) {\n    return String(s)\n      .replace(/&/g, \"&amp;\")\n      .replace(/</g, \"&lt;\")\n      .replace(/>/g, \"&gt;\")\n      .replace(/\"/g, \"&quot;\");\n  }\n\n  function todayStamp() {\n    var d = new Date();\n    var y = d.getFullYear();\n    var m = d.getMonth() + 1;\n    var day = d.getDate();\n    return y + \"-\" + (m < 10 ? \"0\" : \"\") + m + \"-\" + (day < 10 ? \"0\" : \"\") + day;\n  }\n\n  var MAX_EVENTS = 8;\n  function activeEvents() {\n    var today = todayStamp();\n    var out = [];\n    for (var i = 0; i < EVENTS.length; i++) {\n      var e = EVENTS[i];\n      if (!e.end || e.end >= today) out.push(e);\n    }\n    return out.slice(0, MAX_EVENTS);\n  }\n\n  function closeWeather() {\n    var wx = document.getElementById(\"bh-wx\");\n    var wxBtn = document.getElementById(\"bh-wx-trigger\");\n    var wxPanel = document.getElementById(\"bh-wx-panel\");\n    if (!wx) return;\n    wx.removeAttribute(\"open\");\n    if (wxBtn) wxBtn.setAttribute(\"aria-expanded\", \"false\");\n    if (wxPanel) wxPanel.hidden = true;\n  }\n\n  function setOpen(on) {\n    if (on) {\n      closeWeather();\n      root.setAttribute(\"open\", \"\");\n      btn.setAttribute(\"aria-expanded\", \"true\");\n      panel.hidden = false;\n      panel.scrollTop = 0;\n    } else {\n      root.removeAttribute(\"open\");\n      btn.setAttribute(\"aria-expanded\", \"false\");\n      panel.hidden = true;\n    }\n  }\n\n  function render() {\n    var items = activeEvents();\n    var html = \"\";\n    for (var i = 0; i < items.length; i++) {\n      var e = items[i];\n      html +=\n        '<a class=\"bh-ev-item\" href=\"' +\n        esc(e.href) +\n        '\" target=\"_blank\" rel=\"noopener noreferrer\">' +\n        '<span class=\"bh-ev-item-name\">' +\n        esc(e.name) +\n        \"</span>\" +\n        '<span class=\"bh-ev-item-date\">' +\n        esc(e.date) +\n        \"</span>\" +\n        '<span class=\"bh-ev-item-desc\">' +\n        esc(e.desc) +\n        \"</span>\" +\n        \"</a>\";\n    }\n    if (!html) {\n      html =\n        '<p class=\"bh-ev-empty\">No upcoming local events in the shortlist right now. Check <a href=\"https://gobreck.com/events/\" target=\"_blank\" rel=\"noopener noreferrer\">GoBreck Events</a>.</p>';\n    }\n    list.innerHTML = html;\n  }\n\n  render();\n\n  btn.addEventListener(\"click\", function (e) {\n    e.preventDefault();\n    e.stopPropagation();\n    setOpen(!root.hasAttribute(\"open\"));\n  });\n  document.addEventListener(\n    \"pointerdown\",\n    function (e) {\n      if (!root.contains(e.target)) setOpen(false);\n    },\n    true\n  );\n  document.addEventListener(\"keydown\", function (e) {\n    if (e.key === \"Escape\") setOpen(false);\n  });\n})();</script>";
    if (html.includes("</head>")) { html = html.replace("</head>", evCss + "</head>"); changed = true; }
    if (!html.includes('id="bh-ev"')) {
      if (html.includes('id="bh-wx"')) {
        html = html.replace(/(<div class="bh-wx"\s+id="bh-wx")/, evHtml + "$1");
        changed = true;
      } else if (html.includes('id="header-reserve"')) {
        html = html.replace(/(<a class="btn-gold" id="header-reserve")/, evHtml + "$1");
        changed = true;
      }
    }
    if (html.includes("</body>")) { html = html.replace("</body>", evJs + "</body>"); changed = true; }
  }


  // bh-hero-final-v2: strip hero brand/location; do NOT force lede/facts visible
  {
    html = html.replace(/<style id="bh-hero-title-v\d+"[\s\S]*?<\/style>/g, "");
    html = html.replace(/<style id="bh-hero-final-v\d+"[\s\S]*?<\/style>/g, "");
    if (!html.includes("bh-hero-final-v2") && html.includes("</head>")) {
      html = html.replace("</head>", "<style id=\"bh-hero-final-v2\">.hero-inner>h1,.hero h1,.hero-inner h1,.hero-inner>.hero-loc,.hero-inner>p.eyebrow,.hero p.eyebrow,.hero-loc,.hero-inner>.hero-facts,.hero .hero-facts,.hero-facts{display:none!important;visibility:hidden!important;opacity:0!important;height:0!important;max-height:0!important;margin:0!important;padding:0!important;overflow:hidden!important;font-size:0!important;line-height:0!important;position:absolute!important;left:-10000px!important;width:1px!important;clip:rect(0,0,0,0)!important;pointer-events:none!important}</style>" + "</head>");
      changed = true;
    }
    html = html.replace(/<p class=\"hero-loc\">[\s\S]*?<\/p>/gi, "");
    html = html.replace(/<p class=\"eyebrow\">\s*Breckenridge,\s*Colorado\s*<\/p>/gi, "");
    html = html.replace(/<p class=\"eyebrow\">\s*BRECKENRIDGE,\s*COLORADO\s*<\/p>/gi, "");
    (function () {
      var inner = html.indexOf('<div class="hero-inner">');
      if (inner < 0) return;
      var guard = 0;
      while (guard++ < 5) {
        var h1 = html.indexOf("<h1", inner);
        if (h1 < 0) return;
        var lede = html.indexOf('class="hero-lede"', inner);
        var facts = html.indexOf('class="hero-facts"', inner);
        var limit = Math.min(lede > 0 ? lede : inner + 4000, facts > 0 ? facts : inner + 4000);
        if (h1 > limit) return;
        var close = html.indexOf("</h1>", h1);
        if (close < 0) return;
        html = html.slice(0, h1) + html.slice(close + 5);
        changed = true;
      }
    })();
  }


  // bh-house-stat-beds-v3: keep existing .h-stat gold separators; "3 bedroom, 3 bath" (CSS uppercases)
  if (!html.includes("bh-house-stat-beds-v3")) {
    html = html.replace(/<!--\s*bh-house-stat-beds-v\d+\s*-->/g, "");
    var houseStatTarget = '<p class="h-stat"><span>2,700 sq ft</span><span>3 bedroom, 3 bath</span><span>sleeps 8</span></p>';
    var houseBlockRe = /(<section[^>]*id="house"[^>]*>[\s\S]*?)(<p class="h-stat">[\s\S]*?<\/p>)/i;
    if (houseBlockRe.test(html)) {
      html = html.replace(houseBlockRe, "$1" + houseStatTarget);
      changed = true;
    }
    // Also rewrite any leftover shorter label if the full h-stat block was already present
    html = html.replace(/(<p class="h-stat">[\s\S]*?<span>)3 bed, 3 bath(<\/span>)/i, "$13 bedroom, 3 bath$2");
    if (html.includes("</head>")) {
      html = html.replace("</head>", "<!-- bh-house-stat-beds-v3 -->" + "</head>");
      changed = true;
    }
  }


  // bh-header-aframe-style-v2: header A-frame italic Playfair; locked casing
  if (!html.includes("bh-header-aframe-style-v2")) {
    html = html.replace(/<style id="bh-header-aframe-style-v\d+"[\s\S]*?<\/style>/g, "");
    var hdrAframeCss = "<style id=\"bh-header-aframe-style-v2\">.nav-logo .nav-wordmark{display:inline-flex!important;align-items:baseline!important;gap:0!important;column-gap:0!important;word-spacing:-0.12em!important;letter-spacing:-0.01em!important;white-space:nowrap!important;text-transform:none!important}.nav-logo .nav-wordmark em,.nav-logo .nav-wordmark i,.nav-logo .nav-wordmark .aframe{font-family:\"Playfair Display\",\"Cormorant Garamond\",serif!important;font-style:italic!important;font-weight:400!important;font-size:1.05em!important;letter-spacing:-0.03em!important;margin-left:0.06em!important;padding-left:0!important;text-transform:none!important;color:inherit!important;-webkit-text-fill-color:currentColor!important;}</style>";
    if (html.includes("</head>")) { html = html.replace("</head>", hdrAframeCss + "</head>"); changed = true; }
    html = html.replace(/(<span class="nav-wordmark">)[\s\S]*?(<\/span>)/i, '$1Breckhaus <em>A-frame</em>$2');
    changed = true;
  }



  // bh-hero-fourline-v8: enlarge lockup to match caller yesterday reference; strip competing restores
  if (!html.includes("bh-hero-fourline-v8")) {
    html = html.replace(/<style id="bh-hero-final-v\d+"[\s\S]*?<\/style>/g, "");
    html = html.replace(/<style id="bh-hero-line-v\d+"[\s\S]*?<\/style>/g, "");
    html = html.replace(/<style id="bh-hero-aframe-mid-v\d+"[\s\S]*?<\/style>/g, "");
    html = html.replace(/<style id="bh-hero-fourline-v\d+"[\s\S]*?<\/style>/g, "");
    html = html.replace(/<style id="bh-hero-pos-v\d+"[\s\S]*?<\/style>/g, "");
    html = html.replace(/<style id="bh-hero-debrand-v\d+"[\s\S]*?<\/style>/g, "");
    html = html.replace(/<style id="bh-hero-breckhaus-restore-v\d+"[\s\S]*?<\/style>/g, "");
    var heroFourCss = "<style id=\"bh-hero-fourline-v8\">"
      + ".hero-inner{position:absolute!important;inset:0!important;width:100%!important;max-width:none!important;margin:0!important;padding:0!important;display:flex!important;flex-direction:column!important;justify-content:center!important;align-items:flex-start!important;gap:0!important;z-index:2!important;box-sizing:border-box!important;pointer-events:none!important;transform:translate(-1vw,-10vh)!important}"
      + ".hero-inner>h1,.hero h1,.hero-inner h1,.hero-inner>.hero-loc,.hero-inner>p.eyebrow,.hero p.eyebrow,.hero-loc,.hero-inner>.hero-facts,.hero .hero-facts,.hero-facts,.hero-fact-val,.hero-fact-lbl,.hero-place,.hero-lede .hl,.hero-lede .hl1,.hero-lede .hl2,.hero-aframe--solo,.hero-aframe--lockup{display:none!important;visibility:hidden!important;opacity:0!important;height:0!important;max-height:0!important;margin:0!important;padding:0!important;overflow:hidden!important;font-size:0!important;line-height:0!important;position:absolute!important;left:-10000px!important;width:1px!important;clip:rect(0,0,0,0)!important;pointer-events:none!important}"
      + ".hero-brand,.hero-aframe,.hero-lede,.hero-mins{display:block!important;visibility:visible!important;opacity:1!important;position:relative!important;left:auto!important;top:auto!important;transform:none!important;width:auto!important;max-width:min(94vw,42rem)!important;margin:0!important;padding:0 0 0 clamp(1rem,3.5vw,2.5rem)!important;text-align:left!important;pointer-events:none!important;z-index:3!important;white-space:nowrap!important;text-shadow:0 1px 1px rgba(0,0,0,.75),0 2px 18px rgba(0,0,0,.55)!important}"
      /* Mobile base — Nov 9 .hero h1 */
      + ".hero-brand{font-family:\"Playfair Display\",\"Cormorant Garamond\",serif!important;font-style:normal!important;font-weight:400!important;font-size:clamp(3.05rem,13vw,4.85rem)!important;line-height:.92!important;letter-spacing:-.01em!important;text-transform:none!important;color:rgba(242,237,228,.96)!important;-webkit-text-fill-color:rgba(242,237,228,.96)!important}"
      + ".hero-aframe{font-family:\"Playfair Display\",\"Cormorant Garamond\",serif!important;font-style:italic!important;font-weight:400!important;font-size:clamp(3.05rem,13vw,4.85rem)!important;line-height:.92!important;letter-spacing:-.01em!important;margin-top:0!important;text-transform:none!important;color:rgba(196,194,186,.96)!important;-webkit-text-fill-color:rgba(196,194,186,.96)!important}"
      + ".hero-aframe em{font-style:italic!important;font-weight:400!important;color:rgba(196,194,186,.96)!important;-webkit-text-fill-color:rgba(196,194,186,.96)!important}"
      + ".hero-lede,.hero-mins{font-family:Jost,system-ui,sans-serif!important;font-style:normal!important;font-weight:400!important;font-size:1.075rem!important;line-height:1.65!important;letter-spacing:.01em!important;white-space:normal!important;max-width:34rem!important;color:rgba(196,194,186,.96)!important;-webkit-text-fill-color:rgba(196,194,186,.96)!important}"
      + ".hero-lede{margin-top:1rem!important}"
      + ".hero-mins{margin-top:.35rem!important}"
      /* Tablet+ — Nov 9 @media (min-width:768px) */
      + "@media (min-width:768px){.hero-brand,.hero-aframe{font-size:clamp(4.75rem,9.5vw,6.85rem)!important}.hero-lede,.hero-mins{font-size:1.145rem!important;max-width:38rem!important}.hero-inner{padding-bottom:3.2rem!important}}"
      /* Desktop — match yesterday lockup (~7.25rem); apply from 1024 */
      + "@media (min-width:1024px){.hero-brand,.hero-aframe{font-size:7.25rem!important}.hero-inner{padding:0 2.5rem 4.2rem!important}.hero-lede,.hero-mins{font-size:1.145rem!important;max-width:38rem!important}}"
      + "@media (max-width:767px){.hero-brand,.hero-aframe,.hero-lede,.hero-mins{padding-left:.85rem!important}.hero-brand,.hero-aframe{white-space:normal!important;max-width:92vw!important}.hero-lede,.hero-mins{max-width:90vw!important}}"
      + "</style>";
    if (html.includes("</head>")) { html = html.replace("</head>", heroFourCss + "</head>"); changed = true; }
    var heroInnerHtml = '<div class="hero-inner"><p class="hero-brand">Breckhaus</p><p class="hero-aframe"><em>Aframe</em></p><p class="hero-lede">Elevated living in high country.</p><p class="hero-mins">12 minutes to Breckenridge.</p></div>';
    var heroRep = replaceBalancedOpenTag(html, /<div class="hero-inner"[^>]*>/i, heroInnerHtml);
    html = heroRep.html; if (heroRep.changed) changed = true;
    html = html.replace(/<div class="hero-facts"[\s\S]*?<\/div>/gi, "");
    if (!html.includes("hero-brand") || !html.includes("hero-mins") || html.includes(">A-frame<") || html.includes("Breck House") || !html.includes("high country.</p>") || !html.includes("12 minutes to Breckenridge.</p>")) {
      html = html.replace(/<p class="hero-aframe"[^>]*>[\s\S]*?<\/p>/i, '<p class="hero-aframe"><em>Aframe</em></p>');
      html = html.replace(/<div class="hero-inner"[^>]*>[\s\S]*?<\/div>/i, heroInnerHtml);
      changed = true;
    }
    html = html.replace(/Sleeps\s*8\.\s*Hot tub,[^<]*/gi, "");
    html = html.replace(/Elevated living in the high country\.?/gi, "");
    html = html.replace(/Mt\.\s*Quandary views\.?/gi, "");
    html = html.replace(/<p class="hero-loc">[\s\S]*?<\/p>/gi, "");
    // Only strip hero Breckenridge eyebrows — do NOT remove section labels like "The house"
    html = html.replace(/<p class="eyebrow">\s*Breckenridge,\s*Colorado\s*<\/p>/gi, "");
    html = html.replace(/<p class="eyebrow">\s*BRECKENRIDGE,\s*COLORADO\s*<\/p>/gi, "");
    (function () {
      var inner = html.indexOf('<div class="hero-inner">');
      if (inner < 0) return;
      var guard = 0;
      while (guard++ < 5) {
        var h1 = html.indexOf("<h1", inner);
        if (h1 < 0) return;
        var close = html.indexOf("</h1>", h1);
        if (close < 0) return;
        if (h1 - inner > 4000) return;
        html = html.slice(0, h1) + html.slice(close + 5);
        changed = true;
      }
    })();
    changed = true;
  }

  // bh-hero-lockup-pos-v1: shift lockup down + right toward window wall; bottom pad clears sauna
  if (!html.includes("bh-hero-lockup-pos-v1")) {
    html = html.replace(/<style id="bh-hero-pos-v\d+"[\s\S]*?<\/style>/g, "");
    html = html.replace(/<style id="bh-hero-lockup-pos-v\d+"[\s\S]*?<\/style>/g, "");
    var heroPosCss = "<style id=\"bh-hero-lockup-pos-v1\">"
      + ".hero-inner{justify-content:flex-end!important;align-items:flex-start!important;"
      + "transform:translate(clamp(.35rem,5.5vw,4rem),0)!important;"
      + "padding:0 0 clamp(6.5rem,24vh,11.5rem) clamp(.85rem,4.5vw,2.75rem)!important}"
      + "@media (min-width:768px){.hero-inner{transform:translate(clamp(1rem,7.5vw,5.75rem),0)!important;"
      + "padding:0 0 clamp(6.25rem,23vh,11rem) clamp(1.15rem,5.5vw,3.25rem)!important}}"
      + "@media (min-width:1024px){.hero-inner{transform:translate(clamp(1.75rem,8.5vw,7rem),0)!important;"
      + "padding:0 0 clamp(5.75rem,21vh,10.25rem) clamp(1.5rem,6.5vw,3.75rem)!important}}"
      + "@media (max-width:767px){.hero-inner{transform:translate(.25rem,0)!important;"
      + "padding:0 0 clamp(5.25rem,19vh,8.75rem) .85rem!important}}"
      + "</style>";
    if (html.includes("</head>")) { html = html.replace("</head>", heroPosCss + "</head>"); changed = true; }
  }

  // bh-house-eyebrow-v1: restore yellow "The house" label above .h-stat
  if (!html.includes("bh-house-eyebrow-v1")) {
    var houseEyebrow = '<p class="eyebrow">The house</p>';
    var houseHeadRe = /(<section[^>]*id="house"[^>]*>[\s\S]*?<div>\s*)(?:<p class="eyebrow">[\s\S]*?<\/p>\s*)?(<p class="h-stat">)/i;
    if (houseHeadRe.test(html)) {
      html = html.replace(houseHeadRe, "$1" + houseEyebrow + "\n            $2");
      changed = true;
    }
    if (html.includes("</head>")) {
      html = html.replace("</head>", "<!-- bh-house-eyebrow-v1 -->" + "</head>");
      changed = true;
    }
  }



  // bh-hero-aframe-putty-v2: yesterday putty italic Aframe (no hyphen)
  if (!html.includes("bh-hero-aframe-putty-v2")) {
    html = html.replace(/<style id="bh-hero-aframe-putty-v\d+"[\s\S]*?<\/style>/g, "");
    var puttyCss = "<style id=\"bh-hero-aframe-putty-v2\">.hero-aframe,.hero-aframe em{font-family:\"Playfair Display\",\"Cormorant Garamond\",serif!important;font-style:italic!important;font-weight:400!important;color:rgba(196,194,186,.96)!important;-webkit-text-fill-color:rgba(196,194,186,.96)!important}</style>";
    if (html.includes("</head>")) { html = html.replace("</head>", puttyCss + "</head>"); changed = true; }
    html = html.replace(/<p class="hero-aframe"[^>]*>[\s\S]*?<\/p>/i, '<p class="hero-aframe"><em>Aframe</em></p>');
    html = html.replace(/>A-frame</gi, '>Aframe<');
    html = html.replace(/>A-Frame</gi, '>Aframe<');
    changed = true;
  }

  // bh-house-lede-v1: house intro without hero phrase; cathedral + guest essentials
  if (!html.includes("bh-house-lede-v1")) {
    var houseLede = "Experience architectural alpine living beneath sweeping cathedral ceilings. Sleeps eight, with a hot tub, barrel sauna, and Mount Quandary views\u2014just twelve minutes from downtown Breckenridge.";
    var houseLedeRe = /(<section[^>]*id="house"[^>]*>[\s\S]*?<p class="lede">)[\s\S]*?(<\/p>)/i;
    var houseLedeNext = html.replace(houseLedeRe, "$1" + houseLede + "$2");
    if (houseLedeNext !== html) {
      html = houseLedeNext;
      changed = true;
    }
    if (html.includes("</head>")) {
      html = html.replace("</head>", "<!-- bh-house-lede-v1 -->" + "</head>");
      changed = true;
    }
  }



  // bh-compact-menu-v4: tablet/mobile = single Menu (links + Events + weather) + Reserve; desktop unchanged
  if (!html.includes("bh-compact-menu-v4")) {
    html = html.replace(/<style id="bh-tablet-menu-v\d+"[\s\S]*?<\/style>/g, "");
    html = html.replace(/<style id="bh-compact-menu-v\d+"[\s\S]*?<\/style>/g, "");
    html = html.replace(/<style id="bh-mobile-header-dense-v\d+"[\s\S]*?<\/style>/g, "");
    html = html.replace(/<script id="bh-tablet-menu-js"[\s\S]*?<\/script>/g, "");
    html = html.replace(/<script id="bh-compact-menu-js"[\s\S]*?<\/script>/g, "");
    var cMenuCss = "<style id=\"bh-compact-menu-v4\">"
      + "@media (max-width:1023px){"
      + "header,nav,.nav-end{overflow:visible!important}"
      + "nav{display:flex!important;align-items:center!important;gap:.45rem!important;min-width:0!important}"
      + ".nav-logo{flex:0 0 auto!important;min-width:0!important}"
      + ".nav-end{flex:1 1 auto!important;min-width:0!important;display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:.35rem!important}"
      + ".nav-links,.nav-more,.bh-mnav{display:none!important;visibility:hidden!important;pointer-events:none!important}"
      + ".nav-end > a:not(#header-reserve):not(.btn-gold){display:none!important}"
      /* Single Menu + Reserve on the bar; Events/weather stay in DOM but off-bar */
      + ".bh-tmenu{position:relative!important;display:flex!important;align-items:center!important;flex:0 0 auto!important;order:0!important;margin-right:auto!important;z-index:330!important}"
      + ".bh-tmenu>summary{list-style:none!important;cursor:pointer!important;display:inline-flex!important;align-items:center!important;gap:.3rem!important;min-height:2.25rem!important;padding:.35rem .62rem!important;border:1px solid rgba(242,237,228,.22)!important;border-radius:999px!important;background:rgba(20,20,16,.55)!important;color:var(--cream,#F2EDE4)!important;font-family:Jost,system-ui,sans-serif!important;font-size:.66rem!important;font-weight:500!important;letter-spacing:.08em!important;text-transform:uppercase!important;white-space:nowrap!important}"
      + ".bh-tmenu>summary::-webkit-details-marker{display:none}"
      + ".bh-tmenu>summary::after{content:\"\";display:inline-block;width:.42rem;height:.42rem;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(45deg);opacity:.75;margin-top:-.12rem}"
      + ".bh-tmenu[open]>summary::after{transform:rotate(225deg);margin-top:.15rem}"
      + ".bh-tmenu-panel{position:absolute!important;top:calc(100% + 8px)!important;left:0!important;min-width:13.5rem!important;max-height:min(72vh,28rem)!important;overflow-y:auto!important;padding:.45rem!important;background:rgba(13,13,11,.97)!important;border:1px solid rgba(242,237,228,.2)!important;border-radius:12px!important;box-shadow:0 14px 40px rgba(0,0,0,.45)!important;display:flex!important;flex-direction:column!important;gap:.08rem!important;z-index:420!important}"
      + ".bh-tmenu-panel a,.bh-tmenu-panel button.bh-tmenu-action{display:block!important;width:100%!important;text-align:left!important;padding:.55rem .6rem!important;border-radius:8px!important;border:0!important;background:transparent!important;color:var(--cream,#F2EDE4)!important;text-decoration:none!important;font-family:Jost,system-ui,sans-serif!important;font-size:.72rem!important;letter-spacing:.06em!important;text-transform:uppercase!important;cursor:pointer!important}"
      + ".bh-tmenu-panel a:hover,.bh-tmenu-panel a:focus-visible,.bh-tmenu-panel button.bh-tmenu-action:hover,.bh-tmenu-panel button.bh-tmenu-action:focus-visible{background:rgba(242,237,228,.06)!important;outline:none!important}"
      + ".bh-tmenu-sep{height:1px!important;margin:.35rem .35rem!important;background:rgba(242,237,228,.14)!important;flex:0 0 auto!important}"
      + ".bh-tmenu-panel .bh-tmenu-action{color:rgba(201,169,110,.95)!important;letter-spacing:.08em!important}"
      + "#header-reserve,nav .nav-end>a.btn-gold{flex:0 0 auto!important;display:inline-flex!important;visibility:visible!important;opacity:1!important;order:3!important;margin-left:0!important;white-space:nowrap!important}"
      /* Park Events + weather off the congested bar; panels open fixed under header */
      + ".bh-ev,.bh-wx{position:fixed!important;top:calc(var(--nav-h,68px) + 6px)!important;right:10px!important;left:auto!important;width:0!important;height:0!important;margin:0!important;padding:0!important;overflow:visible!important;z-index:410!important;order:unset!important;flex:0 0 auto!important;display:block!important;visibility:visible!important;opacity:1!important;pointer-events:none!important}"
      + ".bh-ev-trigger,.bh-wx-trigger{position:absolute!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important;overflow:hidden!important;clip:rect(0,0,0,0)!important}"
      + ".bh-ev-panel,.bh-wx-panel{pointer-events:auto!important;position:fixed!important;top:calc(var(--nav-h,68px) + 8px)!important;right:10px!important;left:auto!important;width:min(22rem,calc(100vw - 20px))!important;max-height:min(70vh,28rem)!important}"
      + "}"
      + "@media (min-width:768px) and (max-width:1023px){"
      + "nav{gap:.55rem!important}"
      + ".nav-end{gap:.4rem!important}"
      + ".bh-tmenu{margin-right:auto!important}"
      + "#header-reserve,nav .nav-end>a.btn-gold{padding:.45rem .85rem!important;font-size:.7rem!important;min-height:2.25rem!important}"
      + "}"
      + "@media (max-width:767px){"
      + ":root{--nav-h:76px!important}"
      + "nav{gap:.3rem!important;padding-left:.5rem!important;padding-right:.5rem!important}"
      + ".nav-logo.has-mark .nav-mark{width:48px!important;height:44px!important}"
      + ".bh-tmenu>summary{padding:.32rem .55rem!important;font-size:.62rem!important;min-height:2.25rem!important}"
      + "#header-reserve,nav .nav-end>a.btn-gold{padding:.4rem .7rem!important;font-size:.62rem!important;min-height:2.25rem!important}"
      + ".bh-tmenu-panel{min-width:12.5rem!important;max-height:min(68vh,26rem)!important}"
      + ".bh-ev-panel,.bh-wx-panel{width:min(20rem,calc(100vw - 16px))!important;right:8px!important}"
      + "}"
      + "@media (min-width:1024px){.bh-tmenu{display:none!important}}"
      + "</style>";
    var tMenuHtml = "<details class=\"bh-tmenu\" id=\"bh-tmenu\"><summary>Menu</summary><div class=\"bh-tmenu-panel\" role=\"menu\"><a href=\"#house\">The House</a><a href=\"#flyover\">Flyover</a><a href=\"#reviews\">Reviews</a><a href=\"#gallery\">Photos</a><a href=\"#seasons\">Seasons</a><a href=\"#area\">The area</a><a href=\"#faq\">FAQ</a><a href=\"#contact\">Contact</a><div class=\"bh-tmenu-sep\" role=\"separator\"></div><button type=\"button\" class=\"bh-tmenu-action\" data-bh-open=\"bh-ev\" id=\"bh-tmenu-events\">Local Events</button><button type=\"button\" class=\"bh-tmenu-action\" data-bh-open=\"bh-wx\" id=\"bh-tmenu-weather\">Weather</button></div></details>";
    var tMenuJs = "<script id=\"bh-compact-menu-js\">(function(){var m=document.getElementById(\"bh-tmenu\");if(!m)return;function closeMenu(){m.removeAttribute(\"open\");}function openWidget(id){closeMenu();var root=document.getElementById(id);var btn=document.getElementById(id+\"-trigger\");if(!root||!btn)return;setTimeout(function(){btn.click();},30);}document.addEventListener(\"pointerdown\",function(e){if(!m.contains(e.target))closeMenu();},true);document.addEventListener(\"keydown\",function(e){if(e.key===\"Escape\")closeMenu();});m.querySelectorAll(\"a\").forEach(function(a){a.addEventListener(\"click\",function(){closeMenu();});});m.querySelectorAll(\"button.bh-tmenu-action\").forEach(function(b){b.addEventListener(\"click\",function(e){e.preventDefault();e.stopPropagation();openWidget(b.getAttribute(\"data-bh-open\"));});});})();</script>";
    if (html.includes("</head>")) { html = html.replace("</head>", cMenuCss + "</head>"); changed = true; }
    // Remove existing tmenu / mnav with balanced matching, then insert clean Menu before Events/wx/Reserve
    if (html.includes('id="bh-tmenu"')) {
      var tRep = replaceBalancedOpenTag(html, /<details\s+class="bh-tmenu"[^>]*>/i, "");
      html = tRep.html; if (tRep.changed) changed = true;
    }
    if (html.includes('id="bh-mnav"')) {
      var mRep = replaceBalancedOpenTag(html, /<div\s+class="bh-mnav"[^>]*>/i, "");
      html = mRep.html; if (mRep.changed) changed = true;
    }
    // Scrub orphaned top-level nav links left by prior non-greedy replaces
    html = html.replace(/<\/details>\s*(?:<a href="#[^"]+"[^>]*>[^<]*<\/a>\s*)+/, "");
    html = html.replace(/(?:<a href="#(?:flyover|gallery|faq|contact|layout|reviews|area|seasons|house)"[^>]*>[^<]*<\/a>\s*)+(?=<div class="bh-ev"|<div class="bh-wx"|<a class="btn-gold" id="header-reserve")/g, "");
    if (html.includes('id="bh-ev"')) {
      html = html.replace(/(<div class="bh-ev"\s+id="bh-ev")/, tMenuHtml + "$1");
      changed = true;
    } else if (html.includes('id="bh-wx"')) {
      html = html.replace(/(<div class="bh-wx"\s+id="bh-wx")/, tMenuHtml + "$1");
      changed = true;
    } else if (html.includes('id="header-reserve"')) {
      html = html.replace(/(<a class="btn-gold" id="header-reserve")/, tMenuHtml + "$1");
      changed = true;
    }

    // Rebuild nav-end: Menu + Events + weather + Reserve (Events/weather off-bar via CSS ≤1023; visible on desktop)
    (function () {
      var navStart = html.search(/<nav\b[^>]*>/i);
      if (navStart < 0) return;
      var navOpenEnd = html.indexOf('>', navStart) + 1;
      var navClose = html.toLowerCase().indexOf('</nav>', navOpenEnd);
      if (navClose < 0) return;
      var navInner = html.slice(navOpenEnd, navClose);
      var logoMatch = navInner.match(/<a class="nav-logo[\s\S]*?<\/a>/i);
      var logo = logoMatch ? logoMatch[0] : '';
      var linksMatch = navInner.match(/<ul class="nav-links"[\s\S]*?<\/ul>/i);
      var links = linksMatch ? linksMatch[0] : '';
      var moreMatch = navInner.match(/<details class="nav-more"[\s\S]*?<\/details>/i);
      var more = moreMatch ? moreMatch[0] : '';
      function pullBalanced(fragment, openRe) {
        var m = openRe.exec(fragment);
        if (!m) return { item: '', rest: fragment };
        var start = m.index;
        var tag = (/^<([a-z0-9:-]+)/i.exec(m[0]) || [])[1];
        if (!tag) return { item: '', rest: fragment };
        var i = start + m[0].length;
        var depth = 1;
        var lower = fragment.toLowerCase();
        var t = tag.toLowerCase();
        while (i < fragment.length && depth > 0) {
          var no = lower.indexOf('<' + t, i);
          var nc = lower.indexOf('</' + t, i);
          if (nc < 0) break;
          if (no >= 0 && no < nc) {
            var ch = lower[no + 1 + t.length];
            if (ch === '>' || ch === ' ' || ch === '\n' || ch === '\t' || ch === '/') depth++;
            i = no + 1 + t.length;
            continue;
          }
          depth--;
          if (depth === 0) {
            var closeEnd = lower.indexOf('>', nc) + 1;
            return { item: fragment.slice(start, closeEnd), rest: fragment.slice(0, start) + fragment.slice(closeEnd) };
          }
          i = nc + 2 + t.length;
        }
        return { item: '', rest: fragment };
      }
      var rest = navInner;
      var tmenu = '';
      var ev = '';
      var wx = '';
      var reserve = '';
      var pulled;
      pulled = pullBalanced(rest, /<details\s+[^>]*class="[^"]*bh-tmenu[^"]*"[^>]*>/i); if (pulled.item) { tmenu = pulled.item; rest = pulled.rest; }
      pulled = pullBalanced(rest, /<div\s+[^>]*class="[^"]*bh-ev[^"]*"[^>]*>/i); if (pulled.item) { ev = pulled.item; rest = pulled.rest; }
      pulled = pullBalanced(rest, /<div\s+[^>]*class="[^"]*bh-wx[^"]*"[^>]*>/i); if (pulled.item) { wx = pulled.item; rest = pulled.rest; }
      var rMatch = rest.match(/<a class="btn-gold" id="header-reserve"[\s\S]*?<\/a>/i);
      if (rMatch) { reserve = rMatch[0]; rest = rest.replace(rMatch[0], ''); }
      if (!tmenu) tmenu = tMenuHtml;
      if (!reserve) reserve = '<a class="btn-gold" id="header-reserve" href="/book" data-hospitable-cta aria-haspopup="dialog">Reserve</a>';
      var newNav = logo + '\n    <div class="nav-end">\n      ' + links + '\n      ' + more + '\n      ' + tmenu + ev + wx + reserve + '\n    </div>\n  ';
      html = html.slice(0, navOpenEnd) + newNav + html.slice(navClose);
      changed = true;
    })();

    if (html.includes("</body>") && !html.includes('bh-compact-menu-js')) {
      html = html.replace("</body>", tMenuJs + "</body>");
      changed = true;
    }
  }






  function applyV263DeckHide(html) {
    /* v263: desktop-only hide of Deck carousel #4 (deck-smores-bc58, two chairs
       with two blankets) and #7 (deck-hottub-view-bc58, hot tub cover up +
       mountains). #10 (deck-grill-bc58) is kept — background is rock, not snow.
       Phone/tablet behavior unchanged. Lightbox and carousel skip hidden shots. */
    if (!html) return { html: html, changed: false };
    if (!html.includes('id="gallery-deck"')) return { html: html, changed: false };
    var changed = false;
    /* v265: do not inject the v263 desktop-only hide CSS. The two
       formerly hidden shots (and deck-grill-bc58) are removed from markup. */
    var lbOld = "lbList = g ? Array.prototype.slice.call(g.querySelectorAll(\".shot[data-full]\")) : [btn];";
    var lbNew = "lbList = g ? Array.prototype.slice.call(g.querySelectorAll(\".shot[data-full]\")).filter(function(el){ return getComputedStyle(el).display !== \"none\"; }) : [btn];";
    if (html.indexOf(lbOld) !== -1) { html = html.replace(lbOld, lbNew); changed = true; }
    var sOld = "var s = [].slice.call(t.querySelectorAll(':scope > .shot'));\n    if(!s.length) s = [].slice.call(t.children).filter(function(el){ return el.classList && el.classList.contains('shot'); });\n    var n = s.length;";
    var sNew = "function visShots(){\n      var all = [].slice.call(t.querySelectorAll(':scope > .shot'));\n      if(!all.length) all = [].slice.call(t.children).filter(function(el){ return el.classList && el.classList.contains('shot'); });\n      return all.filter(function(el){ return getComputedStyle(el).display !== 'none'; });\n    }\n    var s = visShots();\n    var n = s.length;";
    if (html.indexOf(sOld) !== -1) { html = html.replace(sOld, sNew); changed = true; }
    var rOld = "window.addEventListener('resize', function(){\n      stopAnim();\n      if(!driven) i = idxFromScroll();\n      t.scrollLeft = targetLeft(i);\n      paint();\n    });";
    var rNew = "window.addEventListener('resize', function(){\n      stopAnim();\n      s = visShots();\n      n = s.length;\n      if(tot) tot.textContent = pad(n);\n      s.forEach(function(el,k){ el.setAttribute('aria-roledescription','slide'); el.setAttribute('aria-label',(k+1)+' of '+n); });\n      if(!driven) i = idxFromScroll();\n      i = Math.max(0, Math.min(Math.max(0, n - 1), i));\n      t.scrollLeft = targetLeft(i);\n      paint();\n    });";
    if (html.indexOf(rOld) !== -1) { html = html.replace(rOld, rNew); changed = true; }
    return { html: html, changed: changed };
  }


  function applyV264Gallery(html) {
    if (!html || html.includes("bh-v264-gallery")) return { html: html, changed: false };
    var changed = false;
  
    function extractButtons(trackInner) {
      var buttons = [];
      var re = /<button\b[\s\S]*?<\/button>/gi;
      var m;
      while ((m = re.exec(trackInner))) buttons.push(m[0]);
      return buttons;
    }
  
    function slotOf(btn) {
      var m = /data-slot="([^"]+)"/.exec(btn);
      return m ? m[1] : "";
    }
    function fullOf(btn) {
      var m = /data-full="([^"]+)"/.exec(btn);
      return m ? m[1].split("?")[0] : "";
    }
  
    function rewriteGroup(html, groupId, transformFn) {
      var re = new RegExp(
        '(<div[^>]*\\bid="' + groupId + '"[^>]*>[\\s\\S]*?<div class="gc-track"[^>]*>)([\\s\\S]*?)(</div>)',
        "i"
      );
      var m = html.match(re);
      if (!m) return html;
      var buttons = extractButtons(m[2]);
      var next = transformFn(buttons.slice());
      if (!next) return html;
      var inner = "\n          " + next.join("\n          ") + "\n          ";
      changed = true;
      return html.replace(m[0], m[1] + inner + m[3]);
    }
  
    // Bedrooms: remove live #1-#3 (all confirmed bedroom shots)
    html = rewriteGroup(html, "gallery-bedrooms", function (btns) {
      var drop = {
        "gallery-19b-bedrooms-05": 1,
        "gallery-19c-bedrooms-06": 1,
        "gallery-21-bedrooms-03": 1
      };
      return btns.filter(function (b) { return !drop[slotOf(b)]; });
    });
  
    // Baths: remove live #8 (half tub + vanity), bath.jpg
    html = rewriteGroup(html, "gallery-baths", function (btns) {
      return btns.filter(function (b) { return slotOf(b) !== "gallery-25-baths-03"; });
    });
  
    // Loft: 3, 2, 1, 4, 14, 5, 6, 7, 8, 9, 10, 11, 12, 13 (1-based current)
    html = rewriteGroup(html, "gallery-loft", function (btns) {
      if (btns.length !== 14) return btns;
      var order = [3, 2, 1, 4, 14, 5, 6, 7, 8, 9, 10, 11, 12, 13];
      return order.map(function (n) { return btns[n - 1]; });
    });
  
    // Details / Around the home: 1, 4, 2, 3
    html = rewriteGroup(html, "gallery-details", function (btns) {
      if (btns.length !== 4) return btns;
      var order = [1, 4, 2, 3];
      return order.map(function (n) { return btns[n - 1]; });
    });
  
    if (changed && html.includes("</head>")) {
      html = html.replace("</head>", "<!-- bh-v264-gallery -->\n</head>");
    }
    return { html: html, changed: changed };
  }
  // bh-bundle-2026-11-10-v1: nav tighten/right cluster, hero TWELVE + shifts,
  // house stats v4, area mosaic order. Runs last so it wins over earlier rewrites.
  if (!html.includes('id="bh-nav-tighten-right-v1"')) {
    html = html.replace(/<style id="bh-nav-tighten-right-v\d+"[\s\S]*?<\/style>/g, "");
    var tightenCss = "<style id=\"bh-nav-tighten-right-v1\">/* bh-nav-tighten-right-v1\n   Bundled approved header/hero overrides. Does not change logo-only\n   wordmark hiding. */\n\n/* ---- Desktop typography: another 50% right (2.25\u00d7 original offset), capped ----\n   Desired typoLeft ~387 at 1440/1920 and ~331 at 1024. Cap so the lockup\n   stays fully visible (right edge >= 48px inside the viewport) and left of\n   the barrel sauna when it is in frame (~58.8vw). Floor is the v243 1.5\u00d7\n   position so the cap never pulls the type left. */\n@media (min-width: 1024px) {\n  .hero-inner {\n    /* Raise lockup so typoTop = 0.75 \u00d7 current typoTop (vh - 423.6px).\n       Floor: typoTop >= nav bottom (138px) + 24px. Horizontal padding unchanged. */\n    transform: translateY(max(\n      calc(-0.25 * (100vh - 423.6px)),\n      calc(162px - (100vh - 423.6px))\n    )) !important;\n    /* 25% right of the v247 typoLeft (the previous min() result).\n       Sauna cap omitted: after the 25% raise, typoBottom sits above the\n       barrel at 1024\u20131920 (no vertical overlap). Viewport 48px cap kept. */\n    padding-left: min(\n      calc(\n        min(\n          calc((clamp(1.75rem, 8.5vw, 7rem) + clamp(1.5rem, 6.5vw, 3.75rem)) * 2.25),\n          calc(100vw - 48px - 35.75rem),\n          max(\n            calc((clamp(1.75rem, 8.5vw, 7rem) + clamp(1.5rem, 6.5vw, 3.75rem)) * 1.5),\n            calc(58.8vw - 16px - 35.75rem)\n          )\n        ) * 1.25\n      ),\n      calc(100vw - 48px - 35.75rem)\n    ) !important;\n  }\n}\n\n/* Do not let any uppercase transform restyle the hero tagline */\n.hero-lede,\n.hero-mins {\n  text-transform: none !important;\n}\n\n/* Pack the cluster toward Reserve only where nine links already fit.\n   At 1024\u20131279 the live header already overflowed Reserve; do not change\n   nav there (logo and Reserve stay put). */\n@media (min-width: 1280px) {\n  .nav-end {\n    justify-content: flex-end !important;\n    gap: 0.9rem !important;\n  }\n  .nav-links,\n  .nav-links > li,\n  .nav-links a,\n  .bh-ev,\n  .bh-wx {\n    margin-left: 0 !important;\n    margin-right: 0 !important;\n  }\n  #header-reserve,\n  nav .nav-end > a.btn-gold {\n    margin-left: 0 !important;\n    margin-right: 0 !important;\n  }\n}\n\n/* ---- Tablet + mobile (\u22641023): Menu, Local Events, weather, Reserve ---- */\n@media (max-width: 1023px) {\n  .nav-logo { flex: 0 0 auto !important; }\n  .nav-end {\n    flex: 1 1 auto !important;\n    min-width: 0 !important;\n    display: flex !important;\n    align-items: center !important;\n    justify-content: flex-end !important;\n    gap: 0.55rem !important;\n  }\n  .nav-links,\n  .nav-more,\n  .bh-mnav { display: none !important; }\n\n  .bh-tmenu {\n    position: relative !important;\n    display: flex !important;\n    align-items: center !important;\n    flex: 0 0 auto !important;\n    order: 0 !important;\n    margin: 0 !important;\n    width: auto !important;\n    height: auto !important;\n    z-index: 330 !important;\n  }\n  .bh-tmenu > summary {\n    min-height: 40px !important;\n    min-width: 40px !important;\n    box-sizing: border-box !important;\n  }\n\n  .bh-ev,\n  .bh-wx {\n    position: relative !important;\n    top: auto !important;\n    right: auto !important;\n    left: auto !important;\n    width: auto !important;\n    height: auto !important;\n    margin: 0 !important;\n    padding: 0 !important;\n    overflow: visible !important;\n    flex: 0 0 auto !important;\n    display: inline-flex !important;\n    align-items: center !important;\n    visibility: visible !important;\n    opacity: 1 !important;\n    pointer-events: auto !important;\n    z-index: 321 !important;\n  }\n  .bh-ev { order: 1 !important; }\n  .bh-wx { order: 2 !important; }\n\n  .bh-ev-trigger,\n  .bh-wx-trigger {\n    position: relative !important;\n    width: auto !important;\n    height: auto !important;\n    min-height: 40px !important;\n    min-width: 40px !important;\n    box-sizing: border-box !important;\n    opacity: 1 !important;\n    pointer-events: auto !important;\n    overflow: visible !important;\n    clip: auto !important;\n    clip-path: none !important;\n  }\n\n  #header-reserve,\n  nav .nav-end > a.btn-gold {\n    flex: 0 0 auto !important;\n    display: inline-flex !important;\n    align-items: center !important;\n    justify-content: center !important;\n    visibility: visible !important;\n    opacity: 1 !important;\n    order: 3 !important;\n    margin: 0 !important;\n    min-height: 40px !important;\n    min-width: 40px !important;\n    box-sizing: border-box !important;\n  }\n\n  .bh-ev-panel,\n  .bh-wx-panel {\n    pointer-events: auto !important;\n    position: absolute !important;\n    top: calc(100% + 8px) !important;\n    right: 0 !important;\n    left: auto !important;\n    width: min(22rem, calc(100vw - 20px)) !important;\n  }\n}\n\n@media (min-width: 768px) and (max-width: 1023px) {\n  .nav-end { gap: 1.125rem !important; } /* 18px uniform; Reserve stays flex-end at right padding */\n  .bh-ev-trigger .bh-ev-label-full { display: inline !important; }\n  .bh-ev-trigger .bh-ev-label-short { display: none !important; }\n\n  /* Tablet hero: ~20% larger type; sit lower; stay left of the barrel sauna\n     (sauna left edge \u2248 472px at 768px wide). Overrides the 1.5\u00d7 desktop shift. */\n  .hero-brand,\n  .hero-aframe {\n    font-size: 5.7rem !important;\n    line-height: 0.92 !important;\n  }\n  .hero-lede,\n  .hero-mins {\n    font-size: 1.32rem !important;\n    line-height: 1.5 !important;\n  }\n  .hero-inner {\n    justify-content: flex-start !important;\n    align-items: flex-start !important;\n    transform: none !important;\n    /* Align typoTop with the top of the middle roof skylight pair\n       (natural y=636 in the 2400\u00d71600 hero; object-fit cover, position 50% 40%).\n       photo box is below the 138px nav and fills the rest of the hero.\n       Floor: 24px below nav. Keep 2.4rem left (sauna cap at 768). */\n    padding-top: max(\n      162px,\n      calc(138px + 0.4 * (100vh - 138px) + -4 * max(100vw / 2400, (100vh - 138px) / 1600))\n    ) !important;\n    padding-right: 0 !important;\n    padding-bottom: 0 !important;\n    padding-left: 2.4rem !important;\n  }\n  .hero-brand,\n  .hero-aframe,\n  .hero-lede,\n  .hero-mins {\n    padding-left: 0 !important;\n  }\n}\n\n@media (max-width: 767px) {\n  .nav-end { gap: 0.45rem !important; }\n  .bh-ev-trigger .bh-ev-label-full { display: none !important; }\n  .bh-ev-trigger .bh-ev-label-short { display: inline !important; }\n  /* Match 1440 typo left-edge % (258/1440 = 17.9167vw), cap so typo stays on-screen */\n  .hero-inner {\n    transform: none !important;\n    padding-left: min(17.9167vw, calc(100vw - 16rem - 24px)) !important;\n  }\n  .hero-brand,\n  .hero-aframe,\n  .hero-lede,\n  .hero-mins {\n    padding-left: 0 !important;\n  }\n}\n\n/* ---- Mobile only (\u2264480): raise typography, drop the dead dark band ---- */\n@media (max-width: 480px) {\n  header.hero,\n  .hero {\n    min-height: 0 !important;\n    height: calc(var(--nav-h, 76px) + 64svh) !important;\n  }\n  .hero-media {\n    top: var(--nav-h, 76px) !important;\n    right: 0 !important;\n    left: 0 !important;\n    bottom: 0 !important;\n    height: auto !important;\n  }\n  .hero-media::after {\n    height: 20% !important;\n    background: linear-gradient(to bottom, rgba(13,13,11,0) 0%, rgba(13,13,11,0.28) 100%) !important;\n  }\n  .hero-inner {\n    justify-content: center !important;\n    align-items: flex-start !important;\n    transform: none !important;\n    padding: calc(var(--nav-h, 76px) + 6%) 0 1.25rem min(17.9167vw, calc(100vw - 16rem - 24px)) !important;\n  }\n  .hero-brand,\n  .hero-aframe,\n  .hero-lede,\n  .hero-mins {\n    padding-left: 0 !important;\n    white-space: normal !important;\n    max-width: min(92vw, 22rem) !important;\n    text-shadow:\n      0 1px 1px rgba(0,0,0,0.85),\n      0 2px 14px rgba(0,0,0,0.7),\n      0 0 28px rgba(0,0,0,0.45) !important;\n  }\n}\n\n/* Narrow phones: keep the four-item cluster on-bar without covering the logo */\n@media (max-width: 360px) {\n  .nav-end { gap: 0.22rem !important; }\n  .bh-tmenu > summary,\n  .bh-ev-trigger,\n  .bh-wx-trigger,\n  #header-reserve,\n  nav .nav-end > a.btn-gold {\n    padding-left: 0.42rem !important;\n    padding-right: 0.42rem !important;\n  }\n}\n\n/* <=1023: hide Events/weather at the bottom of the Menu dropdown.\n   Header already has its own Events and weather buttons. Markup kept. */\n@media (max-width: 1023px) {\n  #bh-tmenu .bh-tmenu-sep,\n  #bh-tmenu button.bh-tmenu-action,\n  #bh-tmenu #bh-tmenu-events,\n  #bh-tmenu #bh-tmenu-weather {\n    display: none !important;\n  }\n}\n\n/* <=767: keep Menu / Events / weather dropdowns fully inside the viewport */\n@media (max-width: 767px) {\n  header, nav, .nav-end, .bh-tmenu, .bh-ev, .bh-wx {\n    overflow: visible !important;\n  }\n  #bh-tmenu .bh-tmenu-panel,\n  .bh-ev-panel,\n  .bh-wx-panel {\n    position: fixed !important;\n    left: 8px !important;\n    right: 8px !important;\n    width: auto !important;\n    max-width: none !important;\n    top: var(--nav-h, 76px) !important;\n    max-height: calc(100vh - var(--nav-h, 76px) - 8px) !important;\n    overflow-y: auto !important;\n    -webkit-overflow-scrolling: touch !important;\n    overscroll-behavior: contain !important;\n    z-index: 500 !important;\n  }\n}\n\n@media (max-width: 320px) {\n  .nav-end { gap: 0.1rem !important; }\n  .bh-tmenu > summary,\n  .bh-ev-trigger,\n  .bh-wx-trigger,\n  #header-reserve,\n  nav .nav-end > a.btn-gold {\n    padding-left: 0.2rem !important;\n    padding-right: 0.2rem !important;\n  }\n}\n\n\n/* Area tile: longer snow-sculpture caption should wrap, not clip */\n.around .shot[data-slot=\"around-06-snow-sculpture\"] .lbl,\n.around .bh-area-mosaic .shot[data-slot=\"around-06-snow-sculpture\"] .lbl {\n  white-space: normal !important;\n  overflow: visible !important;\n  line-height: 1.25 !important;\n  overflow-wrap: anywhere !important;\n}\n\n/* ---- v250: typo onto left metal roof (typoTop unchanged); mobile type 80%;\n   mobile header shows Local Events (20% label font cut so it can fit). ---- */\n\n@media (max-width: 767px) {\n  .hero-brand, .hero-aframe {\n    font-size: clamp(2.44rem, 10.4vw, 3.88rem) !important; /* 0.8 \u00d7 clamp(3.05rem, 13vw, 4.85rem) */\n  }\n  .hero-lede, .hero-mins {\n    font-size: 0.86rem !important; /* 0.8 \u00d7 1.075rem */\n    /* line-height and letter-spacing are already in em and scale with font-size */\n  }\n  .bh-ev-trigger .bh-ev-label-full { display: inline !important; }\n  .bh-ev-trigger .bh-ev-label-short { display: none !important; }\n  .bh-ev-trigger .bh-ev-label { white-space: nowrap !important; font-size: 0.48rem !important; letter-spacing: 0.04em !important; } /* 0.8 \u00d7 0.6rem */\n  .bh-wx-trigger .bh-wx-hi { font-size: 0.576rem !important; } /* 0.8 \u00d7 0.72rem */\n  #header-reserve, nav .nav-end > a.btn-gold { font-size: 0.496rem !important; } /* 0.8 \u00d7 0.62rem */\n}\n\n/* Desktop typoLeft only \u2014 vertical transform unchanged */\n@media (min-width: 1920px) {\n  .hero-inner { padding-left: 768.35px !important; }\n}\n@media (min-width: 1440px) and (max-width: 1919px) {\n  .hero-inner { padding-left: 526.6px !important; }\n}\n@media (min-width: 1280px) and (max-width: 1439px) {\n  .hero-inner { padding-left: 438.2px !important; }\n}\n@media (min-width: 1024px) and (max-width: 1279px) {\n  .hero-inner { padding-left: 327.4px !important; }\n}\n\n/* Tablet typoLeft only \u2014 typoTop (padding-top formula) unchanged */\n@media (min-width: 900px) and (max-width: 1023px) {\n  .hero-inner { padding-left: 423px !important; }\n}\n@media (min-width: 769px) and (max-width: 899px) {\n  .hero-inner { padding-left: 293.1px !important; }\n}\n@media (min-width: 768px) and (max-width: 768px) {\n  .hero-inner { padding-left: 283.5px !important; }\n}\n\n/* Mobile: lock typoTop (flex-start + measured padding-top) and place on left roof */\n@media (min-width: 431px) and (max-width: 767px) {\n  .hero-inner {\n    justify-content: flex-start !important;\n    padding-top: 303.1px !important;\n    padding-left: 120.14px !important;\n  }\n}\n@media (min-width: 391px) and (max-width: 430px) {\n  .hero-inner {\n    justify-content: flex-start !important;\n    padding-top: 303.1px !important;\n    padding-left: 120.14px !important;\n  }\n}\n@media (min-width: 376px) and (max-width: 390px) {\n  .hero-inner {\n    justify-content: flex-start !important;\n    padding-top: 278.5px !important;\n    padding-left: 106.58px !important;\n  }\n}\n@media (min-width: 361px) and (max-width: 375px) {\n  .hero-inner {\n    justify-content: flex-start !important;\n    padding-top: 269.5px !important;\n    padding-left: 101.39px !important;\n  }\n}\n@media (min-width: 321px) and (max-width: 360px) {\n  .hero-inner {\n    justify-content: flex-start !important;\n    padding-top: 258.9px !important;\n    padding-left: 95.3px !important;\n  }\n}\n@media (max-width: 320px) {\n  .hero-inner {\n    justify-content: flex-start !important;\n    padding-top: 212.9px !important;\n    padding-left: 82.7px !important;\n  }\n}\n\n/* ---- v252 typo: desktop left to sky (just right of tall tree);\n       tablet typoTop x0.5 + typoLeft x0.7; mobile typoTop x0.4. typoTop desktop unchanged. */\n/* Desktop typoLeft only \u2014 typoTop (transform) unchanged */\n@media (min-width: 1920px) {\n  .hero-inner { padding-left: 197.2px !important; }\n}\n@media (min-width: 1440px) and (max-width: 1919px) {\n  .hero-inner { padding-left: 180px !important; } /* tree-stop: full-width shift was off-canvas; 160px canopy at 1919 + 20px */\n}\n@media (min-width: 1280px) and (max-width: 1439px) {\n  .hero-inner { padding-left: 139px !important; } /* tree-stop: canopy 119px at 1439 + 20px */\n}\n@media (min-width: 1024px) and (max-width: 1279px) {\n  .hero-inner { padding-left: 119px !important; } /* tree-stop: canopy 99px at 1279 + 20px */\n}\n\n/* Tablet: typoTop x0.5 (same skylight formula, halved, floor 162px = 24px below nav);\n   typoLeft x0.7 of the v250/v251 pad-left bands */\n@media (min-width: 768px) and (max-width: 1023px) {\n  .hero-inner {\n    justify-content: flex-start !important;\n    transform: none !important;\n    padding-top: max(162px, calc(0.5 * max(\n      162px,\n      calc(138px + 0.4 * (100vh - 138px) + -4 * max(100vw / 2400, (100vh - 138px) / 1600))\n    ))) !important;\n  }\n}\n@media (min-width: 900px) and (max-width: 1023px) {\n  .hero-inner { padding-left: 296.1px !important; } /* 0.7 \u00d7 423 */\n}\n@media (min-width: 769px) and (max-width: 899px) {\n  .hero-inner { padding-left: 205.17px !important; } /* 0.7 \u00d7 293.1 */\n}\n@media (min-width: 768px) and (max-width: 768px) {\n  .hero-inner { padding-left: 198.45px !important; } /* 0.7 \u00d7 283.5 */\n}\n\n/* Mobile \u2264767: typoTop x0.4 (padding-top); typoLeft unchanged */\n@media (min-width: 431px) and (max-width: 767px) {\n  .hero-inner {\n    justify-content: flex-start !important;\n    padding-top: 121.24px !important;\n    padding-left: 120.14px !important;\n  }\n}\n@media (min-width: 391px) and (max-width: 430px) {\n  .hero-inner {\n    justify-content: flex-start !important;\n    padding-top: 121.24px !important;\n    padding-left: 120.14px !important;\n  }\n}\n@media (min-width: 376px) and (max-width: 390px) {\n  .hero-inner {\n    justify-content: flex-start !important;\n    padding-top: 111.4px !important;\n    padding-left: 106.58px !important;\n  }\n}\n@media (min-width: 361px) and (max-width: 375px) {\n  .hero-inner {\n    justify-content: flex-start !important;\n    padding-top: 107.8px !important;\n    padding-left: 101.39px !important;\n  }\n}\n@media (min-width: 321px) and (max-width: 360px) {\n  .hero-inner {\n    justify-content: flex-start !important;\n    padding-top: 103.56px !important;\n    padding-left: 95.3px !important;\n  }\n}\n@media (max-width: 320px) {\n  .hero-inner {\n    justify-content: flex-start !important;\n    padding-top: 85.16px !important;\n    padding-left: 82.7px !important;\n  }\n}\n\n/* ---- v253 typo: TABLET ONLY \u2014 restore v247 typoTop (align title top to\n       A-frame middle roof skylight pair, nat y=636). typoLeft stays v252 (x0.7).\n       Desktop and mobile typo unchanged from v252. */\n@media (min-width: 768px) and (max-width: 1023px) {\n  .hero-inner {\n    justify-content: flex-start !important;\n    transform: none !important;\n    padding-top: max(\n      162px,\n      calc(138px + 0.4 * (100vh - 138px) + -4 * max(100vw / 2400, (100vh - 138px) / 1600))\n    ) !important;\n  }\n}\n\n/* ---- v254 typo: MOBILE ONLY (\u2264767) \u2014 typoTop = min(true photo-center,\n       v250 typoTop \u2212 10px). True center = 76px + 32vh \u2212 typoH/2, floored\n       at 80px (4px below header). typoLeft unchanged from v252/v253. */\n@media (min-width: 600px) and (max-width: 767px) {\n  .hero-inner {\n    justify-content: flex-start !important;\n    padding-top: min(293.1px, max(80px, calc(76px + 32vh - 76.46px))) !important;\n  }\n}\n@media (min-width: 481px) and (max-width: 599px) {\n  .hero-inner {\n    justify-content: flex-start !important;\n    padding-top: min(293.1px, max(80px, calc(76px + 32vh - 67.18px))) !important;\n  }\n}\n@media (min-width: 431px) and (max-width: 480px) {\n  .hero-inner {\n    justify-content: flex-start !important;\n    padding-top: min(293.09px, max(80px, calc(76px + 32vh - 60.49px))) !important;\n  }\n}\n@media (min-width: 391px) and (max-width: 430px) {\n  .hero-inner {\n    justify-content: flex-start !important;\n    padding-top: min(293.09px, max(80px, calc(76px + 32vh - 60.49px))) !important;\n  }\n}\n@media (min-width: 376px) and (max-width: 390px) {\n  .hero-inner {\n    justify-content: flex-start !important;\n    padding-top: min(268.5px, max(80px, calc(76px + 32vh - 56.665px))) !important;\n  }\n}\n@media (min-width: 361px) and (max-width: 375px) {\n  .hero-inner {\n    justify-content: flex-start !important;\n    padding-top: min(259.5px, max(80px, calc(76px + 32vh - 55.275px))) !important;\n  }\n}\n@media (min-width: 321px) and (max-width: 360px) {\n  .hero-inner {\n    justify-content: flex-start !important;\n    padding-top: min(248.9px, max(80px, calc(76px + 32vh - 55.275px))) !important;\n  }\n}\n@media (max-width: 320px) {\n  .hero-inner {\n    justify-content: flex-start !important;\n    padding-top: min(202.89px, max(80px, calc(76px + 32vh - 55.275px))) !important;\n  }\n}\n\n/* ---- v254 typo: TABLET ONLY (768\u20131023) \u2014 from v253, typoTop \u221272px\n       (~0.75in) and typoLeft \u221248px (~0.5in). Floor keeps typo below the\n       138px header. Desktop typo unchanged. */\n@media (min-width: 768px) and (max-width: 1023px) {\n  .hero-inner {\n    justify-content: flex-start !important;\n    transform: none !important;\n    padding-top: max(\n      142px,\n      calc(138px + 0.4 * (100vh - 138px) + -4 * max(100vw / 2400, (100vh - 138px) / 1600) - 72px)\n    ) !important;\n  }\n}\n@media (min-width: 900px) and (max-width: 1023px) {\n  .hero-inner { padding-left: 248.1px !important; } /* v253 296.1 \u2212 48 */\n}\n@media (min-width: 769px) and (max-width: 899px) {\n  .hero-inner { padding-left: 157.17px !important; } /* v253 205.17 \u2212 48 */\n}\n@media (min-width: 768px) and (max-width: 768px) {\n  .hero-inner { padding-left: 150.45px !important; } /* v253 198.45 \u2212 48 */\n}\n\n/* ---- v254 typo contrast: ALL viewports \u2014 tight text-shadow, plus a\n       slight color lift toward higher-contrast cream (Aframe was cool gray\n       and the tagline sat at .92 opacity). No font/size/weight/tracking/position change. */\n.hero-brand,\n.hero-aframe,\n.hero-aframe em,\n.hero-lede {\n  text-shadow: 0 1px 2px rgba(0,0,0,.45), 0 0 1px rgba(0,0,0,.35) !important;\n}\n.hero-brand {\n  color: rgba(247,243,236,1) !important;\n  -webkit-text-fill-color: rgba(247,243,236,1) !important;\n}\n.hero-aframe,\n.hero-aframe em {\n  color: rgba(232,228,220,.98) !important;\n  -webkit-text-fill-color: rgba(232,228,220,.98) !important;\n}\n.hero-lede {\n  color: rgba(247,243,236,1) !important;\n  -webkit-text-fill-color: rgba(247,243,236,1) !important;\n}\n\n/* ---- v255: RESERVE ONLY \u2014 1024\u20131037 (the exact band where Reserve can\n       hang past the nav/layout box into the scrollbar gutter). Horizontal\n       padding 11.2px \u2192 6.2px (5px each side, 10px total). 8px left a 0.42px\n       overflow at 1024 with weather loaded (worst case 8.42px); 10px clears\n       it with ~1.6px slack. Label stays nowrap. 1038\u20131057 already sit inside\n       the nav box and are left unchanged so flex does not redistribute.\n       No other nav spacing, typo, or layout rules. */\n@media (min-width: 1024px) and (max-width: 1037px) {\n  #header-reserve,\n  nav .nav-end > a.btn-gold {\n    padding-left: 6.2px !important;\n    padding-right: 6.2px !important;\n  }\n}\n\n/* ---- v256 typo: MOBILE ONLY (\u2264767) \u2014 typoLeft \u221212px from v255.\n       typoTop unchanged. Desktop and tablet typo unchanged. */\n@media (min-width: 431px) and (max-width: 767px) {\n  .hero-inner { padding-left: 108.14px !important; } /* 120.14 \u2212 12 */\n}\n@media (min-width: 391px) and (max-width: 430px) {\n  .hero-inner { padding-left: 108.14px !important; } /* 120.14 \u2212 12 */\n}\n@media (min-width: 376px) and (max-width: 390px) {\n  .hero-inner { padding-left: 94.58px !important; } /* 106.58 \u2212 12 */\n}\n@media (min-width: 361px) and (max-width: 375px) {\n  .hero-inner { padding-left: 89.39px !important; } /* 101.39 \u2212 12 */\n}\n@media (min-width: 321px) and (max-width: 360px) {\n  .hero-inner { padding-left: 83.3px !important; } /* 95.3 \u2212 12 */\n}\n@media (max-width: 320px) {\n  .hero-inner { padding-left: 70.7px !important; } /* 82.7 \u2212 12 */\n}\n\n/* ---- v258 typo: TABLET ONLY (768–1023) — typoTop −96px from v257\n       (v254 already had −72px; this subtracts another 96px). Floor stays\n       142px (24px below the 138px header). typoLeft unchanged. Desktop\n       typo untouched. */\n@media (min-width: 768px) and (max-width: 1023px) {\n  .hero-inner {\n    justify-content: flex-start !important;\n    transform: none !important;\n    padding-top: max(\n      142px,\n      calc(138px + 0.4 * (100vh - 138px) + -4 * max(100vw / 2400, (100vh - 138px) / 1600) - 72px - 96px)\n    ) !important;\n  }\n}\n\n/* ---- v258 typo: MOBILE ONLY (≤767) — typoTop lands on the TOPMOST edge\n       of the middle window row, where the glass begins (nat y=594 of the\n       2400×1600 hero). Not draft option A or B. typoLeft stays v256.\n       Photo covers by height (offY=0), so\n       glassTopY = 76px + (594/1600) * photoH.\n       ≤480: photoH = 64svh → 76px + 23.76svh.\n       481–767: photoH = 64vh → 76px + 23.76vh. */\n@media (min-width: 481px) and (max-width: 767px) {\n  .hero-inner {\n    justify-content: flex-start !important;\n    padding-top: calc(76px + 23.76vh) !important;\n  }\n}\n@media (max-width: 480px) {\n  .hero-inner {\n    justify-content: flex-start !important;\n    padding-top: calc(76px + 23.76svh) !important;\n  }\n}\n\n/* draft-v260 typo — PREVIEW / NOT LIVE\n   Base: live v258 typo (v259 gallery never made it to production).\n   Desktop (≥1024) untouched.\n\n   Tablets 768–1023: typoLeft −24px from v258; typoTop +24px from v258.\n   Phones ≤767: first the upper-middle-left spot (typoLeft 22px, typoTop 32vh,\n   below the 76px header), then typoTop −24px (higher) and typoLeft −8px\n   (further left) → typoLeft 14px, typoTop max(84px, 32vh - 24px).\n   Keep existing text-shadow. Do not clip at 320. */\n\n/* ---- v260 typo: TABLET typoLeft −24px from the live v258 (v253-after-48, later v258) bands ---- */\n@media (min-width: 900px) and (max-width: 1023px) {\n  .hero-inner { padding-left: 224.1px !important; } /* v258 248.1 − 24 */\n}\n@media (min-width: 769px) and (max-width: 899px) {\n  .hero-inner { padding-left: 133.17px !important; } /* v258 157.17 − 24 */\n}\n@media (min-width: 768px) and (max-width: 768px) {\n  .hero-inner { padding-left: 126.45px !important; } /* v258 150.45 − 24 */\n}\n\n/* ---- v260 typo: TABLET typoTop +24px from v258 glass/tablet rule; floor stays 142px ---- */\n@media (min-width: 768px) and (max-width: 1023px) {\n  .hero-inner {\n    justify-content: flex-start !important;\n    transform: none !important;\n    padding-top: max(\n      142px,\n      calc(138px + 0.4 * (100vh - 138px) + -4 * max(100vw / 2400, (100vh - 138px) / 1600) - 72px - 96px + 24px)\n    ) !important;\n  }\n}\n\n/* ---- v260 typo: MOBILE ≤767 — upper-middle left, then −24px typoTop and −8px typoLeft.\n       typoLeft 14px (22 − 8). typoTop max(84px, 32vh - 24px) so it stays below the\n       76px header (8px gap) and does not use option A/B or the v258 glass-top rule. */\n@media (max-width: 767px) {\n  .hero-inner {\n    justify-content: flex-start !important;\n    text-align: left !important;\n    transform: none !important;\n    padding-left: 14px !important;\n    padding-top: max(84px, calc(32vh - 24px)) !important;\n  }\n}\n\n/* draft-v261 typo — PREVIEW / NOT LIVE\n   Base: live v260 typo. Tablets (768–1023) and desktop (≥1024) unchanged.\n\n   Phones ≤767: typoLeft 14px → 24px (+10px, to the right).\n   typoTop max(84px, 32vh − 24px) → max(84px, 32vh − 40px) (16px higher).\n   Floor stays 84px (76px header + 8px gap). Keep existing text-shadow.\n   Do not clip at 320. */\n\n@media (max-width: 767px) {\n  .hero-inner {\n    justify-content: flex-start !important;\n    text-align: left !important;\n    transform: none !important;\n    padding-left: 24px !important;\n    padding-top: max(84px, calc(32vh - 40px)) !important;\n  }\n}\n\n/* v262 typo — TABLET ONLY (768–1023)\n   typoTop +12px from live v261. typoLeft unchanged.\n   Phone (≤767) and desktop (≥1024) stay at v261. */\n\n@media (min-width: 768px) and (max-width: 1023px) {\n  .hero-inner {\n    justify-content: flex-start !important;\n    transform: none !important;\n    padding-top: max(\n      142px,\n      calc(138px + 0.4 * (100vh - 138px) + -4 * max(100vw / 2400, (100vh - 138px) / 1600) - 72px - 96px + 24px + 12px)\n    ) !important;\n  }\n}\n\n</style>";
    if (html.includes("</head>")) {
      html = html.replace("</head>", tightenCss + "</head>");
      changed = true;
    }
  }


  function applyV265DeckRemove(html) {
    /* v265: fully remove Deck shots from markup on ALL viewports:
       deck-smores-bc58.jpg, deck-hottub-view-bc58.jpg, and (Oliver 1:43)
       deck-grill-bc58.jpg. Keep grill.jpg. Drop any leftover v263 hide CSS. */
    if (!html || html.includes("bh-v265-deck-remove")) return { html: html, changed: false };
    var changed = false;

    function extractButtons(trackInner) {
      var buttons = [];
      var re = /<button\b[\s\S]*?<\/button>/gi;
      var m;
      while ((m = re.exec(trackInner))) buttons.push(m[0]);
      return buttons;
    }
    function slotOf(btn) {
      var m = /data-slot="([^"]+)"/.exec(btn);
      return m ? m[1] : "";
    }
    function fullOf(btn) {
      var m = /data-full="([^"]+)"/.exec(btn);
      return m ? m[1].split("?")[0] : "";
    }
    function rewriteGroup(html, groupId, transformFn) {
      var re = new RegExp(
        '(<div[^>]*\\bid="' + groupId + '"[^>]*>[\\s\\S]*?<div class="gc-track"[^>]*>)([\\s\\S]*?)(</div>)',
        "i"
      );
      var m = html.match(re);
      if (!m) return html;
      var buttons = extractButtons(m[2]);
      var next = transformFn(buttons.slice());
      if (!next) return html;
      var inner = "\n          " + next.join("\n          ") + "\n          ";
      changed = true;
      return html.replace(m[0], m[1] + inner + m[3]);
    }

    var dropFull = {
      "img/deck-smores-bc58.jpg": 1,
      "img/deck-hottub-view-bc58.jpg": 1,
      "img/deck-grill-bc58.jpg": 1
    };
    var dropSlot = {
      "gallery-13d-deck-10": 1,
      "gallery-13g-deck-14": 1,
      "gallery-13e-deck-11": 1
    };
    html = rewriteGroup(html, "gallery-deck", function (btns) {
      return btns.filter(function (b) {
        return !dropFull[fullOf(b)] && !dropSlot[slotOf(b)];
      });
    });

    if (html.indexOf('id="bh-v263-deck-hide"') !== -1) {
      html = html.replace(/<style id="bh-v263-deck-hide">[\s\S]*?<\/style>/g, "");
      changed = true;
    }
    if (changed && html.includes("</head>")) {
      html = html.replace("</head>", "<!-- bh-v265-deck-remove -->\n</head>");
    }
    return { html: html, changed: changed };
  }

  var v263 = applyV263DeckHide(html);
  html = v263.html;
  if (v263.changed) changed = true;

  var v264 = applyV264Gallery(html);
  html = v264.html;
  if (v264.changed) changed = true;


  function applyV266DeckSwap(html) {
    /* v266 FINAL: Deck order by v265 positions is 3, 1, 2, 4-10
       (chair-bc32, quandary, adirondack-bc58, then the rest).
       Oliver confirmed v265 #1 (quandary) is the patio-door view.
       Runs after v265 so the live 10-shot order is the starting point. */
    if (!html || html.includes("bh-v266-deck-swap")) return { html: html, changed: false };
    var changed = false;

    function extractButtons(trackInner) {
      var buttons = [];
      var re = /<button\b[\s\S]*?<\/button>/gi;
      var m;
      while ((m = re.exec(trackInner))) buttons.push(m[0]);
      return buttons;
    }
    function fullOf(btn) {
      var m = /data-full="([^"]+)"/.exec(btn);
      return m ? m[1].split("?")[0] : "";
    }
    function rewriteGroup(html, groupId, transformFn) {
      var re = new RegExp(
        '(<div[^>]*\\bid="' + groupId + '"[^>]*>[\\s\\S]*?<div class="gc-track"[^>]*>)([\\s\\S]*?)(</div>)',
        "i"
      );
      var m = html.match(re);
      if (!m) return html;
      var buttons = extractButtons(m[2]);
      var next = transformFn(buttons.slice());
      if (!next) return html;
      var inner = "\n          " + next.join("\n          ") + "\n          ";
      changed = true;
      return html.replace(m[0], m[1] + inner + m[3]);
    }

    html = rewriteGroup(html, "gallery-deck", function (btns) {
      /* Expect v265's 10-shot order. Require the three named files. */
      if (btns.length !== 10) return null;
      var iQ = -1, iA = -1, iC = -1, i;
      for (i = 0; i < btns.length; i++) {
        var f = fullOf(btns[i]);
        if (f === "img/deck-quandary.jpg") iQ = i;
        if (f === "img/deck-adirondack-bc58.jpg") iA = i;
        if (f === "img/deck-chair-bc32.jpg") iC = i;
      }
      if (iQ < 0 || iA < 0 || iC < 0) return null;
      var rest = [];
      for (i = 0; i < btns.length; i++) {
        if (i !== iQ && i !== iA && i !== iC) rest.push(btns[i]);
      }
      return [btns[iC], btns[iQ], btns[iA]].concat(rest);
    });

    if (changed && html.includes("</head>")) {
      html = html.replace("</head>", "<!-- bh-v266-deck-swap -->\n</head>");
    }
    return { html: html, changed: changed };
  }

  var v265 = applyV265DeckRemove(html);
  html = v265.html;
  if (v265.changed) changed = true;


  function applyV267LoftGrade(html) {
    /* v267: point loft #8,#9,#12,#13 at regraded *-bc67 JPEGs. */
    if (!html || html.includes("bh-v267-loft-grade")) return { html: html, changed: false };
    var pairs = [
      ["img/loft-west-bc47.jpg?v=bc47", "img/loft-west-bc67.jpg?v=bc67"],
      ["img/looking-up-to-loft.jpg?v=i54", "img/looking-up-to-loft-bc67.jpg?v=bc67"],
      ["img/foosball.jpg?v=sharp1", "img/foosball-bc67.jpg?v=bc67"],
      ["img/xbox.jpg?v=i40", "img/xbox-bc67.jpg?v=bc67"],
      ["img/loft-west-bc47.jpg", "img/loft-west-bc67.jpg"],
      ["img/looking-up-to-loft.jpg", "img/looking-up-to-loft-bc67.jpg"],
      ["img/foosball.jpg", "img/foosball-bc67.jpg"],
      ["img/xbox.jpg", "img/xbox-bc67.jpg"]
    ];
    var changed = false;
    for (var i = 0; i < pairs.length; i++) {
      if (html.indexOf(pairs[i][0]) !== -1) {
        html = html.split(pairs[i][0]).join(pairs[i][1]);
        changed = true;
      }
    }
    if (changed && html.includes("</head>")) {
      html = html.replace("</head>", "<!-- bh-v267-loft-grade -->\n</head>");
    }
    return { html: html, changed: changed };
  }

  var v266 = applyV266DeckSwap(html);
  html = v266.html;
  if (v266.changed) changed = true;


  function applyV268BathGrade(html) {
    /* v268: point baths #1,#4,#7 at regraded *-bc68 JPEGs. */
    if (!html || html.includes("bh-v268-bath-grade")) return { html: html, changed: false };
    var pairs = [
      ["img/bath-ensuite-bc49.jpg?v=bc49", "img/bath-ensuite-bc68.jpg?v=bc68"],
      ["img/bath-hall-bc47.jpg?v=i85", "img/bath-hall-bc68.jpg?v=bc68"],
      ["img/bath-primary-bc47.jpg?v=bc47", "img/bath-primary-bc68.jpg?v=bc68"],
      ["img/bath-ensuite-bc49.jpg", "img/bath-ensuite-bc68.jpg"],
      ["img/bath-hall-bc47.jpg", "img/bath-hall-bc68.jpg"],
      ["img/bath-primary-bc47.jpg", "img/bath-primary-bc68.jpg"]
    ];
    var changed = false;
    for (var i = 0; i < pairs.length; i++) {
      if (html.indexOf(pairs[i][0]) !== -1) {
        html = html.split(pairs[i][0]).join(pairs[i][1]);
        changed = true;
      }
    }
    if (changed && html.includes("</head>")) {
      html = html.replace("</head>", "<!-- bh-v268-bath-grade -->\n</head>");
    }
    return { html: html, changed: changed };
  }

  var v267 = applyV267LoftGrade(html);
  html = v267.html;
  if (v267.changed) changed = true;


  function applyV269BedGrade(html) {
    /* v269: point bedrooms #9,#14 at regraded *-bc69 JPEGs. */
    if (!html || html.includes("bh-v269-bed-grade")) return { html: html, changed: false };
    var pairs = [
      ["img/king-barn.jpg?v=sharp1", "img/king-barn-bc69.jpg?v=bc69"],
      ["img/bunk-bc47.jpg?v=i85", "img/bunk-bc69.jpg?v=bc69"],
      ["img/king-barn.jpg", "img/king-barn-bc69.jpg"],
      ["img/bunk-bc47.jpg", "img/bunk-bc69.jpg"]
    ];
    var changed = false;
    for (var i = 0; i < pairs.length; i++) {
      if (html.indexOf(pairs[i][0]) !== -1) {
        html = html.split(pairs[i][0]).join(pairs[i][1]);
        changed = true;
      }
    }
    if (changed && html.includes("</head>")) {
      html = html.replace("</head>", "<!-- bh-v269-bed-grade -->\n</head>");
    }
    return { html: html, changed: changed };
  }

  var v268 = applyV268BathGrade(html);
  html = v268.html;
  if (v268.changed) changed = true;


  function applyV270DeckGrade(html) {
    /* v270: regrade deck #7 grill and #8 cornhole; light deblur #5 dusk hot tub. */
    if (!html || html.includes("bh-v270-deck-grade")) return { html: html, changed: false };
    var pairs = [
      ["img/grill.jpg?v=sharp1", "img/grill-bc70.jpg?v=bc70"],
      ["img/cornhole.jpg?v=sharp1", "img/cornhole-bc70.jpg?v=bc70"],
      ["img/hottub-evening-bc47.jpg?v=i85", "img/hottub-evening-bc70.jpg?v=bc70"],
      ["img/grill.jpg", "img/grill-bc70.jpg"],
      ["img/cornhole.jpg", "img/cornhole-bc70.jpg"],
      ["img/hottub-evening-bc47.jpg", "img/hottub-evening-bc70.jpg"]
    ];
    var changed = false;
    for (var i = 0; i < pairs.length; i++) {
      if (html.indexOf(pairs[i][0]) !== -1) {
        html = html.split(pairs[i][0]).join(pairs[i][1]);
        changed = true;
      }
    }
    if (changed && html.includes("</head>")) {
      html = html.replace("</head>", "<!-- bh-v270-deck-grade -->\n</head>");
    }
    return { html: html, changed: changed };
  }

  var v269 = applyV269BedGrade(html);
  html = v269.html;
  if (v269.changed) changed = true;


  function applyV271ExteriorGrade(html) {
    /* v271: regrade exterior #1-6 toward #7/#8 look; light deblur #3 dusk. Leave #7/#8 and hero.jpg untouched. */
    if (!html || html.includes("bh-v271-exterior-grade")) return { html: html, changed: false };
    var pairs = [
      ["img/hero-poster-2400.jpg?v=i40", "img/hero-poster-2400-bc71.jpg?v=bc71"],
      ["img/hero-poster.jpg?v=sharp1", "img/hero-poster-bc71.jpg?v=bc71"],
      ["img/airbnb-exterior-winter-side.jpg?v=sharp1", "img/airbnb-exterior-winter-side-bc71.jpg?v=bc71"],
      ["img/airbnb-exterior-twilight-snow.jpg?v=sharp1", "img/airbnb-exterior-twilight-snow-bc71.jpg?v=bc71"],
      ["img/exterior-snow-hottub.jpg?v=hero4", "img/exterior-snow-hottub-bc71.jpg?v=bc71"],
      ["img/exterior-summer.jpg?v=sharp1", "img/exterior-summer-bc71.jpg?v=bc71"],
      ["img/exterior.jpg?v=sharp1", "img/exterior-bc71.jpg?v=bc71"],
      ["img/hero-poster-2400.jpg", "img/hero-poster-2400-bc71.jpg"],
      ["img/hero-poster.jpg", "img/hero-poster-bc71.jpg"],
      ["img/airbnb-exterior-winter-side.jpg", "img/airbnb-exterior-winter-side-bc71.jpg"],
      ["img/airbnb-exterior-twilight-snow.jpg", "img/airbnb-exterior-twilight-snow-bc71.jpg"],
      ["img/exterior-snow-hottub.jpg", "img/exterior-snow-hottub-bc71.jpg"],
      ["img/exterior-summer.jpg", "img/exterior-summer-bc71.jpg"],
      ["img/exterior.jpg", "img/exterior-bc71.jpg"]
    ];
    var changed = false;
    for (var i = 0; i < pairs.length; i++) {
      if (html.indexOf(pairs[i][0]) !== -1) {
        html = html.split(pairs[i][0]).join(pairs[i][1]);
        changed = true;
      }
    }
    if (changed && html.includes("</head>")) {
      html = html.replace("</head>", "<!-- bh-v271-exterior-grade -->\n</head>");
    }
    return { html: html, changed: changed };
  }

  var v270 = applyV270DeckGrade(html);
  html = v270.html;
  if (v270.changed) changed = true;

  function applyV272Gallery(html) {
    /* v272 STAGE: remove baths #9+#11 and loft #7 (live v271 order);
       move deck Adirondack to #1; dusk L-sharpen; restore grill.jpg;
       restore loft 8/9/11/12/13 originals; soften loft 10 arcade;
       regrade bedrooms #9 king-barn-bc72; unify gold accents to the
       measured Reserve yellow #C8923A. Idempotent. */
    if (!html || html.includes("bh-v272-gallery")) return { html: html, changed: false };
    var changed = false;

    function extractButtons(trackInner) {
      var buttons = [];
      var re = /<button\b[\s\S]*?<\/button>/gi;
      var m;
      while ((m = re.exec(trackInner))) buttons.push(m[0]);
      return buttons;
    }
    function fullOf(btn) {
      var m = /data-full="([^"]+)"/.exec(btn);
      return m ? m[1].split("?")[0] : "";
    }
    function rewriteGroup(html, groupId, transformFn) {
      var re = new RegExp(
        '(<div[^>]*\\bid="' + groupId + '"[^>]*>[\\s\\S]*?<div class="gc-track"[^>]*>)([\\s\\S]*?)(</div>)',
        "i"
      );
      var m = html.match(re);
      if (!m) return html;
      var buttons = extractButtons(m[2]);
      var next = transformFn(buttons.slice());
      if (!next) return html;
      var inner = "\n          " + next.join("\n          ") + "\n          ";
      changed = true;
      return html.replace(m[0], m[1] + inner + m[3]);
    }

    html = rewriteGroup(html, "gallery-baths", function (btns) {
      var drop = {
        "img/bath-primary-bc58-2.jpg": 1,
        "img/bath-primary-bc58-4.jpg": 1
      };
      var next = btns.filter(function (b) { return !drop[fullOf(b)]; });
      if (next.length === btns.length) return null;
      return next;
    });

    html = rewriteGroup(html, "gallery-loft", function (btns) {
      var next = btns.filter(function (b) { return fullOf(b) !== "img/loft-peak-rail-bc58.jpg"; });
      if (next.length === btns.length) return null;
      return next;
    });

    html = rewriteGroup(html, "gallery-deck", function (btns) {
      if (btns.length !== 10) return null;
      var f0 = fullOf(btns[0]), f1 = fullOf(btns[1]), f2 = fullOf(btns[2]);
      if (f0 === "img/deck-adirondack-bc58.jpg" && f1 === "img/deck-chair-bc32.jpg" && f2 === "img/deck-quandary.jpg") {
        return null;
      }
      if (f0 === "img/deck-chair-bc32.jpg" && f1 === "img/deck-quandary.jpg" && f2 === "img/deck-adirondack-bc58.jpg") {
        return [btns[2], btns[0], btns[1]].concat(btns.slice(3));
      }
      return null;
    });

    html = rewriteGroup(html, "gallery-bedrooms", function (btns) {
      /* Final 16-shot order (live v271 filenames):
         primary-1,2,3,4,5,6,7, king-barn, king2-1, primary-8, king2-2,3,4,
         bunk-bc69, bed-bunk-bc58-1, bunk-bc10.
         Includes the #15/#16 swap and moving primary-8 (lower-level king)
         between king2-1 and king2-2. Count unchanged. Idempotent. */
      if (btns.length !== 16) return null;
      function find(name) {
        for (var i = 0; i < btns.length; i++) {
          if (fullOf(btns[i]) === name) return i;
        }
        return -1;
      }
      var barn = find("img/king-barn-bc72.jpg") >= 0 ? "img/king-barn-bc72.jpg" : "img/king-barn-bc69.jpg";
      var order = [
        "img/bed-primary-bc58-1.jpg",
        "img/bed-primary-bc58-2.jpg",
        "img/bed-primary-bc58-3.jpg",
        "img/bed-primary-bc58-4.jpg",
        "img/bed-primary-bc58-5.jpg",
        "img/bed-primary-bc58-6.jpg",
        "img/bed-primary-bc58-7.jpg",
        barn,
        "img/bed-king2-bc58-1.jpg",
        "img/bed-primary-bc58-8.jpg",
        "img/bed-king2-bc58-2.jpg",
        "img/bed-king2-bc58-3.jpg",
        "img/bed-king2-bc58-4.jpg",
        "img/bunk-bc69.jpg",
        "img/bed-bunk-bc58-1.jpg",
        "img/bunk-bc10.jpg"
      ];
      var idxs = order.map(find);
      for (var j = 0; j < idxs.length; j++) {
        if (idxs[j] < 0) return null;
      }
      var already = true;
      for (j = 0; j < idxs.length; j++) {
        if (idxs[j] !== j) { already = false; break; }
      }
      if (already) return null;
      return idxs.map(function (i) { return btns[i]; });
    });

    /* bed-primary-bc58-8 is the lower-level king (brass lamp). Filename kept.
       Pixels: brass dome lamp, wood nightstand, upholstered headboard,
       abstract print; no pines, no teal throw, lamp is not black. */
    (function () {
      var re = /<button\b[^>]*data-full="img\/bed-primary-bc58-8\.jpg[^"]*"[^>]*>[\s\S]*?<\/button>/i;
      var m = html.match(re);
      if (!m) return;
      var btn = m[0];
      var next = btn;
      var newCap = "Lower level king en-suite";
      var newAlt = "Lower-level king suite with a brass dome lamp, wood nightstand, and an abstract print";
      if (!/data-cap="Lower level king en-suite"/.test(next)) {
        next = next.replace(/data-cap="[^"]*"/, 'data-cap="' + newCap + '"');
      }
      if (next.indexOf('alt="' + newAlt + '"') === -1) {
        next = next.replace(/alt="[^"]*"/, 'alt="' + newAlt + '"');
      }
      if (next !== btn) {
        html = html.replace(btn, next);
        changed = true;
      }
    })();

    var pairs = [
      ["img/hottub-evening-bc70.jpg?v=bc70", "img/hottub-evening-bc72-sharp.jpg?v=bc72"],
      ["img/hottub-evening-bc70.jpg", "img/hottub-evening-bc72-sharp.jpg"],
      ["img/hottub-evening-bc47.jpg?v=i85", "img/hottub-evening-bc72-sharp.jpg?v=bc72"],
      ["img/hottub-evening-bc47.jpg", "img/hottub-evening-bc72-sharp.jpg"],
      ["img/grill-bc70.jpg?v=bc70", "img/grill.jpg?v=bc72"],
      ["img/grill-bc70.jpg", "img/grill.jpg"],
      ["img/grill.jpg?v=sharp1", "img/grill.jpg?v=bc72"],
      ["img/king-barn-bc69.jpg?v=bc69", "img/king-barn-bc72.jpg?v=bc72"],
      ["img/king-barn-bc69.jpg", "img/king-barn-bc72.jpg"],
      ["img/king-barn.jpg?v=sharp1", "img/king-barn-bc72.jpg?v=bc72"],
      ["img/loft-west-bc67.jpg?v=bc67", "img/loft-west.jpg?v=bc72"],
      ["img/loft-west-bc67.jpg", "img/loft-west.jpg"],
      ["img/loft-west-bc47.jpg?v=bc47", "img/loft-west.jpg?v=bc72"],
      ["img/loft-west-bc47.jpg", "img/loft-west.jpg"],
      ["img/looking-up-to-loft-bc67.jpg?v=bc67", "img/looking-up-to-loft.jpg?v=bc72"],
      ["img/looking-up-to-loft-bc67.jpg", "img/looking-up-to-loft.jpg"],
      ["img/looking-up-to-loft.jpg?v=i54", "img/looking-up-to-loft.jpg?v=bc72"],
      ["img/loft-arcade-bc58.jpg?v=bc58", "img/loft-arcade-bc72.jpg?v=bc72"],
      ["img/loft-arcade-bc58.jpg", "img/loft-arcade-bc72.jpg"],
      ["img/board-games.jpg?v=sharp1", "img/board-games.jpg?v=bc72"],
      ["img/foosball-bc67.jpg?v=bc67", "img/foosball.jpg?v=bc72"],
      ["img/foosball-bc67.jpg", "img/foosball.jpg"],
      ["img/foosball.jpg?v=sharp1", "img/foosball.jpg?v=bc72"],
      ["img/xbox-bc67.jpg?v=bc67", "img/xbox.jpg?v=bc72"],
      ["img/xbox-bc67.jpg", "img/xbox.jpg"],
      ["img/xbox.jpg?v=i40", "img/xbox.jpg?v=bc72"]
    ];
    for (var i = 0; i < pairs.length; i++) {
      if (html.indexOf(pairs[i][0]) !== -1) {
        html = html.split(pairs[i][0]).join(pairs[i][1]);
        changed = true;
      }
    }

    /* Unify every gold/yellow accent to the measured Reserve yellow
       #C8923A / rgb(200,146,58), keeping each declaration's existing alpha.
       --gold is already #C8923A. Do not touch --bronze, photos, or logos.
       Contact-form .btn-gold stays charcoal (it is not yellow). */
    var goldPairs = [
      ["#D4A853", "#C8923A"],
      ["#d4a853", "#C8923A"],
      ["rgba(201,169,110,", "rgba(200,146,58,"],
      ["rgba(201, 169, 110,", "rgba(200, 146, 58,"],
      ["rgba(201,169,98,", "rgba(200,146,58,"],
      ["rgba(201, 169, 98,", "rgba(200, 146, 58,"]
    ];
    for (var g = 0; g < goldPairs.length; g++) {
      if (html.indexOf(goldPairs[g][0]) !== -1) {
        html = html.split(goldPairs[g][0]).join(goldPairs[g][1]);
        changed = true;
      }
    }
    if (changed && html.includes("</head>") && html.indexOf('id="bh-v272-gold"') === -1) {
      html = html.replace(
        "</head>",
        "<style id=\"bh-v272-gold\">:root{--gold:#C8923A;--gold-light:#C8923A}</style>\n<!-- bh-v272-gallery -->\n</head>"
      );
    } else if (changed && html.includes("</head>") && html.indexOf("bh-v272-gallery") === -1) {
      html = html.replace("</head>", "<!-- bh-v272-gallery -->\n</head>");
    }
    return { html: html, changed: changed };
  }


  function applyV273Gallery(html) {
    /* v273 STAGE:
       1) #gallery-living: move living-window-bc58 between living-stairs-bc58
          and living-desk-bc58. Count 16.
       2) #gallery-deck: move both sauna shots (sauna-barrel-bc36-full,
          deck-sauna-roof-bc58) between deck-quandary and hottub-quandary-bc34.
          S'mores #11 is left out until the source file is present.
       3) Swap header .site-logo to img/logo-open-a-peaks.jpg (open gold A).
          Favicon/apple-touch/og unchanged. No v16c4 asset.
       4) Weather chip uses Open-Meteo current temp + weather_code; 7-day
          panel unchanged; refetch every 15 min and on visibility.
       Captions/alts stay with their buttons. Idempotent. */
    if (!html || html.includes("bh-v273-gallery")) return { html: html, changed: false };
    var changed = false;

    function extractButtons(trackInner) {
      var buttons = [];
      var re = /<button\b[\s\S]*?<\/button>/gi;
      var m;
      while ((m = re.exec(trackInner))) buttons.push(m[0]);
      return buttons;
    }
    function fullOf(btn) {
      var m = /data-full="([^"]+)"/.exec(btn);
      return m ? m[1].split("?")[0] : "";
    }
    function rewriteGroup(html, groupId, transformFn) {
      var re = new RegExp(
        '(<div[^>]*\\bid="' + groupId + '"[^>]*>[\\s\\S]*?<div class="gc-track"[^>]*>)([\\s\\S]*?)(</div>)',
        "i"
      );
      var m = html.match(re);
      if (!m) return html;
      var buttons = extractButtons(m[2]);
      var next = transformFn(buttons.slice());
      if (!next) return html;
      var inner = "\n          " + next.join("\n          ") + "\n          ";
      changed = true;
      return html.replace(m[0], m[1] + inner + m[3]);
    }

    html = rewriteGroup(html, "gallery-living", function (btns) {
      if (btns.length !== 16) return null;
      function find(name) {
        for (var i = 0; i < btns.length; i++) {
          if (fullOf(btns[i]) === name) return i;
        }
        return -1;
      }
      var order = [
        "img/kitchen-wide-bc58.jpg",
        "img/kitchen-range-bc58.jpg",
        "img/kitchen-dining-set-bc58.jpg",
        "img/kitchen-dining-view-bc58.jpg",
        "img/kitchen-island-stools-bc58.jpg",
        "img/kitchen-table-overhead-bc58.jpg",
        "img/dining-living-bc19.jpg",
        "img/kitchen-coffee-bc58.jpg",
        "img/kitchen-mugs-bc58.jpg",
        "img/kitchen-nespresso-bc58.jpg",
        "img/living-sofa-bc58.jpg",
        "img/living-fireplace-bc58.jpg",
        "img/living-overhead-bc58.jpg",
        "img/living-stairs-bc58.jpg",
        "img/living-window-bc58.jpg",
        "img/living-desk-bc58.jpg"
      ];
      var idxs = order.map(find);
      for (var j = 0; j < idxs.length; j++) {
        if (idxs[j] < 0) return null;
      }
      var already = true;
      for (j = 0; j < idxs.length; j++) {
        if (idxs[j] !== j) { already = false; break; }
      }
      if (already) return null;
      return idxs.map(function (i) { return btns[i]; });
    });

    /* Deck: move both sauna shots between deck-quandary and hottub-quandary-bc34.
       Also append deck-smores-bc299 (Oliver Basecamp Visual 299) at the end when
       that button is already present, or when we inject it below. Idempotent. */
    function deckFindName(btns, names) {
      for (var n = 0; n < names.length; n++) {
        for (var i = 0; i < btns.length; i++) {
          if (fullOf(btns[i]) === names[n]) return names[n];
        }
      }
      return null;
    }
    function deckTargetOrder(btns) {
      var barrel = deckFindName(btns, ["img/sauna-barrel-bc36-full.jpg", "img/sauna-barrel-bc36.jpg"]);
      var dusk = deckFindName(btns, ["img/hottub-evening-bc72-sharp.jpg", "img/hottub-evening-bc70.jpg", "img/hottub-evening-bc47.jpg"]);
      var grill = deckFindName(btns, ["img/grill.jpg", "img/grill-bc70.jpg"]);
      var smores = deckFindName(btns, ["img/deck-smores-bc299.jpg"]);
      if (!barrel || !dusk || !grill) return null;
      var order = [
        "img/deck-adirondack-bc58.jpg",
        "img/deck-chair-bc32.jpg",
        "img/deck-quandary.jpg",
        barrel,
        "img/deck-sauna-roof-bc58.jpg",
        "img/hottub-quandary-bc34.jpg",
        dusk,
        "img/deck-towels-bc58.jpg",
        grill,
        "img/cornhole-bc70.jpg"
      ];
      if (smores) order.push(smores);
      return order;
    }

    /* Inject the s'mores button once, at the end, if the markup is still
       missing it. The JPEG itself must already be in the draft img tree;
       we do not invent pixels here. */
    (function () {
      if (/data-full="img\/deck-smores-bc299\.jpg/.test(html)) return;
      /* injection is enabled only when the worker is later given the file
         in the assets tree; the button is still added so a subsequent
         preview that serves drafts/v273/img can pick it up. Disabled until
         the source file is present — see apply preview / staging notes.
         Keep this block as a no-op unless html opts in via a real append
         performed above when the file exists on disk at apply time.
         (Runtime Workers have no filesystem, so injection belongs here
         only when we are ready to ship the JPEG.) */
    })();

    html = rewriteGroup(html, "gallery-deck", function (btns) {
      var shotBtns = [];
      for (var i = 0; i < btns.length; i++) {
        if (/data-full=/.test(btns[i])) shotBtns.push(btns[i]);
      }
      var order = deckTargetOrder(shotBtns);
      if (!order || shotBtns.length !== order.length) return null;
      function find(name) {
        for (var i = 0; i < shotBtns.length; i++) {
          if (fullOf(shotBtns[i]) === name) return i;
        }
        return -1;
      }
      var idxs = order.map(find);
      for (var j = 0; j < idxs.length; j++) {
        if (idxs[j] < 0) return null;
      }
      var already = true;
      for (j = 0; j < idxs.length; j++) {
        if (idxs[j] !== j) { already = false; break; }
      }
      if (already) return null;
      return idxs.map(function (i) { return shotBtns[i]; });
    });


    /* Header logo: swap only the nav .site-logo asset. Favicon / apple-touch /
       og stay on logo-mark-nav.png. Alt becomes "Breckhaus Aframe". */
    (function () {
      var re = /<img\b[^>]*class="site-logo"[^>]*>/i;
      var m = html.match(re);
      if (!m) return;
      var img = m[0];
      if (img.indexOf("logo-open-a-peaks") !== -1 && img.indexOf('alt="Breckhaus Aframe"') !== -1) return;
      var next = img;
      next = next.replace(/\s+srcset="[^"]*"/, "").replace(/\s+sizes="[^"]*"/, "");
      next = next.replace(/src="[^"]*"/, 'src="img/logo-open-a-peaks.jpg?v=bc73"');
      if (/alt="/.test(next)) next = next.replace(/alt="[^"]*"/, 'alt="Breckhaus Aframe"');
      else next = next.replace("<img", '<img alt="Breckhaus Aframe"');
      if (next !== img) {
        html = html.replace(img, next);
        changed = true;
      }
    })();

    /* Weather chip: current temp + weather_code; 7-day panel unchanged. */
    (function () {
      var re = /<script\b[^>]*id="bh-wx-7day-js"[^>]*>[\s\S]*?<\/script>/i;
      var m = html.match(re);
      if (!m) return;
      if (m[0].indexOf("bh-wx-now-v273") !== -1 && m[0].indexOf("current=temperature_2m,weather_code") !== -1) return;
      html = html.replace(m[0], "<script id=\"bh-wx-7day-js\">(function () {\n  var root = document.getElementById(\"bh-wx\");\n  var btn = document.getElementById(\"bh-wx-trigger\");\n  var panel = document.getElementById(\"bh-wx-panel\");\n  var daysEl = document.getElementById(\"bh-wx-days\");\n  if (!root || !btn || !panel || !daysEl) return;\n  var DAYS = [\"Sun\", \"Mon\", \"Tue\", \"Wed\", \"Thu\", \"Fri\", \"Sat\"];\n  function pad(n) { return n < 10 ? \"0\" + n : String(n); }\n  function label(iso) {\n    var p = iso.split(\"-\");\n    var m = +p[1], d = +p[2];\n    var dt = new Date(Date.UTC(+p[0], m - 1, d, 12));\n    return DAYS[dt.getUTCDay()] + \" \" + pad(m) + \"/\" + pad(d);\n  }\n  function icon(code) {\n    var c = +code;\n    if (c === 0) return '<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"4\" fill=\"currentColor\"/><g stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" fill=\"none\"><path d=\"M12 2v2.2M12 19.8V22M2 12h2.2M19.8 12H22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6\"/></g></svg>';\n    if (c === 1 || c === 2) return '<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><circle cx=\"9\" cy=\"10\" r=\"3.2\" fill=\"currentColor\"/><path fill=\"currentColor\" d=\"M8 16.5h9.2a3.3 3.3 0 0 0 .2-6.6 4.4 4.4 0 0 0-8.3-1.5A3.6 3.6 0 0 0 8 16.5z\" opacity=\".9\"/></svg>';\n    if (c >= 71 && c <= 77 || c >= 85 && c <= 86) return '<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M7 11.8h10a3.2 3.2 0 0 0 .2-6.4 4.3 4.3 0 0 0-8.2-1.4A3.5 3.5 0 0 0 7 11.8z\"/><g stroke=\"currentColor\" stroke-width=\"1.4\" stroke-linecap=\"round\" fill=\"none\"><path d=\"M9 14l.7.7L9 15.4l-.7-.7zm3.2.4l.7.7-.7.7-.7-.7zm3-.3l.7.7-.7.7-.7-.7z\"/></g></svg>';\n    if (c >= 51 && c <= 67 || c >= 80 && c <= 82) return '<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M7 12.5h10a3.2 3.2 0 0 0 .2-6.4 4.3 4.3 0 0 0-8.2-1.4A3.5 3.5 0 0 0 7 12.5z\"/><g stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" fill=\"none\"><path d=\"M9 14.5v3M12 15v3.2M15 14.5v3\"/></g></svg>';\n    if (c >= 95) return '<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M7 12h10a3.2 3.2 0 0 0 .2-6.4 4.3 4.3 0 0 0-8.2-1.4A3.5 3.5 0 0 0 7 12z\"/><path fill=\"currentColor\" d=\"M11.2 13.2h2.1l-1.5 3.1h1.5L10.8 21l1.1-4.2H10z\"/></svg>';\n    return '<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M7.2 17h10a3.6 3.6 0 0 0 .25-7.2 4.8 4.8 0 0 0-9.1-1.6A3.9 3.9 0 0 0 7.2 17z\"/></svg>';\n  }\n  function setOpen(on) {\n    if (on) { root.setAttribute(\"open\", \"\"); btn.setAttribute(\"aria-expanded\", \"true\"); panel.hidden = false; panel.scrollTop = 0; }\n    else { root.removeAttribute(\"open\"); btn.setAttribute(\"aria-expanded\", \"false\"); panel.hidden = true; }\n  }\n  btn.addEventListener(\"click\", function (e) { e.preventDefault(); e.stopPropagation(); setOpen(!root.hasAttribute(\"open\")); });\n  document.addEventListener(\"pointerdown\", function (e) { if (!root.contains(e.target)) setOpen(false); }, true);\n  document.addEventListener(\"keydown\", function (e) { if (e.key === \"Escape\") setOpen(false); });\n  /* bh-wx-now-v273: chip uses current temp + weather_code; 7-day panel unchanged */\n  var url = \"https://api.open-meteo.com/v1/forecast?latitude=39.4817&longitude=-106.0384&daily=weather_code,temperature_2m_max,temperature_2m_min&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=America%2FDenver&forecast_days=7\";\n  function applyWx(data) {\n    var d = data && data.daily;\n    if (!d || !d.time || !d.time.length) throw new Error(\"shape\");\n    var cur = data.current;\n    var hasNow = cur && cur.temperature_2m != null && isFinite(+cur.temperature_2m);\n    var nowTemp = hasNow ? Math.round(+cur.temperature_2m) : Math.round(d.temperature_2m_max[0]);\n    var nowCode = hasNow && cur.weather_code != null ? cur.weather_code : d.weather_code[0];\n    var iconEl = btn.querySelector(\".bh-wx-icon\");\n    var hiEl = btn.querySelector(\".bh-wx-hi\");\n    if (iconEl) iconEl.innerHTML = icon(nowCode);\n    if (hiEl) hiEl.textContent = nowTemp + \"\u00b0\";\n    var labelText = hasNow\n      ? (\"Now in Breckenridge: \" + nowTemp + \"\u00b0F\")\n      : (\"Today's high in Breckenridge: \" + nowTemp + \"\u00b0F\");\n    btn.setAttribute(\"aria-label\", labelText);\n    btn.setAttribute(\"title\", labelText);\n    var __bhWxDate = btn.querySelector(\".bh-wx-date\");\n    if (__bhWxDate) { __bhWxDate.textContent = \"\"; __bhWxDate.hidden = true; }\n    var html = \"\";\n    for (var i = 0; i < Math.min(7, d.time.length); i++) {\n      html += '<div class=\"bh-wx-day\"><span class=\"bh-wx-dlabel\">' + label(d.time[i]) + '</span><span class=\"bh-wx-icon\" aria-hidden=\"true\">' + icon(d.weather_code[i]) + '</span><span class=\"bh-wx-hi\">' + Math.round(d.temperature_2m_max[i]) + '\u00b0</span><span class=\"bh-wx-lo\">' + Math.round(d.temperature_2m_min[i]) + '\u00b0</span></div>';\n    }\n    daysEl.innerHTML = html;\n    root.setAttribute(\"data-state\", \"ready\");\n  }\n  function loadWx() {\n    fetch(url, { credentials: \"omit\" }).then(function (r) {\n      if (!r.ok) throw new Error(\"wx\");\n      return r.json();\n    }).then(applyWx).catch(function () {\n      root.setAttribute(\"data-state\", \"error\");\n      var __bhWxDate = btn.querySelector(\".bh-wx-date\");\n      if (__bhWxDate) { __bhWxDate.hidden = true; }\n    });\n  }\n  loadWx();\n  setInterval(loadWx, 15 * 60 * 1000);\n  document.addEventListener(\"visibilitychange\", function () {\n    if (document.visibilityState === \"visible\") loadWx();\n  });\n})();</script>");
      changed = true;
    })();

    if (changed && html.includes("</head>")) {
      html = html.replace("</head>", "<!-- bh-v273-gallery -->\n</head>");
    }
    return { html: html, changed: changed };
  }

  function applyV274Gallery(html) {
    /* v274 STAGE ONLY: bedrooms
       - remove button for bed-primary-bc58-6 (coffee cart and mugs); do not delete the file
       - move bed-king2-bc58-4 between king2-2 and king2-3
       - move bunk-bc69 between bed-bunk-bc58-1 and bunk-bc10
       Final 15-shot order. All 75. Captions/alts stay with buttons.
       Lightbox, All-view, and filter counts follow the group DOM. Idempotent. */
    if (!html || html.includes("bh-v274-gallery")) return { html: html, changed: false };
    var changed = false;

    function extractButtons(trackInner) {
      var buttons = [];
      var re = /<button\b[\s\S]*?<\/button>/gi;
      var m;
      while ((m = re.exec(trackInner))) buttons.push(m[0]);
      return buttons;
    }
    function fullOf(btn) {
      var m = /data-full="([^"]+)"/.exec(btn);
      return m ? m[1].split("?")[0] : "";
    }
    function rewriteGroup(html, groupId, transformFn) {
      var re = new RegExp(
        '(<div[^>]*\\bid="' + groupId + '"[^>]*>[\\s\\S]*?<div class="gc-track"[^>]*>)([\\s\\S]*?)(</div>)',
        "i"
      );
      var m = html.match(re);
      if (!m) return html;
      var buttons = extractButtons(m[2]);
      var next = transformFn(buttons.slice());
      if (!next) return html;
      var inner = "\n          " + next.join("\n          ") + "\n          ";
      changed = true;
      return html.replace(m[0], m[1] + inner + m[3]);
    }

    html = rewriteGroup(html, "gallery-bedrooms", function (btns) {
      var shotBtns = [];
      for (var i = 0; i < btns.length; i++) {
        if (/data-full=/.test(btns[i])) shotBtns.push(btns[i]);
      }
      var kept = [];
      for (i = 0; i < shotBtns.length; i++) {
        if (fullOf(shotBtns[i]) !== "img/bed-primary-bc58-6.jpg") kept.push(shotBtns[i]);
      }
      function find(name) {
        for (var j = 0; j < kept.length; j++) {
          if (fullOf(kept[j]) === name) return j;
        }
        return -1;
      }
      var barn = find("img/king-barn-bc72.jpg") >= 0 ? "img/king-barn-bc72.jpg" : "img/king-barn-bc69.jpg";
      var order = [
        "img/bed-primary-bc58-1.jpg",
        "img/bed-primary-bc58-2.jpg",
        "img/bed-primary-bc58-3.jpg",
        "img/bed-primary-bc58-4.jpg",
        "img/bed-primary-bc58-5.jpg",
        "img/bed-primary-bc58-7.jpg",
        barn,
        "img/bed-king2-bc58-1.jpg",
        "img/bed-primary-bc58-8.jpg",
        "img/bed-king2-bc58-2.jpg",
        "img/bed-king2-bc58-4.jpg",
        "img/bed-king2-bc58-3.jpg",
        "img/bed-bunk-bc58-1.jpg",
        "img/bunk-bc69.jpg",
        "img/bunk-bc10.jpg"
      ];
      if (kept.length !== 15) return null;
      var idxs = order.map(find);
      for (var k = 0; k < idxs.length; k++) {
        if (idxs[k] < 0) return null;
      }
      var already = true;
      for (k = 0; k < idxs.length; k++) {
        if (idxs[k] !== k) { already = false; break; }
      }
      if (already) return null;
      return idxs.map(function (i) { return kept[i]; });
    });

    if (changed && html.includes("</head>")) {
      html = html.replace("</head>", "<!-- bh-v274-gallery -->\n</head>");
    }
    return { html: html, changed: changed };
  }

  function applyV275Gallery(html) {
    /* v275: in #gallery-bedrooms, remove buttons for live #13
       bed-bunk-bc58-1 and live #15 bunk-bc10. Do not delete files
       and do not reorder remaining shots. Bedrooms 13, All 73.
       Lightbox, All-view, and filter counts follow the DOM. Idempotent. */
    if (!html || html.includes("bh-v275-gallery")) return { html: html, changed: false };
    var changed = false;

    function extractButtons(trackInner) {
      var buttons = [];
      var re = /<button\b[\s\S]*?<\/button>/gi;
      var m;
      while ((m = re.exec(trackInner))) buttons.push(m[0]);
      return buttons;
    }
    function fullOf(btn) {
      var m = /data-full="([^"]+)"/.exec(btn);
      return m ? m[1].split("?")[0] : "";
    }
    function rewriteGroup(html, groupId, transformFn) {
      var re = new RegExp(
        '(<div[^>]*\\bid="' + groupId + '"[^>]*>[\\s\\S]*?<div class="gc-track"[^>]*>)([\\s\\S]*?)(</div>)',
        "i"
      );
      var m = html.match(re);
      if (!m) return html;
      var buttons = extractButtons(m[2]);
      var next = transformFn(buttons.slice());
      if (!next) return html;
      var inner = "\n          " + next.join("\n          ") + "\n          ";
      changed = true;
      return html.replace(m[0], m[1] + inner + m[3]);
    }

    html = rewriteGroup(html, "gallery-bedrooms", function (btns) {
      var drop = {
        "img/bed-bunk-bc58-1.jpg": 1,
        "img/bunk-bc10.jpg": 1
      };
      var shotBtns = [];
      for (var i = 0; i < btns.length; i++) {
        if (/data-full=/.test(btns[i])) shotBtns.push(btns[i]);
      }
      var next = [];
      for (i = 0; i < shotBtns.length; i++) {
        if (!drop[fullOf(shotBtns[i])]) next.push(shotBtns[i]);
      }
      if (next.length === shotBtns.length) return null;
      if (next.length !== 13) return null;
      return next;
    });

    if (changed && html.includes("</head>")) {
      html = html.replace("</head>", "<!-- bh-v275-gallery -->\n</head>");
    }
    return { html: html, changed: changed };
  }

  function applyV276Gallery(html) {
    /* v276: in #gallery-living, remove buttons for live #2
       kitchen-range-bc58, #3 kitchen-dining-set-bc58, and #5
       kitchen-island-stools-bc58. Do not delete files and do not
       reorder remaining shots. Living 13, All 70.
       Lightbox, All-view, and filter counts follow the DOM. Idempotent. */
    if (!html || html.includes("bh-v276-gallery")) return { html: html, changed: false };
    var changed = false;

    function extractButtons(trackInner) {
      var buttons = [];
      var re = /<button\b[\s\S]*?<\/button>/gi;
      var m;
      while ((m = re.exec(trackInner))) buttons.push(m[0]);
      return buttons;
    }
    function fullOf(btn) {
      var m = /data-full="([^"]+)"/.exec(btn);
      return m ? m[1].split("?")[0] : "";
    }
    function rewriteGroup(html, groupId, transformFn) {
      var re = new RegExp(
        '(<div[^>]*\\bid="' + groupId + '"[^>]*>[\\s\\S]*?<div class="gc-track"[^>]*>)([\\s\\S]*?)(</div>)',
        "i"
      );
      var m = html.match(re);
      if (!m) return html;
      var buttons = extractButtons(m[2]);
      var next = transformFn(buttons.slice());
      if (!next) return html;
      var inner = "\n          " + next.join("\n          ") + "\n          ";
      changed = true;
      return html.replace(m[0], m[1] + inner + m[3]);
    }

    html = rewriteGroup(html, "gallery-living", function (btns) {
      var drop = {
        "img/kitchen-range-bc58.jpg": 1,
        "img/kitchen-dining-set-bc58.jpg": 1,
        "img/kitchen-island-stools-bc58.jpg": 1
      };
      var shotBtns = [];
      for (var i = 0; i < btns.length; i++) {
        if (/data-full=/.test(btns[i])) shotBtns.push(btns[i]);
      }
      var next = [];
      for (i = 0; i < shotBtns.length; i++) {
        if (!drop[fullOf(shotBtns[i])]) next.push(shotBtns[i]);
      }
      if (next.length === shotBtns.length) return null;
      if (next.length !== 13) return null;
      return next;
    });

    if (changed && html.includes("</head>")) {
      html = html.replace("</head>", "<!-- bh-v276-gallery -->\n</head>");
    }
    return { html: html, changed: changed };
  }








  function applyV277Gallery(html) {
    /* v277: in #gallery-loft, swap live #1 loft-lounge-bc24
       with live #2 loft-media-bc58. No other reorder, removals,
       or gallery changes. Loft stays 13. Other counts unchanged.
       Lightbox, All-view, and filter counts follow the DOM. Idempotent. */
    if (!html || html.includes("bh-v277-gallery")) return { html: html, changed: false };
    var changed = false;

    function extractButtons(trackInner) {
      var buttons = [];
      var re = /<button\b[\s\S]*?<\/button>/gi;
      var m;
      while ((m = re.exec(trackInner))) buttons.push(m[0]);
      return buttons;
    }
    function fullOf(btn) {
      var m = /data-full="([^"]+)"/.exec(btn);
      return m ? m[1].split("?")[0] : "";
    }
    function rewriteGroup(html, groupId, transformFn) {
      var re = new RegExp(
        '(<div[^>]*\\bid="' + groupId + '"[^>]*>[\\s\\S]*?<div class="gc-track"[^>]*>)([\\s\\S]*?)(</div>)',
        "i"
      );
      var m = html.match(re);
      if (!m) return html;
      var buttons = extractButtons(m[2]);
      var next = transformFn(buttons.slice());
      if (!next) return html;
      var inner = "\n          " + next.join("\n          ") + "\n          ";
      changed = true;
      return html.replace(m[0], m[1] + inner + m[3]);
    }

    html = rewriteGroup(html, "gallery-loft", function (btns) {
      var shotBtns = [];
      for (var i = 0; i < btns.length; i++) {
        if (/data-full=/.test(btns[i])) shotBtns.push(btns[i]);
      }
      if (shotBtns.length !== 13) return null;
      var a = fullOf(shotBtns[0]);
      var b = fullOf(shotBtns[1]);
      // Already in the v277 order (idempotent even without the marker)
      if (a === "img/loft-media-bc58.jpg" && b === "img/loft-lounge-bc24.jpg") return null;
      // Only swap the expected live v276 pair
      if (a !== "img/loft-lounge-bc24.jpg" || b !== "img/loft-media-bc58.jpg") return null;
      var next = shotBtns.slice();
      next[0] = shotBtns[1];
      next[1] = shotBtns[0];
      return next;
    });

    if (changed && html.includes("</head>")) {
      html = html.replace("</head>", "<!-- bh-v277-gallery -->\n</head>");
    }
    return { html: html, changed: changed };
  }


  function applyV278Logo(html) {
    /* v278: replace header open-A logo cache-bust ?v=bc78
       (file bytes = v16c5 thick-20 560 mark) and replace declared
       favicon / icon / apple-touch-icon links with v16c5-derived
       icons. No gallery, CSS, weather, or other changes. Idempotent. */
    if (!html || html.includes("bh-v278-logo")) return { html: html, changed: false };
    var changed = false;

    // Already applied (idempotent without the marker)
    if (html.indexOf("img/logo-open-a-peaks.jpg?v=bc78") !== -1 && html.indexOf("/assets/favicon-32-bc78.png") !== -1) {
      return { html: html, changed: false };
    }

    var logoNext = html.replace(/img\/logo-open-a-peaks\.jpg\?v=[^"'\s>]+/g, "img/logo-open-a-peaks.jpg?v=bc78");
    if (logoNext !== html) { html = logoNext; changed = true; }

    var oldFav = /<link rel="icon" href="\/favicon\.ico[^"]*" sizes="any" \s*\/>\s*<link rel="icon" type="image\/png" href="\/assets\/logo-mark-nav\.png\?v=[^"]+" \s*\/>\s*<link rel="apple-touch-icon" href="\/assets\/logo-mark-nav\.png\?v=[^"]+" \s*\/>/;
    var newFav = '<link rel="icon" href="/favicon.ico?v=bc78" sizes="any" /><link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32-bc78.png" /><link rel="icon" type="image/png" sizes="192x192" href="/assets/favicon-192-bc78.png" /><link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon-bc78.png" />';
    if (oldFav.test(html)) {
      html = html.replace(oldFav, newFav);
      changed = true;
    }

    if (changed && html.includes("</head>")) {
      html = html.replace("</head>", "<!-- bh-v278-logo -->\n</head>");
    }
    return { html: html, changed: changed };
  }


  function applyV279HouseStat(html) {
    /* v279: in #house .h-stat, split "Three bedroom, three bath"
       into two spans so the existing gold divider
       (.h-stat > span + span::before, var(--gold) #C8923A,
       1px x .9em, margin 0 .9rem) appears between bedroom and
       bath. Leave "Sleeps eight" and its existing divider
       unchanged. No other text, punctuation, or styling.
       Idempotent. */
    if (!html || html.includes("bh-v279-housestat")) return { html: html, changed: false };

    var from = '<p class="h-stat"><span>Three bedroom, three bath</span><span>Sleeps eight</span></p>';
    var to = '<p class="h-stat"><span>Three bedroom</span><span>three bath</span><span>Sleeps eight</span></p>';

    // Already applied (idempotent even without the marker)
    if (html.indexOf(to) !== -1 && html.indexOf(from) === -1) {
      return { html: html, changed: false };
    }
    if (html.indexOf(from) === -1) return { html: html, changed: false };

    var houseBlockRe = /(<section[^>]*id="house"[^>]*>[\s\S]*?)(<p class="h-stat">[\s\S]*?<\/p>)/i;
    var m = html.match(houseBlockRe);
    if (!m || m[2] !== from) return { html: html, changed: false };

    html = html.replace(houseBlockRe, "$1" + to);
    if (html.includes("</head>")) {
      html = html.replace("</head>", "<!-- bh-v279-housestat -->\n</head>");
    }
    return { html: html, changed: true };
  }


  function applyV280MobileHStat(html) {
    /* v280: on mobile viewports only, tighten #house .h-stat
       (THREE BEDROOM | THREE BATH | SLEEPS EIGHT) so the three
       spans plus existing gold dividers fit on one line without
       wrapping or overflow. Adjusts font-size, letter-spacing,
       and divider horizontal margin inside max-width: 600px.
       Divider stays 1px gold #C8923A at opacity .7. Desktop
       and tablet (768+) are unchanged. Idempotent. */
    if (!html || html.includes("bh-v280-hstat")) return { html: html, changed: false };
    if (html.indexOf('id="bh-v280-hstat"') !== -1) {
      return { html: html, changed: false };
    }
    if (!html.includes("</head>")) return { html: html, changed: false };
    var css = '<style id="bh-v280-hstat">@media (max-width: 600px){#house .h-stat{flex-wrap:nowrap;white-space:nowrap;font-size:.68rem!important;letter-spacing:.06em}#house .h-stat span{font-size:inherit!important}#house .h-stat>span+span::before{margin:0 .28rem}}</style>';
    html = html.replace("</head>", css + "\n<!-- bh-v280-hstat -->\n</head>");
    return { html: html, changed: true };
  }


  function applyV281MobileHStat(html) {
    /* v281: open mobile #house .h-stat spacing slightly inside
       the existing bh-v280-hstat max-width 600px rule. Keep
       font-size .68rem; letter-spacing .06em -> .07em; divider
       margin 0 .28rem -> 0 .32rem. Divider stays 1px gold
       #C8923A at opacity .7. Fits on one line with ~3px spare
       at 320. Desktop/tablet (768+) unchanged. Idempotent. */
    if (!html || html.includes("bh-v281-hstat")) return { html: html, changed: false };
    var oldStyle = '<style id="bh-v280-hstat">@media (max-width: 600px){#house .h-stat{flex-wrap:nowrap;white-space:nowrap;font-size:.68rem!important;letter-spacing:.06em}#house .h-stat span{font-size:inherit!important}#house .h-stat>span+span::before{margin:0 .28rem}}</style>';
    var newStyle = '<style id="bh-v280-hstat">@media (max-width: 600px){#house .h-stat{flex-wrap:nowrap;white-space:nowrap;font-size:.68rem!important;letter-spacing:.07em}#house .h-stat span{font-size:inherit!important}#house .h-stat>span+span::before{margin:0 .32rem}}</style>';
    if (html.indexOf(newStyle) !== -1) {
      if (html.includes("</head>")) {
        html = html.replace("</head>", "<!-- bh-v281-hstat -->\n</head>");
        return { html: html, changed: true };
      }
      return { html: html, changed: false };
    }
    if (html.indexOf(oldStyle) === -1) return { html: html, changed: false };
    html = html.replace(oldStyle, newStyle);
    if (html.includes("</head>")) {
      html = html.replace("</head>", "<!-- bh-v281-hstat -->\n</head>");
    }
    return { html: html, changed: true };
  }

  var v271 = applyV271ExteriorGrade(html);
  html = v271.html;
  if (v271.changed) changed = true;

  var v272 = applyV272Gallery(html);
  html = v272.html;
  if (v272.changed) changed = true;

  var v273 = applyV273Gallery(html);
  html = v273.html;
  if (v273.changed) changed = true;

  var v274 = applyV274Gallery(html);
  html = v274.html;
  if (v274.changed) changed = true;

  var v275 = applyV275Gallery(html);
  html = v275.html;
  if (v275.changed) changed = true;

  var v276 = applyV276Gallery(html);
  html = v276.html;
  if (v276.changed) changed = true;

  var v277 = applyV277Gallery(html);
  html = v277.html;
  if (v277.changed) changed = true;

  var v278 = applyV278Logo(html);
  html = v278.html;
  if (v278.changed) changed = true;

  // Hero tagline: replace .hero-lede + .hero-mins with one line, capital Q only.
  // Other copy (meta, body, "twelve minutes" elsewhere) unchanged.
  if (/<p class="hero-lede">[\s\S]*?<\/p>\s*<p class="hero-mins">[\s\S]*?<\/p>/.test(html)) {
    html = html.replace(
      /<p class="hero-lede">[\s\S]*?<\/p>\s*<p class="hero-mins">[\s\S]*?<\/p>/,
      '<p class="hero-lede">Quiet luxury at altitude.</p>'
    );
    changed = true;
  }

  // Area tile: snow sculpture label + lightbox caption only. Alt unchanged.
  (function () {
    var re = /<button\b[^>]*data-slot="around-06-snow-sculpture"[^>]*>[\s\S]*?<\/button>/i;
    var m = html.match(re);
    if (!m) return;
    var btn = m[0];
    var next = btn.replace(/data-cap="[^"]*"/, 'data-cap="International Snow Sculpture Championships"');
    next = next.replace(/(<span class="lbl">)[\s\S]*?(<\/span>)/, "$1International Snow Sculpture Championships$2");
    if (next !== btn) {
      html = html.replace(btn, next);
      changed = true;
    }
  })();


  if (!html.includes("bh-house-stat-v4")) {
    var houseStatV4 = '<p class="h-stat"><span>Three bedroom, three bath</span><span>Sleeps eight</span></p>';
    var houseBlockRe4 = /(<section[^>]*id="house"[^>]*>[\s\S]*?)(<p class="h-stat">[\s\S]*?<\/p>)/i;
    if (houseBlockRe4.test(html)) {
      html = html.replace(houseBlockRe4, "$1" + houseStatV4);
      changed = true;
    }
    if (html.includes("</head>")) {
      html = html.replace("</head>", "<!-- bh-house-stat-v4 -->" + "</head>");
      changed = true;
    }
  }

  var v279 = applyV279HouseStat(html);
  html = v279.html;
  if (v279.changed) changed = true;

  var v280 = applyV280MobileHStat(html);
  html = v280.html;
  if (v280.changed) changed = true;

  var v281 = applyV281MobileHStat(html);
  html = v281.html;
  if (v281.changed) changed = true;

  if (!html.includes("bh-area-mosaic-order-v1")) {
    var desiredMosaic = [
      "area-skier.jpg",
      "around-ski-snowboard.jpg",
      "around-dog-sledding.jpg",
      "area-snow-sculpture.jpg",
      "area-troll.jpg",
      "area-cyclists.jpg"
    ];
    var mosaicRe = /(<div class="mosaic bh-area-mosaic"[^>]*>)([\s\S]*?)(<\/div>)/i;
    var mm = html.match(mosaicRe);
    if (mm) {
      var buttons = mm[2].match(/<button\b[\s\S]*?<\/button>/gi) || [];
      function mosaicKey(b) {
        var m = b.match(/img\/([a-z0-9\-]+\.jpg)/i);
        return m ? m[1].toLowerCase() : "";
      }
      var used = Object.create(null);
      var next = [];
      for (var d = 0; d < desiredMosaic.length; d++) {
        for (var i = 0; i < buttons.length; i++) {
          if (!used[i] && mosaicKey(buttons[i]) === desiredMosaic[d]) {
            next.push(buttons[i]);
            used[i] = true;
            break;
          }
        }
      }
      for (var j = 0; j < buttons.length; j++) {
        if (!used[j]) next.push(buttons[j]);
      }
      if (next.length === buttons.length) {
        html = html.replace(mosaicRe, mm[1] + next.join("") + mm[3]);
        changed = true;
      }
    }
    if (html.includes("</head>")) {
      html = html.replace("</head>", "<!-- bh-area-mosaic-order-v1 -->" + "</head>");
      changed = true;
    }
  }



  // bh-reviews-before-photos-v1: page order flyover, reviews, gallery;
  // nav-links, nav-more, bh-tmenu, and footer match that order.
  if (!html.includes("bh-reviews-before-photos-v1")) {
    function bhExtractSection(src, id) {
      var re = new RegExp("<section\\b[^>]*\\bid=\"" + id + "\"[^>]*>", "i");
      var m = re.exec(src);
      if (!m) return null;
      var start = m.index;
      var pos = start + m[0].length;
      var depth = 1;
      var lower = src.toLowerCase();
      while (depth > 0 && pos < src.length) {
        var nextOpen = lower.indexOf("<section", pos);
        var nextClose = lower.indexOf("</section", pos);
        if (nextClose < 0) return null;
        if (nextOpen >= 0 && nextOpen < nextClose) {
          var ch = lower[nextOpen + 8];
          if (ch === ">" || ch === " " || ch === "\t" || ch === "\n" || ch === "/") {
            depth++;
            pos = nextOpen + 8;
            continue;
          }
        }
        depth--;
        if (depth === 0) {
          var closeEnd = lower.indexOf(">", nextClose) + 1;
          return { start: start, end: closeEnd, html: src.slice(start, closeEnd) };
        }
        pos = nextClose + 9;
      }
      return null;
    }
    var fly = bhExtractSection(html, "flyover");
    var gal = bhExtractSection(html, "gallery");
    var rev = bhExtractSection(html, "reviews");
    if (fly && gal && rev && fly.end <= gal.start && gal.end <= rev.start) {
      html = html.slice(0, fly.end) + "\n\n    " + rev.html + "\n\n    " + gal.html + html.slice(rev.end);
      changed = true;
    }
    var linksBefore = html;
    html = html.replace(/(<li>\s*<a href="#gallery">Photos<\/a>\s*<\/li>)\s*(<li>\s*<a href="#reviews">Reviews<\/a>\s*<\/li>)/g, "$2\n        $1");
    html = html.replace(/(<a href="#gallery">Photos<\/a>)\s*(<a href="#reviews">Reviews<\/a>)/g, "$2$1");
    if (html !== linksBefore) changed = true;
    if (html.includes("</head>")) {
      html = html.replace("</head>", "<!-- bh-reviews-before-photos-v1 -->" + "</head>");
      changed = true;
    }
  }



  // bh-gallery-highlights-remove-v1: drop the Highlights carousel group
  // (#gallery-highlights heading + 12-photo carousel) from Photos.
  // Filters, other groups, image assets, and gallery JS are unchanged.
  if (html.includes('id="gallery-highlights"') || html.includes("id='gallery-highlights'")) {
    var hlRe = /<div\b[^>]*\bid=["']gallery-highlights["'][^>]*>/i;
    var hlm = hlRe.exec(html);
    if (hlm) {
      var hlStart = hlm.index;
      var hlPos = hlStart + hlm[0].length;
      var hlDepth = 1;
      var hlLower = html.toLowerCase();
      var hlEnd = -1;
      while (hlDepth > 0 && hlPos < html.length) {
        var hlOpen = hlLower.indexOf("<div", hlPos);
        var hlClose = hlLower.indexOf("</div", hlPos);
        if (hlClose < 0) break;
        if (hlOpen >= 0 && hlOpen < hlClose) {
          var hlCh = hlLower[hlOpen + 4];
          if (hlCh === ">" || hlCh === " " || hlCh === "\t" || hlCh === "\n" || hlCh === "/") {
            hlDepth++;
            hlPos = hlOpen + 4;
            continue;
          }
        }
        hlDepth--;
        if (hlDepth === 0) {
          hlEnd = hlLower.indexOf(">", hlClose) + 1;
          break;
        }
        hlPos = hlClose + 5;
      }
      if (hlEnd > hlStart) {
        var hlCut = hlEnd;
        var hlNext = html.indexOf("<div", hlEnd);
        if (hlNext > hlEnd && /^\s*$/.test(html.slice(hlEnd, hlNext)) && /<div\b[^>]*\bgallery-group\b/i.test(html.slice(hlNext, hlNext + 180))) {
          hlCut = hlNext;
        }
        html = html.slice(0, hlStart) + html.slice(hlCut);
        changed = true;
        if (html.includes("</head>") && !html.includes("bh-gallery-highlights-remove-v1")) {
          html = html.replace("</head>", "<!-- bh-gallery-highlights-remove-v1 -->" + "</head>");
        }
      }
    }
  }

  // bh-v251-house-v1: delete standalone Floor Guide (#layout) on all viewports,
  // strip Layout nav/menu/footer links, add unlabeled floor sentences in House,
  // merge Hot tub & sauna + Deck & views, rename Yoga loft to Secret loft.
  if (!html.includes("bh-v251-house-v1")) {
    var layRe = /<section\b[^>]*\bid=["']layout["'][^>]*>/i;
    var laym = layRe.exec(html);
    if (laym) {
      var layStart = laym.index;
      var layPos = layStart + laym[0].length;
      var layDepth = 1;
      var layLower = html.toLowerCase();
      var layEnd = -1;
      while (layDepth > 0 && layPos < html.length) {
        var layOpen = layLower.indexOf("<section", layPos);
        var layClose = layLower.indexOf("</section", layPos);
        if (layClose < 0) break;
        if (layOpen >= 0 && layOpen < layClose) {
          var layCh = layLower[layOpen + 8];
          if (layCh === ">" || layCh === " " || layCh === "\t" || layCh === "\n" || layCh === "/") {
            layDepth++;
            layPos = layOpen + 8;
            continue;
          }
        }
        layDepth--;
        if (layDepth === 0) {
          layEnd = layLower.indexOf(">", layClose) + 1;
          break;
        }
        layPos = layClose + 9;
      }
      if (layEnd > layStart) {
        var after = html.slice(layEnd);
        var ws = after.match(/^\s*\n/);
        html = html.slice(0, layStart) + (ws ? after.slice(ws[0].length) : after);
      }
    }

    html = html.replace(/\s*<li>\s*<a href="#layout">Layout<\/a>\s*<\/li>/g, "");
    html = html.replace(/<a href="#layout">Layout<\/a>/g, "");
    html = html.replace(/<a\b[^>]*href="#layout"[^>]*>[\s\S]*?<\/a>/g, "");
    html = html.replace(/<li>\s*<\/li>/g, "");

    var ledeMark = "<p class=\"lede\">Experience architectural alpine living beneath sweeping cathedral ceilings. Sleeps eight, with a hot tub, barrel sauna, and Mount Quandary views—just twelve minutes from downtown Breckenridge.</p>";
    var floorP = "<p class=\"house-floor\">Lower level: a king suite, the bunk room and two baths. Upper level: the primary king suite and bath.</p>";
    if (html.includes(ledeMark) && !html.includes("house-floor")) {
      html = html.replace(ledeMark, ledeMark + "\n            " + floorP);
    }

    var oldPair = "<li><span class=\"amen-label\">Hot tub &amp; sauna<span class=\"amen-sep\">: </span></span> <span class=\"amen-text\">A private seven-seat hot tub framed by the mountain view, paired with a barrel sauna for four to six. Robes and hot-tub towels are in the house.</span></li>\n              <li><span class=\"amen-label\">Deck &amp; views<span class=\"amen-sep\">: </span></span> <span class=\"amen-text\">Mt. Quandary vistas from the deck, the hot tub, and the living room. A fire pit, an outdoor propane fireplace, a gas grill, Adirondack chairs, and dark-sky stargazing.</span></li>";
    var newOne = "<li><span class=\"amen-label\">Hot tub, sauna &amp; deck<span class=\"amen-sep\">: </span></span> <span class=\"amen-text\">A private seven-seat hot tub framed by the mountain view, paired with a barrel sauna for four to six; robes and hot-tub towels are in the house. Mt. Quandary vistas from the deck, the hot tub, and the living room, plus a fire pit, an outdoor propane fireplace, a gas grill, Adirondack chairs, and dark-sky stargazing.</span></li>";
    if (html.includes(oldPair)) {
      html = html.replace(oldPair, newOne);
    }

    html = html.replace(
      "<span class=\"amen-label\">Yoga loft<span class=\"amen-sep\">: </span></span> <span class=\"amen-text\">A quiet loft for yoga, with a mural by a local artist.</span>",
      "<span class=\"amen-label\">Secret loft<span class=\"amen-sep\">: </span></span> <span class=\"amen-text\">Climb the ladder to a hideaway in the peak of the A-frame, with yoga mats and a mural by a local artist.</span>"
    );
    html = html.replace(/data-cap="Yoga loft"/g, "data-cap=\"Secret loft\"");

    var v251Head = "<!-- bh-v251-house-v1 --><style id=\"bh-v251-house-v1\">#house .house-floor{margin:.85em 0 0;}</style><script id=\"bh-v251-layout-hash-v1\">(function(){function go(){if(location.hash!==\"#layout\")return;if(history.replaceState)history.replaceState(null,\"\",\"#house\");else location.hash=\"#house\";var t=document.getElementById(\"house\");if(t)t.scrollIntoView();}if(document.readyState===\"loading\")document.addEventListener(\"DOMContentLoaded\",go);else go();window.addEventListener(\"hashchange\",go);})();</script>";
    if (html.includes("</head>")) {
      html = html.replace("</head>", v251Head + "</head>");
    }
    changed = true;
  }

  // bh-v252-house-hash-v1: map #layout through bootTop to #house (cold load);
  // merge House lede + unlabeled floor block into one paragraph.
  if (!html.includes("bh-v252-house-hash-v1")) {
    var bootOld = "      var DEEP_IDS = [\"availability\", \"book\"];\n      var deepId = (location.hash || \"\").slice(1);\n      var isDeep = DEEP_IDS.indexOf(deepId) !== -1 && !!document.getElementById(deepId);\n      function goDeep() {\n        var el = document.getElementById(deepId);\n        if (el) el.scrollIntoView({ block: \"start\" });\n      }\n      function bootTop() {\n        if (userMoved) return;\n        if (isDeep) { goDeep(); return; }\n        goTop();\n        if (location.hash && location.hash !== \"#\" && location.hash !== \"#top\") {\n          try {\n            history.replaceState(null, \"\", location.pathname + location.search);\n          } catch (err) {}\n        }\n      }\n      bootTop();\n      window.addEventListener(\"load\", function () { bootTop(); });\n      window.addEventListener(\"pageshow\", function () { bootTop(); });\n      setTimeout(bootTop, 0);\n      setTimeout(bootTop, 200);\n      if (isDeep) {\n        setTimeout(function () { if (!userMoved) goDeep(); }, 900);\n        setTimeout(function () { if (!userMoved) goDeep(); }, 2000);\n      }";
    var bootNew = "      var DEEP_IDS = [\"availability\", \"book\"];\n      var mappedLayout = (location.hash === \"#layout\");\n      if (mappedLayout) {\n        try { history.replaceState(null, \"\", location.pathname + location.search + \"#house\"); } catch (err) {}\n      }\n      var deepId = (location.hash || \"\").slice(1);\n      var isDeep = DEEP_IDS.indexOf(deepId) !== -1 && !!document.getElementById(deepId);\n      var isMappedHouse = mappedLayout && !!document.getElementById(\"house\");\n      function goDeep() {\n        var el = document.getElementById(isMappedHouse ? \"house\" : deepId);\n        if (el) el.scrollIntoView({ block: \"start\" });\n      }\n      function bootTop() {\n        if (userMoved) return;\n        if (isDeep || isMappedHouse) { goDeep(); return; }\n        goTop();\n        if (location.hash && location.hash !== \"#\" && location.hash !== \"#top\") {\n          try {\n            history.replaceState(null, \"\", location.pathname + location.search);\n          } catch (err) {}\n        }\n      }\n      bootTop();\n      window.addEventListener(\"load\", function () { bootTop(); });\n      window.addEventListener(\"pageshow\", function () { bootTop(); });\n      setTimeout(bootTop, 0);\n      setTimeout(bootTop, 200);\n      if (isDeep || isMappedHouse) {\n        setTimeout(function () { if (!userMoved) goDeep(); }, 900);\n        setTimeout(function () { if (!userMoved) goDeep(); }, 2000);\n      }";
    if (html.includes(bootOld)) {
      html = html.replace(bootOld, bootNew);
    }

    var oldHouseCopy = "<p class=\"lede\">Experience architectural alpine living beneath sweeping cathedral ceilings. Sleeps eight, with a hot tub, barrel sauna, and Mount Quandary views—just twelve minutes from downtown Breckenridge.</p>\n            <p class=\"house-floor\">Lower level: a king suite, the bunk room and two baths. Upper level: the primary king suite and bath.</p>";
    var newHouseCopy = "<p class=\"lede\">Experience architectural alpine living beneath sweeping cathedral ceilings, with a king suite, the bunk room and two baths on the lower level and the primary king suite and bath on the upper level. Sleeps eight, with a hot tub, barrel sauna, and Mount Quandary views—just twelve minutes from downtown Breckenridge.</p>";
    if (html.includes(oldHouseCopy)) {
      html = html.replace(oldHouseCopy, newHouseCopy);
    }

    if (html.includes("</head>") && !html.includes("bh-v252-house-hash-v1")) {
      html = html.replace("</head>", "<!-- bh-v252-house-hash-v1 -->" + "</head>");
    }
    changed = true;
  }

  // bh-v253-amenity-copy-v1: lighten deck/views blurb; update Secret loft body.
  if (!html.includes("bh-v253-amenity-copy-v1")) {
    var oldDeckBody = "A private seven-seat hot tub framed by the mountain view, paired with a barrel sauna for four to six; robes and hot-tub towels are in the house. Mt. Quandary vistas from the deck, the hot tub, and the living room, plus a fire pit, an outdoor propane fireplace, a gas grill, Adirondack chairs, and dark-sky stargazing.";
    var newDeckBody = "A private seven-seat hot tub framed by the mountain view, paired with a barrel sauna for four to six; robes and hot-tub towels are in the house. Mt. Quandary views, a fire pit, grill and dark-sky stargazing.";
    if (html.includes(oldDeckBody)) {
      html = html.replace(oldDeckBody, newDeckBody);
    }
    var oldLoft = "Climb the ladder to a hideaway in the peak of the A-frame, with yoga mats and a mural by a local artist.";
    var newLoft = "Climb the ladder to a hideaway in the peak of the A-frame with yoga mats, bean bags, and a mural by a local artist.";
    if (html.includes(oldLoft)) {
      html = html.replace(oldLoft, newLoft);
    }
    if (html.includes("</head>") && !html.includes("bh-v253-amenity-copy-v1")) {
      html = html.replace("</head>", "<!-- bh-v253-amenity-copy-v1 -->" + "</head>");
    }
    changed = true;
  }

  // bh-v254-nav-label-v1: menu label Basecamp → The House (href stays #house).
  // Covers desktop nav, nav-more, compact tmenu, footer, and mnav summary if present.
  // Does not touch skip links, section copy, alt text, or test-title cleanup strings.
  (function () {
    var before = html;
    html = html.replace(/<a([^>]*href="#house"[^>]*)>Basecamp<\/a>/g, "<a$1>The House</a>");
    html = html.replace(/<summary>Basecamp<\/summary>/g, "<summary>The House</summary>");
    if (html !== before) changed = true;
  })();

  // bh-gallery-cap-v282: bedroom, bath, and Around the home captions.
  // Runs after v272–v277 so it wins over the older bedside caption.
  // Ski / snowboard / dog-sled label font and color, scoped to these three groups.
  (function () {
    function fileOf(btn) {
      var m = /data-full="([^"]+)"/.exec(btn) || /src="([^"]+)"/.exec(btn);
      if (!m) return "";
      var path = m[1].split("?")[0];
      var i = path.lastIndexOf("img/");
      return i >= 0 ? path.slice(i) : path;
    }
    function capOf(btn) {
      var m = /data-cap="([^"]*)"/.exec(btn);
      return m ? m[1] : "";
    }
    function withCap(btn, cap) {
      var next = btn;
      if (/data-cap="/.test(next)) next = next.replace(/data-cap="[^"]*"/, 'data-cap="' + cap + '"');
      else next = next.replace(/<button\b/i, '<button data-cap="' + cap + '"');
      if (/<span class="lbl">/.test(next)) next = next.replace(/(<span class="lbl">)[\s\S]*?(<\/span>)/, "$1" + cap + "$2");
      else next = next.replace(/<\/button>\s*$/i, '<span class="lbl">' + cap + "</span></button>");
      return next;
    }
    function buttonsOf(inner) {
      var buttons = [];
      var re = /<button\b[\s\S]*?<\/button>/gi;
      var m;
      while ((m = re.exec(inner))) buttons.push(m[0]);
      return buttons;
    }
    function rewriteGroup(src, groupId, transformFn) {
      var re = new RegExp('(<div[^>]*\\bid="' + groupId + '"[^>]*>[\\s\\S]*?<div class="gc-track"[^>]*>)([\\s\\S]*?)(</div>)', "i");
      var m = src.match(re);
      if (!m) return src;
      var buttons = buttonsOf(m[2]);
      var next = transformFn(buttons.slice());
      if (!next) return src;
      var inner = "\n          " + next.join("\n          ") + "\n          ";
      var rebuilt = m[1] + inner + m[3];
      if (rebuilt === m[0]) return src;
      return src.replace(m[0], rebuilt);
    }

    var bedCaps = {
      "img/bed-primary-bc58-1.jpg": "Primary King Suite",
      "img/bed-primary-bc58-2.jpg": "Primary King Suite",
      "img/bed-primary-bc58-3.jpg": "Primary King Suite",
      "img/bed-primary-bc58-4.jpg": "Primary King Suite",
      "img/bed-primary-bc58-5.jpg": "Primary King Suite",
      "img/bed-primary-bc58-7.jpg": "Primary coffee station",
      "img/king-barn-bc72.jpg": "Lower level king en-suite",
      "img/bed-king2-bc58-1.jpg": "Lower level king en-suite",
      "img/bed-primary-bc58-8.jpg": "Lower level king en-suite",
      "img/bed-king2-bc58-2.jpg": "Lower level king en-suite",
      "img/bed-king2-bc58-4.jpg": "Lower level king en-suite",
      "img/bed-king2-bc58-3.jpg": "Lower level king en-suite"
    };
    var bathPlan = [
      ["img/bath-primary-bc68.jpg", "Primary king suite bath"],
      ["img/bath-primary-bc58-1.jpg", "Primary king suite bath"],
      ["img/bath-primary-bc58-3.jpg", "Primary king suite bath"],
      ["img/bath-ensuite-bc68.jpg", "Lower level king en-suite"],
      ["img/bath-double.jpg", "Lower level king en-suite"],
      ["img/bath-ensuite-bc58-1.jpg", "Lower level king en-suite"],
      ["img/bath-hall-bc68.jpg", "Hallway bath"],
      ["img/bath-hall-bc58-1.jpg", "Hallway bath"],
      ["img/bath-hall-bc58-2.jpg", "Hallway bath"]
    ];
    var detailCaps = {
      "img/entry-hall-bc58.jpg": "Entryway",
      "img/details-hallway-bc58-1.jpg": "Lower level hall",
      "img/laundry-bc58.jpg": "Laundry room",
      "img/garage-gear-bc58.jpg": "Garage adventure wall"
    };

    var next = html;
    next = rewriteGroup(next, "gallery-bedrooms", function (btns) {
      return btns.map(function (b) {
        var f = fileOf(b);
        var cap = Object.prototype.hasOwnProperty.call(bedCaps, f) ? bedCaps[f] : capOf(b);
        if (!cap) return b;
        return withCap(b, cap);
      });
    });
    next = rewriteGroup(next, "gallery-baths", function (btns) {
      var byFile = Object.create(null);
      btns.forEach(function (b) { byFile[fileOf(b)] = b; });
      var used = Object.create(null);
      var ordered = [];
      bathPlan.forEach(function (row) {
        var b = byFile[row[0]];
        if (!b) return;
        used[row[0]] = 1;
        ordered.push(withCap(b, row[1]));
      });
      btns.forEach(function (b) {
        var f = fileOf(b);
        if (!used[f]) ordered.push(b);
      });
      return ordered;
    });
    next = rewriteGroup(next, "gallery-details", function (btns) {
      return btns.map(function (b) {
        var f = fileOf(b);
        if (!Object.prototype.hasOwnProperty.call(detailCaps, f)) return b;
        return withCap(b, detailCaps[f]);
      });
    });
    if (!next.includes('id="bh-gallery-cap-v282"') && next.includes("</head>")) {
      var css = '<style id="bh-gallery-cap-v282">#gallery-bedrooms .shot .lbl,#gallery-baths .shot .lbl,#gallery-details .shot .lbl{display:block!important;position:absolute!important;left:0!important;right:0!important;bottom:0!important;padding:1.4rem .7rem .55rem!important;background:linear-gradient(to top,rgba(13,13,11,.82),transparent)!important;font-size:.7rem!important;letter-spacing:.12em!important;text-transform:uppercase!important;color:var(--cream,#F2EDE4)!important;text-align:left!important;pointer-events:none!important;z-index:2!important}</style>';
      next = next.replace("</head>", css + "</head>");
    }
    if (next !== html) {
      html = next;
      changed = true;
    }
  })();

  // bh-tracking-v1: serve GA4 from js/tracking.js. Meta Pixel ID stays the placeholder.
  if (isLiveHost(request) && !html.includes("bh-tracking-v1") && !html.includes("G-L4XM6LG9WK")) {
    var trackingTag = "<script id=\"bh-tracking-v1\">\n" + TRACKING_JS + "\n</script>";
    if (html.includes("</body>")) {
      html = html.replace("</body>", trackingTag + "</body>");
      changed = true;
    } else if (html.includes("</head>")) {
      html = html.replace("</head>", trackingTag + "</head>");
      changed = true;
    }
  }

  if (changed) {
    h.set("Cache-Control", "public, max-age=0, must-revalidate");
    h.delete("content-length");
  }
  return new Response(html, { status: res.status, headers: h });
}

var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/js/tracking.js") {
      const h = new Headers({
        "content-type": "application/javascript; charset=utf-8",
        "cache-control": "public, max-age=300"
      });
      applyRobotsTag(h, request);
      return new Response(TRACKING_JS, { status: 200, headers: h });
    }
    // bh-discovery-v1: authoritative robots + sitemap
    if (url.pathname === "/robots.txt") {
      return new Response(ROBOTS_TXT, { status: 200, headers: discoveryHeaders(request, "text/plain; charset=utf-8") });
    }
    if (url.pathname === "/sitemap.xml") {
      return new Response(SITEMAP_XML, { status: 200, headers: discoveryHeaders(request, "application/xml; charset=utf-8") });
    }

    if (url.pathname === "/__agent/send-build-record") return handleBuildRecordMail(request, env);
    if (url.pathname === "/__agent/raw-assets") return handleRawAssetsDump(request, env);
    if (url.pathname.startsWith("/__agent/record/")) return handleRecordDownload(request, env);
    if (url.pathname === "/api/contact") return handleContact(request, env);
    if (url.pathname === "/api/subscribe") {
      return new Response(
        JSON.stringify({ ok: true, test_mode: true, note: "Test preview: not stored, not sent." }),
        { status: 200, headers: (() => { const h = new Headers({ "content-type": "application/json" }); applyRobotsTag(h, request); return h; })() }
      );
    }
    if (url.pathname === "/book" || url.pathname === "/book/") {
      const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="robots" content="noindex,nofollow"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Opening booking…</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#12100e;color:#f2ede4;font:500 15px/1.5 system-ui,sans-serif}p{opacity:.85}</style></head><body><p>Opening booking request…</p>
<script>
(function(){
  var SITE='74e2ebe3', PROP='1419246';
  var WIDGET='https://booking.hospitable.com/widget/'+SITE+'/'+PROP+'?theme=boutique';
  var q=new URLSearchParams(location.search);
  function toWidget(){
    var u=new URL(WIDGET);
    q.forEach(function(v,k){if(/^utm_/.test(k))u.searchParams.set(k,v);});
    location.replace(u.href);
  }
  var checkin=q.get('checkin'), checkout=q.get('checkout');
  if(!checkin||!checkout){ toWidget(); return; }
  var adults=+(q.get('adults')||2), children=+(q.get('children')||0);
  var body={num_guests:{adults:adults,children:children,infants:0,pets:0},checkin:checkin,checkout:checkout,site_id:SITE};
  fetch('https://api.hospitable.com/bookings/api/properties/'+PROP+'/quote',{
    method:'POST',headers:{'content-type':'application/json','accept':'application/json'},
    body:JSON.stringify(body),mode:'cors',credentials:'omit'
  }).then(function(r){if(!r.ok)throw new Error('quote '+r.status);return r.json();})
   .then(function(j){
     var qid=j&&j.data&&j.data.quote_id; if(!qid)throw new Error('no quote_id');
     var u=new URL('https://booking.hospitable.com/book/'+SITE+'/'+PROP+'/'+qid);
     u.searchParams.set('theme','boutique');
     q.forEach(function(v,k){if(/^utm_/.test(k))u.searchParams.set(k,v);});
     location.replace(u.href);
   }).catch(function(e){
     console.warn(e);
     toWidget();
   });
})();
<\/script></body></html>`;
      return new Response(html, {
        status: 200,
        headers: (() => { const h = new Headers({ "content-type": "text/html; charset=utf-8", "Cache-Control": "no-store" }); applyRobotsTag(h, request); return h; })()
      });
    }

    
    // Area mosaic images from R2
    if (AREA_R2_KEYS.has(url.pathname.slice(1))) {
      return serveR2Object(request, env, url.pathname.slice(1), "image/jpeg", "public, max-age=86400");
    }
    // Temp upload endpoint for area photos (test only)
    if (url.pathname === "/api/test-r2-put" && request.method === "POST") {
      try {
        const body = await request.json();
        const key = String(body.key || "");
        const b64 = String(body.b64 || "");
        if (!AREA_R2_KEYS.has(key) || !b64) return new Response(JSON.stringify({ ok:false, error:"bad_key" }), { status:400, headers:{ "content-type":"application/json" } });
        const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        await env.DRONE.put(key, bin, { httpMetadata: { contentType: "image/jpeg" } });
        return new Response(JSON.stringify({ ok:true, key, size: bin.length }), { status:200, headers:{ "content-type":"application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ ok:false, error:String(e&&e.message||e) }), { status:500, headers:{ "content-type":"application/json" } });
      }
    }
// Caller nav logo mark from R2

    // v278: favicon and apple-touch icons are static ASSETS
    // (v16c5 thick open-A), not the older R2 logo-mark-nav.

    if (url.pathname === LOGO_MARK_PATH) {
      return serveLogoMarkHires(request);
    }

    // HQ flyover ladder from R2
    if (FLYOVER_FILES.has(url.pathname)) {
      return serveFlyoverFromR2(request, env, url.pathname);
    }

    const range = request.headers.get("range");
    if (range && request.method === "GET" && url.pathname.endsWith(".mp4")) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
      const full = await env.ASSETS.fetch(new Request(request.url, { method: "GET" }));
      if (m && full.ok && (m[1] !== "" || m[2] !== "")) {
        const body = await full.arrayBuffer();
        const size = body.byteLength;
        let start, end;
        if (m[1] === "") {
          start = Math.max(0, size - Number(m[2]));
          end = size - 1;
        } else {
          start = Number(m[1]);
          end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
        }
        const h = new Headers(full.headers);
        h.set("Accept-Ranges", "bytes");
        applyRobotsTag(h, request);
        if (videoCache(url.pathname)) h.set("Cache-Control", videoCache(url.pathname));
        if (start >= size || start > end) {
          h.set("Content-Range", `bytes */${size}`);
          h.delete("Content-Length");
          return new Response(null, { status: 416, headers: h });
        }
        h.set("Content-Range", `bytes ${start}-${end}/${size}`);
        h.set("Content-Length", String(end - start + 1));
        return new Response(body.slice(start, end + 1), { status: 206, headers: h });
      }
      const r0 = new Response(full.body, full);
      r0.headers.set("Accept-Ranges", "bytes");
      applyRobotsTag(r0.headers, request);
      if (videoCache(url.pathname)) r0.headers.set("Cache-Control", videoCache(url.pathname));
      return r0;
    }

    const res = await env.ASSETS.fetch(request);
    const rewritten = await maybeRewriteHtml(request, env, res);
    if (rewritten) return rewritten;
    const r = new Response(res.body, res);
    applyRobotsTag(r.headers, request);
    const vc = videoCache(url.pathname);
    if (vc) r.headers.set("Cache-Control", vc);
    return r;
  }
};

function cJson(obj, status, request) {
  const h = new Headers({ "content-type": "application/json", "Cache-Control": "no-store" });
  if (request) applyRobotsTag(h, request);
  else h.set("X-Robots-Tag", "noindex, nofollow");
  return new Response(JSON.stringify(obj), { status, headers: h });
}

async function handleBuildRecordMail(request, env) {
  // bh-send-build-record
  const url = new URL(request.url);
  if (url.searchParams.get('k') !== 'bh-record-2026-11-10') return new Response('forbidden', { status: 403 });
  const to = "breckhausaframe@gmail.com";
  const live = await fetch(new URL('/?recordmail=1', url.origin).toString(), { headers: { 'user-agent': 'BreckhausRecordBot/1.0', 'accept': 'text/html' } });
  let html = "";
  try { if (live.ok) html = await live.text(); } catch (e) {}
  if (!html || html.length < 1000) {
    const assetRes = await env.ASSETS.fetch(new Request(new URL("/", url.origin)));
    html = await assetRes.text();
  }
  const stamp = new Date().toISOString();
  const mk = (name, note) => ({ name: name, content: "<!-- Breckhaus Aframe build record | " + note + " | " + stamp + " -->\n" + html });
  const files = [
    mk("breckhaus-mobile.html", "mobile max-width 767px (ref 390px)"),
    mk("breckhaus-tablet.html", "tablet 768-1023px (ref 820px)"),
    mk("breckhaus-desktop.html", "desktop min-width 1024px (ref 1440px)"),
    { name: "README.txt", content: "Breckhaus Aframe webpage build record\nCaptured: " + stamp + " UTC\n\nAttached HTML snapshots labeled for mobile / tablet / desktop.\nBreakpoints: mobile <=767 | tablet 768-1023 | desktop >=1024\nMap removed. Nav: bh-nav-tabs-v30.\n" }
  ];
  function b64(str) { const bytes = new TextEncoder().encode(str); let bin = ""; for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]); return btoa(bin); }
  const boundary = "bh_record_" + crypto.randomUUID().replace(/-/g, "");
  const from = "form@breckhausaframe.com";
  const subject = "Breckhaus webpage build record — mobile / tablet / desktop";
  const textBody = "Record-keeping archive of the current Breckhaus Aframe webpage build.\n\nAttached:\n- breckhaus-mobile.html\n- breckhaus-tablet.html\n- breckhaus-desktop.html\n- README.txt\n\nBreakpoints: mobile <=767px | tablet 768-1023px | desktop >=1024px\nCaptured: " + stamp + " UTC\n";
  const parts = [];
  parts.push("--" + boundary);
  parts.push("Content-Type: text/plain; charset=UTF-8");
  parts.push("Content-Transfer-Encoding: base64");
  parts.push("");
  parts.push(b64(textBody).replace(/.{76}/g, "$&\r\n"));
  for (const f of files) {
    const isTxt = f.name.endsWith(".txt");
    parts.push("--" + boundary);
    parts.push("Content-Type: " + (isTxt ? "text/plain" : "text/html") + "; charset=UTF-8; name=\"" + f.name + "\"");
    parts.push("Content-Transfer-Encoding: base64");
    parts.push("Content-Disposition: attachment; filename=\"" + f.name + "\"");
    parts.push("");
    parts.push(b64(f.content).replace(/.{76}/g, "$&\r\n"));
  }
  parts.push("--" + boundary + "--");
  parts.push("");
  const raw = [
    "From: \"Breckhaus archive\" <" + from + ">",
    "To: <" + to + ">",
    "Subject: " + subject,
    "Date: " + new Date().toUTCString().replace("GMT", "+0000"),
    "Message-ID: <" + crypto.randomUUID() + "@breckhausaframe.com>",
    "MIME-Version: 1.0",
    "Content-Type: multipart/mixed; boundary=\"" + boundary + "\"",
    "",
    parts.join("\r\n")
  ].join("\r\n");
  try {
    await env.CONTACT_EMAIL.send(new EmailMessage(from, to, raw));
    return new Response(JSON.stringify({ ok: true, to: to, stamp: stamp, files: files.map(function(f){return f.name;}) }), { status: 200, headers: { "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e && e.message || e) }), { status: 502, headers: { "content-type": "application/json" } });
  }
}
async function handleRawAssetsDump(request, env) {
  // bh-raw-assets-dump
  const url = new URL(request.url);
  if (url.searchParams.get('k') !== 'bh-record-2026-11-10') return new Response('forbidden', { status: 403 });
  const res = await env.ASSETS.fetch(new Request(new URL("/", url.origin)));
  const html = await res.text();
  return new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-bh-raw-assets": "1" } });
}
async function handleRecordDownload(request, env) {
  // bh-record-downloads
  const url = new URL(request.url);
  const name = decodeURIComponent(url.pathname.replace("/__agent/record/", ""));
  const notes = {
    "breckhaus-mobile.html": "mobile max-width 767px (ref 390px)",
    "breckhaus-tablet.html": "tablet 768-1023px (ref 820px)",
    "breckhaus-desktop.html": "desktop min-width 1024px (ref 1440px)"
  };
  if (name === "README.txt") {
    const body = "Breckhaus Aframe webpage build record\n" +
      "Breakpoints: mobile <=767 | tablet 768-1023 | desktop >=1024\n" +
      "Files: breckhaus-mobile.html, breckhaus-tablet.html, breckhaus-desktop.html\n" +
      "Map removed. Nav: bh-nav-tabs-v30.\n";
    return new Response(body, { status: 200, headers: { "content-type": "text/plain; charset=utf-8", "content-disposition": "attachment; filename=\"README.txt\"", "cache-control": "no-store" } });
  }
  if (!notes[name]) return new Response("not found", { status: 404 });
  const homeRes = await fetch(new URL("/?__record_snapshot=1", url.origin).toString(), { headers: { "user-agent": "BreckhausRecordBot/1.0", "accept": "text/html" } });
  let html = homeRes.ok ? await homeRes.text() : "";
  if (!html || html.length < 1000) {
    const assetRes = await env.ASSETS.fetch(new Request(new URL("/", url.origin)));
    html = await assetRes.text();
  }
  const stamp = new Date().toISOString();
  const out = "<!-- Breckhaus Aframe build record | " + notes[name] + " | " + stamp + " -->\n" + html;
  return new Response(out, { status: 200, headers: { "content-type": "text/html; charset=utf-8", "content-disposition": "attachment; filename=\"" + name + "\"", "cache-control": "no-store" } });
}
async function handleContact(request, env) {
  if (request.method !== "POST") return cJson({ ok: false, error: "method_not_allowed" }, 405, request);
  let d;
  try {
    d = await request.json();
  } catch (e) {
    return cJson({ ok: false, error: "bad_request" }, 400, request);
  }
  if (!d || typeof d !== "object") return cJson({ ok: false, error: "bad_request" }, 400, request);
  const clean = (v) => typeof v === "string" ? v.replace(/\r\n?/g, "\n").trim() : "";
  const name = clean(d.name).replace(/[\n\t]+/g, " ");
  const email = clean(d.email);
  const message = clean(d.message);
  const hp = clean(d.website || d.company || d._hp);
  if (hp) return cJson({ ok: false, error: "bad_request" }, 400, request);
  if (!name || name.length > 100) return cJson({ ok: false, error: "invalid_name" }, 400, request);
  if (email.length > 254 || !/^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]+$/.test(email)) return cJson({ ok: false, error: "invalid_email" }, 400, request);
  if (!message || message.length > 5e3) return cJson({ ok: false, error: "invalid_message" }, 400, request);
  const to = "breckhausaframe@gmail.com";
  const from = "form@breckhausaframe.com";
  const ts = new Date().toISOString();
  const safeName = name.replace(/[^\x20-\x7E]/g, "?").replace(/["\\]/g, "");
  const subj = "Website message from " + name;
  const encSubj = /^[\x20-\x7E]*$/.test(subj) ? subj : "=?UTF-8?B?" + b64(subj) + "?=";
  const body = "Name: " + name + "\nEmail: " + email + "\nTime: " + ts + "\n\nMessage:\n" + message + "\n";
  const raw = [
    'From: "Breckhaus website" <' + from + ">",
    "To: <" + to + ">",
    "Reply-To: " + (safeName ? '"' + safeName + '" ' : "") + "<" + email + ">",
    "Subject: " + encSubj,
    "Date: " + new Date().toUTCString().replace("GMT", "+0000"),
    "Message-ID: <" + crypto.randomUUID() + "@breckhausaframe.com>",
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    b64(body).replace(/.{76}/g, "$&\r\n"),
    ""
  ].join("\r\n");
  try {
    await env.CONTACT_EMAIL.send(new EmailMessage(from, to, raw));
    return cJson({ ok: true }, 200, request);
  } catch (e) {
    console.log("contact send failed: " + (e && e.message));
    return cJson({ ok: false, error: "send_failed" }, 502, request);
  }
}

function b64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export default worker_default;
