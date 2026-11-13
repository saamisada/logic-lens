import type {
  DeviceLayoutState,
  DeviceProfile,
  LayoutModeOverride,
} from '@/src/types/algorithm';

export function classifyAspectRatio(aspectRatio: number): DeviceProfile {
  if (aspectRatio < 0.75) {
    return 'mobile';
  }
  if (aspectRatio < 1.3) {
    return 'tablet';
  }
  return 'desktop';
}

export function formatRatioLabel(
  profile: DeviceProfile,
  aspectRatio: number,
  override: LayoutModeOverride
): string {
  const prefix =
    profile === 'mobile'
      ? 'Mobile'
      : profile === 'tablet'
        ? 'Tablet'
        : 'Desktop';

  if (override !== 'auto') {
    const preset =
      override === 'mobile'
        ? '9:16 Preview'
        : override === 'tablet'
          ? '4:3 Preview'
          : '16:9 Preview';
    return `${prefix} ${preset}`;
  }

  if (aspectRatio < 0.62) return `${prefix} 9:19`;
  if (aspectRatio < 0.75) return `${prefix} 9:16`;
  if (aspectRatio < 0.95) return `${prefix} 3:4`;
  if (aspectRatio < 1.3) return `${prefix} 4:3`;
  if (aspectRatio < 1.65) return `${prefix} 16:10`;
  if (aspectRatio < 2.05) return `${prefix} 16:9`;
  return `${prefix} 21:9`;
}

export function computeDeviceLayout(
  width: number,
  height: number,
  override: LayoutModeOverride = 'auto'
): DeviceLayoutState {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const aspectRatio = Number((safeWidth / safeHeight).toFixed(2));
  const detectedProfile = classifyAspectRatio(aspectRatio);
  const effectiveProfile: DeviceProfile =
    override === 'auto' ? detectedProfile : override;

  return {
    width: safeWidth,
    height: safeHeight,
    aspectRatio,
    detectedProfile,
    effectiveProfile,
    override,
    ratioLabel: formatRatioLabel(effectiveProfile, aspectRatio, override),
  };
}
