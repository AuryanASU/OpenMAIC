/**
 * POST /api/generate-syllabus
 *
 * Streams an AI-generated CourseSyllabus as Server-Sent Events.
 *
 * Request body: GenerateSyllabusRequest
 * Response:    SSE stream — text deltas while generating, then a final
 *              "syllabus" event with the parsed JSON object.
 */

import { NextRequest } from 'next/server';
import { streamLLM } from '@/lib/ai/llm';
import { getPlatformModel } from '@/lib/server/platform-config';
import { apiError } from '@/lib/server/api-response';
import { createLogger } from '@/lib/logger';
import { nanoid } from 'nanoid';
import type { GenerateSyllabusRequest, CourseSyllabus } from '@/lib/types/syllabus';
import { jsonrepair } from 'jsonrepair';

const log = createLogger('GenerateSyllabus API');

export const maxDuration = 60;

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

function buildSyllabusPrompt(req: GenerateSyllabusRequest): { system: string; user: string } {
  const lang = req.language === 'zh-CN' ? 'Chinese (Simplified)' : 'English';
  const depth = req.depth ?? 'introductory';
  const duration = req.duration ?? '8 weeks';
  const audience = req.targetAudience ?? 'undergraduate students';

  const system = `You are an expert instructional designer at Arizona State University with deep knowledge of curriculum design, Bloom's taxonomy, and evidence-based pedagogy. You create rigorous, well-structured university course syllabi.

Your syllabi always:
- Use Bloom's taxonomy action verbs for learning outcomes and objectives (analyze, evaluate, synthesize, apply, demonstrate, compare, etc.)
- Build knowledge progressively across modules — foundational concepts before advanced applications
- Include diverse assessment strategies appropriate for the level
- Have clear alignment between outcomes, objectives, modules, and assessments
- Are specific to the topic, not generic templates

Return ONLY valid JSON matching the exact schema below. No markdown fences, no commentary.`;

  const user = `Design a complete university course syllabus for the following:

**Topic:** ${req.topic}
**Target audience:** ${audience}
**Duration:** ${duration}
**Depth/level:** ${depth}
**Language:** ${lang}

Return a JSON object with EXACTLY this structure:

{
  "title": "Full course title",
  "courseCode": "Optional — e.g. CIS 235 (omit if not applicable)",
  "credits": 3,
  "description": "2-3 paragraph course overview explaining what the course covers, why it matters, and how students will learn",
  "learningOutcomes": [
    "Students will be able to... (use Bloom's taxonomy verbs — 4-8 outcomes)"
  ],
  "learningObjectives": [
    "Specific, measurable objective 1",
    "Specific, measurable objective 2"
  ],
  "modules": [
    {
      "order": 1,
      "title": "Module 1: <descriptive title>",
      "description": "What this module covers and why it matters",
      "topics": ["Key topic 1", "Key topic 2", "Key topic 3"],
      "learningObjectives": ["By the end of this module, students will..."],
      "estimatedWeeks": 1,
      "sceneTypes": ["slide", "quiz"]
    }
  ],
  "assessmentStrategy": {
    "components": [
      { "name": "Participation & Quizzes", "weight": 20, "description": "In-class quizzes and participation" },
      { "name": "Assignments", "weight": 40, "description": "Weekly hands-on assignments" },
      { "name": "Final Project", "weight": 40, "description": "Capstone project demonstrating course mastery" }
    ]
  },
  "estimatedDuration": "${duration}",
  "targetAudience": "${audience}",
  "prerequisites": ["Any prerequisite course or skill (omit array if none)"]
}

Guidelines:
- sceneTypes for each module should reflect the best pedagogy: use "quiz" for knowledge-check modules, "interactive" for concept visualization, "pbl" for project/case-study modules, "slide" for lecture content
- Create enough modules to fill the duration (e.g., 8 modules for 8 weeks)
- Make the content genuinely specific to "${req.topic}" — no generic filler`;

  return { system, user };
}

// ---------------------------------------------------------------------------
// Strip code fences from LLM responses
// ---------------------------------------------------------------------------

function stripFences(text: string): string {
  const t = text.trim();
  if (t.startsWith('```')) {
    return t
      .replace(/^```(?:json)?\s*\n?/, '')
      .replace(/\n?```\s*$/, '')
      .trim();
  }
  return t;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateSyllabusRequest;

    if (!body.topic?.trim()) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'Missing required field: topic');
    }

    const { model } = await getPlatformModel();

    const { system, user } = buildSyllabusPrompt(body);

    // ── Stream the response ─────────────────────────────────────────────────
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        function send(event: string, data: string) {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
        }

        // Heartbeat to prevent proxy timeout (every 15 s)
        const heartbeat = setInterval(
          () => controller.enqueue(encoder.encode(': heartbeat\n\n')),
          15_000,
        );

        try {
          const result = streamLLM(
            {
              model,
              system,
              prompt: user,
              maxTokens: 4096,
            },
            'syllabus-gen',
          );

          let fullText = '';
          for await (const chunk of result.textStream) {
            fullText += chunk;
            send('delta', JSON.stringify({ text: chunk }));
          }

          // Parse the completed JSON
          const cleaned = stripFences(fullText);
          let syllabusData: Partial<CourseSyllabus>;
          try {
            syllabusData = JSON.parse(jsonrepair(cleaned)) as Partial<CourseSyllabus>;
          } catch {
            send('error', JSON.stringify({ error: 'Failed to parse syllabus JSON' }));
            controller.close();
            return;
          }

          // Enrich with metadata
          const now = new Date().toISOString();
          const syllabus: CourseSyllabus = {
            id: nanoid(),
            title: syllabusData.title ?? body.topic,
            courseCode: syllabusData.courseCode,
            credits: syllabusData.credits,
            description: syllabusData.description ?? '',
            learningOutcomes: syllabusData.learningOutcomes ?? [],
            learningObjectives: syllabusData.learningObjectives ?? [],
            modules: (syllabusData.modules ?? []).map((m, i) => ({
              id: nanoid(),
              order: m.order ?? i + 1,
              title: m.title ?? `Module ${i + 1}`,
              description: m.description ?? '',
              topics: m.topics ?? [],
              learningObjectives: m.learningObjectives ?? [],
              estimatedWeeks: m.estimatedWeeks,
              sceneTypes: m.sceneTypes,
            })),
            assessmentStrategy: syllabusData.assessmentStrategy,
            estimatedDuration: syllabusData.estimatedDuration ?? body.duration,
            targetAudience: syllabusData.targetAudience ?? body.targetAudience,
            prerequisites: syllabusData.prerequisites,
            metadata: {
              createdAt: now,
              updatedAt: now,
              source: 'generated',
            },
          };

          send('syllabus', JSON.stringify({ syllabus }));
          send('done', '{}');
        } catch (err) {
          log.error('Syllabus generation failed:', err);
          send(
            'error',
            JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
          );
        } finally {
          clearInterval(heartbeat);
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (err) {
    log.error('Failed to start syllabus generation:', err);
    return apiError(
      'INTERNAL_ERROR',
      500,
      'Failed to start syllabus generation',
      err instanceof Error ? err.message : 'Unknown error',
    );
  }
}
