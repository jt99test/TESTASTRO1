import { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet, View } from 'react-native'
import Svg, { Circle, Line } from 'react-native-svg'
import { colors } from '../constants/colors'

const stars = [
  { x: 28, y: 34 }, { x: 64, y: 22 }, { x: 96, y: 46 }, { x: 134, y: 28 }, { x: 176, y: 54 },
  { x: 42, y: 116 }, { x: 86, y: 98 }, { x: 126, y: 132 }, { x: 166, y: 108 }, { x: 206, y: 142 },
  { x: 34, y: 212 }, { x: 76, y: 192 }, { x: 114, y: 228 }, { x: 156, y: 198 }, { x: 204, y: 232 },
]

const lines = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [5, 6], [6, 7], [7, 8], [8, 9],
  [10, 11], [11, 12], [12, 13], [13, 14],
  [1, 6], [3, 8], [6, 11], [8, 13],
]

export default function ConstellationVeil() {
  const drift = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 18000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 18000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start()
  }, [drift])

  const translateX = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 10],
  })

  const translateY = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 8],
  })

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        { transform: [{ translateX }, { translateY }] },
      ]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 240 260">
        {lines.map(([from, to], index) => (
          <Line
            key={`line-${index}`}
            x1={stars[from].x}
            y1={stars[from].y}
            x2={stars[to].x}
            y2={stars[to].y}
            stroke="rgba(232, 201, 122, 0.14)"
            strokeWidth="1"
          />
        ))}
        {stars.map((star, index) => (
          <Circle
            key={`star-${index}`}
            cx={star.x}
            cy={star.y}
            r={index % 4 === 0 ? 1.8 : 1.2}
            fill={colors.goldLight}
            opacity={index % 3 === 0 ? 0.38 : 0.22}
          />
        ))}
      </Svg>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    width: 240,
    height: 260,
    right: -24,
    top: 86,
    opacity: 0.75,
  },
})
