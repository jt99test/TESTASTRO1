import { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import AstroGlyph from './AstroGlyph'
import { colors } from '../constants/colors'
import { typography } from '../constants/typography'

type CosmicTabButtonProps = {
  active: boolean
  glyph: string
  label: string
  onPress: () => void
}

export default function CosmicTabButton({ active, glyph, label, onPress }: CosmicTabButtonProps) {
  const glow = useRef(new Animated.Value(active ? 1 : 0)).current

  useEffect(() => {
    if (!active) {
      glow.stopAnimation()
      Animated.timing(glow, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start()
      return
    }

    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0.45,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start()
  }, [active, glow])

  const glowScale = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  })

  return (
    <TouchableOpacity
      style={styles.tabItem}
      onPress={async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        onPress()
      }}
      activeOpacity={0.82}
    >
      {active ? <View style={styles.indicator} /> : null}
      <View style={styles.iconWrap}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glow,
            {
              opacity: glow,
              transform: [{ scale: glowScale }],
            },
          ]}
        />
        <AstroGlyph
          glyph={glyph}
          size={22}
          color={active ? colors.goldLight : colors.whiteMuted}
          style={styles.icon}
        />
      </View>
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 8,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.goldLight,
    position: 'absolute',
    top: 0,
  },
  iconWrap: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(232, 201, 122, 0.18)',
    shadowColor: colors.goldLight,
    shadowOpacity: 0.65,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  icon: {
    textAlign: 'center',
  },
  label: {
    color: colors.whiteMuted,
    fontSize: 10,
    fontFamily: typography.bodyMedium,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  labelActive: {
    color: colors.goldLight,
  },
})
