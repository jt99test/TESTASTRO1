const path = require('path')
const express = require('express')
const Anthropic = require('@anthropic-ai/sdk')
const swisseph = require('swisseph')
const { zonedTimeToUtc } = require('date-fns-tz')
const tzLookup = require('tz-lookup')

const router = express.Router()
const DEFAULT_READING_MODEL = process.env.ANTHROPIC_READING_MODEL || 'claude-haiku-4-5-20251001'
const READING_MODEL_FALLBACKS = [DEFAULT_READING_MODEL, 'claude-sonnet-4-5-20250929']

function shouldRetryWithFallback(err) {
  return err?.status === 404 || err?.error?.error?.type === 'not_found_error'
}

function createStreamWithFallback(client, payload) {
  let lastError

  for (const model of READING_MODEL_FALLBACKS) {
    try {
      return client.messages.stream({
        ...payload,
        model,
      })
    } catch (err) {
      lastError = err
      if (!shouldRetryWithFallback(err) || model === READING_MODEL_FALLBACKS[READING_MODEL_FALLBACKS.length - 1]) {
        throw err
      }
      console.warn(`Anthropic model unavailable: ${model}. Retrying with fallback model.`)
    }
  }

  throw lastError
}

swisseph.swe_set_ephe_path(path.join(__dirname, '..', 'node_modules', 'swisseph', 'ephe'))

const SIGNS = [
  'Aries', 'Tauro', 'Geminis', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Escorpio', 'Sagitario', 'Capricornio', 'Acuario', 'Piscis',
]

const ELEMENTS = {
  Aries: 'fire', Leo: 'fire', Sagitario: 'fire',
  Tauro: 'earth', Virgo: 'earth', Capricornio: 'earth',
  Geminis: 'air', Libra: 'air', Acuario: 'air',
  Cancer: 'water', Escorpio: 'water', Piscis: 'water',
}

const SWISS_FLAGS = swisseph.SEFLG_SWIEPH | swisseph.SEFLG_SPEED
const HOUSE_SYSTEM = 'P'
const BLACK_MOON_NATURAL_NAME = 'Black Moon Natural'

const PLANET_DEFS = [
  { id: swisseph.SE_SUN, name: 'Sol', glyph: '☉' },
  { id: swisseph.SE_MOON, name: 'Luna', glyph: '☽' },
  { id: swisseph.SE_MERCURY, name: 'Mercurio', glyph: '☿' },
  { id: swisseph.SE_VENUS, name: 'Venus', glyph: '♀' },
  { id: swisseph.SE_MARS, name: 'Marte', glyph: '♂' },
  { id: swisseph.SE_JUPITER, name: 'Jupiter', glyph: '♃' },
  { id: swisseph.SE_SATURN, name: 'Saturno', glyph: '♄' },
  { id: swisseph.SE_URANUS, name: 'Urano', glyph: '♅' },
  { id: swisseph.SE_NEPTUNE, name: 'Neptuno', glyph: '♆' },
  { id: swisseph.SE_PLUTO, name: 'Pluton', glyph: '♇' },
  { id: swisseph.SE_CHIRON, name: 'Quiron', glyph: '⚷' },
]

const MONTH_NAMES_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

