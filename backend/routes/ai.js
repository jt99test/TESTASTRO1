const express = require('express')
const Anthropic = require('@anthropic-ai/sdk')

const router = express.Router()
const DEFAULT_AI_MODEL = process.env.ANTHROPIC_AI_MODEL || 'claude-sonnet-4-6'
const AI_MODEL_FALLBACKS = [DEFAULT_AI_MODEL, 'claude-sonnet-4-5-20250929', 'claude-haiku-4-5-20251001']

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

function getApiKeyHint(apiKey = '') {
  if (!apiKey) return null
  if (apiKey.length <= 12) return apiKey
  return `${apiKey.slice(0, 10)}...${apiKey.slice(-4)}`
}

function shouldRetryWithFallback(err) {
  return err?.status === 404 || err?.error?.error?.type === 'not_found_error'
}

async function createMessageWithFallback(client, payload) {
  let lastError

  for (const model of AI_MODEL_FALLBACKS) {
    try {
      return await client.messages.create({
        ...payload,
        model,
      })
    } catch (err) {
      lastError = err
      if (!shouldRetryWithFallback(err) || model === AI_MODEL_FALLBACKS[AI_MODEL_FALLBACKS.length - 1]) {
        throw err
      }
      console.warn(`Anthropic model unavailable: ${model}. Retrying with fallback model.`)
    }
  }

  throw lastError
}

router.get('/models', async (_req, res) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'Missing ANTHROPIC_API_KEY' })
    }

    const response = await fetch('https://api.anthropic.com/v1/models', {
      method: 'GET',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        keyHint: getApiKeyHint(process.env.ANTHROPIC_API_KEY),
        status: response.status,
        error: data,
      })
    }

    const models = Array.isArray(data?.data)
      ? data.data.map((item) => ({
          id: item.id,
          display_name: item.display_name,
          created_at: item.created_at,
        }))
      : []

    res.json({
      ok: true,
      keyHint: getApiKeyHint(process.env.ANTHROPIC_API_KEY),
      count: models.length,
      modelIds: models.map((model) => model.id),
      models,
    })
  } catch (err) {
    console.error('Anthropic models diagnostic error:', err)
    res.status(500).json({
      ok: false,
      keyHint: getApiKeyHint(process.env.ANTHROPIC_API_KEY),
      error: err.message,
    })
  }
})

router.post('/portrait', async (req, res) => {
  try {
    const { sun, moon, ascendant, dominantElement, dominantModality, language = 'es' } = req.body
    if (!sun || !moon || !ascendant) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const prompt = `Eres un astrólogo escribiendo un retrato de 3 frases de una persona real.
Escribe en español de España. Usa "tú" (nunca "vos"). Nada de voseo.
Habla siempre en segunda persona singular.

Genera exactamente 3 frases desde esta energía astrológica:
Sol en ${sun}
Luna en ${moon}
Ascendente en ${ascendant}
Elemento dominante: ${dominantElement}
Modalidad: ${dominantModality}

Escribe como retrato humano cálido, cercano, específico y reconocible.
Sin listar planetas. Sin jerga técnica sin explicarla enseguida.
Frase 1: quien eres en esencia.
Frase 2: como te mueves por el mundo y te relacionas con los demas.
Frase 3: tu tension o don central, algo concreto y reconocible.
Máximo 95 palabras total. Solo las 3 frases seguidas, sin numeración ni saltos de línea entre ellas.`

    const client = getClient()
    const message = await createMessageWithFallback(client, {
      max_tokens: 250,
      messages: [{ role: 'user', content: prompt }],
    })

    const portrait = message.content[0]?.type === 'text' ? message.content[0].text.trim() : ''
    res.json({ portrait })
  } catch (err) {
    console.error('AI portrait error:', err)
    res.status(500).json({ error: err.message })
  }
})

