import AsyncStorage from '@react-native-async-storage/async-storage'
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio'
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AppState, AppStateStatus } from 'react-native'

const AMBIENT_AUDIO = require('../assets/audio/ambient-space-drone.mp3')
const CHIME_AUDIO = require('../assets/audio/soft-chime.mp3')
const SOUND_MUTED_KEY = 'sarita_sound_muted_v1'

type AmbientSoundContextValue = {
  muted: boolean
  toggleMute: () => Promise<void>
  playSuccessChime: () => Promise<void>
}

const AmbientSoundContext = createContext<AmbientSoundContextValue | null>(null)

async function fadeVolume(player: AudioPlayer, from: number, to: number, duration = 3000) {
  const steps = 12
  const stepDuration = Math.max(80, Math.round(duration / steps))

  for (let i = 0; i <= steps; i += 1) {
    const current = from + ((to - from) * i) / steps
    player.volume = current
    if (i < steps) {
      await new Promise((resolve) => setTimeout(resolve, stepDuration))
    }
  }
}

export function AmbientSoundProvider({ children }: PropsWithChildren) {
  const [muted, setMuted] = useState(false)
  const ambientRef = useRef<AudioPlayer | null>(null)
  const chimeRef = useRef<AudioPlayer | null>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    let alive = true

    ;(async () => {
      try {
        const raw = await AsyncStorage.getItem(SOUND_MUTED_KEY)
        if (alive) setMuted(raw === 'true')
      } catch {
        // ignore preference read errors
      }
    })()

    return () => {
      alive = false
      ambientRef.current?.release()
      chimeRef.current?.release()
    }
  }, [])

  useEffect(() => {
    let appStateSub: { remove: () => void } | null = null

    const init = async () => {
      if (initializedRef.current) return
      initializedRef.current = true

      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: false,
          interruptionMode: 'duckOthers',
        })

        const ambient = createAudioPlayer(AMBIENT_AUDIO)
        ambient.loop = true
        ambient.volume = 0
        ambientRef.current = ambient

        const chime = createAudioPlayer(CHIME_AUDIO)
        chime.volume = muted ? 0 : 0.4
        chimeRef.current = chime

        if (!muted) {
          ambient.play()
          await fadeVolume(ambient, 0, 0.15, 3000)
        }
      } catch {
        // fail silently
      }

      appStateSub = AppState.addEventListener('change', async (state: AppStateStatus) => {
        const ambient = ambientRef.current
        if (!ambient) return

        try {
          if (state === 'active' && !muted) {
            ambient.play()
            await fadeVolume(ambient, 0, 0.15, 1500)
          } else {
            await fadeVolume(ambient, 0.15, 0, 1200)
            ambient.pause()
          }
        } catch {
          // ignore audio lifecycle failures
        }
      })
    }

    init()

    return () => {
      appStateSub?.remove()
    }
  }, [muted])

  const value = useMemo<AmbientSoundContextValue>(() => ({
    muted,
    toggleMute: async () => {
      const next = !muted
      setMuted(next)
      await AsyncStorage.setItem(SOUND_MUTED_KEY, String(next))
      const ambient = ambientRef.current
      const chime = chimeRef.current

      try {
        if (ambient) {
          if (next) {
            await fadeVolume(ambient, 0.15, 0, 800)
            ambient.pause()
          } else {
            ambient.play()
            await fadeVolume(ambient, 0, 0.15, 1400)
          }
        }

        if (chime) {
          chime.volume = next ? 0 : 0.4
        }
      } catch {
        // ignore toggle failures
      }
    },
    playSuccessChime: async () => {
      const chime = chimeRef.current
      if (!chime || muted) return
      try {
        chime.seekTo(0)
        chime.play()
      } catch {
        // ignore play failures
      }
    },
  }), [muted])

  return <AmbientSoundContext.Provider value={value}>{children}</AmbientSoundContext.Provider>
}

export function useAmbientSound() {
  const ctx = useContext(AmbientSoundContext)
  if (!ctx) {
    throw new Error('useAmbientSound must be used inside AmbientSoundProvider')
  }
  return ctx
}
