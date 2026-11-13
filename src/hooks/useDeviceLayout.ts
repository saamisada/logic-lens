'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  DeviceLayoutState,
  LayoutModeOverride,
} from '@/src/types/algorithm';
import { computeDeviceLayout } from '@/src/utils/deviceRatio';
import { loadLayoutOverride, saveLayoutOverride } from '@/src/utils/storage';

const INITIAL_DESKTOP_STATE: DeviceLayoutState = computeDeviceLayout(
  1440,
  900,
  'auto'
);

export function useDeviceLayout() {
  const [override, setOverrideState] = useState<LayoutModeOverride>('auto');
  const [layout, setLayout] = useState<DeviceLayoutState>(INITIAL_DESKTOP_STATE);

  useEffect(() => {
    let activeOverride = loadLayoutOverride();

    const sync = () => {
      if (typeof window === 'undefined') return;
      setOverrideState(activeOverride);
      setLayout(
        computeDeviceLayout(
          window.innerWidth,
          window.innerHeight,
          activeOverride
        )
      );
    };

    const rafId = window.requestAnimationFrame(sync);

    const handleResize = () => {
      activeOverride = loadLayoutOverride();
      sync();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const setLayoutOverride = useCallback(
    (nextOverride: LayoutModeOverride) => {
      setOverrideState(nextOverride);
      saveLayoutOverride(nextOverride);
      if (typeof window !== 'undefined') {
        setLayout(
          computeDeviceLayout(
            window.innerWidth,
            window.innerHeight,
            nextOverride
          )
        );
      }
    },
    []
  );

  return {
    ...layout,
    override,
    setLayoutOverride,
  };
}
