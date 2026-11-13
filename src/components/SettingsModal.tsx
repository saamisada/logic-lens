'use client';

import React, { useState } from 'react';
import { Check, Download, Eye, EyeOff, KeyRound, Monitor, Smartphone, Tablet, X } from 'lucide-react';
import type { LayoutModeOverride } from '@/src/types/algorithm';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  layoutOverride: LayoutModeOverride;
  onChangeLayoutOverride: (mode: LayoutModeOverride) => void;
  ratioLabel: string;
  width: number;
  height: number;
  aspectRatio: number;
  isInstalled: boolean;
  onInstallClick: () => void;
  geminiKey: string;
  onSaveGeminiKey: (key: string) => void;
}

const LAYOUT_OPTIONS: Array<{
  id: LayoutModeOverride;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'auto', label: 'Auto (Ratio)', icon: Monitor },
  { id: 'mobile', label: 'Mobile 9:16', icon: Smartphone },
  { id: 'tablet', label: 'Tablet 4:3', icon: Tablet },
  { id: 'desktop', label: 'Desktop 16:9', icon: Monitor },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  layoutOverride,
  onChangeLayoutOverride,
  ratioLabel,
  width,
  height,
  aspectRatio,
  isInstalled,
  onInstallClick,
  geminiKey,
  onSaveGeminiKey,
}) => {
  const [draftKey, setDraftKey] = useState(geminiKey);
  const [showKey, setShowKey] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  if (!isOpen) return null;

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveGeminiKey(draftKey);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 1800);
  };

  const handleClearKey = () => {
    setDraftKey('');
    onSaveGeminiKey('');
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 1800);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl bg-[#141414] border border-[#2E2E2E] overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#2E2E2E] flex items-center justify-between">
          <div>
            <h2
              id="settings-modal-title"
              className="text-base font-semibold text-white"
            >
              Settings
            </h2>
            <p className="text-xs text-[#8E8E8E]">
              Display layout, PWA shortcut, and local BYOK configuration
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-[#1F1F1F] border border-[#2E2E2E] text-[#A3A3A3] hover:text-white hover:bg-[#2A2A2A] flex items-center justify-center transition-colors"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Android-Settings Preference Groups */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Group 1: Adaptive Layout Override */}
          <section className="rounded-2xl bg-[#1F1F1F] border border-[#2E2E2E] overflow-hidden">
            <div className="px-4 py-3.5 border-b border-[#2E2E2E]">
              <div className="text-sm font-medium text-white">
                Layout Mode
              </div>
              <div className="text-xs text-[#8E8E8E] mt-0.5 tabular-nums">
                Active: {ratioLabel} ({width} x {height}px, ratio {aspectRatio})
              </div>
            </div>
            <div className="p-3 grid grid-cols-2 gap-2">
              {LAYOUT_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = layoutOverride === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChangeLayoutOverride(opt.id)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium border transition-colors min-h-[42px] ${
                      active
                        ? 'bg-white text-[#141414] border-white'
                        : 'bg-[#141414] text-[#A3A3A3] border-[#2E2E2E] hover:bg-[#2A2A2A] hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Group 2: PWA Install Shortcut */}
          <section className="rounded-2xl bg-[#1F1F1F] border border-[#2E2E2E] overflow-hidden">
            <button
              type="button"
              onClick={onInstallClick}
              className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-[#2A2A2A] transition-colors"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-white">
                  Add to Home Screen / Install Shortcut
                </div>
                <div className="text-xs text-[#8E8E8E] mt-0.5">
                  {isInstalled
                    ? 'LogicLens is running in standalone installed mode.'
                    : 'Install offline-capable LogicLens app icon on your device.'}
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium shrink-0 ${
                  isInstalled
                    ? 'bg-[#2E2E2E] text-white border border-[#454545]'
                    : 'bg-white text-[#141414]'
                }`}
              >
                {isInstalled ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Installed</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Install</span>
                  </>
                )}
              </span>
            </button>
          </section>

          {/* Group 3: Optional BYOK Gemini API Key */}
          <section className="rounded-2xl bg-[#1F1F1F] border border-[#2E2E2E] overflow-hidden">
            <div className="px-4 py-3.5 border-b border-[#2E2E2E] flex items-start gap-3">
              <KeyRound className="w-4 h-4 text-[#A3A3A3] mt-0.5 shrink-0" />
              <div>
                <div className="text-sm font-medium text-white">
                  Optional AI Tutor Key (BYOK)
                </div>
                <div className="text-xs text-[#8E8E8E] mt-0.5">
                  Stored strictly in your browser localStorage under{' '}
                  <code className="font-mono text-[#A3A3A3]">
                    logiclens_user_gemini_key
                  </code>
                  . All tracing works 100% offline without any key.
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveKey} className="p-4 space-y-3">
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={draftKey}
                  onChange={(e) => setDraftKey(e.target.value)}
                  placeholder="Paste your personal Gemini API key (optional)"
                  className="w-full rounded-xl bg-[#141414] border border-[#2E2E2E] px-3.5 py-2.5 pr-10 text-xs font-mono text-white placeholder-[#8E8E8E] focus:outline-none focus:border-white"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8E8E8E] hover:text-white p-1"
                  aria-label={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleClearKey}
                  className="rounded-full bg-[#2E2E2E] border border-[#454545] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#3A3A3A] transition-colors"
                >
                  Clear Key
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-white px-4 py-1.5 text-xs font-medium text-[#141414] hover:bg-[#E5E5E5] transition-colors"
                >
                  {savedFeedback ? 'Saved Locally' : 'Save Key'}
                </button>
              </div>
            </form>
          </section>

          {/* Group 4: About */}
          <section className="rounded-2xl bg-[#1F1F1F] border border-[#2E2E2E] px-4 py-3.5 space-y-1 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-white font-medium whitespace-nowrap">
                LogicLens · Python & C
              </span>
              <span className="font-mono text-[#8E8E8E] whitespace-nowrap">
                MIT License
              </span>
            </div>
            <div className="font-mono text-[11px] text-[#8E8E8E]">
              logiclens-bysada.vercel.app
            </div>
            <div className="font-mono text-[11px] text-[#8E8E8E]">
              github.com/saamisada/logic-lens
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
