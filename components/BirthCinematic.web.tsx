import { useEffect, useMemo, useRef } from 'react'
import { Animated, Easing, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { colors } from '../constants/colors'
import { typography } from '../constants/typography'

const EARTH_DAY = require('../assets/textures/earth-blue-marble.jpg')
const EARTH_NIGHT = require('../assets/textures/earth-night.jpg')

type BirthCinematicProps = {
  name: string
  location: string
  lat: number
  lng: number
  birthHour?: number | null
  onFocusComplete?: () => void
}

function inferDayBirth(hour?: number | null) {
  if (hour == null || Number.isNaN(hour)) return true
  return hour >= 6 && hour < 19
}

export default function BirthCinematic({ name, location, birthHour, onFocusComplete }: BirthCinematicProps) {
  const rotate = useRef(new Animated.Value(0)).current
  const scale = useRef(new Animated.Value(1)).current
  const opacity = useRef(new Animated.Value(0)).current
  const texture = useMemo(() => (inferDayBirth(birthHour) ? EARTH_DAY : EARTH_NIGHT), [birthHour])
  const parts = location.split(',').map((item) => item.trim()).filter(Boolean)
  const city = parts[0] ?? location
  const country = parts[parts.length - 1] ?? ''

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: 18000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start()

    Animated.sequence([
      Animated.delay(1000),
      Animated.timing(scale, {
        toValue: 2.2,
        duration: 2200,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start()

    Animated.sequence([
      Animated.delay(2000),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start()
    const focusTimer = setTimeout(() => onFocusComplete?.(), 3300)
    return () => clearTimeout(focusTimer)
  }, [onFocusComplete, opacity, rotate, scale])

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.planetWrap, { transform: [{ scale }] }]}>
        <Animated.View style={[styles.planet, { transform: [{ rotate: spin }] }]}>
          <Image source={texture} style={styles.image} contentFit="cover" />
          <LinearGradient
            colors={['rgba(181, 219, 255, 0.14)', 'rgba(5,8,18,0)', 'rgba(5,8,18,0.45)']}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </Animated.View>
      <Animated.View style={[styles.overlay, { opacity }]}>
        <Text style={styles.locationText}>{`${name} - ${city}${country && country !== city ? `, ${country}` : ''}`}</Text>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planetWrap: {
    width: 360,
    height: 360,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planet: {
    width: 320,
    height: 320,
    borderRadius: 160,
    overflow: 'hidden',
    shadowColor: '#85bbff',
    shadowOpacity: 0.28,
    shadowRadius: 36,
    shadowOffset: { width: 0, height: 0 },
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    bottom: 132,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(7, 10, 22, 0.38)',
    borderWidth: 1,
    borderColor: 'rgba(232, 201, 122, 0.14)',
  },
  locationText: {
    color: colors.goldLight,
    fontFamily: typography.body,
    fontSize: 13,
    letterSpacing: 1.8,
  },
})
