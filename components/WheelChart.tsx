import { useEffect, useMemo, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { View, Text, StyleSheet, Dimensions } from 'react-native'
import * as Haptics from 'expo-haptics'
import Svg, { G, Path, Circle, Line, Text as ST, Rect } from 'react-native-svg'
import Animated, {
  Easing,
  cancelAnimation,
  createAnimatedComponent,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { colors } from '../constants/colors'
import { WHEEL_HINT_STORAGE_KEY } from '../constants/appState'
import { typography } from '../constants/typography'

const { width } = Dimensions.get('window')

const WHEEL_SIZE = Math.min(width - 24, 360)
const CX = WHEEL_SIZE / 2
const CY = WHEEL_SIZE / 2
const R_OUTER = WHEEL_SIZE * 0.485
const R_ZI = WHEEL_SIZE * 0.405
const R_HI = WHEEL_SIZE * 0.345
const R_PL = WHEEL_SIZE * 0.285
const R_ASP = WHEEL_SIZE * 0.225
const R_DOT = 4
const SIGNS = [
  'Aries', 'Tauro', 'Géminis', 'Cáncer', 'Leo', 'Virgo',
  'Libra', 'Escorpio', 'Sagitario', 'Capricornio', 'Acuario', 'Piscis',
]

const ZODIAC_GLYPHS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓']

const SIGN_COLOR: Record<string, string> = {
  Aries: colors.fire,
  Leo: colors.fire,
  Sagitario: colors.fire,
  Tauro: colors.earth,
  Virgo: colors.earth,
  Capricornio: colors.earth,
  Géminis: colors.air,
  Libra: colors.air,
  Acuario: colors.air,
  Cáncer: colors.water,
  Escorpio: colors.water,
  Piscis: colors.water,
}

const SIGN_MEANING: Record<string, string> = {
  Aries: 'Iniciativa, impulso y valentía para abrir camino.',
  Tauro: 'Estabilidad, placer, recursos y capacidad de sostener.',
  Géminis: 'Curiosidad, lenguaje, intercambio mental y movimiento.',
  Cáncer: 'Emoción, cuidado, refugio interno y memoria afectiva.',
  Leo: 'Expresión, brillo, creatividad y deseo de corazón.',
  Virgo: 'Orden, discernimiento, mejora y atención al detalle.',
  Libra: 'Vínculo, equilibrio, belleza y aprendizaje con el otro.',
  Escorpio: 'Profundidad, intensidad, transformación y verdad emocional.',
  Sagitario: 'Expansión, fe, visión, viaje y sentido.',
  Capricornio: 'Estructura, ambición, madurez y construcción a largo plazo.',
  Acuario: 'Innovación, diferencia, libertad y mirada colectiva.',
  Piscis: 'Sensibilidad, intuición, compasión y conexión sutil.',
}

export const ASPECT_DEFS = [
  { name: 'Conj', angle: 0, orb: 8, color: '#e8c97a', glowColor: 'rgba(232,201,122,0.15)' },
  { name: 'Sext', angle: 60, orb: 6, color: '#5be8a0', glowColor: 'rgba(91,232,160,0.15)' },
  { name: 'Incon', angle: 150, orb: 3, color: '#d9c3ff', glowColor: 'rgba(217,195,255,0.16)' },
  { name: 'Cuad', angle: 90, orb: 8, color: '#e87ac0', glowColor: 'rgba(232,122,192,0.15)' },
  { name: 'Trin', angle: 120, orb: 8, color: '#5bb8e8', glowColor: 'rgba(91,184,232,0.15)' },
  { name: 'Opos', angle: 180, orb: 8, color: '#e87a5b', glowColor: 'rgba(232,122,91,0.15)' },
]

export const PLANET_MEANING: Record<string, string> = {
  Sol: 'Tu identidad esencial y propósito de vida.',
  Luna: 'Tus emociones, instintos y mundo interior.',
  Mercurio: 'Tu forma de pensar y comunicarte.',
  Venus: 'Lo que amas, valoras y cómo te vinculas.',
  Marte: 'Tu energía, deseo y manera de actuar.',
  Júpiter: 'Dónde encuentras expansión y crecimiento.',
  Saturno: 'Tus límites, responsabilidad y lecciones.',
  Urano: 'Donde buscas libertad, cambio y autenticidad.',
  Neptuno: 'Tu espiritualidad, intuición y sensibilidad sutil.',
  Plutón: 'Donde experimentas transformación profunda.',
  Quirón: 'Tu herida más profunda y tu medicina.',
  'Nodo Norte': 'La dirección de tu aprendizaje evolutivo.',
  'Nodo Sur': 'Tu zona conocida y tus hábitos de alma.',
  'Black Moon Natural': 'Tu luna negra media: instinto, sombra y deseo sin domesticar.',
  Priapo: 'Tu punto de compensación instintiva: donde buscas llenar lo que sientes que falta.',
  Ascendente: 'Tu puerta de entrada al mundo y tu forma de comenzar.',
}

export interface WheelPlanet {
  name: string
  glyph: string
  longitude: number
  sign: string
  degree: number
  minutes: number
  house: number
  element?: string
}

export interface WheelPositions {
  ascendant: { longitude: number; sign: string; degree: number; minutes: number }
  mc: { longitude: number; sign: string; degree: number; minutes: number }
  planets: WheelPlanet[]
}

export interface AspectHit {
  i: number
  j: number
  name: string
  angle: number
  orb: number
  color: string
  glowColor?: string
}

type SelectedTarget =
  | { type: 'planet'; name: string }
  | { type: 'sign'; name: string }
  | null

const AnimatedLine = createAnimatedComponent(Line)
const AnimatedView = Animated.View

function polar(r: number, deg: number) {
  const rad = (deg * Math.PI) / 180
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) }
}

