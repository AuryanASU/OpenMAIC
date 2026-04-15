// Stage and Scene data types
import type { Slide } from '@/lib/types/slides';
import type { Action } from '@/lib/types/action';
import type { PBLProjectConfig } from '@/lib/pbl/types';

export type SceneType = 'slide' | 'quiz' | 'interactive' | 'pbl' | 'assignment';

export type StageMode = 'autonomous' | 'playback';

export type Whiteboard = Omit<Slide, 'theme' | 'turningMode' | 'sectionTag' | 'type'>;

/**
 * Stage - Represents the entire classroom/course
 */
export interface Stage {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  // Stage metadata
  language?: string;
  style?: string;
  // Whiteboard data
  whiteboard?: Whiteboard[];
  // Agent IDs selected when this classroom was created
  agentIds?: string[];
  /**
   * Server-generated agent configurations.
   * Embedded in persisted classroom JSON so clients can hydrate
   * the agent registry without relying on IndexedDB pre-population.
   * Only present for API-generated classrooms.
   */
  generatedAgentConfigs?: Array<{
    id: string;
    name: string;
    role: string;
    persona: string;
    avatar: string;
    color: string;
    priority: number;
  }>;
}

/**
 * Scene - Represents a single page/scene in the course
 */
export interface Scene {
  id: string;
  stageId: string; // ID of the parent stage (for data integrity checks)
  type: SceneType;
  title: string;
  order: number; // Display order

  // Type-specific content
  content: SceneContent;

  // Actions to execute during playback
  actions?: Action[];

  // Whiteboards to explain deeply
  whiteboards?: Slide[];

  // Multi-agent discussion configuration
  multiAgent?: {
    enabled: boolean; // Enable multi-agent for this scene
    agentIds: string[]; // Which agents to include (from registry)
    directorPrompt?: string; // Optional custom director instructions
  };

  // Module context (when generated from a syllabus)
  moduleId?: string; // ID of the parent CourseModule
  moduleTitle?: string; // e.g., "Module 3: Data Structures"
  moduleIndex?: number; // 0-based index into syllabus.modules[]

  // Metadata
  createdAt?: number;
  updatedAt?: number;
}

/**
 * Scene content based on type
 */
export type SceneContent =
  | SlideContent
  | QuizContent
  | InteractiveContent
  | PBLContent
  | AssignmentContent;

/**
 * Slide content - PPTist Canvas data
 */
export interface SlideContent {
  type: 'slide';
  // PPTist slide data structure
  canvas: Slide;
}

/**
 * Quiz content - React component props/data
 */
export interface QuizContent {
  type: 'quiz';
  questions: QuizQuestion[];
}

export interface QuizOption {
  label: string; // Display text
  value: string; // Selection key: "A", "B", "C", "D"
}

export interface QuizQuestion {
  id: string;
  type: 'single' | 'multiple' | 'short_answer';
  question: string;
  options?: QuizOption[];
  answer?: string[]; // Correct answer values: ["A"], ["A","C"], or undefined for text
  analysis?: string; // Explanation shown after grading
  commentPrompt?: string; // Grading guidance for text questions
  hasAnswer?: boolean; // Whether auto-grading is possible
  points?: number; // Points per question (default 1)
}

/**
 * Interactive content - Interactive web page (iframe)
 */
export interface InteractiveContent {
  type: 'interactive';
  url: string; // URL of the interactive page
  // Optional: embedded HTML content
  html?: string;
}

/**
 * PBL content - Project-based learning
 */
export interface PBLContent {
  type: 'pbl';
  projectConfig: PBLProjectConfig;
}

/**
 * Assignment content - Written assignments with rubric-based grading
 */
export interface AssignmentContent {
  type: 'assignment';
  title: string;
  instructions: string; // Rich text assignment prompt
  rubric: Rubric; // Structured rubric for grading
  submissionGuidelines?: string; // Format, length, etc.
  dueDescription?: string; // e.g., "End of Module 4"
  gradingMode: 'ai' | 'self' | 'rubric-only'; // How grading works
  aiGradingPrompt?: string; // Detailed prompt for AI-assisted grading
}

/**
 * Rubric for structured assessment grading
 */
export interface Rubric {
  id: string;
  title: string;
  totalPoints: number;
  criteria: RubricCriterion[];
}

export interface RubricCriterion {
  id: string;
  name: string; // e.g., "Argument Quality"
  description: string; // What this criterion evaluates
  weight: number; // Percentage weight (all criteria sum to 100)
  levels: RubricLevel[]; // Performance levels, ordered best to worst
}

export interface RubricLevel {
  label: string; // e.g., "Excellent", "Proficient", "Developing", "Beginning"
  points: number; // Points for this level
  description: string; // What performance at this level looks like
}

// Re-export generation types for convenience
export type {
  UserRequirements,
  SceneOutline,
  GenerationSession,
  GenerationProgress,
  UploadedDocument,
} from './generation';
