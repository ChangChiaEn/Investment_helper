// Models ordered from best to most reliable (AI Studio supported modern models)
export const AVAILABLE_MODELS = [
  {
    id: "gemini-3.8-flash",
    name: "Gemini 3.8 Flash (AI Studio 推薦首選)",
    desc: "AI Studio 最新旗艦模型，具備深度思考與全面分析能力",
  },
  {
    id: "gemini-flash-latest",
    name: "Gemini Flash (Latest)",
    desc: "最新穩定版 Flash，回應迅速且精確",
  },
  {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash Lite",
    desc: "極速輕量，高配額響應",
  },
];

export const DEFAULT_MODEL = "gemini-3.8-flash";
const MODEL_IDS = AVAILABLE_MODELS.map((m) => m.id);

export enum Type {
  TYPE_UNSPECIFIED = "TYPE_UNSPECIFIED",
  STRING = "STRING",
  NUMBER = "NUMBER",
  INTEGER = "INTEGER",
  BOOLEAN = "BOOLEAN",
  ARRAY = "ARRAY",
  OBJECT = "OBJECT",
  NULL = "NULL",
}

export type Schema = any;

export function getApiKey(): string {
  if (typeof window !== "undefined") {
    const userKey = localStorage.getItem("gemini_api_key");
    if (userKey) return userKey;
  }
  return "";
}

/** Get the user-selected model, defaulting to gemini-3.8-flash */
export function getSelectedModel(): string {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("gemini_model");
    if (saved && MODEL_IDS.includes(saved)) {
      return saved;
    }
    localStorage.setItem("gemini_model", DEFAULT_MODEL);
    return DEFAULT_MODEL;
  }
  return DEFAULT_MODEL;
}

/** Client stub for backward compatibility */
export function createClient(_apiKey?: string): any {
  return null;
}

/**
 * Test available models (returns modern AI Studio supported models).
 */
export async function testAvailableModels(_apiKey?: string): Promise<string[]> {
  return AVAILABLE_MODELS.map((m) => m.id);
}

/**
 * Call Gemini through server-side proxy using Gemini 3.8 Flash.
 */
export async function generateWithFallback(
  _ai: any,
  config: {
    contents: string | any;
    config?: any;
  }
): Promise<any> {
  const selectedModel = getSelectedModel();

  const res = await fetch("/api/gemini/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: selectedModel,
      contents: config.contents,
      config: config.config,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Gemini 分析服務呼叫失敗，請稍後再試。");
  }
  return data;
}
