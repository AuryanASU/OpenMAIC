import type { PPTElementOutline, PPTElementShadow } from '@/lib/types/slides';

export interface PresetTheme {
  /** Slide background color */
  background: string;
  /** Default text color for body copy */
  fontColor: string;
  /** Font family name (empty string = system default / Arial) */
  fontname: string;
  /** Theme accent color palette — 6 colors used for shapes, charts, highlights */
  colors: string[];
  /** Default border/outline color for decorative elements */
  borderColor?: string;
  /** Heading font — if different from body (e.g., for a heavier weight) */
  headingFont?: string;
  /** Body font — base reading font */
  bodyFont?: string;
  /** Heading size scale: [h1px, h2px, h3px] in canvas pixels (1000px wide canvas) */
  headingSizes?: [number, number, number];
  /** Body text sizes: [largePx, basePx, smallPx] */
  bodySizes?: [number, number, number];
  /** Primary accent color (used for title bars, rules, callout borders) */
  accentColor?: string;
  /** Secondary accent color (charts, highlights) */
  accentSecondary?: string;
  /** Color for title slide backgrounds */
  titleSlideBackground?: string;
  /** Color for section divider backgrounds */
  sectionBackground?: string;
  /** Text color to use on sectionBackground */
  sectionFontColor?: string;
  /** Optional outline for bordered decorative elements */
  outline?: PPTElementOutline;
  /** Optional shadow for card-style elements */
  shadow?: PPTElementShadow;
}

/**
 * ASU typography scale (canvas: 1000 × 562.5 px)
 *
 * Derived from the ASU brand template (1920×1080) scaled by 1000/1920 ≈ 0.521.
 * Font: Arial (web-safe substitute for ASU's Neue Haas Grotesk).
 */
const ASU_HEADING_SIZES: [number, number, number] = [36, 28, 22]; // h1, h2, h3 px
const ASU_BODY_SIZES: [number, number, number] = [18, 16, 13]; // large, base, small px

