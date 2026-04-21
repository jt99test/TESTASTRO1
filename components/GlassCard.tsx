import { PropsWithChildren } from 'react'
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native'
import { BlurView } from 'expo-blur'
import Animated, {
  FadeInDown,
  createAnimatedComponent,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import { colors } from '../constants/colors'
import { getAdaptiveBlurIntensity } from '../constants/performance'

type ElementTint = 'fire' | 'earth' | 'air' | 'water' | null | undefined

type GlassCardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>
  tint?: ElementTint
  onPress?: () => void
  delay?: number
}>

const TINTS: Record<Exclude<ElementTint, null | undefined>, string> = {
  fire: 'rgba(180,60,20,0.06)',
  water: 'rgba(20,80,180,0.06)',
  air: 'rgba(100,120,200,0.06)',
  earth: 'rgba(40,120,60,0.06)',
}
const AnimatedPressable = createAnimatedComponent(Pressable)

export default function GlassCard({ children, style, tint, onPress, delay = 0 }: GlassCardProps) {
  const scale = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 16, stiffness: 170 })
  }

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 16, stiffness: 170 })
  }

  return (
    <AnimatedPressable
      entering={FadeInDown.delay(delay).springify().damping(18).stiffness(120)}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.wrap, animatedStyle, style]}
    >
      <BlurView intensity={getAdaptiveBlurIntensity(20)} tint="dark" style={styles.blur}>
        <View style={[styles.tint, tint ? { backgroundColor: TINTS[tint] } : null]} />
        <View style={styles.innerGlow} />
        <View style={styles.content}>{children}</View>
      </BlurView>
    </AnimatedPressable>
  )
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    borderRadius: 20,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.15)',
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    borderLeftColor: 'rgba(255,255,255,0.04)',
    borderRightColor: 'rgba(255,255,255,0.04)',
    borderBottomColor: 'rgba(255,255,255,0.04)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  blur: {
    overflow: 'hidden',
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
  },
  innerGlow: {
    position: 'absolute',
    left: 1,
    right: 1,
    top: 0,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  content: {
    padding: 16,
  },
})
