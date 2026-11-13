'use client';

import React, { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { CONCEPTS } from '@/src/data/concepts';
import { QUIZ_QUESTIONS } from '@/src/data/quizzes';
import type { DeviceProfile, StudentAnalytics } from '@/src/types/algorithm';
import { getLastSevenDaysActivity } from '@/src/utils/storage';

interface AnalyticsTabProps {
  profile: DeviceProfile;
  analytics: StudentAnalytics;
  onResetAnalytics: () => void;
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({
  profile,
  analytics,
  onResetAnalytics,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);

  const accuracyPct =
    analytics.quizzesAttempted > 0
      ? Math.round(
          (analytics.quizzesCorrect / analytics.quizzesAttempted) * 100
        )
      : 0;

  const traceFactor = Math.min(1, analytics.tracesRun / 6);
  const quizCoverage = Math.min(
    1,
    analytics.completedQuizIds.length / QUIZ_QUESTIONS.length
  );
  const stepFactor = Math.min(1, analytics.stepsExecuted / 60);
  const readinessPct = Math.round(
    (traceFactor * 0.35 + quizCoverage * 0.4 + stepFactor * 0.25) * 100
  );

  const sevenDayData = useMemo(
    () => getLastSevenDaysActivity(analytics),
    [analytics]
  );
  const maxDaily = Math.max(1, ...sevenDayData.map((d) => d.steps));

  const kpiGridClass =
    profile === 'mobile' ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-4 gap-3';

  const splitClass =
    profile === 'desktop'
      ? 'grid grid-cols-2 gap-4 items-start'
      : 'space-y-4';

  const totalLanguageTraces = Math.max(
    1,
    analytics.pythonTraces + analytics.cTraces
  );
  const pythonPct = Math.round(
    (analytics.pythonTraces / totalLanguageTraces) * 100
  );
  const cPct = Math.round((analytics.cTraces / totalLanguageTraces) * 100);

  return (
    <div className="space-y-4">
      {/* KPI Metrics Row */}
      <div className={kpiGridClass}>
        <div className="rounded-2xl bg-[#1F1F1F] border border-[#2E2E2E] p-4 space-y-1">
          <div className="text-xs text-[#8E8E8E]">Practice Score</div>
          <div className="text-2xl font-semibold text-white tabular-nums">
            {readinessPct}%
          </div>
          <div className="text-[11px] text-[#A3A3A3] tabular-nums">
            {analytics.tracesRun} traces run
          </div>
        </div>

        <div className="rounded-2xl bg-[#1F1F1F] border border-[#2E2E2E] p-4 space-y-1">
          <div className="text-xs text-[#8E8E8E]">Active Streak</div>
          <div className="text-2xl font-semibold text-white tabular-nums">
            {analytics.streakDays}d
          </div>
          <div className="text-[11px] text-[#A3A3A3]">Consecutive study</div>
        </div>

        <div className="rounded-2xl bg-[#1F1F1F] border border-[#2E2E2E] p-4 space-y-1">
          <div className="text-xs text-[#8E8E8E]">Steps Executed</div>
          <div className="text-2xl font-semibold text-white tabular-nums">
            {analytics.stepsExecuted}
          </div>
          <div className="text-[11px] text-[#A3A3A3]">
            Dry-run transitions
          </div>
        </div>

        <div className="rounded-2xl bg-[#1F1F1F] border border-[#2E2E2E] p-4 space-y-1">
          <div className="text-xs text-[#8E8E8E]">Quiz Accuracy</div>
          <div className="text-2xl font-semibold text-white tabular-nums">
            {accuracyPct}%
          </div>
          <div className="text-[11px] text-[#A3A3A3] tabular-nums">
            {analytics.quizzesCorrect}/{analytics.quizzesAttempted} solved
          </div>
        </div>
      </div>

      {/* 7-Day Activity Chart + Language Breakdown */}
      <div className={splitClass}>
        {/* 7-Day Monochrome Bar Chart */}
        <section className="rounded-2xl bg-[#1F1F1F] border border-[#2E2E2E] p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <div className="space-y-0.5">
              <h3 className="text-sm font-medium text-white">
                7-Day Study Activity
              </h3>
              <p className="text-xs text-[#8E8E8E]">
                Trace steps and quiz submissions logged locally
              </p>
            </div>
            <span className="text-xs font-mono text-[#A3A3A3] tabular-nums whitespace-nowrap">
              Peak: {maxDaily}
            </span>
          </div>

          <div className="h-44 rounded-xl bg-[#141414] border border-[#2E2E2E] px-4 pt-6 pb-3 flex items-end justify-between gap-2">
            {sevenDayData.map((entry) => {
              const heightPct = Math.max(
                8,
                Math.round((entry.steps / maxDaily) * 100)
              );
              const hasActivity = entry.steps > 0;
              return (
                <div
                  key={entry.date}
                  className="flex-1 h-full flex flex-col items-center justify-end gap-2"
                >
                  <span className="font-mono text-[10px] text-[#A3A3A3] tabular-nums">
                    {entry.steps}
                  </span>
                  <div className="w-full max-w-[32px] flex-1 flex items-end justify-center">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t-md transition-all ${
                        hasActivity
                          ? 'bg-white'
                          : 'bg-[#2A2A2A] border border-[#2E2E2E]'
                      }`}
                    />
                  </div>
                  <span className="text-[11px] text-[#8E8E8E]">
                    {entry.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Language & Practice Breakdown */}
        <section className="rounded-2xl bg-[#1F1F1F] border border-[#2E2E2E] p-4 space-y-4">
          <div className="space-y-0.5">
            <h3 className="text-sm font-medium text-white">
              Language & Practice Breakdown
            </h3>
            <p className="text-xs text-[#8E8E8E]">
              Python and C programs traced locally
            </p>
          </div>

          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white font-medium">Python Traces</span>
                <span className="font-mono text-[#A3A3A3] tabular-nums whitespace-nowrap">
                  {analytics.pythonTraces} ({pythonPct}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-[#141414] border border-[#2E2E2E] overflow-hidden">
                <div
                  style={{ width: `${analytics.pythonTraces > 0 ? pythonPct : 0}%` }}
                  className="h-full rounded-full bg-white transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white font-medium">C Traces</span>
                <span className="font-mono text-[#A3A3A3] tabular-nums whitespace-nowrap">
                  {analytics.cTraces} ({cPct}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-[#141414] border border-[#2E2E2E] overflow-hidden">
                <div
                  style={{ width: `${analytics.cTraces > 0 ? cPct : 0}%` }}
                  className="h-full rounded-full bg-white transition-all"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-[#2E2E2E] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#A3A3A3]">Quiz Questions Solved</span>
                <span className="font-mono text-white tabular-nums whitespace-nowrap">
                  {analytics.completedQuizIds.length} / {QUIZ_QUESTIONS.length}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#A3A3A3]">Bookmarked Concepts</span>
                <span className="font-mono text-white tabular-nums whitespace-nowrap">
                  {analytics.bookmarkedConceptIds.length} / {CONCEPTS.length}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Local Data Reset Footer */}
      <div className="rounded-2xl bg-[#1F1F1F] border border-[#2E2E2E] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-0.5">
          <div className="text-sm font-medium text-white">
            Local Progress Storage
          </div>
          <div className="text-xs text-[#8E8E8E]">
            All analytics stay strictly on your device in browser localStorage.
          </div>
        </div>

        {!confirmReset ? (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#2E2E2E] border border-[#454545] px-4 py-2 text-xs font-medium text-white hover:bg-[#3A3A3A] whitespace-nowrap shrink-0 self-start sm:self-auto transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Progress</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="rounded-full bg-[#2E2E2E] border border-[#454545] px-3.5 py-2 text-xs font-medium text-white whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onResetAnalytics();
                setConfirmReset(false);
              }}
              className="rounded-full bg-white px-4 py-2 text-xs font-medium text-[#141414] whitespace-nowrap"
            >
              Confirm Reset
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
