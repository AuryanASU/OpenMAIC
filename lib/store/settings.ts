/**
 * Settings Store
 * Global settings state synchronized with localStorage
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TTSProviderId, ASRProviderId, BuiltInTTSProviderId } from '@/lib/audio/types';
import { isCustomTTSProvider, isCustomASRProvider } from '@/lib/audio/types';
import { ASR_PROVIDERS, DEFAULT_TTS_VOICES, TTS_PROVIDERS } from '@/lib/audio/constants';
import { PDF_PROVIDERS } from '@/lib/pdf/constants';
import type { PDFProviderId } from '@/lib/pdf/types';
import { WEB_SEARCH_PROVIDERS } from '@/lib/web-search/constants';
import type { WebSearchProviderId } from '@/lib/web-search/types';
import { createLogger } from '@/lib/logger';
import { validateProvider } from '@/lib/store/settings-validation';

const log = createLogger('Settings');

/** Available playback speed tiers */
export const PLAYBACK_SPEEDS = [1, 1.25, 1.5, 2] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

export interface SettingsState {
  // TTS settings (legacy, kept for backward compatibility)
  ttsModel: string;

  // Audio settings (new unified audio configuration)
  ttsProviderId: TTSProviderId;
  ttsVoice: string;
  ttsSpeed: number;
  asrProviderId: ASRProviderId;
  asrLanguage: string;

  // Audio provider configurations
  ttsProvidersConfig: Record<
    TTSProviderId,
    {
      apiKey: string;
      baseUrl: string;
      enabled: boolean;
      modelId?: string;
      customModels?: Array<{ id: string; name: string }>;
      providerOptions?: Record<string, unknown>;
      isServerConfigured?: boolean;
      serverBaseUrl?: string;
      // Custom provider fields
      customName?: string;
      customDefaultBaseUrl?: string;
      customVoices?: Array<{ id: string; name: string }>;
      isBuiltIn?: boolean;
      requiresApiKey?: boolean;
    }
  >;

  asrProvidersConfig: Record<
    ASRProviderId,
    {
      apiKey: string;
      baseUrl: string;
      enabled: boolean;
      modelId?: string;
      customModels?: Array<{ id: string; name: string }>;
      providerOptions?: Record<string, unknown>;
      isServerConfigured?: boolean;
      serverBaseUrl?: string;
      // Custom provider fields
      customName?: string;
      customDefaultBaseUrl?: string;
      isBuiltIn?: boolean;
      requiresApiKey?: boolean;
    }
  >;

  // PDF settings
  pdfProviderId: PDFProviderId;
  pdfProvidersConfig: Record<
    PDFProviderId,
    {
      apiKey: string;
      baseUrl: string;
      enabled: boolean;
      isServerConfigured?: boolean;
      serverBaseUrl?: string;
    }
  >;

  // Media generation toggles
  imageGenerationEnabled: boolean;
  videoGenerationEnabled: boolean;

  // Web Search settings
  webSearchProviderId: WebSearchProviderId;
  webSearchProvidersConfig: Record<
    WebSearchProviderId,
    {
      apiKey: string;
      baseUrl: string;
      enabled: boolean;
      isServerConfigured?: boolean;
      serverBaseUrl?: string;
    }
  >;

  // Global TTS/ASR toggles
  ttsEnabled: boolean;
  asrEnabled: boolean;

  // Playback controls
  ttsMuted: boolean;
  ttsVolume: number; // 0-1, actual volume level
  autoPlayLecture: boolean;
  playbackSpeed: PlaybackSpeed;

  // Agent settings
  selectedAgentIds: string[];
  maxTurns: string;
  agentMode: 'preset' | 'auto';
  autoAgentCount: number;

  // Layout preferences (persisted via localStorage)
  sidebarCollapsed: boolean;
  chatAreaCollapsed: boolean;
  chatAreaWidth: number;

