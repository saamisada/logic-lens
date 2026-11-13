'use client';

import React from 'react';
import { Check, Download, Settings } from 'lucide-react';

interface HeaderProps {
  ratioLabel: string;
  isInstalled: boolean;
  onInstallClick: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  ratioLabel,
  isInstalled,
  onInstallClick,
  onOpenSettings,
}) => {
  return (
    <header className="sticky top-0 z-30 h-14 w-full bg-[#141414]/95 backdrop-blur-md border-b border-[#2E2E2E] px-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className="h-8 w-8 rounded-xl bg-[#1F1F1F] border border-[#2E2E2E] flex items-center justify-center shrink-0"
          aria-hidden="true"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            className="text-white"
          >
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
            <path
              d="M9.5 9.5L7 12L9.5 14.5M14.5 9.5L17 12L14.5 14.5M12 8.5V15.5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="min-w-0">
          <h1 className="text-base font-semibold tracking-tight text-white leading-tight truncate">
            LogicLens
          </h1>
          <p className="text-[11px] text-[#A3A3A3] leading-tight truncate">
            {ratioLabel}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onInstallClick}
          className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 min-h-[36px] ${
            isInstalled
              ? 'bg-[#2E2E2E] text-white border border-[#454545]'
              : 'bg-white text-[#141414] hover:bg-[#E5E5E5]'
          }`}
          aria-label={isInstalled ? 'App installed' : 'Install App'}
        >
          {isInstalled ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Installed</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              <span>Install App</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          className="h-10 w-10 rounded-full bg-[#1F1F1F] border border-[#2E2E2E] text-[#A3A3A3] hover:text-white hover:bg-[#2A2A2A] flex items-center justify-center transition-colors shrink-0"
          aria-label="Open settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