const HOUSE_LUNAR_MESSAGES = {
  1: { area: 'Identidad, cuerpo e imagen personal', newMoon: 'Nueva version de ti misma. Es momento de sembrar una forma mas honesta de presentarte al mundo.', fullMoon: 'Toca soltar una identidad, creencia o habito que ya no te representa.' },
  2: { area: 'Recursos, dinero y valor personal', newMoon: 'Se activa una nueva relacion con tus recursos, tu dinero o tu autoestima.', fullMoon: 'Es momento de cerrar apegos materiales o valores que ya no son tuyos.' },
  3: { area: 'Comunicacion, aprendizaje y entorno cercano', newMoon: 'Siembra una nueva conversacion, un proyecto mental o una forma distinta de expresar tu voz.', fullMoon: 'Se pide cerrar una conversacion pendiente o soltar un patron de comunicacion.' },
  4: { area: 'Hogar, familia y raices emocionales', newMoon: 'Se abre una semilla en el hogar, la familia o tu refugio emocional.', fullMoon: 'Es tiempo de soltar una herida familiar o una dinamica del pasado.' },
  5: { area: 'Creatividad, amor, hijos y juego', newMoon: 'Inicia un ciclo creativo o afectivo. Hay espacio para jugar, amar y brillar.', fullMoon: 'Se cierra un romance, un proyecto creativo o un miedo a mostrarte.' },
  6: { area: 'Salud, trabajo cotidiano y rutinas', newMoon: 'Siembra una nueva rutina que ordene tu cuerpo, tu energia o tu servicio.', fullMoon: 'Suelta habitos daninos, perfeccionismo o dinamicas laborales toxicas.' },
  7: { area: 'Relaciones, pareja y alianzas', newMoon: 'Se abre una nueva etapa vincular, una relacion o una colaboracion.', fullMoon: 'Es momento de cerrar una relacion, una dependencia o una sociedad desgastada.' },
  8: { area: 'Transformacion, sexualidad, crisis y poder', newMoon: 'Comienza una transformacion profunda. Algo quiere renacer en ti despues de una crisis.', fullMoon: 'Se pide soltar control, obsesion o miedo al cambio.' },
  9: { area: 'Expansion, estudios, viajes y sentido', newMoon: 'Nace una nueva vision del mundo, un estudio o una busqueda de sentido.', fullMoon: 'Es momento de dejar una creencia limitante o la necesidad de tener siempre razon.' },
  10: { area: 'Vocacion, carrera y reputacion publica', newMoon: 'Se activa una nueva meta profesional, un rol visible o una direccion vocacional.', fullMoon: 'Toca cerrar una etapa profesional o soltar aprobacion externa.' },
  11: { area: 'Amistades, grupos y suenos de futuro', newMoon: 'Se abre un nuevo circulo, proyecto colectivo o sueno a largo plazo.', fullMoon: 'Es tiempo de soltar amistades, grupos o metas que ya no te nutren.' },
  12: { area: 'Inconsciente, retiro, espiritualidad y sanacion', newMoon: 'Se abre un ciclo de retiro, escucha interna y sanacion silenciosa.', fullMoon: 'Es momento de soltar miedos inconscientes, autosabotaje y cargas emocionales viejas.' },
}

const RETROGRADE_MESSAGES = {
  Mercurio: 'Revisa conversaciones, contratos, mensajes y decisiones mentales antes de correr.',
  Venus: 'Vuelve sobre vinculos, valores, deseo y dinero con mas honestidad y menos prisa.',
  Marte: 'Baja la impulsividad, recalibra accion y no fuerces una batalla que aun no esta madura.',
  Jupiter: 'Revisa creencias, planes de expansion y expectativas antes de crecer por inercia.',
  Saturno: 'Reordena estructuras, limites y responsabilidades desde una madurez mas fina.',
  Urano: 'Observa donde el cambio pide ajuste interno antes de romper por reflejo.',
  Neptuno: 'Aclara intuiciones, suenos y confusiones para no perder direccion.',
  Pluton: 'Profundiza, depura y suelta el control donde una transformacion ya comenzo.',
  Quiron: 'Mira con honestidad donde una herida pide escucha antes de buscar solucion rapida.',
}

const SYSTEM_PROMPT = `Eres Sarita. Recibiras posiciones planetarias calculadas con efemerides suizas. Genera una carta natal practica y directa en espanol.

Estructura la respuesta EXACTAMENTE asi:

## QUIEN ERES
2-3 frases directas. Sin metaforas excesivas.

## DIRECCION
El Ascendente en [signo] es tu direccion evolutiva encarnada: el modo en que tu alma se orienta para encontrarse con la vida y crecer a traves de ella.
2-3 frases evocadoras.

## TUS FORTALEZAS
- [fortaleza concreta 1]
- [fortaleza concreta 2]
- [fortaleza concreta 3]
- [fortaleza concreta 4]

## TUS RETOS
- [reto concreto 1]
- [reto concreto 2]
- [reto concreto 3]
- [reto concreto 4]

## ESTE MES
Fecha actual: [MES ANO]. 2-3 frases sobre la energia del mes para esta carta.

## QUE HACER AHORA
- [accion concreta 1]
- [accion concreta 2]
- [accion concreta 3]

## QUE EVITAR
- [cosa a evitar 1]
- [cosa a evitar 2]

## TU RITUAL DEL MES
- [practica 1]
- [practica 2]
- [practica 3]

## TU FRASE DEL MES
Una frase corta y poderosa entre comillas.

Tono: directo, util, como un coach.
Max 500 palabras.`

function buildSystemPrompt(language = 'es') {
  const languageMap = {
    es: 'espanol',
    en: 'english',
    it: 'italiano',
  }

  const bodyLanguage = languageMap[language] || 'espanol'

  return `${SYSTEM_PROMPT}\n\nIMPORTANTE:\n- Manten EXACTAMENTE los titulos de seccion en espanol tal como estan arriba.\n- Escribe el contenido de cada seccion en ${bodyLanguage}.\n- No traduzcas los encabezados.`
}

