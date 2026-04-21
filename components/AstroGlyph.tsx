import { Text, TextProps, TextStyle } from 'react-native'
import { ASTRO_FONT_FAMILY } from '../constants/astrology'

type AstroGlyphProps = TextProps & {
  glyph: string
  size?: number
  color?: string
  style?: TextStyle | TextStyle[]
}

export default function AstroGlyph({ glyph, size = 18, color, style, ...rest }: AstroGlyphProps) {
  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: ASTRO_FONT_FAMILY,
          fontSize: size,
          color,
          includeFontPadding: false,
        },
        style,
      ]}
    >
      {glyph}
    </Text>
  )
}