router.post('/month', async (req, res) => {
  try {
    const { name, sun, moon, ascendant, lunarNew, lunarFull, aspectSummary, transitSummary, natalSummary, language = 'es' } = req.body
    if (!name) return res.status(400).json({ error: 'Missing name' })

    const prompt = `Eres un astrólogo de Madrid escribiendo el resumen mensual para una persona real.
Escribe en español de España. Usa "tú" (nunca "vos"). Nada de voseo.
Sé directo, cálido y práctico, como un amigo inteligente que sabe astrología.
Habla siempre directamente a ${name}.

Carta natal base:
- Sol: ${sun || 'desconocido'}
- Luna: ${moon || 'desconocido'}
- Ascendente: ${ascendant || 'desconocido'}
- Resumen natal: ${natalSummary || 'sin datos'}

Contexto del mes:
- Luna Nueva: ${lunarNew || 'sin datos'}
- Luna Llena: ${lunarFull || 'sin datos'}
- Tránsitos del mes: ${transitSummary || 'sin datos'}
- Aspectos personales activos: ${aspectSummary || 'sin datos'}

Máximo 4 frases. Estructura:
1. Energía o tema principal este mes para esta persona
2. Qué área de vida está más activada
3. Qué puede costar o sentirse más difícil
4. Qué recurso o fortaleza natural tiene disponible este mes

Nunca uses términos técnicos sin explicarlos entre paréntesis inmediatamente.
Sin numeración ni viñetas.`

    const client = getClient()
    const message = await createMessageWithFallback(client, {
      max_tokens: 350,
      messages: [{ role: 'user', content: prompt }],
    })

    const month = message.content[0]?.type === 'text' ? message.content[0].text.trim() : ''
    res.json({ month })
  } catch (err) {
    console.error('AI month error:', err)
    res.status(500).json({ error: err.message })
  }
})

router.post('/aspects', async (req, res) => {
  try {
    const { name, pairs, language = 'es', monthContext = '' } = req.body
    if (!pairs || pairs.length === 0) return res.json({ descriptions: {} })

    const aspectLabels = {
      Conj: 'conjuncion (se funden)',
      Cuad: 'cuadratura (tension)',
      Trin: 'trigono (fluye)',
      Opos: 'oposicion (se polarizan)',
      Sext: 'sextil (oportunidad)',
    }

    const pairLines = pairs
      .map((p) => `${p.from}-${p.to}-${p.type}: ${p.from} en ${aspectLabels[p.type] || p.type} con ${p.to} (Casa ${p.fromHouse} y Casa ${p.toHouse})`)
      .join('\n')

    const prompt = `Eres un astrólogo de Madrid escribiendo descripciones cortas de aspectos natales para una persona real.
Escribe en español de España. Usa "tú" (nunca "vos"). Nada de voseo rioplatense.
Contexto del mes: ${monthContext || 'sin datos'}

Por cada aspecto, escribe 1 frase (máximo 2) describiendo algo que esta persona VIVE o SIENTE, no lo que hacen los planetas.

ESTÁ TERMINANTEMENTE PROHIBIDO escribir frases con esta estructura:
❌ "Tu [función del planeta] (Planeta) [verbo] con tu [función del otro] (Planeta) este mes"
❌ "Tu identidad y voluntad (Sol) tienen una oportunidad de conectar con tu acción (Marte)"
❌ "Tu mundo emocional (Luna) fluye con tu expansión (Júpiter)"
❌ Empezar con "Tu [sustantivo] ([Planeta])"
❌ Usar "este mes" como ancla de la frase
❌ Copiar el rol del planeta del input (identidad, voluntad, expansión, etc.)

ESCRIBE ASÍ EN SU LUGAR:
✅ Cuadratura: Arrancas proyectos con fuerza pero algo en ti frena justo cuando más importa terminarlos.
✅ Trígono: Lo que piensas y cómo te mueves van en sintonía — las palabras te salen cuando actúas, no cuando planeas.
✅ Sextil: Si coges el teléfono hoy, o dices lo que tienes en mente, la puerta se abre sola.
✅ Conjunción: Es difícil distinguir cuándo estás siendo tú y cuándo estás respondiendo a lo que el mundo pide de ti.
✅ Oposición: Sientes que dar más en el trabajo significa soltar algo en casa, y viceversa — no encuentras el punto medio.

Cada frase debe sonar distinta. Nada de repetir estructuras entre aspectos.

Pares:
${pairLines}

Responde SOLO JSON válido:
{
  "Sol-Luna-Cuad": "frase aqui",
  "Luna-Marte-Trin": "frase aqui"
}

Usa exactamente las mismas claves que aparecen antes del colon en cada par.`

    const client = getClient()
    const message = await createMessageWithFallback(client, {
      max_tokens: 900,
      messages: [{ role: 'user', content: prompt }],
    })

    let descriptions = {}
    if (message.content[0]?.type === 'text') {
      const raw = message.content[0].text.trim()
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/)
        if (jsonMatch) descriptions = JSON.parse(jsonMatch[0])
      } catch {
        // fall back to empty - UI will use static descriptions
      }
    }

    res.json({ descriptions })
  } catch (err) {
    console.error('AI aspects error:', err)
    res.status(500).json({ error: err.message })
  }
})

