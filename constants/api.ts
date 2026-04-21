function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}

export const API_BASE_URL = trimTrailingSlash(
  process.env.EXPO_PUBLIC_API_URL?.trim() ?? ''
)

export const API_HEALTH_URL = `${API_BASE_URL}/health`
export const API_READING_URL = `${API_BASE_URL}/api/reading`
