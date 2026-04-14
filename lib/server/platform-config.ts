/**
 * Platform-level service configuration.
 *
 * All provider credentials come from server-side environment variables.
 * No client-supplied API keys are accepted on this platform.
 * This is a server-only module — never import it in client-side code.
 */

import { resolveModel, type ResolvedModel } from '@/lib/server/resolve-model';

// ── AI / LLM ──────────────────────────────────────────────────────────────────
export const PLATFORM_AI_PROVIDER = 'anthropic' as const;
export const PLATFORM_AI_MODEL = 'claude-sonnet-4-6';
export const PLATFORM_AI_API_KEY = process.env.ANTHROPIC_API_KEY || '';
export const PLATFORM_AI_MODEL_ADVANCED = 'claude-opus-4-6';

const PLATFORM_MODEL_STRING =
  process.env.DEFAULT_MODEL || `${PLATFORM_AI_PROVIDER}:${PLATFORM_AI_MODEL}`;

/** Resolve the platform LLM — always uses server-side credentials. */
export async function getPlatformModel(): Promise<ResolvedModel> {
  return resolveModel({ modelString: PLATFORM_MODEL_STRING });
}

// ── Text-to-Speech (ElevenLabs) ───────────────────────────────────────────────
export const PLATFORM_TTS_API_KEY =
  process.env.ELEVENLABS_API_KEY || process.env.TTS_ELEVENLABS_API_KEY || '';
export const PLATFORM_TTS_VOICE = 'Sarah';
export const PLATFORM_TTS_MODEL = 'eleven_flash_v2_5';

// ── Image / Video (Google AI) ─────────────────────────────────────────────────
export const PLATFORM_IMAGE_API_KEY = process.env.GOOGLE_AI_API_KEY || '';
export const PLATFORM_VIDEO_API_KEY = process.env.GOOGLE_AI_API_KEY || '';

// ── Feature flags ─────────────────────────────────────────────────────────────
// A feature is enabled only when the corresponding env var is present.
export const PLATFORM_FEATURES = {
  ttsEnabled: !!(process.env.ELEVENLABS_API_KEY || process.env.TTS_ELEVENLABS_API_KEY),
  imageGenEnabled: !!process.env.GOOGLE_AI_API_KEY,
  videoGenEnabled: !!process.env.GOOGLE_AI_API_KEY,
  webSearchEnabled: !!process.env.TAVILY_API_KEY,
} as const;
