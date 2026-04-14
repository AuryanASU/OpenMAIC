/**
 * Platform-level service configuration.
 *
 * All provider credentials come from server-side environment variables.
 * No client-supplied API keys are accepted on this platform.
 */

// ── AI / LLM ──────────────────────────────────────────────────────────────────
export const PLATFORM_AI_PROVIDER = 'anthropic';
export const PLATFORM_AI_MODEL = 'claude-sonnet-4-6';
export const PLATFORM_AI_API_KEY = process.env.ANTHROPIC_API_KEY!;
export const PLATFORM_AI_MODEL_ADVANCED = 'claude-opus-4-6';

// ── Text-to-Speech ────────────────────────────────────────────────────────────
export const PLATFORM_TTS_PROVIDER = 'elevenlabs';
export const PLATFORM_TTS_API_KEY = process.env.TTS_ELEVENLABS_API_KEY!;
export const PLATFORM_TTS_DEFAULT_VOICE = 'Sarah';
export const PLATFORM_TTS_MODEL = 'eleven_flash_v2_5';

// ── Image / Video ─────────────────────────────────────────────────────────────
export const PLATFORM_IMAGE_API_KEY = process.env.GOOGLE_AI_API_KEY!;
export const PLATFORM_VIDEO_API_KEY = process.env.GOOGLE_AI_API_KEY!;

// ── Feature flags ─────────────────────────────────────────────────────────────
// Feature is enabled only when the corresponding env var is present.
export const PLATFORM_FEATURES = {
  ttsEnabled: !!process.env.TTS_ELEVENLABS_API_KEY,
  imageGenEnabled: !!process.env.GOOGLE_AI_API_KEY,
  videoGenEnabled: !!process.env.GOOGLE_AI_API_KEY,
  webSearchEnabled: !!process.env.TAVILY_API_KEY,
};