export const PRESET_THEMES: PresetTheme[] = [
  // ─────────────────────────────────────────
  // ASU THEMES (indices 0–4)
  // ─────────────────────────────────────────

  // 0: ASU Light — clean white, maroon headlines, gold accents
  {
    background: '#ffffff',
    fontColor: '#191919',
    borderColor: '#8C1D40',
    fontname: 'Arial',
    headingFont: 'Arial',
    bodyFont: 'Arial',
    headingSizes: ASU_HEADING_SIZES,
    bodySizes: ASU_BODY_SIZES,
    accentColor: '#8C1D40',
    accentSecondary: '#FFC627',
    titleSlideBackground: '#ffffff',
    sectionBackground: '#FFC627',
    sectionFontColor: '#191919',
    colors: ['#8C1D40', '#FFC627', '#00A3E0', '#78BE20', '#5C6670', '#FF7F32'],
  },

  // 1: ASU Warm — cream background, maroon + warm gold palette
  {
    background: '#faf8f5',
    fontColor: '#2d2024',
    borderColor: '#8C1D40',
    fontname: 'Arial',
    headingFont: 'Arial',
    bodyFont: 'Arial',
    headingSizes: ASU_HEADING_SIZES,
    bodySizes: ASU_BODY_SIZES,
    accentColor: '#8C1D40',
    accentSecondary: '#F2A900',
    titleSlideBackground: '#faf8f5',
    sectionBackground: '#F2A900',
    sectionFontColor: '#191919',
    colors: ['#8C1D40', '#F2A900', '#E87722', '#00A3E0', '#78BE20', '#AB0520'],
  },

  // 2: ASU Dark — deep maroon background, gold headlines, light body text
  {
    background: '#1a0a10',
    fontColor: '#f5f0eb',
    borderColor: '#FFC627',
    fontname: 'Arial',
    headingFont: 'Arial',
    bodyFont: 'Arial',
    headingSizes: ASU_HEADING_SIZES,
    bodySizes: ASU_BODY_SIZES,
    accentColor: '#FFC627',
    accentSecondary: '#C75B7A',
    titleSlideBackground: '#1a0a10',
    sectionBackground: '#2d1525',
    sectionFontColor: '#FFC627',
    colors: ['#FFC627', '#C75B7A', '#78BE20', '#00A3E0', '#FF7F32', '#f5f0eb'],
  },

  // 3: ASU Gold — gold background, dark text (high-contrast section slide)
  {
    background: '#FFC627',
    fontColor: '#191919',
    borderColor: '#8C1D40',
    fontname: 'Arial',
    headingFont: 'Arial',
    bodyFont: 'Arial',
    headingSizes: ASU_HEADING_SIZES,
    bodySizes: ASU_BODY_SIZES,
    accentColor: '#8C1D40',
    accentSecondary: '#191919',
    titleSlideBackground: '#FFC627',
    sectionBackground: '#8C1D40',
    sectionFontColor: '#FFC627',
    colors: ['#8C1D40', '#191919', '#404040', '#FFFFFF', '#F2A900', '#00A3E0'],
  },

  // 4: ASU Slate — cool dark slate, gold + sky-blue accents
  {
    background: '#1e2a35',
    fontColor: '#f0f4f8',
    borderColor: '#00A3E0',
    fontname: 'Arial',
    headingFont: 'Arial',
    bodyFont: 'Arial',
    headingSizes: ASU_HEADING_SIZES,
    bodySizes: ASU_BODY_SIZES,
    accentColor: '#00A3E0',
    accentSecondary: '#FFC627',
    titleSlideBackground: '#1e2a35',
    sectionBackground: '#00A3E0',
    sectionFontColor: '#ffffff',
    colors: ['#00A3E0', '#FFC627', '#8C1D40', '#78BE20', '#FF7F32', '#f0f4f8'],
  },

  // ─────────────────────────────────────────
  // STANDARD THEMES (indices 5–18)
  // ─────────────────────────────────────────

  {
    background: '#ffffff',
    fontColor: '#333333',
    borderColor: '#41719c',
    fontname: '',
    colors: ['#5b9bd5', '#ed7d31', '#a5a5a5', '#ffc000', '#4472c4', '#70ad47'],
  },
  {
    background: '#ffffff',
    fontColor: '#333333',
    borderColor: '#5f6f1c',
    fontname: '',
    colors: ['#83992a', '#3c9670', '#44709d', '#a23b32', '#d87728', '#deb340'],
  },
  {
    background: '#ffffff',
    fontColor: '#333333',
    borderColor: '#a75f0a',
    fontname: '',
    colors: ['#e48312', '#bd582c', '#865640', '#9b8357', '#c2bc80', '#94a088'],
  },
  {
    background: '#ffffff',
    fontColor: '#333333',
    borderColor: '#7c91a8',
    fontname: '',
    colors: ['#bdc8df', '#003fa9', '#f5ba00', '#ff7567', '#7676d9', '#923ffc'],
  },
  {
    background: '#ffffff',
    fontColor: '#333333',
    borderColor: '#688e19',
    fontname: '',
    colors: ['#90c225', '#54a121', '#e6b91e', '#e86618', '#c42f19', '#918756'],
  },
  {
    background: '#ffffff',
    fontColor: '#333333',
    borderColor: '#4495b0',
    fontname: '',
    colors: ['#1cade4', '#2683c6', '#27ced7', '#42ba97', '#3e8853', '#62a39f'],
  },
  {
    background: '#e9efd6',
    fontColor: '#333333',
    borderColor: '#782009',
    fontname: '',
    colors: ['#a5300f', '#de7e18', '#9f8351', '#728653', '#92aa4c', '#6aac91'],
  },
  {
    background: '#17444e',
    fontColor: '#ffffff',
    borderColor: '#800c0b',
    fontname: '',
    colors: ['#b01513', '#ea6312', '#e6b729', '#6bab90', '#55839a', '#9e5d9d'],
  },
  {
    background: '#36234d',
    fontColor: '#ffffff',
    borderColor: '#830949',
    fontname: '',
    colors: ['#b31166', '#e33d6f', '#e45f3c', '#e9943a', '#9b6bf2', '#d63cd0'],
  },
  {
    background: '#247fad',
    fontColor: '#ffffff',
    borderColor: '#032e45',
    fontname: '',
    colors: ['#052f61', '#a50e82', '#14967c', '#6a9e1f', '#e87d37', '#c62324'],
  },
  {
    background: '#103f55',
    fontColor: '#ffffff',
    borderColor: '#2d7f8a',
    fontname: '',
    colors: ['#40aebd', '#97e8d5', '#a1cf49', '#628f3e', '#f2df3a', '#fcb01c'],
  },
  {
    background: '#242367',
    fontColor: '#ffffff',
    borderColor: '#7d2b8d',
    fontname: '',
    colors: ['#ac3ec1', '#477bd1', '#46b298', '#90ba4c', '#dd9d31', '#e25345'],
  },
  {
    background: '#e4b75e',
    fontColor: '#333333',
    borderColor: '#b68317',
    fontname: '',
    colors: ['#a5644e', '#b58b80', '#c3986d', '#a19574', '#c17529', '#826277'],
  },
  {
    background: '#333333',
    fontColor: '#ffffff',
    borderColor: '#7c91a8',
    fontname: '',
    colors: ['#bdc8df', '#003fa9', '#f5ba00', '#ff7567', '#7676d9', '#923ffc'],
  },
  {
    background: '#2b2b2d',
    fontColor: '#ffffff',
    borderColor: '#893011',
    fontname: '',
    colors: ['#bc451b', '#d3ba68', '#bb8640', '#ad9277', '#a55a43', '#ad9d7b'],
  },
  {
    background: '#171b1e',
    fontColor: '#ffffff',
    borderColor: '#505050',
    fontname: '',
    colors: ['#6f6f6f', '#bfbfa5', '#dbd084', '#e7bf5f', '#e9a039', '#cf7133'],
  },
];
