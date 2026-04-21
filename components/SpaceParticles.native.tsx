import { useEffect, useRef } from 'react'
import { Animated, Dimensions, Easing, StyleSheet } from 'react-native'
import Svg, { Circle } from 'react-native-svg'

const { width, height } = Dimensions.get('window')
const AnimatedCircle = Animated.createAnimatedComponent(Circle)

const stars = Array.from({ length: 96 }, (_, index) => ({
  id: index,
  x: Math.random() * width,
  y: Math.random() * height,
  radius: 0.35 + Math.random() * 1.15,
  baseOpacity: 0.04 + Math.random() * 0.16,
  driftX: (Math.random() - 0.5) * 22,
  driftY: (Math.random() - 0.5) * 28,
  twinkleDuration: 2600 + Math.random() * 5000,
  delay: Math.random() * 2400,
}))

export default function SpaceParticles() {
  const twinkles = useRef(stars.map((star) => new Animated.Value(star.baseOpacity))).current
  const drifts = useRef(stars.map(() => new Animated.Value(0))).current

  useEffect(() => {
    stars.forEach((star, index) => {
      const twinkle = () => {
        Animated.sequence([
          Animated.timing(twinkles[index], {
            toValue: Math.min(0.34, star.baseOpacity + 0.1),
            duration: star.twinkleDuration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(twinkles[index], {
            toValue: star.baseOpacity,
            duration: star.twinkleDuration * 0.9,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]).start(({ finished }) => {
          if (finished) twinkle()
        })
      }

      const drift = Animated.loop(
        Animated.sequence([
          Animated.timing(drifts[index], {
            toValue: 1,
            duration: 12000 + index * 10,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(drifts[index], {
            toValue: 0,
            duration: 12000 + index * 10,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      )

      const timer = setTimeout(() => {
        twinkle()
        drift.start()
      }, star.delay)

      return () => clearTimeout(timer)
    })
  }, [drifts, twinkles])

  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      {stars.map((star, index) => {
        const translateX = drifts[index].interpolate({
          inputRange: [0, 1],
          outputRange: [0, star.driftX],
        })
        const translateY = drifts[index].interpolate({
          inputRange: [0, 1],
          outputRange: [0, star.driftY],
        })

        return (
          <AnimatedCircle
            key={star.id}
            cx={star.x}
            cy={star.y}
            r={star.radius}
            fill="#fff"
            opacity={twinkles[index]}
            transform={[{ translateX }, { translateY }]}
          />
        )
      })}
    </Svg>
  )
}
