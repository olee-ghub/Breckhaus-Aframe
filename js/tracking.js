/*
 * Breckhaus Aframe — Meta Pixel + GA4 scaffold
 *
 * Oliver must edit the two placeholders below before anything is sent:
 *   META_PIXEL_ID        numeric Meta Pixel ID (Events Manager → Data sources)
 *   GA4_MEASUREMENT_ID   GA4 measurement ID (Admin → Data streams), format G-XXXXXXXX
 *
 * Confirm whether a GA4 property already exists before creating another one.
 * Leave these strings unchanged until the real IDs are ready. While they are
 * still the placeholders, this file does not request fbevents.js or gtag.js.
 *
 * Event choice (this site is one property page; booking is a request, not a charge):
 *   ViewContent          once per page that contains #property.
 *                        There is no separate property URL. index.html is the listing.
 *   Schedule             when a guest clicks a link to #book (fixed nav
 *                        "Check Availability" and footer "Book Direct" are the
 *                        same in-page booking flow) and once when they first
 *                        click into the Hospitable booking panel.
 *                        Schedule, not Lead: the click starts date selection.
 *                        It does not submit guest details.
 *   CompleteRegistration only if the guest comes back to this site with
 *                        ?booking=confirmed (or #booking-confirmed) after the
 *                        Hospitable request. Not Purchase: the widget's Reserve
 *                        step is "Request to book" and says the guest is not
 *                        charged yet. The request itself finishes on
 *                        booking.hospitable.com, which this repo cannot tag.
 *                        If Review & Confirm actually captures payment, change
 *                        this one event to Purchase / GA4 purchase.
 *
 * Page hits: Meta PageView once (base code) and GA4 page_view once (config).
 * ViewContent is an extra event, not a second pageview.
 */
(function () {
  if (window.BreckhausTracking && window.BreckhausTracking.installed) return;

  var META_PIXEL_ID = "META_PIXEL_ID";
  var GA4_MEASUREMENT_ID = "GA4_MEASUREMENT_ID";

  var LISTING = {
    content_name: "Breckhaus Aframe",
    content_category: "vacation_rental",
    content_type: "home_listing",
    content_ids: ["breckhaus-aframe"]
  };

  function isPixelId(id) {
    return /^\d{8,20}$/.test(id);
  }
  function isMeasurementId(id) {
    return /^G-[A-Z0-9]{4,}$/.test(id);
  }

  var metaReady = isPixelId(META_PIXEL_ID);
  var gaReady = isMeasurementId(GA4_MEASUREMENT_ID);
  var events = [];

  var status = {
    installed: true,
    meta: metaReady ? "ready" : "placeholder",
    ga4: gaReady ? "ready" : "placeholder",
    events: events
  };
  window.BreckhausTracking = status;

  function remember(channel, name, params) {
    events.push({ channel: channel, name: name, params: params, at: Date.now() });
  }

  function loadMeta() {
    if (window.fbq) {
      status.meta = "skipped_existing_fbq";
      return;
    }
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = "2.0";
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", META_PIXEL_ID);
    window.fbq("track", "PageView");
    remember("meta", "PageView", {});
  }

  function loadGa4() {
    if (window.gtag || (window.dataLayer && window.google_tag_data)) {
      status.ga4 = "skipped_existing_gtag";
      return;
    }
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA4_MEASUREMENT_ID, { send_page_view: true });
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA4_MEASUREMENT_ID);
    document.head.appendChild(s);
    remember("ga4", "page_view", { send_page_view: true });
  }

  function meta(eventName, params) {
    remember("meta", eventName, params);
    if (status.meta === "ready" && window.fbq) window.fbq("track", eventName, params);
  }

  function ga(eventName, params) {
    remember("ga4", eventName, params);
    if (status.ga4 === "ready" && window.gtag) window.gtag("event", eventName, params);
  }

  function listingParams(extra) {
    var params = {
      content_name: LISTING.content_name,
      content_category: LISTING.content_category,
      content_type: LISTING.content_type,
      content_ids: LISTING.content_ids
    };
    if (extra) {
      for (var key in extra) {
        if (Object.prototype.hasOwnProperty.call(extra, key)) params[key] = extra[key];
      }
    }
    return params;
  }

  function trackViewContent() {
    if (!document.getElementById("property")) return;
    var params = listingParams({ cta: "property_page" });
    meta("ViewContent", params);
    ga("ViewContent", params);
  }

  function trackSchedule(cta) {
    var params = listingParams({ cta: cta });
    meta("Schedule", params);
    ga("Schedule", params);
  }

  function trackCompleteRegistration() {
    var params = listingParams({ cta: "booking_return" });
    var storageKey = "breckhaus_complete_registration";
    try {
      if (window.sessionStorage.getItem(storageKey)) return;
      window.sessionStorage.setItem(storageKey, "1");
    } catch (err) { /* private mode: still send once this load */ }
    meta("CompleteRegistration", params);
    ga("CompleteRegistration", params);
  }

  function bookingConfirmedInUrl() {
    var query = new URLSearchParams(window.location.search);
    if (query.get("booking") === "confirmed") return true;
    return window.location.hash === "#booking-confirmed";
  }

  function ctaName(anchor) {
    if (anchor.closest && anchor.closest("nav")) return "sticky_nav";
    if (anchor.closest && anchor.closest("footer")) return "footer";
    return "booking_link";
  }

  if (metaReady) loadMeta();
  if (gaReady) loadGa4();

  trackViewContent();
  if (bookingConfirmedInUrl()) trackCompleteRegistration();

  document.addEventListener("click", function (event) {
    var anchor = event.target && event.target.closest ? event.target.closest('a[href="#book"]') : null;
    if (!anchor) return;
    trackSchedule(ctaName(anchor));
  }, true);

  var panelTracked = false;
  window.addEventListener("blur", function () {
    if (panelTracked) return;
    var frame = document.getElementById("booking-iframe");
    if (frame && document.activeElement === frame) {
      panelTracked = true;
      trackSchedule("booking_panel");
    }
  });
})();
