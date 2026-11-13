'use client';

import React, { useMemo, useState } from 'react';
import { Bookmark, ChevronDown, ChevronUp, Play } from 'lucide-react';
import type {
  ConceptCard,
  DeviceProfile,
  ProgramLanguage,
} from '@/src/types/algorithm';

interface LibraryTabProps {
  profile: DeviceProfile;
  language: ProgramLanguage;
  concepts: ConceptCard[];
  bookmarkedIds: string[];
  onToggleBookmark: (conceptId: string) => void;
  onJumpToStepInVisualizer: (stepIndex: number) => void;
}

export const LibraryTab: React.FC<LibraryTabProps> = ({
  profile,
  language,
  concepts,
  bookmarkedIds,
  onToggleBookmark,
  onJumpToStepInVisualizer,
}) => {
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(
    concepts[0]?.id ?? null
  );

  const visibleConcepts = useMemo(() => {
    if (!onlyBookmarked) return concepts;
    return concepts.filter((c) => bookmarkedIds.includes(c.id));
  }, [concepts, onlyBookmarked, bookmarkedIds]);

  const gridClass =
    profile === 'desktop'
      ? 'grid grid-cols-3 gap-4 items-start'
      : profile === 'tablet'
        ? 'grid grid-cols-2 gap-4 items-start'
        : 'space-y-3';

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="rounded-2xl bg-[#1F1F1F] border border-[#2E2E2E] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-0.5">
          <h2 className="text-base font-semibold text-white">
            Program Concept Library
          </h2>
          <p className="text-xs text-[#8E8E8E]">
            {concepts.length} concept breakdown{concepts.length === 1 ? '' : 's'}{' '}
            extracted directly from your {language} playground program
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOnlyBookmarked((prev) => !prev)}
          className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium border transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto ${
            onlyBookmarked
              ? 'bg-white text-[#141414] border-white'
              : 'bg-[#2E2E2E] text-white border-[#454545] hover:bg-[#3A3A3A]'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>Saved Only</span>
        </button>
      </div>

      {/* Concept Cards Grid */}
      {visibleConcepts.length === 0 ? (
        <div className="rounded-2xl bg-[#1F1F1F] border border-[#2E2E2E] p-8 text-center space-y-2">
          <p className="text-sm font-medium text-white">
            No saved concept cards yet
          </p>
          <p className="text-xs text-[#8E8E8E]">
            Bookmark any concept card from your program or disable the Saved
            Only filter.
          </p>
        </div>
      ) : (
        <div className={gridClass}>
          {visibleConcepts.map((card) => {
            const isBookmarked = bookmarkedIds.includes(card.id);
            const isExpanded =
              profile === 'desktop' || expandedId === card.id;

            return (
              <article
                key={card.id}
                className="rounded-2xl bg-[#1F1F1F] border border-[#2E2E2E] p-4 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="text-xs text-[#8E8E8E]">
                        {card.category} · {card.readTime}
                      </div>
                      <h3 className="text-base font-semibold text-white leading-snug">
                        {card.title}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleBookmark(card.id)}
                      className={`h-9 w-9 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                        isBookmarked
                          ? 'bg-white text-[#141414] border-white'
                          : 'bg-[#141414] text-[#A3A3A3] border-[#2E2E2E] hover:text-white hover:bg-[#2A2A2A]'
                      }`}
                      aria-label={
                        isBookmarked ? 'Remove bookmark' : 'Bookmark concept'
                      }
                    >
                      <Bookmark className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-[#A3A3A3] leading-relaxed">
                    {card.summary}
                  </p>

                  {profile !== 'desktop' && (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId(isExpanded ? null : card.id)
                      }
                      className="inline-flex items-center gap-1 text-xs font-medium text-white hover:underline underline-offset-4 whitespace-nowrap"
                    >
                      <span>
                        {isExpanded ? 'Hide Breakdown' : 'Read Breakdown'}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}

                  {isExpanded && (
                    <div className="space-y-3 pt-2 border-t border-[#2E2E2E]">
                      <ul className="space-y-1.5 text-xs text-[#A3A3A3] list-disc list-inside leading-relaxed">
                        {card.details.map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                      </ul>

                      <pre className="rounded-xl bg-[#141414] border border-[#2E2E2E] p-3 font-mono text-[11px] text-white overflow-x-auto leading-relaxed">
                        <code className="whitespace-pre">{card.snippet}</code>
                      </pre>

                      <div className="rounded-xl bg-[#141414] border border-[#2E2E2E] p-3 text-xs text-[#A3A3A3] space-y-1">
                        <div className="font-medium text-white">Key Note</div>
                        <div>{card.takeaway}</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      onJumpToStepInVisualizer(card.targetStepIndex)
                    }
                    className="w-full rounded-full bg-white text-[#141414] hover:bg-[#E5E5E5] py-2.5 px-4 text-xs font-medium inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Inspect in Visualizer</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
