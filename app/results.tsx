import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Image } from 'expo-image'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as Linking from 'expo-linking'
import * as Haptics from 'expo-haptics'
import { useTranslation } from 'react-i18next'
import Svg, { Circle, Line, Path } from 'react-native-svg'
import AstroGlyph from '../components/AstroGlyph'
import CosmicTabButton from '../components/CosmicTabButton'
import CosmicBackdrop from '../components/CosmicBackdrop'
import LanguageSwitcher from '../components/LanguageSwitcher'
import SoundToggleButton from '../components/SoundToggleButton'
import MoonPhaseIcon from '../components/MoonPhaseIcon'
import SectionHeader from '../components/SectionHeader'
import ShimmerText from '../components/ShimmerText'
import WheelChart, { calcAspects, WheelPositions } from '../components/WheelChart'
import { API_BASE_URL } from '../constants/api'
import {
  getAstronomiconAspectGlyph,
  getAstronomiconPlanetGlyph,
  getAstronomiconSignGlyph,
  getNasaPlanetQuery,
} from '../constants/astrology'
import { loadLatestReading, loadProfile, saveLanguage, saveProfile, SavedProfile, SavedReadingBundle, SupportedLanguage } from '../constants/appState'
import { colors } from '../constants/colors'
import { detectDeviceLanguage, setAppLanguage } from '../constants/i18n'
import { typography } from '../constants/typography'
import { getYogaPoseImage } from '../constants/yogaImages'
import { ElementKey, yogaByElement } from '../constants/yoga'

const TABS = [
  { label: 'Tu carta', glyph: 'µ' },
  { label: 'Tu momento', glyph: 'R' },
  { label: 'Mas alla', glyph: 'Q' },
  { label: 'Perfil', glyph: 'c' },
]

const PERSONAL_PLANETS = ['Sol', 'Luna', 'Mercurio', 'Venus', 'Marte']
const SOCIAL_PLANETS = ['Júpiter', 'Saturno']
const TRANSPERSONAL_PLANETS = ['Urano', 'Neptuno', 'Plutón']
const BOOKING_URL = process.env.EXPO_PUBLIC_SARITA_BOOKING_URL ?? 'https://calendar.app.google/ZkEkXf2haV25QCaP6'
const SARITA_PORTRAIT = require('../assets/images/sarita.jpg')

const FIRE_SIGNS = ['Aries', 'Leo', 'Sagitario']
const EARTH_SIGNS = ['Tauro', 'Virgo', 'Capricornio']
const AIR_SIGNS = ['Géminis', 'Libra', 'Acuario']
const WATER_SIGNS = ['Cáncer', 'Escorpio', 'Piscis']
const SPECIAL = ['Quirón', 'Nodo Norte', 'Nodo Sur', 'Black Moon Natural', 'Priapo']

const SIGN_TO_ELEMENT: Record<string, ElementKey> = {
  Aries: 'fire',
  Leo: 'fire',
  Sagitario: 'fire',
  Tauro: 'earth',
  Virgo: 'earth',
  Capricornio: 'earth',
  'Géminis': 'air',
  Geminis: 'air',
  Libra: 'air',
  Acuario: 'air',
  'Cáncer': 'water',
  Cancer: 'water',
  Escorpio: 'water',
  Piscis: 'water',
}

const ELEMENT_LABELS: Record<ElementKey, string> = {
  fire: 'fuego',
  earth: 'tierra',
  air: 'aire',
  water: 'agua',
}

const CORE_DISTRIBUTION_PLANETS = new Set([
  'sol',
  'luna',
  'mercurio',
  'venus',
  'marte',
  'jupiter',
  'saturno',
  'urano',
  'neptuno',
  'pluton',
  'nodo norte',
  'nodo sur',
  'black moon natural',
  'priapo',
  'quiron',
])

const ELEMENT_ORDER: ElementKey[] = ['fire', 'earth', 'air', 'water']

const SIGN_TO_MODALITY: Record<string, 'cardinal' | 'fixed' | 'mutable'> = {
  Aries: 'cardinal',
  'Cáncer': 'cardinal',
  Cancer: 'cardinal',
  Libra: 'cardinal',
  Capricornio: 'cardinal',
  Tauro: 'fixed',
  Leo: 'fixed',
  Escorpio: 'fixed',
  Acuario: 'fixed',
  'Géminis': 'mutable',
  Geminis: 'mutable',
  Virgo: 'mutable',
  Sagitario: 'mutable',
  Piscis: 'mutable',
}

const MODALITY_LABELS: Record<'cardinal' | 'fixed' | 'mutable', string> = {
  cardinal: 'cardinal',
  fixed: 'fija',
  mutable: 'mutable',
}

const ZODIAC_SIGNS = ['Aries', 'Tauro', 'Géminis', 'Cáncer', 'Leo', 'Virgo', 'Libra', 'Escorpio', 'Sagitario', 'Capricornio', 'Acuario', 'Piscis'] as const

const MOCK_WHEEL_POSITIONS: WheelPositions = {
  ascendant: { longitude: 269.97, sign: 'Sagitario', degree: 29, minutes: 58 },
  mc: { longitude: 180, sign: 'Virgo', degree: 0, minutes: 0 },
  planets: [
    { name: 'Sol', glyph: '\u2609', longitude: 280.53, sign: 'Capricornio', degree: 10, minutes: 32, house: 2 },
    { name: 'Luna', glyph: '\u263D', longitude: 113.25, sign: 'Cáncer', degree: 23, minutes: 15, house: 8 },
    { name: 'Mercurio', glyph: '\u263F', longitude: 272.73, sign: 'Capricornio', degree: 2, minutes: 44, house: 1 },
    { name: 'Venus', glyph: '\u2640', longitude: 318.15, sign: 'Acuario', degree: 18, minutes: 9, house: 2 },
    { name: 'Marte', glyph: '\u2642', longitude: 215.35, sign: 'Escorpio', degree: 5, minutes: 21, house: 11 },
    { name: 'Júpiter', glyph: '\u2643', longitude: 55.78, sign: 'Tauro', degree: 25, minutes: 47, house: 6 },
    { name: 'Saturno', glyph: '\u2644', longitude: 74.55, sign: 'Géminis', degree: 14, minutes: 33, house: 7 },
    { name: 'Urano', glyph: '\u2645', longitude: 320.2, sign: 'Acuario', degree: 20, minutes: 12, house: 2 },
    { name: 'Neptuno', glyph: '\u2646', longitude: 273.97, sign: 'Capricornio', degree: 3, minutes: 58, house: 1 },
    { name: 'Plutón', glyph: '\u2647', longitude: 222.27, sign: 'Escorpio', degree: 12, minutes: 16, house: 11 },
    { name: 'Nodo Norte', glyph: '\u260A', longitude: 119.02, sign: 'Cáncer', degree: 29, minutes: 1, house: 8 },
    { name: 'Nodo Sur', glyph: '\u260B', longitude: 299.02, sign: 'Capricornio', degree: 29, minutes: 1, house: 2 },
    { name: 'Black Moon Natural', glyph: '\u26B8', longitude: 331.23, sign: 'Piscis', degree: 1, minutes: 14, house: 3 },
  ],
}

type ReadingSection = {
  title: string
  paragraphs: string[]
  bullets: string[]
  quote?: string
}


type PoseGuide = {
  level: 'Suave' | 'Media' | 'Intensa'
  visual: 'standing' | 'seat' | 'ground' | 'recline'
  preparation: string
  movement: string
  hold: string
  close: string
  feel: string
  easier?: string
}

type LunarEvent = {
  type: 'newMoon' | 'fullMoon'
  label: string
  date: string
  formattedDate: string
  absoluteLongitude: number
  sign: string
  degree: number
  minutes: number
  element: ElementKey
  house: number
  area: string
  message: string
  focus: string
}

type TransitChart = {
  date: string
  formattedDate: string
  planets: WheelPositions['planets']
}

type RetrogradeEvent = {
  name: string
  glyph: string
  startDate: string
  endDate: string
  formattedStart: string
  formattedEnd: string
  isActiveNow: boolean
  message: string
}

type ChartPayload = WheelPositions & {
  lunarCycle?: {
    monthKey: string
    newMoon: LunarEvent | null
    fullMoon: LunarEvent | null
  }
  transitChart?: TransitChart
  retrogrades?: RetrogradeEvent[]
}

function buildDistinctLunarMessage(event: LunarEvent, phase: 'new' | 'full') {
  const area = event.area.toLowerCase()
  if (phase === 'new') {
    return `Se abre una puerta en ${area}. Empieza algo que necesita intención, claridad y una primera decisión concreta de tu parte.`
  }
  return `Aquí llega un momento de verdad en ${area}. Ves qué maduró, qué ya no sostiene y qué conviene soltar para hacer espacio.`
}

function lunarEventsAreRepeating(newMoon: LunarEvent | null, fullMoon: LunarEvent | null) {
  if (!newMoon || !fullMoon) return false
  const samePlacement =
    newMoon.sign === fullMoon.sign
    && newMoon.house === fullMoon.house
    && newMoon.degree === fullMoon.degree
    && newMoon.minutes === fullMoon.minutes
  const sameDate = newMoon.formattedDate === fullMoon.formattedDate || newMoon.date === fullMoon.date
  const sameCopy = cleanText(newMoon.message) === cleanText(fullMoon.message)
  return samePlacement || (sameDate && sameCopy)
}

function normalizeLunarCycle(lunarCycle?: ChartPayload['lunarCycle']) {
  if (!lunarCycle) return undefined

  const newMoon: LunarEvent | null = lunarCycle.newMoon
    ? {
        ...lunarCycle.newMoon,
        label: 'Luna Nueva',
        type: 'newMoon' as const,
        message: cleanText(lunarCycle.newMoon.message) || buildDistinctLunarMessage(lunarCycle.newMoon, 'new'),
      }
    : null

  let fullMoon: LunarEvent | null = lunarCycle.fullMoon
    ? {
        ...lunarCycle.fullMoon,
        label: 'Luna Llena',
        type: 'fullMoon' as const,
        message: cleanText(lunarCycle.fullMoon.message) || buildDistinctLunarMessage(lunarCycle.fullMoon, 'full'),
      }
    : null

  if (fullMoon && cleanText(fullMoon.message) === cleanText(newMoon?.message)) {
    fullMoon = {
      ...fullMoon,
      message: buildDistinctLunarMessage(fullMoon, 'full'),
    }
  }

  if (newMoon && fullMoon && lunarEventsAreRepeating(newMoon, fullMoon)) {
    fullMoon = {
      ...fullMoon,
      message: `${buildDistinctLunarMessage(fullMoon, 'full')} Si esta fase no te cuadra, conviene regenerar la lectura mensual con los datos actualizados.`,
    }
  }

  if (newMoon && fullMoon && cleanText(newMoon.area) === cleanText(fullMoon.area)) {
    fullMoon = {
      ...fullMoon,
      area: capitalize(getPlanetHouseTheme(fullMoon.house)),
    }
  }

  return {
    ...lunarCycle,
    newMoon,
    fullMoon,
  }
}

