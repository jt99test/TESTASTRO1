import { Platform } from 'react-native'

export function isLowPerformanceDevice() {
  // react-native-device-info is not available in Expo Go.
  // Use a conservative heuristic: older iOS and all Android are treated as low perf.
  return Platform.OS === 'android'
}

export function getAdaptiveBlurIntensity(base = 20) {
  return isLowPerformanceDevice() ? Math.max(8, Math.round(base * 0.55)) : base
}