  // Actions
  setTtsModel: (model: string) => void;
  setTTSMuted: (muted: boolean) => void;
  setTTSVolume: (volume: number) => void;
  setAutoPlayLecture: (autoPlay: boolean) => void;
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
  setSelectedAgentIds: (ids: string[]) => void;
  setMaxTurns: (turns: string) => void;
  setAgentMode: (mode: 'preset' | 'auto') => void;
  setAutoAgentCount: (count: number) => void;

  // Layout actions
  setSidebarCollapsed: (collapsed: boolean) => void;
  setChatAreaCollapsed: (collapsed: boolean) => void;
  setChatAreaWidth: (width: number) => void;

  // Audio actions
  setTTSProvider: (providerId: TTSProviderId) => void;
  setTTSVoice: (voice: string) => void;
  setTTSSpeed: (speed: number) => void;
  setASRProvider: (providerId: ASRProviderId) => void;
  setASRLanguage: (language: string) => void;
  setTTSProviderConfig: (
    providerId: TTSProviderId,
    config: Partial<{
      apiKey: string;
      baseUrl: string;
      enabled: boolean;
      modelId: string;
      customModels: Array<{ id: string; name: string }>;
      customVoices: Array<{ id: string; name: string }>;
      providerOptions: Record<string, unknown>;
    }>,
  ) => void;
  setASRProviderConfig: (
    providerId: ASRProviderId,
    config: Partial<{
      apiKey: string;
      baseUrl: string;
      enabled: boolean;
      modelId: string;
      customModels: Array<{ id: string; name: string }>;
      providerOptions: Record<string, unknown>;
    }>,
  ) => void;
  setTTSEnabled: (enabled: boolean) => void;
  setASREnabled: (enabled: boolean) => void;

  // Custom audio provider actions
  addCustomTTSProvider: (
    id: TTSProviderId,
    name: string,
    baseUrl: string,
    requiresApiKey: boolean,
    defaultModel?: string,
  ) => void;
  removeCustomTTSProvider: (id: TTSProviderId) => void;
  addCustomASRProvider: (
    id: ASRProviderId,
    name: string,
    baseUrl: string,
    requiresApiKey: boolean,
  ) => void;
  removeCustomASRProvider: (id: ASRProviderId) => void;

  // PDF actions
  setPDFProvider: (providerId: PDFProviderId) => void;
  setPDFProviderConfig: (
    providerId: PDFProviderId,
    config: Partial<{ apiKey: string; baseUrl: string; enabled: boolean }>,
  ) => void;

  // Media generation toggle actions
  setImageGenerationEnabled: (enabled: boolean) => void;
  setVideoGenerationEnabled: (enabled: boolean) => void;

  // Web Search actions
  setWebSearchProvider: (providerId: WebSearchProviderId) => void;
  setWebSearchProviderConfig: (
    providerId: WebSearchProviderId,
    config: Partial<{ apiKey: string; baseUrl: string; enabled: boolean }>,
  ) => void;

  // Server provider actions
  fetchServerProviders: () => Promise<void>;
}

// Initialize default audio config
const getDefaultAudioConfig = () => ({
  ttsProviderId: 'elevenlabs-tts' as TTSProviderId,
  ttsVoice: 'EXAVITQu4vr4xnSDxMaL',
  ttsSpeed: 1.0,
  asrProviderId: 'browser-native' as ASRProviderId,
  asrLanguage: 'zh',
  ttsProvidersConfig: {
    'openai-tts': { apiKey: '', baseUrl: '', enabled: true },
    'azure-tts': { apiKey: '', baseUrl: '', enabled: false },
    'glm-tts': { apiKey: '', baseUrl: '', enabled: false },
    'qwen-tts': { apiKey: '', baseUrl: '', enabled: false },
    'doubao-tts': { apiKey: '', baseUrl: '', enabled: false },
    'elevenlabs-tts': { apiKey: '', baseUrl: '', enabled: true },
    'minimax-tts': { apiKey: '', baseUrl: '', modelId: 'speech-2.8-hd', enabled: false },
    'browser-native-tts': { apiKey: '', baseUrl: '', enabled: true },
  } as Record<
    TTSProviderId,
    { apiKey: string; baseUrl: string; modelId?: string; enabled: boolean }
  >,
  asrProvidersConfig: {
    'openai-whisper': { apiKey: '', baseUrl: '', enabled: true },
    'browser-native': { apiKey: '', baseUrl: '', enabled: true },
    'qwen-asr': { apiKey: '', baseUrl: '', enabled: false },
  } as Record<ASRProviderId, { apiKey: string; baseUrl: string; enabled: boolean }>,
});

