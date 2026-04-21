import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useTranslation } from 'react-i18next'
import { colors } from '../constants/colors'
import { typography } from '../constants/typography'
import CosmicBackdrop from '../components/CosmicBackdrop'
import SoundToggleButton from '../components/SoundToggleButton'
import { clearSavedChartState, loadLanguage, loadProfile } from '../constants/appState'



interface Suggestion {
  label: string
  lat: string
  lon: string
}

// ── Stagger helpers ────────────────────────────────────────────
const STAGGER_DELAY = 80

function useStaggerAnims(count: number) {
  return useRef(
    Array.from({ length: count }, () => ({
      op: new Animated.Value(0),
      y:  new Animated.Value(14),
    }))
  ).current
}

function staggerIn(anims: { op: Animated.Value; y: Animated.Value }[], baseDelay = 180) {
  anims.forEach(({ op, y }, i) => {
    const delay = baseDelay + i * STAGGER_DELAY
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 450, delay, useNativeDriver: true }),
      Animated.timing(y,  { toValue: 0, duration: 400, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start()
  })
}

// ── Form screen ────────────────────────────────────────────────
export default function FormScreen() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const params = useLocalSearchParams<{ reset?: string }>()

  const [name, setName] = useState('')
  const [dateText, setDateText] = useState('')
  const [timeText, setTimeText] = useState('')
  const [dontKnowTime, setDontKnowTime] = useState(false)
  const [locationQuery, setLocationQuery] = useState('')
  const [locationData, setLocationData] = useState<{ label: string; lat: string; lon: string } | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let alive = true
    const hydrate = async () => {
      if (params.reset === '1') {
        await clearSavedChartState()
      }
      return Promise.all([loadProfile(), loadLanguage()])
    }

    hydrate()
      .then(([profile, language]) => {
        if (!alive) return
        if (language) i18n.changeLanguage(language)
        if (!profile) return
        setName(profile.name ?? '')
        if (profile.day && profile.month && profile.year) {
          const d = String(profile.day).padStart(2, '0')
          const m = String(Number(profile.month) + 1).padStart(2, '0')
          setDateText(`${d}/${m}/${profile.year}`)
        }
        if (profile.hour && profile.minute) {
          setTimeText(`${String(profile.hour).padStart(2, '0')}:${String(profile.minute).padStart(2, '0')}`)
        }
        setDontKnowTime(!profile.hour)
        setLocationQuery(profile.location ?? '')
        if (profile.location) {
          setLocationData({
            label: profile.location,
            lat: profile.lat ?? '',
            lon: profile.lon ?? '',
          })
        }
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [i18n])

  const isComplete = name.trim().length > 0 && locationData !== null && dateText.length >= 8

  // ── Animations ──────────────────────────────────────────────
  const slideX  = useRef(new Animated.Value(40)).current
  const fadeIn  = useRef(new Animated.Value(0)).current
  const stagger = useStaggerAnims(6)
  const glowOp  = useRef(new Animated.Value(0)).current
  const glowRef = useRef<Animated.CompositeAnimation | null>(null)
  const btnPress = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideX, { toValue: 0, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(fadeIn,  { toValue: 1, duration: 380, useNativeDriver: true }),
    ]).start()
    staggerIn(stagger)
  }, [])

  useEffect(() => {
    if (isComplete) {
      glowRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(glowOp, { toValue: 0.9, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(glowOp, { toValue: 0.3, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      )
      glowRef.current.start()
    } else {
      glowRef.current?.stop()
      Animated.timing(glowOp, { toValue: 0, duration: 200, useNativeDriver: true }).start()
    }
  }, [isComplete])

  // ── Location search ──────────────────────────────────────────
  const searchLocation = useCallback((query: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (query.length < 3) { setSuggestions([]); return }
    searchTimer.current = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`
        const res = await fetch(url, { headers: { 'User-Agent': 'SaritaAstrologyApp/1.0' } })
        const data = await res.json()
        setSuggestions(data.map((item: any) => ({
          label: item.display_name, lat: item.lat, lon: item.lon,
        })))
      } catch { setSuggestions([]) }
    }, 600)
  }, [])

  const handleDateChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 8)
    let formatted = digits
    if (digits.length > 4) formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
    else if (digits.length > 2) formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`
    setDateText(formatted)
  }

  const handleTimeChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 4)
    const formatted = digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits
    setTimeText(formatted)
  }

  const handleLocationChange = (text: string) => {
    setLocationQuery(text)
    setLocationData(null)
    searchLocation(text)
  }

  const selectSuggestion = (s: Suggestion) => {
    setLocationQuery(s.label)
    setLocationData(s)
    setSuggestions([])
  }

  const clearLocation = () => {
    setLocationQuery('')
    setLocationData(null)
    setSuggestions([])
  }

  const handleSubmit = () => {
    if (!isComplete || !locationData) return
    const parts = dateText.split('/')
    const day = parts[0] ?? '1'
    const month = String(Number(parts[1] ?? '1') - 1)
    const year = parts[2] ?? '2000'
    const timeParts = timeText.split(':')
    const hour = timeParts[0] ?? '12'
    const minute = timeParts[1] ?? '00'
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    router.push({
      pathname: '/loading',
      params: {
        name: name.trim(),
        day,
        month,
        year,
        hour: dontKnowTime ? '' : hour,
        minute: dontKnowTime ? '' : minute,
        location: locationData.label,
        lat: locationData.lat,
        lon: locationData.lon,
        language: i18n.language.slice(0, 2),
      },
    })
  }

  const S = (i: number) => ({ opacity: stagger[i].op, transform: [{ translateY: stagger[i].y }] })

  return (
    <View style={styles.root}>
      <CosmicBackdrop variant="form" />
      <View style={styles.soundWrap}>
        <SoundToggleButton />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View style={{ flex: 1, opacity: fadeIn, transform: [{ translateX: slideX }] }}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── Header ── */}
            <Animated.View style={S(0)}>
              <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                <Text style={styles.backText}>{t('form.back')}</Text>
              </TouchableOpacity>
              <Text style={styles.title}>{t('form.title')}</Text>
              <Text style={styles.subtitle}>{t('form.subtitle')}</Text>
            </Animated.View>

            {/* ── NOMBRE ── */}
            <Animated.View style={S(1)}>
              <Text style={styles.label}>👤  {t('form.name')}</Text>
              <View style={styles.card}>
                <TextInput
                  style={styles.input}
                  placeholder={t('profile.name')}
                  placeholderTextColor={colors.silver}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            </Animated.View>

            {/* ── FECHA ── */}
            <Animated.View style={S(2)}>
              <Text style={styles.label}>📅  {t('form.birthDate')}</Text>
              <View style={styles.card}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor={colors.silver}
                  value={dateText}
                  onChangeText={handleDateChange}
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>
            </Animated.View>

            {/* ── HORA ── */}
            <Animated.View style={S(3)}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>🕐  {t('form.birthTime')}</Text>
                <TouchableOpacity onPress={() => setDontKnowTime(v => !v)}>
                  <Text style={[styles.toggleText, dontKnowTime && styles.toggleActive]}>{t('form.unknownTime')}</Text>
                </TouchableOpacity>
              </View>
              {!dontKnowTime && (
                <View style={styles.card}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="HH:MM"
                    placeholderTextColor={colors.silver}
                    value={timeText}
                    onChangeText={handleTimeChange}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>
              )}
            </Animated.View>

            {/* ── LUGAR ── */}
            <Animated.View style={S(4)}>
              <Text style={styles.label}>📍  {t('form.birthPlace')}</Text>
              <View style={styles.card}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder={t('profile.birthCity')}
                  placeholderTextColor={colors.silver}
                  value={locationQuery}
                  onChangeText={handleLocationChange}
                  autoCapitalize="words"
                />
                {locationQuery.length > 0 && (
                  <TouchableOpacity onPress={clearLocation} style={styles.clearBtn}>
                    <Text style={styles.clearText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
              {suggestions.length > 0 && (
                <View style={styles.suggestionsWrap}>
                  {suggestions.map((s, i) => (
                    <TouchableOpacity key={i} style={styles.chip} onPress={() => selectSuggestion(s)} activeOpacity={0.7}>
                      <Text style={styles.chipText} numberOfLines={1}>{s.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Animated.View>

            {/* ── SUBMIT ── */}
            <Animated.View style={[S(5), { marginTop: 40 }]}>
              <View style={styles.submitWrap}>
                <Animated.View style={[styles.glowRing, { opacity: glowOp }]} pointerEvents="none" />
                <Animated.View style={{ transform: [{ scale: btnPress }] }}>
                  <TouchableOpacity
                    style={[styles.submitBtn, !isComplete && styles.submitDisabled]}
                    onPress={handleSubmit}
                    onPressIn={() => isComplete && Animated.spring(btnPress, { toValue: 0.96, useNativeDriver: true }).start()}
                    onPressOut={() => Animated.spring(btnPress, { toValue: 1, useNativeDriver: true }).start()}
                    disabled={!isComplete}
                    activeOpacity={1}
                  >
                    <Text style={[styles.submitText, !isComplete && styles.submitTextDisabled]}>
                      {t('form.submit')}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </Animated.View>

          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.backgroundDeep,
  },
  soundWrap: {
    position: 'absolute',
    top: 54,
    right: 24,
    zIndex: 20,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 44,
  },
  backBtn: {
    marginBottom: 24,
  },
  backText: {
    color: colors.gold,
    fontSize: 16,
  },
  title: {
    fontSize: 42,
    color: colors.goldLight,
    fontFamily: typography.displayLight,
    letterSpacing: 3.6,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.whiteSubtle,
    marginBottom: 32,
    maxWidth: 280,
    lineHeight: 22,
    fontFamily: typography.body,
  },
  label: {
    fontSize: 11,
    color: colors.goldLight,
    letterSpacing: 2,
    fontFamily: typography.bodyMedium,
    marginBottom: 8,
    marginTop: 20,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 20,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    borderWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.15)',
    borderLeftColor: 'rgba(255,255,255,0.04)',
    borderRightColor: 'rgba(255,255,255,0.04)',
    borderBottomColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    color: colors.white,
    fontSize: 16,
    fontFamily: typography.body,
  },
  clearBtn: {
    paddingHorizontal: 8,
  },
  clearText: {
    color: colors.silver,
    fontSize: 14,
  },
  toggleText: {
    color: colors.whiteSubtle,
    fontSize: 12,
    letterSpacing: 1,
    fontFamily: typography.bodyMedium,
    borderWidth: 0.5,
    borderColor: colors.borderSoft,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  toggleActive: {
    color: colors.gold,
    borderColor: colors.gold,
  },
  suggestionsWrap: {
    marginTop: 8,
    gap: 8,
  },
  chip: {
    backgroundColor: 'rgba(17, 24, 45, 0.82)',
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: {
    color: colors.white,
    fontSize: 13,
  },
  submitWrap: {
    position: 'relative',
  },
  glowRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 54,
    borderWidth: 2,
    borderColor: colors.goldLight,
  },
  submitBtn: {
    backgroundColor: colors.gold,
    borderRadius: 50,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: colors.gold,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  submitDisabled: {
    backgroundColor: colors.backgroundSoft,
  },
  submitText: {
    color: colors.background,
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 3,
  },
  submitTextDisabled: {
    color: colors.silver,
  },
})
