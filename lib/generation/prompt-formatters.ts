/**
 * Prompt and context building utilities for the generation pipeline.
 */

import type { PdfImage } from '@/lib/types/generation';
import type { CourseSyllabus } from '@/lib/types/syllabus';
import type { AgentInfo, SceneGenerationContext } from './pipeline-types';

/** Build a course context string for injection into action prompts */
export function buildCourseContext(ctx?: SceneGenerationContext): string {
  if (!ctx) return '';

  const lines: string[] = [];

  // Course outline with position marker
  lines.push('Course Outline:');
  ctx.allTitles.forEach((t, i) => {
    const marker = i === ctx.pageIndex - 1 ? ' ← current' : '';
    lines.push(`  ${i + 1}. ${t}${marker}`);
  });

  // Position information
  lines.push('');
  lines.push(
    'IMPORTANT: All pages belong to the SAME class session. Do NOT greet again after the first page. When referencing content from earlier pages, say "we just covered" or "as mentioned on page N" — NEVER say "last class" or "previous session" because there is no previous session.',
  );
  lines.push('');
  if (ctx.pageIndex === 1) {
    lines.push('Position: This is the FIRST page. Open with a greeting and course introduction.');
  } else if (ctx.pageIndex === ctx.totalPages) {
    lines.push('Position: This is the LAST page. Conclude the course with a summary and closing.');
    lines.push(
      'Transition: Continue naturally from the previous page. Do NOT greet or re-introduce.',
    );
  } else {
    lines.push(`Position: Page ${ctx.pageIndex} of ${ctx.totalPages} (middle of the course).`);
    lines.push(
      'Transition: Continue naturally from the previous page. Do NOT greet or re-introduce.',
    );
  }

  // Previous page speech for transition reference
  if (ctx.previousSpeeches.length > 0) {
    lines.push('');
    lines.push('Previous page speech (for transition reference):');
    const lastSpeech = ctx.previousSpeeches[ctx.previousSpeeches.length - 1];
    lines.push(`  "...${lastSpeech.slice(-150)}"`);
  }

  return lines.join('\n');
}

/**
 * Build a syllabus context string for injection into content and action prompts.
 * Provides the AI with full course structure so it can make natural cross-module references.
 *
 * @param syllabus - The full course syllabus
 * @param currentModuleIndex - 0-based index of the current module being generated
 * @returns A text block describing course structure, current module, and prior modules
 */
export function buildSyllabusContext(
  syllabus: CourseSyllabus,
  currentModuleIndex?: number,
): string {
  const lines: string[] = [];

  // Header
  const courseCode = syllabus.courseCode ? ` (${syllabus.courseCode})` : '';
  lines.push('=== Course Context ===');
  lines.push(`Course: ${syllabus.title}${courseCode}`);

  // Module outline with position marker
  lines.push('');
  lines.push('Module Outline:');
  for (let i = 0; i < syllabus.modules.length; i++) {
    const mod = syllabus.modules[i];
    const topicsPreview = mod.topics.slice(0, 3).join(', ');
    const marker = i === currentModuleIndex ? '  \u2190 CURRENT MODULE' : '';
    lines.push(`  ${i + 1}. ${mod.title} \u2014 Topics: ${topicsPreview}${marker}`);
  }

  // Current module details
  if (currentModuleIndex !== undefined && currentModuleIndex < syllabus.modules.length) {
    const currentModule = syllabus.modules[currentModuleIndex];
    lines.push('');
    lines.push(`Current Module: Module ${currentModuleIndex + 1} \u2014 ${currentModule.title}`);
    if (currentModule.learningObjectives.length > 0) {
      lines.push(`  Objectives: ${currentModule.learningObjectives.join('; ')}`);
    }

    // Prior modules covered
    if (currentModuleIndex > 0) {
      lines.push('');
      lines.push('Prior Modules Covered:');
      for (let i = 0; i < currentModuleIndex; i++) {
        const priorMod = syllabus.modules[i];
        const priorTopics = priorMod.topics.slice(0, 3).join(', ');
        lines.push(`  - Module ${i + 1} covered: ${priorTopics}`);
      }
    }
  }

  // Assessment strategy
  if (syllabus.assessmentStrategy && syllabus.assessmentStrategy.components.length > 0) {
    lines.push('');
    const strategyParts = syllabus.assessmentStrategy.components.map(
      (c) => `${c.name} (${c.weight}%)`,
    );
    lines.push(`Assessment Strategy: ${strategyParts.join(', ')}`);
  }

  // Instruction for the AI
  lines.push('');
  lines.push(
    'INSTRUCTION: When creating content for this module, naturally reference concepts from prior modules where relevant. For example, "building on the data cleaning techniques from Module 1..." Do NOT literally quote prior content \u2014 use the module descriptions to bridge between topics.',
  );

  return lines.join('\n');
}