router.post('/life-areas', async (req, res) => {
  try {
    const { name, language = 'es', sun, moon, ascendant, venus, mars, jupiter, saturn, house2, house6, house7, house8, transitSummary } = req.body
    if (!name) return res.status(400).json({ error: 'Missing name' })

    const prompt = `Eres un astrólogo de Madrid escribiendo un resumen práctico para una persona real.
Escribe en español de España. Usa "tú" (nunca "vos"). Nada de voseo.
Devuelve SOLO JSON válido con tres claves: love, finance, health.

Datos de esta persona:
- Sol: ${sun || 'sin datos'}
- Luna: ${moon || 'sin datos'}
- Ascendente: ${ascendant || 'sin datos'}
- Venus: ${venus || 'sin datos'}
- Marte: ${mars || 'sin datos'}
- Júpiter: ${jupiter || 'sin datos'}
- Saturno: ${saturn || 'sin datos'}
- Casa 2: ${house2 || 'sin datos'}
- Casa 6: ${house6 || 'sin datos'}
- Casa 7: ${house7 || 'sin datos'}
- Casa 8: ${house8 || 'sin datos'}
- Contexto del mes: ${transitSummary || 'sin datos'}

Cada valor debe ser 1 o 2 frases, cálido, específico y útil. Nada genérico. 
Explica:
- love: vínculos, deseo, apertura o tensión afectiva
- finance: dinero, trabajo material, recursos o seguridad
- health: energía, cuerpo, descanso o hábitos

Responde exactamente así:
{"love":"...","finance":"...","health":"..."}`

    const client = getClient()
    const message = await createMessageWithFallback(client, {
      max_tokens: 450,
      messages: [{ role: 'user', content: prompt }],
    })

    let areas = { love: '', finance: '', health: '' }
    if (message.content[0]?.type === 'text') {
      const raw = message.content[0].text.trim()
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          areas = JSON.parse(jsonMatch[0])
        } catch {}
      }
    }

    res.json({ areas })
  } catch (err) {
    console.error('AI life areas error:', err)
    res.status(500).json({ error: err.message })
  }
})

