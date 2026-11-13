'use client';

import React from 'react';
import type { ArrayPointer } from '@/src/types/algorithm';

interface ArrayVisualStageProps {
  arrayState: number[];
  arrayLabel?: string;
  pointers: ArrayPointer[];
  comparedIndices?: number[];
  swappedIndices?: number[];
  auxiliaryPairs?: { key: string; value: number; updated?: boolean }[];
  auxiliaryLabel?: string;
}

export const ArrayVisualStage: React.FC<ArrayVisualStageProps> = ({
  arrayState,
  arrayLabel = 'arr[]',
  pointers,
  comparedIndices = [],
  swappedIndices = [],
  auxiliaryPairs,
  auxiliaryLabel = 'freq',
}) => {
  const getPointersForIndex = (idx: number) =>
    pointers.filter((p) => p.index === idx);

  return (
    <div className="rounded-2xl bg-[#1F1F1F] border border-[#2E2E2E] p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="space-y-0.5">
          <h3 className="text-sm font-medium text-white whitespace-nowrap">
            Memory Array & Pointer Tracker
          </h3>
          <p className="text-xs text-[#8E8E8E]">
            {arrayState.length > 0
              ? `${arrayLabel} · ${arrayState.length} element${arrayState.length === 1 ? '' : 's'}`
              : 'No numeric array active in scope yet'}
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-[#A3A3A3] shrink-0">
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="h-2.5 w-2.5 rounded-sm border border-white bg-[#2A2A2A]" />
            Active
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="h-2.5 w-2.5 rounded-sm bg-white" />
            Modified
          </span>
        </div>
      </div>

      {arrayState.length === 0 ? (
        <div className="rounded-xl bg-[#141414] border border-[#2E2E2E] py-5 px-4 text-center font-mono text-xs text-[#8E8E8E]">
          Declare or pass an array/list in your code to track elements and
          index pointers automatically.
        </div>
      ) : (
        <div className="overflow-x-auto pb-1">
          <div className="flex items-start gap-2 min-w-max">
            {arrayState.map((val, idx) => {
              const isSwapped = swappedIndices.includes(idx);
              const isCompared = comparedIndices.includes(idx);
              const activePointers = getPointersForIndex(idx);

              let boxStyle = 'bg-[#141414] border-[#2E2E2E] text-white';
              if (isSwapped) {
                boxStyle =
                  'bg-white border-white text-[#141414] font-semibold';
              } else if (isCompared) {
                boxStyle = 'bg-[#2A2A2A] border-white text-white';
              }

              return (
                <div
                  key={`${idx}-${val}`}
                  className="flex flex-col items-center gap-1.5 min-w-[52px]"
                >
                  <span className="font-mono text-[10px] text-[#8E8E8E] tabular-nums whitespace-nowrap">
                    [{idx}]
                  </span>

                  <div
                    className={`w-13 h-13 rounded-xl border flex items-center justify-center font-mono text-sm tabular-nums transition-colors duration-150 ${boxStyle}`}
                  >
                    {val}
                  </div>

                  {/* Attached Pointer Pills */}
                  <div className="min-h-[22px] flex flex-wrap items-center justify-center gap-1">
                    {activePointers.map((ptr) => (
                      <span
                        key={ptr.name}
                        className="px-2 py-0.5 rounded-full bg-white text-[#141414] font-mono text-[10px] font-semibold leading-none whitespace-nowrap"
                      >
                        {ptr.name}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Auxiliary Key-Value Map */}
      {auxiliaryPairs && (
        <div className="pt-3 border-t border-[#2E2E2E] space-y-2">
          <div className="text-xs font-medium text-[#A3A3A3]">
            Dictionary State ({auxiliaryLabel})
          </div>
          {auxiliaryPairs.length === 0 ? (
            <div className="font-mono text-xs text-[#8E8E8E]">
              {`${auxiliaryLabel} = {}`}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {auxiliaryPairs.map((pair) => (
                <div
                  key={pair.key}
                  className={`rounded-xl px-3 py-1.5 font-mono text-xs tabular-nums border flex items-center gap-2 whitespace-nowrap ${
                    pair.updated
                      ? 'bg-[#2A2A2A] border-white text-white'
                      : 'bg-[#141414] border-[#2E2E2E] text-[#A3A3A3]'
                  }`}
                >
                  <span>{pair.key}</span>
                  <span className="text-[#8E8E8E]">-&gt;</span>
                  <span className="font-semibold text-white">{pair.value}</span>
                  {pair.updated && (
                    <span className="px-1.5 py-0.5 rounded-full bg-white text-[#141414] text-[9px] font-semibold">
                      UPDATED
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
