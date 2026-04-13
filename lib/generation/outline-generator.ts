/**
 * Stage 1: Generate scene outlines from user requirements.
 * Also contains outline fallback logic.
 */

import { nanoid } from 'nanoid';
import { MAX_PDF_CONTENT_CHARS, MAX_VISION_IMAGES } from '@/lib/constants/generation';
import type {
  UserRequirements,
  SceneOutline,
  PdfImage,
  ImageMapping,
} from '@/lib/types/generation';
import type { CourseSyllabus } from '@/lib/types/syllabus';
import { buildPrompt, PROMPT_IDS } from './prompts';
import { formatImageDescription, formatImagePlaceholder } from './prompt-formatters';
import { parseJsonResponse } from './json-repair';
import { uniquifyMediaElementIds } from './scene-builder';
import type { AICallFn, GenerationResult, GenerationCallbacks } from './pipeline-types';
import { createLogger } from '@/lib/logger';
const log = createLogger('Generation');

// ── Syllabus helpers ─────────────────────────────────────────────────────

/**
 * Map a syllabus module's declared sceneTypes to an appropriate SceneOutline type.
 * Falls back to 'slide' when no types are declared.
 */
function pickSceneType(
  sceneTypes: CourseSyllabus['modules'][number]['sceneTypes'],
): SceneOutline['type'] {
  if (!sceneTypes || sceneTypes.length === 0) return 'slide';
  // Prefer interactive and pbl over plain slide; quiz is always honoured
  const priority: SceneOutline['type'][] = ['pbl', 'interactive', 'quiz', 'slide'];
  for (const p of priority) {
    if (sceneTypes.includes(p)) return p;
  }
  return 'slide';
}

/**
 * Convert a CourseSyllabus directly into SceneOutline[] without an extra AI call.
 *
 * Each module becomes one or more scenes depending on module complexity.
 * The caller may still pass these through the normal scene-generation stage.
 */
export function syllabusToOutlines(
  syllabus: CourseSyllabus,
  language: 'zh-CN' | 'en-US',
): SceneOutline[] {
  const outlines: SceneOutline[] = [];

  // Opening slide — course introduction
  outlines.push({
    id: nanoid(),
    type: 'slide',
    title: syllabus.title,
    description: `Course introduction: ${syllabus.description.substring(0, 300)}`,
    keyPoints: syllabus.learningOutcomes.slice(0, 5),
    order: 1,
    language,
  });

  // One outline per module
  for (const mod of syllabus.modules) {
    const type = pickSceneType(mod.sceneTypes);
    const outline: SceneOutline = {
      id: nanoid(),
      type,
      title: mod.title,
      description: mod.description || `Cover key topics in ${mod.title}`,
      keyPoints: [...mod.topics.slice(0, 5), ...mod.learningObjectives.slice(0, 3)].slice(0, 6),
      teachingObjective: mod.learningObjectives[0],
      order: outlines.length + 1,
      language,
    };

    // Attach type-specific configs
    if (type === 'quiz') {
      outline.quizConfig = {
        questionCount: Math.min(5, Math.max(3, mod.topics.length)),
        difficulty: 'medium',
        questionTypes: ['single', 'multiple'],
      };
    } else if (type === 'interactive') {
      outline.interactiveConfig = {
        conceptName: mod.topics[0] ?? mod.title,
        conceptOverview: mod.description,
        designIdea: `Interactive visualization of ${mod.topics.slice(0, 2).join(' and ')}`,
        subject: syllabus.title,
      };
    } else if (type === 'pbl') {
      outline.pblConfig = {
        projectTopic: mod.title,
        projectDescription: mod.description,
        targetSkills: mod.learningObjectives.slice(0, 4),
        issueCount: 3,
        language,
      };
    }

    outlines.push(outline);
  }

  // Closing slide — summary & next steps
  outlines.push({
    id: nanoid(),
    type: 'slide',
    title: 'Course Summary & Next Steps',
    description:
      'Recap key takeaways, review learning outcomes achieved, and outline further learning paths.',
    keyPoints: syllabus.learningOutcomes.slice(0, 4),
    order: outlines.length + 1,
    language,
  });

  return outlines;
}