function useAiCard(cacheKey: string, fetcher: () => Promise<string>, enabled = true): { text: string | null; loading: boolean; error: boolean } {
  const [text, setText] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  useEffect(() => {
    if (!enabled) return
    let alive = true
    ;(async () => {
      try {
        if (alive) setError(false)
        const cached = await AsyncStorage.getItem(cacheKey)
        if (cached && alive) { setText(cached); return }
        if (alive) setLoading(true)
        const result = await fetcherRef.current()
        if (alive) {
          if (result) await AsyncStorage.setItem(cacheKey, result)
          setText(result || null)
          if (!result) setError(true)
        }
      } catch {
        if (alive) setError(true)
        // silent fail — UI shows static fallback
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [cacheKey, enabled])

  return { text, loading, error }
}

type NatalReading = {
  planets: Record<string, string>
  special: Record<string, string>
  aspects: Record<string, string>
}

function useNatalReading(cacheKey: string, fetcher: () => Promise<NatalReading | null>, enabled = true): { reading: NatalReading | null; loading: boolean; error: boolean } {
  const [reading, setReading] = useState<NatalReading | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  useEffect(() => {
    if (!enabled) return
    let alive = true
    ;(async () => {
      try {
        if (alive) setError(false)
        const cached = await AsyncStorage.getItem(cacheKey)
        if (cached && alive) { setReading(JSON.parse(cached)); return }
        if (alive) setLoading(true)
        const result = await fetcherRef.current()
        if (alive) {
          if (result) {
            await AsyncStorage.setItem(cacheKey, JSON.stringify(result))
            setReading(result)
          } else {
            setError(true)
          }
        }
      } catch {
        if (alive) setError(true)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [cacheKey, enabled])

  return { reading, loading, error }
}

function getAiUnavailableMessage(label: string) {
  return `No pudimos cargar ${label}. Verifica que el backend responda en ${API_BASE_URL}.`
}

async function getPlanetArtworkUrl(planetName: string) {
  const cacheKey = `sarita_nasa_planet_v2_${normalizeTitle(planetName)}`
  const cached = await AsyncStorage.getItem(cacheKey)
  if (cached) return cached

  const query = getNasaPlanetQuery(planetName)
  const resp = await fetch(
    `https://images-api.nasa.gov/search?q=${encodeURIComponent(`${query} planet`)}&media_type=image`
  )
  const data = await resp.json()
  const items = Array.isArray(data?.collection?.items) ? data.collection.items : []
  const queryTokens = [query, 'planet']
  const scoreNasaImage = (item: any) => {
    const href = Array.isArray(item?.links) ? item.links[0]?.href ?? '' : ''
    const meta = Array.isArray(item?.data) ? item.data[0] ?? {} : {}
    const haystack = [
      meta?.title,
      meta?.description,
      meta?.keywords?.join(' '),
      href,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    let score = 0
    for (const token of queryTokens) {
      if (haystack.includes(token)) score += 5
    }
    if (haystack.includes('globe')) score += 3
    if (haystack.includes('full disk') || haystack.includes('full-disc')) score += 3
    if (haystack.includes('voyager') || haystack.includes('cassini') || haystack.includes('galileo')) score += 2
    if (haystack.includes('artist') || haystack.includes('concept')) score -= 6
    if (haystack.includes('diagram') || haystack.includes('infographic') || haystack.includes('orbit')) score -= 4
    if (haystack.includes('poster') || haystack.includes('illustration')) score -= 5
    if (href.includes('~thumb')) score -= 2
    return score
  }

  const rankedItems = items
    .filter((item: any) => Array.isArray(item?.links) && item.links[0]?.href)
    .sort((a: any, b: any) => scoreNasaImage(b) - scoreNasaImage(a))

  const match = rankedItems[0]?.links?.[0]?.href ?? null
  if (match) await AsyncStorage.setItem(cacheKey, match)
  return match
}

function usePlanetArtwork(planetName: string) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  useEffect(() => {
    let alive = true

    ;(async () => {
      try {
        const match = await getPlanetArtworkUrl(planetName)
        if (match && alive) setImageUrl(match)
      } catch {
        // leave card on gradient fallback
      }
    })()

    return () => {
      alive = false
    }
  }, [planetName])

  return imageUrl
}

function decodeEscapedUnicode(value: string) {
  return value.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
}

function fixMojibake(value: string) {
  return value
    .replace(/ÃƒÆ’Ã‚Â¡/g, 'ÃƒÂ¡')
    .replace(/ÃƒÆ’Ã‚Â©/g, 'ÃƒÂ©')
    .replace(/ÃƒÆ’Ã‚Â­/g, 'ÃƒÂ­')
    .replace(/ÃƒÆ’Ã‚Â³/g, 'ÃƒÂ³')
    .replace(/ÃƒÆ’Ã‚Âº/g, 'ÃƒÂº')
    .replace(/ÃƒÆ’Ã‚Â/g, 'ÃƒÂ')
    .replace(/ÃƒÆ’Ã¢â‚¬Â°/g, 'Ãƒâ€°')
    .replace(/ÃƒÆ’Ã‚Â/g, 'ÃƒÂ')
    .replace(/ÃƒÆ’Ã¢â‚¬Å“/g, 'Ãƒâ€œ')
    .replace(/ÃƒÆ’Ã…Â¡/g, 'ÃƒÅ¡')
    .replace(/ÃƒÆ’Ã‚Â±/g, 'ÃƒÂ±')
    .replace(/ÃƒÆ’Ã¢â‚¬Ëœ/g, 'Ãƒâ€˜')
    .replace(/Ãƒâ€šÃ‚Â¿/g, 'Ã‚Â¿')
    .replace(/Ãƒâ€šÃ‚Â¡/g, 'Ã‚Â¡')
    .replace(/Ãƒâ€šÃ‚Â°/g, 'Ã‚Â°')
    .replace(/ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â/g, 'Ã¢â‚¬â€')
    .replace(/ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“/g, 'Ã¢â‚¬â€œ')
    .replace(/ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢/g, 'Ã¢â‚¬Â¢')
    .replace(/ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ/g, '"')
    .replace(/ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â/g, '"')
    .replace(/ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“/g, "'")
    .replace(/ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢/g, "'")
    .replace(/ÃƒÂ¡/g, 'á')
    .replace(/ÃƒÂ©/g, 'é')
    .replace(/ÃƒÂ­/g, 'í')
    .replace(/ÃƒÂ³/g, 'ó')
    .replace(/ÃƒÂº/g, 'ú')
    .replace(/ÃƒÂ±/g, 'ñ')
    .replace(/ÃƒÂ¼/g, 'ü')
    .replace(/Ãƒâ€°/g, 'É')
    .replace(/Ãƒâ€"/g, '×')
    .replace(/Ãƒâ€œ/g, 'Ü')
    .replace(/Ãƒâ€˜/g, 'Ø')
    .replace(/Ã‚Â°/g, '°')
    .replace(/Ã‚Â¿/g, '¿')
    .replace(/Ã‚Â¡/g, '¡')
    .replace(/Ã‚·/g, '·')
    .replace(/Ã¡/g, 'á')
    .replace(/Ã©/g, 'é')
    .replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã±/g, 'ñ')
    .replace(/Â¿/g, '¿')
    .replace(/·/g, '·')
    .replace(/Â¡/g, '¡')
    .replace(/Â°/g, '°')
}

function translateEnglishLeaks(value: string) {
  return value
    .replace(/\bNeed\b/gi, 'Necesidad')
    .replace(/\bNeeds\b/gi, 'Necesidades')
    .replace(/\bWant\b/gi, 'Deseo')
    .replace(/\bWants\b/gi, 'Deseos')
    .replace(/\bAir\b/g, 'Aire')
    .replace(/\bWater\b/g, 'Agua')
    .replace(/\bFire\b/g, 'Fuego')
    .replace(/\bEarth\b/g, 'Tierra')
}

function cleanText(value?: string | null) {
  return translateEnglishLeaks(fixMojibake(decodeEscapedUnicode(String(value ?? '')))).trim()
}

function parseChartPayload(positionsJson?: string): ChartPayload {
  if (!positionsJson) return MOCK_WHEEL_POSITIONS as ChartPayload
  try {
    const parsed = JSON.parse(cleanText(positionsJson)) as ChartPayload
    const normalizedLunarCycle = normalizeLunarCycle(
      parsed.lunarCycle
        ? {
            ...parsed.lunarCycle,
            newMoon: parsed.lunarCycle.newMoon
              ? {
                  ...parsed.lunarCycle.newMoon,
                  label: cleanText(parsed.lunarCycle.newMoon.label),
                  sign: cleanText(parsed.lunarCycle.newMoon.sign),
                  area: cleanText(parsed.lunarCycle.newMoon.area),
                  message: cleanText(parsed.lunarCycle.newMoon.message),
                  focus: cleanText(parsed.lunarCycle.newMoon.focus),
                }
              : null,
            fullMoon: parsed.lunarCycle.fullMoon
              ? {
                  ...parsed.lunarCycle.fullMoon,
                  label: cleanText(parsed.lunarCycle.fullMoon.label),
                  sign: cleanText(parsed.lunarCycle.fullMoon.sign),
                  area: cleanText(parsed.lunarCycle.fullMoon.area),
                  message: cleanText(parsed.lunarCycle.fullMoon.message),
                  focus: cleanText(parsed.lunarCycle.fullMoon.focus),
                }
              : null,
          }
        : undefined
    )
    return {
      ...parsed,
      ascendant: {
        ...parsed.ascendant,
        sign: cleanText(parsed.ascendant?.sign),
      },
      mc: {
        ...parsed.mc,
        sign: cleanText(parsed.mc?.sign),
      },
      planets: (parsed.planets ?? []).map((planet) => ({
        ...planet,
        name: cleanText(planet.name),
        sign: cleanText(planet.sign),
      })),
      lunarCycle: normalizedLunarCycle,
      transitChart: parsed.transitChart
        ? {
            ...parsed.transitChart,
            formattedDate: cleanText(parsed.transitChart.formattedDate),
            planets: (parsed.transitChart.planets ?? []).map((planet) => ({
              ...planet,
              name: cleanText(planet.name),
              sign: cleanText(planet.sign),
            })),
          }
        : undefined,
      retrogrades: (parsed.retrogrades ?? []).map((item) => ({
        ...item,
        name: cleanText(item.name),
        glyph: cleanText(item.glyph),
        formattedStart: cleanText(item.formattedStart),
        formattedEnd: cleanText(item.formattedEnd),
        message: cleanText(item.message),
      })),
    }
  } catch {
    return MOCK_WHEEL_POSITIONS as ChartPayload
  }
}

function formatDegree(degree: number, minutes: number) {
  return `${degree}\u00B0${String(minutes).padStart(2, '0')}'`
}

function normalizeTitle(value: string) {
  return cleanText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function parseReadingSections(raw: string): ReadingSection[] {
  const sections: ReadingSection[] = []
  let current: ReadingSection | null = null
  let quoteMode = false

  for (const rawLine of (raw || '').split('\n')) {
    const line = cleanText(rawLine)
    if (!line) continue

    if (line.startsWith('## ')) {
      current = { title: cleanText(line.slice(3)), paragraphs: [], bullets: [] }
      sections.push(current)
      quoteMode = normalizeTitle(current.title).includes('frase') || normalizeTitle(current.title).includes('mantra')
      continue
    }

    if (!current || line === '---') continue

    if (line.startsWith('- ')) {
      current.bullets.push(cleanText(line.slice(2)))
      continue
    }

    if (quoteMode) {
      current.quote = cleanText(line.replace(/^["']+|["']+$/g, ''))
      continue
    }

    current.paragraphs.push(cleanText(line))
  }

  return sections
}

function mergeSections(sections: ReadingSection[], aliases: string[]) {
  const normalized = aliases.map(normalizeTitle)
  const selected = sections.filter((section) => normalized.includes(normalizeTitle(section.title)))

  return {
    paragraphs: selected.flatMap((section) => section.paragraphs),
    bullets: selected.flatMap((section) => section.bullets),
    quote: selected.map((section) => section.quote).find(Boolean) ?? '',
  }
}


function elementColor(sign: string, planet: string) {
  if (SPECIAL.includes(planet)) return colors.silver
  if (FIRE_SIGNS.includes(sign)) return colors.fire
  if (EARTH_SIGNS.includes(sign)) return colors.earth
  if (AIR_SIGNS.includes(sign)) return colors.air
  if (WATER_SIGNS.includes(sign)) return colors.water
  return colors.silver
}

function renderInline(text: string): React.ReactNode {
  const cleaned = cleanText(text)
  if (!cleaned.includes('**')) return cleaned
  return cleaned.split(/\*\*(.*?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? <Text key={i} style={styles.inlineBold}>{part}</Text> : part
  )
}

function deriveYogaElement(positions: WheelPositions) {
  const score: Record<ElementKey, number> = { fire: 0, earth: 0, air: 0, water: 0 }
  const contributors: Record<ElementKey, string[]> = { fire: [], earth: [], air: [], water: [] }

  positions.planets.forEach((planet) => {
    const element = SIGN_TO_ELEMENT[planet.sign]
    if (!element) return
    score[element] += SPECIAL.includes(planet.name) ? 0.7 : 1
    contributors[element].push(planet.name)
  })

  const ascElement = SIGN_TO_ELEMENT[positions.ascendant.sign] ?? 'fire'
  score[ascElement] += 2
  contributors[ascElement].unshift('Ascendente')

  const dominantElement = (Object.entries(score).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'fire') as ElementKey

  return {
    dominantElement,
    ascElement,
    contributors: contributors[dominantElement].slice(0, 3),
  }
}

function getTriad(positions: WheelPositions) {
  return {
    sun: positions.planets.find((planet) => normalizeTitle(planet.name) === 'sol'),
    moon: positions.planets.find((planet) => normalizeTitle(planet.name) === 'luna'),
    rising: positions.ascendant,
  }
}


function buildDistribution<T extends string>(items: T[]) {
  const counts = items.reduce<Record<string, number>>((acc, item) => {
    acc[item] = (acc[item] ?? 0) + 1
    return acc
  }, {})
  const total = items.length || 1
  return { counts, total }
}

function getNormalizedSign(sign: string) {
  const normalized = normalizeTitle(sign)
  if (normalized === 'geminis') return 'Geminis'
  if (normalized === 'cancer') return 'Cancer'
  return sign
}

function longitudeToPos(longitude: number) {
  const normalizedLongitude = ((longitude % 360) + 360) % 360
  const signIndex = Math.floor(normalizedLongitude / 30)
  const posInSign = normalizedLongitude % 30
  return {
    longitude: normalizedLongitude,
    sign: ZODIAC_SIGNS[signIndex] ?? 'Aries',
    degree: Math.floor(posInSign),
    minutes: Math.floor((posInSign % 1) * 60),
  }
}

function getAspectPoints(positions: WheelPositions) {
  const descendant = longitudeToPos((positions.ascendant.longitude + 180) % 360)
  const ic = longitudeToPos((positions.mc.longitude + 180) % 360)

  return [
    ...positions.planets,
    {
      name: 'Ascendente',
      glyph: 'AC',
      longitude: positions.ascendant.longitude,
      sign: positions.ascendant.sign,
      degree: positions.ascendant.degree,
      minutes: positions.ascendant.minutes,
      house: 1,
    },
    {
      name: 'Descendente',
      glyph: 'DC',
      longitude: descendant.longitude,
      sign: descendant.sign,
      degree: descendant.degree,
      minutes: descendant.minutes,
      house: 7,
    },
    {
      name: 'Medio Cielo',
      glyph: 'MC',
      longitude: positions.mc.longitude,
      sign: positions.mc.sign,
      degree: positions.mc.degree,
      minutes: positions.mc.minutes,
      house: 10,
    },
    {
      name: 'Fondo Cielo',
      glyph: 'IC',
      longitude: ic.longitude,
      sign: ic.sign,
      degree: ic.degree,
      minutes: ic.minutes,
      house: 4,
    },
  ]
}

function getElementDistribution(positions: WheelPositions) {
  const items = positions.planets
    .filter((planet) => CORE_DISTRIBUTION_PLANETS.has(normalizeTitle(planet.name)))
    .map((planet) => SIGN_TO_ELEMENT[getNormalizedSign(planet.sign)])
    .filter(Boolean) as ElementKey[]
  items.push(
    SIGN_TO_ELEMENT[getNormalizedSign(positions.ascendant.sign)] as ElementKey,
    SIGN_TO_ELEMENT[getNormalizedSign(longitudeToPos((positions.ascendant.longitude + 180) % 360).sign)] as ElementKey,
    SIGN_TO_ELEMENT[getNormalizedSign(positions.mc.sign)] as ElementKey,
    SIGN_TO_ELEMENT[getNormalizedSign(longitudeToPos((positions.mc.longitude + 180) % 360).sign)] as ElementKey,
  )
  return buildDistribution(items)
}

function getModalityDistribution(positions: WheelPositions) {
  const items = positions.planets
    .filter((planet) => CORE_DISTRIBUTION_PLANETS.has(normalizeTitle(planet.name)))
    .map((planet) => SIGN_TO_MODALITY[getNormalizedSign(planet.sign)])
    .filter(Boolean) as ('cardinal' | 'fixed' | 'mutable')[]
  items.push(
    SIGN_TO_MODALITY[getNormalizedSign(positions.ascendant.sign)] as 'cardinal' | 'fixed' | 'mutable',
    SIGN_TO_MODALITY[getNormalizedSign(longitudeToPos((positions.ascendant.longitude + 180) % 360).sign)] as 'cardinal' | 'fixed' | 'mutable',
    SIGN_TO_MODALITY[getNormalizedSign(positions.mc.sign)] as 'cardinal' | 'fixed' | 'mutable',
    SIGN_TO_MODALITY[getNormalizedSign(longitudeToPos((positions.mc.longitude + 180) % 360).sign)] as 'cardinal' | 'fixed' | 'mutable',
  )
  return buildDistribution(items)
}


function getStrongestTransitAspects(natal: WheelPositions, transitChart?: TransitChart) {
  if (!transitChart?.planets?.length) return []
  const natalPoints = getAspectPoints(natal)

  return transitChart.planets
    .flatMap((transitPlanet) =>
      natalPoints.flatMap((natalPlanet) => {
        const diff = Math.abs(transitPlanet.longitude - natalPlanet.longitude)
        const angle = diff > 180 ? 360 - diff : diff
        const hit = [
          { name: 'Conj', angle: 0, orb: 8, color: colors.gold },
          { name: 'Sext', angle: 60, orb: 6, color: colors.earth },
          { name: 'Incon', angle: 150, orb: 3, color: '#d9c3ff' },
          { name: 'Cuad', angle: 90, orb: 8, color: colors.fire },
          { name: 'Trin', angle: 120, orb: 8, color: colors.water },
          { name: 'Opos', angle: 180, orb: 8, color: '#d06040' },
        ].find((aspect) => Math.abs(angle - aspect.angle) <= aspect.orb)

        if (!hit) return []

        return [{
          ...hit,
          orb: Math.abs(angle - hit.angle),
          transitPlanet,
          natalPlanet,
        }]
      })
    )
    .sort((a, b) => a.orb - b.orb)
    .slice(0, 6)
}

function getDominantKey<T extends string>(counts: Record<string, number>, order: readonly T[]) {
  const entries = order.map((key) => [key, counts[key] ?? 0] as const).sort((a, b) => b[1] - a[1])
  return {
    top: entries[0]?.[0] ?? order[0],
    topCount: entries[0]?.[1] ?? 0,
    low: entries[entries.length - 1]?.[0] ?? order[0],
    lowCount: entries[entries.length - 1]?.[1] ?? 0,
  }
}

function describeElementProfile(positions: WheelPositions) {
  const elements = getElementDistribution(positions)
  const summary = getDominantKey(elements.counts, ELEMENT_ORDER)
  const messages: Record<ElementKey, string> = {
    fire: 'Tu carta se mueve por impulso, deseo y necesidad de iniciar.',
    earth: 'Tu carta busca sostener, concretar y bajar las cosas a tierra.',
    air: 'Tu carta procesa la vida a traves de ideas, palabras y conexiones.',
    water: 'Tu carta vive desde la emocion, la intuicion y la sensibilidad.',
  }
  const weakMessages: Record<ElementKey, string> = {
    fire: 'Cuando el fuego baja, puede costar afirmar deseo, impulso o iniciativa.',
    earth: 'Cuando la tierra baja, puede costar sostener rutinas, cuerpo o constancia.',
    air: 'Cuando el aire baja, puede costar tomar distancia, nombrar o relativizar.',
    water: 'Cuando el agua baja, puede costar sentir, soltar o habitar la vulnerabilidad.',
  }

  return {
    ...elements,
    dominant: summary.top,
    dominantText: `Tu carta es mayormente ${ELEMENT_LABELS[summary.top]}: ${messages[summary.top]}`,
    weakText: weakMessages[summary.low],
  }
}

function describeModalityProfile(positions: WheelPositions) {
  const modalities = getModalityDistribution(positions)
  const order = ['cardinal', 'fixed', 'mutable'] as const
  const summary = getDominantKey(modalities.counts, order)
  const messages = {
    cardinal: 'Hay iniciativa, arranque y necesidad de poner las cosas en marcha.',
    fixed: 'Hay persistencia, profundidad y tendencia a sostener lo importante.',
    mutable: 'Hay flexibilidad, adaptacion y lectura fina de los cambios.',
  }
  const weakMessages = {
    cardinal: 'Si lo cardinal baja, arrancar puede costar mas que continuar.',
    fixed: 'Si lo fijo baja, puede costar sostener foco o profundizar en una direccion.',
    mutable: 'Si lo mutable baja, puede costar flexibilizar, cambiar o soltar una forma.',
  }

  return {
    ...modalities,
    dominant: summary.top,
    dominantText: `Predomina ${MODALITY_LABELS[summary.top]}: ${messages[summary.top]}`,
    weakText: weakMessages[summary.low],
  }
}

function getPlanet(positions: WheelPositions, name: string) {
  const target = normalizeTitle(name)
  const aliases =
    target === 'black moon natural' || target === 'lilith'
      ? ['black moon natural', 'lilith']
      : target === 'quiron' || target === 'chiron'
        ? ['quiron', 'chiron']
        : [target]

  return positions.planets.find((planet) => aliases.includes(normalizeTitle(planet.name)))
}

function getPlanetHouseTheme(house: number) {
  return {
    1: 'identidad y forma de aparecer',
    2: 'recursos y autoestima',
    3: 'mente, voz y entorno cercano',
    4: 'hogar y raices emocionales',
    5: 'creatividad, deseo y juego',
    6: 'rutina, trabajo y salud',
    7: 'relaciones y alianzas',
    8: 'intimidad, crisis y transformacion',
    9: 'sentido, estudios y expansion',
    10: 'vocacion y vida publica',
    11: 'amistades, redes y futuro',
    12: 'retiro, inconsciente y espiritualidad',
  }[house] ?? 'tu experiencia de vida'
}

function getFilteredAspects(positions: WheelPositions) {
  const points = getAspectPoints(positions)
  return calcAspects(points)
    .sort((a, b) => Math.abs(a.orb) - Math.abs(b.orb))
    .map((aspect) => {
      const from = points[aspect.i]
      const to = points[aspect.j]
      return {
        ...aspect,
        from,
        to,
      }
    })
}

function getPlanetAspectHighlights(positions: WheelPositions, planetName: string) {
  return getFilteredAspects(positions)
    .filter((aspect) => aspect.from.name === planetName || aspect.to.name === planetName)
    .slice(0, 3)
}

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

function displayPlanetName(name: string) {
  if (name === 'Black Moon Natural') return 'Lilith'
  if (normalizeTitle(name) === 'chiron') return 'Quiron'
  return name
}

const PLANET_ROLES: Record<string, string> = {
  sol: 'tu identidad y voluntad',
  luna: 'tu mundo emocional',
  mercurio: 'tu mente y comunicación',
  venus: 'tu amor y valores',
  marte: 'tu acción e impulso',
  jupiter: 'tu expansión y fe',
  saturno: 'tu disciplina y límites',
  urano: 'tu impulso de cambio',
  neptuno: 'tu intuición',
  pluton: 'tu fuerza de transformación',
  'nodo norte': 'tu camino evolutivo',
  'nodo sur': 'tus patrones del pasado',
  'black moon natural': 'tu instinto más profundo',
  priapo: 'tu impulso compensatorio',
  ascendente: 'tu forma de entrar en la vida',
  descendente: 'tu forma de vincularte con el otro',
  'medio cielo': 'tu dirección pública y vocacional',
  'fondo cielo': 'tu base emocional y privada',
  quiron: 'tu herida y tu don',
}

function getPlanetRole(name: string) {
  return PLANET_ROLES[normalizeTitle(name)] ?? `tu ${displayPlanetName(name).toLowerCase()}`
}

function getAspectLabel(name: string) {
  return {
    Conj: 'conjuncion',
    Cuad: 'cuadratura',
    Trin: 'trigono',
    Opos: 'oposicion',
    Sext: 'sextil',
    Incon: 'inconjuncion',
  }[name] ?? name.toLowerCase()
}

function getAspectReading(name: string) {
  return {
    Conj: {
      challenge: 'Cuando esto se acelera, puedes sentirte demasiado dentro de todo a la vez.',
      gift: 'Te ayuda poner una sola prioridad, bajar el ruido y decidir desde lo importante.',
    },
    Cuad: {
      challenge: 'Aqui suele aparecer roce, cansancio o sensacion de ir a contramano.',
      gift: 'Te pide cambiar una forma vieja y elegir una respuesta mas madura.',
    },
    Trin: {
      challenge: 'Esto te sale natural, pero a veces lo dejas pasar porque parece demasiado facil.',
      gift: 'Si lo usas a favor, aqui tienes apoyo, talento y una salida mas amable.',
    },
    Opos: {
      challenge: 'Puedes irte de un extremo al otro o esperar que el otro te muestre lo que necesitas mirar.',
      gift: 'Te ayuda buscar equilibrio, conversar claro y no reaccionar por reflejo.',
    },
    Sext: {
      challenge: 'Si no haces nada con esto, se queda en posibilidad y no termina de abrirse.',
      gift: 'Con un paso pequeño y consciente, aqui se abre una oportunidad real.',
    },
    Incon: {
      challenge: 'Aquí suele aparecer incomodidad, desajuste o la sensación de que algo no termina de encajar.',
      gift: 'Te pide ajustar hábitos, expectativas o ritmo hasta encontrar una forma más fina de integrarlo.',
    },
  }[name] ?? {
    challenge: 'Aqui hay algo importante para mirar con calma.',
    gift: 'Si lo haces consciente, esto puede jugar a tu favor.',
  }
}

function getAspectHumanLabel(name: string) {
  return ({
    Trin: 'fluye con naturalidad',
    Conj: 'se funden y amplifican',
    Cuad: 'genera tensión que empuja',
    Opos: 'busca equilibrio entre extremos',
    Sext: 'abre una oportunidad',
    Incon: 'pide ajuste fino',
  } as Record<string, string>)[name] ?? 'interactúa'
}

function getAspectGroupDescription(name: string) {
  return ({
    Trin: 'Se apoyan sin esfuerzo. Tienes aquí un recurso real — úsalo de forma consciente para no dejarlo pasar.',
    Conj: 'Van en la misma dirección y se amplifican. Cuando se siente intenso, elige una sola prioridad.',
    Cuad: 'Hay fricción entre ellos, y esa fricción te empuja a cambiar algo. Evitarlo no funciona — enfrentarlo sí.',
    Opos: 'Se polarizan: uno tira hacia un lado, el otro hacia el opuesto. La clave es integrar los dos, no elegir uno.',
    Sext: 'Hay una ventana abierta, pero no se activa sola. Un paso pequeño y consciente tuyo es lo que la abre.',
    Incon: 'No chocan de frente, pero tampoco encajan solos. Aquí toca calibrar, ajustar y escuchar lo que pide corrección.',
  } as Record<string, string>)[name] ?? 'Hay algo importante que mirar aquí con calma.'
}

type AspectItem = ReturnType<typeof getFilteredAspects>[number]

function groupAspectsByType(aspects: AspectItem[], planetName: string) {
  const ORDER = ['Conj', 'Opos', 'Cuad', 'Trin', 'Sext', 'Incon']
  const map: Record<string, { other: AspectItem['from']; color: string }[]> = {}
  for (const aspect of aspects) {
    const other = aspect.from.name === planetName ? aspect.to : aspect.from
    if (!map[aspect.name]) map[aspect.name] = []
    map[aspect.name].push({ other, color: aspect.color })
  }
  return ORDER.filter((k) => map[k]).map((k) => ({ type: k, items: map[k], color: map[k][0].color }))
}

function buildMomentSnapshot(
  positions: WheelPositions,
  lunarCycle?: ChartPayload['lunarCycle']
) {
  const personalAspects = getFilteredAspects(positions).filter(
    (a) => PERSONAL_PLANETS.includes(a.from.name) && PERSONAL_PLANETS.includes(a.to.name)
  )
  const harmonious = personalAspects.filter((a) => a.name === 'Trin' || a.name === 'Sext').length
  const tense = personalAspects.filter((a) => a.name === 'Cuad' || a.name === 'Opos').length
  let mood: string
  if (harmonious > tense + 1) mood = 'Hay más apoyo que tensión entre tus planetas personales en este momento.'
  else if (tense > harmonious + 1) mood = 'Hay más tensión que apoyo entre tus planetas personales — es una etapa de empuje y cambio.'
  else mood = 'Tu mapa personal muestra un equilibrio entre flujo y tensión.'
  const lunar = lunarCycle?.newMoon
    ? ` La Luna Nueva en ${lunarCycle.newMoon.sign} abre algo en tu ${lunarCycle.newMoon.area.toLowerCase()}.`
    : ''
  return mood + lunar
}

const PLANET_CORE_INTRO: Record<string, string> = {
  sol: 'Tu Sol marca cómo brillas y hacia dónde va tu energía vital.',
  luna: 'Tu Luna muestra cómo sientes, qué necesitas para estar bien y dónde buscas seguridad.',
  mercurio: 'Tu Mercurio revela cómo piensas, te comunicas y procesas la información.',
  venus: 'Tu Venus habla de qué valoras, cómo amas y qué te atrae.',
  marte: 'Tu Marte muestra cómo actúas, qué te impulsa y dónde pones tu energía.',
}

function buildPlanetCoreReading(planet: WheelPositions['planets'][number] | undefined, fallback: string) {
  if (!planet) return fallback
  const intro = PLANET_CORE_INTRO[normalizeTitle(planet.name)]
  if (intro) {
    return `${intro} En tu carta está en ${planet.sign} en Casa ${planet.house}, por lo que se activa principalmente en ${getPlanetHouseTheme(planet.house)}.`
  }
  return `${displayPlanetName(planet.name)} en ${planet.sign} en Casa ${planet.house}: se expresa en ${getPlanetHouseTheme(planet.house)}.`
}

function buildLunarActivationText(event: LunarEvent | null | undefined, phase: 'new' | 'full') {
  if (!event) {
    return phase === 'new'
      ? 'La Luna Nueva de este mes aparecera aqui en cuanto la lectura tenga ese dato.'
      : 'La Luna Llena de este mes aparecera aqui en cuanto la lectura tenga ese dato.'
  }

  if (phase === 'new') {
    return `La Luna Nueva cae en ${event.sign} ${formatDegree(event.degree, event.minutes)} y abre un comienzo en tu Casa ${event.house}. Activa ${event.area.toLowerCase()}. ${event.message}`
  }

  return `La Luna Llena cae en ${event.sign} ${formatDegree(event.degree, event.minutes)} y pone luz sobre tu Casa ${event.house}. Te muestra qué ya está maduro en ${event.area.toLowerCase()} y qué pide cierre o depuración. ${event.message}`
}

function buildTransitAdvice(
  transitPlanet: WheelPositions['planets'][number],
  natalPlanet: WheelPositions['planets'][number],
  aspectName: string
) {
  const transitRole = getPlanetRole(transitPlanet.name).toLowerCase()
  const natalRole = getPlanetRole(natalPlanet.name).toLowerCase()

  if (aspectName === 'Conj') {
    return `Integra ${transitRole} con ${natalRole}: este mes te conviene actuar con foco, no desde la mezcla o la urgencia.`
  }
  if (aspectName === 'Cuad') {
    return `No fuerces resultados entre ${transitRole} y ${natalRole}; ajusta ritmo, limites y prioridades antes de reaccionar.`
  }
  if (aspectName === 'Opos') {
    return `Busca equilibrio entre ${transitRole} y ${natalRole}; escucha los dos polos antes de tomar una decision.`
  }
  if (aspectName === 'Trin') {
    return `Aprovecha la fluidez entre ${transitRole} y ${natalRole} para mover esto con confianza, sin dispersarte.`
  }
  return `Haz espacio para que ${transitRole} y ${natalRole} se organicen con mas conciencia y menos piloto automatico.`
}

function buildTransitClosingAdvice(aspects: ReturnType<typeof getStrongestTransitAspects>) {
  if (!aspects.length) {
    return 'Tus transitos destacados apareceran aqui.'
  }

  const top = aspects[0]
  return `Consejo general del mes: ordena primero lo que se mueve en ${getPlanetHouseTheme(top.transitPlanet.house).toLowerCase()}, porque desde ahi se acomoda el resto del mapa.`
}

function buildYogaDownloadText(event: LunarEvent | null | undefined, routine: (typeof yogaByElement)[ElementKey]) {
  const poses = routine.sequence.slice(0, 3).map((item) => cleanText(item.pose)).join(', ')
  if (!event) {
    return `La rutina de este ciclo se integra dentro de la app. Empieza por ${poses} y abre cada postura para ver la guia completa.`
  }

  if (event.type === 'newMoon') {
    return `Esta práctica sigue el elemento ${ELEMENT_LABELS[event.element]} de la ${event.label} y acompaña un inicio: abre espacio, oxigena el cuerpo y prepara intención. La tienes integrada en la app, pose por pose: ${poses}.`
  }

  return `Esta práctica sigue el elemento ${ELEMENT_LABELS[event.element]} de la ${event.label} y acompaña una culminación: ayuda a soltar tensión, bajar ruido y cerrar el ciclo con más conciencia. La tienes integrada en la app, pose por pose: ${poses}.`
}

function getTransitPriority(name: string) {
  const order = ['Plutón', 'Neptuno', 'Urano', 'Saturno', 'Júpiter', 'Marte', 'Venus', 'Mercurio']
  const normalized = normalizeTitle(name)
  const idx = order.findIndex((item) => normalizeTitle(item) === normalized)
  return idx === -1 ? order.length : idx
}

function describeSocialPlanet(planet: WheelPositions['planets'][number]) {
  if (normalizeTitle(planet.name) === 'jupiter') {
    return `Jupiter muestra por donde expandes vision, fe y crecimiento. En tu carta cae en ${planet.sign} en Casa ${planet.house}, asi que tu expansion se activa en ${getPlanetHouseTheme(planet.house)}.`
  }

  return `Saturno muestra tu via de maduracion y maestria. En tu carta cae en ${planet.sign} en Casa ${planet.house}, asi que tus lecciones fuertes aparecen en ${getPlanetHouseTheme(planet.house)}.`
}

function describeTranspersonalPlanet(planet: WheelPositions['planets'][number]) {
  if (normalizeTitle(planet.name) === 'urano') {
    return `Urano marca cambios, libertad y giros inesperados. En ${planet.sign} y Casa ${planet.house}, pide despertar en ${getPlanetHouseTheme(planet.house)}.`
  }
  if (normalizeTitle(planet.name) === 'neptuno') {
    return `Neptuno habla de intuicion, sensibilidad y niebla. En ${planet.sign} y Casa ${planet.house}, vuelve mas sutil todo lo ligado a ${getPlanetHouseTheme(planet.house)}.`
  }
  return `Pluton muestra profundidad, crisis y regeneracion. En ${planet.sign} y Casa ${planet.house}, transforma de raiz lo que vives en ${getPlanetHouseTheme(planet.house)}.`
}

function describeNodeAxis(northNode: WheelPositions['planets'][number] | undefined, southNode: WheelPositions['planets'][number] | undefined) {
  if (!northNode || !southNode) {
    return 'Tu eje nodal aparecera aqui en cuanto la lectura tenga esa capa completa.'
  }

  return `Nodo Norte en ${northNode.sign} Casa ${northNode.house}: tu aprendizaje evolutivo crece en ${getPlanetHouseTheme(northNode.house)}. Nodo Sur en ${southNode.sign} Casa ${southNode.house}: traes recursos conocidos, pero tambien habitos viejos, en ${getPlanetHouseTheme(southNode.house)}.`
}

function describeLilith(lilith: WheelPositions['planets'][number] | undefined) {
  if (!lilith) return 'Lilith no viene en algunas lecturas antiguas. Si haces una lectura nueva, esta capa deberia aparecer.'
  return `Lilith en ${lilith.sign} en Casa ${lilith.house}: aqui vive una parte instintiva, salvaje y muy sensible de ti. Puede sentirse intensa, pero tambien guarda fuerza y verdad cuando dejas de reprimirla.`
}

function describeChiron(chiron: WheelPositions['planets'][number] | undefined) {
  if (!chiron) return 'Quiron puede faltar en lecturas guardadas antes de esta capa. Si haces una lectura nueva, deberia aparecer aqui.'
  return `Quiron en ${chiron.sign} en Casa ${chiron.house}: aqui aparece una herida sensible, pero tambien el potencial de convertir experiencia en sabiduria y medicina para ti y para otros.`
}


function inferPoseGuide(
  pose: string,
  duration: string,
  description: string,
  benefit: string,
  focus: string,
  caution?: string
): PoseGuide {
  const cleanedPose = cleanText(pose)
  const lower = cleanedPose.toLowerCase()
  const baseHold = `Respira aquí durante ${cleanText(duration).toLowerCase()} sin forzar el cuerpo.`
  const fallback: PoseGuide = {
    level: caution ? 'Media' : 'Suave',
    visual: 'ground',
    preparation: `Antes de entrar, conecta con ${cleanText(focus).toLowerCase()} y suaviza la respiración.`,
    movement: cleanText(description),
    hold: baseHold,
    close: cleanText(benefit),
    feel: `Busca una sensación de ${cleanText(focus).toLowerCase()}, nunca dolor.`,
    easier: caution ? cleanText(caution) : 'Haz la versión más pequeña y usa apoyo si lo necesitas.',
  }

  if (lower.includes('tadasana')) {
    return { ...fallback, level: 'Suave', visual: 'standing', preparation: 'Separa bien los pies y reparte el peso de forma pareja.', movement: 'Crece desde las plantas de los pies hacia la coronilla y activa suavemente el abdomen.', feel: 'Deberías sentirte despierta, estable y muy presente.' }
  }
  if (lower.includes('vrksasana') || lower.includes('garudasana')) {
    return { ...fallback, level: 'Media', visual: 'standing', preparation: 'Fija la mirada en un punto y siente el apoyo firme de la pierna base.', movement: 'Sube a la postura poco a poco y deja que el equilibrio nazca desde el centro.', feel: 'La sensación principal debe ser foco, concentración y eje interno.' }
  }
  if (lower.includes('virabhadrasana') || lower.includes('trikonasana')) {
    return { ...fallback, level: 'Media', visual: 'standing', preparation: 'Abre bien la base de las piernas y orienta la pelvis antes de profundizar.', movement: 'Entra con decisión pero mantén el cuello, la mandíbula y el pecho amplios.', feel: 'Deberías sentir fuerza abajo y claridad arriba.' }
  }
  if (lower.includes('navasana')) {
    return { ...fallback, level: 'Intensa', visual: 'seat', preparation: 'Siéntate sobre los isquiones y alarga primero la columna.', movement: 'Activa el abdomen antes de elevar piernas o inclinar el torso.', hold: `Mantén el centro encendido durante ${cleanText(duration).toLowerCase()} y respira sin colapsar el pecho.`, feel: 'Debe sentirse retador en el centro, pero no agresivo en la lumbar.' }
  }
  if (lower.includes('matsyendra') || lower.includes('gomukhasana')) {
    return { ...fallback, level: 'Media', visual: 'seat', preparation: 'Crece al inhalar antes de girar o abrir.', movement: 'Busca más espacio que profundidad; la postura se construye desde la respiración.', feel: 'Busca amplitud en pecho, hombros o cintura sin pinzar.' }
  }
  if (lower.includes('matsyasana') || lower.includes('supta') || lower.includes('viparita')) {
    return { ...fallback, level: 'Suave', visual: 'recline', preparation: 'Ten cerca mantas o cojines para que el cuerpo pueda recibir.', movement: 'Acomoda primero la espalda y el cuello; luego deja que la respiración abra la postura.', feel: 'La postura debe sentirse restaurativa, espaciosa y calmante.' }
  }
  if (lower.includes('balasana') || lower.includes('malasana') || lower.includes('baddha konasana')) {
    return { ...fallback, level: 'Suave', visual: 'ground', preparation: 'Permite que la exhalación afloje ingles, mandíbula y vientre.', movement: 'Entra de forma gradual y deja que el peso del cuerpo te ayude.', feel: 'La sensación principal debe ser arraigo y suavidad.' }
  }
  if (lower.includes('anjaneyasana') || lower.includes('anahatasana') || lower.includes('ustrasana')) {
    return { ...fallback, level: 'Media', visual: 'ground', preparation: 'Protege rodillas y zona lumbar creando base antes de abrirte.', movement: 'Abre pecho o caderas sin perder soporte en abdomen y piernas.', feel: 'Busca apertura con sostén, nunca una sensación de caída o presión.' }
  }
  if (lower.includes('bhujangasana') || lower.includes('dhanurasana')) {
    return { ...fallback, level: 'Media', visual: 'recline', preparation: 'Alarga primero las piernas y ensancha clavículas.', movement: 'Sube solo hasta donde puedas mantener el cuello libre y la respiración fluida.', feel: 'Debes sentir expansión en pecho y fuerza en espalda, no compresión lumbar.' }
  }

  return fallback
}

function PoseVisual({
  tone,
  visual,
}: {
  tone: string
  visual: PoseGuide['visual']
}) {
  const softTone = `${tone}33`

  return (
    <View style={styles.poseVisualWrap}>
      <View style={[styles.poseVisualHalo, { backgroundColor: softTone }]} />
      <Svg width={112} height={112} viewBox="0 0 112 112">
        <Circle cx="56" cy="56" r="44" stroke={tone} strokeOpacity="0.28" strokeWidth="1.5" fill="none" />
        {visual === 'standing' && (
          <>
            <Circle cx="56" cy="24" r="7" fill={tone} />
            <Line x1="56" y1="31" x2="56" y2="62" stroke={tone} strokeWidth="4" strokeLinecap="round" />
            <Line x1="56" y1="40" x2="38" y2="52" stroke={tone} strokeWidth="4" strokeLinecap="round" />
            <Line x1="56" y1="40" x2="74" y2="52" stroke={tone} strokeWidth="4" strokeLinecap="round" />
            <Line x1="56" y1="62" x2="45" y2="90" stroke={tone} strokeWidth="4" strokeLinecap="round" />
            <Line x1="56" y1="62" x2="67" y2="90" stroke={tone} strokeWidth="4" strokeLinecap="round" />
          </>
        )}
        {visual === 'seat' && (
          <>
            <Circle cx="56" cy="25" r="7" fill={tone} />
            <Line x1="56" y1="32" x2="56" y2="58" stroke={tone} strokeWidth="4" strokeLinecap="round" />
            <Line x1="56" y1="44" x2="36" y2="54" stroke={tone} strokeWidth="4" strokeLinecap="round" />
            <Line x1="56" y1="44" x2="75" y2="48" stroke={tone} strokeWidth="4" strokeLinecap="round" />
            <Line x1="56" y1="58" x2="32" y2="74" stroke={tone} strokeWidth="4" strokeLinecap="round" />
            <Line x1="56" y1="58" x2="76" y2="78" stroke={tone} strokeWidth="4" strokeLinecap="round" />
            <Line x1="32" y1="74" x2="78" y2="74" stroke={tone} strokeWidth="4" strokeLinecap="round" />
          </>
        )}
        {visual === 'ground' && (
          <>
            <Circle cx="56" cy="26" r="7" fill={tone} />
            <Line x1="56" y1="33" x2="56" y2="52" stroke={tone} strokeWidth="4" strokeLinecap="round" />
            <Line x1="56" y1="45" x2="34" y2="58" stroke={tone} strokeWidth="4" strokeLinecap="round" />
            <Line x1="56" y1="45" x2="78" y2="58" stroke={tone} strokeWidth="4" strokeLinecap="round" />
            <Line x1="56" y1="52" x2="42" y2="78" stroke={tone} strokeWidth="4" strokeLinecap="round" />
            <Line x1="56" y1="52" x2="70" y2="78" stroke={tone} strokeWidth="4" strokeLinecap="round" />
            <Path d="M32 82 C44 74, 68 74, 80 82" stroke={tone} strokeWidth="3" fill="none" strokeLinecap="round" />
          </>
        )}
        {visual === 'recline' && (
          <>
            <Circle cx="36" cy="43" r="7" fill={tone} />
            <Line x1="43" y1="46" x2="74" y2="56" stroke={tone} strokeWidth="4" strokeLinecap="round" />
            <Line x1="58" y1="51" x2="44" y2="68" stroke={tone} strokeWidth="4" strokeLinecap="round" />
            <Line x1="72" y1="55" x2="86" y2="38" stroke={tone} strokeWidth="4" strokeLinecap="round" />
            <Line x1="72" y1="55" x2="88" y2="70" stroke={tone} strokeWidth="4" strokeLinecap="round" />
            <Path d="M24 76 C44 70, 70 70, 92 76" stroke={tone} strokeWidth="3" fill="none" strokeLinecap="round" />
          </>
        )}
      </Svg>
    </View>
  )
}

function KeyPlanetCard({ title, planet }: { title: string; planet: WheelPositions['planets'][number] | undefined }) {
  if (!planet) return null
  const tone = elementColor(planet.sign, planet.name)

  return (
    <View style={[styles.keyPlanetCard, { borderColor: tone }]}>
      <Text style={styles.keyPlanetLabel}>{title}</Text>
      <AstroGlyph glyph={getAstronomiconPlanetGlyph(planet.name)} size={26} color={tone} style={styles.keyPlanetGlyph} />
      <Text style={styles.keyPlanetValue}>{planet.name}</Text>
      <View style={styles.signMetaRow}>
        <AstroGlyph glyph={getAstronomiconSignGlyph(planet.sign)} size={14} color={colors.goldLight} />
        <Text style={styles.keyPlanetMeta}>{formatDegree(planet.degree, planet.minutes)} {planet.sign}</Text>
      </View>
    </View>
  )
}


function PoseAccordion({
  index,
  item,
  tone,
  expanded,
  onPreview,
  onToggle,
}: {
  index: number
  item: (typeof yogaByElement)[ElementKey]['sequence'][number]
  tone: string
  expanded: boolean
  onPreview: (payload: { image: any; pose: string }) => void
  onToggle: () => void
}) {
  const guide = useMemo(
    () => inferPoseGuide(item.pose, item.duration, item.description, item.benefit, item.focus, item.caution),
    [item.pose, item.duration, item.description, item.benefit, item.focus, item.caution]
  )
  const poseImage = useMemo(() => getYogaPoseImage(cleanText(item.pose)), [item.pose])

  return (
    <View style={styles.poseCard}>
      <TouchableOpacity style={styles.poseHeader} activeOpacity={0.8} onPress={onToggle}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            if (poseImage) onPreview({ image: poseImage, pose: item.pose })
          }}
          style={styles.poseImageTap}
        >
          {poseImage ? (
            <Image
              source={poseImage}
              style={styles.poseImage}
              contentFit="contain"
              contentPosition="center"
              transition={150}
            />
          ) : (
            <PoseVisual tone={tone} visual={guide.visual} />
          )}
          {poseImage ? (
            <View style={styles.poseZoomBadge}>
              <Text style={styles.poseZoomBadgeText}>Ver</Text>
            </View>
          ) : null}
        </TouchableOpacity>
        <View style={styles.poseSummary}>
          <View style={styles.poseTitleRow}>
            <View style={[styles.poseIndex, { backgroundColor: tone }]}>
              <Text style={styles.poseIndexText}>{index + 1}</Text>
            </View>
            <Text style={styles.poseName}>{item.pose}</Text>
          </View>
          <Text style={styles.poseFocus} numberOfLines={2}>{capitalize(cleanText(item.focus))}</Text>
          <View style={styles.poseMetaRow}>
            <View style={styles.poseMetaPill}>
              <Text style={styles.poseMetaLabel}>Duración</Text>
              <Text style={styles.poseMetaValue}>{cleanText(item.duration)}</Text>
            </View>
            <View style={styles.poseMetaPill}>
              <Text style={styles.poseMetaLabel}>Nivel</Text>
              <Text style={styles.poseMetaValue}>{guide.level}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.poseToggle}>{expanded ? '\u2212' : '+'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.poseDetails}>
          <Text style={styles.poseSectionTitle}>Preparación</Text>
          <Text style={styles.poseDetailText}>{guide.preparation}</Text>

          <Text style={styles.poseSectionTitle}>Movimiento</Text>
          <Text style={styles.poseDetailText}>{guide.movement}</Text>

          <Text style={styles.poseSectionTitle}>Sostén</Text>
          <Text style={styles.poseDetailText}>{guide.hold}</Text>

          <Text style={styles.poseSectionTitle}>Qué sentir</Text>
          <Text style={styles.poseDetailText}>{guide.feel}</Text>

          <Text style={styles.poseSectionTitle}>Cierre</Text>
          <Text style={styles.poseDetailText}>{guide.close}</Text>

          {guide.easier ? (
            <>
              <Text style={styles.poseSectionTitle}>Versión suave</Text>
              <Text style={styles.poseDetailText}>{guide.easier}</Text>
            </>
          ) : null}
        </View>
      )}
    </View>
  )
}

function MomentPlanetCard({
  planet,
  positions,
  aspectDescMap,
  aspectsLoading,
  aspectsError,
  natalReading,
  natalLoading,
}: {
  planet: WheelPositions['planets'][number]
  positions: WheelPositions
  aspectDescMap: Record<string, string> | null
  aspectsLoading: boolean
  aspectsError: boolean
  natalReading: NatalReading | null
  natalLoading: boolean
}) {
  const imageUrl = usePlanetArtwork(planet.name)
  const groups = groupAspectsByType(getPlanetAspectHighlights(positions, planet.name), planet.name)
  const tone = elementColor(planet.sign, planet.name)
  const planetKey = normalizeTitle(planet.name)
  const aiPlanetText = natalReading?.planets?.[planetKey]

  return (
    <View style={[styles.planetMomentCard, { borderColor: tone }]}>
      {imageUrl ? <Image source={imageUrl} style={styles.planetMomentImage} contentFit="cover" transition={220} /> : null}
      <View style={styles.planetMomentScrim} />
      <View style={styles.planetMomentContent}>
        <View style={styles.planetMomentHeader}>
          <View style={[styles.planetMomentGlyphWrap, { borderColor: `${tone}66` }]}>
            <AstroGlyph glyph={getAstronomiconPlanetGlyph(planet.name)} size={42} color={colors.goldLight} />
          </View>
          <View style={styles.planetMomentHeaderBody}>
            <Text style={styles.planetMomentTitle}>Tu {displayPlanetName(planet.name)}</Text>
            <View style={styles.planetMomentMetaRow}>
              <View style={styles.planetSignBadge}>
                <AstroGlyph glyph={getAstronomiconSignGlyph(planet.sign)} size={14} color={colors.goldLight} />
                <Text style={styles.planetSignText}>{planet.sign}</Text>
              </View>
              <Text style={styles.planetHouseText}>Casa {planet.house}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.bodyText}>
          {aiPlanetText ?? (natalLoading ? '...' : buildPlanetCoreReading(planet, `Informacion de ${displayPlanetName(planet.name)} aparecera aqui.`))}
        </Text>

        {groups.map(({ type, items, color }) => (
          <View key={type} style={styles.aspectGroup}>
            <View style={styles.aspectGroupHeader}>
              <View style={[styles.aspectBadge, { borderColor: color }]}>
                <AstroGlyph glyph={getAstronomiconAspectGlyph(type)} size={16} color={color} />
              </View>
              <Text style={[styles.aspectGroupLabel, { color }]}>{getAspectHumanLabel(type)}</Text>
            </View>
            {items.map(({ other }) => {
              const key1 = `${planet.name}-${other.name}-${type}`
              const key2 = `${other.name}-${planet.name}-${type}`
              const aiDesc = natalReading?.aspects?.[key1] ?? natalReading?.aspects?.[key2] ?? aspectDescMap?.[key1] ?? aspectDescMap?.[key2]
              return (
                <View key={other.name} style={styles.aspectPairBlock}>
                  <Text style={styles.aspectPairLine}>· Con {displayPlanetName(other.name)}</Text>
                  <Text style={styles.aspectGroupDesc}>
                    {aiDesc ?? (aspectsLoading || natalLoading
                      ? '...'
                      : aspectsError
                        ? getAiUnavailableMessage(`la lectura de ${displayPlanetName(planet.name)}`)
                        : getAspectGroupDescription(type))}
                  </Text>
                </View>
              )
            })}
          </View>
        ))}
      </View>
    </View>
  )
}

const SCREEN_WIDTH = Dimensions.get('window').width
const CAROUSEL_CARD_WIDTH = SCREEN_WIDTH - 40 - 24
const CAROUSEL_FULL_WIDTH = SCREEN_WIDTH - 40

function HorizontalCarousel({ children, fullWidth = false }: { children: React.ReactNode; fullWidth?: boolean }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const items = React.Children.toArray(children)
  const cardWidth = fullWidth ? CAROUSEL_FULL_WIDTH : CAROUSEL_CARD_WIDTH
  const snapInterval = cardWidth + 12
  return (
    <View style={{ marginBottom: 14 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={snapInterval}
        snapToAlignment="start"
        contentContainerStyle={{ gap: 12, paddingRight: 20 }}
        onScroll={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / snapInterval)
          setActiveIndex(Math.max(0, Math.min(idx, items.length - 1)))
        }}
        scrollEventThrottle={16}
      >
        {items.map((child, i) => (
          <View key={i} style={{ width: cardWidth }}>
            {child}
          </View>
        ))}
      </ScrollView>
      {items.length > 1 && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 10 }}>
          {items.map((_, i) => (
            <View key={i} style={{ width: i === activeIndex ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === activeIndex ? colors.gold : 'rgba(255,255,255,0.22)' }} />
          ))}
        </View>
      )}
    </View>
  )
}

function TransitChipGrid({ aspects, transitAdviceMap }: {
  aspects: ReturnType<typeof getStrongestTransitAspects>
  transitAdviceMap: Record<string, string> | null
}) {
  const [selected, setSelected] = useState<number | null>(null)
  const selectedAspect = selected !== null ? aspects[selected] : null

  return (
    <View style={styles.contentCard}>
      <View style={styles.planetSelectorGrid}>
        {aspects.map((aspect, i) => {
          const isActive = selected === i
          return (
            <TouchableOpacity
              key={`${aspect.transitPlanet.name}-${aspect.natalPlanet.name}-${i}`}
              style={[styles.planetSelectorChip, isActive && styles.planetSelectorChipActive]}
              onPress={() => setSelected(isActive ? null : i)}
              activeOpacity={0.75}
            >
              <AstroGlyph glyph={getAstronomiconPlanetGlyph(aspect.transitPlanet.name)} size={20} color={isActive ? colors.goldLight : colors.whiteSubtle} />
              <Text style={[styles.planetSelectorName, isActive && styles.planetSelectorNameActive]} numberOfLines={1}>
                {displayPlanetName(aspect.transitPlanet.name)}
              </Text>
              <View style={[styles.aspectBadge, { borderColor: aspect.color, marginTop: 2 }]}>
                <AstroGlyph glyph={getAstronomiconAspectGlyph(aspect.name)} size={12} color={aspect.color} />
              </View>
            </TouchableOpacity>
          )
        })}
      </View>

      {selectedAspect !== null && selected !== null && (
        <View style={styles.planetSelectorPanel}>
          <View style={styles.planetSelectorPanelHeader}>
            <View style={[styles.planetSelectorPanelHeaderContent, { flexDirection: 'column', alignItems: 'flex-start' }]}>
              <Text style={[styles.infoTitle, { flexShrink: 1 }]}>
                {displayPlanetName(selectedAspect.transitPlanet.name)} {getAspectHumanLabel(selectedAspect.name)} {displayPlanetName(selectedAspect.natalPlanet.name)}
              </Text>
              <Text style={styles.profileHint}>Casa {selectedAspect.transitPlanet.house} · {getPlanetHouseTheme(selectedAspect.transitPlanet.house)}</Text>
            </View>
          </View>
          <Text style={styles.bodyText}>
            {transitAdviceMap?.[`${selectedAspect.transitPlanet.name}-${selectedAspect.name}-${selectedAspect.natalPlanet.name}`]
              ?? buildTransitAdvice(selectedAspect.transitPlanet, selectedAspect.natalPlanet, selectedAspect.name)}
          </Text>
        </View>
      )}
    </View>
  )
}

function PlanetSelectorGrid({ planets, positions, natalReading, natalLoading, aspectDescMap, aspectsLoading, aspectsError, planetImages = {} }: {
  planets: WheelPositions['planets']
  positions: WheelPositions
  natalReading: NatalReading | null
  natalLoading: boolean
  aspectDescMap: Record<string, string> | null
  aspectsLoading: boolean
  aspectsError: boolean
  planetImages?: Record<string, string>
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const selectedPlanet = planets.find((p) => p.name === selected) ?? null

  return (
    <View style={styles.contentCard}>
      <View style={styles.planetSelectorGrid}>
        {planets.map((planet) => {
          const isActive = selected === planet.name
          return (
            <TouchableOpacity
              key={planet.name}
              style={[styles.planetSelectorChip, isActive && styles.planetSelectorChipActive]}
              onPress={() => setSelected(isActive ? null : planet.name)}
              activeOpacity={0.75}
            >
              <AstroGlyph glyph={getAstronomiconPlanetGlyph(planet.name)} size={22} color={isActive ? colors.goldLight : colors.whiteSubtle} />
              <Text style={[styles.planetSelectorName, isActive && styles.planetSelectorNameActive]}>
                {displayPlanetName(planet.name)}
              </Text>
              <Text style={styles.planetSelectorSign}>{planet.sign}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {selectedPlanet ? (() => {
        const groups = groupAspectsByType(getPlanetAspectHighlights(positions, selectedPlanet.name), selectedPlanet.name)
        return (
          <View style={styles.planetSelectorPanel}>
            <View style={styles.planetSelectorPanelHeader}>
              {planetImages[selectedPlanet.name] ? (
                <Image source={planetImages[selectedPlanet.name]} style={styles.planetSelectorPanelImage} contentFit="cover" />
              ) : null}
              <View style={styles.planetSelectorPanelImageScrim} />
              <View style={styles.planetSelectorPanelHeaderContent}>
                <AstroGlyph glyph={getAstronomiconPlanetGlyph(selectedPlanet.name)} size={36} color={colors.goldLight} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.planetMomentTitle}>Tu {displayPlanetName(selectedPlanet.name)}</Text>
                  <View style={styles.planetMomentMetaRow}>
                    <View style={styles.planetSignBadge}>
                      <AstroGlyph glyph={getAstronomiconSignGlyph(selectedPlanet.sign)} size={13} color={colors.goldLight} />
                      <Text style={styles.planetSignText}>{selectedPlanet.sign}</Text>
                    </View>
                    <Text style={styles.planetHouseText}>Casa {selectedPlanet.house}</Text>
                  </View>
                </View>
              </View>
            </View>
            <Text style={styles.bodyText}>
              {natalReading?.planets?.[normalizeTitle(selectedPlanet.name)] ?? (natalLoading ? '...' : buildPlanetCoreReading(selectedPlanet, `Información de ${displayPlanetName(selectedPlanet.name)} aparecerá aquí.`))}
            </Text>
            {groups.map(({ type, items, color }) => (
              <View key={type} style={styles.aspectGroup}>
                <View style={styles.aspectGroupHeader}>
                  <View style={[styles.aspectBadge, { borderColor: color }]}>
                    <AstroGlyph glyph={getAstronomiconAspectGlyph(type)} size={15} color={color} />
                  </View>
                  <Text style={[styles.aspectGroupLabel, { color }]}>{getAspectHumanLabel(type)}</Text>
                </View>
                {items.map(({ other }) => {
                  const key1 = `${selectedPlanet.name}-${other.name}-${type}`
                  const key2 = `${other.name}-${selectedPlanet.name}-${type}`
                  const aiDesc = natalReading?.aspects?.[key1] ?? natalReading?.aspects?.[key2] ?? aspectDescMap?.[key1] ?? aspectDescMap?.[key2]
                  return (
                    <View key={other.name} style={styles.aspectPairBlock}>
                      <Text style={styles.aspectPairLine}>· Con {displayPlanetName(other.name)}</Text>
                      <Text style={styles.aspectGroupDesc}>
                        {aiDesc ?? (aspectsLoading || natalLoading ? '...' : aspectsError ? getAiUnavailableMessage(`la lectura de ${displayPlanetName(selectedPlanet.name)}`) : getAspectGroupDescription(type))}
                      </Text>
                    </View>
                  )
                })}
              </View>
            ))}
          </View>
        )
      })() : (
        <Text style={[styles.profileHint, { textAlign: 'center', marginTop: 12 }]}>Toca un planeta para leer su energía este mes</Text>
      )}
    </View>
  )
}

function LunarTabCard({ lunarCycle, lunarEventsData, actions, ritual, newMoonRoutine, fullMoonRoutine }: {
  lunarCycle?: ChartPayload['lunarCycle']
  lunarEventsData: { lunarNewText: string | null; lunarFullText: string | null } | null
  actions: { bullets: string[] }
  ritual: { bullets: string[] }
  newMoonRoutine: (typeof yogaByElement)[ElementKey]
  fullMoonRoutine: (typeof yogaByElement)[ElementKey]
}) {
  const [activeTab, setActiveTab] = useState<'new' | 'full'>('new')
  return (
    <View style={styles.contentCard}>
      <View style={styles.lunarInnerTabRow}>
        <TouchableOpacity style={[styles.lunarInnerTab, activeTab === 'new' && styles.lunarInnerTabActive]} onPress={() => setActiveTab('new')} activeOpacity={0.8}>
          <MoonPhaseIcon size={18} phaseOverride={0} />
          <Text style={[styles.lunarInnerTabText, activeTab === 'new' && styles.lunarInnerTabTextActive]}>Luna Nueva</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.lunarInnerTab, activeTab === 'full' && styles.lunarInnerTabActive]} onPress={() => setActiveTab('full')} activeOpacity={0.8}>
          <MoonPhaseIcon size={18} phaseOverride={0.5} />
          <Text style={[styles.lunarInnerTabText, activeTab === 'full' && styles.lunarInnerTabTextActive]}>Luna Llena</Text>
        </TouchableOpacity>
      </View>
      {activeTab === 'new' ? (
        <>
          <Text style={styles.infoTitle}>Qué activa en tu carta</Text>
          <Text style={styles.bodyText}>{lunarEventsData?.lunarNewText ?? buildLunarActivationText(lunarCycle?.newMoon, 'new')}</Text>
          {actions.bullets.length > 0 ? actions.bullets.map((item, index) => (
            <View key={`new-action-${index}`} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>{'\u2022'}</Text>
              <Text style={styles.bulletText}>{renderInline(item)}</Text>
            </View>
          )) : null}
          <View style={styles.lunarInnerDivider} />
          <Text style={styles.infoTitle}>Tu práctica de yoga</Text>
          <Text style={styles.bodyText}>{buildYogaDownloadText(lunarCycle?.newMoon, newMoonRoutine)}</Text>
          <Text style={styles.profileHint}>La rutina completa está integrada más abajo.</Text>
        </>
      ) : (
        <>
          <Text style={styles.infoTitle}>Qué activa en tu carta</Text>
          <Text style={styles.bodyText}>{lunarEventsData?.lunarFullText ?? buildLunarActivationText(lunarCycle?.fullMoon, 'full')}</Text>
          {ritual.bullets.length > 0 ? ritual.bullets.map((item, index) => (
            <View key={`full-ritual-${index}`} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>{'\u2022'}</Text>
              <Text style={styles.bulletText}>{renderInline(item)}</Text>
            </View>
          )) : null}
          <View style={styles.lunarInnerDivider} />
          <Text style={styles.infoTitle}>Tu práctica de yoga</Text>
          <Text style={styles.bodyText}>{buildYogaDownloadText(lunarCycle?.fullMoon, fullMoonRoutine)}</Text>
          <Text style={styles.profileHint}>La rutina completa está integrada más abajo.</Text>
        </>
      )}
    </View>
  )
}

function FreeTab({ name, positions, sections, monthKey, language, natalReading, natalLoading }: { name: string; positions: WheelPositions; sections: ReadingSection[]; monthKey: string; language: SupportedLanguage; natalReading: NatalReading | null; natalLoading: boolean }) {
  const { t } = useTranslation()
  const triad = useMemo(() => getTriad(positions), [positions])
  const elementProfile = useMemo(() => describeElementProfile(positions), [positions])
  const modalityProfile = useMemo(() => describeModalityProfile(positions), [positions])
  const direction = mergeSections(sections, ['DIRECCION'])
  const sun = getPlanet(positions, 'Sol')
  const moon = getPlanet(positions, 'Luna')
  const personalPlanets = useMemo(
    () => PERSONAL_PLANETS.map((n) => getPlanet(positions, n)).filter(Boolean) as WheelPositions['planets'],
    [positions]
  )
  const [planetImages, setPlanetImages] = useState<Record<string, string>>({})

  useEffect(() => {
    let alive = true
    Promise.all(
      personalPlanets.map(async (planet) => {
        try {
          const imageUrl = await getPlanetArtworkUrl(planet.name)
          return imageUrl ? [planet.name, imageUrl] as const : null
        } catch { return null }
      })
    ).then((entries) => {
      if (!alive) return
      setPlanetImages(entries.reduce<Record<string, string>>((acc, item) => {
        if (item) acc[item[0]] = item[1]
        return acc
      }, {}))
    })
    return () => { alive = false }
  }, [personalPlanets])

  const portraitEnabled = Boolean(sun && moon)
  const { text: portraitText, loading: portraitLoading, error: portraitError } = useAiCard(
    `sarita_ai_portrait_v4_${language}_${monthKey}_${normalizeTitle(name)}_${sun?.sign}_${moon?.sign}_${positions.ascendant.sign}_${elementProfile.dominant}_${modalityProfile.dominant}`,
    useCallback(async () => {
      const resp = await fetch(`${API_BASE_URL}/api/ai/portrait`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          sun: sun ? `${sun.sign} Casa ${sun.house}` : '',
          moon: moon ? `${moon.sign} Casa ${moon.house}` : '',
          ascendant: positions.ascendant.sign,
          dominantElement: ELEMENT_LABELS[elementProfile.dominant],
          dominantModality: MODALITY_LABELS[modalityProfile.dominant],
        }),
      })
      const data = await resp.json()
      return data.portrait ?? ''
    }, [language, sun, moon, positions.ascendant.sign, elementProfile.dominant, modalityProfile.dominant]),
    portraitEnabled
  )

  return (
    <ScrollView contentContainerStyle={styles.tabScroll} showsVerticalScrollIndicator={false}>
      <View style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>TÚ</Text>
        <Text style={styles.heroTitle}>{name}, este eres tú</Text>
        <Text style={styles.heroText}>
          Todo lo que ves aquí refleja el instante exacto en que naciste. No cambia con el tiempo — es tu estructura base.
        </Text>
      </View>

      <SectionHeader title="MANDALA NATAL" />
      <View style={styles.contentCard}>
        <WheelChart positions={positions} />
      </View>

      <SectionHeader title="TRIADA BASE" />
      <View style={styles.keyPlanetRow}>
        {triad.sun ? <KeyPlanetCard title="Sol" planet={triad.sun} /> : null}
        {triad.moon ? <KeyPlanetCard title="Luna" planet={triad.moon} /> : null}
        <View style={[styles.keyPlanetCard, { borderColor: colors.goldLight }]}>
          <Text style={styles.keyPlanetLabel}>Ascendente</Text>
          <AstroGlyph glyph="c" size={26} color={colors.goldLight} style={styles.keyPlanetGlyph} />
          <Text style={styles.keyPlanetValue}>{triad.rising.sign}</Text>
          <View style={styles.signMetaRow}>
            <AstroGlyph glyph={getAstronomiconSignGlyph(triad.rising.sign)} size={14} color={colors.goldLight} />
            <Text style={styles.keyPlanetMeta}>{formatDegree(triad.rising.degree, triad.rising.minutes)}</Text>
          </View>
        </View>
      </View>

      <SectionHeader title="TU TRÍADA EN DETALLE" />
      <HorizontalCarousel>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>☀️ Tu Sol</Text>
          <Text style={styles.bodyText}>
            {natalReading?.planets?.sol ?? (natalLoading ? '...' : buildPlanetCoreReading(sun, 'Tu Sol aparecera aqui.'))}
          </Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>🌙 Tu Luna</Text>
          <Text style={styles.bodyText}>
            {natalReading?.planets?.luna ?? (natalLoading ? '...' : buildPlanetCoreReading(moon, 'Tu Luna aparecera aqui.'))}
          </Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>⬆️ Tu Ascendente</Text>
          <Text style={styles.bodyText}>
            {natalReading?.planets?.ascendente ?? (natalLoading ? '...' : direction.paragraphs[0] || `Tu Ascendente en ${positions.ascendant.sign} marca hacia donde creces y el tipo de experiencias que te busca la vida.`)}
          </Text>
          <Text style={styles.profileHint}>
            {positions.ascendant.sign} {formatDegree(positions.ascendant.degree, positions.ascendant.minutes)}
          </Text>
        </View>
      </HorizontalCarousel>

      {(portraitText || portraitLoading || portraitError) ? (
        <View style={styles.aiInsightCard}>
          <Text style={styles.aiInsightEyebrow}>ASÍ ERES TÚ</Text>
          {portraitLoading && !portraitText ? (
            <Text style={styles.aiInsightLoading}>Generando tu retrato...</Text>
          ) : portraitError && !portraitText ? (
            <Text style={styles.aiInsightLoading}>{getAiUnavailableMessage('tu retrato')}</Text>
          ) : (
            <Text style={styles.aiInsightText}>{portraitText}</Text>
          )}
        </View>
      ) : null}

      <HorizontalCarousel>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Elementos</Text>
          {ELEMENT_ORDER.map((key) => {
            const value = elementProfile.counts[key] ?? 0
            const fillWidth = `${(value / elementProfile.total) * 100}%` as `${number}%`
            return (
              <View key={key} style={styles.distributionRow}>
                <View style={styles.distributionLabelRow}>
                  <Text style={styles.bodyText}>{ELEMENT_LABELS[key]}</Text>
                  <Text style={styles.bodyText}>{value}</Text>
                </View>
                <View style={styles.distributionTrack}>
                  <View style={[styles.distributionFill, { width: fillWidth, backgroundColor: colors[key] }]} />
                </View>
              </View>
            )
          })}
          <Text style={styles.profileHint}>
            {natalReading?.special?.elementProfile ?? (natalLoading ? '...' : `${elementProfile.dominantText} ${elementProfile.weakText}`)}
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Modalidad</Text>
          {(['cardinal', 'fixed', 'mutable'] as const).map((key) => {
            const value = modalityProfile.counts[key] ?? 0
            const fillWidth = `${(value / modalityProfile.total) * 100}%` as `${number}%`
            return (
              <View key={key} style={styles.distributionRow}>
                <View style={styles.distributionLabelRow}>
                  <Text style={styles.bodyText}>{MODALITY_LABELS[key]}</Text>
                  <Text style={styles.bodyText}>{value}</Text>
                </View>
                <View style={styles.distributionTrack}>
                  <View style={[styles.distributionFill, { width: fillWidth, backgroundColor: colors.water }]} />
                </View>
              </View>
            )
          })}
          <Text style={styles.profileHint}>
            {natalReading?.special?.modalityProfile ?? (natalLoading ? '...' : `${modalityProfile.dominantText} ${modalityProfile.weakText}`)}
          </Text>
        </View>
      </HorizontalCarousel>

      <SectionHeader title="TUS PLANETAS NATALES" />
      <PlanetSelectorGrid
        planets={personalPlanets}
        positions={positions}
        natalReading={natalReading}
        natalLoading={natalLoading}
        aspectDescMap={null}
        aspectsLoading={false}
        aspectsError={false}
        planetImages={planetImages}
      />
    </ScrollView>
  )
}


function GuideLunarTab({
  name,
  positions,
  sections,
  lunarCycle,
  transitChart,
  retrogrades,
  monthKey,
  language,
  natalReading,
  natalLoading,
}: {
  name: string
  positions: WheelPositions
  sections: ReadingSection[]
  lunarCycle?: ChartPayload['lunarCycle']
  transitChart?: TransitChart
  retrogrades?: RetrogradeEvent[]
  monthKey: string
  language: SupportedLanguage
  natalReading: NatalReading | null
  natalLoading: boolean
}) {
  const { t } = useTranslation()
  const { dominantElement } = useMemo(() => deriveYogaElement(positions), [positions])
  const lunarPracticeElement = lunarCycle?.newMoon?.element ?? dominantElement
  const routine = yogaByElement[lunarPracticeElement]
  const newMoonRoutine = yogaByElement[lunarCycle?.newMoon?.element ?? lunarPracticeElement]
  const fullMoonRoutine = yogaByElement[lunarCycle?.fullMoon?.element ?? lunarPracticeElement]
  const tone = colors[lunarPracticeElement]
  const [expandedPose, setExpandedPose] = useState<number | null>(0)
  const [preview, setPreview] = useState<{ image: any; pose: string } | null>(null)
  const actions = mergeSections(sections, ['TU ACCION', 'QUE HACER AHORA', 'TU ACCIÓN', 'QUÉ HACER AHORA'])
  const ritual = mergeSections(sections, ['TU RITUAL DEL MES'])
  const sun = getPlanet(positions, 'Sol')
  const moon = getPlanet(positions, 'Luna')

  const { text: lifeAreasJson, loading: lifeAreasLoading, error: lifeAreasError } = useAiCard(
    `sarita_ai_life_areas_v1_${language}_${monthKey}_${normalizeTitle(name)}_${sun?.sign}_${moon?.sign}_${positions.ascendant.sign}`,
    useCallback(async () => {
      const venus = getPlanet(positions, 'Venus')
      const mars = getPlanet(positions, 'Marte')
      const jupiter = getPlanet(positions, 'Júpiter')
      const saturn = getPlanet(positions, 'Saturno')
      const resp = await fetch(`${API_BASE_URL}/api/ai/life-areas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          language,
          sun: sun ? `${sun.sign} Casa ${sun.house}` : '',
          moon: moon ? `${moon.sign} Casa ${moon.house}` : '',
          ascendant: positions.ascendant.sign,
          venus: venus ? `${venus.sign} Casa ${venus.house}` : '',
          mars: mars ? `${mars.sign} Casa ${mars.house}` : '',
          jupiter: jupiter ? `${jupiter.sign} Casa ${jupiter.house}` : '',
          saturn: saturn ? `${saturn.sign} Casa ${saturn.house}` : '',
          house2: getPlanetHouseTheme(2),
          house6: getPlanetHouseTheme(6),
          house7: getPlanetHouseTheme(7),
          house8: getPlanetHouseTheme(8),
          transitSummary: lunarCycle
            ? `${lunarCycle.newMoon?.sign ?? 'sin datos'} Casa ${lunarCycle.newMoon?.house ?? '-'} / ${lunarCycle.fullMoon?.sign ?? 'sin datos'} Casa ${lunarCycle.fullMoon?.house ?? '-'}`
            : 'sin datos',
        }),
      })
      const data = await resp.json()
      return JSON.stringify(data.areas ?? {})
    }, [name, language, sun, moon, positions, lunarCycle]),
    true
  )
  const lifeAreas = useMemo(() => {
    if (!lifeAreasJson) return null
    try { return JSON.parse(lifeAreasJson) as { love?: string; finance?: string; health?: string } } catch { return null }
  }, [lifeAreasJson])

  const aspectSummaryText = useMemo(() => {
    const personalAspects = getFilteredAspects(positions).filter(
      (a) => PERSONAL_PLANETS.includes(a.from.name) && PERSONAL_PLANETS.includes(a.to.name)
    )
    return personalAspects.slice(0, 5)
      .map((a) => `${a.from.name} ${getAspectLabel(a.name)} ${a.to.name}`)
      .join(', ')
  }, [positions])

  const { text: monthText, loading: monthLoading, error: monthError } = useAiCard(
    `sarita_ai_month_v5_${language}_${monthKey}_${normalizeTitle(name)}_${sun?.sign}_${moon?.sign}_${positions.ascendant.sign}`,
    useCallback(async () => {
      const resp = await fetch(`${API_BASE_URL}/api/ai/month`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          language,
          sun: sun ? `${sun.sign} Casa ${sun.house}` : 'desconocido',
          moon: moon ? `${moon.sign} Casa ${moon.house}` : 'desconocido',
          ascendant: positions.ascendant.sign,
          lunarNew: lunarCycle?.newMoon ? `${lunarCycle.newMoon.sign} Casa ${lunarCycle.newMoon.house} — ${lunarCycle.newMoon.area}` : 'sin datos',
          lunarFull: lunarCycle?.fullMoon ? `${lunarCycle.fullMoon.sign} Casa ${lunarCycle.fullMoon.house} — ${lunarCycle.fullMoon.area}` : 'sin datos',
          aspectSummary: aspectSummaryText,
          natalSummary: positions.planets.slice(0, 6).map((planet) => `${planet.name} en ${planet.sign} Casa ${planet.house}`).join(', '),
          transitSummary: getStrongestTransitAspects(positions, transitChart).slice(0, 4).map((aspect) => `${aspect.transitPlanet.name} ${aspect.name} ${aspect.natalPlanet.name}`).join(', '),
        }),
      })
      const data = await resp.json()
      return data.month ?? ''
    }, [name, language, sun, moon, positions, transitChart, positions.ascendant.sign, lunarCycle, aspectSummaryText]),
    true
  )


  const lunarEventsEnabled = Boolean(lunarCycle?.newMoon || lunarCycle?.fullMoon)
  const { text: lunarEventsJson } = useAiCard(
    `sarita_ai_lunar_v2_${language}_${monthKey}_${lunarCycle?.newMoon?.sign}_${lunarCycle?.newMoon?.house}_${lunarCycle?.fullMoon?.sign}_${lunarCycle?.fullMoon?.house}`,
    useCallback(async () => {
      const resp = await fetch(`${API_BASE_URL}/api/ai/lunar-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          language,
          sun: sun ? `${sun.sign} Casa ${sun.house}` : null,
          moon: moon ? `${moon.sign} Casa ${moon.house}` : null,
          ascendant: positions.ascendant.sign,
          lunarNew: lunarCycle?.newMoon ? { sign: lunarCycle.newMoon.sign, house: lunarCycle.newMoon.house, area: lunarCycle.newMoon.area } : null,
          lunarFull: lunarCycle?.fullMoon ? { sign: lunarCycle.fullMoon.sign, house: lunarCycle.fullMoon.house, area: lunarCycle.fullMoon.area } : null,
        }),
      })
      const data = await resp.json()
      return JSON.stringify({ lunarNewText: data.lunarNewText ?? null, lunarFullText: data.lunarFullText ?? null })
    }, [name, language, sun, moon, positions.ascendant.sign, lunarCycle]),
    lunarEventsEnabled
  )

  const lunarEventsData = useMemo<{ lunarNewText: string | null; lunarFullText: string | null } | null>(() => {
    if (!lunarEventsJson) return null
    try { return JSON.parse(lunarEventsJson) } catch { return null }
  }, [lunarEventsJson])

  const strongestTransitAspects = useMemo(
    () => getStrongestTransitAspects(positions, transitChart)
      .filter((aspect) => aspect.name !== 'Sext')
      .sort((a, b) => {
        const priorityDiff = getTransitPriority(a.transitPlanet.name) - getTransitPriority(b.transitPlanet.name)
        if (priorityDiff !== 0) return priorityDiff
        return a.orb - b.orb
      }),
    [positions, transitChart]
  )

  const transitAdviceEnabled = strongestTransitAspects.length > 0
  const { text: transitAdviceJson } = useAiCard(
    `sarita_ai_transits_v4_${language}_${monthKey}_${transitChart?.date ?? 'nodate'}_${strongestTransitAspects.slice(0, 5).map((a) => `${a.transitPlanet.name}-${a.name}-${a.natalPlanet.name}`).join('_')}`,
    useCallback(async () => {
      const transits = strongestTransitAspects.slice(0, 5).map((a) => ({
        transitPlanet: a.transitPlanet.name,
        aspectType: a.name,
        natalPlanet: a.natalPlanet.name,
        house: a.transitPlanet.house,
      }))
      const resp = await fetch(`${API_BASE_URL}/api/ai/transit-aspects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          language,
          sun: sun ? `${sun.sign} Casa ${sun.house}` : null,
          moon: moon ? `${moon.sign} Casa ${moon.house}` : null,
          ascendant: positions.ascendant.sign,
          transits,
        }),
      })
      const data = await resp.json()
      return JSON.stringify(data.advice ?? {})
    }, [name, language, sun, moon, positions.ascendant.sign, strongestTransitAspects]),
    transitAdviceEnabled
  )

  const transitAdviceMap = useMemo<Record<string, string> | null>(() => {
    if (!transitAdviceJson) return null
    try { return JSON.parse(transitAdviceJson) } catch { return null }
  }, [transitAdviceJson])

  return (
    <ScrollView contentContainerStyle={styles.tabScroll} showsVerticalScrollIndicator={false}>
      <View style={[styles.heroCard, { borderColor: tone }]}>
        <Text style={[styles.heroEyebrow, { color: tone }]}>ESTE MES</Text>
        <Text style={styles.heroTitle}>{name}, esto es lo que se mueve ahora</Text>
        <Text style={styles.heroText}>
          Esta lectura se renueva cada mes. Todo lo que ves aquí está calculado para el momento actual — los tránsitos, las lunas y los focos cambian.
        </Text>
      </View>

      {(monthText || monthLoading || monthError) ? (
        <View style={[styles.aiInsightCard, { borderColor: colors.gold }]}>
          <Text style={[styles.aiInsightEyebrow, { color: colors.gold }]}>{t('results.monthInClear')}</Text>
          <Text style={styles.aiInsightTitle}>{name}, esto es lo que se mueve este mes</Text>
          {monthLoading && !monthText ? (
            <Text style={styles.aiInsightLoading}>{t('results.generatingMonth')}</Text>
          ) : monthError && !monthText ? (
            <Text style={styles.aiInsightLoading}>{getAiUnavailableMessage('tu lectura del mes')}</Text>
          ) : (
            <Text style={styles.aiInsightText}>{monthText}</Text>
          )}
        </View>
      ) : null}

      {(lifeAreas || lifeAreasLoading || lifeAreasError) ? (
        <>
          <SectionHeader title={t('results.areasTitle')} />
          <HorizontalCarousel>
            {([
              { key: 'love', title: t('results.love'), color: '#F472B6', bg: 'rgba(180,40,80,0.18)', border: 'rgba(244,114,182,0.45)' },
              { key: 'finance', title: t('results.finance'), color: colors.neonGold, bg: 'rgba(100,160,60,0.15)', border: 'rgba(180,220,80,0.35)' },
              { key: 'health', title: t('results.health'), color: colors.earth, bg: 'rgba(40,120,60,0.18)', border: 'rgba(92,184,112,0.40)' },
            ] as const).map((item) => (
              <View key={item.key} style={[styles.infoCard, { backgroundColor: item.bg, borderColor: item.border }]}>
                <Text style={[styles.infoTitle, { color: item.color }]}>{item.title}</Text>
                <Text style={styles.bodyText}>
                  {lifeAreasLoading && !lifeAreas
                    ? t('results.generatingAreas')
                    : lifeAreasError && !lifeAreas
                      ? getAiUnavailableMessage(item.title.toLowerCase())
                      : lifeAreas?.[item.key] ?? ''}
                </Text>
              </View>
            ))}
          </HorizontalCarousel>
        </>
      ) : null}

      <SectionHeader title="GUIA LUNAR DEL MES" />
      <LunarTabCard
        lunarCycle={lunarCycle}
        lunarEventsData={lunarEventsData}
        actions={actions}
        ritual={ritual}
        newMoonRoutine={newMoonRoutine}
        fullMoonRoutine={fullMoonRoutine}
      />

      {transitChart?.planets?.length ? (
        <>
          <SectionHeader title="TRANSITOS DEL MES" />
          {strongestTransitAspects.length > 0
            ? <TransitChipGrid aspects={strongestTransitAspects.slice(0, 5)} transitAdviceMap={transitAdviceMap} />
            : <View style={styles.contentCard}><Text style={styles.bodyText}>Tus transitos destacados apareceran aqui.</Text></View>
          }
          {strongestTransitAspects.length ? (
            <View style={[styles.contentCard, { marginTop: 0 }]}>
              <Text style={styles.transitClosingLabel}>CONSEJO GENERAL</Text>
              <Text style={styles.profileHint}>{buildTransitClosingAdvice(strongestTransitAspects)}</Text>
            </View>
          ) : null}
        </>
      ) : null}

      {retrogrades && retrogrades.length > 0 ? (
        <View style={styles.contentCard}>
          <Text style={styles.infoTitle}>Retrógrados activos</Text>
          <View style={styles.retrogradeGrid}>
            {retrogrades.map((item) => (
              <View key={`${item.name}-${item.startDate}`} style={styles.retrogradePill}>
                <View style={styles.retrogradePillTop}>
                  <AstroGlyph glyph={getAstronomiconPlanetGlyph(item.name)} size={20} color={colors.goldLight} />
                  <Text style={styles.retrogradePillName}>{displayPlanetName(item.name)} Rx</Text>
                </View>
                <Text style={styles.retrogradePillDate}>{item.formattedStart} – {item.formattedEnd}</Text>
                <Text style={styles.retrogradePillMsg}>{item.message}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.contentCard}>
        <SectionHeader title="SECUENCIA DE YOGA INTEGRADA" />
        <View style={styles.infoPillRow}>
          <View style={styles.infoPill}>
            <Text style={styles.infoPillLabel}>Chakra</Text>
            <Text style={styles.infoPillValue}>{cleanText(routine.chakra)}</Text>
          </View>
          <View style={styles.infoPill}>
            <Text style={styles.infoPillLabel}>Mantra</Text>
            <Text style={styles.infoPillValue}>{cleanText(routine.mantra)}</Text>
          </View>
        </View>

        {routine.sequence.map((item, index) => (
          <PoseAccordion
            key={item.pose}
            index={index}
            item={item}
            tone={tone}
            expanded={expandedPose === index}
            onPreview={setPreview}
            onToggle={() => setExpandedPose((current) => current === index ? null : index)}
          />
        ))}
      </View>

      <Modal visible={preview !== null} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <Pressable style={styles.previewOverlay} onPress={() => setPreview(null)}>
          <Pressable style={styles.previewCard} onPress={() => {}}>
            <TouchableOpacity style={styles.previewCloseButton} onPress={() => setPreview(null)} activeOpacity={0.8}>
              <Text style={styles.previewCloseText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.previewTitle}>{preview?.pose}</Text>
            {preview ? (
              <Image source={preview.image} style={styles.previewImage} contentFit="contain" contentPosition="center" />
            ) : null}
            <Text style={styles.previewHint}>Pulsa la X o toca fuera de la imagen para cerrar</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  )
}
function PremiumTab({ name, positions, natalReading, natalLoading }: { name: string; positions: WheelPositions; natalReading: NatalReading | null; natalLoading: boolean }) {
  const socials = SOCIAL_PLANETS.map((planetName) => getPlanet(positions, planetName)).filter(Boolean) as WheelPositions['planets']
  const transpersonals = TRANSPERSONAL_PLANETS.map((planetName) => getPlanet(positions, planetName)).filter(Boolean) as WheelPositions['planets']
  const northNode = getPlanet(positions, 'Nodo Norte')
  const southNode = getPlanet(positions, 'Nodo Sur')
  const lilith = getPlanet(positions, 'Black Moon Natural')
  const chiron = getPlanet(positions, 'Quirón')

  return (
    <ScrollView contentContainerStyle={styles.tabScroll} showsVerticalScrollIndicator={false}>
      <View style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>PROFUNDO</Text>
        <Text style={styles.heroTitle}>{name}, tus capas más lentas</Text>
        <Text style={styles.heroText}>
          Estos ciclos se miden en años, no en meses. No cambian con frecuencia, pero cuando lo hacen, lo cambian todo. Úsalos para entender tus patrones más profundos.
        </Text>
      </View>

      <SectionHeader title="PLANETAS SOCIALES" />
      <PlanetSelectorGrid
        planets={socials}
        positions={positions}
        natalReading={natalReading}
        natalLoading={natalLoading}
        aspectDescMap={null}
        aspectsLoading={false}
        aspectsError={false}
      />

      <SectionHeader title="PLANETAS TRANSPERSONALES" />
      <HorizontalCarousel>
        {transpersonals.map((planet) => (
          <View key={`trans-${planet.name}`} style={styles.infoCard}>
            <View style={styles.transpersonalHeader}>
              <AstroGlyph glyph={getAstronomiconPlanetGlyph(planet.name)} size={28} color={colors.silver} />
              <View>
                <Text style={styles.infoTitle}>{displayPlanetName(planet.name)}</Text>
                <Text style={styles.profileHint}>{planet.sign} · Casa {planet.house}</Text>
              </View>
            </View>
            <Text style={styles.bodyText}>
              {natalReading?.planets?.[normalizeTitle(planet.name)] ?? (natalLoading ? '...' : describeTranspersonalPlanet(planet))}
            </Text>
          </View>
        ))}
      </HorizontalCarousel>

      <SectionHeader title="PUNTOS ESPECIALES" />
      <HorizontalCarousel>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Nodos — tu misión evolutiva</Text>
          <Text style={styles.bodyText}>
            {natalReading?.special?.nodos ?? (natalLoading ? '...' : describeNodeAxis(northNode, southNode))}
          </Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Lilith — lo instintivo</Text>
          <Text style={styles.bodyText}>
            {natalReading?.special?.lilith ?? (natalLoading ? '...' : describeLilith(lilith))}
          </Text>
          {lilith ? <Text style={styles.profileHint}>{formatDegree(lilith.degree, lilith.minutes)} {lilith.sign} · Casa {lilith.house}</Text> : null}
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Quirón — tu herida y tu don</Text>
          <Text style={styles.bodyText}>
            {natalReading?.special?.quiron ?? (natalLoading ? '...' : describeChiron(chiron))}
          </Text>
          {chiron ? <Text style={styles.profileHint}>{formatDegree(chiron.degree, chiron.minutes)} {chiron.sign} · Casa {chiron.house}</Text> : null}
        </View>
      </HorizontalCarousel>

      <View style={styles.contentCard}>
        <Text style={styles.infoTitle}>Consulta 15 min con Sarita</Text>
        <View style={styles.bookingIntro}>
          <Image source={SARITA_PORTRAIT} style={styles.bookingPortrait} contentFit="cover" />
          <View style={styles.bookingIntroBody}>
            <Text style={styles.bodyText}>
              Si quieres profundizar esto con Sarita, aqui puedes reservar tu llamada y ponerle cara a quien te acompana.
            </Text>
            <Text style={styles.profileHint}>
              Un espacio corto y claro para aterrizar tu lectura, hacer preguntas y salir con direccion.
            </Text>
          </View>
        </View>
        <Text style={styles.bodyText}>
          Cuando toques el boton, se abrira directamente su agenda para que elijas el mejor horario.
        </Text>
        <TouchableOpacity
          style={[styles.profilePrimaryButton, !BOOKING_URL && styles.bookingButtonDisabled]}
          activeOpacity={BOOKING_URL ? 0.9 : 1}
          disabled={!BOOKING_URL}
          onPress={() => {
            if (BOOKING_URL) Linking.openURL(BOOKING_URL)
          }}
        >
          <Text style={styles.profilePrimaryButtonText}>RESERVAR CON SARITA</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

function ProfileTab({
  bundle,
  positions,
  onProfileSaved,
  onRegenerate,
}: {
  bundle: SavedReadingBundle
  positions: WheelPositions
  onProfileSaved: (profile: SavedProfile) => void
  onRegenerate: () => void
}) {
  const { t, i18n } = useTranslation()
  const triad = useMemo(() => getTriad(positions), [positions])
  const elementProfile = useMemo(() => describeElementProfile(positions), [positions])
  const modalityProfile = useMemo(() => describeModalityProfile(positions), [positions])
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<SavedProfile>(bundle.profile)

  useEffect(() => {
    setDraft(bundle.profile)
  }, [bundle])

  const placeParts = (draft.location ?? '').split(',').map((item) => item.trim()).filter(Boolean)
  const city = placeParts[0] ?? ''
  const country = placeParts[placeParts.length - 1] ?? ''

  const saveDraft = async () => {
    const nextProfile: SavedProfile = {
      ...bundle.profile,
      ...draft,
      location: [city, country].filter(Boolean).join(', '),
      language: (i18n.language.slice(0, 2) as SupportedLanguage) || draft.language || 'en',
    }
    await saveProfile(nextProfile)
    await saveLanguage(nextProfile.language)
    await setAppLanguage(nextProfile.language)
    onProfileSaved(nextProfile)
    setEditing(false)

    const birthChanged =
      nextProfile.name !== bundle.profile.name
      || nextProfile.day !== bundle.profile.day
      || nextProfile.month !== bundle.profile.month
      || nextProfile.year !== bundle.profile.year
      || nextProfile.hour !== bundle.profile.hour
      || nextProfile.minute !== bundle.profile.minute
      || nextProfile.location !== bundle.profile.location

    if (birthChanged) {
      Alert.alert(
        t('results.profileChangedTitle'),
        t('results.profileChangedMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.generateNewReading'), onPress: onRegenerate },
        ]
      )
      return
    }

    Alert.alert(t('tabs.profile'), t('results.profileSaved'))
  }

  const updateCity = (value: string) => {
    const nextParts = [value, country].filter(Boolean)
    setDraft((current) => ({ ...current, location: nextParts.join(', ') }))
  }

  const updateCountry = (value: string) => {
    const nextParts = [city, value].filter(Boolean)
    setDraft((current) => ({ ...current, location: nextParts.join(', ') }))
  }

  return (
    <ScrollView contentContainerStyle={styles.tabScroll} showsVerticalScrollIndicator={false}>
      <View style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>{t('tabs.profile')}</Text>
        <Text style={styles.heroTitle}>{bundle.profile.name}</Text>
        <Text style={styles.heroText}>{t('profile.birthData')}</Text>
      </View>

      <View style={styles.contentCard}>
        <Text style={styles.infoTitle}>{t('profile.birthData')}</Text>
        <View style={styles.profileFieldGrid}>
          <View style={styles.profileFieldCard}>
            <Text style={styles.profileFieldLabel}>{t('profile.name')}</Text>
            {editing ? (
              <TextInput style={styles.profileInput} value={draft.name} onChangeText={(value) => setDraft((current) => ({ ...current, name: value }))} />
            ) : (
              <Text style={styles.bodyText}>{draft.name}</Text>
            )}
          </View>
          <View style={styles.profileFieldCard}>
            <Text style={styles.profileFieldLabel}>{t('profile.birthDate')}</Text>
            {editing ? (
              <TextInput
                style={styles.profileInput}
                value={`${draft.year}-${String(Number(draft.month) + 1).padStart(2, '0')}-${String(draft.day).padStart(2, '0')}`}
                onChangeText={(value) => {
                  const [year = draft.year, month = String(Number(draft.month) + 1), day = draft.day] = value.split('-')
                  setDraft((current) => ({ ...current, year, month: String(Math.max(1, Number(month)) - 1), day }))
                }}
              />
            ) : (
              <Text style={styles.bodyText}>{`${draft.year}-${String(Number(draft.month) + 1).padStart(2, '0')}-${String(draft.day).padStart(2, '0')}`}</Text>
            )}
          </View>
          <View style={styles.profileFieldCard}>
            <Text style={styles.profileFieldLabel}>{t('profile.birthTime')}</Text>
            {editing ? (
              <TextInput
                style={styles.profileInput}
                value={draft.hour ? `${String(draft.hour).padStart(2, '0')}:${String(draft.minute ?? 0).padStart(2, '0')}` : ''}
                onChangeText={(value) => {
                  const [hour = '', minute = ''] = value.split(':')
                  setDraft((current) => ({ ...current, hour, minute }))
                }}
              />
            ) : (
              <Text style={styles.bodyText}>{draft.hour ? `${String(draft.hour).padStart(2, '0')}:${String(draft.minute ?? 0).padStart(2, '0')}` : t('results.unknownTime')}</Text>
            )}
          </View>
          <View style={styles.profileFieldCard}>
            <Text style={styles.profileFieldLabel}>{t('profile.birthCity')}</Text>
            {editing ? (
              <TextInput style={styles.profileInput} value={city} onChangeText={updateCity} />
            ) : (
              <Text style={styles.bodyText}>{city}</Text>
            )}
          </View>
          <View style={styles.profileFieldCard}>
            <Text style={styles.profileFieldLabel}>{t('profile.birthCountry')}</Text>
            {editing ? (
              <TextInput style={styles.profileInput} value={country} onChangeText={updateCountry} />
            ) : (
              <Text style={styles.bodyText}>{country}</Text>
            )}
          </View>
        </View>
      </View>

      <SectionHeader title={t('profile.bigThree')} />
      <View style={styles.keyPlanetRow}>
        {triad.sun ? <KeyPlanetCard title="Sol" planet={triad.sun} /> : null}
        {triad.moon ? <KeyPlanetCard title="Luna" planet={triad.moon} /> : null}
        <View style={[styles.keyPlanetCard, { borderColor: colors.goldLight }]}>
          <Text style={styles.keyPlanetLabel}>Ascendente</Text>
          <AstroGlyph glyph="c" size={26} color={colors.goldLight} style={styles.keyPlanetGlyph} />
          <Text style={styles.keyPlanetValue}>{triad.rising.sign}</Text>
          <View style={styles.signMetaRow}>
            <AstroGlyph glyph={getAstronomiconSignGlyph(triad.rising.sign)} size={14} color={colors.goldLight} />
            <Text style={styles.keyPlanetMeta}>{formatDegree(triad.rising.degree, triad.rising.minutes)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.profileBadgeRow}>
        <View style={styles.profileBadge}>
          <Text style={styles.profileBadgeLabel}>{t('profile.dominantElement')}</Text>
          <Text style={styles.profileBadgeValue}>{ELEMENT_LABELS[elementProfile.dominant]}</Text>
        </View>
        <View style={styles.profileBadge}>
          <Text style={styles.profileBadgeLabel}>{t('profile.dominantModality')}</Text>
          <Text style={styles.profileBadgeValue}>{MODALITY_LABELS[modalityProfile.dominant]}</Text>
        </View>
      </View>

      <View style={styles.contentCard}>
        <LanguageSwitcher onChange={(language) => setDraft((current) => ({ ...current, language }))} />
      </View>

      <TouchableOpacity
        style={styles.profileSecondaryButton}
        activeOpacity={0.88}
        onPress={() => {
          if (editing) {
            setDraft(bundle.profile)
            setEditing(false)
            return
          }
          setEditing(true)
        }}
      >
        <Text style={styles.profileSecondaryButtonText}>{editing ? t('common.cancel') : t('common.editProfile')}</Text>
      </TouchableOpacity>

      {editing ? (
        <TouchableOpacity style={styles.profilePrimaryButton} activeOpacity={0.9} onPress={saveDraft}>
          <Text style={styles.profilePrimaryButtonText}>{t('common.save')}</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  )
}

export default function ResultsScreen() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const params = useLocalSearchParams<{
    name: string
    day: string
    month: string
    year: string
    hour: string
    minute: string
    location: string
    lat: string
    lon: string
    language: string
    readingMonth: string
    interpretation: string
    positionsJson: string
  }>()

  const [activeTab, setActiveTab] = useState(0)
  const [savedBundle, setSavedBundle] = useState<SavedReadingBundle | null>(null)
  const [isHydrating, setIsHydrating] = useState(true)
  const screenOpacity = useRef(new Animated.Value(0)).current
  const tabOpacity = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.timing(screenOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start()
  }, [screenOpacity])

  useEffect(() => {
    let alive = true
    loadLatestReading()
      .then((bundle) => {
        if (!alive) return
        setSavedBundle(bundle)
        setIsHydrating(false)
      })
      .catch(() => {
        if (!alive) return
        setIsHydrating(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const switchTab = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    Animated.timing(tabOpacity, { toValue: 0, duration: 90, useNativeDriver: true }).start(() => {
      setActiveTab(index)
      Animated.timing(tabOpacity, { toValue: 1, duration: 180, useNativeDriver: true }).start()
    })
  }

  const hasRouteReading = Boolean(params.interpretation && params.positionsJson)
  const activeBundle = useMemo(() => {
    if (hasRouteReading) {
      return {
        profile: {
          name: cleanText(params.name),
          day: String(params.day ?? ''),
          month: String(params.month ?? ''),
          year: String(params.year ?? ''),
          hour: String(params.hour ?? ''),
          minute: String(params.minute ?? ''),
          location: cleanText(params.location),
          lat: String(params.lat ?? ''),
          lon: String(params.lon ?? ''),
          language: ((params.language as SupportedLanguage | undefined) ?? detectDeviceLanguage()),
        },
        interpretation: String(params.interpretation ?? ''),
        positionsJson: String(params.positionsJson ?? ''),
        monthKey: String(params.readingMonth ?? ''),
        createdAt: new Date().toISOString(),
      } as SavedReadingBundle
    }
    return savedBundle
  }, [hasRouteReading, params.day, params.hour, params.interpretation, params.language, params.lat, params.location, params.lon, params.minute, params.month, params.name, params.positionsJson, params.readingMonth, params.year, savedBundle])

  const chartPayload = parseChartPayload(activeBundle?.positionsJson)
  const positions: WheelPositions = {
    ascendant: chartPayload.ascendant,
    mc: chartPayload.mc,
    planets: chartPayload.planets,
  }
  const lunarCycle = chartPayload.lunarCycle
  const transitChart = chartPayload.transitChart
  const retrogrades = chartPayload.retrogrades
  const sections = useMemo(() => parseReadingSections(activeBundle?.interpretation ?? ''), [activeBundle?.interpretation])
  const name = cleanText(activeBundle?.profile.name) || 'Desconocido'

  const natalAspectPairs = useMemo(() => {
    if (!positions.planets.length) return []
    const allAspects = getFilteredAspects(positions)
    return allAspects.slice(0, 15).map((a) => ({
      from: a.from.name,
      to: a.to.name,
      type: a.name,
      orb: a.orb,
    }))
  }, [positions])

  const natalCacheKey = useMemo(() => {
    const lang = activeBundle?.profile.language ?? 'es'
    const sig = positions.planets.slice(0, 10).map((p) => `${p.name[0]}${p.sign}${p.house}`).join('')
    return `sarita_ai_natal_v4_${lang}_${positions.ascendant.sign}_${sig}`
  }, [activeBundle?.profile.language, positions])

  const { reading: natalReading, loading: natalLoading } = useNatalReading(
    natalCacheKey,
    useCallback(async () => {
      if (!positions.planets.length) return null
      const elemDist = getElementDistribution(positions)
      const modalDist = getModalityDistribution(positions)
      const elemSummary = getDominantKey(elemDist.counts, ELEMENT_ORDER)
      const modalSummary = getDominantKey(modalDist.counts, ['cardinal', 'fixed', 'mutable'] as const)
      const resp = await fetch(`${API_BASE_URL}/api/ai/natal-reading`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          language: activeBundle?.profile.language ?? 'es',
          planets: positions.planets.map((p) => ({ name: p.name, sign: p.sign, house: p.house, degree: p.degree })),
          ascendant: positions.ascendant.sign,
          mc: positions.mc?.sign ?? '',
          aspects: natalAspectPairs,
          elementCounts: elemDist.counts,
          modalityCounts: modalDist.counts,
          dominantElement: ELEMENT_LABELS[elemSummary.top],
          dominantModality: MODALITY_LABELS[modalSummary.top],
        }),
      })
      const data = await resp.json()
      return data.reading ?? null
    }, [name, activeBundle?.profile.language, positions, natalAspectPairs]),
    Boolean(activeBundle && positions.planets.length)
  )

  const _sun = getPlanet(positions, 'Sol')
  const _moon = getPlanet(positions, 'Luna')
  const _language = activeBundle?.profile.language ?? 'es'
  const _monthKey = activeBundle?.monthKey ?? ''
  const _lunarEventsEnabled = Boolean(lunarCycle?.newMoon || lunarCycle?.fullMoon)
  const { text: _lunarEventsJson } = useAiCard(
    `sarita_ai_lunar_v2_${_language}_${_monthKey}_${lunarCycle?.newMoon?.sign}_${lunarCycle?.newMoon?.house}_${lunarCycle?.fullMoon?.sign}_${lunarCycle?.fullMoon?.house}`,
    useCallback(async () => {
      const resp = await fetch(`${API_BASE_URL}/api/ai/lunar-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          language: _language,
          sun: _sun ? `${_sun.sign} Casa ${_sun.house}` : null,
          moon: _moon ? `${_moon.sign} Casa ${_moon.house}` : null,
          ascendant: positions.ascendant.sign,
          lunarNew: lunarCycle?.newMoon ? { sign: lunarCycle.newMoon.sign, house: lunarCycle.newMoon.house, area: lunarCycle.newMoon.area } : null,
          lunarFull: lunarCycle?.fullMoon ? { sign: lunarCycle.fullMoon.sign, house: lunarCycle.fullMoon.house, area: lunarCycle.fullMoon.area } : null,
        }),
      })
      const data = await resp.json()
      return JSON.stringify({ lunarNewText: data.lunarNewText ?? null, lunarFullText: data.lunarFullText ?? null })
    }, [name, _language, _sun, _moon, positions.ascendant.sign, lunarCycle]),
    _lunarEventsEnabled
  )
  const lunarEventsData = useMemo<{ lunarNewText: string | null; lunarFullText: string | null } | null>(() => {
    if (!_lunarEventsJson) return null
    try { return JSON.parse(_lunarEventsJson) } catch { return null }
  }, [_lunarEventsJson])

  const formattedDate = [
    activeBundle?.profile.year,
    String(Number(activeBundle?.profile.month ?? 0) + 1).padStart(2, '0'),
    String(activeBundle?.profile.day ?? 1).padStart(2, '0'),
  ].join('-')
  const formattedTime = activeBundle?.profile.hour
    ? `${String(activeBundle.profile.hour).padStart(2, '0')}:${String(activeBundle.profile.minute ?? 0).padStart(2, '0')}`
    : t('results.unknownTime')
  const place = cleanText((activeBundle?.profile.location ?? '').split(',').slice(0, 2).map((item) => item.trim()).join(', '))

  useEffect(() => {
    const language = (activeBundle?.profile.language as SupportedLanguage | undefined) ?? detectDeviceLanguage()
    setAppLanguage(language)
  }, [activeBundle?.profile.language])

  if (isHydrating) {
    return (
      <View style={[styles.root, styles.centerState]}>
        <CosmicBackdrop variant="reading" />
        <Text style={styles.stateText}>{t('results.loadingSaved')}</Text>
      </View>
    )
  }

  if (!activeBundle) {
    return (
      <View style={[styles.root, styles.centerState]}>
        <CosmicBackdrop variant="reading" />
        <Text style={styles.stateText}>{t('results.noSaved')}</Text>
        <TouchableOpacity style={styles.profilePrimaryButton} onPress={() => router.replace('/form?reset=1')} activeOpacity={0.9}>
          <Text style={styles.profilePrimaryButtonText}>{t('results.createChart')}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <Animated.View style={[styles.root, { opacity: screenOpacity }]}>
      <CosmicBackdrop variant="reading" />
      <View style={styles.resultsSoundWrap}>
        <SoundToggleButton />
      </View>

      <View style={styles.header}>
        <Text style={styles.headerEyebrow}>SARITA</Text>
        <ShimmerText style={styles.headerName}>{name}</ShimmerText>
        <Text style={styles.headerSubtitle} numberOfLines={2}>
          {t('results.headerFor', { date: formattedDate, time: formattedTime, place })}
        </Text>
      </View>

      <Animated.View style={[styles.contentWrap, { opacity: tabOpacity }]}>
        {activeTab === 0 && <FreeTab name={name} positions={positions} sections={sections} monthKey={activeBundle?.monthKey ?? ''} language={activeBundle.profile.language} natalReading={natalReading} natalLoading={natalLoading} />}
        {activeTab === 1 && <GuideLunarTab name={name} positions={positions} sections={sections} lunarCycle={lunarCycle} transitChart={transitChart} retrogrades={retrogrades} monthKey={activeBundle?.monthKey ?? ''} language={activeBundle.profile.language} natalReading={natalReading} natalLoading={natalLoading} />}
        {activeTab === 2 && <PremiumTab name={name} positions={positions} natalReading={natalReading} natalLoading={natalLoading} />}
        {activeTab === 3 && (
          <ProfileTab
            bundle={activeBundle}
            positions={positions}
            onProfileSaved={(profile) => {
              setSavedBundle((current) => current ? { ...current, profile } : current)
              setAppLanguage(profile.language)
              i18n.changeLanguage(profile.language)
            }}
            onRegenerate={() => router.replace('/form?reset=1')}
          />
        )}
      </Animated.View>

      <View style={styles.tabBar}>
        {TABS.map((tab, index) => {
          const active = activeTab === index
          return (
            <CosmicTabButton
              key={`${index}-${tab.glyph}`}
              active={active}
              glyph={tab.glyph}
              label={t(['tabs.chart', 'tabs.moment', 'tabs.beyond', 'tabs.profile'][index])}
              onPress={() => switchTab(index)}
            />
          )
        })}
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.backgroundDeep,
  },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  stateText: {
    color: colors.goldLight,
    fontSize: 22,
    lineHeight: 30,
    textAlign: 'center',
    fontFamily: typography.display,
    marginBottom: 18,
  },
  header: {
    paddingTop: 58,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  headerEyebrow: {
    color: colors.gold,
    fontSize: 10,
    letterSpacing: 4,
    marginBottom: 6,
    fontFamily: typography.bodyMedium,
  },
  headerName: {
    color: colors.goldLight,
    fontSize: 34,
    lineHeight: 38,
    fontFamily: typography.displayLight,
    letterSpacing: 5.2,
    marginBottom: 8,
    textShadowColor: 'rgba(247,212,114,0.65)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  headerSubtitle: {
    color: colors.whiteSubtle,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: typography.body,
    textShadowColor: 'rgba(0,0,0,0.32)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
  },
  resultsSoundWrap: {
    position: 'absolute',
    top: 54,
    right: 24,
    zIndex: 30,
  },
  contentWrap: {
    flex: 1,
  },
  tabScroll: {
    padding: 20,
    paddingBottom: 34,
  },
  wheelScroll: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingBottom: 26,
  },
  heroCard: {
    backgroundColor: 'rgba(10, 5, 32, 0.82)',
    borderWidth: 1.5,
    borderColor: 'rgba(140,100,255,0.55)',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  heroEyebrow: {
    color: colors.gold,
    fontSize: 11,
    fontFamily: typography.bodyMedium,
    letterSpacing: 3.2,
    marginBottom: 10,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(234,184,78,0.7)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  heroTitle: {
    color: colors.goldLight,
    fontSize: 28,
    lineHeight: 34,
    fontFamily: typography.displayLight,
    marginBottom: 10,
    textShadowColor: 'rgba(247,212,114,0.55)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  heroText: {
    color: colors.white,
    fontSize: 16,
    lineHeight: 26,
    fontFamily: typography.body,
  },
  heroSubtext: {
    color: colors.whiteSubtle,
    fontSize: 15,
    lineHeight: 24,
    marginTop: 10,
    fontFamily: typography.body,
  },
  introBlock: {
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  introEyebrow: {
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 3,
    marginBottom: 8,
    fontFamily: typography.bodyMedium,
    textShadowColor: 'rgba(234,184,78,0.7)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  introTitle: {
    color: colors.goldLight,
    fontSize: 28,
    lineHeight: 34,
    fontFamily: typography.displayLight,
    marginBottom: 10,
    textShadowColor: 'rgba(247,212,114,0.55)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  introText: {
    color: colors.whiteSubtle,
    fontSize: 16,
    lineHeight: 26,
    fontFamily: typography.body,
  },
  keyPlanetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  keyPlanetCard: {
    width: '31.5%',
    backgroundColor: 'rgba(10, 5, 32, 0.80)',
    borderWidth: 1.5,
    borderColor: 'rgba(140,100,255,0.50)',
    borderRadius: 18,
    padding: 12,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  keyPlanetLabel: {
    color: colors.whiteMuted,
    fontSize: 10,
    marginBottom: 8,
    letterSpacing: 1.2,
    fontFamily: typography.bodyMedium,
  },
  keyPlanetGlyph: {
    fontSize: 22,
    marginBottom: 10,
  },
  keyPlanetValue: {
    color: colors.white,
    fontSize: 13,
    fontFamily: typography.displaySemiBold,
    marginBottom: 3,
  },
  keyPlanetMeta: {
    color: colors.whiteSubtle,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: typography.body,
  },
  signMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  sectionLabel: {
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 3,
    marginBottom: 12,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(234,184,78,0.65)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 7,
  },
  contentCard: {
    backgroundColor: 'rgba(10, 5, 32, 0.82)',
    borderWidth: 1.5,
    borderColor: 'rgba(140,100,255,0.55)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  infoCard: {
    flex: 1,
    backgroundColor: 'rgba(10, 5, 32, 0.82)',
    borderWidth: 1.5,
    borderColor: 'rgba(140,100,255,0.55)',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  infoTitle: {
    color: colors.goldLight,
    fontSize: 16,
    fontFamily: typography.displaySemiBold,
    marginBottom: 10,
    textShadowColor: 'rgba(247,212,114,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  lunarCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  bodyText: {
    color: colors.white,
    fontSize: 16,
    lineHeight: 28,
    fontFamily: typography.body,
  },
  inlineBold: {
    color: colors.white,
    fontWeight: '700',
  },
  doubleCardRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bulletDot: {
    color: colors.goldLight,
    fontSize: 16,
    marginRight: 8,
    lineHeight: 24,
  },
  bulletText: {
    flex: 1,
    flexShrink: 1,
    color: colors.white,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: typography.body,
  },
  quoteCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.goldLight,
    backgroundColor: 'rgba(10, 5, 32, 0.82)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(247,212,114,0.45)',
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginTop: 4,
    shadowColor: '#EAB84E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  mantraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  quoteLabel: {
    color: colors.gold,
    fontSize: 10,
    letterSpacing: 2.4,
    fontFamily: typography.bodyMedium,
  },
  infoBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(127,119,221,0.08)',
  },
  infoBadgeText: {
    color: colors.goldLight,
    fontSize: 12,
    fontWeight: '700',
  },
  quoteText: {
    color: colors.goldLight,
    fontSize: 20,
    lineHeight: 30,
    fontFamily: typography.displayLight,
    textShadowColor: 'rgba(247,212,114,0.55)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  mantraNote: {
    color: colors.whiteMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
    fontFamily: typography.body,
  },
  planetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  planetCardSlot: {
    width: '31.5%',
    marginBottom: 10,
  },
  miniPlanetCard: {
    width: '100%',
    backgroundColor: 'rgba(10, 5, 32, 0.80)',
    borderWidth: 1.5,
    borderColor: 'rgba(140,100,255,0.50)',
    borderRadius: 16,
    padding: 10,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.38,
    shadowRadius: 9,
    elevation: 5,
  },
  miniPlanetTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  miniPlanetGlyph: {
    fontSize: 18,
  },
  miniPlanetHouse: {
    color: colors.whiteMuted,
    fontSize: 9,
    fontFamily: typography.body,
  },
  miniPlanetName: {
    color: colors.whiteMuted,
    fontSize: 10,
    marginBottom: 4,
    fontFamily: typography.bodyMedium,
  },
  miniPlanetMeta: {
    color: colors.white,
    fontSize: 10,
    fontFamily: typography.displayMedium,
    lineHeight: 16,
  },
  infoPillRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  infoPill: {
    flex: 1,
    backgroundColor: 'rgba(10, 5, 32, 0.80)',
    borderWidth: 1.5,
    borderColor: 'rgba(140,100,255,0.50)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.38,
    shadowRadius: 9,
    elevation: 5,
  },
  infoPillLabel: {
    color: colors.whiteMuted,
    fontSize: 10,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontFamily: typography.bodyMedium,
  },
  infoPillValue: {
    color: colors.white,
    fontSize: 14,
    fontFamily: typography.displayMedium,
  },
  poseCard: {
    backgroundColor: 'rgba(10, 5, 32, 0.82)',
    borderWidth: 1.5,
    borderColor: 'rgba(140,100,255,0.50)',
    borderRadius: 18,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 7,
  },
  poseVisualWrap: {
    width: 108,
    height: 108,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  poseVisualHalo: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    opacity: 0.95,
  },
  poseImageTap: {
    width: 108,
    height: 108,
    marginRight: 2,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  poseImage: {
    width: 108,
    height: 108,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  poseZoomBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(6, 8, 22, 0.82)',
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  poseZoomBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontFamily: typography.bodyMedium,
  },
  poseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  poseSummary: {
    flex: 1,
  },
  poseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  poseIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  poseIndexText: {
    color: colors.backgroundDeep,
    fontWeight: '700',
    fontSize: 12,
  },
  poseName: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  poseFocus: {
    color: colors.whiteSubtle,
    fontSize: 13,
    lineHeight: 19,
    minHeight: 38,
  },
  poseMetaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  poseMetaPill: {
    flex: 1,
    backgroundColor: 'rgba(127,119,221,0.08)',
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  poseMetaLabel: {
    color: colors.whiteMuted,
    fontSize: 10,
    marginBottom: 3,
    letterSpacing: 0.8,
  },
  poseMetaValue: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  poseToggle: {
    color: colors.goldLight,
    fontSize: 24,
    lineHeight: 24,
    width: 24,
    textAlign: 'center',
  },
  poseDetails: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  poseDetailText: {
    color: colors.whiteSubtle,
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 7,
  },
  poseSectionTitle: {
    color: colors.goldLight,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginTop: 6,
    marginBottom: 6,
  },
  distributionRow: {
    marginBottom: 12,
  },
  distributionLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  distributionTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  distributionFill: {
    height: '100%',
    borderRadius: 999,
  },
  aspectRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  aspectBadge: {
    minWidth: 58,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  aspectBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  aspectBody: {
    flex: 1,
  },
  aspectGroup: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  aspectGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  aspectGroupLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  aspectGroupDesc: {
    color: colors.white,
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 6,
  },
  aspectPairLine: {
    color: colors.whiteSubtle,
    fontSize: 14,
    lineHeight: 22,
  },
  planetMomentCard: {
    position: 'relative',
    overflow: 'hidden',
    paddingTop: 14,
    paddingBottom: 14,
    backgroundColor: 'rgba(10, 5, 32, 0.88)',
    borderColor: 'rgba(140,100,255,0.55)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  planetMomentImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
  },
  planetMomentScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 2, 18, 0.55)',
  },
  planetMomentContent: {
    position: 'relative',
  },
  planetMomentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  planetMomentGlyphWrap: {
    width: 68,
    height: 68,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(232, 201, 122, 0.16)',
    backgroundColor: 'rgba(8, 11, 25, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planetMomentHeaderBody: {
    flex: 1,
  },
  planetMomentTitle: {
    color: colors.goldLight,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '700',
    marginBottom: 9,
  },
  planetMomentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  planetSignBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(232, 201, 122, 0.24)',
    backgroundColor: 'rgba(8, 11, 25, 0.48)',
  },
  planetSignText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  planetHouseText: {
    color: colors.whiteMuted,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  aspectTitle: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  poseDetailLabel: {
    color: colors.white,
    fontWeight: '700',
  },
  relationshipCard: {
    backgroundColor: 'rgba(17, 24, 45, 0.74)',
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  relationshipTitle: {
    color: colors.goldLight,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  lifeAreasGrid: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 10,
    marginBottom: 14,
  },
  lifeAreaCard: {
    flex: 1,
    minHeight: 170,
    padding: 14,
    borderRadius: 18,
    borderWidth: 0.5,
    borderTopColor: 'rgba(200,187,245,0.22)',
    borderLeftColor: 'rgba(127,119,221,0.08)',
    borderRightColor: 'rgba(127,119,221,0.08)',
    borderBottomColor: 'rgba(127,119,221,0.08)',
    backgroundColor: 'rgba(127,119,221,0.08)',
  },
  lifeAreaTitle: {
    fontSize: 15,
    marginBottom: 10,
    fontFamily: typography.displaySemiBold,
  },
  lifeAreaText: {
    color: colors.whiteSubtle,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: typography.body,
  },
  languageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  languageChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  languageChipActive: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(239,215,161,0.12)',
  },
  languageChipText: {
    color: colors.whiteSubtle,
    fontSize: 13,
    fontWeight: '600',
  },
  languageChipTextActive: {
    color: colors.goldLight,
  },
  profileHint: {
    color: colors.whiteSubtle,
    fontSize: 15,
    lineHeight: 23,
    fontFamily: typography.body,
  },
  profileFieldGrid: {
    gap: 10,
  },
  profileFieldCard: {
    backgroundColor: 'rgba(127,119,221,0.08)',
    borderRadius: 16,
    borderWidth: 0.5,
    borderTopColor: 'rgba(200,187,245,0.22)',
    borderLeftColor: 'rgba(127,119,221,0.08)',
    borderRightColor: 'rgba(127,119,221,0.08)',
    borderBottomColor: 'rgba(127,119,221,0.08)',
    padding: 14,
  },
  profileFieldLabel: {
    color: colors.goldLight,
    fontSize: 10,
    letterSpacing: 2.2,
    marginBottom: 8,
    textTransform: 'uppercase',
    fontFamily: typography.bodyMedium,
  },
  profileInput: {
    color: colors.white,
    fontSize: 15,
    paddingVertical: 0,
    fontFamily: typography.body,
  },
  profileBadgeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  profileBadge: {
    flex: 1,
    backgroundColor: 'rgba(127,119,221,0.08)',
    borderRadius: 16,
    borderWidth: 0.5,
    borderTopColor: 'rgba(200,187,245,0.22)',
    borderLeftColor: 'rgba(127,119,221,0.08)',
    borderRightColor: 'rgba(127,119,221,0.08)',
    borderBottomColor: 'rgba(127,119,221,0.08)',
    padding: 14,
  },
  profileBadgeLabel: {
    color: colors.whiteMuted,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
    fontFamily: typography.bodyMedium,
  },
  profileBadgeValue: {
    color: colors.goldLight,
    fontSize: 16,
    fontFamily: typography.displayMedium,
  },
  lockedWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  profileButtonGroup: {
    gap: 12,
    marginTop: 6,
  },
  bookingIntro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  bookingIntroBody: {
    flex: 1,
    gap: 6,
  },
  bookingPortrait: {
    width: 88,
    height: 104,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(239,215,161,0.24)',
    backgroundColor: 'rgba(127,119,221,0.08)',
  },
  profilePrimaryButton: {
    backgroundColor: colors.gold,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  bookingButtonDisabled: {
    opacity: 0.45,
  },
  profilePrimaryButtonText: {
    color: colors.backgroundDeep,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  profileSecondaryButton: {
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 45, 0.62)',
  },
  profileSecondaryButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.2,
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(4, 7, 16, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  previewCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(10, 14, 27, 0.96)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: 18,
    alignItems: 'center',
  },
  previewCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  previewCloseText: {
    color: colors.white,
    fontSize: 24,
    lineHeight: 24,
    fontWeight: '500',
  },
  previewTitle: {
    color: colors.goldLight,
    fontSize: 24,
    lineHeight: 30,
    fontFamily: typography.display,
    textAlign: 'center',
    marginBottom: 14,
  },
  previewImage: {
    width: '100%',
    height: 520,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  previewHint: {
    color: colors.whiteMuted,
    fontSize: 12,
    marginTop: 12,
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    backgroundColor: 'rgba(6, 8, 22, 0.96)',
    paddingTop: 10,
    paddingBottom: 24,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 8,
  },
  tabIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.goldLight,
    position: 'absolute',
    top: 0,
  },
  tabIcon: {
    color: colors.whiteMuted,
    fontSize: 17,
  },
  tabLabel: {
    color: colors.whiteMuted,
    fontSize: 10,
  },
  tabActive: {
    color: colors.goldLight,
  },
  aiInsightCard: {
    backgroundColor: 'rgba(10,5,32,0.88)',
    borderWidth: 1.5,
    borderColor: 'rgba(232,184,75,0.55)',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  aiInsightEyebrow: {
    color: colors.gold,
    fontSize: 10,
    letterSpacing: 3,
    marginBottom: 8,
    textTransform: 'uppercase',
    fontFamily: typography.bodyMedium,
  },
  aiInsightTitle: {
    color: colors.goldLight,
    fontSize: 20,
    lineHeight: 26,
    fontFamily: typography.displayLight,
    marginBottom: 10,
  },
  aiInsightText: {
    color: colors.white,
    fontSize: 15,
    lineHeight: 28,
    fontFamily: typography.body,
  },
  aiInsightLoading: {
    color: colors.whiteMuted,
    fontSize: 14,
    lineHeight: 22,
    fontStyle: 'italic',
    fontFamily: typography.body,
  },
  aspectPairBlock: {
    marginBottom: 6,
  },
  transitClosingCard: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  transitClosingLabel: {
    color: colors.gold,
    fontSize: 10,
    letterSpacing: 2.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  lunarInnerTabRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  lunarInnerTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(140,100,255,0.35)',
    backgroundColor: 'rgba(140,100,255,0.08)',
  },
  lunarInnerTabActive: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(234,184,78,0.12)',
  },
  lunarInnerTabText: {
    color: colors.whiteMuted,
    fontSize: 14,
    fontFamily: typography.bodyMedium,
  },
  lunarInnerTabTextActive: {
    color: colors.goldLight,
  },
  lunarInnerDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginVertical: 16,
  },
  retrogradeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  retrogradePill: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(140,100,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(140,100,255,0.40)',
    borderRadius: 14,
    padding: 12,
  },
  retrogradePillTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  retrogradePillName: {
    color: colors.goldLight,
    fontSize: 14,
    fontFamily: typography.displaySemiBold,
  },
  retrogradePillDate: {
    color: colors.whiteMuted,
    fontSize: 12,
    fontFamily: typography.body,
    marginBottom: 4,
  },
  retrogradePillMsg: {
    color: colors.whiteSubtle,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: typography.body,
  },
  transpersonalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  planetSelectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  planetSelectorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(140,100,255,0.40)',
    backgroundColor: 'rgba(140,100,255,0.08)',
  },
  planetSelectorChipActive: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(234,184,78,0.14)',
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  planetSelectorName: {
    color: colors.whiteSubtle,
    fontSize: 13,
    fontFamily: typography.bodyMedium,
  },
  planetSelectorNameActive: {
    color: colors.goldLight,
  },
  planetSelectorSign: {
    color: colors.whiteMuted,
    fontSize: 11,
    fontFamily: typography.body,
  },
  planetSelectorPanel: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(140,100,255,0.25)',
  },
  planetSelectorPanelHeader: {
    position: 'relative',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 14,
    minHeight: 90,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(10,5,32,0.6)',
  },
  planetSelectorPanelImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
  },
  planetSelectorPanelImageScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6,2,18,0.55)',
  },
  planetSelectorPanelHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    position: 'relative',
    flex: 1,
  },
})