router.post('/natal-reading', async (req, res) => {
  try {
    const { name, language = 'es', planets = [], ascendant, mc, aspects = [], elementCounts, modalityCounts, dominantElement, dominantModality } = req.body
    if (!name || !planets.length) return res.status(400).json({ error: 'Missing required fields' })

    const planetLines = planets.map((p) => `- ${p.name}: ${p.sign} Casa ${p.house} (${p.degree}°)`).join('\n')
    const aspectLines = aspects.slice(0, 15).map((a) => `- ${a.from} ${a.type} ${a.to} (orbe ${a.orb?.toFixed(1) ?? '?'}°)`).join('\n')

    const elementLine = elementCounts ? `Distribución de elementos: fuego=${elementCounts.fire ?? 0}, tierra=${elementCounts.earth ?? 0}, aire=${elementCounts.air ?? 0}, agua=${elementCounts.water ?? 0}. Dominante: ${dominantElement ?? 'sin datos'}` : ''
    const modalityLine = modalityCounts ? `Distribución de modalidades: cardinal=${modalityCounts.cardinal ?? 0}, fija=${modalityCounts.fixed ?? 0}, mutable=${modalityCounts.mutable ?? 0}. Dominante: ${dominantModality ?? 'sin datos'}` : ''

    const prompt = `Eres un astrólogo de Madrid explicándole la carta natal a tu cliente. Hablas directamente a ${name} usando "tú".
Escribe en español de España. Usa "tú" (nunca "vos"). Nada de voseo rioplatense — "eres", "tienes", "puedes", no "sos", "tenés", "podés".

Tu estilo:
- Claro y directo, como si se lo explicaras a un amigo curioso de 15 años
- Nada abstracto ni poético. Si usas un término astrológico, explícalo de inmediato entre paréntesis
- Específico a ESTA carta, no genérico
- Cálido pero sin exagerar. No uses frases como "brillas con luz propia" o "tu alma lleva siglos de sabiduría"
- 2-3 frases por planeta. Para especiales (nodos, lilith, quirón): 2-3 frases también

Carta natal de ${name}:
Ascendente: ${ascendant ?? 'sin datos'}
MC: ${mc ?? 'sin datos'}
${elementLine}
${modalityLine}
Planetas:
${planetLines}

Aspectos natales más importantes:
${aspectLines || 'sin datos'}

Devuelve SOLO JSON válido con esta estructura exacta:
{
  "planets": {
    "sol": "...",
    "luna": "...",
    "mercurio": "...",
    "venus": "...",
    "marte": "...",
    "jupiter": "...",
    "saturno": "...",
    "urano": "...",
    "neptuno": "...",
    "pluton": "...",
    "ascendente": "..."
  },
  "special": {
    "nodos": "...",
    "lilith": "...",
    "quiron": "...",
    "elementProfile": "...",
    "modalityProfile": "..."
  },
  "aspects": {
    ${aspects.slice(0, 15).map((a) => `"${a.from}-${a.to}-${a.type}": "..."`).join(',\n    ')}
  }
}

Para cada planeta: 2-3 frases sobre qué significa en ese signo y casa para esta persona. Menciona aspectos relevantes cuando los haya.
Para "ascendente": 2-3 frases sobre cómo se presenta ${name} al mundo, qué tipo de experiencias le busca la vida y cómo crece. Es distinto del Sol — el Sol es quien eres, el Ascendente es cómo aterrizas.
Para "elementProfile": 2 frases explicando qué significa para ${name} tener esa distribución de elementos. Qué fluye fácil y qué puede costar. Usa la distribución real, no genérico.
Para "modalityProfile": 2 frases explicando qué significa para ${name} la distribución de modalidades. Cómo se mueve por la vida, qué le es natural. Usa los números reales.
Para los aspectos: 1 frase específica por aspecto, en lenguaje cotidiano.
No repitas la misma información entre secciones.`

    const client = getClient()
    const message = await createMessageWithFallback(client, {
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    })

    let reading = { planets: {}, special: {}, aspects: {} }
    if (message.content[0]?.type === 'text') {
      const raw = message.content[0].text.trim()
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          reading = JSON.parse(jsonMatch[0])
        } catch {}
      }
    }

    res.json({ reading })
  } catch (err) {
    console.error('AI natal reading error:', err)
    res.status(500).json({ error: err.message })
  }
})