function lonToSvg(lon: number, ascLon: number) {
  return ((180 - (lon - ascLon)) % 360 + 360) % 360
}

function makeSector(r1: number, r2: number, a1: number, a2: number) {
  const f = (n: number) => n.toFixed(3)
  const p1 = polar(r1, a1)
  const p2 = polar(r1, a2)
  const p3 = polar(r2, a2)
  const p4 = polar(r2, a1)
  const span = ((a1 - a2) + 360) % 360
  const lg = span > 180 ? 1 : 0
  return [
    `M ${f(p1.x)} ${f(p1.y)}`,
    `A ${r1} ${r1} 0 ${lg} 0 ${f(p2.x)} ${f(p2.y)}`,
    `L ${f(p3.x)} ${f(p3.y)}`,
    `A ${r2} ${r2} 0 ${lg} 1 ${f(p4.x)} ${f(p4.y)}`,
    'Z',
  ].join(' ')
}

export function calcAspects(planets: WheelPlanet[]): AspectHit[] {
  const result: AspectHit[] = []
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const diff = Math.abs(planets[i].longitude - planets[j].longitude)
      const angle = diff > 180 ? 360 - diff : diff
      for (const asp of ASPECT_DEFS) {
        const actualOrb = Math.abs(angle - asp.angle)
        if (actualOrb <= asp.orb) {
          result.push({ i, j, name: asp.name, angle: asp.angle, orb: actualOrb, color: asp.color, glowColor: asp.glowColor })
          break
        }
      }
    }
  }
  return result
}

function lineLength(x1: number, y1: number, x2: number, y2: number) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

