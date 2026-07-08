// Vercel serverless: страна из edge-заголовка для выбора типа cookie-баннера (см. PLAN.md).
// Локально (python-превью) функции нет — клиент уходит по фолбэк-цепочке (таймзона → строгий дефолт).
export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ country: req.headers["x-vercel-ip-country"] || null });
}
