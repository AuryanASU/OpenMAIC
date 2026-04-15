/**
 * Stage 1: Generate scene outlines from user requirements.
 * Also contains outline fallback logic and module expansion.
 */

import { nanoid } from 'nanoid';
import { MAX_PDF_CONTENT_CHARS, MAX_VISION_IMAGES } from '@/lib/constants/generation';
import type {
  UserRequirements,
  SceneOutline,
  PdfImage,
  ImageMapping,
} from '@/lib/types/generation';
import type { CourseSyllabus, CourseModule } from '@/lib/types/syllabus';
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

// ── Module difficulty helper ─────────────────────────────────────────────

/**
 * Determine quiz difficulty based on the module's position in the course.
 * First 25% → easy, middle 50% → medium, final 25% → hard.
 */
function getModuleDifficulty(
  moduleIndex: number,
  totalModules: number,
): 'easy' | 'medium' | 'hard' {
  if (totalModules <= 1) return 'medium';
  const position = moduleIndex / (totalModules - 1); // 0..1
  if (position < 0.25) return 'easy';
  if (position >= 0.75) return 'hard';
  return 'medium';
}

// ── Deterministic module expansion ───────────────────────────────────────

/**
 * Expand a single module into 2-4 SceneOutline objects deterministically.
 *
 * Rules:
 * - Always: 1 lecture slide
 * - If 2+ topics: 1 practice quiz
 * - If 3+ topics or sceneTypes includes interactive/pbl/assignment: 1 activity scene
 * - If 4+ topics: 1 module summary slide
 */
function expandModuleDeterministic(
  module: CourseModule,
  moduleIndex: number,
  totalModules: number,
  language: 'zh-CN' | 'en-US',
): SceneOutline[] {
  const outlines: SceneOutline[] = [];
  const difficulty = getModuleDifficulty(moduleIndex, totalModules);

  // 1. Lecture slide (always)
  outlines.push({
    id: nanoid(),
    type: 'slide',
    title: module.title,
    description: module.description || `Cover key topics in ${module.title}`,
    keyPoints: [...module.topics.slice(0, 5), ...module.learningObjectives.slice(0, 3)].slice(0, 6),
    teachingObjective: module.learningObjectives[0],
    order: 0, // Placeholder — caller assigns final order
    language,
    moduleId: module.id,
    moduleTitle: module.title,
    moduleIndex,
  });

  // 2. Practice quiz (if 2+ topics)
  if (module.topics.length >= 2) {
    outlines.push({
      id: nanoid(),
      type: 'quiz',
      title:
        language === 'zh-CN' ? `${module.title} - 知识检测` : `${module.title} - Knowledge Check`,
      description:
        language === 'zh-CN'
          ? `检验对${module.title}核心概念的理解`
          : `Test understanding of core concepts in ${module.title}`,
      keyPoints: module.topics.slice(0, 4),
      order: 0,
      language,
      moduleId: module.id,
      moduleTitle: module.title,
      moduleIndex,
      quizConfig: {
        questionCount: Math.min(5, Math.max(3, module.topics.length)),
        difficulty,
        questionTypes: ['single', 'multiple'],
      },
    });
  }

  // 3. Activity scene (if 3+ topics or sceneTypes includes interactive/pbl/assignment)
  const hasActivityType = module.sceneTypes?.some((t) =>
    ['interactive', 'pbl', 'assignment'].includes(t),
  );
  if (module.topics.length >= 3 || hasActivityType) {
    const activityType = pickSceneType(
      module.sceneTypes?.filter((t) => ['interactive', 'pbl', 'assignment'].includes(t)),
    );

    const activity: SceneOutline = {
      id: nanoid(),
      type: activityType,
      title:
        language === 'zh-CN' ? `${module.title} - 实践活动` : `${module.title} - Practice Activity`,
      description:
        language === 'zh-CN'
          ? `通过实践活动加深对${module.title}的理解`
          : `Deepen understanding of ${module.title} through hands-on practice`,
      keyPoints: module.topics.slice(0, 4),
      order: 0,
      language,
      moduleId: module.id,
      moduleTitle: module.title,
      moduleIndex,
    };

    // Attach type-specific configs
    if (activityType === 'interactive') {
      activity.interactiveConfig = {
        conceptName: module.topics[0] ?? module.title,
        conceptOverview: module.description,
        designIdea: `Interactive visualization of ${module.topics.slice(0, 2).join(' and ')}`,
        subject: module.title,
      };
    } else if (activityType === 'pbl') {
      activity.pblConfig = {
        projectTopic: module.title,
        projectDescription: module.description,
        targetSkills: module.learningObjectives.slice(0, 4),
        issueCount: 3,
        language,
      };
    } else if (activityType === 'assignment') {
      activity.assignmentConfig = {
        assignmentType: 'reflection',
        estimatedLength: 'medium',
        rubricFocus: module.learningObjectives.slice(0, 3),
      };
    }

    outlines.push(activity);
  }

  // 4. Module summary slide (if 4+ topics)
  if (module.topics.length >= 4) {
    outlines.push({
      id: nanoid(),
      type: 'slide',
      title: language === 'zh-CN' ? `${module.title} - 总结` : `${module.title} - Summary`,
      description:
        language === 'zh-CN'
          ? `回顾${module.title}的关键要点`
          : `Recap the key takeaways from ${module.title}`,
      keyPoints: module.learningObjectives.slice(0, 4),
      order: 0,
      language,
      moduleId: module.id,
      moduleTitle: module.title,
      moduleIndex,
    });
  }

  return outlines;
}

