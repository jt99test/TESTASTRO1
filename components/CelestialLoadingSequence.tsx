import { useEffect, useRef } from 'react'
import { Animated, Dimensions, Easing, StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, G, Line, Path } from 'react-native-svg'
import { LinearGradient } from 'expo-linear-gradient'
import { colors } from '../constants/colors'
import { typography } from '../constants/typography'

const { width, height } = Dimensions.get('window')

type CelestialLoadingSequenceProps = {
  name: string
  location: string
  onFocusComplete?: () => void
}

export default function CelestialLoadingSequence({
  name,
  location,
  onFocusComplete,
}: CelestialLoadingSequenceProps) {
  const orbit = useRef(new Animated.Value(0)).current
  const reverseOrbit = useRef(new Animated.Value(0)).current
  const pulse = useRef(new Animated.Value(0)).current
  const veil = useRef(new Animated.Value(0)).current
  const labelOpacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.loop(
      Animated.timing(orbit, { toValue: 1, duration: 14000, easing: Easing.linear, useNativeDriver: true })
    ).start()

    Animated.loop(
      Animated.timing(reverseOrbit, { toValue: 1, duration: 22000, easing: Easing.linear, useNativeDriver: true })
    ).start()

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start()

    Animated.sequence([
      Animated.delay(700),
      Animated.timing(veil, { toValue: 1, duration: 1700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start()

    Animated.sequence([
      Animated.delay(1300),
      Animated.timing(labelOpacity, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start()

    const focusTimer = setTimeout(() => onFocusComplete?.(), 3000)
    return () => clearTimeout(focusTimer)
  }, [labelOpacity, onFocusComplete, orbit, pulse, reverseOrbit, veil])

  const rotate = orbit.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
  const rotateReverse = reverseOrbit.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] })
  const haloScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.07] })
  const haloOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.34] })
  const veilOpacity = veil.interpolate({ inputRange: [0, 1], outputRange: [0, 1] })
  const veilTranslate = veil.interpolate({ inputRange: [0, 1], outputRange: [20, 0] })

  const place = location.split(',').slice(0, 2).map((item) => item.trim()).join(', ')

  return (
    <View style={styles.root} pointerEvents="none">
      <Svg width={width} height={height * 0.58} viewBox={`0 0 ${width} ${height * 0.58}`} style={styles.starMap}>
        <G opacity="0.22">
          <Line x1={width * 0.16} y1={height * 0.12} x2={width * 0.29} y2={height * 0.08} stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
          <Line x1={width * 0.29} y1={height * 0.08} x2={width * 0.38} y2={height * 0.17} stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
          <Line x1={width * 0.72} y1={height * 0.15} x2={width * 0.84} y2={height * 0.11} stroke="rgba(232,201,122,0.16)" strokeWidth="1" />
          <Line x1={width * 0.84} y1={height * 0.11} x2={width * 0.89} y2={height * 0.18} stroke="rgba(232,201,122,0.16)" strokeWidth="1" />
        </G>
        <Circle cx={width * 0.16} cy={height * 0.12} r="1.8" fill="rgba(255,255,255,0.78)" />
        <Circle cx={width * 0.29} cy={height * 0.08} r="2.4" fill="rgba(232,201,122,0.88)" />
        <Circle cx={width * 0.38} cy={height * 0.17} r="1.8" fill="rgba(156,192,255,0.74)" />
        <Circle cx={width * 0.72} cy={height * 0.15} r="1.8" fill="rgba(255,255,255,0.74)" />
        <Circle cx={width * 0.84} cy={height * 0.11} r="2.4" fill="rgba(232,201,122,0.86)" />
        <Circle cx={width * 0.89} cy={height * 0.18} r="1.6" fill="rgba(255,255,255,0.74)" />
      </Svg>

      <View style={styles.stage}>
        <Animated.View style={[styles.halo, { opacity: haloOpacity, transform: [{ scale: haloScale }] }]} />

        <Animated.View style={[styles.orbitOuter, { transform: [{ rotate }] }]}>
          <View style={[styles.orbitDot, styles.goldDot]} />
          <View style={[styles.orbitDot, styles.blueDot]} />
        </Animated.View>

        <Animated.View style={[styles.orbitInner, { transform: [{ rotate: rotateReverse }] }]}>
          <View style={[styles.smallDot, styles.whiteDot]} />
          <View style={[styles.smallDot, styles.roseDot]} />
        </Animated.View>

        <Svg width={280} height={280} viewBox="0 0 280 280" style={styles.sigil}>
          <Circle cx="140" cy="140" r="108" fill="none" stroke="rgba(232,201,122,0.18)" strokeWidth="1.2" />
          <Circle cx="140" cy="140" r="86" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="5 9" />
          <Circle cx="140" cy="140" r="60" fill="none" stroke="rgba(129,172,255,0.16)" strokeWidth="1" />
          <Path
            d="M140 62 L183 118 L162 192 L118 192 L97 118 Z"
            fill="none"
            stroke="rgba(232,201,122,0.32)"
            strokeWidth="1.1"
          />
          <Path
            d="M140 82 L166 140 L140 198 L114 140 Z"
            fill="none"
            stroke="rgba(140,180,255,0.28)"
            strokeWidth="1"
          />
          <Line x1="140" y1="32" x2="140" y2="248" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
          <Line x1="32" y1="140" x2="248" y2="140" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          <Circle cx="140" cy="140" r="14" fill="rgba(8,11,24,0.95)" stroke="rgba(232,201,122,0.72)" strokeWidth="1.8" />
          <Circle cx="140" cy="140" r="4" fill={colors.goldLight} />
        </Svg>

        <Animated.View style={[styles.veilWrap, { opacity: veilOpacity, transform: [{ translateY: veilTranslate }] }]}>
          <LinearGradient
            colors={['rgba(255,255,255,0.16)', 'rgba(147,173,255,0.1)', 'rgba(232,201,122,0.02)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.veil}
          />
        </Animated.View>
      </View>

      <Animated.View style={[styles.labelWrap, { opacity: labelOpacity }]}>
        <Text style={styles.labelName}>{name}</Text>
        <Text style={styles.labelPlace}>{place}</Text>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starMap: {
    position: 'absolute',
    top: 0,
  },
  stage: {
    width: width,
    height: height * 0.58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: 228,
    height: 228,
    borderRadius: 114,
    backgroundColor: 'rgba(125,165,255,0.14)',
    shadowColor: '#88aeff',
    shadowOpacity: 0.24,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 0 },
  },
  orbitOuter: {
    position: 'absolute',
    width: 238,
    height: 238,
    borderRadius: 119,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  orbitInner: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: 'rgba(232,201,122,0.12)',
  },
  orbitDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  goldDot: {
    top: 18,
    right: 56,
    backgroundColor: colors.goldLight,
    shadowColor: colors.goldLight,
    shadowOpacity: 0.62,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  blueDot: {
    bottom: 32,
    left: 28,
    backgroundColor: '#8db2ff',
    shadowColor: '#8db2ff',
    shadowOpacity: 0.56,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  smallDot: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  whiteDot: {
    top: 16,
    left: 84,
    backgroundColor: 'rgba(255,255,255,0.86)',
  },
  roseDot: {
    bottom: 14,
    right: 42,
    backgroundColor: 'rgba(211,125,162,0.72)',
  },
  sigil: {
    position: 'absolute',
  },
  veilWrap: {
    position: 'absolute',
    width: 180,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  veil: {
    width: 100,
    height: 260,
    borderRadius: 60,
    opacity: 0.9,
  },
  labelWrap: {
    position: 'absolute',
    bottom: 210,
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  labelName: {
    color: colors.goldLight,
    fontFamily: typography.displayLight,
    fontSize: 28,
    letterSpacing: 6,
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 6 },
    textShadowRadius: 18,
  },
  labelPlace: {
    color: colors.whiteSubtle,
    fontFamily: typography.body,
    fontSize: 12,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
})
