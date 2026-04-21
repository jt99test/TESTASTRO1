import { useEffect } from 'react'
import { Text, TextProps } from 'react-native'
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

const AnimatedText = Animated.createAnimatedComponent(Text)

type AnimatedNumberProps = TextProps & {
  value: number
  suffix?: string
  prefix?: string
}

export default function AnimatedNumber({ value, suffix = '', prefix = '', style, ...rest }: AnimatedNumberProps) {
  const progress = useSharedValue(0)

  useEffect(() => {
    progress.value = 0
    progress.value = withTiming(value, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    })
  }, [progress, value])

  const animatedProps = useAnimatedProps(() => ({
    text: `${prefix}${Math.round(progress.value)}${suffix}`,
  } as any))

  return <AnimatedText {...rest} animatedProps={animatedProps} style={style} />
}
