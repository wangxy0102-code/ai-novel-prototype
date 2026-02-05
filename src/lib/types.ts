// TypeScript type definitions for the story system

export interface WorldRule {
  id: string;
  description: string;
  category: 'physics' | 'spiritual' | 'social' | 'supernatural';
}

export interface ProtagonistStatus {
  name: string;
  age: number;
  occupation: string;
  alive: boolean;
  power: string[];
  relationships: Record<string, string>;
}

export interface DynamicElements {
  villainProgress: string;
  neutralForces: string[];
  naturalEvents: string[];
}

export interface WorldState {
  rules: string[];
  currentChapter: number;
  protagonistStatus: ProtagonistStatus;
  mainPlotStatus: 'active' | 'broken' | 'completed';
  dynamicElements: DynamicElements;
  timeline: ChapterEvent[];
}

export interface ChapterEvent {
  chapter: number;
  event: string;
  impactedElements: string[];
}

export interface Chapter {
  id: number;
  title: string;
  content: string;
  generatedBy: 'original' | 'ai';
  userSuggestion?: string;
  worldStateSnapshot: WorldState;
  metadata: {
    createdAt: Date;
    impactedElements: string[];
    tags: string[];
  };
}

export interface StoryArchive {
  id: string;
  storyTitle?: string;
  storyComment?: string;
  createdAt: Date;
  chapters: Chapter[];
  modificationHistory: {
    chapterNum: number;
    suggestion: string;
    timestamp: Date;
  }[];
  endings: {
    original: string;
    current?: string;
  };
}

export interface AIGenerationRequest {
  worldState: WorldState;
  previousChapter: Chapter;
  userSuggestion: string;
  provider?: 'openai' | 'anthropic';
  isTestMode?: boolean;
}

export interface AIGenerationResponse {
  chapterTitle: string;
  content: string;
  worldStateChanges: string;
  tags: string[];
  rawGeneratedText?: string;
}
