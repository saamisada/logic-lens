'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { AnalyticsTab } from '@/src/components/AnalyticsTab';
import { BottomNav } from '@/src/components/BottomNav';
import { DesktopSideNav } from '@/src/components/DesktopSideNav';
import { Header } from '@/src/components/Header';
import { InstallGuideModal } from '@/src/components/InstallGuideModal';
import { LibraryTab } from '@/src/components/LibraryTab';
import {
  getSampleCode,
  ProgramEntryView,
} from '@/src/components/ProgramEntryView';
import { QuizTab } from '@/src/components/QuizTab';
import { SettingsModal } from '@/src/components/SettingsModal';
import { VisualizerTab } from '@/src/components/VisualizerTab';
import { useDeviceLayout } from '@/src/hooks/useDeviceLayout';
import { usePwaInstall } from '@/src/hooks/usePwaInstall';
import type {
  ProgramLanguage,
  StudentAnalytics,
  TabId,
} from '@/src/types/algorithm';
import { traceProgram } from '@/src/utils/codeInterpreter';
import { analyzePlaygroundProgram } from '@/src/utils/programAnalyzer';
import { registerServiceWorker } from '@/src/utils/registerSw';
import {
  createDefaultAnalytics,
  loadAnalytics,
  loadUserGeminiKey,
  recordQuizSubmission,
  recordStepExecution,
  recordTraceExecution,
  resetProgramQuizAnswers,
  saveUserGeminiKey,
  toggleConceptBookmark,
} from '@/src/utils/storage';

