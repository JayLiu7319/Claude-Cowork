import { useEffect } from 'react';
import type { BrandConfig } from '../types';

export function useBrandTheme(brandConfig: BrandConfig | null) {
  useEffect(() => {
    if (!brandConfig) return;

    const root = document.documentElement;
    root.style.setProperty('--color-accent', brandConfig.colors.accent);
    root.style.setProperty('--color-accent-hover', brandConfig.colors.accentHover);
    root.style.setProperty('--color-accent-light', brandConfig.colors.accentLight);
    root.style.setProperty('--color-accent-subtle', brandConfig.colors.accentSubtle);

    if (brandConfig.colors.surface) {
      root.style.setProperty('--color-surface', brandConfig.colors.surface);
    }
    if (brandConfig.colors.surfaceSecondary) {
      root.style.setProperty('--color-surface-secondary', brandConfig.colors.surfaceSecondary);
    }
    if (brandConfig.colors.surfaceTertiary) {
      root.style.setProperty('--color-surface-tertiary', brandConfig.colors.surfaceTertiary);
    }
    if (brandConfig.colors.surfaceCream) {
      root.style.setProperty('--color-surface-cream', brandConfig.colors.surfaceCream);
    }

    // Update document title
    document.title = brandConfig.appTitle;
  }, [brandConfig]);
}
