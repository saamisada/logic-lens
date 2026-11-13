'use client';

import React from 'react';
import { Edit3 } from 'lucide-react';
import type {
  DeviceProfile,
  ProgramAnalysis,
  ProgramLanguage,
  QuizQuestion,
  TraceResult,
} from '@/src/types/algorithm';

interface AnalyticsTabProps {
  profile: DeviceProfile;
  language: ProgramLanguage;
  trace: TraceResult;
  analysis: ProgramAnalysis;
  questions: QuizQuestion[];
  answeredMap: Record<string, number>;
  onEditPlaygroundProgram: () => void;
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({
  profile,
  language,
  trace,
  analysis,
  questions,
  answeredMap,
  onEditPlaygroundProgram,
}) => {
  const solvedCount = questions.filter(
    (q) => typeof answeredMap[q.id] === 'number'
  ).length;
  const correctCount = questions.filter(
    (q) => answeredMap[q.id] === q.correctIndex
  ).length;
  const quizAccuracyPct =
    solvedCount > 0 ? Math.round((correctCount / solvedCount) * 100) : 0;

  const maxLineHits = Math.max(
    1,
    ...analysis.lineStats.map((stat) => stat.hits)
  );
  const maxMutations = Math.max(
    1,
    ...analysis.variableStats.map((v) => v.mutations)
  );

  const kpiGridClass =
    profile === 'mobile' ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-4 gap-3';

  const splitClass =
    profile === 'desktop'
      ? 'grid grid-cols-2 gap-4 items-start'
      : 'space-y-4';

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="rounded-2xl bg-[#1F1F1F] border border-[#2E2E2E] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-0.5">
          <h2 className="text-base font-semibold text-white">
            Program Execution Analytics
          </h2>
          <p className="text-xs text-[#8E8E8E]">
            Telemetry computed exclusively for your active {language} program (
            {analysis.nonEmptyLines} active lines)
          </p>
        </div>

        <button
          type="button"
          onClick={onEditPlaygroundProgram}
          className="inline-flex items-center gap-1.5 rounded-full bg-white text-[#141414] hover:bg-[#E5E5E5] px-4 py-2 text-xs font-medium whitespace-nowrap shrink-0 self-start sm:self-auto transition-colors"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Change Program</span>
        </button>
      </div>

      {/* KPI Metrics Row */}
      <div className={kpiGridClass}>
        <div className="rounded-2xl bg-[#1F1F1F] border border-[#2E2E2E] p-4 space-y-1">
          <div className="text-xs text-[#8E8E8E]">Total Steps</div>
          <div className="text-2xl font-semibold text-white tabular-nums">
            {trace.metrics.totalSteps}
          </div>
          <div className="text-[11px] text-[#A3A3A3]">
            Est. {trace.metrics.estimatedComplexity}
          </div>
        </div>

        <div className="rounded-2xl bg-[#1F1F1F] border border-[#2E2E2E] p-4 space-y-1">
          <div className="text-xs text-[#8E8E8E]">Loop Depth</div>
          <div className="text-2xl font-semibold text-white tabular-nums">
            {trace.metrics.maxLoopDepth}
          </div>
          <div className="text-[11px] text-[#A3A3A3]">
            Hottest: Line {analysis.hottestLine}
          </div>
        </div>

        <div className="rounded-2xl bg-[#1F1F1F] border border-[#2E2E2E] p-4 space-y-1">
          <div className="text-xs text-[#8E8E8E]">Operations</div>
          <div className="text-2xl font-semibold text-white tabular-nums">
            {trace.metrics.comparisons + trace.metrics.writes}
          </div>
          <div className="text-[11px] text-[#A3A3A3] tabular-nums">
            {trace.metrics.comparisons} cmp · {trace.metrics.writes} writes
          </div>
        </div>

        <div className="rounded-2xl bg-[#1F1F1F] border border-[#2E2E2E] p-4 space-y-1">
          <div className="text-xs text-[#8E8E8E]">Program Quiz</div>
          <div className="text-2xl font-semibold text-white tabular-nums">
            {quizAccuracyPct}%
          </div>
          <div className="text-[11px] text-[#A3A3A3] tabular-nums">
            {correctCount}/{questions.length} correct
          </div>
        </div>
      </div>

      {/* Per-Line Execution Heatmap + Variable Mutation Breakdown */}
      <div className={splitClass}>
        {/* Line-by-Line Execution Frequency */}
        <section className="rounded-2xl bg-[#1F1F1F] border border-[#2E2E2E] p-4 space-y-4">
          <div className="space-y-0.5">
            <h3 className="text-sm font-medium text-white">
              Line Execution Frequency
            </h3>
            <p className="text-xs text-[#8E8E8E]">
              How many times each line of your {language} program ran
            </p>
          </div>

          {analysis.lineStats.length === 0 ? (
            <div className="text-xs text-[#8E8E8E]">No lines traced.</div>
          ) : (
            <div className="space-y-2.5">
              {analysis.lineStats.map((stat) => {
                const widthPct =
                  stat.hits > 0
                    ? Math.max(8, Math.round((stat.hits / maxLineHits) * 100))
                    : 0;
                return (
                  <div key={stat.lineNumber} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-mono text-[#A3A3A3] truncate">
                        <span className="text-[#8E8E8E] mr-2 tabular-nums">
                          L{stat.lineNumber}
                        </span>
                        <span className="text-white">{stat.code.trim()}</span>
                      </span>
                      <span className="font-mono text-white tabular-nums whitespace-nowrap shrink-0">
                        {stat.hits}x
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[#141414] border border-[#2E2E2E] overflow-hidden">
                      <div
                        style={{ width: `${widthPct}%` }}
                        className="h-full rounded-full bg-white transition-all"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Variable Mutation Breakdown */}
        <section className="rounded-2xl bg-[#1F1F1F] border border-[#2E2E2E] p-4 space-y-4">
          <div className="space-y-0.5">
            <h3 className="text-sm font-medium text-white">
              Variable Mutation Profile
            </h3>
            <p className="text-xs text-[#8E8E8E]">
              Update frequency and final state per variable
            </p>
          </div>

          {analysis.variableStats.length === 0 ? (
            <div className="text-xs text-[#8E8E8E]">
              No variables declared in this program.
            </div>
          ) : (
            <div className="space-y-3">
              {analysis.variableStats.map((v) => {
                const widthPct =
                  v.mutations > 0
                    ? Math.max(
                        10,
                        Math.round((v.mutations / maxMutations) * 100)
                      )
                    : 0;
                return (
                  <div key={v.name} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-white font-medium whitespace-nowrap">
                          {v.name}
                        </span>
                        <span className="font-mono text-[11px] text-[#8E8E8E] whitespace-nowrap">
                          {v.type}
                        </span>
                      </div>
                      <span className="font-mono text-[#A3A3A3] tabular-nums whitespace-nowrap shrink-0">
                        {v.mutations} updates
                      </span>
                    </div>

                    <div className="h-1.5 w-full rounded-full bg-[#141414] border border-[#2E2E2E] overflow-hidden">
                      <div
                        style={{ width: `${widthPct}%` }}
                        className="h-full rounded-full bg-white transition-all"
                      />
                    </div>

                    <div className="text-[11px] font-mono text-[#8E8E8E] truncate">
                      Final: {v.finalValue}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