// Initialize default PDF config
const getDefaultPDFConfig = () => ({
  pdfProviderId: 'unpdf' as PDFProviderId,
  pdfProvidersConfig: {
    unpdf: { apiKey: '', baseUrl: '', enabled: true },
    mineru: { apiKey: '', baseUrl: '', enabled: false },
  } as Record<PDFProviderId, { apiKey: string; baseUrl: string; enabled: boolean }>,
});

// Initialize default Web Search config
const getDefaultWebSearchConfig = () => ({
  webSearchProviderId: 'tavily' as WebSearchProviderId,
  webSearchProvidersConfig: {
    tavily: { apiKey: '', baseUrl: '', enabled: true },
  } as Record<WebSearchProviderId, { apiKey: string; baseUrl: string; enabled: boolean }>,
});

/**
 * Check whether a provider ID exists in the given provider registry.
 */
function hasProviderId(providerMap: Record<string, unknown>, providerId?: string): boolean {
  return typeof providerId === 'string' && providerId in providerMap;
}

/**
 * Validate all persisted provider IDs against their registries.
 * Reset any stale / removed ID back to its default value.
 * Called during both migrate and merge to cover all rehydration paths.
 */
function ensureValidProviderSelections(state: Partial<SettingsState>): void {
  const defaultAudioConfig = getDefaultAudioConfig();
  const defaultPdfConfig = getDefaultPDFConfig();
  const defaultWebSearchConfig = getDefaultWebSearchConfig();

  if (!hasProviderId(PDF_PROVIDERS, state.pdfProviderId)) {
    state.pdfProviderId = defaultPdfConfig.pdfProviderId;
  }

  if (!hasProviderId(WEB_SEARCH_PROVIDERS, state.webSearchProviderId)) {
    state.webSearchProviderId = defaultWebSearchConfig.webSearchProviderId;
  }

  if (
    !hasProviderId(TTS_PROVIDERS, state.ttsProviderId) &&
    !(
      state.ttsProviderId &&
      isCustomTTSProvider(state.ttsProviderId) &&
      state.ttsProvidersConfig &&
      state.ttsProviderId in state.ttsProvidersConfig
    )
  ) {
    state.ttsProviderId = defaultAudioConfig.ttsProviderId;
  }

  if (
    !hasProviderId(ASR_PROVIDERS, state.asrProviderId) &&
    !(
      state.asrProviderId &&
      isCustomASRProvider(state.asrProviderId) &&
      state.asrProvidersConfig &&
      state.asrProviderId in state.asrProvidersConfig
    )
  ) {
    state.asrProviderId = defaultAudioConfig.asrProviderId;
  }
}

