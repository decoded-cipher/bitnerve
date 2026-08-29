import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { LanguageModelV2 } from '@ai-sdk/provider';
import { createGeminiLanguageModel } from './gemini';

type ProviderName = 'openrouter' | 'gemini';

function ensureEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `[llm] Missing required environment variable "${name}" for provider configuration.`,
    );
  }
  return value;
}

export function getLanguageModel(modelOverride?: string): LanguageModelV2 {
  const provider: ProviderName = (process.env.LLM_PROVIDER ?? 'openrouter').toLowerCase() ===
    'gemini'
    ? 'gemini'
    : 'openrouter';

  if (provider === 'openrouter') {
    const apiKey = ensureEnv(process.env.OPENROUTER_API_KEY, 'OPENROUTER_API_KEY');
    const modelId =
      modelOverride ??
      process.env.LLM_MODEL ??
      ensureEnv(process.env.OPENROUTER_MODEL, 'OPENROUTER_MODEL');

    const openrouter = createOpenRouter({
      apiKey,
    });
    return openrouter(modelId);
  }

  const apiKey = ensureEnv(process.env.GEMINI_API_KEY, 'GEMINI_API_KEY');
  const modelId =
    modelOverride ??
    process.env.LLM_MODEL ??
    process.env.GEMINI_MODEL ??
    'gemini-2.0-flash';

  return createGeminiLanguageModel({
    apiKey,
    apiVersion: process.env.GEMINI_API_VERSION,
    model: modelId,
  });
}

