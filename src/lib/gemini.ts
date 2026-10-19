import { GoogleGenAI } from "@google/genai";

// Models ordered from best to most reliable
export const AVAILABLE_MODELS = [
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", desc: "最強推理能力，配額較少" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", desc: "速度與品質平衡" },
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", desc: "最穩定，免費配額最多" },
];

const MODEL_IDS = AVAILABLE_MODELS.map((m) => m.id);

export function getApiKey(): string {
  if (typeof window !== "undefined") {
    const userKey = localStorage.getItem("gemini_api_key");
    if (userKey) return userKey;
  }
  return process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.API_KEY || "";
}

/** Get the user-selected model, or fallback to gemini-2.0-flash */
export function getSelectedModel(): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem("gemini_model") || "gemini-2.0-flash";
  }
  return "gemini-2.0-flash";
}

export function createClient(apiKey?: string): GoogleGenAI {
  const key = apiKey || getApiKey();
  if (!key) {
    throw new Error("請先至設定頁面輸入 Gemini API Key");
  }
  return new GoogleGenAI({ apiKey: key });
}

/**
 * Test which models are available for the given API key.
 * Returns an array of model IDs that work.
 */
export async function testAvailableModels(apiKey: string): Promise<string[]> {
  const ai = new GoogleGenAI({ apiKey });
  const available: string[] = [];

  for (const modelId of MODEL_IDS) {
    try {
      const response = await ai.models.generateContent({
        model: modelId,
        contents: "Reply with exactly: OK",
        config: { maxOutputTokens: 10 },
      });
      if (response.text) {
        available.push(modelId);
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      // Quota error means key is valid but model has no free quota
      if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("QUOTA")) {
        // Key works but no quota — don't add to available
        continue;
      }
      // Permission denied or invalid model — skip
      continue;
    }
  }

  return available;
}

/**
 * Call Gemini using the user's selected model.
 * Falls back through the model chain if quota is exceeded.
 */
export async function generateWithFallback(
  ai: GoogleGenAI,
  config: {
    contents: string | any;
    config?: any;
  }
): Promise<any> {
  const selectedModel = getSelectedModel();

  // Build fallback chain: selected model first, then remaining models in order
  const chain = [selectedModel, ...MODEL_IDS.filter((m) => m !== selectedModel)];

  let lastError: any = null;

  for (const model of chain) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: config.contents,
        config: config.config,
      });
      return response;
    } catch (err: any) {
      lastError = err;
      const msg = err?.message || String(err);
      if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota") || msg.includes("QUOTA")) {
        console.warn(`[Sagafisc] ${model} quota exceeded, trying next model...`);
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error("所有模型皆已達配額上限，請稍後再試。");
}