/**
 * Generate scene outlines from user requirements.
 * When a CourseSyllabus is provided, it is used as the primary structure source,
 * producing better-aligned outlines without an extra AI planning call.
 */
export async function generateSceneOutlinesFromRequirements(
  requirements: UserRequirements,
  pdfText: string | undefined,
  pdfImages: PdfImage[] | undefined,
  aiCall: AICallFn,
  callbacks?: GenerationCallbacks,
  options?: {
    visionEnabled?: boolean;
    imageMapping?: ImageMapping;
    imageGenerationEnabled?: boolean;
    videoGenerationEnabled?: boolean;
    researchContext?: string;
    teacherContext?: string;
    /** When provided, outlines are derived from the syllabus structure */
    syllabus?: CourseSyllabus;
  },
): Promise<GenerationResult<SceneOutline[]>> {
  // ── Fast path: derive outlines directly from syllabus ──────────────────
  if (options?.syllabus) {
    log.info(`[outline-generator] Using syllabus "${options.syllabus.title}" as outline source`);
    try {
      callbacks?.onProgress?.({
        currentStage: 1,
        overallProgress: 20,
        stageProgress: 50,
        statusMessage: 'Mapping syllabus modules to scene outlines…',
        scenesGenerated: 0,
        totalScenes: 0,
      });

      const outlines = syllabusToOutlines(options.syllabus, requirements.language);
      const enriched = uniquifyMediaElementIds(outlines);

      callbacks?.onProgress?.({
        currentStage: 1,
        overallProgress: 50,
        stageProgress: 100,
        statusMessage: `Generated ${enriched.length} outlines from syllabus`,
        scenesGenerated: 0,
        totalScenes: enriched.length,
      });

      return { success: true, data: enriched };
    } catch (err) {
      log.warn(
        '[outline-generator] Syllabus-to-outlines failed, falling back to AI generation:',
        err,
      );
      // Fall through to AI generation below
    }
  }
  // Build available images description for the prompt
  let availableImagesText =
    requirements.language === 'zh-CN' ? '无可用图片' : 'No images available';
  let visionImages: Array<{ id: string; src: string }> | undefined;

  if (pdfImages && pdfImages.length > 0) {
    if (options?.visionEnabled && options?.imageMapping) {
      // Vision mode: split into vision images (first N) and text-only (rest)
      const allWithSrc = pdfImages.filter((img) => options.imageMapping![img.id]);
      const visionSlice = allWithSrc.slice(0, MAX_VISION_IMAGES);
      const textOnlySlice = allWithSrc.slice(MAX_VISION_IMAGES);
      const noSrcImages = pdfImages.filter((img) => !options.imageMapping![img.id]);

      const visionDescriptions = visionSlice.map((img) =>
        formatImagePlaceholder(img, requirements.language),
      );
      const textDescriptions = [...textOnlySlice, ...noSrcImages].map((img) =>
        formatImageDescription(img, requirements.language),
      );
      availableImagesText = [...visionDescriptions, ...textDescriptions].join('\n');

      visionImages = visionSlice.map((img) => ({
        id: img.id,
        src: options.imageMapping![img.id],
        width: img.width,
        height: img.height,
      }));
    } else {
      // Text-only mode: full descriptions
      availableImagesText = pdfImages
        .map((img) => formatImageDescription(img, requirements.language))
        .join('\n');
    }
  }

  // Build user profile string for prompt injection
  const userProfileText =
    requirements.userNickname || requirements.userBio
      ? `## Student Profile\n\nStudent: ${requirements.userNickname || 'Unknown'}${requirements.userBio ? ` — ${requirements.userBio}` : ''}\n\nConsider this student's background when designing the course. Adapt difficulty, examples, and teaching approach accordingly.\n\n---`
      : '';

  // Build media generation policy based on enabled flags
  const imageEnabled = options?.imageGenerationEnabled ?? false;
  const videoEnabled = options?.videoGenerationEnabled ?? false;
  let mediaGenerationPolicy = '';
  if (!imageEnabled && !videoEnabled) {
    mediaGenerationPolicy =
      '**IMPORTANT: Do NOT include any mediaGenerations in the outlines. Both image and video generation are disabled.**';
  } else if (!imageEnabled) {
    mediaGenerationPolicy =
      '**IMPORTANT: Do NOT include any image mediaGenerations (type: "image") in the outlines. Image generation is disabled. Video generation is allowed.**';
  } else if (!videoEnabled) {
    mediaGenerationPolicy =
      '**IMPORTANT: Do NOT include any video mediaGenerations (type: "video") in the outlines. Video generation is disabled. Image generation is allowed.**';
  }

  // When a syllabus is provided but the fast path failed, inject it as structured context
  const syllabusContext = options?.syllabus
    ? `\n\n## Structured Course Syllabus\n\nTitle: ${options.syllabus.title}\nModules:\n${options.syllabus.modules
        .map((m) => `- ${m.title}: ${m.topics.join(', ')}`)
        .join('\n')}\n\nPlease align scene outlines with this module structure.`
    : '';

  // Use simplified prompt variables
  const prompts = buildPrompt(PROMPT_IDS.REQUIREMENTS_TO_OUTLINES, {
    // New simplified variables
    requirement: requirements.requirement + syllabusContext,
    language: requirements.language,
    pdfContent: pdfText
      ? pdfText.substring(0, MAX_PDF_CONTENT_CHARS)
      : requirements.language === 'zh-CN'
        ? '无'
        : 'None',
    availableImages: availableImagesText,
    userProfile: userProfileText,
    mediaGenerationPolicy,
    researchContext:
      options?.researchContext || (requirements.language === 'zh-CN' ? '无' : 'None'),
    // Server-side generation populates this via options; client-side populates via formatTeacherPersonaForPrompt
    teacherContext: options?.teacherContext || '',
  });

  if (!prompts) {
    return { success: false, error: 'Prompt template not found' };
  }

  try {
    callbacks?.onProgress?.({
      currentStage: 1,
      overallProgress: 20,
      stageProgress: 50,
      statusMessage: '正在分析需求，生成场景大纲...',
      scenesGenerated: 0,
      totalScenes: 0,
    });

    const response = await aiCall(prompts.system, prompts.user, visionImages);
    const outlines = parseJsonResponse<SceneOutline[]>(response);

    if (!outlines || !Array.isArray(outlines)) {
      return {
        success: false,
        error: 'Failed to parse scene outlines response',
      };
    }
    // Ensure IDs, order, and language
    const enriched = outlines.map((outline, index) => ({
      ...outline,
      id: outline.id || nanoid(),
      order: index + 1,
      language: requirements.language,
    }));

    // Replace sequential gen_img_N/gen_vid_N with globally unique IDs
    const result = uniquifyMediaElementIds(enriched);

    callbacks?.onProgress?.({
      currentStage: 1,
      overallProgress: 50,
      stageProgress: 100,
      statusMessage: `已生成 ${result.length} 个场景大纲`,
      scenesGenerated: 0,
      totalScenes: result.length,
    });

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Apply type fallbacks for outlines that can't be generated as their declared type.
 * - interactive without interactiveConfig → slide
 * - pbl without pblConfig or languageModel → slide
 */
export function applyOutlineFallbacks(
  outline: SceneOutline,
  hasLanguageModel: boolean,
): SceneOutline {
  if (outline.type === 'interactive' && !outline.interactiveConfig) {
    log.warn(
      `Interactive outline "${outline.title}" missing interactiveConfig, falling back to slide`,
    );
    return { ...outline, type: 'slide' };
  }
  if (outline.type === 'pbl' && (!outline.pblConfig || !hasLanguageModel)) {
    log.warn(
      `PBL outline "${outline.title}" missing pblConfig or languageModel, falling back to slide`,
    );
    return { ...outline, type: 'slide' };
  }
  return outline;
}