// ── AI-powered module expansion ──────────────────────────────────────────

/**
 * Expand a single module into 3-5 SceneOutline objects via an AI call.
 * Falls back to `expandModuleDeterministic()` on failure.
 */
async function expandModuleWithAI(
  module: CourseModule,
  moduleIndex: number,
  syllabus: CourseSyllabus,
  language: 'zh-CN' | 'en-US',
  aiCall: AICallFn,
): Promise<SceneOutline[]> {
  const totalModules = syllabus.modules.length;
  const difficulty = getModuleDifficulty(moduleIndex, totalModules);

  // Format topics list
  const moduleTopics =
    module.topics.length > 0
      ? module.topics.map((t, i) => `${i + 1}. ${t}`).join('\n')
      : 'No specific topics listed';

  // Format objectives list
  const moduleObjectives =
    module.learningObjectives.length > 0
      ? module.learningObjectives.map((o, i) => `${i + 1}. ${o}`).join('\n')
      : 'No specific objectives listed';

  // Format scene types
  const moduleSceneTypes = module.sceneTypes?.length ? module.sceneTypes.join(', ') : 'slide, quiz';

  // Build course module outline (with current module marked)
  const courseModuleOutline = syllabus.modules
    .map((m, i) => {
      const marker = i === moduleIndex ? ' <<<< CURRENT MODULE' : '';
      const topics = m.topics.slice(0, 5).join(', ');
      return `Module ${i + 1}: ${m.title}${marker}\n  Topics: ${topics}`;
    })
    .join('\n');

  // Format assessment strategy
  const assessmentStrategy = syllabus.assessmentStrategy?.components?.length
    ? syllabus.assessmentStrategy.components
        .map((c) => `- ${c.name} (${c.weight}%): ${c.description}`)
        .join('\n')
    : 'No assessment strategy provided';

  const modulePosition = `Module ${moduleIndex + 1} of ${totalModules}`;

  try {
    const prompts = buildPrompt(PROMPT_IDS.MODULE_TO_OUTLINES, {
      moduleTitle: module.title,
      moduleDescription: module.description || `Cover key topics in ${module.title}`,
      moduleTopics,
      moduleObjectives,
      moduleSceneTypes,
      courseTitle: syllabus.title,
      courseModuleOutline,
      assessmentStrategy,
      modulePosition,
      difficulty,
      language,
    });

    if (!prompts) {
      log.warn(
        '[outline-generator] Module-to-outlines prompt template not found, using deterministic fallback',
      );
      return expandModuleDeterministic(module, moduleIndex, totalModules, language);
    }

    const response = await aiCall(prompts.system, prompts.user);
    const parsed = parseJsonResponse<SceneOutline[]>(response);

    if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
      log.warn(
        `[outline-generator] Failed to parse AI response for module "${module.title}", using deterministic fallback`,
      );
      return expandModuleDeterministic(module, moduleIndex, totalModules, language);
    }

    // Inject module context and generate unique IDs
    const enriched = parsed.map((outline) => ({
      ...outline,
      id: nanoid(),
      language,
      moduleId: module.id,
      moduleTitle: module.title,
      moduleIndex,
      order: 0, // Placeholder — caller assigns final order
    }));

    log.info(
      `[outline-generator] AI expanded module "${module.title}" into ${enriched.length} scenes`,
    );
    return enriched;
  } catch (err) {
    log.warn(
      `[outline-generator] AI expansion failed for module "${module.title}", using deterministic fallback:`,
      err,
    );
    return expandModuleDeterministic(module, moduleIndex, totalModules, language);
  }
}

// ── Syllabus-to-outlines (deterministic) ─────────────────────────────────

