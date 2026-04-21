import { ReactNode, useEffect } from 'react'
import { StyleProp, StyleSheet, Text, TextStyle, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'

type ShimmerTextProps = {
  children: ReactNode
  style?: StyleProp<TextStyle>
  shimmer?: boolean
}

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient)

export default function ShimmerText({ children, style, shimmer = true }: ShimmerTextProps) {
  const translate = useSharedValue(-220)

  useEffect(() => {
    if (!shimmer) return
    translate.value = withRepeat(
      withSequence(
        withTiming(-220, { duration: 0 }),
        withTiming(240, { duration: 3000, easing: Easing.inOut(Easing.cubic) }),
        withDelay(5000, withTiming(-220, { duration: 0 }))
      ),
      -1,
      false
    )
  }, [shimmer, translate])

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translate.value }, { rotate: '16deg' }],
  }))

  return (
    <View style={styles.wrap}>
      <Text style={style}>{children}</Text>
      {shimmer ? (
        <AnimatedGradient
          pointerEvents="none"
          colors={['rgba(201,168,76,0)', '#c9a84c', '#f5e17a', '#e8c97a', 'rgba(201,168,76,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.shimmer, shimmerStyle]}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: -12,
    bottom: -12,
    width: 84,
    opacity: 0.24,
  },
})
