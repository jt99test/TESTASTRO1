import Constants from 'expo-constants'
import { PropsWithChildren, createContext } from 'react'
import type { ComponentType } from 'react'

type AmbientSoundContextValue = {
  muted: boolean
  toggleMute: () => Promise<void>
  playSuccessChime: () => Promise<void>
}

const isExpoGo = Constants.executionEnvironment === 'storeClient'

const noopValue: AmbientSoundContextValue = {
  muted: false,
  toggleMute: async () => {},
  playSuccessChime: async () => {},
}

const NoopCtx = createContext<AmbientSoundContextValue>(noopValue)

function NoopProvider({ children }: PropsWithChildren) {
  return <NoopCtx.Provider value={noopValue}>{children}</NoopCtx.Provider>
}

function noopHook() {
  return noopValue
}

const native = isExpoGo
  ? null
  : (require('./AmbientSoundProviderNative') as {
      AmbientSoundProvider: ComponentType<PropsWithChildren>
      useAmbientSound: () => AmbientSoundContextValue
    })

export const AmbientSoundProvider: ComponentType<PropsWithChildren> = native
  ? native.AmbientSoundProvider
  : NoopProvider

export const useAmbientSound: () => AmbientSoundContextValue = native
  ? native.useAmbientSound
  : noopHook