/**
 * Convert a CourseSyllabus directly into SceneOutline[] without an extra AI call.
 *
 * Each module is expanded into multiple scenes using `expandModuleDeterministic()`.
 * The caller may still pass these through the normal scene-generation stage.
 */
export function syllabusToOutlines(
  syllabus: CourseSyllabus,
  language: 'zh-CN' | 'en-US',
): SceneOutline[] {
  const outlines: SceneOutline[] = [];
  const totalModules = syllabus.modules.length;

  // Opening slide — course introduction
  outlines.push({
    id: nanoid(),
    type: 'slide',
    title: syllabus.title,
    description: `Course introduction: ${syllabus.description.substring(0, 300)}`,
    keyPoints: syllabus.learningOutcomes.slice(0, 5),
    order: 1,
    language,
    moduleId: '__course_intro__',
    moduleTitle: syllabus.title,
    moduleIndex: -1,
  });

  // Expand each module into multiple scenes
  for (let i = 0; i < syllabus.modules.length; i++) {
    const mod = syllabus.modules[i];
    const moduleOutlines = expandModuleDeterministic(mod, i, totalModules, language);

    // Assign sequential order numbers
    for (const outline of moduleOutlines) {
      outline.order = outlines.length + 1;
      outlines.push(outline);
    }
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
    moduleId: '__course_summary__',
    moduleTitle: 'Course Summary & Next Steps',
    moduleIndex: syllabus.modules.length,
  });

  return outlines;
}

// ── Syllabus-to-outlines (AI-powered) ────────────────────────────────────

/**
 * Convert a CourseSyllabus into SceneOutline[] using AI to expand each module.
 *
 * Each module is expanded sequentially so the AI can consider the full course
 * context. Falls back to deterministic expansion per-module on failure.
 */
export async function syllabusToOutlinesWithAI(
  syllabus: CourseSyllabus,
  language: 'zh-CN' | 'en-US',
  aiCall: AICallFn,
): Promise<SceneOutline[]> {
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
    moduleId: '__course_intro__',
    moduleTitle: syllabus.title,
    moduleIndex: -1,
  });

  // Expand each module sequentially with AI
  for (let i = 0; i < syllabus.modules.length; i++) {
    const mod = syllabus.modules[i];
    log.info(
      `[outline-generator] Expanding module ${i + 1}/${syllabus.modules.length}: "${mod.title}"`,
    );

    const moduleOutlines = await expandModuleWithAI(mod, i, syllabus, language, aiCall);

    // Assign sequential order numbers
    for (const outline of moduleOutlines) {
      outline.order = outlines.length + 1;
      outlines.push(outline);
    }
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
    moduleId: '__course_summary__',
    moduleTitle: 'Course Summary & Next Steps',
    moduleIndex: syllabus.modules.length,
  });

  // Uniquify media element IDs across the entire outline list
  const result = uniquifyMediaElementIds(outlines);

  return result;
}

// ── Main entry point ─────────────────────────────────────────────────────

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
    /** How to expand syllabus modules: 'ai' uses LLM per module, 'deterministic' uses rules */
    expansionMode?: 'ai' | 'deterministic';
  },
): Promise<GenerationResult<SceneOutline[]>> {
  // ── Fast path: derive outlines directly from syllabus ──────────────────
  if (options?.syllabus) {
    log.info(
      `[outline-generator] Using syllabus "${options.syllabus.title}" as outline source (mode: ${options?.expansionMode ?? 'deterministic'})`,
    );
    try {
      callbacks?.onProgress?.({
        currentStage: 1,
        overallProgress: 20,
        stageProgress: 10,
        statusMessage:
          options?.expansionMode === 'ai'
            ? 'Expanding syllabus modules with AI...'
            : 'Mapping syllabus modules to scene outlines...',
        scenesGenerated: 0,
        totalScenes: 0,
      });

      let outlines: SceneOutline[];

      if (options?.expansionMode === 'ai') {
        outlines = await syllabusToOutlinesWithAI(options.syllabus, requirements.language, aiCall);
      } else {
        const rawOutlines = syllabusToOutlines(options.syllabus, requirements.language);
        outlines = uniquifyMediaElementIds(rawOutlines);
      }

      callbacks?.onProgress?.({
        currentStage: 1,
        overallProgress: 50,
        stageProgress: 100,
        statusMessage: `Generated ${outlines.length} outlines from syllabus`,
        scenesGenerated: 0,
        totalScenes: outlines.length,
      });

      return { success: true, data: outlines };
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
  if (outline.type === 'assignment' && !outline.assignmentConfig) {
    log.warn(
      `Assignment outline "${outline.title}" missing assignmentConfig, falling back to slide`,
    );
    return { ...outline, type: 'slide' };
  }
  return outline;
}
