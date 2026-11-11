import { EmailMessage } from "cloudflare:email";

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
const LOGO_MARK_SRC = "assets/logo-mark-nav.png?v=bold2";

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
    var favLinks = '<link rel="icon" href="/favicon.ico" sizes="any" /><link rel="icon" type="image/png" href="/assets/logo-mark-nav.png?v=bold2" /><link rel="apple-touch-icon" href="/assets/logo-mark-nav.png?v=bold2" /><!-- bh-favicon-v1 -->';
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

    html = html.replace(/<a href="#house">The house<\/a>/g, '<a href="#house">Basecamp</a>');
    html = html.replace(/<a href="#house">House<\/a>/g, '<a href="#house">Basecamp</a>');

    const navTabsCss = "<style id=\"bh-nav-tabs-v30\">\n@media (min-width: 1024px) {\n  nav { display: flex !important; align-items: center !important; gap: 2rem !important; }\n  .nav-logo { flex: 0 0 auto !important; }\n  .nav-end {\n    flex: 1 1 auto !important;\n    min-width: 0 !important;\n    display: flex !important;\n    align-items: center !important;\n    justify-content: space-between !important;\n    gap: 0 !important;\n    padding-left: 0.35rem !important;\n  }\n  .nav-links { display: contents !important; }\n  .nav-links > li { display: contents !important; }\n  .nav-links a { white-space: nowrap !important; flex: 0 0 auto !important; }\n    .nav-more { display: none !important; }\n  .bh-mnav { display: none !important; }\n  #header-reserve, nav .nav-end > a.btn-gold {\n    flex: 0 0 auto !important;\n    margin-left: 0 !important;\n  }\n}\n@media (min-width: 768px) and (max-width: 1023px) {\n  nav { display: flex !important; align-items: center !important; gap: 1rem !important; }\n  .nav-logo { flex: 0 0 auto !important; transform: none !important; }\n  .nav-links { display: none !important; }\n  .nav-more { display: none !important; }\n  .nav-end {\n    flex: 1 1 auto !important;\n    min-width: 0 !important;\n    display: flex !important;\n    align-items: center !important;\n    justify-content: space-between !important;\n    gap: 0 !important;\n  }\n  .bh-mnav { display: contents !important; }\n  .bh-mnav-house {\n    position: relative !important;\n    display: flex !important;\n    align-items: center !important;\n    flex: 0 0 auto !important;\n    width: auto !important;\n    min-width: 0 !important;\n  }\n  .bh-mnav-house > summary {\n    list-style: none !important;\n    cursor: pointer !important;\n    display: inline-flex !important;\n    align-items: center !important;\n    justify-content: center !important;\n    font-size: 0.936rem !important;\n    letter-spacing: 0.1em !important;\n    text-transform: uppercase !important;\n    color: var(--cream-dim) !important;\n    white-space: nowrap !important;\n    padding: 0.2rem 0.1rem !important;\n  }\n  .bh-mnav-house > summary::-webkit-details-marker { display: none; }\n  .bh-mnav-house > summary::after {\n    content: \"\";\n    display: inline-block;\n    box-sizing: border-box;\n    width: 0;\n    height: 0;\n    margin-left: 0.32em;\n    border-style: solid;\n    border-width: 0.42em 0.34em 0 0.34em;\n    border-color: currentColor transparent transparent transparent;\n    font-size: 1.25em;\n    opacity: 1;\n    vertical-align: middle;\n    transform: translateY(0.08em);\n  }\n  .bh-mnav > a {\n    text-decoration: none !important;\n    font-size: 0.936rem !important;\n    letter-spacing: 0.1em !important;\n    text-transform: uppercase !important;\n    color: var(--cream-dim) !important;\n    white-space: nowrap !important;\n    padding: 0.2rem 0.1rem !important;\n    flex: 0 0 auto !important;\n  }\n  /* Tablet dropdown stays Layout / Reviews / The area / Seasons */\n  .bh-mnav-panel a[href=\"#flyover\"],\n  .bh-mnav-panel a[href=\"#gallery\"] { display: none !important; }\n  .bh-mnav-panel {\n    position: absolute !important;\n    top: calc(100% + 0.45rem) !important;\n    left: 0 !important;\n    right: auto !important;\n    min-width: 10.5rem !important;\n    background: rgba(13,13,11,0.96) !important;\n    border: 1px solid rgba(242,237,228,0.18) !important;\n    padding: 0.45rem 0 !important;\n    z-index: 300 !important;\n    display: flex !important;\n    flex-direction: column !important;\n  }\n  .bh-mnav-panel a {\n    display: block !important;\n    padding: 0.55rem 0.85rem !important;\n    text-decoration: none !important;\n    font-size: 0.72rem !important;\n    letter-spacing: 0.12em !important;\n    text-transform: uppercase !important;\n    color: var(--cream) !important;\n    white-space: nowrap !important;\n  }\n  #header-reserve, nav .nav-end > a.btn-gold {\n    flex: 0 0 auto !important;\n    margin-left: 0 !important;\n    font-size: 0.884rem !important;\n  }\n}\n@media (max-width: 767px) {\n  .nav-links { display: none !important; }\n  .nav-more { display: none !important; }\n  .nav-logo { max-width: 56px !important; }\n  .nav-mark, .nav-mark .site-logo, nav img.site-logo {\n    width: 56px !important;\n    max-width: 56px !important;\n    height: auto !important;\n    max-height: 52px !important;\n  }\n  .nav-end {\n    display: flex !important;\n    align-items: center !important;\n    gap: 0.45rem !important;\n    flex: 1 1 auto !important;\n    min-width: 0 !important;\n    justify-content: flex-start !important;\n    width: 100% !important;\n  }\n  .bh-mnav {\n    display: flex !important;\n    align-items: center !important;\n    justify-content: space-between !important;\n    gap: 0 !important;\n    flex: 1 1 auto !important;\n    min-width: 0 !important;\n    width: auto !important;\n    margin-left: 0.65rem !important;\n    margin-right: 0.2rem !important;\n  }\n  .bh-mnav > a {\n    text-decoration: none !important;\n    font-size: 0.7728rem !important;\n    letter-spacing: 0.05em !important;\n    text-transform: uppercase !important;\n    color: var(--cream-dim) !important;\n    white-space: nowrap !important;\n    padding: 0.2rem 0 !important;\n    text-align: center !important;\n    flex: 0 0 auto !important;\n    min-width: 0 !important;\n  }\n  /* Mobile: Flyover is in dropdown, not a top tab */\n  .bh-mnav > a[href=\"#flyover\"] { display: none !important; }\n  .bh-mnav-house {\n    position: relative !important;\n    display: inline-flex !important;\n    align-items: center !important;\n    justify-content: flex-start !important;\n    flex: 0 0 auto !important;\n    width: max-content !important;\n    max-width: none !important;\n    min-width: 0 !important;\n  }\n  .bh-mnav-house > summary {\n    list-style: none !important;\n    cursor: pointer !important;\n    display: inline-flex !important;\n    align-items: center !important;\n    justify-content: center !important;\n    font-size: 0.7728rem !important;\n    letter-spacing: 0.05em !important;\n    text-transform: uppercase !important;\n    color: var(--cream-dim) !important;\n    white-space: nowrap !important;\n    padding: 0.2rem 0.05rem !important;\n  }\n  .bh-mnav-house > summary::-webkit-details-marker { display: none; }\n  .bh-mnav-house > summary::after {\n    content: \"\";\n    display: inline-block;\n    box-sizing: border-box;\n    width: 0;\n    height: 0;\n    margin-left: 0.32em;\n    border-style: solid;\n    border-width: 0.42em 0.34em 0 0.34em;\n    border-color: currentColor transparent transparent transparent;\n    font-size: 1.25em;\n    opacity: 1;\n    vertical-align: middle;\n    transform: translateY(0.08em);\n  }\n  .bh-mnav-panel {\n    position: absolute !important;\n    top: calc(100% + 0.45rem) !important;\n    right: 0 !important;\n    min-width: 10.5rem !important;\n    background: rgba(13,13,11,0.96) !important;\n    border: 1px solid rgba(242,237,228,0.18) !important;\n    padding: 0.45rem 0 !important;\n    z-index: 300 !important;\n    display: flex !important;\n    flex-direction: column !important;\n  }\n  .bh-mnav-panel a {\n    display: block !important;\n    padding: 0.55rem 0.85rem !important;\n    text-decoration: none !important;\n    font-size: 0.7rem !important;\n    letter-spacing: 0.12em !important;\n    text-transform: uppercase !important;\n    color: var(--cream) !important;\n    white-space: nowrap !important;\n  }\n  #header-reserve, nav .nav-end > a.btn-gold { flex: 0 0 auto !important; }\n}\n\n@media (max-width: 1023px) {\n  .bh-mnav-house > .bh-mnav-panel { display: none !important; }\n  .bh-mnav-house:hover > .bh-mnav-panel,\n  .bh-mnav-house:focus-within > .bh-mnav-panel,\n  .bh-mnav-house[open] > .bh-mnav-panel { display: flex !important; }\n\n  .bh-mnav-house.bh-mnav-dismissed > .bh-mnav-panel { display: none !important; }\n  .bh-mnav-house.bh-mnav-dismissed:hover > .bh-mnav-panel { display: none !important; }}\n</style>";
    if (html.includes('</head>')) {
      html = html.replace('</head>', navTabsCss + '</head>');
      changed = true;
    }
    if (!html.includes('id="bh-mnav"') && html.includes('id="header-reserve"')) {
      html = html.replace(
        '<a class="btn-gold" id="header-reserve"',
        "<div class=\"bh-mnav\" id=\"bh-mnav\"><details class=\"bh-mnav-house\"><summary>Basecamp</summary><div class=\"bh-mnav-panel\"><a href=\"#flyover\">Flyover</a><a href=\"#layout\">Layout</a><a href=\"#gallery\">Photos</a><a href=\"#reviews\">Reviews</a><a href=\"#area\">The area</a><a href=\"#seasons\">Seasons</a></div></details><a href=\"#flyover\">Flyover</a><a href=\"#gallery\">Photos</a><a href=\"#faq\">FAQ</a><a href=\"#contact\">Contact</a></div>" + '<a class="btn-gold" id="header-reserve"'
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


  // bh-house-stat-beds-v1: add 3 bed / 3 bath to #house h-stat line (same gold separators)
  if (!html.includes("bh-house-stat-beds-v1")) {
    var houseStatRe = /(<p class="h-stat">)\s*<span>\s*2,?700\s*sq\s*ft\s*<\/span>\s*<span>\s*sleeps\s*8\s*<\/span>\s*<\/p>/i;
    var houseStatNext = html.replace(
      houseStatRe,
      '$1<span>2,700 sq ft</span><span>three bedroom, three bath</span><span>sleeps 8</span></p>'
    );
    if (houseStatNext !== html) {
      html = houseStatNext;
      changed = true;
    }
    // Marker so we do not thrash; also covers already-updated markup
    if (html.includes("</head>")) {
      html = html.replace("</head>", "<!-- bh-house-stat-beds-v1 -->" + "</head>");
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



  // bh-hero-fourline-v5: beige lede/mins (yesterday putty), periods, desktop lower near patio
  if (!html.includes("bh-hero-fourline-v5")) {
    html = html.replace(/<style id="bh-hero-final-v\d+"[\s\S]*?<\/style>/g, "");
    html = html.replace(/<style id="bh-hero-line-v\d+"[\s\S]*?<\/style>/g, "");
    html = html.replace(/<style id="bh-hero-aframe-mid-v\d+"[\s\S]*?<\/style>/g, "");
    html = html.replace(/<style id="bh-hero-fourline-v\d+"[\s\S]*?<\/style>/g, "");
    html = html.replace(/<style id="bh-hero-pos-v\d+"[\s\S]*?<\/style>/g, "");
    html = html.replace(/<style id="bh-hero-debrand-v\d+"[\s\S]*?<\/style>/g, "");
    var heroFourCss = "<style id=\"bh-hero-fourline-v5\">"
      + ".hero-inner{position:absolute!important;inset:0!important;width:100%!important;max-width:none!important;margin:0!important;padding:0!important;display:flex!important;flex-direction:column!important;justify-content:center!important;align-items:flex-start!important;gap:0!important;z-index:2!important;box-sizing:border-box!important;pointer-events:none!important;transform:none!important}"
      + ".hero-inner>h1,.hero h1,.hero-inner h1,.hero-inner>.hero-loc,.hero-inner>p.eyebrow,.hero p.eyebrow,.hero-loc,.hero-inner>.hero-facts,.hero .hero-facts,.hero-facts,.hero-fact-val,.hero-fact-lbl,.hero-place,.hero-lede .hl,.hero-lede .hl1,.hero-lede .hl2,.hero-aframe--solo,.hero-aframe--lockup{display:none!important;visibility:hidden!important;opacity:0!important;height:0!important;max-height:0!important;margin:0!important;padding:0!important;overflow:hidden!important;font-size:0!important;line-height:0!important;position:absolute!important;left:-10000px!important;width:1px!important;clip:rect(0,0,0,0)!important;pointer-events:none!important}"
      + ".hero-brand,.hero-aframe,.hero-lede,.hero-mins{display:block!important;visibility:visible!important;opacity:1!important;position:relative!important;left:auto!important;top:auto!important;transform:none!important;width:auto!important;max-width:min(92vw,36rem)!important;margin:0!important;padding:0 0 0 clamp(1rem,3.5vw,2.4rem)!important;text-align:left!important;pointer-events:none!important;z-index:3!important;white-space:nowrap!important;text-shadow:0 1px 2px rgba(0,0,0,.45),0 2px 10px rgba(0,0,0,.28)!important}"
      + ".hero-brand{font-family:\"Playfair Display\",\"Cormorant Garamond\",serif!important;font-style:normal!important;font-weight:400!important;font-size:clamp(2.4rem,5.2vw,4.6rem)!important;line-height:1.02!important;letter-spacing:-.02em!important;text-transform:none!important;color:rgba(242,237,228,.96)!important;-webkit-text-fill-color:rgba(242,237,228,.96)!important}"
      + ".hero-aframe{font-family:\"Playfair Display\",\"Cormorant Garamond\",serif!important;font-style:italic!important;font-weight:400!important;font-size:clamp(2.4rem,5.2vw,4.6rem)!important;line-height:1.02!important;letter-spacing:-.03em!important;margin-top:.02em!important;text-transform:none!important;color:rgba(196,194,186,.96)!important;-webkit-text-fill-color:rgba(196,194,186,.96)!important}"
      + ".hero-aframe em{font-style:italic!important;font-weight:400!important;color:rgba(196,194,186,.96)!important;-webkit-text-fill-color:rgba(196,194,186,.96)!important}"
      + ".hero-lede,.hero-mins{font-family:Jost,system-ui,sans-serif!important;font-style:normal!important;font-weight:400!important;font-size:clamp(.95rem,1.55vw,1.15rem)!important;line-height:1.45!important;letter-spacing:.01em!important;white-space:normal!important;color:rgba(196,194,186,.96)!important;-webkit-text-fill-color:rgba(196,194,186,.96)!important}"
      + ".hero-lede{margin-top:1.05rem!important}"
      + ".hero-mins{margin-top:.35rem!important}"
      /* Desktop: lower the whole lockup toward patio door / window band */
      + "@media (min-width:1024px){.hero-inner{justify-content:flex-end!important;padding-bottom:clamp(4.5rem,14vh,8.5rem)!important;padding-top:0!important}.hero-lede,.hero-mins{font-size:1.075rem!important;max-width:34rem!important;line-height:1.55!important}}"
      + "@media (max-width:1023px){.hero-brand,.hero-aframe{font-size:clamp(2.05rem,7vw,3.2rem)!important}.hero-lede,.hero-mins{font-size:clamp(.9rem,2.4vw,1.05rem)!important;max-width:88vw!important}}"
      + "@media (max-width:767px){.hero-brand,.hero-aframe,.hero-lede,.hero-mins{padding-left:.85rem!important}.hero-brand,.hero-aframe{font-size:clamp(1.85rem,9.2vw,2.45rem)!important;white-space:normal!important}.hero-lede,.hero-mins{font-size:.92rem!important;max-width:90vw!important}}"
      + "</style>";
    if (html.includes("</head>")) { html = html.replace("</head>", heroFourCss + "</head>"); changed = true; }
    var heroInnerHtml = '<div class="hero-inner"><p class="hero-brand">Breckhaus</p><p class="hero-aframe"><em>Aframe</em></p><p class="hero-lede">Elevated living in high country.</p><p class="hero-mins">Twelve minutes to Breckenridge.</p></div>';
    var heroRep = replaceBalancedOpenTag(html, /<div class="hero-inner"[^>]*>/i, heroInnerHtml);
    html = heroRep.html; if (heroRep.changed) changed = true;
    html = html.replace(/<div class="hero-facts"[\s\S]*?<\/div>/gi, "");
    if (!html.includes("hero-brand") || !html.includes("hero-mins") || html.includes(">A-frame<") || !html.includes("high country.</p>") || !html.includes("Breckenridge.</p>")) {
      html = html.replace(/<p class="hero-aframe"[^>]*>[\s\S]*?<\/p>/i, '<p class="hero-aframe"><em>Aframe</em></p>');
      html = html.replace(/<div class="hero-inner"[^>]*>[\s\S]*?<\/div>/i, heroInnerHtml);
      changed = true;
    }
    html = html.replace(/Sleeps\s*8\.\s*Hot tub,[^<]*/gi, "");
    html = html.replace(/Elevated living in the high country\.?/gi, "");
    html = html.replace(/Mt\.\s*Quandary views\.?/gi, "");
    html = html.replace(/<p class="hero-loc">[\s\S]*?<\/p>/gi, "");
    html = html.replace(/<p class="eyebrow">[\s\S]*?<\/p>/i, "");
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
    var tMenuHtml = "<details class=\"bh-tmenu\" id=\"bh-tmenu\"><summary>Menu</summary><div class=\"bh-tmenu-panel\" role=\"menu\"><a href=\"#house\">Basecamp</a><a href=\"#layout\">Layout</a><a href=\"#flyover\">Flyover</a><a href=\"#gallery\">Photos</a><a href=\"#reviews\">Reviews</a><a href=\"#seasons\">Seasons</a><a href=\"#area\">The area</a><a href=\"#faq\">FAQ</a><a href=\"#contact\">Contact</a><div class=\"bh-tmenu-sep\" role=\"separator\"></div><button type=\"button\" class=\"bh-tmenu-action\" data-bh-open=\"bh-ev\" id=\"bh-tmenu-events\">Local Events</button><button type=\"button\" class=\"bh-tmenu-action\" data-bh-open=\"bh-wx\" id=\"bh-tmenu-weather\">Weather</button></div></details>";
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

  // bh-nav-events-wx-bar-v1: Menu + Events + weather + Reserve on ≤1023; Events LEFT of temperature
  if (!html.includes("bh-nav-events-wx-bar-v1")) {
    html = html.replace(/<style id="bh-nav-events-wx-bar-v\d+"[\s\S]*?<\/style>/g, "");
    var barCss = "<style id=\"bh-nav-events-wx-bar-v1\">"
      + "@media (max-width:1023px){"
      + ".nav-end{display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:.3rem!important;flex-wrap:nowrap!important}"
      + ".bh-tmenu{display:flex!important;order:0!important;margin-right:auto!important;position:relative!important;flex:0 0 auto!important}"
      /* Restore Events + weather as visible nav pills; Events immediately left of weather */
      + ".bh-ev,.bh-wx{position:relative!important;top:auto!important;right:auto!important;left:auto!important;width:auto!important;height:auto!important;margin:0!important;padding:0!important;overflow:visible!important;z-index:330!important;flex:0 0 auto!important;display:inline-flex!important;align-items:center!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important}"
      + ".bh-ev{order:1!important}"
      + ".bh-wx{order:2!important}"
      + "#header-reserve,nav .nav-end>a.btn-gold{order:3!important;flex:0 0 auto!important;display:inline-flex!important;visibility:visible!important;opacity:1!important}"
      + ".bh-ev-trigger,.bh-wx-trigger{position:static!important;width:auto!important;height:auto!important;min-height:2.25rem!important;opacity:1!important;pointer-events:auto!important;overflow:visible!important;clip:auto!important;clip-path:none!important}"
      + ".bh-ev-panel,.bh-wx-panel{position:absolute!important;top:calc(100% + 8px)!important;right:0!important;left:auto!important;width:min(22rem,calc(100vw - 20px))!important;max-height:min(70vh,28rem)!important;pointer-events:auto!important}"
      + "}"
      + "@media (max-width:767px){"
      + ".bh-ev-trigger .bh-ev-label-full{display:none!important}"
      + ".bh-ev-trigger .bh-ev-label-short{display:inline!important}"
      + ".bh-ev-trigger,.bh-wx-trigger{padding:.32rem .48rem!important}"
      + ".bh-ev-trigger .bh-ev-label{font-size:.6rem!important}"
      + "}"
      + "@media (min-width:1024px){"
      + ".bh-ev,.bh-wx{display:inline-flex!important;order:unset!important}"
      + "}"
      + "</style>";
    if (html.includes("</head>")) { html = html.replace("</head>", barCss + "</head>"); changed = true; }
    // Ensure DOM order Menu → Events → weather → Reserve
    (function () {
      var navStart = html.search(/<nav\b[^>]*>/i);
      if (navStart < 0) return;
      var navOpenEnd = html.indexOf(">", navStart) + 1;
      var navClose = html.toLowerCase().indexOf("</nav>", navOpenEnd);
      if (navClose < 0) return;
      var navInner = html.slice(navOpenEnd, navClose);
      function pull(fragment, openRe) {
        var m = openRe.exec(fragment);
        if (!m) return { item: "", rest: fragment };
        var start = m.index;
        var tag = (/^<([a-z0-9:-]+)/i.exec(m[0]) || [])[1];
        if (!tag) return { item: "", rest: fragment };
        var i = start + m[0].length, depth = 1;
        var lower = fragment.toLowerCase();
        var t = tag.toLowerCase();
        while (i < fragment.length && depth > 0) {
          var no = lower.indexOf("<" + t, i);
          var nc = lower.indexOf("</" + t, i);
          if (nc < 0) break;
          if (no >= 0 && no < nc) {
            var ch = lower[no + 1 + t.length];
            if (ch === ">" || ch === " " || ch === "\n" || ch === "\t" || ch === "/") depth++;
            i = no + 1 + t.length;
            continue;
          }
          depth--;
          if (depth === 0) {
            var closeEnd = lower.indexOf(">", nc) + 1;
            return { item: fragment.slice(start, closeEnd), rest: fragment.slice(0, start) + fragment.slice(closeEnd) };
          }
          i = nc + 2 + t.length;
        }
        return { item: "", rest: fragment };
      }
      var logoMatch = navInner.match(/<a class="nav-logo[\s\S]*?<\/a>/i);
      var logo = logoMatch ? logoMatch[0] : "";
      var linksMatch = navInner.match(/<ul class="nav-links"[\s\S]*?<\/ul>/i);
      var links = linksMatch ? linksMatch[0] : "";
      var moreMatch = navInner.match(/<details class="nav-more"[\s\S]*?<\/details>/i);
      var more = moreMatch ? moreMatch[0] : "";
      var rest = navInner, tmenu = "", ev = "", wx = "", reserve = "", pulled;
      pulled = pull(rest, /<details\s+[^>]*class="[^"]*bh-tmenu[^"]*"[^>]*>/i); if (pulled.item) { tmenu = pulled.item; rest = pulled.rest; }
      pulled = pull(rest, /<div\s+[^>]*class="[^"]*bh-ev[^"]*"[^>]*>/i); if (pulled.item) { ev = pulled.item; rest = pulled.rest; }
      pulled = pull(rest, /<div\s+[^>]*class="[^"]*bh-wx[^"]*"[^>]*>/i); if (pulled.item) { wx = pulled.item; rest = pulled.rest; }
      var rMatch = rest.match(/<a class="btn-gold" id="header-reserve"[\s\S]*?<\/a>/i);
      if (rMatch) { reserve = rMatch[0]; rest = rest.replace(rMatch[0], ""); }
      if (!tmenu || !reserve) return;
      var newNav = logo + "\n    <div class=\"nav-end\">\n      " + links + "\n      " + more + "\n      " + tmenu + ev + wx + reserve + "\n    </div>\n  ";
      html = html.slice(0, navOpenEnd) + newNav + html.slice(navClose);
      changed = true;
    })();
    changed = true;
  }

  // bh-hero-breckhaus-restore-v1: Breckhaus HAUS spelling, larger lockup, yesterday desktop position
  if (!html.includes("bh-hero-breckhaus-restore-v1")) {
    html = html.replace(/<style id="bh-hero-breckhaus-restore-v\d+"[\s\S]*?<\/style>/g, "");
    var restoreCss = "<style id=\"bh-hero-breckhaus-restore-v1\">"
      + ".hero-inner{position:absolute!important;inset:0!important;display:flex!important;flex-direction:column!important;justify-content:center!important;align-items:flex-start!important;transform:translate(-1vw,-10vh)!important;padding:0!important;margin:0!important;z-index:2!important;pointer-events:none!important}"
      + ".hero-brand,.hero-aframe{display:block!important;visibility:visible!important;opacity:1!important;position:relative!important;left:auto!important;width:auto!important;max-width:min(94vw,40rem)!important;margin:0!important;padding:0 0 0 clamp(1rem,3.5vw,2.4rem)!important;font-family:\"Playfair Display\",\"Cormorant Garamond\",serif!important;font-weight:400!important;line-height:1.02!important;letter-spacing:-.02em!important;white-space:nowrap!important;text-shadow:0 1px 2px rgba(0,0,0,.55),0 2px 10px rgba(0,0,0,.32)!important;z-index:3!important}"
      + ".hero-brand{font-style:normal!important;font-size:clamp(2.85rem,6.2vw,5.4rem)!important;color:rgba(242,237,228,.96)!important;-webkit-text-fill-color:rgba(242,237,228,.96)!important}"
      + ".hero-aframe,.hero-aframe em{font-style:italic!important;font-size:clamp(2.85rem,6.2vw,5.4rem)!important;letter-spacing:-.03em!important;color:rgba(196,194,186,.96)!important;-webkit-text-fill-color:rgba(196,194,186,.96)!important}"
      + ".hero-aframe{margin-top:.02em!important}"
      + ".hero-lede,.hero-mins{display:block!important;visibility:visible!important;opacity:1!important;position:relative!important;max-width:min(92vw,36rem)!important;padding:0 0 0 clamp(1rem,3.5vw,2.4rem)!important;font-family:Jost,system-ui,sans-serif!important;font-size:clamp(1rem,1.7vw,1.2rem)!important;line-height:1.45!important;color:rgba(196,194,186,.96)!important;-webkit-text-fill-color:rgba(196,194,186,.96)!important;text-shadow:0 1px 2px rgba(0,0,0,.45),0 2px 8px rgba(0,0,0,.28)!important}"
      + ".hero-lede{margin-top:1.05rem!important}.hero-mins{margin-top:.35rem!important}"
      + "@media (min-width:1024px){.hero-inner{justify-content:center!important;padding-bottom:0!important;transform:translate(-1vw,-10vh)!important}.hero-brand,.hero-aframe,.hero-aframe em{font-size:clamp(3.2rem,5.8vw,5.6rem)!important}}"
      + "@media (max-width:1023px){.hero-inner{transform:translate(-.5vw,-6vh)!important}.hero-brand,.hero-aframe,.hero-aframe em{font-size:clamp(2.35rem,7.6vw,3.6rem)!important;white-space:nowrap!important}}"
      + "@media (max-width:767px){.hero-inner{transform:translate(0,-4vh)!important}.hero-brand,.hero-aframe,.hero-aframe em{font-size:clamp(2.15rem,10vw,2.85rem)!important;padding-left:.85rem!important;white-space:normal!important}.hero-lede,.hero-mins{padding-left:.85rem!important;font-size:.95rem!important}}"
      + "</style>";
    if (html.includes("</head>")) { html = html.replace("</head>", restoreCss + "</head>"); changed = true; }
    html = html.replace(/<p class="hero-brand"[^>]*>[\s\S]*?<\/p>/i, '<p class="hero-brand">Breckhaus</p>');
    html = html.replace(/Breck House/g, "Breckhaus");
    html = html.replace(/BreckHaus/g, "Breckhaus");
    if (!html.includes('class="hero-brand"')) {
      var heroInnerHtml2 = '<div class="hero-inner"><p class="hero-brand">Breckhaus</p><p class="hero-aframe"><em>Aframe</em></p><p class="hero-lede">Elevated living in high country.</p><p class="hero-mins">Twelve minutes to Breckenridge.</p></div>';
      var heroRep2 = replaceBalancedOpenTag(html, /<div class="hero-inner"[^>]*>/i, heroInnerHtml2);
      html = heroRep2.html; if (heroRep2.changed) changed = true;
    }
    changed = true;
  }

  // bh-hero-tighten-v1: kill mobile 64%-media black band; shorter hero; softer fade; pull first section up
  if (!html.includes("bh-hero-tighten-v1")) {
    html = html.replace(/<style id="bh-hero-tighten-v\d+"[\s\S]*?<\/style>/g, "");
    var tightenCss = "<style id=\"bh-hero-tighten-v1\">"
      + ".hero{min-height:0!important}"
      + ".hero-media{height:100%!important;bottom:0!important;top:0!important;inset:0!important}"
      + ".hero-media::after{height:18%!important;background:linear-gradient(to bottom,rgba(13,13,11,0) 0%,rgba(13,13,11,.42) 62%,var(--charcoal,#0d0d0b) 100%)!important}"
      + ".hero-scrim{background:linear-gradient(to bottom,rgba(13,13,11,.06) 0%,rgba(13,13,11,.05) 55%,rgba(13,13,11,.22) 100%)!important}"
      + "#house.section,.section.house{padding-top:1.6rem!important;padding-bottom:2.6rem!important}"
      + "@media (max-width:767px){"
      + ".hero{min-height:68svh!important;min-height:68vh!important;max-height:74svh!important}"
      + ".hero-media{top:var(--nav-h,3.5rem)!important;height:auto!important;bottom:0!important}"
      + ".hero-media::after{height:16%!important}"
      + ".hero-inner{transform:translate(0,-1.5vh)!important}"
      + "#house.section,.section.house{padding-top:1.25rem!important;padding-bottom:2.1rem!important}"
      + ".section{padding-top:2.4rem!important;padding-bottom:2.4rem!important}"
      + "}"
      + "@media (min-width:768px) and (max-width:1023px){"
      + ".hero{min-height:74svh!important;min-height:74vh!important}"
      + ".hero-media{top:var(--nav-h,3.75rem)!important;height:auto!important;bottom:0!important}"
      + ".hero-inner{transform:translate(-.5vw,-3vh)!important}"
      + "}"
      + "@media (min-width:1024px){"
      + ".hero{min-height:86svh!important;min-height:86vh!important}"
      + ".hero-media{inset:0!important;height:auto!important}"
      + ".hero-inner{transform:translate(-1vw,-6vh)!important}"
      + "#house.section,.section.house{padding-top:2rem!important;padding-bottom:3rem!important}"
      + "}"
      + "</style>";
    if (html.includes("</head>")) { html = html.replace("</head>", tightenCss + "</head>"); changed = true; }
    changed = true;
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

    // Favicon from logo mark (R2)
    if (url.pathname === "/favicon.ico" || url.pathname === "/apple-touch-icon.png" || url.pathname === "/apple-touch-icon-precomposed.png") {
      return serveR2Object(request, env, LOGO_MARK_R2_KEY, "image/png", "public, max-age=86400");
    }

    if (url.pathname === LOGO_MARK_PATH) {
      return serveR2Object(request, env, LOGO_MARK_R2_KEY, "image/png", "public, max-age=86400");
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
