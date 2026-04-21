import { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet, View } from 'react-native'
import Svg, { Circle, G, Line } from 'react-native-svg'
import { LinearGradient } from 'expo-linear-gradient'
import { colors } from '../constants/colors'

export default function HeroPlanet() {
  const drift = useRef(new Animated.Value(0)).current
  const orbit = useRef(new Animated.Value(0)).current
  const reverseOrbit = useRef(new Animated.Value(0)).current
  const pulse = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 8200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 8200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start()

    Animated.loop(
      Animated.timing(orbit, { toValue: 1, duration: 22000, easing: Easing.linear, useNativeDriver: true })
    ).start()

    Animated.loop(
      Animated.timing(reverseOrbit, { toValue: 1, duration: 30000, easing: Easing.linear, useNativeDriver: true })
    ).start()

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start()
  }, [drift, orbit, pulse, reverseOrbit])

  const translateY = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -10] })
  const scale = drift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] })
  const rotate = orbit.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
  const rotateReverse = reverseOrbit.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] })
  const haloOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.44] })
  const haloScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.06] })

  return (
    <Animated.View style={[styles.wrap, { transform: [{ translateY }, { scale }] }]}>
      <Animated.View style={[styles.outerHalo, { opacity: haloOpacity, transform: [{ scale: haloScale }] }]} />
      <View style={styles.softGlow} />

      <Animated.View style={[styles.orbitRingWide, { transform: [{ rotate }] }]}>
        <View style={[styles.orbitDot, styles.orbitDotGold]} />
        <View style={[styles.orbitDot, styles.orbitDotBlue]} />
      </Animated.View>

      <Animated.View style={[styles.orbitRingTight, { transform: [{ rotate: rotateReverse }] }]}>
        <View style={[styles.orbitDotTiny, styles.orbitDotPearl]} />
        <View style={[styles.orbitDotTiny, styles.orbitDotRose]} />
      </Animated.View>

      <Svg width={320} height={320} viewBox="0 0 320 320" style={styles.svgLayer} pointerEvents="none">
        <Circle cx="160" cy="160" r="118" stroke="rgba(232, 201, 122, 0.18)" strokeWidth="1.1" fill="none" />
        <Circle cx="160" cy="160" r="94" stroke="rgba(138, 173, 255, 0.14)" strokeWidth="1" strokeDasharray="4 10" fill="none" />
        <Circle cx="160" cy="160" r="72" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" fill="none" />
        <G opacity="0.42">
          <Line x1="68" y1="108" x2="114" y2="86" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
          <Line x1="114" y1="86" x2="138" y2="114" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
          <Line x1="204" y1="70" x2="236" y2="110" stroke="rgba(232,201,122,0.15)" strokeWidth="1" />
          <Line x1="236" y1="110" x2="264" y2="102" stroke="rgba(232,201,122,0.15)" strokeWidth="1" />
        </G>
        <Circle cx="68" cy="108" r="2" fill="rgba(255,255,255,0.72)" />
        <Circle cx="114" cy="86" r="2.4" fill="rgba(232,201,122,0.82)" />
        <Circle cx="138" cy="114" r="1.8" fill="rgba(173,198,255,0.72)" />
        <Circle cx="204" cy="70" r="1.8" fill="rgba(255,255,255,0.7)" />
        <Circle cx="236" cy="110" r="2.5" fill="rgba(232,201,122,0.84)" />
        <Circle cx="264" cy="102" r="1.8" fill="rgba(255,255,255,0.7)" />
      </Svg>

      <View style={styles.coreWrap}>
        <LinearGradient
          colors={['#091127', '#18234c', '#231941', '#070b17']}
          start={{ x: 0.18, y: 0.08 }}
          end={{ x: 0.84, y: 0.92 }}
          style={styles.core}
        >
          <View style={styles.innerAura} />
          <LinearGradient
            colors={['rgba(255,255,255,0.26)', 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0)']}
            start={{ x: 0.18, y: 0.1 }}
            end={{ x: 0.78, y: 0.82 }}
            style={styles.highlight}
          />
          <LinearGradient
            colors={['rgba(232,201,122,0.18)', 'rgba(125,182,255,0.08)', 'rgba(13,16,34,0.02)']}
            start={{ x: 0.24, y: 0.22 }}
            end={{ x: 0.88, y: 0.88 }}
            style={styles.mist}
          />
        </LinearGradient>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    width: 320,
    height: 320,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 34,
  },
  outerHalo: {
    position: 'absolute',
    width: 270,
    height: 270,
    borderRadius: 135,
    backgroundColor: 'rgba(100, 128, 240, 0.14)',
    shadowColor: '#7da2ff',
    shadowOpacity: 0.36,
    shadowRadius: 42,
    shadowOffset: { width: 0, height: 0 },
  },
  softGlow: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: 'rgba(232,201,122,0.08)',
    shadowColor: colors.gold,
    shadowOpacity: 0.24,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 0 },
  },
  orbitRingWide: {
    position: 'absolute',
    width: 274,
    height: 274,
    borderRadius: 137,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  orbitRingTight: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: 'rgba(232,201,122,0.1)',
  },
  orbitDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  orbitDotGold: {
    top: 18,
    left: 186,
    backgroundColor: colors.goldLight,
    shadowColor: colors.goldLight,
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  orbitDotBlue: {
    bottom: 42,
    left: 24,
    backgroundColor: '#8ab2ff',
    shadowColor: '#8ab2ff',
    shadowOpacity: 0.56,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  orbitDotTiny: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  orbitDotPearl: {
    top: 14,
    left: 98,
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  orbitDotRose: {
    bottom: 18,
    right: 62,
    backgroundColor: 'rgba(208,126,154,0.72)',
  },
  svgLayer: {
    position: 'absolute',
  },
  coreWrap: {
    width: 204,
    height: 204,
    borderRadius: 102,
    overflow: 'hidden',
    shadowColor: '#5d7fff',
    shadowOpacity: 0.32,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
  },
  core: {
    flex: 1,
    borderRadius: 102,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerAura: {
    position: 'absolute',
    width: 136,
    height: 136,
    borderRadius: 68,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  highlight: {
    ...StyleSheet.absoluteFillObject,
  },
  mist: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.86,
  },
})