function AspectLine({
  asp,
  idx,
  p1,
  p2,
  active,
}: {
  asp: AspectHit
  idx: number
  p1: { x: number; y: number }
  p2: { x: number; y: number }
  active: boolean
}) {
  const progress = useSharedValue(0)
  const length = lineLength(p1.x, p1.y, p2.x, p2.y)

  useEffect(() => {
    progress.value = 0
    progress.value = withDelay(idx * 120, withTiming(1, { duration: 1500, easing: Easing.out(Easing.cubic) }))
  }, [idx, progress])

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: length * (1 - progress.value),
    opacity: active ? 0.9 : 0.08 + progress.value * 0.06,
  }))

  const animatedGlowProps = useAnimatedProps(() => ({
    strokeDashoffset: length * (1 - progress.value),
    opacity: active ? 1 : 0.12,
  }))

  return (
    <>
      <AnimatedLine
        animatedProps={animatedGlowProps}
        x1={p1.x}
        y1={p1.y}
        x2={p2.x}
        y2={p2.y}
        stroke={asp.glowColor ?? asp.color}
        strokeWidth={4}
        strokeDasharray={`${length} ${length}`}
      />
      <AnimatedLine
        animatedProps={animatedProps}
        x1={p1.x}
        y1={p1.y}
        x2={p2.x}
        y2={p2.y}
        stroke={asp.color}
        strokeWidth={1.5}
        strokeDasharray={`${length} ${length}`}
      />
    </>
  )
}

