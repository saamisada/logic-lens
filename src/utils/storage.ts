import type {
  DailyActivityEntry,
  LayoutModeOverride,
  ProgramLanguage,
  StudentAnalytics,
} from '@/src/types/algorithm';

const ANALYTICS_KEY = 'logiclens_student_analytics_v2';
const LAYOUT_OVERRIDE_KEY = 'logiclens_layout_override_v1';
const USER_GEMINI_KEY = 'logiclens_user_gemini_key';

function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getYesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function createDefaultAnalytics(): StudentAnalytics {
  const today = getTodayDateString();
  return {
    stepsExecuted: 0,
    tracesRun: 0,
    pythonTraces: 0,
    cTraces: 0,
    quizzesAttempted: 0,
    quizzesCorrect: 0,
    completedQuizIds: [],
    answeredQuizMap: {},
    bookmarkedConceptIds: [],
    streakDays: 1,
    lastActiveDate: today,
    dailyActivity: {
      [today]: 1,
    },
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
      completedQuizIds: Array.isArray(parsed.completedQuizIds)
        ? parsed.completedQuizIds
        : [],
      answeredQuizMap:
        parsed.answeredQuizMap && typeof parsed.answeredQuizMap === 'object'
          ? parsed.answeredQuizMap
          : {},
      bookmarkedConceptIds: Array.isArray(parsed.bookmarkedConceptIds)
        ? parsed.bookmarkedConceptIds
        : [],
      dailyActivity:
        parsed.dailyActivity && typeof parsed.dailyActivity === 'object'
          ? parsed.dailyActivity
          : defaults.dailyActivity,
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

function bumpStreakAndDaily(
  current: StudentAnalytics,
  incrementAmount = 1
): StudentAnalytics {
  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();
  let nextStreak = current.streakDays || 1;

  if (current.lastActiveDate !== today) {
    if (current.lastActiveDate === yesterday) {
      nextStreak += 1;
    } else {
      nextStreak = 1;
    }
  }

  return {
    ...current,
    streakDays: nextStreak,
    lastActiveDate: today,
    dailyActivity: {
      ...current.dailyActivity,
      [today]: (current.dailyActivity[today] || 0) + incrementAmount,
    },
  };
}

export function recordTraceExecution(
  current: StudentAnalytics,
  language: ProgramLanguage
): StudentAnalytics {
  const updatedBase = bumpStreakAndDaily(current, 1);
  const next: StudentAnalytics = {
    ...updatedBase,
    tracesRun: updatedBase.tracesRun + 1,
    pythonTraces:
      language === 'Python'
        ? updatedBase.pythonTraces + 1
        : updatedBase.pythonTraces,
    cTraces:
      language === 'C' ? updatedBase.cTraces + 1 : updatedBase.cTraces,
  };
  saveAnalytics(next);
  return next;
}

export function recordStepExecution(
  current: StudentAnalytics
): StudentAnalytics {
  const updatedBase = bumpStreakAndDaily(current, 1);
  const next: StudentAnalytics = {
    ...updatedBase,
    stepsExecuted: updatedBase.stepsExecuted + 1,
  };
  saveAnalytics(next);
  return next;
}

export function recordQuizSubmission(
  current: StudentAnalytics,
  questionId: string,
  selectedOption: number,
  isCorrect: boolean
): StudentAnalytics {
  const updatedBase = bumpStreakAndDaily(current, 2);
  const alreadySolved = updatedBase.completedQuizIds.includes(questionId);
  const nextCompleted = alreadySolved
    ? updatedBase.completedQuizIds
    : [...updatedBase.completedQuizIds, questionId];

  const next: StudentAnalytics = {
    ...updatedBase,
    quizzesAttempted: alreadySolved
      ? updatedBase.quizzesAttempted
      : updatedBase.quizzesAttempted + 1,
    quizzesCorrect:
      !alreadySolved && isCorrect
        ? updatedBase.quizzesCorrect + 1
        : updatedBase.quizzesCorrect,
    completedQuizIds: nextCompleted,
    answeredQuizMap: {
      ...updatedBase.answeredQuizMap,
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

export function resetAllQuizAnswers(
  current: StudentAnalytics
): StudentAnalytics {
  const next: StudentAnalytics = {
    ...current,
    quizzesAttempted: 0,
    quizzesCorrect: 0,
    completedQuizIds: [],
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

export function getLastSevenDaysActivity(
  analytics: StudentAnalytics
): DailyActivityEntry[] {
  const result: DailyActivityEntry[] = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let offset = 6; offset >= 0; offset--) {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const key = `${y}-${m}-${day}`;
    const count = analytics.dailyActivity[key] || 0;
    result.push({
      date: key,
      label: dayNames[d.getDay()],
      steps: count,
    });
  }
  return result;
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