export default function App() {
  const layout = useDeviceLayout();
  const pwa = usePwaInstall();

  const [hasWorkspace, setHasWorkspace] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('visualize');
  const [language, setLanguage] = useState<ProgramLanguage>('Python');
  const [code, setCode] = useState<string>(() => getSampleCode('Python'));
  const [paramOverrides, setParamOverrides] = useState<Record<string, string>>(
    {}
  );
  const [stepIndex, setStepIndex] = useState(0);

  const [analytics, setAnalytics] = useState<StudentAnalytics>(
    createDefaultAnalytics
  );
  const [geminiKey, setGeminiKey] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    registerServiceWorker();

    const rafId = window.requestAnimationFrame(() => {
      setAnalytics(loadAnalytics());
      setGeminiKey(loadUserGeminiKey());
      if (typeof navigator !== 'undefined') {
        setIsOnline(navigator.onLine);
      }
    });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const trace = useMemo(
    () => traceProgram(language, code, paramOverrides),
    [language, code, paramOverrides]
  );

  const analysis = useMemo(
    () => analyzePlaygroundProgram(language, code, trace),
    [language, code, trace]
  );

  const handleLaunchWorkspace = useCallback(() => {
    setStepIndex(0);
    setHasWorkspace(true);
    setActiveTab('visualize');
    setAnalytics((prev) =>
      recordTraceExecution(resetProgramQuizAnswers(prev), language)
    );
  }, [language]);

  const handleOpenProgramEntry = useCallback(() => {
    setHasWorkspace(false);
  }, []);

  const handleStepExecuted = useCallback(() => {
    setAnalytics((prev) => recordStepExecution(prev));
  }, []);

  const handleSubmitQuizAnswer = useCallback(
    (questionId: string, selectedOption: number) => {
      setAnalytics((prev) =>
        recordQuizSubmission(prev, questionId, selectedOption)
      );
    },
    []
  );

  const handleResetQuiz = useCallback(() => {
    setAnalytics((prev) => resetProgramQuizAnswers(prev));
  }, []);

  const handleToggleBookmark = useCallback((conceptId: string) => {
    setAnalytics((prev) => toggleConceptBookmark(prev, conceptId));
  }, []);

  const handleJumpToStepInVisualizer = useCallback((targetIdx: number) => {
    setStepIndex(Math.max(0, targetIdx));
    setActiveTab('visualize');
  }, []);

  const handleSaveGeminiKey = useCallback((key: string) => {
    saveUserGeminiKey(key);
    setGeminiKey(key.trim());
  }, []);

  const handleInstallClick = useCallback(() => {
    void pwa.installApp();
  }, [pwa]);

  const workspaceContent = !hasWorkspace ? (
    <ProgramEntryView
      profile={layout.effectiveProfile}
      language={language}
      code={code}
      onChangeLanguage={(nextLang) => {
        setLanguage(nextLang);
        setParamOverrides({});
      }}
      onChangeCode={setCode}
      onLaunchWorkspace={handleLaunchWorkspace}
    />
  ) : (
    <>
      {activeTab === 'visualize' && (
        <VisualizerTab
          profile={layout.effectiveProfile}
          language={language}
          code={code}
          trace={trace}
          stepIndex={stepIndex}
          onChangeStepIndex={setStepIndex}
          paramOverrides={paramOverrides}
          onChangeParamOverrides={setParamOverrides}
          onStepExecuted={handleStepExecuted}
          onEditPlaygroundProgram={handleOpenProgramEntry}
          geminiKey={geminiKey}
        />
      )}

      {activeTab === 'library' && (
        <LibraryTab
          profile={layout.effectiveProfile}
          language={language}
          concepts={analysis.concepts}
          bookmarkedIds={analytics.bookmarkedConceptIds}
          onToggleBookmark={handleToggleBookmark}
          onJumpToStepInVisualizer={handleJumpToStepInVisualizer}
        />
      )}

      {activeTab === 'quiz' && (
        <QuizTab
          profile={layout.effectiveProfile}
          language={language}
          questions={analysis.quizzes}
          answeredMap={analytics.answeredQuizMap}
          onSubmitAnswer={handleSubmitQuizAnswer}
          onResetQuiz={handleResetQuiz}
          onJumpToStepInVisualizer={handleJumpToStepInVisualizer}
        />
      )}

      {activeTab === 'analytics' && (
        <AnalyticsTab
          profile={layout.effectiveProfile}
          language={language}
          trace={trace}
          analysis={analysis}
          questions={analysis.quizzes}
          answeredMap={analytics.answeredQuizMap}
          onEditPlaygroundProgram={handleOpenProgramEntry}
        />
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-[#0E0E0E] text-white">
      {!isOnline && (
        <div className="fixed top-3 right-3 z-50 rounded-full bg-[#1F1F1F] border border-[#454545] px-3 py-1.5 text-xs text-white flex items-center gap-1.5 shadow-lg whitespace-nowrap">
          <WifiOff className="w-3.5 h-3.5 text-[#A3A3A3]" />
          <span>Offline Mode</span>
        </div>
      )}

      {layout.effectiveProfile === 'desktop' ? (
        <div className="w-full h-screen flex overflow-hidden bg-[#141414]">
          <DesktopSideNav
            hasWorkspace={hasWorkspace}
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            onOpenProgramEntry={handleOpenProgramEntry}
            ratioLabel={layout.ratioLabel}
            dimensionsLabel={`${layout.width}x${layout.height}`}
            isInstalled={pwa.isInstalled}
            onInstallClick={handleInstallClick}
            onOpenSettings={() => setSettingsOpen(true)}
          />

          <main className="flex-1 h-full overflow-y-auto bg-[#0E0E0E]">
            <div className="max-w-7xl mx-auto p-6">{workspaceContent}</div>
          </main>
        </div>
      ) : (
        <div
          className={`min-h-[100dvh] bg-[#141414] flex flex-col ${
            layout.effectiveProfile === 'tablet'
              ? 'max-w-3xl mx-auto border-x border-[#2E2E2E]'
              : 'w-full'
          }`}
        >
          <Header
            ratioLabel={layout.ratioLabel}
            isInstalled={pwa.isInstalled}
            onInstallClick={handleInstallClick}
            onOpenSettings={() => setSettingsOpen(true)}
          />

          <main className={`flex-1 p-4 bg-[#0E0E0E] ${hasWorkspace ? 'pb-24' : 'pb-6'}`}>
            {workspaceContent}
          </main>

          {hasWorkspace && (
            <BottomNav activeTab={activeTab} onSelectTab={setActiveTab} />
          )}
        </div>
      )}

      {settingsOpen && (
        <SettingsModal
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          layoutOverride={layout.override}
          onChangeLayoutOverride={layout.setLayoutOverride}
          ratioLabel={layout.ratioLabel}
          width={layout.width}
          height={layout.height}
          aspectRatio={layout.aspectRatio}
          isInstalled={pwa.isInstalled}
          onInstallClick={handleInstallClick}
          geminiKey={geminiKey}
          onSaveGeminiKey={handleSaveGeminiKey}
        />
      )}

      <InstallGuideModal
        isOpen={pwa.showGuideModal}
        isIOS={pwa.isIOS}
        onClose={() => pwa.setShowGuideModal(false)}
      />
    </div>
  );
}
