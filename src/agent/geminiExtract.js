/**
 * Optional Gemini vision / text assist.
 * Money answers still come only from SQL tools.
 */

async function extractFromScreenshot(buffer, mimeType = "image/jpeg") {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return { ok: false, reason: "GEMINI_API_KEY not set", fields: {} };
  }

  const model = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  const prompt = `Extract payment / FASTag ids from this screenshot.
Return ONLY JSON:
{
  "message": "10-digit PhonePe Message / Cashfree id or null",
  "utr": "12-digit UTR / bank reference or null",
  "serial": "tag serial or null",
  "vrn": "vehicle number or null",
  "amount": number or null
}`;

  const body = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: buffer.toString("base64"),
            },
          },
        ],
      },
    ],
    generationConfig: { temperature: 0, responseMimeType: "application/json" },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    return { ok: false, reason: `Gemini ${res.status}: ${errText.slice(0, 200)}`, fields: {} };
  }

  const data = await res.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "{}";

  let fields = {};
  try {
    fields = JSON.parse(text);
  } catch {
    fields = {};
  }

  return { ok: true, fields };
}

module.exports = { extractFromScreenshot };
