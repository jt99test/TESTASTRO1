import { Stack } from 'expo-router'
import { useFonts } from 'expo-font'
import { useEffect, useState } from 'react'
import {
  CormorantGaramond_300Light,
  CormorantGaramond_400Regular,
  CormorantGaramond_500Medium,
  CormorantGaramond_600SemiBold,
} from '@expo-google-fonts/cormorant-garamond'
import {
  DMSans_400Regular,
  DMSans_500Medium,
} from '@expo-google-fonts/dm-sans'
import { View, Text, StyleSheet } from 'react-native'
import { I18nextProvider } from 'react-i18next'
import { AmbientSoundProvider } from '../components/AmbientSoundProvider'
import { colors } from '../constants/colors'
import i18n, { initI18n } from '../constants/i18n'
import { typography } from '../constants/typography'

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false)
  const [fontsLoaded] = useFonts({
    Astronomicon: require('../assets/fonts/Astronomicon.ttf'),
    CormorantGaramond_300Light,
    CormorantGaramond_400Regular,
    CormorantGaramond_500Medium,
    CormorantGaramond_600SemiBold,
    DMSans_400Regular,
    DMSans_500Medium,
  })

  useEffect(() => {
    let alive = true
    initI18n().then(() => {
      if (alive) setI18nReady(true)
    })
    return () => {
      alive = false
    }
  }, [])

  if (!fontsLoaded || !i18nReady) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashBrand}>SARITA</Text>
      </View>
    )
  }

  return (
    <I18nextProvider i18n={i18n}>
      <AmbientSoundProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="form" />
          <Stack.Screen name="loading" />
          <Stack.Screen name="results" />
        </Stack>
      </AmbientSoundProvider>
    </I18nextProvider>
  )
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#080b18',
  },
  splashBrand: {
    color: colors.goldLight,
    fontFamily: typography.displayLight,
    fontSize: 36,
    letterSpacing: 8,
  },
})