function normalizeLongitude(value) {
  return ((value % 360) + 360) % 360
}

function longitudeToPos(lon) {
  const norm = normalizeLongitude(lon)
  const signIdx = Math.floor(norm / 30)
  const posInSign = norm % 30
  return {
    longitude: norm,
    sign: SIGNS[signIdx],
    degree: Math.floor(posInSign),
    minutes: Math.floor((posInSign % 1) * 60),
    element: ELEMENTS[SIGNS[signIdx]] || 'air',
  }
}

function assertSwiss(result, label) {
  if (result && typeof result === 'object' && result.error) {
    throw new Error(`${label}: ${result.error}`)
  }
  return result
}

function getJulianDayUT(date) {
  return swisseph.swe_julday(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600 + date.getUTCMilliseconds() / 3600000,
    swisseph.SE_GREG_CAL
  )
}

function calcBody(jdUt, bodyId) {
  return assertSwiss(swisseph.swe_calc_ut(jdUt, bodyId, SWISS_FLAGS), `swe_calc_ut(${bodyId})`)
}

function resolveBirthTimezone(lat, lng) {
  try {
    return tzLookup(lat, lng)
  } catch {
    return 'UTC'
  }
}

function getPlacidusData({ date, lat, lng }) {
  const jdUt = getJulianDayUT(date)
  const houses = assertSwiss(swisseph.swe_houses(jdUt, lat, lng, HOUSE_SYSTEM), 'swe_houses')
  const cusps = [0]

  for (let house = 1; house <= 12; house += 1) {
    cusps[house] = normalizeLongitude(houses.house[house - 1] ?? houses.house[house])
  }

  return {
    jdUt,
    asc: normalizeLongitude(houses.ascendant),
    mc: normalizeLongitude(houses.mc),
    cusps,
  }
}

function getPlanetHouse(longitude, cusps) {
  const lon = normalizeLongitude(longitude)
  for (let h = 1; h <= 12; h += 1) {
    const next = h === 12 ? 1 : h + 1
    const start = normalizeLongitude(cusps[h])
    const end = normalizeLongitude(cusps[next])
    if (start < end) {
      if (lon >= start && lon < end) return h
    } else if (lon >= start || lon < end) {
      return h
    }
  }
  return 1
}

function createPlanetFromLongitude({ name, glyph, longitude, cusps }) {
  const pos = longitudeToPos(longitude)
  return {
    name,
    glyph,
    ...pos,
    house: getPlanetHouse(longitude, cusps),
  }
}

function buildPlanetCollection({ jdUt, cusps }) {
  const planets = PLANET_DEFS.map((planet) => {
    const body = calcBody(jdUt, planet.id)
    return createPlanetFromLongitude({
      name: planet.name,
      glyph: planet.glyph,
      longitude: body.longitude,
      cusps,
    })
  })

  const northNode = calcBody(jdUt, swisseph.SE_TRUE_NODE)
  planets.push(createPlanetFromLongitude({
    name: 'Nodo Norte',
    glyph: '☊',
    longitude: northNode.longitude,
    cusps,
  }))

  planets.push(createPlanetFromLongitude({
    name: 'Nodo Sur',
    glyph: '☋',
    longitude: northNode.longitude + 180,
    cusps,
  }))

  const blackMoon = calcBody(jdUt, swisseph.SE_MEAN_APOG)
  planets.push(createPlanetFromLongitude({
    name: BLACK_MOON_NATURAL_NAME,
    glyph: '⚸',
    longitude: blackMoon.longitude,
    cusps,
  }))

  planets.push(createPlanetFromLongitude({
    name: 'Priapo',
    glyph: 'âš¶',
    longitude: blackMoon.longitude + 180,
    cusps,
  }))

  return planets
}

function getPhaseDelta(date, targetAngle) {
  const jdUt = getJulianDayUT(date)
  const moonLon = calcBody(jdUt, swisseph.SE_MOON).longitude
  const sunLon = calcBody(jdUt, swisseph.SE_SUN).longitude
  return ((moonLon - sunLon - targetAngle + 540) % 360) - 180
}

