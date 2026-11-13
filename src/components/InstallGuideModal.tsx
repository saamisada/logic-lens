'use client';

import React from 'react';
import { Monitor, Share, Smartphone, X } from 'lucide-react';

interface InstallGuideModalProps {
  isOpen: boolean;
  isIOS: boolean;
  onClose: () => void;
}

export const InstallGuideModal: React.FC<InstallGuideModalProps> = ({
  isOpen,
  isIOS,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-guide-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-[#141414] border border-[#2E2E2E] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#2E2E2E] flex items-center justify-between">
          <div>
            <h2
              id="install-guide-title"
              className="text-base font-semibold text-white"
            >
              Install Shortcut Guide
            </h2>
            <p className="text-xs text-[#8E8E8E]">
              Add LogicLens to your device home screen or desktop
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-[#1F1F1F] border border-[#2E2E2E] text-[#A3A3A3] hover:text-white hover:bg-[#2A2A2A] flex items-center justify-center transition-colors"
            aria-label="Close install guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {isIOS ? (
            <div className="rounded-2xl bg-[#1F1F1F] border border-[#2E2E2E] p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <Share className="w-4 h-4 text-[#A3A3A3]" />
                <span>iPhone & iPad (Safari)</span>
              </div>
              <ol className="space-y-2 text-xs text-[#A3A3A3] list-decimal list-inside">
                <li>
                  Tap the <strong className="text-white">Share</strong> button in
                  Safari&apos;s toolbar.
                </li>
                <li>
                  Scroll down and select{' '}
                  <strong className="text-white">Add to Home Screen</strong>.
                </li>
                <li>
                  Tap <strong className="text-white">Add</strong> to create the
                  LogicLens launcher icon.
                </li>
              </ol>
            </div>
          ) : (
            <>
              <div className="rounded-2xl bg-[#1F1F1F] border border-[#2E2E2E] p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <Smartphone className="w-4 h-4 text-[#A3A3A3]" />
                  <span>Android (Chrome / Samsung Internet)</span>
                </div>
                <ol className="space-y-1.5 text-xs text-[#A3A3A3] list-decimal list-inside">
                  <li>
                    Open the browser menu (<strong className="text-white">3 dots</strong>).
                  </li>
                  <li>
                    Tap <strong className="text-white">Install app</strong> or{' '}
                    <strong className="text-white">Add to Home screen</strong>.
                  </li>
                </ol>
              </div>

              <div className="rounded-2xl bg-[#1F1F1F] border border-[#2E2E2E] p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <Monitor className="w-4 h-4 text-[#A3A3A3]" />
                  <span>Desktop (Chrome / Edge)</span>
                </div>
                <ol className="space-y-1.5 text-xs text-[#A3A3A3] list-decimal list-inside">
                  <li>
                    Click the <strong className="text-white">Install</strong>{' '}
                    icon in the right side of the address bar, or open browser
                    menu &gt; <strong className="text-white">Save and share</strong>{' '}
                    &gt; <strong className="text-white">Install LogicLens</strong>.
                  </li>
                </ol>
              </div>
            </>
          )}

          <p className="text-[11px] text-[#8E8E8E] px-1">
            Note: Automated install prompts are only emitted by browsers when
            served over top-level HTTPS (not inside embedded preview iframes).
          </p>

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full bg-white text-[#141414] py-2.5 text-xs font-medium hover:bg-[#E5E5E5] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