function WheelSvg({
  positions,
  aspects,
  selected,
  pulseOn,
  showHintPulse,
  onSelect,
}: {
  positions: WheelPositions
  aspects: AspectHit[]
  selected: SelectedTarget
  pulseOn: boolean
  showHintPulse: boolean
  onSelect: (target: SelectedTarget) => void
}) {
  const ascLon = positions.ascendant.longitude
  const mcLon = positions.mc.longitude
  const planets = positions.planets

  const svg = (lon: number) => lonToSvg(lon, ascLon)
  const pt = (r: number, lon: number) => polar(r, svg(lon))

  return (
    <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
      <Rect x={0} y={0} width={WHEEL_SIZE} height={WHEEL_SIZE} fill="transparent" onPress={() => onSelect(null)} />

      <Circle cx={CX} cy={CY} r={R_OUTER} fill={colors.background} stroke={colors.border} strokeWidth={1} />

      {SIGNS.map((sign, i) => {
        const a1 = svg(i * 30)
        const a2 = svg((i + 1) * 30)
        const isSelected = selected?.type === 'sign' && selected.name === sign
        return (
          <Path
            key={`zs-${sign}`}
            d={makeSector(R_OUTER, R_ZI, a1, a2)}
            fill={SIGN_COLOR[sign] ?? colors.silver}
            opacity={isSelected ? 0.32 : 0.2}
            onPress={() => onSelect(isSelected ? null : { type: 'sign', name: sign })}
          />
        )
      })}

      {Array.from({ length: 12 }, (_, i) => {
        const a = svg(i * 30)
        const p1 = polar(R_OUTER, a)
        const p2 = polar(R_ZI, a)
        return (
          <Line
            key={`zd-${i}`}
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke={colors.border}
            strokeWidth={0.5}
            opacity={0.7}
          />
        )
      })}

      {SIGNS.map((sign, i) => {
        const midLon = (i + 0.5) * 30
        const pos = polar((R_OUTER + R_ZI) / 2, svg(midLon))
        const isSelected = selected?.type === 'sign' && selected.name === sign
        const glowOpacity = showHintPulse ? (pulseOn ? 1 : 0.68) : 0.92
        const glowSize = showHintPulse ? (pulseOn ? 14 : 12) : 12
        return (
          <G key={`zg-${sign}`} onPress={() => onSelect(isSelected ? null : { type: 'sign', name: sign })}>
            <Circle cx={pos.x} cy={pos.y} r={15} fill="transparent" />
            <ST
              x={pos.x}
              y={pos.y + 4}
              textAnchor="middle"
              fontSize={isSelected ? 15 : glowSize}
              fill={isSelected ? '#8dd8ff' : SIGN_COLOR[sign]}
              opacity={isSelected ? 1 : glowOpacity}
            >
              {ZODIAC_GLYPHS[i]}
            </ST>
          </G>
        )
      })}

      <Circle cx={CX} cy={CY} r={R_ZI} fill={colors.backgroundCard} stroke={colors.border} strokeWidth={0.5} />

      {Array.from({ length: 12 }, (_, h) => {
        const cuspLon = ((ascLon + h * 30) % 360 + 360) % 360
        const a = svg(cuspLon)
        const p1 = polar(R_ZI, a)
        const isAxis = h % 3 === 0
        return (
          <Line
            key={`hl-${h}`}
            x1={p1.x}
            y1={p1.y}
            x2={CX}
            y2={CY}
            stroke={isAxis ? colors.gold : colors.border}
            strokeWidth={isAxis ? 0.9 : 0.4}
            opacity={isAxis ? 0.65 : 0.45}
          />
        )
      })}

      {Array.from({ length: 12 }, (_, h) => {
        const midLon = ((ascLon + h * 30 + 15) % 360 + 360) % 360
        const pos = polar((R_ZI + R_HI) / 2, svg(midLon))
        return (
          <ST
            key={`hn-${h}`}
            x={pos.x}
            y={pos.y + 3}
            textAnchor="middle"
            fontSize={7}
            fill={colors.gold}
            opacity={0.6}
          >
            {h + 1}
          </ST>
        )
      })}

      {aspects.map((asp, idx) => {
        const p1 = pt(R_ASP, planets[asp.i].longitude)
        const p2 = pt(R_ASP, planets[asp.j].longitude)
        const selectedPlanetName = selected?.type === 'planet' ? selected.name : null
        const active = selectedPlanetName === null
          || planets[asp.i].name === selectedPlanetName
          || planets[asp.j].name === selectedPlanetName
        return <AspectLine key={`al-${idx}`} asp={asp} idx={idx} p1={p1} p2={p2} active={active} />
      })}

      {(() => {
        const ac = polar(R_ZI, svg(ascLon))
        const dc = polar(R_ZI, svg(ascLon + 180))
        return <Line x1={ac.x} y1={ac.y} x2={dc.x} y2={dc.y} stroke={colors.gold} strokeWidth={1.3} opacity={0.85} />
      })()}

      {(() => {
        const mc = polar(R_ZI, svg(mcLon))
        const ic = polar(R_ZI, svg(mcLon + 180))
        return <Line x1={mc.x} y1={mc.y} x2={ic.x} y2={ic.y} stroke={colors.gold} strokeWidth={0.9} opacity={0.6} />
      })()}

      {[
        { label: 'AC', lon: ascLon },
        { label: 'DC', lon: ascLon + 180 },
        { label: 'MC', lon: mcLon },
        { label: 'IC', lon: mcLon + 180 },
      ].map(({ label, lon }) => {
        const pos = polar(R_ZI - 10, svg(lon))
        return (
          <ST
            key={label}
            x={pos.x}
            y={pos.y + 3}
            textAnchor="middle"
            fontSize={6}
            fill={colors.gold}
            opacity={0.8}
            fontWeight="bold"
          >
            {label}
          </ST>
        )
      })}

      {planets.map((planet) => {
        const pos = pt(R_PL, planet.longitude)
        const isSelected = selected?.type === 'planet' && selected.name === planet.name
        const selectedPlanetName = selected?.type === 'planet' ? selected.name : null
        const isConnected = selectedPlanetName !== null && !isSelected && aspects.some((a) =>
          (planets[a.i].name === selectedPlanetName && planets[a.j].name === planet.name) ||
          (planets[a.j].name === selectedPlanetName && planets[a.i].name === planet.name)
        )
        const idlePulseOpacity = showHintPulse ? (pulseOn ? 1 : 0.58) : 1
        const idlePulseSize = showHintPulse ? (pulseOn ? 13 : 11.5) : 12
        const pulseRingRadius = showHintPulse ? (pulseOn ? 13 : 10.5) : 0
        return (
          <G
            key={planet.name}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              onSelect(isSelected ? null : { type: 'planet', name: planet.name })
            }}
          >
            <Circle cx={pos.x} cy={pos.y} r={14} fill="transparent" />
            {isSelected && <Circle cx={pos.x} cy={pos.y} r={15} fill={colors.gold} opacity={0.12} />}
            {isSelected && <Circle cx={pos.x} cy={pos.y} r={18} fill="none" stroke={colors.goldLight} strokeWidth={1.1} opacity={0.38} />}
            {!isSelected && showHintPulse && (
              <Circle
                cx={pos.x}
                cy={pos.y}
                r={pulseRingRadius}
                fill="none"
                stroke="#8dd8ff"
                strokeWidth={0.7}
                opacity={pulseOn ? 0.5 : 0.18}
              />
            )}
            {isConnected && (
              <Circle cx={pos.x} cy={pos.y} r={10} fill="none" stroke={colors.gold} strokeWidth={0.8} opacity={0.55} />
            )}
            <ST
              x={pos.x}
              y={pos.y + 5}
              textAnchor="middle"
              fontSize={isSelected ? 16.5 : idlePulseSize}
              fill={isSelected ? colors.gold : (isConnected ? colors.goldLight : colors.white)}
              fontWeight={isSelected ? 'bold' : 'normal'}
              opacity={selectedPlanetName && !isSelected && !isConnected ? 0.45 : idlePulseOpacity}
            >
              {planet.glyph}
            </ST>
          </G>
        )
      })}

      <Circle cx={CX} cy={CY} r={R_DOT} fill={colors.gold} opacity={0.9} />
    </Svg>
  )
}