function refinePhaseTime({ startDate, endDate, targetAngle }) {
  let left = new Date(startDate)
  let right = new Date(endDate)
  let leftDelta = getPhaseDelta(left, targetAngle)

  for (let i = 0; i < 20; i += 1) {
    const mid = new Date((left.getTime() + right.getTime()) / 2)
    const midDelta = getPhaseDelta(mid, targetAngle)
    if (Math.abs(midDelta) < 0.001) return mid

    if (Math.sign(leftDelta) === Math.sign(midDelta)) {
      left = mid
      leftDelta = midDelta
    } else {
      right = mid
    }
  }

  return new Date((left.getTime() + right.getTime()) / 2)
}

function findMoonPhaseEvent({ startDate, targetAngle }) {
  const scanEnd = new Date(startDate.getTime() + 40 * 24 * 60 * 60 * 1000)
  let bestDate = new Date(startDate)
  let bestDistance = Math.abs(getPhaseDelta(bestDate, targetAngle))

  for (let cursor = new Date(startDate); cursor <= scanEnd; cursor = new Date(cursor.getTime() + 3 * 60 * 60 * 1000)) {
    const distance = Math.abs(getPhaseDelta(cursor, targetAngle))
    if (distance < bestDistance) {
      bestDistance = distance
      bestDate = new Date(cursor)
    }
  }

  let stepMs = 90 * 60 * 1000
  let refined = new Date(bestDate)

  while (stepMs >= 60 * 1000) {
    const before = new Date(refined.getTime() - stepMs)
    const after = new Date(refined.getTime() + stepMs)
    const currentDistance = Math.abs(getPhaseDelta(refined, targetAngle))
    const beforeDistance = Math.abs(getPhaseDelta(before, targetAngle))
    const afterDistance = Math.abs(getPhaseDelta(after, targetAngle))

    if (beforeDistance < currentDistance && beforeDistance <= afterDistance) {
      refined = before
    } else if (afterDistance < currentDistance) {
      refined = after
    } else {
      stepMs = Math.floor(stepMs / 2)
    }
  }

  return refined
}

function formatSpanishDate(date) {
  return `${date.getUTCDate()} ${MONTH_NAMES_ES[date.getUTCMonth()]} ${date.getUTCFullYear()}`
}

function buildLunationEvent({ type, date, cusps }) {
  if (!date) return null
  const jdUt = getJulianDayUT(date)
  const moon = calcBody(jdUt, swisseph.SE_MOON)
  const pos = longitudeToPos(moon.longitude)
  const house = getPlanetHouse(moon.longitude, cusps)
  const base = HOUSE_LUNAR_MESSAGES[house] || HOUSE_LUNAR_MESSAGES[1]

  return {
    type,
    label: type === 'newMoon' ? 'Luna Nueva' : 'Luna Llena',
    date: date.toISOString(),
    formattedDate: formatSpanishDate(date),
    absoluteLongitude: normalizeLongitude(moon.longitude),
    sign: pos.sign,
    degree: pos.degree,
    minutes: pos.minutes,
    element: pos.element,
    house,
    area: base.area,
    message: type === 'newMoon' ? base.newMoon : base.fullMoon,
    focus: `${type === 'newMoon' ? 'Esta Luna Nueva' : 'Esta Luna Llena'} en ${pos.sign} ${pos.degree}° activa tu Casa ${house}.`,
  }
}

function findMonthlyLunations({ now, cusps }) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0))
  const newMoonDate = findMoonPhaseEvent({ startDate: start, targetAngle: 0 })
  const fullMoonDate = findMoonPhaseEvent({ startDate: start, targetAngle: 180 })

  return {
    monthKey: `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`,
    newMoon: buildLunationEvent({ type: 'newMoon', date: newMoonDate, cusps }),
    fullMoon: buildLunationEvent({ type: 'fullMoon', date: fullMoonDate, cusps }),
  }
}

function buildTransitChart({ now, cusps }) {
  return {
    date: now.toISOString(),
    formattedDate: formatSpanishDate(now),
    planets: buildPlanetCollection({ jdUt: getJulianDayUT(now), cusps }),
  }
}

