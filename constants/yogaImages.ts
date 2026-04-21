function normalizePoseKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const yogaPoseImages: Record<string, any> = {
  'tadasana-activa': require('../assets/images/yoga/fire-tadasana-activa.png'),
  'navasana': require('../assets/images/yoga/fire-navasana.png'),
  'ardha-navasana': require('../assets/images/yoga/fire-ardha-navasana.png'),
  'ustrasana': require('../assets/images/yoga/fire-ustrasana.png'),
  'parivrtta-trikonasana': require('../assets/images/yoga/fire-parivrtta-trikonasana.png'),
  'dhanurasana': require('../assets/images/yoga/fire-dhanurasana.png'),

  'malasana': require('../assets/images/yoga/earth-malasana.png'),
  'balasana': require('../assets/images/yoga/earth-balasana.png'),
  'vrksasana': require('../assets/images/yoga/earth-vrksasana.png'),
  'setu-bandhasana': require('../assets/images/yoga/earth-setu-bandhasana.png'),
  'supta-baddha-konasana': require('../assets/images/yoga/earth-supta-baddha-konasana.png'),
  'virabhadrasana-i': require('../assets/images/yoga/earth-virabhadrasana-1.png'),

  'flujo-pelvico-libre': require('../assets/images/yoga/water-flujo-pelvico-libre.png'),
  'anjaneyasana-profundo': require('../assets/images/yoga/water-anjaneyasana-profundo.png'),
  'baddha-konasana-con-oscilacion': require('../assets/images/yoga/water-baddha-konasana-oscilacion.png'),
  'upavistha-konasana-con-movimiento': require('../assets/images/yoga/water-upavistha-konasana-movimiento.png'),
  'ardha-matsyendrasana': require('../assets/images/yoga/water-ardha-matsyendrasana.png'),
  'viparita-karani': require('../assets/images/yoga/water-viparita-karani.png'),

  'apertura-toracica-en-cuatro-apoyos': require('../assets/images/yoga/air-apertura-toracica-cuatro-apoyos.png'),
  'anahatasana': require('../assets/images/yoga/air-anahatasana.png'),
  'bhujangasana-baja': require('../assets/images/yoga/air-bhujangasana-baja.png'),
  'gomukhasana-brazos-o-cara-de-vaca': require('../assets/images/yoga/air-gomukhasana-brazos.png'),
  'garudasana': require('../assets/images/yoga/air-garudasana.png'),
  'matsyasana': require('../assets/images/yoga/air-matsyasana.png'),
}

export function getYogaPoseImage(pose: string) {
  return yogaPoseImages[normalizePoseKey(pose)] ?? null
}

