# LogicLens

LogicLens is an adaptive **Python and C** Code Dry-Run Visualizer built as a Progressive Web Application (PWA). Students and developers select **Python** or **C**, paste any program directly into the editor, and automatically inspect line-by-line execution, memory array states, index pointer badges, variable mutations, `stdout` console output, and runtime complexity metrics.

Live Preview: https://logiclens-bysada.vercel.app  
Repository: https://github.com/saamisada/logic-lens

## 1. Core Capabilities

- **Live Python & C Execution Engine (`src/utils/codeInterpreter.ts`)**: Parses and steps through arbitrary user-pasted Python or C code in the browser without pre-recorded traces. Supports loops (`for`, `while`, `do-while`), conditionals (`if`/`elif`/`else`), functions and recursion, C pointer arithmetic (`*(arr + i)`), Python lists, tuple unpacking, dictionaries, `print()`, and `printf()`.
- **Automatic Memory & Pointer Detection**: Automatically identifies active arrays/lists and attaches index pointer badges (`i`, `j`, `low`, `mid`, `high`, `left`, `right`, `minIdx`, etc.) plus dictionary frequency maps whenever present in scope.
- **Automatic Parameter Detection**: If you paste a standalone Python or C function definition without a caller or `main()`, LogicLens detects its parameters and generates editable input fields automatically.
- **Concept Library, Dry-Run Quiz Lab & Local Analytics**: Includes expandable CS concept cards, interactive dry-run output questions with one-tap **Trace in Visualizer** links, and local `localStorage` activity tracking.

## 2. Adaptive Ratio Architecture & PWA Installation

### Aspect Ratio Detection Engine (`src/utils/deviceRatio.ts` & `src/hooks/useDeviceLayout.ts`)
LogicLens computes `window.innerWidth / window.innerHeight` on load and on every `resize` or `orientationchange` event:

- **Profile A — Mobile Portrait (`aspectRatio < 0.75`)**: Full-bleed single-thumb shell with a compact sticky top bar and fixed 4-tab bottom navigation (`Visualize`, `Library`, `Quiz`, `Analytics`).
- **Profile B — Tablet / Split-Screen (`0.75 <= aspectRatio < 1.3`)**: Centered balanced container (`max-w-3xl`) with expanded multi-column concept grids.
- **Profile C — Desktop Widescreen (`aspectRatio >= 1.3`)**: Full-viewport desktop workspace featuring a fixed left navigation rail (`DesktopSideNav.tsx`), a 55% / 45% split Code-and-Memory stage in `VisualizerTab`, and 2–3 column grids across `LibraryTab`, `QuizTab`, and `AnalyticsTab`.
- **Manual Layout Override**: Switch between `Auto (Ratio)`, `Mobile 9:16`, `Tablet 4:3`, and `Desktop 16:9` directly inside Settings.

### Progressive Web App (PWA) Support
- `public/manifest.json`: Configured with `display: "standalone"`, `#141414` theme/background colors, and monochrome PNG + SVG icons (`192x192`, `512x512`, maskable `512x512`, and `180x180` Apple touch icon).
- `public/sw.js` & `src/utils/registerSw.ts`: Offline-first Service Worker caching core assets for instant launch without connectivity.
- `src/hooks/usePwaInstall.ts`: Captures `beforeinstallprompt` for one-tap native installation via the **Install App** button and falls back to `InstallGuideModal.tsx` on iOS Safari or non-prompt browsers.

## 3. Open-Source & Zero-Secret Security Guarantee

- **Zero Hardcoded Secrets**: This repository contains zero API keys, zero private tokens, and zero server-side credentials.
- **100% Out-of-the-Box Client Execution**: Every trace, pointer transition, variable update, quiz check, and analytics chart executes deterministically in the browser using TypeScript and `localStorage`.

## 4. Folder Structure

```
├── LICENSE                         # Full MIT License text
├── README.md                       # Project documentation and deployment guide
├── app/
│   ├── globals.css                 # Tailwind v4 configuration and monochrome scrollbars
│   ├── layout.tsx                  # Root typography, viewport, and PWA metadata
│   └── page.tsx                    # Entry route mounting LogicLens
├── public/
│   ├── manifest.json               # Web App Manifest
│   ├── sw.js                       # Offline-first Service Worker
│   ├── icon-192.svg                # Monochrome 192x192 vector app icon
│   ├── icon-512.svg                # Monochrome 512x512 vector app icon
│   ├── pwa-192x192.png             # 192x192 PNG icon
│   ├── pwa-512x512.png             # 512x512 PNG icon
│   ├── pwa-maskable-512x512.png    # 512x512 maskable safe-zone PNG icon
│   └── apple-touch-icon.png        # 180x180 iOS Safari touch icon
└── src/
    ├── App.tsx                     # Adaptive root shell
    ├── types/algorithm.ts          # TypeScript interfaces
    ├── utils/
    │   ├── codeInterpreter.ts      # Client-side Python & C step-by-step interpreter
    │   ├── programAnalyzer.ts      # Dynamic concept library, quiz & analytics generator
    │   ├── deviceRatio.ts          # Aspect-ratio classifier
    │   ├── storage.ts              # Safe localStorage wrapper
    │   └── registerSw.ts           # Service worker registration
    ├── hooks/
    │   ├── useDeviceLayout.ts      # Reactive viewport aspect-ratio hook
    │   └── usePwaInstall.ts        # PWA install prompt hook
    └── components/
        ├── ProgramEntryView.tsx    # Launch screen for choosing Python/C & pasting code
        ├── Header.tsx
        ├── BottomNav.tsx
        ├── DesktopSideNav.tsx
        ├── VisualizerTab.tsx
        ├── ArrayVisualStage.tsx
        ├── LibraryTab.tsx
        ├── QuizTab.tsx
        ├── AnalyticsTab.tsx
        ├── SettingsModal.tsx
        └── InstallGuideModal.tsx
```

## 5. Local Setup Guide

1. Clone the repository:
   ```bash
   git clone https://github.com/saamisada/logic-lens.git
   cd logic-lens
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   npm run start
   ```

## 6. Zero-Config Vercel Deployment Guide

1. Push your fork of this repository to GitHub.
2. Open Vercel and select **Add New -> Project**, then import the repository.
3. Leave Environment Variables empty (zero secrets required).
4. Click **Deploy**. Vercel automatically detects Next.js, builds the production bundle, and serves the PWA over HTTPS with full home-screen installability.

## 7. Optional BYOK AI Tutor & License

- **Optional Bring-Your-Own-Key (BYOK) Tutor**: Inside **Settings**, users can optionally paste a personal Google Gemini API key stored solely in browser `localStorage` under `logiclens_user_gemini_key`. When left empty, LogicLens uses its built-in deterministic step explanation engine.
- **License**: Released under the MIT License. See `LICENSE` for full terms.
