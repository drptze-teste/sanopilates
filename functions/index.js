const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Chave armazenada de forma segura no Secret Manager do Google Cloud
const geminiKey = defineSecret("GEMINI_API_KEY");

// Rate limiting simples em memória (10 chamadas / IP / hora)
const rateLimitMap = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hora
  const maxRequests = 10;

  const entry = rateLimitMap.get(ip) || { count: 0, resetAt: now + windowMs };

  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + windowMs;
  }

  entry.count++;
  rateLimitMap.set(ip, entry);

  return entry.count <= maxRequests;
}

const ALLOWED_ORIGINS = [
  "https://sanopilates.com.br",
  "https://www.sanopilates.com.br",
  "http://localhost:4000",
  "http://127.0.0.1:4000",
];

const LANG_NAMES = {
  en: "inglês",
  zh: "chinês mandarim simplificado",
};

exports.translatePost = onRequest(
  {
    secrets: [geminiKey],
    region: "us-central1",
    cors: ALLOWED_ORIGINS,
    timeoutSeconds: 60,
    memory: "256MiB",
  },
  async (req, res) => {
    // CORS headers
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.includes(origin)) {
      res.set("Access-Control-Allow-Origin", origin);
    }
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(204).send("");
    if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

    // Rate limiting
    const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.ip || "unknown";
    if (!checkRateLimit(ip)) {
      return res.status(429).json({ error: "Limite de requisições atingido. Tente novamente em 1 hora." });
    }

    // Validação
    const { content, targetLang } = req.body;
    if (!content || typeof content !== "string") {
      return res.status(400).json({ error: "Campo 'content' obrigatório" });
    }
    if (!["en", "zh"].includes(targetLang)) {
      return res.status(400).json({ error: "targetLang deve ser 'en' ou 'zh'" });
    }
    if (content.length > 20000) {
      return res.status(400).json({ error: "Conteúdo muito longo (máximo 20.000 caracteres)" });
    }

    const langName = LANG_NAMES[targetLang];

    try {
      const genAI = new GoogleGenerativeAI(geminiKey.value());
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `Você é um tradutor preciso e natural. Traduza o seguinte post de blog do português para ${langName}. Mantenha o tom leve e acessível, adequado para leitores interessados em saúde e bem-estar. Retorne apenas o texto traduzido em Markdown, sem explicações adicionais.\n\n${content}`;

      const result = await model.generateContent(prompt);
      const translated = result.response.text();

      return res.status(200).json({ translated });

    } catch (err) {
      console.error("Erro na tradução:", err);
      return res.status(500).json({ error: "Erro ao traduzir. Tente novamente." });
    }
  }
);
