/**
 * ANIMATION TOKENS
 * PURPOSE: Centralized timing/easing/spring controls for consistent motion quality.
 * PERFORMANCE: Transform + opacity only.
 */

export const ANIMATION = {
  durationFast: 0.2,
  durationMedium: 0.3,
  durationSlow: 0.45,
  easing: [0.16, 1, 0.3, 1] as const,
  springStiffness: 420,
  springDamping: 35,
  routeTranslateY: 8,
} as const
