'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Terminal,
} from 'lucide-react';
import { ArrayVisualStage } from '@/src/components/ArrayVisualStage';
import type {
  DeviceProfile,
  ProgramLanguage,
  TraceResult,
} from '@/src/types/algorithm';

interface VisualizerTabProps {
  profile: DeviceProfile;
  language: ProgramLanguage;
  code: string;
  trace: TraceResult;
  stepIndex: number;
  onChangeStepIndex: (next: number) => void;
  paramOverrides: Record<string, string>;
  onChangeParamOverrides: (next: Record<string, string>) => void;
  onStepExecuted: () => void;
  onEditPlaygroundProgram: () => void;
  geminiKey: string;
}

export const VisualizerTab: React.FC<VisualizerTabProps> = ({
  profile,
  language,
  trace,
  stepIndex,
  onChangeStepIndex,
  paramOverrides,
  onChangeParamOverrides,
  onStepExecuted,
  onEditPlaygroundProgram,
  geminiKey,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<1 | 2>(1);
  const [showDeepInsight, setShowDeepInsight] = useState(false);
  const [byokExplanation, setByokExplanation] = useState<string | null>(null);
  const [byokLoading, setByokLoading] = useState(false);
  const [byokError, setByokError] = useState<string | null>(null);

  const steps = trace.steps;
  const safeStepIndex = Math.min(stepIndex, Math.max(0, steps.length - 1));
  const currentStep = steps[safeStepIndex];

  // Auto playback loop
  useEffect(() => {
    if (!isPlaying || !trace.ok || safeStepIndex >= steps.length - 1) return;

    const intervalMs = speedMultiplier === 2 ? 500 : 980;
    const timer = window.setTimeout(() => {
      const nextIndex = Math.min(steps.length - 1, safeStepIndex + 1);
      onChangeStepIndex(nextIndex);
      if (nextIndex >= steps.length - 1) {
        setIsPlaying(false);
      }
      onStepExecuted();
    }, intervalMs);

    return () => window.clearTimeout(timer);
  }, [
    isPlaying,
    trace.ok,
    safeStepIndex,
    steps.length,
    speedMultiplier,
    onChangeStepIndex,
    onStepExecuted,
  ]);

  const handleNext = () => {
    setIsPlaying(false);
    if (safeStepIndex < steps.length - 1) {
      onChangeStepIndex(safeStepIndex + 1);
      onStepExecuted();
    }
  };

  const handlePrev = () => {
    setIsPlaying(false);
    onChangeStepIndex(Math.max(0, safeStepIndex - 1));
  };

  const handleReset = () => {
    setIsPlaying(false);
    onChangeStepIndex(0);
    setByokExplanation(null);
    setByokError(null);
  };

  const handleAskByokTutor = async () => {
    if (!geminiKey || !currentStep) return;
    setByokLoading(true);
    setByokError(null);
    try {
      const activeLine = trace.codeLines[currentStep.lineNumber - 1] ?? '';
      const prompt = `Explain this single ${language} execution step clearly in 2-3 concise sentences (no emojis, plain text only). Line ${currentStep.lineNumber}: ${activeLine}. Step note: ${currentStep.note}. Variables: ${currentStep.variables.map((v) => `${v.name}=${v.value}`).join(', ')}.`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(geminiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      const text =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        currentStep.deepExplanation;
      setByokExplanation(text.trim());
    } catch {
      setByokError(
        'Could not reach Gemini API with the stored local key. Showing built-in trace insight.'
      );
      setByokExplanation(currentStep.deepExplanation);
    } finally {
      setByokLoading(false);
    }
  };

  const isDesktop = profile === 'desktop';

  return (
    <div className="space-y-4">
      {/* Active Playground Program Summary Bar */}
      <div className="rounded-2xl bg-[#1F1F1F] border border-[#2E2E2E] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-0.5">
          <div className="text-sm font-semibold text-white">
            Active {language} Playground Program
          </div>
          <div className="text-xs text-[#8E8E8E]">
            Entry: {trace.metrics.detectedEntry} · {trace.steps.length} traced
            steps
          </div>
        </div>

        <button
          type="button"
          onClick={onEditPlaygroundProgram}
          className="inline-flex items-center gap-1.5 rounded-full bg-white text-[#141414] hover:bg-[#E5E5E5] px-4 py-2 text-xs font-medium whitespace-nowrap shrink-0 self-start sm:self-auto transition-colors"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Edit or Paste New Program</span>
        </button>
      </div>

      {/* Editable Function Arguments if user pasted a function without caller */}
      {trace.detectedParams.length > 0 && (
        <div className="rounded-2xl bg-[#1F1F1F] border border-[#2E2E2E] p-4 space-y-3">
          <div className="space-y-0.5">
            <div className="text-xs font-medium text-white">
              Function Input Arguments
            </div>
            <div className="text-[11px] text-[#8E8E8E]">
              Modify parameters below to re-trace {trace.metrics.detectedEntry}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {trace.detectedParams.map((param) => (
              <div key={param.name} className="space-y-1">
                <label
                  htmlFor={`vis-param-${param.name}`}
                  className="block font-mono text-[11px] text-[#A3A3A3] whitespace-nowrap"
                >
                  {param.name} ({param.kind})
                </label>
                <input
                  id={`vis-param-${param.name}`}
                  type="text"
                  value={paramOverrides[param.name] ?? param.defaultValue}
                  onChange={(e) => {
                    setIsPlaying(false);
                    onChangeStepIndex(0);
                    onChangeParamOverrides({
                      ...paramOverrides,
                      [param.name]: e.target.value,
                    });
                  }}
                  className="w-full rounded-xl bg-[#141414] border border-[#2E2E2E] px-3 py-2 font-mono text-xs text-white focus:outline-none focus:border-white"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Parse / Runtime Error Banner */}
      {!trace.ok && (
        <div className="rounded-2xl bg-[#1F1F1F] border border-white p-4 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-white shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="text-sm font-medium text-white">
              Unable to Trace {language} Program
              {trace.errorLine ? ` (Line ${trace.errorLine})` : ''}
            </div>
            <p className="text-xs text-[#A3A3A3]">{trace.error}</p>
          </div>
        </div>
      )}

      {/* Adaptive Workspace: 2-Column Split on Desktop (55% / 45%), Vertical Stack on Mobile/Tablet */}
      {trace.ok && (
        <div
          className={
            isDesktop
              ? 'grid grid-cols-[minmax(0,55%)_minmax(0,45%)] gap-4 items-start'
              : 'space-y-4'
          }
        >
          {/* LEFT COLUMN: Code Stage + Step Note + Playback Deck */}
          <div className="space-y-4 min-w-0">
            {/* Code Stage (valid HTML5 div-based line rows) */}
            <div className="rounded-2xl bg-[#1F1F1F] border border-[#2E2E2E] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#2E2E2E] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium text-white whitespace-nowrap">
                    {language} Execution Stage
                  </div>
                  <div className="text-xs text-[#8E8E8E]">
                    Line-by-line pointer execution
                  </div>
                </div>
                <span className="text-xs font-mono text-[#A3A3A3] tabular-nums whitespace-nowrap">
                  Line {currentStep?.lineNumber ?? 1} of{' '}
                  {trace.codeLines.length}
                </span>
              </div>

              <div className="p-3 bg-[#141414] overflow-x-auto">
                <div className="font-mono text-xs leading-6 min-w-max">
                  {trace.codeLines.map((line, idx) => {
                    const lineNo = idx + 1;
                    const isActive = currentStep?.lineNumber === lineNo;
                    return (
                      <div
                        key={lineNo}
                        className={`flex items-center gap-3 px-3 py-0.5 rounded-r-lg transition-colors ${
                          isActive
                            ? 'bg-[#2A2A2A] border-l-2 border-white text-white font-medium'
                            : 'border-l-2 border-transparent text-[#A3A3A3]'
                        }`}
                      >
                        <span className="w-6 text-right text-[#8E8E8E] select-none tabular-nums shrink-0">
                          {lineNo}
                        </span>
                        <code className="whitespace-pre">{line || ' '}</code>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Execution Step Note Panel */}
            <div className="rounded-2xl bg-[#1F1F1F] border border-[#2E2E2E] p-4 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span className="text-xs font-medium text-[#A3A3A3] tabular-nums whitespace-nowrap">
                  Step {currentStep?.stepNumber ?? 0} of {steps.length}
                  {trace.truncated ? ' (capped)' : ''}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDeepInsight((prev) => !prev)}
                    className="text-xs text-[#A3A3A3] hover:text-white underline underline-offset-4 whitespace-nowrap"
                  >
                    {showDeepInsight ? 'Hide Details' : 'Step Details'}
                  </button>
                  {geminiKey && (
                    <button
                      type="button"
                      onClick={handleAskByokTutor}
                      disabled={byokLoading}
                      className="inline-flex items-center gap-1 rounded-full bg-[#2E2E2E] border border-[#454545] px-2.5 py-1 text-[11px] font-medium text-white hover:bg-[#3A3A3A] disabled:opacity-50 whitespace-nowrap"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{byokLoading ? 'Thinking...' : 'BYOK Tutor'}</span>
                    </button>
                  )}
                </div>
              </div>

              <p className="text-sm text-white leading-relaxed">
                {currentStep?.note ??
                  'Program parsed with zero executable runtime steps.'}
              </p>

              {(showDeepInsight || byokExplanation || byokError) &&
                currentStep && (
                  <div className="rounded-xl bg-[#141414] border border-[#2E2E2E] p-3 space-y-1.5 text-xs text-[#A3A3A3] leading-relaxed">
                    {byokError && <p className="text-white">{byokError}</p>}
                    <p>{byokExplanation || currentStep.deepExplanation}</p>
                  </div>
                )}
            </div>

            {/* Playback Control Deck */}
            <div className="rounded-2xl bg-[#1F1F1F] border border-[#2E2E2E] p-4 space-y-3">
              <input
                type="range"
                min={0}
                max={Math.max(0, steps.length - 1)}
                value={safeStepIndex}
                onChange={(e) => {
                  setIsPlaying(false);
                  onChangeStepIndex(Number(e.target.value));
                }}
                aria-label="Execution step scrubber"
                className="w-full accent-white cursor-pointer"
              />

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="h-10 w-10 rounded-full bg-[#2E2E2E] border border-[#454545] text-white hover:bg-[#3A3A3A] flex items-center justify-center transition-colors shrink-0"
                    aria-label="Reset trace"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={safeStepIndex === 0}
                    className="h-10 w-10 rounded-full bg-[#2E2E2E] border border-[#454545] text-white hover:bg-[#3A3A3A] disabled:opacity-40 flex items-center justify-center transition-colors shrink-0"
                    aria-label="Previous step"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    disabled={steps.length <= 1}
                    onClick={() => {
                      if (safeStepIndex >= steps.length - 1) {
                        onChangeStepIndex(0);
                      }
                      setIsPlaying((prev) => !prev);
                    }}
                    className="h-10 px-5 rounded-full bg-white text-[#141414] hover:bg-[#E5E5E5] disabled:opacity-40 font-medium text-xs inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>Play</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={safeStepIndex >= steps.length - 1}
                    className="h-10 w-10 rounded-full bg-[#2E2E2E] border border-[#454545] text-white hover:bg-[#3A3A3A] disabled:opacity-40 flex items-center justify-center transition-colors shrink-0"
                    aria-label="Next step"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSpeedMultiplier((prev) => (prev === 1 ? 2 : 1))
                  }
                  className="h-10 px-3.5 rounded-full bg-[#2E2E2E] border border-[#454545] text-xs font-mono text-white hover:bg-[#3A3A3A] transition-colors tabular-nums whitespace-nowrap shrink-0"
                >
                  Speed {speedMultiplier}x
                </button>
              </div>

              {/* Automatically Computed Trace Metrics Footer */}
              <div className="pt-3 border-t border-[#2E2E2E] grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="rounded-xl bg-[#141414] border border-[#2E2E2E] py-2 px-2 flex flex-col items-center">
                  <span className="text-[11px] text-[#8E8E8E] whitespace-nowrap">
                    Est. Time
                  </span>
                  <span className="font-mono text-xs text-white mt-0.5 whitespace-nowrap">
                    {trace.metrics.estimatedComplexity}
                  </span>
                </div>
                <div className="rounded-xl bg-[#141414] border border-[#2E2E2E] py-2 px-2 flex flex-col items-center">
                  <span className="text-[11px] text-[#8E8E8E] whitespace-nowrap">
                    Loop Depth
                  </span>
                  <span className="font-mono text-xs text-white mt-0.5 tabular-nums whitespace-nowrap">
                    {trace.metrics.maxLoopDepth}
                  </span>
                </div>
                <div className="rounded-xl bg-[#141414] border border-[#2E2E2E] py-2 px-2 flex flex-col items-center">
                  <span className="text-[11px] text-[#8E8E8E] whitespace-nowrap">
                    Comparisons
                  </span>
                  <span className="font-mono text-xs text-white mt-0.5 tabular-nums whitespace-nowrap">
                    {trace.metrics.comparisons}
                  </span>
                </div>
                <div className="rounded-xl bg-[#141414] border border-[#2E2E2E] py-2 px-2 flex flex-col items-center">
                  <span className="text-[11px] text-[#8E8E8E] whitespace-nowrap">
                    Writes
                  </span>
                  <span className="font-mono text-xs text-white mt-0.5 tabular-nums whitespace-nowrap">
                    {trace.metrics.writes}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Auto-Detected Array & Pointer Stage + Memory Table + Stdout */}
          <div className="space-y-4 min-w-0">
            {currentStep && (
              <ArrayVisualStage
                arrayState={currentStep.arrayState}
                arrayLabel={currentStep.arrayLabel}
                pointers={currentStep.pointers}
                comparedIndices={currentStep.comparedIndices}
                swappedIndices={currentStep.swappedIndices}
                auxiliaryPairs={currentStep.auxiliaryPairs}
                auxiliaryLabel={currentStep.auxiliaryLabel}
              />
            )}

            {/* Live Memory Variable Table */}
            <div className="rounded-2xl bg-[#1F1F1F] border border-[#2E2E2E] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#2E2E2E] flex flex-col">
                <h3 className="text-sm font-medium text-white whitespace-nowrap">
                  Live Memory Table
                </h3>
                <span className="text-xs text-[#8E8E8E] mt-0.5">
                  Active stack variables in your program
                </span>
              </div>

              {!currentStep || currentStep.variables.length === 0 ? (
                <div className="px-4 py-5 text-xs text-[#8E8E8E]">
                  No variables in scope yet at this step.
                </div>
              ) : (
                <div className="divide-y divide-[#2E2E2E]">
                  {currentStep.variables.map((variable) => (
                    <div
                      key={variable.name}
                      className={`px-4 py-3 flex items-center justify-between gap-3 transition-colors ${
                        variable.updated ? 'bg-[#2A2A2A]' : 'bg-transparent'
                      }`}
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="font-mono text-xs font-medium text-white whitespace-nowrap">
                          {variable.name}
                        </span>
                        <span className="font-mono text-[11px] text-[#8E8E8E] whitespace-nowrap">
                          {variable.type}
                        </span>
                      </div>

                      <div className="flex flex-col items-end gap-1 min-w-0 max-w-[60%]">
                        <span className="font-mono text-xs sm:text-sm font-medium text-white tabular-nums break-all text-right">
                          {variable.value}
                        </span>
                        {variable.updated && (
                          <span className="px-2 py-0.5 rounded-full bg-white text-[#141414] text-[10px] font-semibold tracking-tight whitespace-nowrap">
                            UPDATED
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Console Output (stdout) Strip */}
            <div className="rounded-2xl bg-[#1F1F1F] border border-[#2E2E2E] overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[#2E2E2E] flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-[#A3A3A3] shrink-0" />
                <span className="text-xs font-medium text-white whitespace-nowrap">
                  Console Output (stdout)
                </span>
              </div>
              <div className="p-3.5 bg-[#141414] font-mono text-xs space-y-1 min-h-[76px] max-h-44 overflow-y-auto">
                {!currentStep || currentStep.stdout.length === 0 ? (
                  <div className="text-[#8E8E8E]">
                    No console output emitted yet at this step.
                  </div>
                ) : (
                  currentStep.stdout.map((line, i) => (
                    <div key={i} className="text-[#A3A3A3] tabular-nums">
                      <span className="text-[#8E8E8E] mr-2">&gt;</span>
                      <span className="text-white">{line}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
