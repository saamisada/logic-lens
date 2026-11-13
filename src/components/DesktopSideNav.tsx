'use client';

import React from 'react';
import {
  BarChart3,
  BookOpen,
  Check,
  CheckSquare,
  Download,
  PlaySquare,
  Settings,
} from 'lucide-react';
import type { TabId } from '@/src/types/algorithm';

interface DesktopSideNavProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  ratioLabel: string;
  dimensionsLabel: string;
  isInstalled: boolean;
  onInstallClick: () => void;
  onOpenSettings: () => void;
}

const NAV_ITEMS: Array<{
  id: TabId;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'visualize',
    label: 'Visualize',
    subtitle: 'Step-by-step tracer',
    icon: PlaySquare,
  },
  {
    id: 'library',
    label: 'Library',
    subtitle: 'Concepts & patterns',
    icon: BookOpen,
  },
  {
    id: 'quiz',
    label: 'Quiz',
    subtitle: 'Dry-run output lab',
    icon: CheckSquare,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    subtitle: 'Readiness & activity',
    icon: BarChart3,
  },
];

export const DesktopSideNav: React.FC<DesktopSideNavProps> = ({
  activeTab,
  onSelectTab,
  ratioLabel,
  dimensionsLabel,
  isInstalled,
  onInstallClick,
  onOpenSettings,
}) => {
  return (
    <aside className="w-64 shrink-0 h-full bg-[#141414] border-r border-[#2E2E2E] flex flex-col justify-between p-4 select-none">
      <div className="space-y-6">
        {/* Brand Block */}
        <div className="px-2 pt-1 flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-2xl bg-[#1F1F1F] border border-[#2E2E2E] flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              className="text-white"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="1.75"
              />
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
            <div className="text-base font-semibold tracking-tight text-white whitespace-nowrap">
              LogicLens
            </div>
            <div className="text-xs text-[#8E8E8E] whitespace-nowrap">
              Python & C Visualizer
            </div>
          </div>
        </div>

        {/* Ratio Telemetry Row */}
        <div className="rounded-2xl bg-[#1F1F1F] border border-[#2E2E2E] px-3.5 py-2.5 space-y-0.5">
          <div className="text-[11px] text-[#8E8E8E] whitespace-nowrap">
            Active Viewport
          </div>
          <div className="text-xs font-medium text-white tabular-nums whitespace-nowrap">
            {ratioLabel}
          </div>
          <div className="text-[11px] font-mono text-[#8E8E8E] tabular-nums whitespace-nowrap">
            {dimensionsLabel}
          </div>
        </div>

        {/* Vertical Android-Settings Navigation Rows */}
        <nav aria-label="Desktop workspace navigation" className="space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-left transition-colors ${
                  isActive
                    ? 'bg-[#2A2A2A] text-white border border-[#454545]'
                    : 'text-[#A3A3A3] hover:bg-[#1F1F1F] hover:text-white border border-transparent'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-white' : 'text-[#8E8E8E]'
                  }`}
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium leading-tight">
                    {item.label}
                  </div>
                  <div className="text-[11px] text-[#8E8E8E] leading-tight mt-0.5 truncate">
                    {item.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Action Group */}
      <div className="space-y-2.5 pt-4 border-t border-[#2E2E2E]">
        <button
          type="button"
          onClick={onInstallClick}
          className={`w-full flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-medium transition-colors whitespace-nowrap ${
            isInstalled
              ? 'bg-[#2E2E2E] text-white border border-[#454545]'
              : 'bg-white text-[#141414] hover:bg-[#E5E5E5]'
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
              <span>Install App</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl bg-[#1F1F1F] border border-[#2E2E2E] text-[#A3A3A3] hover:text-white hover:bg-[#2A2A2A] transition-colors text-left"
        >
          <Settings className="w-4 h-4 shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-medium text-white leading-tight">
              Settings
            </div>
            <div className="text-[11px] text-[#8E8E8E] leading-tight mt-0.5">
              Layout & BYOK Key
            </div>
          </div>
        </button>
      </div>
    </aside>
  );
};
