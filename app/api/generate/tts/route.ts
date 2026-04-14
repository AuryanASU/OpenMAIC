/**
 * Single TTS Generation API
 *
 * Generates TTS audio for a single text string and returns base64-encoded audio.
 * Called by the client in parallel for each speech action after a scene is generated.
 *
 * POST /api/generate/tts
 */

import { NextRequest } from 'next/server';
import { generateTTS } from '@/lib/audio/tts-providers';
import {
  PLATFORM_TTS_API_KEY,
  PLATFORM_TTS_MODEL,
  PLATFORM_TTS_VOICE,
  PLATFORM_FEATURES,
} from '@/lib/server/platform-config';
import type { TTSProviderId } from '@/lib/audio/types';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';

const log = createLogger('TTS API');

// Platform-managed TTS provider
const PLATFORM_TTS_PROVIDER = 'elevenlabs-tts' as TTSProviderId;

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  let ttsProviderId: string | undefined;
  let ttsVoice: string | undefined;
  let audioId: string | undefined;
  try {
    const body = await req.json();
    const { text, ttsModelId, ttsSpeed } = body as {
      text: string;
      audioId: string;
      ttsModelId?: string;
      ttsVoice: string;
      ttsSpeed?: number;
    };
    ttsProviderId = PLATFORM_TTS_PROVIDER;
    // Respect the requested voice if provided, otherwise use platform default
    ttsVoice = (body.ttsVoice as string | undefined) || PLATFORM_TTS_VOICE;
    audioId = body.audioId;

    // Validate required fields
    if (!text || !audioId) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'Missing required fields: text, audioId');
    }

    if (!PLATFORM_FEATURES.ttsEnabled) {
      return apiError('MISSING_API_KEY', 503, 'TTS is not available on this platform');
    }

    const apiKey = PLATFORM_TTS_API_KEY;
    if (!apiKey) {
      return apiError('MISSING_API_KEY', 401, 'TTS API key is not configured');
    }

    // Build TTS config
    const config = {
      providerId: PLATFORM_TTS_PROVIDER,
      modelId: ttsModelId || PLATFORM_TTS_MODEL,
      voice: ttsVoice,
      speed: ttsSpeed ?? 1.0,
      apiKey,
      baseUrl: undefined,
    };

    log.info(
      `Generating TTS: provider=${ttsProviderId}, model=${ttsModelId || 'default'}, voice=${ttsVoice}, audioId=${audioId}, textLen=${text.length}`,
    );

    // Generate audio
    const { audio, format } = await generateTTS(config, text);

    // Convert to base64
    const base64 = Buffer.from(audio).toString('base64');

    return apiSuccess({ audioId, base64, format });
  } catch (error) {
    log.error(
      `TTS generation failed [provider=${ttsProviderId ?? 'unknown'}, voice=${ttsVoice ?? 'unknown'}, audioId=${audioId ?? 'unknown'}]:`,
      error,
    );
    return apiError(
      'GENERATION_FAILED',
      500,
      error instanceof Error ? error.message : String(error),
    );
  }
}
