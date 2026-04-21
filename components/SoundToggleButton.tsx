import { Pressable, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import AstroGlyph from './AstroGlyph'
import { useAmbientSound } from './AmbientSoundProvider'
import { colors } from '../constants/colors'

export default function SoundToggleButton() {
  const { muted, toggleMute } = useAmbientSound()

  return (
    <Pressable
      style={styles.button}
      onPress={async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        await toggleMute()
      }}
    >
      <AstroGlyph glyph={muted ? 'P' : 'Q'} size={18} color={muted ? colors.whiteMuted : colors.goldLight} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.18)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
  },
})
