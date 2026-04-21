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


const ITEM_HEIGHT = 44
const VISIBLE_ITEMS = 5
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS

const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]
const YEARS   = Array.from({ length: 86 }, (_, i) => String(1930 + i))
const HOURS   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month + 1, 0).getDate()
}

interface WheelPickerProps {
  items: string[]
  selectedIndex: number
  onChange: (index: number) => void
  flex?: number
}

function WheelPicker({ items, selectedIndex, onChange, flex = 1 }: WheelPickerProps) {
  const scrollRef = useRef<ScrollView>(null)
  const [scrollIdx, setScrollIdx] = useState(selectedIndex)
  const isDragging = useRef(false)

  useEffect(() => {
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false })
    }, 80)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!isDragging.current) {
      scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: true })
      setScrollIdx(selectedIndex)
    }
  }, [selectedIndex])

  return (
    <View style={{ flex, height: PICKER_HEIGHT, overflow: 'hidden' }}>
      <View style={styles.highlightBar} />
      <ScrollView
        ref={scrollRef}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
        onScrollBeginDrag={() => { isDragging.current = true }}
        onScroll={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT)
          setScrollIdx(Math.max(0, Math.min(idx, items.length - 1)))
        }}
        scrollEventThrottle={16}
        onMomentumScrollEnd={e => {
          isDragging.current = false
          const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT)
          const clamped = Math.max(0, Math.min(idx, items.length - 1))
          setScrollIdx(clamped)
          onChange(clamped)
        }}
      >
        {items.map((item, i) => {
          const dist = Math.abs(scrollIdx - i)
          return (
            <View key={i} style={styles.wheelRow}>
              <Text style={[
                styles.wheelText,
                dist === 0 && styles.wheelCenter,
                dist === 1 && styles.wheelNear,
                dist >= 2 && styles.wheelFar,
              ]}>
                {item}
              </Text>
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}

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
  const [dayIdx, setDayIdx] = useState(0)
  const [monthIdx, setMonthIdx] = useState(0)
  const [yearIdx, setYearIdx] = useState(70)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [hourIdx, setHourIdx] = useState(12)
  const [minuteIdx, setMinuteIdx] = useState(0)
  const [dontKnowTime, setDontKnowTime] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [locationQuery, setLocationQuery] = useState('')
  const [locationData, setLocationData] = useState<{ label: string; lat: string; lon: string } | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentYear  = 1930 + yearIdx
  const daysInMonth  = getDaysInMonth(monthIdx, currentYear)
  const DAYS         = Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, '0'))

  useEffect(() => {
    if (dayIdx >= daysInMonth) setDayIdx(daysInMonth - 1)
  }, [monthIdx, yearIdx])

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
        setDayIdx(Math.max(0, Number(profile.day ?? '1') - 1))
        setMonthIdx(Math.max(0, Number(profile.month ?? '0')))
        setYearIdx(Math.max(0, YEARS.indexOf(String(profile.year ?? YEARS[0]))))
        if (profile.hour) setHourIdx(Math.max(0, Number(profile.hour)))
        if (profile.minute) setMinuteIdx(Math.max(0, Number(profile.minute)))
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

  const isComplete = name.trim().length > 0 && locationData !== null

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

  const displayDate = `${String(dayIdx + 1).padStart(2, '0')} de ${MONTHS_ES[monthIdx]} de ${currentYear}`
  const displayTime = `${String(hourIdx).padStart(2, '0')}:${String(minuteIdx).padStart(2, '0')}`

  const handleSubmit = () => {
    if (!isComplete || !locationData) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    router.push({
      pathname: '/loading',
      params: {
        name: name.trim(),
        day: String(dayIdx + 1),
        month: String(monthIdx),
        year: String(currentYear),
        hour: dontKnowTime ? '' : String(hourIdx),
        minute: dontKnowTime ? '' : String(minuteIdx),
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
              <TouchableOpacity
                style={styles.card}
                onPress={() => { setShowDatePicker(v => !v); setShowTimePicker(false) }}
                activeOpacity={0.8}
              >
                <Text style={styles.fieldValue}>{displayDate}</Text>
                <Text style={styles.chevron}>{showDatePicker ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <View style={styles.pickerCard}>
                  <View style={styles.pickerHeaderRow}>
                    <Text style={[styles.colHeader, { flex: 1 }]}>Día</Text>
                    <Text style={[styles.colHeader, { flex: 2 }]}>Mes</Text>
                    <Text style={[styles.colHeader, { flex: 1.5 }]}>Año</Text>
                  </View>
                  <View style={styles.pickerColumns}>
                    <WheelPicker items={DAYS} selectedIndex={dayIdx} onChange={setDayIdx} flex={1} />
                    <WheelPicker items={MONTHS_ES} selectedIndex={monthIdx} onChange={setMonthIdx} flex={2} />
                    <WheelPicker items={YEARS} selectedIndex={yearIdx} onChange={setYearIdx} flex={1.5} />
                  </View>
                </View>
              )}
            </Animated.View>

            {/* ── HORA ── */}
            <Animated.View style={S(3)}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>🕐  {t('form.birthTime')}</Text>
                <TouchableOpacity onPress={() => { setDontKnowTime(v => !v); setShowTimePicker(false) }}>
                  <Text style={[styles.toggleText, dontKnowTime && styles.toggleActive]}>{t('form.unknownTime')}</Text>
                </TouchableOpacity>
              </View>
              {!dontKnowTime && (
                <>
                  <TouchableOpacity
                    style={styles.card}
                    onPress={() => { setShowTimePicker(v => !v); setShowDatePicker(false) }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.fieldValue}>{displayTime}</Text>
                    <Text style={styles.chevron}>{showTimePicker ? '▲' : '▼'}</Text>
                  </TouchableOpacity>
                  {showTimePicker && (
                    <View style={styles.pickerCard}>
                      <View style={styles.pickerHeaderRow}>
                        <Text style={[styles.colHeader, { flex: 1 }]}>Hora</Text>
                        <Text style={[styles.colHeader, { flex: 1 }]}>Min</Text>
                      </View>
                      <View style={styles.pickerColumns}>
                        <WheelPicker items={HOURS} selectedIndex={hourIdx} onChange={setHourIdx} />
                        <WheelPicker items={MINUTES} selectedIndex={minuteIdx} onChange={setMinuteIdx} />
                      </View>
                    </View>
                  )}
                </>
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
  fieldValue: {
    flex: 1,
    color: colors.white,
    fontSize: 16,
    fontFamily: typography.display,
  },
  chevron: {
    color: colors.gold,
    fontSize: 12,
    opacity: 0.7,
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
  pickerCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    borderWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.15)',
    borderLeftColor: 'rgba(255,255,255,0.04)',
    borderRightColor: 'rgba(255,255,255,0.04)',
    borderBottomColor: 'rgba(255,255,255,0.04)',
    marginTop: 8,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  pickerHeaderRow: {
    flexDirection: 'row',
    paddingTop: 10,
    paddingBottom: 4,
    paddingHorizontal: 4,
  },
  colHeader: {
    textAlign: 'center',
    color: colors.gold,
    fontSize: 10,
    letterSpacing: 1.5,
    opacity: 0.7,
    fontFamily: typography.bodyMedium,
  },
  pickerColumns: {
    flexDirection: 'row',
  },
  highlightBar: {
    position: 'absolute',
    top: ITEM_HEIGHT * 2,
    left: 6,
    right: 6,
    height: ITEM_HEIGHT,
    backgroundColor: colors.backgroundSoft,
    borderRadius: 12,
    zIndex: 0,
  },
  wheelRow: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelText:   { color: colors.whiteMuted, fontSize: 15, fontFamily: typography.display },
  wheelCenter: { color: colors.white, fontSize: 18, fontWeight: '600' },
  wheelNear:   { color: colors.whiteSubtle, fontSize: 15, opacity: 0.55 },
  wheelFar:    { color: colors.whiteSubtle, fontSize: 13, opacity: 0.22 },
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
