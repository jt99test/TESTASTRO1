import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useTranslation } from 'react-i18next'
import { useAmbientSound } from '../components/AmbientSoundProvider'
import CelestialLoadingSequence from '../components/CelestialLoadingSequence'
import CosmicBackdrop from '../components/CosmicBackdrop'
import SoundToggleButton from '../components/SoundToggleButton'
import { API_BASE_URL, API_HEALTH_URL, API_READING_URL } from '../constants/api'
import { detectDeviceLanguage } from '../constants/i18n'
import { getCurrentMonthKey, loadLanguage, saveLatestReading, SupportedLanguage } from '../constants/appState'
import { colors } from '../constants/colors'
import { typography } from '../constants/typography'

let hasPlayedBirthCinematicThisSession = false

function useDots() {
  const [count, setCount] = useState(1)

  useEffect(() => {
    const id = setInterval(() => setCount((c) => (c >= 4 ? 1 : c + 1)), 450)
    return () => clearInterval(id)
  }, [])

  // Always 4 chars wide — prevents line-wrapping jumps in the title
  return '.'.repeat(count) + '\u00A0'.repeat(4 - count)
}

export default function LoadingScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const params = useLocalSearchParams<{
    name: string
    day: string
    month: string
    year: string
    hour: string
    minute: string
    location: string
    lat: string
    lon: string
    language?: string
  }>()

  const [error, setError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const dots = useDots()
  const { playSuccessChime } = useAmbientSound()
  const { day, hour, lat, location, lon, minute, month, name, year } = params
  const readingPayloadRef = useRef<any | null>(null)
  const transitionOpacity = useRef(new Animated.Value(0)).current
  const animationStartedAtRef = useRef(Date.now())
  const shouldPlayCinematic = useMemo(() => {
    if (hasPlayedBirthCinematicThisSession) return false
    hasPlayedBirthCinematicThisSession = true
    return true
  }, [])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        const resolvedLanguage = ((params.language as SupportedLanguage | undefined) ?? await loadLanguage() ?? detectDeviceLanguage()) as SupportedLanguage
        try {
            await fetch(API_HEALTH_URL)
        } catch {
          throw new Error('network_unreachable')
        }

        const birthdate = [
          year,
          String(Number(month) + 1).padStart(2, '0'),
          String(day).padStart(2, '0'),
        ].join('-')

        const birthtime = hour
          ? `${String(hour).padStart(2, '0')}:${String(minute ?? 0).padStart(2, '0')}`
          : null

        const response = await fetch(API_READING_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            birthdate,
            birthtime,
            lat,
            lng: lon,
            language: resolvedLanguage,
          }),
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const text = await response.text()
        let positions: object | null = null
        let reading = ''

        for (const line of text.split('\n')) {
          if (!line.startsWith('data: ')) continue

          try {
            const event = JSON.parse(line.substring(6))
            if (event.type === 'positions') positions = event.data
            if (event.type === 'text') reading += event.text
            if (event.type === 'error') throw new Error(event.message || 'Server error')
          } catch (err: any) {
            if (err?.message === 'Server error' || err?.message?.startsWith('HTTP')) throw err
          }
        }

        if (cancelled) return

        const bundle = {
          profile: {
            name,
            day,
            month,
            year,
            hour: hour ?? '',
            minute: minute ?? '',
            location,
            lat,
            lon,
            language: resolvedLanguage,
          },
          interpretation: reading,
          positionsJson: JSON.stringify(positions),
          monthKey: getCurrentMonthKey(),
          createdAt: new Date().toISOString(),
        }

        readingPayloadRef.current = {
          bundle,
          params: {
            name,
            day,
            month,
            year,
            hour,
            minute,
            location,
            lat,
            lon,
            language: resolvedLanguage,
            readingMonth: bundle.monthKey,
            interpretation: reading,
            positionsJson: JSON.stringify(positions),
          },
        }

        const minimumDuration = shouldPlayCinematic ? 4600 : 800
        const waitMs = Math.max(0, minimumDuration - (Date.now() - animationStartedAtRef.current))
        if (waitMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, waitMs))
        }

        if (cancelled) return
        setIsLoading(false)
        Animated.timing(transitionOpacity, {
          toValue: 1,
          duration: 550,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }).start(async ({ finished }) => {
          if (!finished || cancelled || !readingPayloadRef.current) return
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          await playSuccessChime()
          await saveLatestReading(readingPayloadRef.current.bundle)
          router.replace({
            pathname: '/results',
            params: readingPayloadRef.current.params,
          })
        })
      } catch {
        if (!cancelled) setError(true)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [day, hour, lat, location, lon, minute, month, name, params.language, router, year])

  return (
    <View style={styles.root}>
      <CosmicBackdrop variant="reading" />
      <View style={styles.soundWrap}>
        <SoundToggleButton />
      </View>
      {shouldPlayCinematic ? (
        <CelestialLoadingSequence
          name={String(name ?? '')}
          location={String(location ?? '')}
          onFocusComplete={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
          }}
        />
      ) : null}

      <View style={styles.copyWrap}>
        <Text style={styles.brand}>SARITA</Text>

        {error ? (
          <>
            <Text style={styles.errorTitle}>{t('loading.networkTitle')}</Text>
            <Text style={styles.errorText}>
              {t('loading.networkText')}
            </Text>
            <Text style={styles.errorHint}>API configurada: {API_BASE_URL}</Text>
            <TouchableOpacity style={styles.retryBtn} activeOpacity={0.9} onPress={() => router.back()}>
              <Text style={styles.retryText}>{t('loading.back')}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.loadingEyebrow}>{t('loading.eyebrow')}</Text>
            <Text style={styles.loadingTitle}>
              {shouldPlayCinematic
                ? t('loading.title', { name, dots })
                : t('loading.fallbackTitle', { dots })}
            </Text>
            <Text style={styles.loadingText}>
              {shouldPlayCinematic
                ? t('loading.subtitle', { name, place: String(location ?? '').split(',').slice(0, 2).map((item) => item.trim()).join(', ') })
                : t('loading.fallbackSubtitle', { name })}
            </Text>
            <Text style={[styles.loadingEyebrow, { opacity: isLoading ? 0 : 1 }]}>{t('loading.opening')}</Text>
          </>
        )}
      </View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.blackout, { opacity: transitionOpacity }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.backgroundDeep,
  },
  copyWrap: {
    position: 'absolute',
    left: 28,
    right: 28,
    bottom: 72,
    alignItems: 'center',
  },
  soundWrap: {
    position: 'absolute',
    top: 54,
    right: 24,
    zIndex: 20,
  },
  brand: {
    color: colors.gold,
    fontSize: 13,
    letterSpacing: 6,
    marginBottom: 20,
    textTransform: 'uppercase',
    fontFamily: typography.bodyMedium,
  },
  loadingEyebrow: {
    color: colors.whiteMuted,
    fontSize: 11,
    letterSpacing: 3,
    marginBottom: 10,
    textTransform: 'uppercase',
    fontFamily: typography.bodyMedium,
  },
  loadingTitle: {
    color: colors.goldLight,
    fontSize: 30,
    lineHeight: 38,
    minHeight: 80,
    textAlign: 'center',
    fontFamily: typography.displayLight,
    marginBottom: 16,
    textShadowColor: 'rgba(0,0,0,0.52)',
    textShadowOffset: { width: 0, height: 6 },
    textShadowRadius: 18,
  },
  loadingText: {
    color: colors.whiteSubtle,
    fontSize: 16,
    lineHeight: 25,
    textAlign: 'center',
    maxWidth: 320,
    fontFamily: typography.body,
    textShadowColor: 'rgba(0,0,0,0.44)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 14,
  },
  errorTitle: {
    color: colors.goldLight,
    fontSize: 28,
    lineHeight: 35,
    textAlign: 'center',
    fontFamily: typography.displayLight,
    marginBottom: 14,
  },
  errorText: {
    color: colors.whiteSubtle,
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: typography.body,
  },
  errorHint: {
    color: colors.whiteMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 18,
    maxWidth: 320,
    fontFamily: typography.body,
  },
  blackout: {
    backgroundColor: '#000',
  },
  retryBtn: {
    borderWidth: 1,
    borderColor: colors.gold,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(17, 24, 45, 0.62)',
  },
  retryText: {
    color: colors.goldLight,
    letterSpacing: 2.3,
    fontWeight: '700',
    fontSize: 12,
  },
})