// Migrate from old localStorage format
const migrateFromOldStorage = () => {
  if (typeof window === 'undefined') return null;

  // Check if new storage already exists
  const newStorage = localStorage.getItem('settings-storage');
  if (newStorage) return null; // Already migrated or new install

  // Read old localStorage keys
  const oldTtsModel = localStorage.getItem('ttsModel');
  const oldSelectedAgents = localStorage.getItem('selectedAgentIds');
  const oldMaxTurns = localStorage.getItem('maxTurns');

  if (!oldTtsModel && !oldSelectedAgents && !oldMaxTurns) return null; // No old data

  // Parse other settings
  let ttsModel = 'openai-tts';
  if (oldTtsModel) ttsModel = oldTtsModel;

  let selectedAgentIds = ['default-1', 'default-2', 'default-3'];
  if (oldSelectedAgents) {
    try {
      const parsed = JSON.parse(oldSelectedAgents);
      if (Array.isArray(parsed) && parsed.length > 0) {
        selectedAgentIds = parsed;
      }
    } catch (e) {
      log.error('Failed to parse old selectedAgentIds:', e);
    }
  }

  let maxTurns = '10';
  if (oldMaxTurns) maxTurns = oldMaxTurns;

  return {
    ttsModel,
    selectedAgentIds,
    maxTurns,
  };
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => {
      // Try to migrate from old storage
      const migratedData = migrateFromOldStorage();
      const defaultAudioConfig = getDefaultAudioConfig();
      const defaultPDFConfig = getDefaultPDFConfig();
      const defaultWebSearchConfig = getDefaultWebSearchConfig();

      return {
        // Initial state (use migrated data if available)
        ttsModel: migratedData?.ttsModel || 'openai-tts',
        selectedAgentIds: migratedData?.selectedAgentIds || ['default-1', 'default-2', 'default-3'],
        maxTurns: migratedData?.maxTurns?.toString() || '10',
        agentMode: 'auto' as const,
        autoAgentCount: 3,

        // Playback controls
        ttsMuted: false,
        ttsVolume: 1,
        autoPlayLecture: false,
        playbackSpeed: 1,

        // Layout preferences
        sidebarCollapsed: true,
        chatAreaCollapsed: true,
        chatAreaWidth: 320,

        // Audio settings (use defaults)
        ...defaultAudioConfig,

        // PDF settings (use defaults)
        ...defaultPDFConfig,

        // Media generation toggles (off by default)
        imageGenerationEnabled: false,
        videoGenerationEnabled: false,

        // Audio feature toggles (on by default)
        ttsEnabled: true,
        asrEnabled: true,

        // Web Search settings (use defaults)
        ...defaultWebSearchConfig,

        // Actions
        setTtsModel: (model) => set({ ttsModel: model }),

        setTTSMuted: (muted) => set({ ttsMuted: muted }),

        setTTSVolume: (volume) => set({ ttsVolume: Math.max(0, Math.min(1, volume)) }),

        setAutoPlayLecture: (autoPlay) => set({ autoPlayLecture: autoPlay }),

        setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

        setSelectedAgentIds: (ids) => set({ selectedAgentIds: ids }),

        setMaxTurns: (turns) => set({ maxTurns: turns }),
        setAgentMode: (mode) => set({ agentMode: mode }),
        setAutoAgentCount: (count) => set({ autoAgentCount: count }),

        // Layout actions
        setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
        setChatAreaCollapsed: (collapsed) => set({ chatAreaCollapsed: collapsed }),
        setChatAreaWidth: (width) => set({ chatAreaWidth: width }),

        // Audio actions
        setTTSProvider: (providerId) =>
          set((state) => {
            // If switching provider, set default voice for that provider
            const shouldUpdateVoice = state.ttsProviderId !== providerId;
            const defaultVoice = isCustomTTSProvider(providerId)
              ? state.ttsProvidersConfig[providerId]?.customVoices?.[0]?.id || 'default'
              : DEFAULT_TTS_VOICES[providerId as BuiltInTTSProviderId] || 'default';
            return {
              ttsProviderId: providerId,
              ...(shouldUpdateVoice && { ttsVoice: defaultVoice }),
            };
          }),

        setTTSVoice: (voice) => set({ ttsVoice: voice }),

        setTTSSpeed: (speed) => set({ ttsSpeed: speed }),

        // Reset language when switching providers, since language code formats differ
        // (e.g. browser-native uses BCP-47 "en-US", OpenAI Whisper uses ISO 639-1 "en")
        setASRProvider: (providerId) =>
          set((state) => {
            let supportedLanguages: string[];
            if (isCustomASRProvider(providerId)) {
              supportedLanguages = ['auto'];
            } else {
              supportedLanguages =
                ASR_PROVIDERS[providerId as keyof typeof ASR_PROVIDERS]?.supportedLanguages || [];
            }
            const isLanguageValid = supportedLanguages.includes(state.asrLanguage);
            return {
              asrProviderId: providerId,
              ...(isLanguageValid ? {} : { asrLanguage: supportedLanguages[0] || 'auto' }),
            };
          }),

        setASRLanguage: (language) => set({ asrLanguage: language }),

        setTTSProviderConfig: (providerId, config) =>
          set((state) => ({
            ttsProvidersConfig: {
              ...state.ttsProvidersConfig,
              [providerId]: {
                ...state.ttsProvidersConfig[providerId],
                ...config,
              },
            },
          })),

        setASRProviderConfig: (providerId, config) =>
          set((state) => ({
            asrProvidersConfig: {
              ...state.asrProvidersConfig,
              [providerId]: {
                ...state.asrProvidersConfig[providerId],
                ...config,
              },
            },
          })),

        // PDF actions
        setPDFProvider: (providerId) => set({ pdfProviderId: providerId }),

        setPDFProviderConfig: (providerId, config) =>
          set((state) => ({
            pdfProvidersConfig: {
              ...state.pdfProvidersConfig,
              [providerId]: {
                ...state.pdfProvidersConfig[providerId],
                ...config,
              },
            },
          })),

        // Media generation toggle actions
        setImageGenerationEnabled: (enabled) => set({ imageGenerationEnabled: enabled }),
        setVideoGenerationEnabled: (enabled) => set({ videoGenerationEnabled: enabled }),
        setTTSEnabled: (enabled) => set({ ttsEnabled: enabled }),
        setASREnabled: (enabled) => set({ asrEnabled: enabled }),

        // Custom audio provider actions
        addCustomTTSProvider: (id, name, baseUrl, requiresApiKey, defaultModel) =>
          set((state) => ({
            ttsProvidersConfig: {
              ...state.ttsProvidersConfig,
              [id]: {
                apiKey: '',
                baseUrl: '',
                enabled: true,
                modelId: defaultModel || '',
                customName: name,
                customDefaultBaseUrl: baseUrl,
                customVoices: [],
                isBuiltIn: false,
                requiresApiKey,
              },
            },
            ttsProviderId: id,
          })),

        removeCustomTTSProvider: (id) =>
          set((state) => {
            if (!isCustomTTSProvider(id)) return state;
            const { [id]: _, ...rest } = state.ttsProvidersConfig;
            return {
              ttsProvidersConfig: rest as typeof state.ttsProvidersConfig,
              ...(state.ttsProviderId === id && {
                ttsProviderId: 'browser-native-tts' as TTSProviderId,
                ttsVoice: 'default',
              }),
            };
          }),

        addCustomASRProvider: (id, name, baseUrl, requiresApiKey) =>
          set((state) => ({
            asrProvidersConfig: {
              ...state.asrProvidersConfig,
              [id]: {
                apiKey: '',
                baseUrl: '',
                enabled: true,
                modelId: '',
                customModels: [],
                customName: name,
                customDefaultBaseUrl: baseUrl,
                isBuiltIn: false,
                requiresApiKey,
              },
            },
            asrProviderId: id,
          })),

        removeCustomASRProvider: (id) =>
          set((state) => {
            if (!isCustomASRProvider(id)) return state;
            const { [id]: _, ...rest } = state.asrProvidersConfig;
            return {
              asrProvidersConfig: rest as typeof state.asrProvidersConfig,
              ...(state.asrProviderId === id && {
                asrProviderId: 'browser-native' as ASRProviderId,
                asrLanguage: 'zh',
              }),
            };
          }),

        // Web Search actions
        setWebSearchProvider: (providerId) => set({ webSearchProviderId: providerId }),
        setWebSearchProviderConfig: (providerId, config) =>
          set((state) => ({
            webSearchProvidersConfig: {
              ...state.webSearchProvidersConfig,
              [providerId]: {
                ...state.webSearchProvidersConfig[providerId],
                ...config,
              },
            },
          })),

        // Fetch server-configured providers and merge into local state
        fetchServerProviders: async () => {
          try {
            const res = await fetch('/api/server-providers');
            if (!res.ok) return;
            const data = (await res.json()) as {
              tts: Record<string, { baseUrl?: string }>;
              asr: Record<string, { baseUrl?: string }>;
              pdf: Record<string, { baseUrl?: string }>;
              webSearch: Record<string, { baseUrl?: string }>;
            };

            set((state) => {
              // Merge TTS providers
              const newTTSConfig = { ...state.ttsProvidersConfig };
              for (const pid of Object.keys(newTTSConfig)) {
                const key = pid as TTSProviderId;
                if (newTTSConfig[key]) {
                  newTTSConfig[key] = {
                    ...newTTSConfig[key],
                    isServerConfigured: false,
                    serverBaseUrl: undefined,
                  };
                }
              }
              for (const [pid, info] of Object.entries(data.tts)) {
                const key = pid as TTSProviderId;
                if (newTTSConfig[key]) {
                  newTTSConfig[key] = {
                    ...newTTSConfig[key],
                    isServerConfigured: true,
                    serverBaseUrl: info.baseUrl,
                  };
                }
              }

              // Merge ASR providers
              const newASRConfig = { ...state.asrProvidersConfig };
              for (const pid of Object.keys(newASRConfig)) {
                const key = pid as ASRProviderId;
                if (newASRConfig[key]) {
                  newASRConfig[key] = {
                    ...newASRConfig[key],
                    isServerConfigured: false,
                    serverBaseUrl: undefined,
                  };
                }
              }
              for (const [pid, info] of Object.entries(data.asr)) {
                const key = pid as ASRProviderId;
                if (newASRConfig[key]) {
                  newASRConfig[key] = {
                    ...newASRConfig[key],
                    isServerConfigured: true,
                    serverBaseUrl: info.baseUrl,
                  };
                }
              }

              // Merge PDF providers
              const newPDFConfig = { ...state.pdfProvidersConfig };
              for (const pid of Object.keys(newPDFConfig)) {
                const key = pid as PDFProviderId;
                if (newPDFConfig[key]) {
                  newPDFConfig[key] = {
                    ...newPDFConfig[key],
                    isServerConfigured: false,
                    serverBaseUrl: undefined,
                  };
                }
              }
              for (const [pid, info] of Object.entries(data.pdf)) {
                const key = pid as PDFProviderId;
                if (newPDFConfig[key]) {
                  newPDFConfig[key] = {
                    ...newPDFConfig[key],
                    isServerConfigured: true,
                    serverBaseUrl: info.baseUrl,
                  };
                }
              }

              // Merge Web Search config — reset all first, then mark server-configured
              const newWebSearchConfig = { ...state.webSearchProvidersConfig };
              for (const key of Object.keys(newWebSearchConfig) as WebSearchProviderId[]) {
                newWebSearchConfig[key] = {
                  ...newWebSearchConfig[key],
                  isServerConfigured: false,
                  serverBaseUrl: undefined,
                };
              }
              if (data.webSearch) {
                for (const [pid, info] of Object.entries(data.webSearch)) {
                  const key = pid as WebSearchProviderId;
                  if (newWebSearchConfig[key]) {
                    newWebSearchConfig[key] = {
                      ...newWebSearchConfig[key],
                      isServerConfigured: true,
                      serverBaseUrl: info.baseUrl,
                    };
                  }
                }
              }

              // === Validate current selections against updated configs ===
              // Build fallback: server-configured first, then client-key-only
              const buildFallback = <T extends string>(
                config: Record<string, { isServerConfigured?: boolean; apiKey?: string }>,
              ): T[] => [
                ...Object.entries(config)
                  .filter(([, c]) => c.isServerConfigured)
                  .map(([id]) => id as T),
                ...Object.entries(config)
                  .filter(([, c]) => !c.isServerConfigured && !!c.apiKey)
                  .map(([id]) => id as T),
              ];

              const ttsFallback = buildFallback<TTSProviderId>(newTTSConfig);
              const asrFallback = buildFallback<ASRProviderId>(newASRConfig);
              const pdfFallback = buildFallback<PDFProviderId>(newPDFConfig);

              const validTTSProvider = validateProvider(
                state.ttsProviderId,
                newTTSConfig,
                ttsFallback,
                'browser-native-tts' as TTSProviderId,
              );
              const validASRProvider = validateProvider(
                state.asrProviderId,
                newASRConfig,
                asrFallback,
                'browser-native' as ASRProviderId,
              );
              const validPDFProvider = validateProvider(
                state.pdfProviderId,
                newPDFConfig,
                pdfFallback,
                'unpdf' as PDFProviderId,
              );

              const validTTSVoice =
                validTTSProvider !== state.ttsProviderId
                  ? DEFAULT_TTS_VOICES[validTTSProvider as BuiltInTTSProviderId] || 'default'
                  : state.ttsVoice;

              // Auto-disable image/video generation when no provider is usable
              // === Auto-select / auto-enable (only on first run) ===
              let autoTtsProvider: TTSProviderId | undefined;
              let autoTtsVoice: string | undefined;
              let autoAsrProvider: ASRProviderId | undefined;
              let autoPdfProvider: PDFProviderId | undefined;

              // PDF: unpdf → mineru if server has it
              if (newPDFConfig.mineru?.isServerConfigured && state.pdfProviderId === 'unpdf') {
                autoPdfProvider = 'mineru' as PDFProviderId;
              }

              // TTS: select first server provider if current is not server-configured
              const serverTtsIds = Object.keys(data.tts) as TTSProviderId[];
              if (
                serverTtsIds.length > 0 &&
                !newTTSConfig[state.ttsProviderId]?.isServerConfigured
              ) {
                autoTtsProvider = serverTtsIds[0];
                autoTtsVoice =
                  DEFAULT_TTS_VOICES[autoTtsProvider as BuiltInTTSProviderId] || 'default';
              }

              // ASR: select first server provider if current is not server-configured
              const serverAsrIds = Object.keys(data.asr) as ASRProviderId[];
              if (
                serverAsrIds.length > 0 &&
                !newASRConfig[state.asrProviderId]?.isServerConfigured
              ) {
                autoAsrProvider = serverAsrIds[0];
              }

              return {
                ttsProvidersConfig: newTTSConfig,
                asrProvidersConfig: newASRConfig,
                pdfProvidersConfig: newPDFConfig,
                webSearchProvidersConfig: newWebSearchConfig,
                // Validated selections
                ...(validTTSProvider !== state.ttsProviderId && {
                  ttsProviderId: validTTSProvider as TTSProviderId,
                  ttsVoice: validTTSVoice,
                }),
                ...(validASRProvider !== state.asrProviderId && {
                  asrProviderId: validASRProvider as ASRProviderId,
                }),
                ...(validPDFProvider !== state.pdfProviderId && {
                  pdfProviderId: validPDFProvider as PDFProviderId,
                }),
                // Auto-select overrides validation: picks best server provider each sync.
                ...(autoPdfProvider && { pdfProviderId: autoPdfProvider }),
                ...(autoTtsProvider && {
                  ttsProviderId: autoTtsProvider,
                  ttsVoice: autoTtsVoice,
                }),
                ...(autoAsrProvider && { asrProviderId: autoAsrProvider }),
              };
            });
          } catch (e) {
            // Silently fail — server providers are optional
            log.warn('Failed to fetch server providers:', e);
          }
        },
      };
    },
    {
      name: 'settings-storage',
      version: 2,
      // Migrate persisted state
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Partial<SettingsState>;

        // Migrate from old ttsModel to new ttsProviderId
        if (state.ttsModel && !state.ttsProviderId) {
          // Map old ttsModel values to new ttsProviderId
          if (state.ttsModel === 'openai-tts') {
            state.ttsProviderId = 'openai-tts';
          } else if (state.ttsModel === 'azure-tts') {
            state.ttsProviderId = 'azure-tts';
          } else {
            // Default to OpenAI
            state.ttsProviderId = 'openai-tts';
          }
        }

        // Add default audio config if missing
        if (!state.ttsProvidersConfig || !state.asrProvidersConfig) {
          const defaultAudioConfig = getDefaultAudioConfig();
          Object.assign(state, defaultAudioConfig);
        }

        // Migrate global ttsModelId to per-provider
        if ((state as Record<string, unknown>).ttsModelId) {
          const pid = state.ttsProviderId;
          if (pid && state.ttsProvidersConfig?.[pid]) {
            state.ttsProvidersConfig[pid].modelId = (state as Record<string, unknown>)
              .ttsModelId as string;
          }
          delete (state as Record<string, unknown>).ttsModelId;
        }
        // Same for asrModelId
        if ((state as Record<string, unknown>).asrModelId) {
          const pid = state.asrProviderId;
          if (pid && state.asrProvidersConfig?.[pid]) {
            state.asrProvidersConfig[pid].modelId = (state as Record<string, unknown>)
              .asrModelId as string;
          }
          delete (state as Record<string, unknown>).asrModelId;
        }
        // Migrate MiniMax's model field to modelId
        for (const [, cfg] of Object.entries(
          (state.ttsProvidersConfig as Record<string, Record<string, unknown>>) || {},
        )) {
          if (cfg.model && !cfg.modelId) {
            cfg.modelId = cfg.model;
            delete cfg.model;
          }
        }

        // Add default PDF config if missing
        if (!state.pdfProvidersConfig) {
          const defaultPDFConfig = getDefaultPDFConfig();
          Object.assign(state, defaultPDFConfig);
        }

        // v1 → v2: Replace deep research with web search
        if (version < 2) {
          delete (state as Record<string, unknown>).deepResearchProviderId;
          delete (state as Record<string, unknown>).deepResearchProvidersConfig;
        }

        // Add default media generation toggles if missing
        if (state.imageGenerationEnabled === undefined) {
          state.imageGenerationEnabled = false;
        }
        if (state.videoGenerationEnabled === undefined) {
          state.videoGenerationEnabled = false;
        }

        // Add default audio toggles if missing
        if ((state as Record<string, unknown>).ttsEnabled === undefined) {
          (state as Record<string, unknown>).ttsEnabled = true;
        }
        if ((state as Record<string, unknown>).asrEnabled === undefined) {
          (state as Record<string, unknown>).asrEnabled = true;
        }

        if ((state as Record<string, unknown>).agentMode === undefined) {
          (state as Record<string, unknown>).agentMode = 'preset';
        }
        if ((state as Record<string, unknown>).autoAgentCount === undefined) {
          (state as Record<string, unknown>).autoAgentCount = 3;
        }

        // Migrate Web Search: old flat fields → new provider-based config
        if (!state.webSearchProvidersConfig) {
          const stateRecord = state as Record<string, unknown>;
          const oldApiKey = (stateRecord.webSearchApiKey as string) || '';
          const oldIsServerConfigured =
            (stateRecord.webSearchIsServerConfigured as boolean) || false;
          state.webSearchProviderId = 'tavily' as WebSearchProviderId;
          state.webSearchProvidersConfig = {
            tavily: {
              apiKey: oldApiKey,
              baseUrl: '',
              enabled: true,
              isServerConfigured: oldIsServerConfigured,
            },
          } as SettingsState['webSearchProvidersConfig'];
          delete stateRecord.webSearchApiKey;
          delete stateRecord.webSearchIsServerConfigured;
        }

        ensureValidProviderSelections(state);

        return state;
      },
      // Custom merge: always sync built-in providers on every rehydrate,
      // so newly added providers/models appear without clearing cache.
      merge: (persistedState, currentState) => {
        const merged = { ...currentState, ...(persistedState as object) };
        ensureValidProviderSelections(merged as Partial<SettingsState>);
        return merged as SettingsState;
      },
    },
  ),
);
