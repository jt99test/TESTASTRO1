import { useEffect, useMemo } from 'react'
import { Dimensions, StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Defs, Ellipse, Line, RadialGradient, Rect, Stop } from 'react-native-svg'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { colors } from '../constants/colors'
import SpaceParticles from './SpaceParticles'

const { width, height } = Dimensions.get('window')

type Variant = 'hero' | 'form' | 'reading'

interface CosmicBackdropProps {
  variant?: Variant
}

const ORBS = [
  { size: 220, color: colors.nebulaRose, x: -70, y: height * 0.14 },
  { size: 280, color: colors.nebulaBlue, x: width * 0.34, y: height * 0.06 },
  { size: 220, color: colors.nebulaViolet, x: width * 0.62, y: height * 0.58 },
  { size: 180, color: colors.nebulaTeal, x: width * 0.74, y: height * 0.22 },
]

function DriftingNebula() {
  const shift0 = useSharedValue(0)
  const shift1 = useSharedValue(0)
  const shift2 = useSharedValue(0)
  const shift3 = useSharedValue(0)
  const shifts = [
    { progress: shift0, delay: 0 },
    { progress: shift1, delay: 900 },
    { progress: shift2, delay: 1800 },
    { progress: shift3, delay: 2700 },
  ]

  useEffect(() => {
    shifts.forEach(({ progress, delay }, i) => {
      progress.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 15000 + i * 1200, easing: Easing.inOut(Easing.sin) }),
            withTiming(0, { duration: 15000 + i * 1200, easing: Easing.inOut(Easing.sin) })
          ),
          -1,
          false
        )
      )
    })
  }, [shifts])

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {ORBS.map((orb, i) => {
        const animatedStyle = useAnimatedStyle(() => ({
          transform: [
            { translateX: shifts[i].progress.value * (i % 2 === 0 ? 26 : -18) },
            { translateY: shifts[i].progress.value * (i % 2 === 0 ? 18 : -24) },
            { scale: 1 + shifts[i].progress.value * 0.05 },
          ],
        }))

        return (
          <Animated.View
            key={i}
            style={[
              animatedStyle,
              styles.nebulaOrb,
              {
                width: orb.size,
                height: orb.size,
                borderRadius: orb.size / 2,
                left: orb.x,
                top: orb.y,
                backgroundColor: orb.color,
                opacity: 0.45,
              },
            ]}
          />
        )
      })}
    </View>
  )
}

function GalaxyLightscape() {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none" viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <RadialGradient id="galaxyCore" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="rgba(232, 201, 122, 0.20)" />
          <Stop offset="55%" stopColor="rgba(115, 144, 255, 0.10)" />
          <Stop offset="100%" stopColor="rgba(13, 16, 34, 0)" />
        </RadialGradient>
        <RadialGradient id="planetGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
          <Stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </RadialGradient>
      </Defs>

      <Rect x="0" y="0" width={width} height={height} fill="url(#galaxyCore)" opacity={0.28} />
      <Ellipse
        cx={width * 0.5}
        cy={height * 0.58}
        rx={width * 0.42}
        ry={height * 0.12}
        fill="rgba(55, 79, 158, 0.05)"
        transform={`rotate(-18 ${width * 0.5} ${height * 0.58})`}
      />
      <Ellipse
        cx={width * 0.47}
        cy={height * 0.55}
        rx={width * 0.28}
        ry={height * 0.055}
        fill="rgba(232, 201, 122, 0.04)"
        transform={`rotate(-18 ${width * 0.47} ${height * 0.55})`}
      />
      <Line x1={width * 0.1} y1={height * 0.2} x2={width * 0.82} y2={height * 0.06} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      <Line x1={width * 0.22} y1={height * 0.78} x2={width * 0.94} y2={height * 0.58} stroke="rgba(232,201,122,0.05)" strokeWidth="0.8" />
      <Ellipse cx={width * 0.82} cy={height * 0.18} rx="24" ry="24" fill="url(#planetGlow)" opacity={0.54} />
      <Ellipse cx={width * 0.82} cy={height * 0.18} rx="9" ry="9" fill="rgba(255,255,255,0.06)" />
    </Svg>
  )
}

export default function CosmicBackdrop({ variant = 'hero' }: CosmicBackdropProps) {
  const gradient = useMemo(() => {
    if (variant === 'reading') {
      return [colors.backgroundDeep, colors.background, '#0E062E', '#0A0425'] as const
    }

    if (variant === 'form') {
      return [colors.backgroundDeep, colors.background, '#0E062E', '#120840'] as const
    }

    return [colors.backgroundDeep, colors.background, '#0E062E', '#0A0425'] as const
  }, [variant])

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient colors={gradient} style={StyleSheet.absoluteFill} />
      <GalaxyLightscape />
      <DriftingNebula />
      <SpaceParticles />
    </View>
  )
}

const styles = StyleSheet.create({
  nebulaOrb: {
    position: 'absolute',
    opacity: 0.16,
    shadowColor: '#2f4f8a',
    shadowOpacity: 0.08,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 0 },
  },
})
