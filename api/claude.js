import { authorised, needsPassword } from "./_auth.js";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
const MEDIA = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ ready: !!process.env.ANTHROPIC_API_KEY, auth: needsPassword(), authorised: authorised(req) });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  if (!authorised(req)) return res.status(401).json({ error: "unauthorised" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: "missing_api_key" });

  const { prompt, images } = req.body || {};
  if (typeof prompt !== "string" || !prompt.trim()) return res.status(400).json({ error: "missing_prompt" });
  if (prompt.length > 200000) return res.status(413).json({ error: "prompt_too_large" });

  const content = [];
  (Array.isArray(images) ? images : []).slice(0, 6).forEach((img) => {
    if (img && MEDIA.has(img.media_type) && typeof img.data === "string") {
      content.push({ type: "image", source: { type: "base64", media_type: img.media_type, data: img.data } });
    }
  });
  content.push({ type: "text", text: prompt });

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 8000, messages: [{ role: "user", content }] }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const code = r.status === 429 ? "rate_limited" : r.status === 413 ? "prompt_too_large" : "upstream_error";
      return res.status(r.status === 429 ? 429 : 502).json({ error: code, detail: data?.error?.message || "" });
    }
    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
    return res.status(200).json({ text, stop_reason: data.stop_reason });
  } catch (e) {
    return res.status(502).json({ error: "upstream_error" });
  }
}
