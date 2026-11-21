// Dziennik Snów: anonimowy licznik odwiedzin (bez IP, bez ciasteczek, bez danych osobowych)
(function () {
  try {
    if (localStorage.getItem("ds_bezstat") === "1") return;          // właściciel może wyłączyć liczenie siebie
    if (/bot|crawl|spider|preview|facebookexternalhit|WhatsApp\/|TelegramBot|Slackbot/i.test(navigator.userAgent)) return;
    const strona = location.pathname.replace(/^\/|\.html$/g, "") || "strona główna";
    // Aplikacja liczy się raz dziennie na urządzenie, strona przy każdym wejściu
    const dzis = new Date().toISOString().slice(0, 10);
    if (strona === "app") { if (localStorage.getItem("ds_stat_app") === dzis) return; localStorage.setItem("ds_stat_app", dzis); }
    let id = localStorage.getItem("ds_vid"), nowy = false;
    if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem("ds_vid", id); nowy = true; }
    const ua = navigator.userAgent, ref = document.referrer, q = new URLSearchParams(location.search);
    let zrodlo = q.get("z") || q.get("utm_source") || "";
    if (!zrodlo && ref) {
      const h = new URL(ref).hostname.replace(/^www\./, "");
      if (h === location.hostname || h.endsWith("github.io")) zrodlo = "";
      else if (/whatsapp|wa\.me/.test(h)) zrodlo = "WhatsApp";
      else if (/facebook|fb\.com|fb\.me/.test(h)) zrodlo = "Facebook";
      else if (/instagram/.test(h)) zrodlo = "Instagram";
      else if (/google\./.test(h)) zrodlo = "Google";
      else if (/t\.co|twitter|x\.com/.test(h)) zrodlo = "X / Twitter";
      else if (/tiktok/.test(h)) zrodlo = "TikTok";
      else zrodlo = h;
    }
    if (!zrodlo) zrodlo = /WhatsApp/i.test(ua) ? "WhatsApp" : /FBAN|FBAV/i.test(ua) ? "Facebook" : /Instagram/i.test(ua) ? "Instagram" : "bezpośrednio / komunikator";
    const urzadzenie = /iPad/i.test(ua) ? "iPad" : /iPhone|iPod/i.test(ua) ? "iPhone" : /Android/i.test(ua) ? "Android" : "Komputer";
    const przegladarka = /FBAN|FBAV/i.test(ua) ? "Facebook" : /Instagram/i.test(ua) ? "Instagram" : /; wv\)/.test(ua) ? "w aplikacji" :
      /SamsungBrowser/i.test(ua) ? "Samsung" : /EdgA?\//i.test(ua) ? "Edge" : /Firefox|FxiOS/i.test(ua) ? "Firefox" :
      /CriOS|Chrome/i.test(ua) ? "Chrome" : /Safari/i.test(ua) ? "Safari" : "inna";
    const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || "");
    const KRAJE = { "Europe/Warsaw": "Polska", "Europe/Amsterdam": "Holandia", "Europe/Berlin": "Niemcy", "Europe/London": "Wielka Brytania",
      "Europe/Dublin": "Irlandia", "Europe/Oslo": "Norwegia", "Europe/Stockholm": "Szwecja", "Europe/Brussels": "Belgia", "Europe/Paris": "Francja",
      "Europe/Vienna": "Austria", "Europe/Prague": "Czechy", "Europe/Copenhagen": "Dania", "Europe/Rome": "Włochy", "Europe/Madrid": "Hiszpania",
      "Europe/Zurich": "Szwajcaria", "Europe/Kiev": "Ukraina", "Europe/Kyiv": "Ukraina", "America/New_York": "USA (wsch.)", "America/Chicago": "USA (centr.)",
      "America/Los_Angeles": "USA (zach.)", "America/Toronto": "Kanada" };
    const region = KRAJE[tz] || tz || "?";
    const zainstalowana = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
    fetch("https://qtbjrwcwatxgsuwaxklf.supabase.co/rest/v1/wizyty", {
      method: "POST", keepalive: true,
      headers: { apikey: "sb_publishable_AY0XDT4l0agvrRNAkUfjAg_65SUa3zf", "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ strona: strona.slice(0, 40), odwiedzajacy: id.slice(0, 40), nowy, zrodlo: zrodlo.slice(0, 60), urzadzenie, przegladarka,
        region: region.slice(0, 60), jezyk: (navigator.language || "").slice(0, 12), zainstalowana })
    }).catch(() => {});
  } catch (e) { /* statystyki nigdy nie psują strony */ }
})();
