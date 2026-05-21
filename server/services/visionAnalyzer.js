import { GoogleGenAI, Type } from "@google/genai";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    brandModel: { type: Type.STRING },
    year: { type: Type.STRING },
    confidence: { type: Type.NUMBER },
    category: { type: Type.STRING },
    materials: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          estimate: { type: Type.STRING },
          risk: { type: Type.STRING },
        },
        required: ["name", "estimate", "risk"],
      },
    },
    howItWorked: { type: Type.STRING },
    recyclingPath: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          component: { type: Type.STRING },
          destination: { type: Type.STRING },
        },
        required: ["component", "destination"],
      },
    },
    environmentalImpact: { type: Type.STRING },
    curiosity: { type: Type.STRING },
    heroStat: { type: Type.STRING },
    tips: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: [
    "title",
    "brandModel",
    "year",
    "confidence",
    "category",
    "materials",
    "howItWorked",
    "recyclingPath",
    "environmentalImpact",
    "curiosity",
    "heroStat",
    "tips",
  ],
};

export async function analyzeRaee({ file, description, apiKey: requestApiKey }) {
  const apiKey = requestApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const error = new Error("Pegá tu API key de Gemini para analizar el objeto.");
    error.status = 503;
    error.code = "GEMINI_API_KEY_MISSING";
    throw error;
  }

  const ai = new GoogleGenAI({ apiKey });
  const contents = buildGeminiContents({ file, description });

  const response = await generateGeminiContent(ai, contents);

  const analysis = parseGeminiJson(response.text);

  return normalizeAnalysis({
    analysis,
    file,
    description,
    model: MODEL,
  });
}

async function generateGeminiContent(ai, contents) {
  try {
    return await ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.35,
      },
    });
  } catch (error) {
    throw mapGeminiError(error);
  }
}

function mapGeminiError(error) {
  const message = String(error?.message || "");
  const status = Number(error?.status || error?.code || 502);

  if (status === 403 && message.includes("reported as leaked")) {
    const mapped = new Error("Esa API key fue marcada como filtrada por Google. Creá una nueva en Google AI Studio y pegala acá.");
    mapped.status = 403;
    mapped.code = "GEMINI_KEY_LEAKED";
    return mapped;
  }

  if (status === 403) {
    const mapped = new Error("Gemini rechazó la API key. Revisá que sea válida, nueva y que tenga permisos.");
    mapped.status = 403;
    mapped.code = "GEMINI_PERMISSION_DENIED";
    return mapped;
  }

  const mapped = new Error("Gemini no pudo procesar la solicitud en este momento.");
  mapped.status = status >= 400 && status < 600 ? status : 502;
  mapped.code = "GEMINI_REQUEST_FAILED";
  return mapped;
}

function buildGeminiContents({ file, description }) {
  const prompt = [
    "Sos RAEEBot, asistente de IA del Gobierno de la Ciudad de Buenos Aires para el Punto Verde de Parque Saavedra.",
    "Analizá la imagen y/o descripción de un residuo electrónico u obra de arte hecha con RAEE.",
    "Devolvé SOLO JSON válido en español rioplatense, sin markdown.",
    "Si no podés inferir marca o modelo, respondé 'No identificable con certeza'.",
    "Usá estimaciones prudentes para porcentajes o cantidades, indicando que son aproximadas.",
    "Explicá el reciclaje con destinos realistas: recuperación de cobre, aluminio, acero, plásticos, vidrio técnico, tratamiento de metales pesados o disposición segura.",
    "La respuesta debe ser clara para ciudadanos, no excesivamente técnica.",
    description ? `Descripción escrita por el usuario: ${description}` : "No hay descripción escrita; inferí desde la imagen.",
  ].join("\n");

  const parts = [];

  if (file?.buffer) {
    parts.push({
      inlineData: {
        mimeType: file.mimetype,
        data: file.buffer.toString("base64"),
      },
    });
  }

  parts.push({ text: prompt });
  return parts;
}

function parseGeminiJson(text) {
  try {
    return JSON.parse(text);
  } catch (_error) {
    const error = new Error("Gemini respondió un formato inesperado.");
    error.status = 502;
    error.code = "GEMINI_BAD_JSON";
    throw error;
  }
}

function normalizeAnalysis({ analysis, file, description, model }) {
  const confidence = Number.isFinite(Number(analysis.confidence))
    ? Math.max(0, Math.min(1, Number(analysis.confidence)))
    : 0.75;

  return {
    title: analysis.title,
    brandModel: analysis.brandModel,
    year: analysis.year,
    confidence,
    category: analysis.category,
    materials: analysis.materials,
    heroStat: analysis.heroStat,
    tabs: {
      history: analysis.howItWorked,
      hazards: analysis.environmentalImpact,
      recycling: analysis.recyclingPath
        .map((item) => `${item.component}: ${item.destination}`)
        .join("\n"),
    },
    howItWorked: analysis.howItWorked,
    recyclingPath: analysis.recyclingPath,
    environmentalImpact: analysis.environmentalImpact,
    curiosity: analysis.curiosity,
    tips: analysis.tips,
    input: {
      hasImage: Boolean(file?.buffer),
      description: description || "",
      file: file
        ? {
            name: file.originalName,
            mimetype: file.mimetype,
            size: file.size,
          }
        : null,
    },
    analyzedAt: new Date().toISOString(),
    model,
  };
}
