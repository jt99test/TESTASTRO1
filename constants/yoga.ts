export type ElementKey = 'fire' | 'earth' | 'water' | 'air'

export interface YogaRoutine {
  element: ElementKey
  title: string
  signs: string[]
  houses: number[]
  chakra: string
  mantra: string
  intention: string
  breath: string
  savasana: string
  sequence: Array<{
    pose: string
    description: string
    benefit: string
    focus: string
    duration: string
    caution?: string
  }>
}

export const yogaByElement: Record<ElementKey, YogaRoutine> = {
  fire: {
    element: 'fire',
    title: 'Elemento Fuego',
    signs: ['Aries', 'Leo', 'Sagitario'],
    houses: [1, 5, 9],
    chakra: 'Manipura',
    mantra: 'RAM',
    intention: 'Despierta tu poder personal, la voluntad y la capacidad de actuar.',
    breath: 'Kapalabhati o respiración de fuego suave al final de la práctica.',
    savasana: 'Visualiza una llama dorada estable en el centro del abdomen.',
    sequence: [
      { pose: 'Tadasana activa', description: 'Postura de pie firme con el cuerpo largo y el abdomen despierto.', benefit: 'Ordena tu eje y enciende presencia.', focus: 'encender presencia y dirección', duration: '10 respiraciones' },
      { pose: 'Navasana', description: 'Equilibrio sentado sobre isquiones con piernas elevadas y torso activo.', benefit: 'Fortalece centro, voluntad y decisión.', focus: 'activar centro y decisión', duration: '5 respiraciones', caution: 'Flexiona rodillas si se carga la zona lumbar.' },
      { pose: 'Ardha Navasana', description: 'Versión baja del barco, con abdomen sostenido y espalda larga.', benefit: 'Entrena resiliencia y foco bajo presión.', focus: 'sostener voluntad en medio del esfuerzo', duration: '3 series' },
      { pose: 'Ustrasana', description: 'Camello con apertura de pecho y caderas estables.', benefit: 'Abre el corazón sin apagar tu fuerza interna.', focus: 'abrir pecho sin perder fuerza interna', duration: '4 respiraciones', caution: 'Sujeta lumbar con manos o mantente más vertical si hay tensión cervical.' },
      { pose: 'Dhanurasana', description: 'Arco boca abajo, expandiendo pecho y muslos hacia atrás.', benefit: 'Activa coraje, expansión y empuje vital.', focus: 'expansión y coraje', duration: '3 respiraciones' },
      { pose: 'Parivrtta Trikonasana', description: 'Triángulo en torsión con base firme y mirada estable.', benefit: 'Aporta discernimiento y digiere intensidad emocional.', focus: 'claridad y digestión emocional', duration: '5 respiraciones por lado' },
    ],
  },
  earth: {
    element: 'earth',
    title: 'Elemento Tierra',
    signs: ['Tauro', 'Virgo', 'Capricornio'],
    houses: [2, 6, 10],
    chakra: 'Muladhara',
    mantra: 'LAM',
    intention: 'Arraigar el cuerpo, sentir sostén y construir estabilidad.',
    breath: 'Respiración profunda nasal con exhalaciones largas.',
    savasana: 'Visualiza raices bajando desde el cuerpo hacia la tierra.',
    sequence: [
      { pose: 'Malasana', description: 'Sentadilla profunda con pecho abierto y pies bien apoyados.', benefit: 'Enraiza pelvis, piernas y respiración.', focus: 'enraizar pelvis y piernas', duration: '2 minutos', caution: 'Coloca un soporte bajo talones si no bajan al suelo.' },
      { pose: 'Balasana', description: 'Postura de descanso con frente apoyada y respiración lenta.', benefit: 'Devuelve estabilidad y baja el exceso de carga.', focus: 'soltar peso y volver al centro', duration: '10 respiraciones' },
      { pose: 'Vrksasana', description: 'Equilibrio en un pie con manos al corazón o elevadas.', benefit: 'Fortalece eje interno y confianza serena.', focus: 'equilibrio y eje interno', duration: '1 minuto por lado' },
      { pose: 'Setu Bandhasana', description: 'Puente con pies firmes y pecho ascendiendo.', benefit: 'Fortalece base, espalda y sostén emocional.', focus: 'fortalecer base y espalda', duration: '3 series' },
      { pose: 'Supta Baddha Konasana', description: 'Mariposa reclinada con soporte y apertura suave.', benefit: 'Permite recibir y aflojar sin perder seguridad.', focus: 'recibir y aflojar', duration: '3 minutos' },
      { pose: 'Virabhadrasana I', description: 'Guerrero I con piernas activas y brazos en ascenso.', benefit: 'Da estructura, compromiso y dirección estable.', focus: 'compromiso y estructura', duration: '6 respiraciones por lado' },
    ],
  },
  water: {
    element: 'water',
    title: 'Elemento Agua',
    signs: ['Cancer', 'Escorpio', 'Piscis'],
    houses: [4, 8, 12],
    chakra: 'Svadhisthana',
    mantra: 'VAM',
    intention: 'Disolver rigidez emocional y recuperar fluidez, placer y sensibilidad.',
    breath: 'Respiración en ola o sitali para refrescar y regular la emoción.',
    savasana: 'Visualiza el cuerpo flotando sobre agua en calma.',
    sequence: [
      { pose: 'Flujo pélvico libre', description: 'Movimientos suaves de pelvis y columna baja al ritmo de la respiración.', benefit: 'Descongela emociones y devuelve fluidez al cuerpo.', focus: 'mover caderas con suavidad', duration: '2 minutos' },
      { pose: 'Anjaneyasana profundo', description: 'Zancada baja con apertura de ingles y pecho suave.', benefit: 'Abre espacio a la vulnerabilidad y al deseo.', focus: 'abrir ingles y agua emocional', duration: '2 minutos por lado' },
      { pose: 'Baddha Konasana con oscilacion', description: 'Mariposa sentada con pequeños movimientos hacia delante.', benefit: 'Suaviza pelvis, vientre y emociones acumuladas.', focus: 'suavizar pelvis y vientre', duration: '2 minutos' },
      { pose: 'Upavistha Konasana con movimiento', description: 'Piernas abiertas y tronco moviendose con delicadeza.', benefit: 'Crea amplitud interior y descarga estancamiento.', focus: 'espacio interno y amplitud', duration: '2 minutos' },
      { pose: 'Ardha Matsyendrasana', description: 'Torsión sentada con respiración amplia y suave.', benefit: 'Favorece drenaje emocional y claridad.', focus: 'drenaje y limpieza suave', duration: '5 respiraciones por lado' },
      { pose: 'Viparita Karani', description: 'Piernas arriba con apoyo para descansar el sistema.', benefit: 'Regula, baja revoluciones y contiene.', focus: 'descanso y regulacion del sistema', duration: '5 minutos' },
    ],
  },
  air: {
    element: 'air',
    title: 'Elemento Aire',
    signs: ['Geminis', 'Libra', 'Acuario'],
    houses: [3, 7, 11],
    chakra: 'Anahata',
    mantra: 'YAM',
    intention: 'Abrir el corazón, expandir ligereza y crear espacio mental.',
    breath: 'Ujjayi y respiración alterna para enfocar mente y pecho.',
    savasana: 'Visualiza nubes suaves entrando y saliendo del pecho.',
    sequence: [
      { pose: 'Apertura torácica en cuatro apoyos', description: 'Rotación de pecho y hombro desde apoyo de manos y rodillas.', benefit: 'Libera espalda alta, costillas y respiración.', focus: 'movilizar espalda alta y costillas', duration: '1 minuto por lado' },
      { pose: 'Anahatasana', description: 'Corazón derretido con brazos largos y pecho hacia el suelo.', benefit: 'Abre pecho, garganta y capacidad de recibir.', focus: 'abrir pecho y garganta', duration: '1 minuto', caution: 'Apoya frente o mentón según tu cuello.' },
      { pose: 'Bhujangasana baja', description: 'Cobra suave con poca altura y mucho espacio en el pecho.', benefit: 'Expande sin tensión y devuelve ligereza.', focus: 'expansión sin rigidez', duration: '3 series de 5 respiraciones' },
      { pose: 'Gomukhasana brazos o cara de vaca', description: 'Trabajo de hombros y brazos para abrir pecho y espalda.', benefit: 'Crea espacio en pulmones, hombros y zona alta.', focus: 'espacio en hombros y pulmones', duration: '5 respiraciones por lado' },
      { pose: 'Garudasana', description: 'Postura de equilibrio con brazos y piernas entrelazados.', benefit: 'Ordena la mente y recoge energía dispersa.', focus: 'concentración y sistema nervioso', duration: '4 respiraciones por lado' },
      { pose: 'Matsyasana', description: 'Apertura del corazón en arqueo suave y respiración alta.', benefit: 'Aporta ligereza, claridad y apertura afectiva.', focus: 'ligereza y apertura del corazón', duration: '5 respiraciones' },
    ],
  },
}
