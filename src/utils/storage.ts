import type {
  LayoutModeOverride,
  ProgramLanguage,
  StudentAnalytics,
} from '@/src/types/algorithm';

const ANALYTICS_KEY = 'logiclens_student_analytics_v3';
const LAYOUT_OVERRIDE_KEY = 'logiclens_layout_override_v1';
const USER_GEMINI_KEY = 'logiclens_user_gemini_key';

// Pure deterministic default state (safe for SSR hydration)
export function createDefaultAnalytics(): StudentAnalytics {
  return {
    stepsExecuted: 0,
    tracesRun: 0,
    pythonTraces: 0,
    cTraces: 0,
    answeredQuizMap: {},
    bookmarkedConceptIds: [],
  };
}

export function loadAnalytics(): StudentAnalytics {
  if (typeof window === 'undefined') {
    return createDefaultAnalytics();
  }
  try {
    const raw = window.localStorage.getItem(ANALYTICS_KEY);
    if (!raw) {
      const initial = createDefaultAnalytics();
      saveAnalytics(initial);
      return initial;
    }
    const parsed = JSON.parse(raw) as Partial<StudentAnalytics>;
    const defaults = createDefaultAnalytics();
    return {
      ...defaults,
      ...parsed,
      answeredQuizMap:
        parsed.answeredQuizMap && typeof parsed.answeredQuizMap === 'object'
          ? parsed.answeredQuizMap
          : {},
      bookmarkedConceptIds: Array.isArray(parsed.bookmarkedConceptIds)
        ? parsed.bookmarkedConceptIds
        : [],
    };
  } catch {
    return createDefaultAnalytics();
  }
}

export function saveAnalytics(analytics: StudentAnalytics): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ANALYTICS_KEY, JSON.stringify(analytics));
  } catch {
    // Ignore storage quota errors
  }
}

export function recordTraceExecution(
  current: StudentAnalytics,
  language: ProgramLanguage
): StudentAnalytics {
  const next: StudentAnalytics = {
    ...current,
    tracesRun: current.tracesRun + 1,
    pythonTraces:
      language === 'Python' ? current.pythonTraces + 1 : current.pythonTraces,
    cTraces: language === 'C' ? current.cTraces + 1 : current.cTraces,
  };
  saveAnalytics(next);
  return next;
}

export function recordStepExecution(
  current: StudentAnalytics
): StudentAnalytics {
  const next: StudentAnalytics = {
    ...current,
    stepsExecuted: current.stepsExecuted + 1,
  };
  saveAnalytics(next);
  return next;
}

export function recordQuizSubmission(
  current: StudentAnalytics,
  questionId: string,
  selectedOption: number
): StudentAnalytics {
  const next: StudentAnalytics = {
    ...current,
    answeredQuizMap: {
      ...current.answeredQuizMap,
      [questionId]: selectedOption,
    },
  };
  saveAnalytics(next);
  return next;
}

export function toggleConceptBookmark(
  current: StudentAnalytics,
  conceptId: string
): StudentAnalytics {
  const exists = current.bookmarkedConceptIds.includes(conceptId);
  const nextIds = exists
    ? current.bookmarkedConceptIds.filter((id) => id !== conceptId)
    : [...current.bookmarkedConceptIds, conceptId];

  const next: StudentAnalytics = {
    ...current,
    bookmarkedConceptIds: nextIds,
  };
  saveAnalytics(next);
  return next;
}

export function resetProgramQuizAnswers(
  current: StudentAnalytics
): StudentAnalytics {
  const next: StudentAnalytics = {
    ...current,
    answeredQuizMap: {},
  };
  saveAnalytics(next);
  return next;
}

export function resetAllAnalytics(): StudentAnalytics {
  const fresh = createDefaultAnalytics();
  saveAnalytics(fresh);
  return fresh;
}

export function loadLayoutOverride(): LayoutModeOverride {
  if (typeof window === 'undefined') return 'auto';
  try {
    const val = window.localStorage.getItem(LAYOUT_OVERRIDE_KEY);
    if (val === 'mobile' || val === 'tablet' || val === 'desktop') {
      return val;
    }
    return 'auto';
  } catch {
    return 'auto';
  }
}

export function saveLayoutOverride(override: LayoutModeOverride): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LAYOUT_OVERRIDE_KEY, override);
  } catch {
    // Ignore storage errors
  }
}

export function loadUserGeminiKey(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(USER_GEMINI_KEY) || '';
  } catch {
    return '';
  }
}

export function saveUserGeminiKey(apiKey: string): void {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      window.localStorage.removeItem(USER_GEMINI_KEY);
    } else {
      window.localStorage.setItem(USER_GEMINI_KEY, trimmed);
    }
  } catch {
    // Ignore storage errors
  }
}
