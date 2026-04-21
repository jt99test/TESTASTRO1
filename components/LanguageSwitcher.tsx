import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { saveLanguage, SupportedLanguage } from '../constants/appState'
import { colors } from '../constants/colors'
import { LANGUAGE_OPTIONS, setAppLanguage } from '../constants/i18n'
import { typography } from '../constants/typography'

const FLAGS: Record<SupportedLanguage, string> = {
  es: '🇪🇸',
  it: '🇮🇹',
  en: '🇬🇧',
}

type LanguageSwitcherProps = {
  onChange?: (language: SupportedLanguage) => void
}

export default function LanguageSwitcher({ onChange }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation()
  const activeLanguage = (i18n.language?.slice(0, 2) as SupportedLanguage) || 'en'

  return (
    <View>
      <Text style={styles.label}>{t('common.language')}</Text>
      <View style={styles.row}>
        {LANGUAGE_OPTIONS.map((language) => {
          const active = activeLanguage === language
          return (
            <TouchableOpacity
              key={language}
              activeOpacity={0.84}
              style={[styles.chip, active && styles.chipActive]}
              onPress={async () => {
                await setAppLanguage(language)
                await saveLanguage(language)
                onChange?.(language)
              }}
            >
              <Text style={styles.flag}>{FLAGS[language]}</Text>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{language.toUpperCase()}</Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  label: {
    color: colors.goldLight,
    fontSize: 11,
    letterSpacing: 2.2,
    marginBottom: 10,
    textTransform: 'uppercase',
    fontFamily: typography.bodyMedium,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  chipActive: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(239,215,161,0.12)',
  },
  flag: {
    fontSize: 18,
  },
  chipText: {
    color: colors.whiteSubtle,
    fontFamily: typography.bodyMedium,
    fontSize: 12,
    letterSpacing: 1.6,
  },
  chipTextActive: {
    color: colors.goldLight,
  },
})
