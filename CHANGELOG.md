# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased] - 2026-04-14

ASU AI Classroom platform overhaul: managed provider lockdown, syllabus-first course creation, and presentation styling improvements.

### Changed

- **Platform provider lockdown** — Removed user-facing Settings panel (`components/settings/`). All AI providers are now server-controlled via `lib/server/platform-config.ts`. Features auto-enable based on env var presence; users never see provider config, model selection, or API key inputs.
- **Course creation flow** — Every course now goes through syllabus review before generation. The three-tab input experiment was replaced with a single unified text input; "Upload a Syllabus PDF instead" appears as a secondary action below it.
- **Presentation styling overhaul** — New slide layout system with 12 named layouts (`configs/slide-layouts.ts`): title-centered, section-divider, content-image-right, key-concept, comparison, numbered-steps, quote-highlight, summary, and more. Expanded `PresetTheme` interface with `headingFont`, `bodyFont`, `headingSizes`, `bodySizes`, `accentColor`. 5 ASU-branded preset themes (up from 3). All fonts changed from Microsoft YaHei to Arial (ASU web-safe fallback). PPTX export now cascades theme properties (element → theme → global default).
- **Scene generation prompts** — Updated with layout variety rules and ASU brand color guidance.

### Added

- `lib/types/syllabus.ts` — `CourseSyllabus` and `CourseModule` type definitions
- `app/api/generate-syllabus/route.ts` — SSE streaming API: generates a structured syllabus from topic text
- `app/api/parse-syllabus/route.ts` — PDF upload → AI parsing into structured syllabus
- `lib/store/syllabus.ts` — Zustand store with localStorage persistence for syllabus state
- `components/syllabus/syllabus-editor.tsx` — Full editor with Overview/Modules/Assessment tabs and AI Refine sidebar
- `lib/server/platform-config.ts` — Server-side feature flags and provider configuration
- `configs/slide-layouts.ts` — 12 named slide layout definitions
- `docs/asu-brand-analysis.md` — ASU brand color, font, and layout analysis

### Removed

- `components/settings/` — Entire user-facing settings panel (provider config, model selection, API key inputs)

### Environment Variables (Vercel / managed deployment)

| Variable | Required | Purpose |
|----------|----------|---------|
| `ANTHROPIC_API_KEY` | **Yes** | Powers all AI generation (Claude Sonnet 4.6) |
| `ELEVENLABS_API_KEY` | Optional | Enables text-to-speech |
| `GOOGLE_AI_API_KEY` | Optional | Enables image generation (Imagen) and video generation (VEO) |
| `TAVILY_API_KEY` | Optional | Enables web search enrichment |

---

## [0.1.0] - 2026-03-26

The first tagged release of OpenMAIC, including all improvements since the initial open-source launch.

### Highlights

- **Discussion TTS** — Voice playback during discussion phase with per-agent voice assignment, supporting all TTS providers including browser-native [#211](https://github.com/THU-MAIC/OpenMAIC/pull/211)
- **Immersive Mode** — Full-screen view with speech bubbles, auto-hide controls, and keyboard navigation [#195](https://github.com/THU-MAIC/OpenMAIC/pull/195) (by @YizukiAme)
- **Discussion buffer-level pause** — Freeze text reveal without aborting the AI stream [#129](https://github.com/THU-MAIC/OpenMAIC/pull/129) (by @YizukiAme)
- **Keyboard shortcuts** — Comprehensive roundtable controls: T/V/Esc/Space/M/S/C [#256](https://github.com/THU-MAIC/OpenMAIC/pull/256) (by @YizukiAme)
- **Whiteboard enhancements** — Pan, zoom, auto-fit [#31](https://github.com/THU-MAIC/OpenMAIC/pull/31), history and auto-save [#40](https://github.com/THU-MAIC/OpenMAIC/pull/40) (by @YizukiAme)
- **New providers** — ElevenLabs TTS [#134](https://github.com/THU-MAIC/OpenMAIC/pull/134) (by @nkmohit), Grok/xAI for LLM, image, and video [#113](https://github.com/THU-MAIC/OpenMAIC/pull/113) (by @KanameMadoka520)
- **Server-side generation** — Media and TTS generation on the server [#75](https://github.com/THU-MAIC/OpenMAIC/pull/75) (by @cosarah)
- **1.25x playback speed** [#131](https://github.com/THU-MAIC/OpenMAIC/pull/131) (by @YizukiAme)
- **OpenClaw integration** — Generate classrooms from Feishu, Slack, Telegram, and 20+ messaging apps [#4](https://github.com/THU-MAIC/OpenMAIC/pull/4) (by @cosarah)
- **Vercel one-click deploy** [#2](https://github.com/THU-MAIC/OpenMAIC/pull/2) (by @cosarah)

### Security

- Fix SSRF and credential forwarding via client-supplied baseUrl [#30](https://github.com/THU-MAIC/OpenMAIC/pull/30) (by @Wing900)
- Use resolved API key in chat route instead of client-sent key [#221](https://github.com/THU-MAIC/OpenMAIC/pull/221)

### Testing

- Add Vitest unit testing infrastructure [#144](https://github.com/THU-MAIC/OpenMAIC/pull/144)
- Add Playwright e2e testing framework [#229](https://github.com/THU-MAIC/OpenMAIC/pull/229)

### New Contributors

@YizukiAme, @nkmohit, @KanameMadoka520, @Wing900, @Bortlesboat, @JokerQianwei, @humingfeng, @tsinglua, @mehulmpt, @ShaojieLiu, @Rowtion
