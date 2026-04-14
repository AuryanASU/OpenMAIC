/**
 * Slide Layout System
 *
 * Defines reusable layout templates for the 1000 × 562.5 px canvas.
 * Each layout describes where different content zones sit on the slide.
 * The AI prompt system uses these to vary slide structure across a deck.
 *
 * Canvas constants:
 *   Width  = 1000 px
 *   Height = 562.5 px
 *   Safe margins: left/right ≥ 50 px, top/bottom ≥ 40 px
 *
 * Zone coordinates: { left, top, width, height } — all in canvas pixels.
 */

export interface LayoutZone {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface SlideLayoutDefinition {
  /** Machine-readable key used in prompts */
  id: string;
  /** Human-readable display name */
  name: string;
  /** One-sentence description for the AI prompt */
  description: string;
  /** Slide types this layout is appropriate for */
  appropriateFor: Array<'cover' | 'transition' | 'content' | 'end'>;
  /**
   * Named content zones.
   * Not all zones need to be used — they define the maximum available space.
   */
  zones: {
    /** Main slide title */
    title?: LayoutZone;
    /** Subtitle or lead-in text */
    subtitle?: LayoutZone;
    /** Primary body content (bullets, paragraphs) */
    body?: LayoutZone;
    /** Secondary body or right-side content */
    bodyRight?: LayoutZone;
    /** Image or visual area */
    visual?: LayoutZone;
    /** Secondary image area */
    visualRight?: LayoutZone;
    /** Callout / highlight box */
    callout?: LayoutZone;
    /** Left column (comparison/split layouts) */
    columnLeft?: LayoutZone;
    /** Right column (comparison/split layouts) */
    columnRight?: LayoutZone;
    /** Decorative accent bar (e.g., horizontal rule under title) */
    accentBar?: LayoutZone;
    /** Footer / source / attribution area */
    footer?: LayoutZone;
  };
  /** Suggested background treatment */
  backgroundHint?: 'white' | 'accent' | 'dark' | 'image';
  /** Suggested font size for the title zone (px) */
  titleFontSize?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CANVAS CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export const CANVAS_W = 1000;
export const CANVAS_H = 562.5;
export const MARGIN_H = 60; // horizontal margin
export const MARGIN_V = 45; // vertical margin
export const CONTENT_W = CANVAS_W - MARGIN_H * 2; // 880
export const CONTENT_H = CANVAS_H - MARGIN_V * 2; // 472.5

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

export const SLIDE_LAYOUTS: SlideLayoutDefinition[] = [
  // ── 1. TITLE SLIDE ────────────────────────────────────────────────────────
  {
    id: 'title-centered',
    name: 'Title Slide — Centered',
    description:
      'Course or chapter opening slide. Large centered title with subtitle below. Optional decorative accent bar between title and subtitle.',
    appropriateFor: ['cover'],
    backgroundHint: 'white',
    titleFontSize: 40,
    zones: {
      title: { left: 60, top: 150, width: 880, height: 120 },
      subtitle: { left: 60, top: 300, width: 880, height: 80 },
      accentBar: { left: 60, top: 290, width: 200, height: 4 },
      footer: { left: 60, top: 500, width: 880, height: 30 },
    },
  },

  // ── 2. TITLE SLIDE — LEFT ALIGNED ─────────────────────────────────────────
  {
    id: 'title-left',
    name: 'Title Slide — Left Aligned',
    description:
      'Opening slide with title and subtitle left-aligned. Right half is available for a decorative image or color block.',
    appropriateFor: ['cover'],
    backgroundHint: 'white',
    titleFontSize: 40,
    zones: {
      title: { left: 60, top: 160, width: 520, height: 110 },
      subtitle: { left: 60, top: 300, width: 480, height: 70 },
      accentBar: { left: 60, top: 285, width: 160, height: 4 },
      visual: { left: 580, top: 0, width: 420, height: 562 },
      footer: { left: 60, top: 500, width: 480, height: 30 },
    },
  },

  // ── 3. SECTION DIVIDER ────────────────────────────────────────────────────
  {
    id: 'section-divider',
    name: 'Section Divider',
    description:
      'Transition slide between major topics. Bold section title centered or left-aligned on a contrasting background color. Minimal — no body content.',
    appropriateFor: ['transition'],
    backgroundHint: 'accent',
    titleFontSize: 48,
    zones: {
      title: { left: 60, top: 180, width: 880, height: 140 },
      subtitle: { left: 60, top: 340, width: 600, height: 60 },
      accentBar: { left: 60, top: 170, width: 120, height: 6 },
    },
  },

  // ── 4. STANDARD CONTENT ───────────────────────────────────────────────────
  {
    id: 'standard-content',
    name: 'Standard Content',
    description:
      'Default content slide: title at top, body text below. Use for straightforward informational content.',
    appropriateFor: ['content'],
    backgroundHint: 'white',
    titleFontSize: 28,
    zones: {
      title: { left: 60, top: 45, width: 880, height: 70 },
      accentBar: { left: 60, top: 118, width: 880, height: 2 },
      body: { left: 60, top: 130, width: 880, height: 370 },
      footer: { left: 60, top: 520, width: 880, height: 25 },
    },
  },

  // ── 5. CONTENT + IMAGE (text left, image right) ───────────────────────────
  {
    id: 'content-image-right',
    name: 'Content + Image — Image Right',
    description:
      'Split layout: title spans full width at top, left half has text/bullets, right half shows an image or visual. Good for illustrated concepts.',
    appropriateFor: ['content'],
    backgroundHint: 'white',
    titleFontSize: 28,
    zones: {
      title: { left: 60, top: 45, width: 880, height: 70 },
      accentBar: { left: 60, top: 118, width: 880, height: 2 },
      body: { left: 60, top: 132, width: 430, height: 360 },
      visual: { left: 530, top: 125, width: 410, height: 380 },
      footer: { left: 60, top: 520, width: 880, height: 25 },
    },
  },

  // ── 6. CONTENT + IMAGE (image left, text right) ───────────────────────────
  {
    id: 'content-image-left',
    name: 'Content + Image — Image Left',
    description:
      'Split layout: title spans full width at top, left half shows an image, right half has text/bullets. Varies visual flow from image-right layout.',
    appropriateFor: ['content'],
    backgroundHint: 'white',
    titleFontSize: 28,
    zones: {
      title: { left: 60, top: 45, width: 880, height: 70 },
      accentBar: { left: 60, top: 118, width: 880, height: 2 },
      visual: { left: 60, top: 125, width: 410, height: 380 },
      body: { left: 510, top: 132, width: 430, height: 360 },
      footer: { left: 60, top: 520, width: 880, height: 25 },
    },
  },

  // ── 7. KEY CONCEPT (large callout) ────────────────────────────────────────
  {
    id: 'key-concept',
    name: 'Key Concept',
    description:
      'Highlights a single important idea. Large centered callout box with bold statement, supporting explanation below. Use for definitions, laws, or core principles.',
    appropriateFor: ['content'],
    backgroundHint: 'white',
    titleFontSize: 24,
    zones: {
      title: { left: 60, top: 40, width: 880, height: 55 },
      callout: { left: 80, top: 115, width: 840, height: 130 },
      body: { left: 80, top: 270, width: 840, height: 230 },
      footer: { left: 60, top: 520, width: 880, height: 25 },
    },
  },

  // ── 8. COMPARISON (two columns) ───────────────────────────────────────────
  {
    id: 'comparison',
    name: 'Two-Column Comparison',
    description:
      'Side-by-side comparison of two concepts. Title at top, left column and right column each have a sub-header and content area.',
    appropriateFor: ['content'],
    backgroundHint: 'white',
    titleFontSize: 28,
    zones: {
      title: { left: 60, top: 45, width: 880, height: 70 },
      accentBar: { left: 60, top: 118, width: 880, height: 2 },
      columnLeft: { left: 60, top: 132, width: 420, height: 360 },
      columnRight: { left: 520, top: 132, width: 420, height: 360 },
      footer: { left: 60, top: 520, width: 880, height: 25 },
    },
  },

  // ── 9. NUMBERED STEPS ─────────────────────────────────────────────────────
  {
    id: 'numbered-steps',
    name: 'Numbered Steps',
    description:
      'Sequential process or procedure. Title at top, then 3–5 numbered steps in a vertical list or horizontal flow. Use for how-to content or multi-step processes.',
    appropriateFor: ['content'],
    backgroundHint: 'white',
    titleFontSize: 28,
    zones: {
      title: { left: 60, top: 45, width: 880, height: 70 },
      accentBar: { left: 60, top: 118, width: 880, height: 2 },
      body: { left: 60, top: 132, width: 880, height: 370 },
      footer: { left: 60, top: 520, width: 880, height: 25 },
    },
  },

  // ── 10. QUOTE / HIGHLIGHT ─────────────────────────────────────────────────
  {
    id: 'quote-highlight',
    name: 'Quote or Key Takeaway',
    description:
      'Single impactful quote or key takeaway. Large stylized quotation or statement, source/context below. Dark or accent background for emphasis.',
    appropriateFor: ['content'],
    backgroundHint: 'dark',
    titleFontSize: 32,
    zones: {
      callout: { left: 80, top: 140, width: 840, height: 200 },
      subtitle: { left: 80, top: 360, width: 840, height: 80 },
      accentBar: { left: 80, top: 135, width: 60, height: 8 },
    },
  },

  // ── 11. SUMMARY / RECAP ───────────────────────────────────────────────────
  {
    id: 'summary',
    name: 'Summary / Recap',
    description:
      'End-of-section summary with title, concise recap bullets, and a call-to-action or transition prompt. Clean, readable layout.',
    appropriateFor: ['content', 'end'],
    backgroundHint: 'white',
    titleFontSize: 28,
    zones: {
      title: { left: 60, top: 45, width: 880, height: 70 },
      accentBar: { left: 60, top: 118, width: 880, height: 2 },
      body: { left: 60, top: 132, width: 560, height: 340 },
      callout: { left: 660, top: 132, width: 280, height: 340 },
      footer: { left: 60, top: 500, width: 880, height: 40 },
    },
  },

  // ── 12. FULL-WIDTH VISUAL ─────────────────────────────────────────────────
  {
    id: 'full-visual',
    name: 'Full-Width Visual',
    description:
      'Image or diagram takes the majority of the slide. Title at top or bottom in a narrow band. Use when a visual is the primary content.',
    appropriateFor: ['content'],
    backgroundHint: 'white',
    titleFontSize: 24,
    zones: {
      title: { left: 60, top: 45, width: 880, height: 55 },
      visual: { left: 60, top: 115, width: 880, height: 390 },
      subtitle: { left: 60, top: 510, width: 880, height: 35 },
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Look up a layout by id. Returns undefined if not found. */
export function getLayout(id: string): SlideLayoutDefinition | undefined {
  return SLIDE_LAYOUTS.find((l) => l.id === id);
}

/**
 * Get layouts appropriate for a given slide type.
 * Returns layouts in definition order.
 */
export function getLayoutsFor(
  slideType: 'cover' | 'transition' | 'content' | 'end',
): SlideLayoutDefinition[] {
  return SLIDE_LAYOUTS.filter((l) => l.appropriateFor.includes(slideType));
}

/**
 * Build a compact prompt description of all layouts, for injection into AI prompts.
 * Format: "id: description"
 */
export function buildLayoutMenuForPrompt(
  slideType?: 'cover' | 'transition' | 'content' | 'end',
): string {
  const layouts = slideType ? getLayoutsFor(slideType) : SLIDE_LAYOUTS;
  return layouts.map((l) => `- **${l.id}**: ${l.description}`).join('\n');
}

/**
 * Build a detailed zone reference for a specific layout, for injection into AI prompts.
 * Lists each zone with its pixel coordinates.
 */
export function buildLayoutZoneReference(layoutId: string): string {
  const layout = getLayout(layoutId);
  if (!layout) return '';
  const lines: string[] = [`Layout: **${layout.name}** (\`${layout.id}\`)`];
  for (const [zoneName, zone] of Object.entries(layout.zones)) {
    if (zone) {
      lines.push(
        `  - \`${zoneName}\`: left=${zone.left}, top=${zone.top}, width=${zone.width}, height=${zone.height}`,
      );
    }
  }
  return lines.join('\n');
}
