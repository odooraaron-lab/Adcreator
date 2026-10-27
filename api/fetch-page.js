import { authorised } from "./_auth.js";

const PRIVATE = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[?::1\]?$|\[?f[cd])/i;
const HINT = /menu|food|drink|event|what'?s-?on|whatson|special|happy|function|quiz|music|gig|book|deal|promo|kitchen|bar/i;

function decode(s) {
  return s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

export default async function handler(req, res) {
  if (!authorised(req)) return res.status(401).json({ error: "unauthorised" });
  const raw = String((req.query && req.query.url) || "");
  let url;
  try { url = new URL(raw); } catch { return res.status(400).json({ error: "bad_url" }); }
  if (!/^https?:$/.test(url.protocol) || PRIVATE.test(url.hostname)) return res.status(400).json({ error: "bad_url" });

  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 15000);
    const r = await fetch(url, {
      signal: ctl.signal, redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 (compatible; VenuePromoStudio/1.0)", "accept": "text/html,*/*;q=0.8", "accept-language": "en-NZ,en;q=0.9" },
    });
    clearTimeout(timer);
    if (!r.ok) return res.status(200).json({ error: `http_${r.status}` });
    const html = (await r.text()).slice(0, 2_000_000);
    const finalUrl = new URL(r.url || url.href);

    const meta = [];
    for (const m of html.matchAll(/<meta[^>]+(?:name|property)=["'](?:description|og:description|og:title)["'][^>]*>/gi)) {
      const c = m[0].match(/content=["']([^"']*)["']/i);
      if (c) meta.push(decode(c[1]));
    }
    const title = decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "").trim();

    const links = [];
    const seen = new Set();
    for (const m of html.matchAll(/<a\s[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
      let u;
      try { u = new URL(decode(m[1]), finalUrl); } catch { continue; }
      if (u.hostname !== finalUrl.hostname || !/^https?:$/.test(u.protocol)) continue;
      const label = decode(m[2].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
      const key = u.origin + u.pathname;
      if (seen.has(key) || key === finalUrl.origin + finalUrl.pathname) continue;
      if (!HINT.test(u.pathname + " " + label)) continue;
      seen.add(key);
      links.push({ url: key, label: label.slice(0, 60) });
      if (links.length >= 12) break;
    }

    const text = decode(html
      .replace(/<(script|style|noscript|svg|iframe)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|tr|section|article)>/gi, "\n")
      .replace(/<[^>]+>/g, " "))
      .replace(/[ \t]+/g, " ").replace(/\n\s*\n\s*\n+/g, "\n\n").trim();

    return res.status(200).json({ url: finalUrl.href, title, text: [title, ...meta, text].filter(Boolean).join("\n").slice(0, 14000), links });
  } catch (e) {
    return res.status(200).json({ error: e && e.name === "AbortError" ? "timeout" : "fetch_failed" });
  }
}