function buildMonthlyRetrogrades(now) {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 12, 0, 0))
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 12, 0, 0))

  return PLANET_DEFS
    .filter((planet) => planet.name !== 'Sol' && planet.name !== 'Luna')
    .map((planet) => {
      const retroDays = []

      for (let day = new Date(monthStart); day <= monthEnd; day = new Date(day.getTime() + 24 * 60 * 60 * 1000)) {
        const body = calcBody(getJulianDayUT(day), planet.id)
        if (body.longitudeSpeed < 0) {
          retroDays.push(new Date(day))
        }
      }

      if (!retroDays.length) return null

      return {
        name: planet.name,
        glyph: planet.glyph,
        startDate: retroDays[0].toISOString(),
        endDate: retroDays[retroDays.length - 1].toISOString(),
        formattedStart: formatSpanishDate(retroDays[0]),
        formattedEnd: formatSpanishDate(retroDays[retroDays.length - 1]),
        isActiveNow: retroDays.some((date) =>
          date.getUTCFullYear() === now.getUTCFullYear() &&
          date.getUTCMonth() === now.getUTCMonth() &&
          date.getUTCDate() === now.getUTCDate()
        ),
        message: RETROGRADE_MESSAGES[planet.name] || 'Usa este retroceso aparente para revisar y ajustar antes de avanzar.',
      }
    })
    .filter(Boolean)
}

function formatPos(p) {
  return `${p.name} (${p.glyph}): ${p.degree}°${String(p.minutes).padStart(2, '0')}' ${p.sign} - Casa ${p.house}`
}

router.post('/', async (req, res) => {
  const { name, birthdate, birthtime, lat, lng, language = 'es' } = req.body

  if (!name || !birthdate || lat == null || lng == null) {
    return res.status(400).json({ error: 'name, birthdate, lat, lng are required' })
  }

  try {
    const timeStr = birthtime || '12:00'
    const latF = parseFloat(lat)
    const lngF = parseFloat(lng)
    const timezone = resolveBirthTimezone(latF, lngF)
    const utcDate = zonedTimeToUtc(`${birthdate}T${timeStr}:00`, timezone)

    const { jdUt, asc, mc, cusps } = getPlacidusData({
      date: utcDate,
      lat: latF,
      lng: lngF,
    })

    const ascPos = longitudeToPos(asc)
    const mcPos = longitudeToPos(mc)
    const planets = buildPlanetCollection({ jdUt, cusps })
    const lunarCycle = findMonthlyLunations({ now: new Date(), cusps })
    const transitChart = buildTransitChart({ now: new Date(), cusps })
    const retrogrades = buildMonthlyRetrogrades(new Date())
    const positions = { ascendant: ascPos, mc: mcPos, planets, lunarCycle, transitChart, retrogrades, timezone }

    const now = new Date()
    const currentMonth = `${MONTH_NAMES_ES[now.getMonth()]} de ${now.getFullYear()}`

    const userMessage =
      `Nombre: ${name}\n` +
      `Fecha de nacimiento: ${birthdate}\n` +
      `Hora: ${birthtime || 'desconocida'}\n` +
      `Zona horaria de nacimiento: ${timezone}\n` +
      `Mes actual: ${currentMonth}\n\n` +
      `CICLO LUNAR DEL MES:\n` +
      `Luna Nueva: ${lunarCycle.newMoon?.formattedDate} - ${lunarCycle.newMoon?.sign} ${lunarCycle.newMoon?.degree}° - Casa ${lunarCycle.newMoon?.house} - ${lunarCycle.newMoon?.area}\n` +
      `Mensaje Luna Nueva: ${lunarCycle.newMoon?.message}\n` +
      `Luna Llena: ${lunarCycle.fullMoon?.formattedDate} - ${lunarCycle.fullMoon?.sign} ${lunarCycle.fullMoon?.degree}° - Casa ${lunarCycle.fullMoon?.house} - ${lunarCycle.fullMoon?.area}\n` +
      `Mensaje Luna Llena: ${lunarCycle.fullMoon?.message}\n\n` +
      `POSICIONES PLANETARIAS:\n` +
      `Ascendente: ${ascPos.degree}°${String(ascPos.minutes).padStart(2, '0')}' ${ascPos.sign}\n` +
      `Medio Cielo: ${mcPos.degree}°${String(mcPos.minutes).padStart(2, '0')}' ${mcPos.sign}\n` +
      planets.map(formatPos).join('\n')

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    res.write(`data: ${JSON.stringify({ type: 'positions', data: positions })}\n\n`)

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const stream = createStreamWithFallback(client, {
      max_tokens: 1500,
      system: buildSystemPrompt(language),
      messages: [{ role: 'user', content: userMessage }],
    })

    stream.on('text', (text) => {
      res.write(`data: ${JSON.stringify({ type: 'text', text })}\n\n`)
    })

    stream.on('error', (err) => {
      console.error('Claude stream error:', err)
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`)
      res.end()
    })

    stream.on('finalMessage', () => {
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
      res.end()
    })
  } catch (err) {
    console.error('Reading error:', err)
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Internal server error' })
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`)
      res.end()
    }
  }
})

module.exports = router
