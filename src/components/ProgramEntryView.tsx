'use client';

import React, { useState } from 'react';
import { AlertCircle, ArrowRight, Code2, Trash2 } from 'lucide-react';
import type { DeviceProfile, ProgramLanguage } from '@/src/types/algorithm';
import { traceProgram } from '@/src/utils/codeInterpreter';

interface ProgramEntryViewProps {
  profile: DeviceProfile;
  language: ProgramLanguage;
  code: string;
  onChangeLanguage: (lang: ProgramLanguage) => void;
  onChangeCode: (code: string) => void;
  onLaunchWorkspace: () => void;
}

const SAMPLE_PYTHON = `arr = [29, 10, 14, 37, 13]
n = len(arr)
for i in range(n - 1):
  for j in range(n - i - 1):
    if arr[j] > arr[j + 1]:
      arr[j], arr[j + 1] = arr[j + 1], arr[j]
print("Sorted:", arr)`;

const SAMPLE_C = `int main() {
  int arr[] = {29, 10, 14, 37, 13};
  int n = 5;
  for (int i = 0; i < n - 1; i++) {
    for (int j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        int temp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = temp;
      }
    }
  }
  printf("Sorted: %d %d", arr[0], arr[4]);
  return 0;
}`;

export function getSampleCode(lang: ProgramLanguage): string {
  return lang === 'Python' ? SAMPLE_PYTHON : SAMPLE_C;
}

export const ProgramEntryView: React.FC<ProgramEntryViewProps> = ({
  profile,
  language,
  code,
  onChangeLanguage,
  onChangeCode,
  onLaunchWorkspace,
}) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLanguagePick = (nextLang: ProgramLanguage) => {
    setErrorMsg(null);
    if (nextLang !== language) {
      const wasDefaultSample =
        code.trim() === SAMPLE_PYTHON.trim() ||
        code.trim() === SAMPLE_C.trim() ||
        code.trim().length === 0;
      onChangeLanguage(nextLang);
      if (wasDefaultSample) {
        onChangeCode(getSampleCode(nextLang));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length === 0) {
      setErrorMsg(
        `Paste a ${language} program above before launching the workspace.`
      );
      return;
    }
    const check = traceProgram(language, code);
    if (!check.ok) {
      setErrorMsg(
        `${check.error || 'Unable to parse program.'}${check.errorLine ? ` (Line ${check.errorLine})` : ''}`
      );
      return;
    }
    setErrorMsg(null);
    onLaunchWorkspace();
  };

  return (
    <div
      className={`w-full ${
        profile === 'desktop' ? 'max-w-4xl mx-auto py-8' : 'py-2'
      } space-y-4`}
    >
      {/* Hero / Prompt Header Card */}
      <div className="rounded-2xl bg-[#1F1F1F] border border-[#2E2E2E] p-5 space-y-2">
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">
          Paste Your Program
        </h2>
        <p className="text-xs sm:text-sm text-[#A3A3A3] leading-relaxed">
          Choose C or Python and paste your code below. The visualizer, concept
          library, quiz lab, and analytics will be generated exclusively from
          this program.
        </p>
      </div>

      {/* Program Playground Input Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-[#1F1F1F] border border-[#2E2E2E] overflow-hidden"
      >
        {/* Language Selection Row (Strictly Python or C) */}
        <div className="px-5 py-4 border-b border-[#2E2E2E] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-0.5">
            <div className="text-sm font-medium text-white whitespace-nowrap">
              Programming Language
            </div>
            <div className="text-xs text-[#8E8E8E]">
              Select either Python or C
            </div>
          </div>

          <div
            role="group"
            aria-label="Programming language selector"
            className="inline-flex items-center rounded-full bg-[#141414] border border-[#2E2E2E] p-1 gap-1 self-start sm:self-auto"
          >
            {(['Python', 'C'] as const).map((lang) => {
              const active = language === lang;
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => handleLanguagePick(lang)}
                  className={`px-5 py-2 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                    active
                      ? 'bg-white text-[#141414]'
                      : 'text-[#A3A3A3] hover:text-white'
                  }`}
                >
                  {lang}
                </button>
              );
            })}
          </div>
        </div>

        {/* Source Code Paste Area */}
        <div className="p-5 bg-[#141414] space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="playground-entry-code"
              className="block text-xs font-medium text-[#A3A3A3]"
            >
              {language} Source Code
            </label>
            <textarea
              id="playground-entry-code"
              value={code}
              onChange={(e) => {
                setErrorMsg(null);
                onChangeCode(e.target.value);
              }}
              spellCheck={false}
              rows={12}
              placeholder={
                language === 'Python'
                  ? 'Paste your Python program here...'
                  : 'Paste your C program here...'
              }
              className="w-full rounded-2xl bg-[#0E0E0E] border border-[#2E2E2E] p-4 font-mono text-xs sm:text-sm text-white leading-6 placeholder-[#8E8E8E] focus:outline-none focus:border-white resize-y whitespace-pre overflow-x-auto"
            />
          </div>

          {errorMsg && (
            <div className="rounded-xl bg-[#1F1F1F] border border-white p-3.5 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-white shrink-0 mt-0.5" />
              <div className="text-xs text-white leading-relaxed">
                {errorMsg}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  onChangeCode('');
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#2E2E2E] border border-[#454545] px-4 py-2.5 text-xs font-medium text-white hover:bg-[#3A3A3A] whitespace-nowrap shrink-0 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  onChangeCode(getSampleCode(language));
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#2E2E2E] border border-[#454545] px-4 py-2.5 text-xs font-medium text-white hover:bg-[#3A3A3A] whitespace-nowrap shrink-0 transition-colors"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Load {language} Sample</span>
              </button>
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white text-[#141414] hover:bg-[#E5E5E5] px-6 py-3 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors"
            >
              <span>Visualize, Library, Quiz & Analytics</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
