import { useEffect, useRef } from 'react'
import { Animated, Dimensions, Easing, PixelRatio, StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, G, Line } from 'react-native-svg'
import Constants from 'expo-constants'
import { Image } from 'expo-image'
import { colors } from '../constants/colors'
import { typography } from '../constants/typography'
import type { ComponentType } from 'react'

const { width, height } = Dimensions.get('window')
const AnimatedCircle = Animated.createAnimatedComponent(Circle)
const EARTH_DAY = require('../assets/textures/earth-blue-marble.jpg')
const EARTH_NIGHT = require('../assets/textures/earth-night.jpg')

const isExpoGo = Constants.executionEnvironment === 'storeClient'

type BirthCinematicProps = {
  name: string
  location: string
  lat: number
  lng: number
  birthHour?: number | null
  onFocusComplete?: () => void
}

// Conditional require keeps expo-gl from loading (and crashing) in Expo Go.
const BirthCinematicGL: ComponentType<BirthCinematicProps> | null = isExpoGo
  ? null
  : (require('./BirthCinematicGL') as { default: ComponentType<BirthCinematicProps> }).default

function isLowPerformanceDevice() {
  const minSide = Math.min(width, height)
  return minSide < 390 || (PixelRatio.get() >= 3 && minSide < 430)
}

function formatLocationLabel(name: string, location: string) {
  const parts = location.split(',').map((s) => s.trim()).filter(Boolean)
  const city = parts[0] ?? location
  const country = parts[parts.length - 1] ?? ''
  return `${name} - ${city}${country && country !== city ? `, ${country}` : ''}`
}

function inferDayBirth(hour?: number | null) {
  if (hour == null || Number.isNaN(hour)) return true
  return hour >= 6 && hour < 19
}

function projectLatLngToDisc(lat: number, lng: number, radius: number) {
  const latRad = (lat * Math.PI) / 180
  const lngRad = (lng * Math.PI) / 180
  const x = Math.sin(lngRad) * Math.cos(latRad) * radius * 0.84
  const y = -Math.sin(latRad) * radius * 0.82
  return { x, y }
}

function EarthFallback({
  label,
  lat,
  lng,
  birthHour,
  onFocusComplete,
}: {
  label: string
  lat: number
  lng: number
  birthHour?: number | null
  onFocusComplete?: () => void
}) {
  const dotPulse = useRef(new Animated.Value(0.32)).current
  const labelOpacity = useRef(new Animated.Value(0)).current
  const globeScale = useRef(new Animated.Value(1)).current
  const globeRotate = useRef(new Animated.Value(0)).current
  const globeShift = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current
  const earthTexture = inferDayBirth(birthHour) ? EARTH_DAY : EARTH_NIGHT
  const discSize = Math.min(width * 1.02, 430)
  const radius = discSize / 2
  const marker = projectLatLngToDisc(lat, lng, radius)

  useEffect(() => {
    Animated.loop(
      Animated.timing(globeRotate, {
        toValue: 1,
        duration: 26000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start()

    Animated.sequence([
      Animated.delay(1000),
      Animated.parallel([
        Animated.timing(globeScale, {
          toValue: 2.75,
          duration: 2200,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(globeShift, {
          toValue: {
            x: -marker.x * 1.65,
            y: -marker.y * 1.65 + 18,
          },
          duration: 2200,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start()

    Animated.loop(
      Animated.sequence([
        Animated.timing(dotPulse, { toValue: 0.88, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(dotPulse, { toValue: 0.28, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start()

    Animated.sequence([
      Animated.delay(1900),
      Animated.timing(labelOpacity, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start()

    const focusTimer = setTimeout(() => onFocusComplete?.(), 3300)
    return () => clearTimeout(focusTimer)
  }, [dotPulse, globeRotate, globeScale, globeShift, labelOpacity, marker.x, marker.y, onFocusComplete])

  const rotate = globeRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  return (
    <View style={styles.wrap}>
      <View style={styles.fallbackSpace}>
        <Svg width={width} height={height * 0.62} viewBox={`0 0 ${width} ${height * 0.62}`} style={styles.fallbackSvg}>
          <G opacity={0.22}>
            <Line x1={width * 0.12} y1={height * 0.15} x2={width * 0.3} y2={height * 0.11} stroke="rgba(255,255,255,0.16)" strokeWidth="1" />
            <Line x1={width * 0.7} y1={height * 0.16} x2={width * 0.84} y2={height * 0.22} stroke="rgba(232,201,122,0.18)" strokeWidth="1" />
          </G>
          <Circle cx={width * 0.18} cy={height * 0.1} r="1.5" fill="rgba(255,255,255,0.8)" />
          <Circle cx={width * 0.79} cy={height * 0.16} r="2" fill="rgba(255,255,255,0.72)" />
        </Svg>
        <View style={styles.earthStage}>
          <View style={styles.atmosphereHalo} />
          <Animated.View
            style={[
              styles.earthWrap,
              {
                width: discSize,
                height: discSize,
                borderRadius: radius,
                transform: [
                  { translateX: globeShift.x },
                  { translateY: globeShift.y },
                  { scale: globeScale },
                  { rotate },
                ],
              },
            ]}
          >
            <Image source={earthTexture} style={styles.earthTexture} contentFit="cover" />
            <View style={styles.earthShade} />
            <Animated.View
              style={[
                styles.markerGlow,
                {
                  left: radius + marker.x - 18,
                  top: radius + marker.y - 18,
                  opacity: dotPulse,
                },
              ]}
            />
            <View
              style={[
                styles.markerCore,
                {
                  left: radius + marker.x - 4,
                  top: radius + marker.y - 4,
                },
              ]}
            />
          </Animated.View>
        </View>
      </View>
      <Animated.View style={[styles.overlay, { opacity: labelOpacity }]}>
        <Text style={styles.locationText}>{label}</Text>
      </Animated.View>
    </View>
  )
}

export default function BirthCinematic({ name, location, lat, lng, birthHour, onFocusComplete }: BirthCinematicProps) {
  const label = formatLocationLabel(name, location)

  if (BirthCinematicGL && !isLowPerformanceDevice()) {
    return <BirthCinematicGL name={name} location={location} lat={lat} lng={lng} birthHour={birthHour} onFocusComplete={onFocusComplete} />
  }

  return <EarthFallback label={label} lat={lat} lng={lng} birthHour={birthHour} onFocusComplete={onFocusComplete} />
}

const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  fallbackSpace: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  earthStage: {
    width: width,
    height: height * 0.68,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  atmosphereHalo: {
    position: 'absolute',
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: 'rgba(122, 174, 255, 0.12)',
    shadowColor: '#7db6ff',
    shadowOpacity: 0.22,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
  },
  earthWrap: {
    overflow: 'hidden',
    backgroundColor: '#050915',
  },
  earthTexture: {
    width: '100%',
    height: '100%',
  },
  earthShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 7, 15, 0.12)',
  },
  markerGlow: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(232,201,122,0.22)',
  },
  markerCore: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.goldLight,
    shadowColor: colors.goldLight,
    shadowOpacity: 0.65,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  overlay: {
    position: 'absolute',
    bottom: 132,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(7, 10, 22, 0.38)',
    borderWidth: 1,
    borderColor: 'rgba(232, 201, 122, 0.14)',
  },
  locationText: { color: colors.goldLight, fontFamily: typography.body, fontSize: 13, letterSpacing: 1.8 },
  fallbackSvg: { position: 'absolute', top: 0 },
})