router.post('/transit-aspects', async (req, res) => {
  try {
    const { name, language = 'es', sun, moon, ascendant, transits = [] } = req.body
    if (!name || !transits.length) return res.json({ advice: {} })

    const transitLines = transits.map((t) =>
      `- ${t.transitPlanet} ${t.aspectType} natal ${t.natalPlanet} (Casa ${t.house})`
    ).join('\n')

    const prompt = `Eres un astrólogo de Madrid hablando con ${name} sobre lo que está viviendo este mes.
Escribe SIEMPRE en español de España. Usa "tú" (nunca "vos"). Nada de voseo.
Carta natal: Sol en ${sun ?? 'sin datos'}, Luna en ${moon ?? 'sin datos'}, Ascendente ${ascendant ?? 'sin datos'}.

DIRECCIÓN DE LOS TRÁNSITOS — esto es importante:
El planeta en tránsito es el que se mueve por el cielo ahora. El planeta natal es fijo, siempre en el mismo lugar desde que naciste.
Por ejemplo: "Sol tránsito Cuad natal Júpiter" significa que el Sol actual del cielo está chocando con el Júpiter fijo de tu carta natal.
Cuando escribas, habla de lo que el cielo de AHORA está activando en la carta natal fija de ${name}.

Escribe 2 frases por tránsito. Primera: qué está notando ${name} en su vida real ahora. Segunda: qué puede hacer o qué conviene saber.

PROHIBIDO:
- "Tu X (Planeta) está en [aspecto] con tu Y (Planeta) natal"
- Empezar nombrando el rol del planeta: "Tu identidad", "Tu mundo emocional", etc.
- Usar "este mes" como ancla de la frase

CORRECTO:
- Habla de área de vida real: trabajo, relaciones, dinero, familia, salud, creatividad
- Di qué situación concreta puede estar viviendo ${name} ahora mismo
- Para aspectos fáciles (trígono, sextil): qué le sale sin esfuerzo o qué tiene disponible
- Para aspectos difíciles (cuadratura, oposición): qué fricción real le genera y por qué
- Para conjunciones: qué se intensifica en su vida, para bien o para mal
- Cada tránsito debe sonar completamente diferente

Tránsitos (formato: planeta_tránsito aspecto natal planeta_natal):
${transitLines}

Responde SOLO JSON válido:
{
  ${transits.map((t) => `"${t.transitPlanet}-${t.aspectType}-${t.natalPlanet}": "..."`).join(',\n  ')}
}`

    const client = getClient()
    const message = await createMessageWithFallback(client, {
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    })

    let advice = {}
    if (message.content[0]?.type === 'text') {
      const raw = message.content[0].text.trim()
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try { advice = JSON.parse(jsonMatch[0]) } catch {}
      }
    }

    res.json({ advice })
  } catch (err) {
    console.error('AI transit aspects error:', err)
    res.status(500).json({ error: err.message })
  }
})

router.post('/lunar-events', async (req, res) => {
  try {
    const { name, language = 'es', sun, moon, ascendant, lunarNew, lunarFull } = req.body
    if (!name) return res.status(400).json({ error: 'Missing name' })

    const newLine = lunarNew
      ? `Luna Nueva en ${lunarNew.sign} Casa ${lunarNew.house} — área activada: ${lunarNew.area}`
      : null
    const fullLine = lunarFull
      ? `Luna Llena en ${lunarFull.sign} Casa ${lunarFull.house} — área activada: ${lunarFull.area}`
      : null

    if (!newLine && !fullLine) return res.json({ lunarNewText: null, lunarFullText: null })

    const prompt = `Eres un astrólogo de Madrid explicando qué significan las lunas del mes para una persona concreta.
Escribe en español de España. Usa "tú" (nunca "vos"). Nada de voseo. Habla directamente a ${name}.

Estilo:
- Claro, directo, como explicándole a alguien curioso de 15 años
- Nada abstracto. Si dices "casa" explica en una palabra qué área de vida es
- Específico a ESTA carta natal: Sol en ${sun ?? 'sin datos'}, Luna en ${moon ?? 'sin datos'}, Ascendente ${ascendant ?? 'sin datos'}
- 2-3 frases por luna. Qué pasa concretamente, qué puede notar ${name}, qué puede hacer

${newLine ? `Luna Nueva este mes:\n${newLine}` : ''}
${fullLine ? `Luna Llena este mes:\n${fullLine}` : ''}

Devuelve SOLO JSON válido:
{
  ${newLine ? '"lunarNewText": "..."' : ''}${newLine && fullLine ? ',' : ''}
  ${fullLine ? '"lunarFullText": "..."' : ''}
}`

    const client = getClient()
    const message = await createMessageWithFallback(client, {
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })

    let result = { lunarNewText: null, lunarFullText: null }
    if (message.content[0]?.type === 'text') {
      const raw = message.content[0].text.trim()
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try { result = { ...result, ...JSON.parse(jsonMatch[0]) } } catch {}
      }
    }

    res.json(result)
  } catch (err) {
    console.error('AI lunar events error:', err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