function PlanetTooltip({
  planet,
  aspects,
  planets,
}: {
  planet: WheelPlanet
  aspects: AspectHit[]
  planets: WheelPlanet[]
}) {
  const connected = aspects
    .filter((a) => planets[a.i].name === planet.name || planets[a.j].name === planet.name)
    .map((a) => ({
      other: planets[a.i].name === planet.name ? planets[a.j] : planets[a.i],
      name: a.name,
      color: a.color,
    }))

  return (
    <View style={s.tooltip}>
      <View style={s.tooltipHead}>
        <Text style={s.tooltipGlyph}>{planet.glyph}</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.tooltipName}>{planet.name}</Text>
          <Text style={s.tooltipPos}>
            {planet.degree}°{String(planet.minutes).padStart(2, '0')}′ {planet.sign} {'  ·  '}Casa {planet.house}
          </Text>
        </View>
      </View>
      <Text style={s.tooltipMeaning}>{PLANET_MEANING[planet.name] ?? ''}</Text>
      {connected.length > 0 && (
        <View style={s.pillRow}>
          {connected.map((c, i) => (
            <View key={`${c.other.name}-${i}`} style={[s.pill, { borderColor: c.color }]}>
              <Text style={[s.pillText, { color: c.color }]}>{c.other.glyph} {c.name}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

function SignTooltip({ sign }: { sign: string }) {
  return (
    <View style={s.tooltip}>
      <View style={s.signTooltipHead}>
        <Text style={s.signGlyph}>{ZODIAC_GLYPHS[SIGNS.indexOf(sign)]}</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.tooltipName}>{sign}</Text>
          <Text style={s.tooltipPos}>Tono básico que colorea cómo se expresa esa zona de tu carta.</Text>
        </View>
      </View>
      <Text style={s.tooltipMeaning}>{SIGN_MEANING[sign]}</Text>
    </View>
  )
}

function Legend() {
  return (
    <View style={s.legend}>
      {ASPECT_DEFS.map((asp) => (
        <View key={asp.name} style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: asp.color }]} />
          <Text style={s.legendLabel}>{asp.name}</Text>
        </View>
      ))}
    </View>
  )
}

export default function WheelChart({ positions }: { positions: WheelPositions }) {
  const [selected, setSelected] = useState<SelectedTarget>(null)
  const [pulseOn, setPulseOn] = useState(true)
  const [showHintPulse, setShowHintPulse] = useState(false)
  const [hasLockedWheel, setHasLockedWheel] = useState(false)
  const rotation = useSharedValue(0)

  const aspects = useMemo(() => calcAspects(positions.planets), [positions])

  useEffect(() => {
    rotation.value = withRepeat(withTiming(360, { duration: 60000, easing: Easing.linear }), -1, false)
  }, [rotation])

  useEffect(() => {
    let alive = true
    AsyncStorage.getItem(WHEEL_HINT_STORAGE_KEY)
      .then((value) => {
        if (!alive) return
        setShowHintPulse(!value)
      })
      .catch(() => {
        if (!alive) return
        setShowHintPulse(true)
      })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!showHintPulse) return
    const id = setInterval(() => setPulseOn((current) => !current), 900)
    return () => clearInterval(id)
  }, [showHintPulse])

  const handleSelect = (target: SelectedTarget) => {
    if (target && !hasLockedWheel) {
      cancelAnimation(rotation)
      setHasLockedWheel(true)
    }
    setSelected(target)
    if (!showHintPulse || target === null) return
    setShowHintPulse(false)
    AsyncStorage.setItem(WHEEL_HINT_STORAGE_KEY, 'seen').catch(() => {})
  }

  const selectedPlanet = selected?.type === 'planet'
    ? positions.planets.find((planet) => planet.name === selected.name) ?? null
    : null

  const selectedSign = selected?.type === 'sign' ? selected.name : null
  const wheelRotationStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }))

  return (
    <View style={s.root}>
      <AnimatedView style={wheelRotationStyle}>
        <WheelSvg
          positions={positions}
          aspects={aspects}
          selected={selected}
          pulseOn={pulseOn}
          showHintPulse={showHintPulse}
          onSelect={handleSelect}
        />
      </AnimatedView>

      {selectedPlanet ? (
        <PlanetTooltip planet={selectedPlanet} aspects={aspects} planets={positions.planets} />
      ) : selectedSign ? (
        <SignTooltip sign={selectedSign} />
      ) : (
        <View style={s.tapHint}>
          <Text style={s.tapHintText}>Los signos y símbolos interiores brillan en azul para invitarte a tocar.</Text>
          <Text style={s.tapHintText}>Toca un signo para entender qué energía expresa o un planeta para ver su detalle en tu carta.</Text>
        </View>
      )}

      <Legend />
    </View>
  )
}

