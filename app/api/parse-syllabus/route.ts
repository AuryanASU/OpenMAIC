/**
 * POST /api/parse-syllabus
 *
 * Accepts a PDF upload, extracts text with unpdf, then uses AI to parse the
 * content into a structured CourseSyllabus object.
 *
 * Request:  multipart/form-data — fields: file (PDF), model?, apiKey?, baseUrl?
 * Response: { success: true, syllabus: CourseSyllabus }
 */

import { NextRequest } from 'next/server';
import { callLLM } from '@/lib/ai/llm';
import { getPlatformModel } from '@/lib/server/platform-config';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createLogger } from '@/lib/logger';
import { nanoid } from 'nanoid';
import type { CourseSyllabus } from '@/lib/types/syllabus';
import { jsonrepair } from 'jsonrepair';

const log = createLogger('ParseSyllabus API');

export const maxDuration = 60;

const MAX_PDF_CHARS = 40_000;

// ---------------------------------------------------------------------------
// PDF text extraction using unpdf (already in dependencies)
// ---------------------------------------------------------------------------

async function extractPdfText(buffer: Buffer): Promise<string> {
  const { getDocumentProxy, extractText } = await import('unpdf');
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return text ?? '';
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

function buildParsePrompt(pdfText: string): { system: string; user: string } {
  const system = `You are an expert instructional designer. Given raw text extracted from a course syllabus PDF, parse it into a structured JSON object. Extract as much information as possible. If a field is missing from the source, make a reasonable inference or omit optional fields. Return ONLY valid JSON, no markdown or commentary.`;

  const user = `Parse the following syllabus text into a structured JSON object.

SYLLABUS TEXT:
${pdfText.substring(0, MAX_PDF_CHARS)}

Return a JSON object with EXACTLY this structure (all fields optional unless noted):

{
  "title": "Course title (required)",
  "courseCode": "e.g. CIS 235",
  "credits": 3,
  "description": "Course description/overview (required — infer from course content if not explicit)",
  "learningOutcomes": ["Students will be able to... (required — extract or infer from objectives)"],
  "learningObjectives": ["Specific measurable objective..."],
  "modules": [
    {
      "order": 1,
      "title": "Module or Week title",
      "description": "What is covered",
      "topics": ["topic 1", "topic 2"],
      "learningObjectives": ["objective for this module"],
      "estimatedWeeks": 1,
      "sceneTypes": ["slide"]
    }
  ],
  "assessmentStrategy": {
    "components": [
      { "name": "Assignment type", "weight": 30, "description": "Description" }
    ]
  },
  "estimatedDuration": "e.g. 16 weeks",
  "targetAudience": "Who this course is for",
  "prerequisites": ["prerequisite 1"]
}

Important:
- If week-by-week schedule is present, convert each week/unit to a module
- If only topics are listed, group them into logical modules
- Infer sceneTypes: use "quiz" for assessment weeks, "interactive" for lab/hands-on content, "pbl" for projects, "slide" for lectures
- Weights in assessmentStrategy must sum to 100`;

  return { system, user };
}

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
    const contentType = req.headers.get('content-type') ?? '';
    if (!contentType.includes('multipart/form-data')) {
      return apiError('INVALID_REQUEST', 400, 'Expected multipart/form-data');
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const originalFileName = file?.name;

    if (!file) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'No file provided');
    }

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      return apiError('INVALID_REQUEST', 400, 'Only PDF files are supported');
    }

    // Resolve model
    const { model } = await getPlatformModel();

    // Extract PDF text
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let pdfText: string;
    try {
      pdfText = await extractPdfText(buffer);
    } catch (err) {
      log.error('PDF extraction failed:', err);
      return apiError('PARSE_FAILED', 422, 'Failed to extract text from PDF');
    }

    if (!pdfText.trim()) {
      return apiError('PARSE_FAILED', 422, 'PDF appears to contain no extractable text');
    }

    // Parse with AI
    const { system, user } = buildParsePrompt(pdfText);
    const result = await callLLM(
      { model, system, prompt: user, maxTokens: 4096 },
      'syllabus-parse',
      { retries: 1 },
    );

    const cleaned = stripFences(result.text);
    let syllabusData: Partial<CourseSyllabus>;
    try {
      syllabusData = JSON.parse(jsonrepair(cleaned)) as Partial<CourseSyllabus>;
    } catch (err) {
      log.error('Syllabus JSON parse failed:', err);
      return apiError('PARSE_FAILED', 422, 'AI returned invalid JSON for syllabus structure');
    }

    const now = new Date().toISOString();
    const syllabus: CourseSyllabus = {
      id: nanoid(),
      title: syllabusData.title ?? originalFileName?.replace(/\.pdf$/i, '') ?? 'Uploaded Syllabus',
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
      estimatedDuration: syllabusData.estimatedDuration,
      targetAudience: syllabusData.targetAudience,
      prerequisites: syllabusData.prerequisites,
      metadata: {
        createdAt: now,
        updatedAt: now,
        source: 'uploaded',
        originalFileName,
      },
    };

    return apiSuccess({ syllabus });
  } catch (err) {
    log.error('Syllabus parse route failed:', err);
    return apiError(
      'INTERNAL_ERROR',
      500,
      'Failed to parse syllabus',
      err instanceof Error ? err.message : 'Unknown error',
    );
  }
}
