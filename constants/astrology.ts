export const ASTRO_FONT_FAMILY = 'Astronomicon'

const PLANET_GLYPHS: Record<string, string> = {
  sol: 'Q',
  luna: 'R',
  mercurio: 'S',
  venus: 'T',
  marte: 'U',
  jupiter: 'V',
  saturno: 'W',
  urano: 'X',
  neptuno: 'Y',
  pluton: 'Z',
  'black moon natural': 'z',
  lilith: 'z',
  priapo: 'x',
  priapus: 'x',
  'nodo norte': 'g',
  'nodo sur': 'i',
  quiron: 'q',
}

const SIGN_GLYPHS: Record<string, string> = {
  aries: 'A',
  tauro: 'B',
  geminis: 'C',
  cancer: 'D',
  leo: 'E',
  virgo: 'F',
  libra: 'G',
  escorpio: 'H',
  sagitario: 'I',
  capricornio: 'J',
  acuario: 'K',
  piscis: 'L',
}

const ASPECT_GLYPHS: Record<string, string> = {
  Conj: '!',
  Sext: '%',
  Incon: '&',
  Cuad: '#',
  Trin: '$',
  Opos: '"',
}

const SECTION_GLYPHS: Record<string, string> = {
  'tu carta': 'µ',
  'carta natal': 'µ',
  'mandala natal': 'Q',
  'triada base': 'Q',
  'lunas del mes': 'R',
  'tu momento': 'R',
  'tus planetas este mes': 'Q',
  'guia lunar del mes': 'R',
  'transitos del mes': 'Q',
  'secuencia de yoga integrada': '¶',
  'planetas sociales': 'V',
  'planetas transpersonales': 'X',
  'puntos especiales': '?',
}

const PLANET_QUERY_NAMES: Record<string, string> = {
  sol: 'sun',
  luna: 'moon',
  mercurio: 'mercury',
  venus: 'venus',
  marte: 'mars',
  jupiter: 'jupiter',
  saturno: 'saturn',
  urano: 'uranus',
  neptuno: 'neptune',
  pluton: 'pluto',
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function getAstronomiconPlanetGlyph(name: string) {
  return PLANET_GLYPHS[normalize(name)] ?? 'Q'
}

export function getAstronomiconSignGlyph(sign: string) {
  return SIGN_GLYPHS[normalize(sign)] ?? 'A'
}

export function getAstronomiconAspectGlyph(aspect: string) {
  return ASPECT_GLYPHS[aspect] ?? '!'
}

export function getAstronomiconSectionGlyph(label: string) {
  return SECTION_GLYPHS[normalize(label)] ?? 'µ'
}

export function getNasaPlanetQuery(name: string) {
  return PLANET_QUERY_NAMES[normalize(name)] ?? normalize(name)
}
