import AsyncStorage from '@react-native-async-storage/async-storage'

export type SupportedLanguage = 'es' | 'en' | 'it'
export type AccessPlan = 'free' | 'luna' | 'premium'

export type SavedProfile = {
  name: string
  day: string
  month: string
  year: string
  hour: string
  minute: string
  location: string
  lat: string
  lon: string
  language: SupportedLanguage
  plan?: AccessPlan
}

export type SavedReadingBundle = {
  profile: SavedProfile
  interpretation: string
  positionsJson: string
  monthKey: string
  createdAt: string
}

export const WHEEL_HINT_STORAGE_KEY = 'sarita_wheel_hint_seen_v1'

const PROFILE_KEY = 'sarita_profile_v1'
const READING_KEY = 'sarita_latest_reading_v1'
const LANGUAGE_KEY = 'sarita_language_v1'

export function getCurrentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export async function saveProfile(profile: SavedProfile) {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}

export async function loadProfile() {
  const raw = await AsyncStorage.getItem(PROFILE_KEY)
  return raw ? JSON.parse(raw) as SavedProfile : null
}

export async function saveLatestReading(bundle: SavedReadingBundle) {
  await AsyncStorage.setItem(READING_KEY, JSON.stringify(bundle))
  await saveProfile(bundle.profile)
  await AsyncStorage.setItem(LANGUAGE_KEY, bundle.profile.language)
  await AsyncStorage.removeItem(WHEEL_HINT_STORAGE_KEY)
}

export async function loadLatestReading() {
  const raw = await AsyncStorage.getItem(READING_KEY)
  return raw ? JSON.parse(raw) as SavedReadingBundle : null
}

export async function saveLanguage(language: SupportedLanguage) {
  await AsyncStorage.setItem(LANGUAGE_KEY, language)
}

export async function loadLanguage() {
  const raw = await AsyncStorage.getItem(LANGUAGE_KEY)
  return raw as SupportedLanguage | null
}

export async function clearSavedChartState() {
  await AsyncStorage.multiRemove([
    PROFILE_KEY,
    READING_KEY,
    WHEEL_HINT_STORAGE_KEY,
  ])
}
