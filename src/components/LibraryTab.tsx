'use client';

import React, { useMemo, useState } from 'react';
import { Bookmark, ChevronDown, ChevronUp, Play, Search } from 'lucide-react';
import { CONCEPTS } from '@/src/data/concepts';
import type { DeviceProfile, ProgramLanguage } from '@/src/types/algorithm';

interface LibraryTabProps {
  profile: DeviceProfile;
  bookmarkedIds: string[];
  onToggleBookmark: (conceptId: string) => void;
  onLoadSnippetInVisualizer: (language: ProgramLanguage, code: string) => void;
}

const CATEGORIES = [
  'All',
  'C Programming',
  'Data Structures',
  'Complexity',
  'Data Science',
] as const;

export const LibraryTab: React.FC<LibraryTabProps> = ({
  profile,
  bookmarkedIds,
  onToggleBookmark,
  onLoadSnippetInVisualizer,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(CONCEPTS[0].id);

  const filteredConcepts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return CONCEPTS.filter((card) => {
      if (selectedCategory !== 'All' && card.category !== selectedCategory) {
        return false;
      }
      if (onlyBookmarked && !bookmarkedIds.includes(card.id)) {
        return false;
      }
      if (!q) return true;
      return (
        card.title.toLowerCase().includes(q) ||
        card.summary.toLowerCase().includes(q) ||
        card.category.toLowerCase().includes(q)
      );
    });
  }, [selectedCategory, searchQuery, onlyBookmarked, bookmarkedIds]);

  const gridClass =
    profile === 'desktop'
      ? 'grid grid-cols-3 gap-4 items-start'
      : profile === 'tablet'
        ? 'grid grid-cols-2 gap-4 items-start'
        : 'space-y-3';

  return (
    <div className="space-y-4">
      {/* Header & Filter Bar */}
      <div className="rounded-2xl bg-[#1F1F1F] border border-[#2E2E2E] p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-0.5">
            <h2 className="text-base font-semibold text-white">
              Concept & Pattern Library
            </h2>
            <p className="text-xs text-[#8E8E8E] tabular-nums">
              Python & C fundamentals · {bookmarkedIds.length} bookmarked
            </p>
          </div>

          <button
            type="button"
            onClick={() => setOnlyBookmarked((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors min-h-[36px] whitespace-nowrap shrink-0 self-start sm:self-auto ${
              onlyBookmarked
                ? 'bg-white text-[#141414] border-white'
                : 'bg-[#2E2E2E] text-white border-[#454545] hover:bg-[#3A3A3A]'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Saved Only</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8E8E8E] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search concepts, pointers, Big-O, dicts..."
              className="w-full rounded-xl bg-[#141414] border border-[#2E2E2E] pl-9 pr-3 py-2 text-xs text-white placeholder-[#8E8E8E] focus:outline-none focus:border-white"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-colors min-h-[34px] ${
                    active
                      ? 'bg-white text-[#141414]'
                      : 'bg-[#141414] text-[#A3A3A3] border border-[#2E2E2E] hover:text-white hover:bg-[#2A2A2A]'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Adaptive Grid of Concept Cards */}
      {filteredConcepts.length === 0 ? (
        <div className="rounded-2xl bg-[#1F1F1F] border border-[#2E2E2E] p-8 text-center space-y-2">
          <p className="text-sm font-medium text-white">
            No matching concept cards
          </p>
          <p className="text-xs text-[#8E8E8E]">
            Clear your search or bookmark filter to view all concept guides.
          </p>
        </div>
      ) : (
        <div className={gridClass}>
          {filteredConcepts.map((card) => {
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
                      onLoadSnippetInVisualizer(
                        card.snippetLanguage,
                        card.snippet
                      )
                    }
                    className="w-full rounded-full bg-white text-[#141414] hover:bg-[#E5E5E5] py-2.5 px-4 text-xs font-medium inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Load {card.snippetLanguage} in Visualizer</span>
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
