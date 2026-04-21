import { StyleSheet, Text, View } from 'react-native'
import AstroGlyph from './AstroGlyph'
import ShimmerText from './ShimmerText'
import { getAstronomiconSectionGlyph } from '../constants/astrology'
import { colors } from '../constants/colors'
import { typography } from '../constants/typography'

export default function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.row}>
      <AstroGlyph glyph={getAstronomiconSectionGlyph(title)} size={16} color={colors.goldLight} />
      <ShimmerText style={styles.label}>{title}</ShimmerText>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(234,184,78,0.18)',
  },
  label: {
    color: colors.gold,
    fontFamily: typography.bodyMedium,
    fontSize: 13,
    letterSpacing: 2.8,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(234,184,78,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 7,
  },
})