/** Format agent list for injection into action prompts */
export function formatAgentsForPrompt(agents?: AgentInfo[]): string {
  if (!agents || agents.length === 0) return '';

  const lines = ['Classroom Agents:'];
  for (const a of agents) {
    const personaPart = a.persona ? ` — ${a.persona}` : '';
    lines.push(`- id: "${a.id}", name: "${a.name}", role: ${a.role}${personaPart}`);
  }
  return lines.join('\n');
}

/** Extract the teacher agent's persona for injection into outline/content prompts */
export function formatTeacherPersonaForPrompt(agents?: AgentInfo[]): string {
  if (!agents || agents.length === 0) return '';

  const teacher = agents.find((a) => a.role === 'teacher');
  if (!teacher?.persona) return '';

  return `Teacher Persona:\nName: ${teacher.name}\n${teacher.persona}\n\nAdapt the content style and tone to match this teacher's personality. IMPORTANT: The teacher's name and identity must NOT appear on the slides — no "Teacher ${teacher.name}'s tips", no "Teacher's message", etc. Slides should read as neutral, professional visual aids.`;
}

/**
 * Format a single PdfImage description for prompt inclusion.
 * Includes dimension/aspect-ratio info when available.
 */
export function formatImageDescription(img: PdfImage, language: string): string {
  let dimInfo = '';
  if (img.width && img.height) {
    const ratio = (img.width / img.height).toFixed(2);
    dimInfo = ` | 尺寸: ${img.width}×${img.height} (宽高比${ratio})`;
  }
  const desc = img.description ? ` | ${img.description}` : '';
  return language === 'zh-CN'
    ? `- **${img.id}**: 来自PDF第${img.pageNumber}页${dimInfo}${desc}`
    : `- **${img.id}**: from PDF page ${img.pageNumber}${dimInfo}${desc}`;
}

/**
 * Format a short image placeholder for vision mode.
 * Only ID + page + dimensions + aspect ratio (no description), since the model can see the actual image.
 */
export function formatImagePlaceholder(img: PdfImage, language: string): string {
  let dimInfo = '';
  if (img.width && img.height) {
    const ratio = (img.width / img.height).toFixed(2);
    dimInfo = ` | 尺寸: ${img.width}×${img.height} (宽高比${ratio})`;
  }
  return language === 'zh-CN'
    ? `- **${img.id}**: PDF第${img.pageNumber}页的图片${dimInfo} [参见附图]`
    : `- **${img.id}**: image from PDF page ${img.pageNumber}${dimInfo} [see attached]`;
}

/**
 * Build a multimodal user content array for the AI SDK.
 * Interleaves text and images so the model can associate img_id with actual image.
 * Each image label includes dimensions when available so the model knows the size
 * before seeing the image (important for layout decisions).
 */
export function buildVisionUserContent(
  userPrompt: string,
  images: Array<{ id: string; src: string; width?: number; height?: number }>,
): Array<{ type: 'text'; text: string } | { type: 'image'; image: string; mimeType?: string }> {
  const parts: Array<
    { type: 'text'; text: string } | { type: 'image'; image: string; mimeType?: string }
  > = [{ type: 'text', text: userPrompt }];
  if (images.length > 0) {
    parts.push({ type: 'text', text: '\n\n--- Attached Images ---' });
    for (const img of images) {
      let dimInfo = '';
      if (img.width && img.height) {
        const ratio = (img.width / img.height).toFixed(2);
        dimInfo = ` (${img.width}×${img.height}, 宽高比${ratio})`;
      }
      parts.push({ type: 'text', text: `\n**${img.id}**${dimInfo}:` });
      // Strip data URI prefix — AI SDK only accepts http(s) URLs or raw base64
      const dataUriMatch = img.src.match(/^data:([^;]+);base64,(.+)$/);
      if (dataUriMatch) {
        parts.push({
          type: 'image',
          image: dataUriMatch[2],
          mimeType: dataUriMatch[1],
        });
      } else {
        parts.push({ type: 'image', image: img.src });
      }
    }
  }
  return parts;
}
