import * as Localization from 'expo-localization'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { loadLanguage, saveLanguage, SupportedLanguage } from './appState'

import en from '../locales/en.json'
import es from '../locales/es.json'
import it from '../locales/it.json'

export const LANGUAGE_OPTIONS: SupportedLanguage[] = ['es', 'en', 'it']

const LATAM_AND_ES = new Set([
  'ES', 'AR', 'BO', 'BR', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'SV', 'GQ',
  'GT', 'HN', 'MX', 'NI', 'PA', 'PY', 'PE', 'PR', 'UY', 'VE',
])

export function detectDeviceLanguage(): SupportedLanguage {
  const locale = Localization.getLocales?.()?.[0]
  const region = locale?.regionCode?.toUpperCase?.() ?? ''
  const languageCode = locale?.languageCode?.toLowerCase?.() ?? 'en'

  if (region === 'IT' || languageCode === 'it') return 'it'
  if (LATAM_AND_ES.has(region) || languageCode === 'es' || languageCode === 'pt') return 'es'
  return 'en'
}

const resources = {
  es: { translation: es },
  en: { translation: en },
  it: { translation: it },
} as const

let initPromise: Promise<typeof i18n> | null = null

export function initI18n() {
  if (!initPromise) {
    initPromise = (async () => {
      const storedLanguage = await loadLanguage()
      const language = storedLanguage ?? detectDeviceLanguage()
      if (!storedLanguage) await saveLanguage(language)

      await i18n
        .use(initReactI18next)
        .init({
          compatibilityJSON: 'v4',
          lng: language,
          fallbackLng: 'en',
          resources,
          interpolation: {
            escapeValue: false,
          },
          returnNull: false,
        })

      return i18n
    })()
  }
  return initPromise
}

export async function setAppLanguage(language: SupportedLanguage) {
  await saveLanguage(language)
  if (!i18n.isInitialized) {
    await initI18n()
  }
  await i18n.changeLanguage(language)
}

export function languageLabel(language: SupportedLanguage) {
  if (language === 'en') return 'English'
  if (language === 'it') return 'Italiano'
  return 'Español'
}

export default i18n
