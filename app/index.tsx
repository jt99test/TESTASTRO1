import { useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import AstroGlyph from '../components/AstroGlyph'
import ConstellationVeil from '../components/ConstellationVeil'
import CosmicBackdrop from '../components/CosmicBackdrop'
import GlassCard from '../components/GlassCard'
import HeroPlanet from '../components/HeroPlanet'
import ShimmerText from '../components/ShimmerText'
import SoundToggleButton from '../components/SoundToggleButton'
import { getCurrentMonthKey, loadLanguage, loadLatestReading, SupportedLanguage } from '../constants/appState'
import { getAstronomiconSectionGlyph } from '../constants/astrology'
import { colors } from '../constants/colors'
import { detectDeviceLanguage, setAppLanguage } from '../constants/i18n'
import { typography } from '../constants/typography'

export default function SplashScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const [hasSavedReading, setHasSavedReading] = useState(false)
  const [isMonthlyReady, setIsMonthlyReady] = useState(false)
  const [language, setLanguage] = useState<SupportedLanguage>('es')

  const introOpacity = useRef(new Animated.Value(0)).current
  const introY = useRef(new Animated.Value(26)).current
  const ctaScale = useRef(new Animated.Value(1)).current
  const shimmerX = useRef(new Animated.Value(-240)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(introOpacity, {
        toValue: 1,
        duration: 900,
        delay: 250,
        useNativeDriver: true,
      }),
      Animated.timing(introY, {
        toValue: 0,
        duration: 850,
        delay: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start()

    Animated.loop(
      Animated.sequence([
        Animated.timing(ctaScale, {
          toValue: 1.03,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(ctaScale, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start()

    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerX, {
          toValue: 280,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(1200),
        Animated.timing(shimmerX, {
          toValue: -240,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start()
  }, [ctaScale, introOpacity, introY, shimmerX])

  useEffect(() => {
    let alive = true
    Promise.all([loadLatestReading(), loadLanguage()])
      .then(([reading, storedLanguage]) => {
        if (!alive) return
        const resolvedLanguage = storedLanguage ?? detectDeviceLanguage()
        setLanguage(resolvedLanguage)
        setAppLanguage(resolvedLanguage)
        if (!reading) return
        setHasSavedReading(true)
        setIsMonthlyReady(reading.monthKey !== getCurrentMonthKey())
      })
      .catch(() => {
        if (!alive) return
        const fallbackLanguage = detectDeviceLanguage()
        setLanguage(fallbackLanguage)
        setAppLanguage(fallbackLanguage)
      })
    return () => {
      alive = false
    }
  }, [])

  return (
    <View style={styles.root}>
      <CosmicBackdrop variant="hero" />
      <ConstellationVeil />
      <View style={styles.soundWrap}>
        <SoundToggleButton />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.topLabelWrap}>
          <Text style={styles.topLabel}>{t('splash.topLabel')}</Text>
        </View>

        <HeroPlanet />

        <Animated.View style={{ opacity: introOpacity, transform: [{ translateY: introY }] }}>
          <ShimmerText style={styles.title}>SARITA</ShimmerText>
          <Text style={styles.subtitle}>{t('splash.subtitle')}</Text>
          <Text style={styles.tagline}>{t('splash.tagline')}</Text>
        </Animated.View>

        <View style={styles.featureRow}>
          <GlassCard style={styles.featureCard}>
            <AstroGlyph glyph={getAstronomiconSectionGlyph('carta natal')} size={18} color={colors.goldLight} style={styles.featureGlyph} />
            <Text style={styles.featureEyebrow}>CARTA</Text>
            <Text style={styles.featureText}>Natal, ascendente y rueda</Text>
          </GlassCard>
          <GlassCard style={styles.featureCard}>
            <AstroGlyph glyph={getAstronomiconSectionGlyph('lunas del mes')} size={18} color={colors.goldLight} style={styles.featureGlyph} />
            <Text style={styles.featureEyebrow}>CICLOS</Text>
            <Text style={styles.featureText}>Luna nueva, luna llena y transitos</Text>
          </GlassCard>
        </View>

        <Animated.View style={{ transform: [{ scale: ctaScale }] }}>
          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.9}
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
              router.push('/form')
            }}
          >
            <Animated.View
              pointerEvents="none"
              style={[
                styles.buttonShimmer,
                { transform: [{ translateX: shimmerX }, { rotate: '18deg' }] },
              ]}
            />
            <ShimmerText style={styles.buttonText}>{t('splash.cta')}</ShimmerText>
          </TouchableOpacity>
        </Animated.View>

        {hasSavedReading ? (
          <View style={styles.resumeWrap}>
            {isMonthlyReady ? <Text style={styles.resumeEyebrow}>{t('splash.monthlyReady')}</Text> : null}
            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.88}
              onPress={() => router.push('/results')}
            >
              <Text style={styles.secondaryButtonText}>{t('splash.resume')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <Text style={styles.footer}>efemerides suizas + astrologia psicologica + guia lunar</Text>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.backgroundDeep,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingTop: 72,
    paddingBottom: 54,
  },
  soundWrap: {
    position: 'absolute',
    top: 54,
    right: 24,
    zIndex: 20,
  },
  topLabelWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  topLabel: {
    color: colors.whiteSubtle,
    fontSize: 11,
    letterSpacing: 4,
    fontFamily: typography.body,
  },
  title: {
    fontSize: 58,
    lineHeight: 64,
    textAlign: 'center',
    color: colors.goldLight,
    fontFamily: typography.displayLight,
    letterSpacing: 8.6,
    marginBottom: 14,
    textShadowColor: 'rgba(0,0,0,0.52)',
    textShadowOffset: { width: 0, height: 8 },
    textShadowRadius: 22,
  },
  subtitle: {
    color: colors.gold,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: typography.bodyMedium,
    letterSpacing: 2.8,
    textTransform: 'uppercase',
    marginBottom: 16,
    textShadowColor: 'rgba(0,0,0,0.42)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
  },
  tagline: {
    color: colors.whiteSubtle,
    fontSize: 17,
    lineHeight: 28,
    textAlign: 'center',
    fontFamily: typography.body,
    marginBottom: 28,
    paddingHorizontal: 10,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 10,
  },
  featureRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  featureCard: {
    flex: 1,
  },
  featureGlyph: {
    marginBottom: 12,
  },
  featureEyebrow: {
    color: colors.goldLight,
    fontSize: 10,
    fontFamily: typography.bodyMedium,
    letterSpacing: 3,
    marginBottom: 8,
  },
  featureText: {
    color: colors.whiteSubtle,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: typography.body,
  },
  button: {
    backgroundColor: colors.gold,
    borderRadius: 999,
    paddingHorizontal: 30,
    paddingVertical: 18,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: colors.gold,
    shadowOpacity: 0.38,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
    marginBottom: 24,
  },
  buttonShimmer: {
    position: 'absolute',
    top: -24,
    bottom: -24,
    width: 92,
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  buttonText: {
    color: colors.backgroundDeep,
    fontSize: 14,
    fontFamily: typography.bodyMedium,
    letterSpacing: 3.2,
  },
  resumeWrap: {
    marginTop: -6,
    marginBottom: 24,
    alignItems: 'center',
  },
  resumeEyebrow: {
    color: colors.gold,
    fontSize: 11,
    fontFamily: typography.bodyMedium,
    letterSpacing: 2.1,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(17, 24, 45, 0.52)',
  },
  secondaryButtonText: {
    color: colors.white,
    letterSpacing: 1.8,
    fontFamily: typography.bodyMedium,
    fontSize: 12,
  },
  footer: {
    color: colors.whiteSubtle,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 18,
    letterSpacing: 1.4,
    fontFamily: typography.body,
  },
})
