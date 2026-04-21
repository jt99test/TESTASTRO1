import { useEffect } from 'react'
import { View } from 'react-native'
import Svg, { Circle, Defs, RadialGradient, Rect, Stop, ClipPath, G } from 'react-native-svg'
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { colors } from '../constants/colors'

type MoonPhaseIconProps = {
  size?: number
  date?: Date
  phaseOverride?: number
}

const SYNODIC_MONTH = 29.530588853
const NEW_MOON_EPOCH = Date.UTC(2000, 0, 6, 18, 14, 0)
const AnimatedRect = Animated.createAnimatedComponent(Rect)

function getMoonPhase(date: Date) {
  const daysSinceEpoch = (date.getTime() - NEW_MOON_EPOCH) / 86400000
  const phase = ((daysSinceEpoch % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH / SYNODIC_MONTH
  return phase
}

export default function MoonPhaseIcon({ size = 54, date = new Date(), phaseOverride }: MoonPhaseIconProps) {
  const radius = size / 2
  const phase = phaseOverride ?? getMoonPhase(date)
  const reveal = useSharedValue(0)
  const shadowX = phase <= 0.5
    ? radius - (radius * 4 * phase)
    : radius + (radius * 4 * (1 - phase))

  useEffect(() => {
    reveal.value = 0
    reveal.value = withTiming(size, {
      duration: 1500,
      easing: Easing.inOut(Easing.cubic),
    })
  }, [reveal, size])

  const revealProps = useAnimatedProps(() => ({
    width: reveal.value,
  }))

  return (
    <View>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <RadialGradient id="moonGlow" cx="50%" cy="50%" r="60%">
            <Stop offset="0%" stopColor="rgba(232, 201, 122, 0.22)" />
            <Stop offset="100%" stopColor="rgba(232, 201, 122, 0)" />
          </RadialGradient>
          <ClipPath id="moonClip">
            <Circle cx={radius} cy={radius} r={radius - 2} />
          </ClipPath>
          <ClipPath id="moonReveal">
            <AnimatedRect animatedProps={revealProps} x="0" y="0" height={size} />
          </ClipPath>
        </Defs>

        <Circle cx={radius} cy={radius} r={radius} fill="url(#moonGlow)" />
        <Circle cx={radius} cy={radius} r={radius - 2} fill={colors.backgroundDeep} opacity={0.92} />
        <G clipPath="url(#moonReveal)">
          <Circle cx={radius} cy={radius} r={radius - 2} fill="#d9dfe8" opacity={0.95} />
        </G>
        <G clipPath="url(#moonClip)">
          <Rect x="0" y="0" width={size} height={size} fill="#d9dfe8" opacity={0.95} />
          <Circle cx={shadowX} cy={radius} r={radius - 2} fill={colors.backgroundDeep} />
        </G>
        <Circle
          cx={radius}
          cy={radius}
          r={radius - 2}
          fill="none"
          stroke="rgba(232, 201, 122, 0.45)"
          strokeWidth="1"
        />
      </Svg>
    </View>
  )
}
