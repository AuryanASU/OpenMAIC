# ASU AI Classroom - Project Guide

## Quick Reference

| Item | Value |
|------|-------|
| **Live Site** | https://asu-ai-classroom.vercel.app |
| **Vercel Project** | `asu-ai-classroom` on team `xperiences-projects` (Pro) |
| **GitHub (primary)** | https://github.com/AuryanASU/OpenMAIC |
| **GitHub (Vercel-linked)** | https://github.com/AuryanASU/asu-ai-classroom |
| **Upstream** | https://github.com/THU-MAIC/OpenMAIC |
| **Framework** | Next.js 16 + React 19 + Tailwind CSS 4 |
| **Package Manager** | pnpm (>=10.28) |
| **Node** | >=20.9.0 |
| **Database** | Client-side IndexedDB via Dexie (`MAIC-Database`) |
| **AI SDK** | Vercel AI SDK v6 + LangChain/LangGraph |

## Git Remotes

```
origin   -> AuryanASU/OpenMAIC          (our fork of the original)
upstream -> THU-MAIC/OpenMAIC           (original open-source project)
vercel   -> AuryanASU/asu-ai-classroom  (auto-deploys to Vercel on push)
```

**To deploy changes:** Push to the `vercel` remote's `main` branch. Vercel auto-builds on every push.

```bash
git push vercel main
```

## Vercel Environment Variables

Currently configured (All Environments):
- `ANTHROPIC_API_KEY` - Server-side Anthropic API key for Claude models
- `DEFAULT_MODEL` - Set to `anthropic:claude-sonnet-4-6`

To manage: Vercel Dashboard > asu-ai-classroom > Settings > Environment Variables

## ASU Branding

### Design System

This project is ASU-branded, **not** using the original OpenMAIC purple theme. Key brand colors:

| Color | Hex | Usage |
|-------|-----|-------|
| ASU Maroon | `#8C1D40` | Primary (light mode), buttons, links, accents |
| ASU Maroon Light | `#C75B7A` | Primary (dark mode) |
| ASU Gold | `#FFC627` | Accent highlights, chart color, background decor |

The theme is intentionally **modern and tasteful** - maroon is used as a refined accent, not overwhelming. Background uses warm neutrals (stone tones) rather than cool grays.

### Files Modified for ASU Branding

**Core theming:**
- `app/globals.css` - CSS custom properties (all color variables)
- `app/layout.tsx` - Page title ("ASU AI Classroom"), metadata
- `app/page.tsx` - Logo, background gradients, footer text, default language (en-US), 3 course quick-starts
- `configs/theme.ts` - 3 ASU slide preset themes (first 3 in array)
- `lib/i18n/locales/en-US.json` - Slogan: "AI-Powered Interactive Learning at Arizona State University"
- `public/asu-logo.svg` - ASU pitchfork logo with "ASU AI Classroom" text

**Components (purple/violet replaced with ASU maroon across all 19 files):**
- `components/header.tsx`
- `components/language-switcher.tsx`
- `components/user-profile.tsx`
- `components/generation/generation-toolbar.tsx`
- `components/generation/media-popover.tsx`
- `components/chat/chat-area.tsx`
- `components/chat/chat-session.tsx`
- `components/chat/inline-action-tag.tsx`
- `components/chat/lecture-notes-view.tsx`
- `components/chat/session-list.tsx`
- `components/scene-renderers/quiz-view.tsx`
- `components/settings/agent-settings.tsx`
- `components/stage/scene-sidebar.tsx`
- `components/roundtable/index.tsx`
- `components/roundtable/presentation-speech-overlay.tsx`
- `components/canvas/canvas-toolbar.tsx`
- `components/whiteboard/index.tsx`
- `components/whiteboard/whiteboard-history.tsx`
- `components/slide-renderer/components/element/VideoElement/BaseVideoElement.tsx`

### Color Replacement Pattern

When adding new components or updating existing ones, follow this pattern:
- Light mode: `text-[#8C1D40]`, `bg-[#8C1D40]`, `border-[#8C1D40]`
- Dark mode: `dark:text-[#C75B7A]`, `dark:bg-[#C75B7A]`
- Gold accent: `text-[#FFC627]`, `bg-[#FFC627]`
- With opacity: `bg-[#8C1D40]/10`, `text-[#8C1D40]/60`
- **Never use** `purple-*`, `violet-*`, or `indigo-*` Tailwind classes

