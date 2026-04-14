import {
  getServerProviders,
  getServerTTSProviders,
  getServerASRProviders,
  getServerPDFProviders,
  getServerImageProviders,
  getServerVideoProviders,
  getServerWebSearchProviders,
} from '@/lib/server/provider-config';
import { PLATFORM_FEATURES } from '@/lib/server/platform-config';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createLogger } from '@/lib/logger';

const log = createLogger('ServerProviders');

export async function GET() {
  try {
    // Start with whatever is configured via YAML / env vars
    const image = getServerImageProviders();
    const video = getServerVideoProviders();
    const tts = getServerTTSProviders();

    // Merge platform-managed providers so the client store marks them as
    // server-configured (enabling the relevant UI toggles).
    if (PLATFORM_FEATURES.imageGenEnabled && !image['nano-banana']) {
      image['nano-banana'] = {};
    }
    if (PLATFORM_FEATURES.videoGenEnabled && !video['veo']) {
      video['veo'] = {};
    }
    if (PLATFORM_FEATURES.ttsEnabled && !tts['elevenlabs-tts']) {
      tts['elevenlabs-tts'] = {};
    }

    return apiSuccess({
      providers: getServerProviders(),
      tts,
      asr: getServerASRProviders(),
      pdf: getServerPDFProviders(),
      image,
      video,
      webSearch: getServerWebSearchProviders(),
    });
  } catch (error) {
    log.error('Error fetching server providers:', error);
    return apiError(
      'INTERNAL_ERROR',
      500,
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}