const s = StyleSheet.create({
  root: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  tooltip: {
    width: WHEEL_SIZE,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    borderWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.15)',
    borderLeftColor: 'rgba(255,255,255,0.04)',
    borderRightColor: 'rgba(255,255,255,0.04)',
    borderBottomColor: 'rgba(255,255,255,0.04)',
    padding: 14,
    marginTop: 12,
  },
  tooltipHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  signTooltipHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  tooltipGlyph: {
    fontSize: 28,
    color: colors.gold,
  },
  signGlyph: {
    fontSize: 28,
    color: '#8dd8ff',
  },
  tooltipName: {
    fontSize: 16,
    color: colors.gold,
    fontFamily: typography.displaySemiBold,
    letterSpacing: 1,
  },
  tooltipPos: {
    fontSize: 12,
    color: colors.whiteSubtle,
    marginTop: 2,
    fontFamily: typography.body,
  },
  tooltipMeaning: {
    fontSize: 14,
    color: colors.white,
    lineHeight: 21,
    opacity: 0.9,
    marginBottom: 10,
    fontFamily: typography.body,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: {
    fontSize: 11,
    fontFamily: typography.bodyMedium,
  },
  tapHint: {
    width: WHEEL_SIZE,
    alignItems: 'center',
    marginTop: 14,
    gap: 4,
    paddingHorizontal: 20,
  },
  tapHintText: {
    fontSize: 12,
    color: colors.whiteSubtle,
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: typography.body,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
    color: colors.whiteSubtle,
    fontFamily: typography.body,
  },
})
