/**
 * Platform model configuration helper.
 *
 * Returns the platform's fixed model string so that generation-preview
 * and other client-side callers that build request headers can reference
 * a consistent model string without needing user-configurable settings.
 *
 * Note: the server always resolves the actual model + API key from
 * environment variables (lib/server/platform-config.ts), so the values
 * returned here are informational / for header forwarding only.
 */

export function getCurrentModelConfig() {
  return {
    providerId: 'anthropic',
    modelId: 'claude-sonnet-4-6',
    modelString: 'anthropic:claude-sonnet-4-6',
    apiKey: '',
    baseUrl: '',
    providerType: undefined as string | undefined,
    requiresApiKey: false,
    isServerConfigured: true,
  };
}
