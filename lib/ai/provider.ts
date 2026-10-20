import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogle } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import type { AiProvider } from '@/lib/db/types';

export interface AiConfig {
  provider: AiProvider;
  model: string;
  apiKey: string;
  baseURL?: string;
}

export const DEFAULT_MODELS: Record<AiProvider, string> = {
  gemini: 'gemini-2.5-flash',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-sonnet-4-5',
};

const ENV_KEYS: Record<AiProvider, string[]> = {
  gemini: ['AI_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY'],
  openai: ['AI_API_KEY', 'OPENAI_API_KEY', 'DASHSCOPE_API_KEY'],
  anthropic: ['AI_API_KEY', 'ANTHROPIC_API_KEY'],
};

/**
 * Provider AI belum ditentukan user, jadi konfigurasi dibaca dari env:
 * AI_PROVIDER (gemini | openai | anthropic), AI_MODEL, AI_API_KEY, AI_BASE_URL.
 * `openai` juga dipakai untuk endpoint OpenAI-compatible (mis. DashScope/Qwen).
 */
export function resolveAiConfig(overrides: Partial<AiConfig> = {}): AiConfig | null {
  const provider = (overrides.provider ?? (process.env.AI_PROVIDER as AiProvider) ?? 'gemini') as AiProvider;
  const keyEnv = ENV_KEYS[provider] ?? ENV_KEYS.gemini;
  const apiKey =
    overrides.apiKey ?? keyEnv.map((key) => process.env[key]).find((value) => Boolean(value)) ?? '';
  if (!apiKey) return null;

  return {
    provider,
    apiKey,
    model: overrides.model ?? process.env.AI_MODEL ?? DEFAULT_MODELS[provider],
    baseURL: overrides.baseURL ?? process.env.AI_BASE_URL,
  };
}

export function isAiConfigured(): boolean {
  return resolveAiConfig() !== null;
}

type LanguageModel = Parameters<typeof generateText>[0]['model'];

export function buildModel(config: AiConfig): LanguageModel {
  switch (config.provider) {
    case 'gemini': {
      const google = createGoogle({ apiKey: config.apiKey });
      return google(config.model);
    }
    case 'anthropic': {
      const anthropic = createAnthropic({ apiKey: config.apiKey });
      return anthropic(config.model);
    }
    case 'openai':
    default: {
      const openai = createOpenAI({
        apiKey: config.apiKey,
        ...(config.baseURL ? { baseURL: config.baseURL } : {}),
      });
      return openai(config.model);
    }
  }
}

export interface CompletionOptions {
  system?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export async function complete(prompt: string, options: CompletionOptions = {}): Promise<string> {
  const config = resolveAiConfig();
  if (!config) {
    throw new Error(
      'AI belum dikonfigurasi. Isi AI_PROVIDER dan AI_API_KEY di .env.local (lihat .env.example).',
    );
  }

  const result = await generateText({
    model: buildModel(config),
    system: options.system,
    prompt,
    temperature: options.temperature ?? 0.4,
    maxOutputTokens: options.maxOutputTokens ?? 2000,
  });

  return result.text;
}
