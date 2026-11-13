'use client';

import React, { useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Play,
  RotateCcw,
  X,
} from 'lucide-react';
import { QUIZ_QUESTIONS } from '@/src/data/quizzes';
import type { DeviceProfile, ProgramLanguage } from '@/src/types/algorithm';

interface QuizTabProps {
  profile: DeviceProfile;
  answeredMap: Record<string, number>;
  onSubmitAnswer: (
    questionId: string,
    selectedOption: number,
    isCorrect: boolean
  ) => void;
  onResetQuiz: () => void;
  onTraceCodeInVisualizer: (language: ProgramLanguage, code: string) => void;
}

export const QuizTab: React.FC<QuizTabProps> = ({
  profile,
  answeredMap,
  onSubmitAnswer,
  onResetQuiz,
  onTraceCodeInVisualizer,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const question = QUIZ_QUESTIONS[activeIndex];
  const selectedChoice = answeredMap[question.id];
  const isAnswered = typeof selectedChoice === 'number';
  const isCorrect = isAnswered && selectedChoice === question.correctIndex;

  const totalAnswered = Object.keys(answeredMap).length;
  const totalCorrect = QUIZ_QUESTIONS.filter(
    (q) => answeredMap[q.id] === q.correctIndex
  ).length;

  const isDesktop = profile === 'desktop';

  return (
    <div className="space-y-4">
      {/* Quiz Score Summary Header */}
      <div className="rounded-2xl bg-[#1F1F1F] border border-[#2E2E2E] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-0.5">
          <h2 className="text-base font-semibold text-white">
            Dry-Run Output Lab
          </h2>
          <p className="text-xs text-[#8E8E8E] tabular-nums">
            Solved {totalAnswered} of {QUIZ_QUESTIONS.length} · Score{' '}
            {totalCorrect}/{QUIZ_QUESTIONS.length}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            onResetQuiz();
            setActiveIndex(0);
          }}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#2E2E2E] border border-[#454545] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#3A3A3A] whitespace-nowrap shrink-0 self-start sm:self-auto transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Quiz</span>
        </button>
      </div>

      {/* Main Quiz Content */}
      <div
        className={
          isDesktop
            ? 'grid grid-cols-[minmax(0,300px)_minmax(0,1fr)] gap-4 items-start'
            : 'space-y-4'
        }
      >
        {/* Question Navigator */}
        <div className="rounded-2xl bg-[#1F1F1F] border border-[#2E2E2E] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#2E2E2E] text-xs font-medium text-[#A3A3A3]">
            Questions ({QUIZ_QUESTIONS.length})
          </div>

          {isDesktop ? (
            <div className="divide-y divide-[#2E2E2E]">
              {QUIZ_QUESTIONS.map((q, idx) => {
                const answered = typeof answeredMap[q.id] === 'number';
                const correct = answered && answeredMap[q.id] === q.correctIndex;
                const active = idx === activeIndex;

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setActiveIndex(idx)}
                    className={`w-full px-4 py-3 flex items-center justify-between gap-2 text-left transition-colors ${
                      active
                        ? 'bg-[#2A2A2A] text-white'
                        : 'hover:bg-[#242424] text-[#A3A3A3]'
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-xs font-medium text-white">
                        {idx + 1}. {q.topic}
                      </div>
                      <div className="text-[11px] text-[#8E8E8E]">
                        {q.language}
                      </div>
                    </div>
                    {answered && (
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap ${
                          correct
                            ? 'bg-white text-[#141414] font-semibold'
                            : 'bg-[#2E2E2E] text-[#A3A3A3] border border-[#454545]'
                        }`}
                      >
                        {correct ? 'PASS' : 'MISS'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-3 flex items-center gap-2 overflow-x-auto">
              {QUIZ_QUESTIONS.map((q, idx) => {
                const answered = typeof answeredMap[q.id] === 'number';
                const active = idx === activeIndex;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setActiveIndex(idx)}
                    className={`h-9 min-w-[38px] px-2.5 rounded-full text-xs font-mono tabular-nums transition-colors shrink-0 whitespace-nowrap ${
                      active
                        ? 'bg-white text-[#141414] font-semibold'
                        : answered
                          ? 'bg-[#2A2A2A] text-white border border-[#454545]'
                          : 'bg-[#141414] text-[#A3A3A3] border border-[#2E2E2E]'
                    }`}
                  >
                    Q{idx + 1}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Active Question Card */}
        <div className="rounded-2xl bg-[#1F1F1F] border border-[#2E2E2E] p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="space-y-0.5">
              <div className="text-xs text-[#8E8E8E]">
                Question {activeIndex + 1} of {QUIZ_QUESTIONS.length} ·{' '}
                {question.language}
              </div>
              <div className="text-xs font-medium text-[#A3A3A3]">
                {question.topic}
              </div>
            </div>

            {isAnswered && (
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 self-start sm:self-auto ${
                  isCorrect
                    ? 'bg-white text-[#141414]'
                    : 'bg-[#2E2E2E] text-white border border-[#454545]'
                }`}
              >
                {isCorrect ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>CORRECT</span>
                  </>
                ) : (
                  <>
                    <X className="w-3 h-3" />
                    <span>INCORRECT</span>
                  </>
                )}
              </span>
            )}
          </div>

          <h3 className="text-sm sm:text-base font-medium text-white leading-relaxed">
            {question.prompt}
          </h3>

          <pre className="rounded-xl bg-[#141414] border border-[#2E2E2E] p-3.5 font-mono text-xs text-white overflow-x-auto leading-6">
            <code className="whitespace-pre">{question.code}</code>
          </pre>

          {/* 4 Android-Settings-Style Radio Option Rows */}
          <div className="rounded-2xl bg-[#141414] border border-[#2E2E2E] divide-y divide-[#2E2E2E] overflow-hidden">
            {question.options.map((opt, idx) => {
              const isSelected = selectedChoice === idx;
              const isRightChoice = idx === question.correctIndex;

              let rowBg = 'hover:bg-[#1F1F1F]';
              let indicator = (
                <span className="h-4 w-4 rounded-full border border-[#8E8E8E] shrink-0" />
              );

              if (isAnswered) {
                if (isRightChoice) {
                  rowBg = 'bg-[#2A2A2A]';
                  indicator = (
                    <span className="h-5 w-5 rounded-full bg-white text-[#141414] flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3" />
                    </span>
                  );
                } else if (isSelected && !isRightChoice) {
                  rowBg = 'bg-[#1F1F1F]';
                  indicator = (
                    <span className="h-5 w-5 rounded-full bg-[#2E2E2E] border border-white text-white flex items-center justify-center shrink-0">
                      <X className="w-3 h-3" />
                    </span>
                  );
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isAnswered}
                  onClick={() =>
                    onSubmitAnswer(
                      question.id,
                      idx,
                      idx === question.correctIndex
                    )
                  }
                  className={`w-full px-4 py-3.5 min-h-[48px] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-left transition-colors disabled:cursor-default ${rowBg}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {indicator}
                    <span className="font-mono text-xs sm:text-sm text-white">
                      {opt}
                    </span>
                  </div>

                  {isAnswered && isRightChoice && (
                    <span className="text-[10px] font-mono text-white shrink-0 whitespace-nowrap pl-7 sm:pl-0">
                      ANSWER
                    </span>
                  )}
                  {isAnswered && isSelected && !isRightChoice && (
                    <span className="text-[10px] font-mono text-[#8E8E8E] shrink-0 whitespace-nowrap pl-7 sm:pl-0">
                      YOUR PICK
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Step-by-Step Dry-Run Explanation + Trace Link */}
          {isAnswered && (
            <div className="rounded-xl bg-[#141414] border border-[#2E2E2E] p-4 space-y-3">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-white">
                  Dry-Run Explanation
                </div>
                <p className="text-xs text-[#A3A3A3] leading-relaxed">
                  {question.explanation}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  onTraceCodeInVisualizer(question.language, question.code)
                }
                className="inline-flex items-center gap-1.5 rounded-full bg-[#2E2E2E] border border-[#454545] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#3A3A3A] whitespace-nowrap transition-colors"
              >
                <Play className="w-3 h-3" />
                <span>Trace in Visualizer</span>
              </button>
            </div>
          )}

          {/* Question Pagination Footer */}
          <div className="flex items-center justify-between pt-2 gap-2">
            <button
              type="button"
              disabled={activeIndex === 0}
              onClick={() => setActiveIndex((prev) => Math.max(0, prev - 1))}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#2E2E2E] border border-[#454545] px-4 py-2 text-xs font-medium text-white hover:bg-[#3A3A3A] disabled:opacity-40 whitespace-nowrap shrink-0 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <button
              type="button"
              disabled={activeIndex >= QUIZ_QUESTIONS.length - 1}
              onClick={() =>
                setActiveIndex((prev) =>
                  Math.min(QUIZ_QUESTIONS.length - 1, prev + 1)
                )
              }
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-medium text-[#141414] hover:bg-[#E5E5E5] disabled:opacity-40 whitespace-nowrap shrink-0 transition-colors"
            >
              <span>Next Question</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
