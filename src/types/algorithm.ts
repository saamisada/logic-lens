export type TabId = 'visualize' | 'library' | 'quiz' | 'analytics';

export type DeviceProfile = 'mobile' | 'tablet' | 'desktop';

export type LayoutModeOverride = 'auto' | 'mobile' | 'tablet' | 'desktop';

export interface DeviceLayoutState {
  width: number;
  height: number;
  aspectRatio: number;
  detectedProfile: DeviceProfile;
  effectiveProfile: DeviceProfile;
  override: LayoutModeOverride;
  ratioLabel: string;
}

export type ProgramLanguage = 'Python' | 'C';

export interface MemoryVariable {
  name: string;
  value: string;
  type: string;
  updated?: boolean;
}

export interface ArrayPointer {
  name: string;
  index: number;
}

export interface ExecutionStep {
  stepNumber: number;
  lineNumber: number; // 1-indexed line in user source code
  note: string;
  deepExplanation: string;
  arrayState: number[];
  arrayLabel: string;
  pointers: ArrayPointer[];
  comparedIndices?: number[];
  swappedIndices?: number[];
  variables: MemoryVariable[];
  stdout: string[];
  auxiliaryPairs?: { key: string; value: number; updated?: boolean }[];
  auxiliaryLabel?: string;
}

export interface FunctionParamSpec {
  name: string;
  kind: 'array' | 'number' | 'string';
  defaultValue: string;
}

export interface TraceMetrics {
  totalSteps: number;
  maxLoopDepth: number;
  comparisons: number;
  writes: number;
  estimatedComplexity: string;
  detectedEntry: string;
}

export interface TraceResult {
  ok: boolean;
  error?: string;
  errorLine?: number;
  codeLines: string[];
  steps: ExecutionStep[];
  detectedParams: FunctionParamSpec[];
  metrics: TraceMetrics;
  truncated?: boolean;
}

export interface ConceptCard {
  id: string;
  title: string;
  category: string;
  readTime: string;
  summary: string;
  details: string[];
  snippetLanguage: ProgramLanguage;
  snippet: string;
  takeaway: string;
  targetStepIndex: number;
}

export interface QuizQuestion {
  id: string;
  topic: string;
  language: ProgramLanguage;
  prompt: string;
  code: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  targetStepIndex: number;
}

export interface LineExecutionStat {
  lineNumber: number;
  code: string;
  hits: number;
}

export interface VariableMutationStat {
  name: string;
  type: string;
  mutations: number;
  finalValue: string;
}

export interface ProgramAnalysis {
  concepts: ConceptCard[];
  quizzes: QuizQuestion[];
  lineStats: LineExecutionStat[];
  variableStats: VariableMutationStat[];
  nonEmptyLines: number;
  hottestLine: number;
}

export interface StudentAnalytics {
  stepsExecuted: number;
  tracesRun: number;
  pythonTraces: number;
  cTraces: number;
  answeredQuizMap: Record<string, number>;
  bookmarkedConceptIds: string[];
}
