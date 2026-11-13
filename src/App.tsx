'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { AnalyticsTab } from '@/src/components/AnalyticsTab';
import { BottomNav } from '@/src/components/BottomNav';
import { DesktopSideNav } from '@/src/components/DesktopSideNav';
import { Header } from '@/src/components/Header';
import { InstallGuideModal } from '@/src/components/InstallGuideModal';
import { LibraryTab } from '@/src/components/LibraryTab';
import { QuizTab } from '@/src/components/QuizTab';
import { SettingsModal } from '@/src/components/SettingsModal';
import {
  getDefaultStarterCode,
  VisualizerTab,
} from '@/src/components/VisualizerTab';
import { useDeviceLayout } from '@/src/hooks/useDeviceLayout';
import { usePwaInstall } from '@/src/hooks/usePwaInstall';
import type {
  ProgramLanguage,
  StudentAnalytics,
  TabId,
} from '@/src/types/algorithm';
import { registerServiceWorker } from '@/src/utils/registerSw';
import {
  createDefaultAnalytics,
  loadAnalytics,
  loadUserGeminiKey,
  recordQuizSubmission,
  recordStepExecution,
  recordTraceExecution,
  resetAllAnalytics,
  resetAllQuizAnswers,
  saveUserGeminiKey,
  toggleConceptBookmark,
} from '@/src/utils/storage';

export default function App() {
  const layout = useDeviceLayout();
  const pwa = usePwaInstall();

  const [activeTab, setActiveTab] = useState<TabId>('visualize');
  const [language, setLanguage] = useState<ProgramLanguage>('Python');
  const [code, setCode] = useState<string>(() =>
    getDefaultStarterCode('Python')
  );
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

  const handleTraceExecuted = useCallback((lang: ProgramLanguage) => {
    setAnalytics((prev) => recordTraceExecution(prev, lang));
  }, []);

  const handleStepExecuted = useCallback(() => {
    setAnalytics((prev) => recordStepExecution(prev));
  }, []);

  const handleSubmitQuizAnswer = useCallback(
    (questionId: string, selectedOption: number, isCorrect: boolean) => {
      setAnalytics((prev) =>
        recordQuizSubmission(prev, questionId, selectedOption, isCorrect)
      );
    },
    []
  );

  const handleResetQuiz = useCallback(() => {
    setAnalytics((prev) => resetAllQuizAnswers(prev));
  }, []);

  const handleToggleBookmark = useCallback((conceptId: string) => {
    setAnalytics((prev) => toggleConceptBookmark(prev, conceptId));
  }, []);

  const handleResetAnalytics = useCallback(() => {
    setAnalytics(resetAllAnalytics());
  }, []);

  const handleLoadCodeInVisualizer = useCallback(
    (nextLang: ProgramLanguage, nextCode: string) => {
      setLanguage(nextLang);
      setCode(nextCode);
      setActiveTab('visualize');
    },
    []
  );

  const handleSaveGeminiKey = useCallback((key: string) => {
    saveUserGeminiKey(key);
    setGeminiKey(key.trim());
  }, []);

  const handleInstallClick = useCallback(() => {
    void pwa.installApp();
  }, [pwa]);

  const activeContent = (
    <>
      {activeTab === 'visualize' && (
        <VisualizerTab
          profile={layout.effectiveProfile}
          language={language}
          code={code}
          onChangeLanguage={setLanguage}
          onChangeCode={setCode}
          onTraceExecuted={handleTraceExecuted}
          onStepExecuted={handleStepExecuted}
          geminiKey={geminiKey}
        />
      )}

      {activeTab === 'library' && (
        <LibraryTab
          profile={layout.effectiveProfile}
          bookmarkedIds={analytics.bookmarkedConceptIds}
          onToggleBookmark={handleToggleBookmark}
          onLoadSnippetInVisualizer={handleLoadCodeInVisualizer}
        />
      )}

      {activeTab === 'quiz' && (
        <QuizTab
          profile={layout.effectiveProfile}
          answeredMap={analytics.answeredQuizMap}
          onSubmitAnswer={handleSubmitQuizAnswer}
          onResetQuiz={handleResetQuiz}
          onTraceCodeInVisualizer={handleLoadCodeInVisualizer}
        />
      )}

      {activeTab === 'analytics' && (
        <AnalyticsTab
          profile={layout.effectiveProfile}
          analytics={analytics}
          onResetAnalytics={handleResetAnalytics}
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
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            ratioLabel={layout.ratioLabel}
            dimensionsLabel={`${layout.width}x${layout.height}`}
            isInstalled={pwa.isInstalled}
            onInstallClick={handleInstallClick}
            onOpenSettings={() => setSettingsOpen(true)}
          />

          <main className="flex-1 h-full overflow-y-auto bg-[#0E0E0E]">
            <div className="max-w-7xl mx-auto p-6">{activeContent}</div>
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

          <main className="flex-1 p-4 pb-24 bg-[#0E0E0E]">
            {activeContent}
          </main>

          <BottomNav activeTab={activeTab} onSelectTab={setActiveTab} />
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