## Architecture Overview

### How Courses Work

Courses ("classrooms") are **AI-generated on-demand**, not pre-configured:

1. User enters a text description (+ optional PDF upload)
2. Client sends requirements to `/api/generate-classroom`
3. Server calls the configured LLM (Claude) in two stages:
   - Stage 1: Generate scene outlines (lesson structure)
   - Stage 2: Generate full scenes (slides, quizzes, interactions, narration)
4. Generated content stored in browser IndexedDB + server `data/classrooms/` directory
5. User enters the interactive classroom with AI teacher agents

### Key Directories

```
app/                    # Next.js App Router pages & API routes
  api/                  # Server-side API endpoints
  classroom/[id]/       # Classroom playback view
  generation-preview/   # Course generation progress page
components/             # React components (UI, chat, slides, etc.)
  ui/                   # shadcn/ui base components
configs/                # Slide themes, animations, shapes
lib/
  ai/                   # LLM provider registry & configuration
  server/               # Server-side generation, storage, SSRF guard
  store/                # Zustand state stores (settings, media, etc.)
  utils/                # Database (Dexie), storage, helpers
  i18n/                 # Internationalization (en-US, zh-CN, ja-JP, ru-RU)
  types/                # TypeScript type definitions
public/                 # Static assets (logos, provider icons)
```

### Homepage Course Quick-Starts

Three ASU-specific course templates are defined inline in `app/page.tsx` (search for "Quick Start"). They appear when no classrooms exist yet:

1. **Introduction to Data Science** - Python, pandas, statistics
2. **Sustainability & Innovation** - SDGs, design thinking, circular economy
3. **Business Analytics Essentials** - KPIs, dashboards, A/B testing

These are just pre-filled prompts - clicking one fills the textarea, then the user clicks "Enter Classroom" to generate.

## Security Notes

A full security audit was performed on the original THU-MAIC/OpenMAIC codebase. Results:

- **No malicious code, data exfiltration, or phone-home endpoints**
- **No analytics/telemetry/tracking** of any kind
- All Chinese domain URLs are legitimate opt-in AI provider API endpoints
- API keys are properly handled server-side (never exposed to client)
- SSRF protection implemented in `lib/server/ssrf-guard.ts`
- No SQL injection risk (uses client-side IndexedDB, no SQL database)
- All dependencies are well-known packages

Minor hardening recommendations (not blocking):
- KaTeX loaded from CDN (jsdelivr.net) in interactive content - could bundle locally
- No rate limiting on API routes for public deployments
- Consider adding `ACCESS_CODE` env var for site-wide password protection

## Development

```bash
# Install dependencies
pnpm install

# Run dev server
pnpm dev

# Build for production
pnpm build

# Lint
pnpm lint

# Format check (CI runs this — always run before pushing)
pnpm check

# Auto-fix formatting
npx prettier . --write
```

> **Important:** CI runs Prettier via `pnpm check`. Always run it before pushing to avoid formatting failures.

## Pulling Upstream Updates

To merge improvements from the original OpenMAIC project:

```bash
git fetch upstream
git merge upstream/main
# Resolve any conflicts (likely in globals.css, page.tsx, theme.ts)
# Re-verify no purple/violet colors were reintroduced
git push vercel main
```

## Common Tasks

### Change the AI model
Update `DEFAULT_MODEL` in Vercel env vars. Format: `provider:model-id` (e.g., `anthropic:claude-sonnet-4-6`)

### Add site-wide password
Set `ACCESS_CODE` environment variable in Vercel. Users will need to enter it to access the site.

### Update branding text
Edit `lib/i18n/locales/en-US.json` - the `home.slogan` key controls the tagline under the logo.

### Modify the logo
Replace `public/asu-logo.svg`. The logo is referenced in `app/page.tsx` in the hero section.

### Add/change course quick-starts
Edit the array in `app/page.tsx` (search for "ASU Course Quick-Starts"). Each entry has `icon`, `title`, `desc`, and `prompt`.
