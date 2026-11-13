'use client';

import React from 'react';
import { BarChart3, BookOpen, CheckSquare, PlaySquare } from 'lucide-react';
import type { TabId } from '@/src/types/algorithm';

interface BottomNavProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
}

const NAV_ITEMS: Array<{
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'visualize', label: 'Visualize', icon: PlaySquare },
  { id: 'library', label: 'Library', icon: BookOpen },
  { id: 'quiz', label: 'Quiz', icon: CheckSquare },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
}) => {
  return (
    <nav
      aria-label="Primary mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-30 h-16 bg-[#141414]/95 backdrop-blur-md border-t border-[#2E2E2E] grid grid-cols-4 items-center px-2"
    >
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectTab(item.id)}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-1 rounded-xl transition-colors ${
              isActive
                ? 'text-white'
                : 'text-[#8E8E8E] hover:text-white'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            <span
              className={`px-3.5 py-1 rounded-full transition-colors ${
                isActive ? 'bg-[#2A2A2A]' : 'bg-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-medium tracking-tight leading-none">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
