import type { Exercise, Kind, Measure, Muscle } from './types'

type Row = [name: string, equipment: string, measure?: Measure]

const G: Kind = 'gym'
const C: Kind = 'calisthenics'
const T: Measure = 'time'

// Libreria di base. Gli ID derivano dal nome: non rinominare le voci esistenti,
// altrimenti lo storico già registrato perde il collegamento.
const LIBRARY: Record<Muscle, { gym?: Row[]; cal?: Row[] }> = {
  Petto: {
    gym: [
      ['Panca piana con bilanciere', 'Bilanciere'],
      ['Panca inclinata con bilanciere', 'Bilanciere'],
      ['Panca declinata con bilanciere', 'Bilanciere'],
      ['Panca piana con manubri', 'Manubri'],
      ['Panca inclinata con manubri', 'Manubri'],
      ['Panca declinata con manubri', 'Manubri'],
      ['Panca piana alla Smith machine', 'Macchina'],
      ['Floor press', 'Bilanciere'],
      ['Croci con manubri', 'Manubri'],
      ['Croci su panca inclinata', 'Manubri'],
      ['Croci ai cavi', 'Cavi'],
      ['Croci ai cavi dal basso', 'Cavi'],
      ['Pectoral machine (butterfly)', 'Macchina'],
      ['Chest press', 'Macchina'],
      ['Chest press inclinata', 'Macchina'],
      ['Pullover con manubrio', 'Manubri'],
      ['Svend press', 'Disco'],
    ],
    cal: [
      ['Push-up (piegamenti)', 'Corpo libero'],
      ['Push-up sulle ginocchia', 'Corpo libero'],
      ['Push-up inclinati', 'Corpo libero'],
      ['Push-up declinati', 'Corpo libero'],
      ['Push-up larghi', 'Corpo libero'],
      ['Archer push-up', 'Corpo libero'],
      ['Pseudo planche push-up', 'Corpo libero'],
      ['Push-up con battuta (clap)', 'Corpo libero'],
      ['Push-up a un braccio', 'Corpo libero'],
      ['Push-up agli anelli', 'Anelli'],
      ['Dip alle parallele inclinato (petto)', 'Parallele'],
    ],
  },
  Dorso: {
    gym: [
      ['Stacco da terra', 'Bilanciere'],
      ['Stacco sumo', 'Bilanciere'],
      ['Rack pull', 'Bilanciere'],
      ['Rematore con bilanciere', 'Bilanciere'],
      ['Rematore Pendlay', 'Bilanciere'],
      ['Rematore con manubrio', 'Manubri'],
      ['T-bar row', 'Bilanciere'],
      ['Seal row', 'Bilanciere'],
      ['Rematore alla macchina', 'Macchina'],
      ['Lat machine avanti', 'Macchina'],
      ['Lat machine presa stretta', 'Macchina'],
      ['Lat machine presa inversa', 'Macchina'],
      ['Pulley basso', 'Cavi'],
      ['Pullover ai cavi (braccia tese)', 'Cavi'],
      ['Hyperextension', 'Panca'],
      ['Shrug con bilanciere', 'Bilanciere'],
      ['Shrug con manubri', 'Manubri'],
    ],
    cal: [
      ['Trazioni alla sbarra (pull-up)', 'Sbarra'],
      ['Trazioni presa inversa (chin-up)', 'Sbarra'],
      ['Trazioni presa neutra', 'Sbarra'],
      ['Trazioni presa larga', 'Sbarra'],
      ['Trazioni assistite con elastico', 'Elastico'],
      ['Trazioni negative', 'Sbarra'],
      ['Trazioni esplosive (high pull-up)', 'Sbarra'],
      ['L-sit pull-up', 'Sbarra'],
      ['Archer pull-up', 'Sbarra'],
      ['Typewriter pull-up', 'Sbarra'],
      ['Trazioni a un braccio', 'Sbarra'],
      ['Scapular pull-up', 'Sbarra'],
      ['Australian pull-up (rematore inverso)', 'Sbarra'],
      ['Rematore agli anelli', 'Anelli'],
      ['Dead hang', 'Sbarra', T],
      ['Active hang', 'Sbarra', T],
      ['Superman', 'Corpo libero'],
    ],
  },
  Spalle: {
    gym: [
      ['Military press con bilanciere', 'Bilanciere'],
      ['Shoulder press con manubri', 'Manubri'],
      ['Arnold press', 'Manubri'],
      ['Shoulder press alla macchina', 'Macchina'],
      ['Push press', 'Bilanciere'],
      ['Landmine press', 'Bilanciere'],
      ['Alzate laterali con manubri', 'Manubri'],
      ['Alzate laterali ai cavi', 'Cavi'],
      ['Alzate laterali alla macchina', 'Macchina'],
      ['Alzate frontali', 'Manubri'],
      ['Alzate posteriori (reverse fly)', 'Manubri'],
      ['Reverse pec deck', 'Macchina'],
      ['Face pull', 'Cavi'],
      ['Tirate al mento (upright row)', 'Bilanciere'],
    ],
    cal: [
      ['Pike push-up', 'Corpo libero'],
      ['Pike push-up rialzati', 'Corpo libero'],
      ['Handstand push-up al muro', 'Corpo libero'],
      ['Handstand push-up libero', 'Corpo libero'],
      ['Wall walk', 'Corpo libero'],
    ],
  },
  Bicipiti: {
    gym: [
      ['Curl con bilanciere', 'Bilanciere'],
      ['Curl con bilanciere EZ', 'Bilanciere'],
      ['Curl con manubri', 'Manubri'],
      ['Curl a martello', 'Manubri'],
      ['Curl concentrato', 'Manubri'],
      ['Curl su panca inclinata', 'Manubri'],
      ['Curl su panca Scott', 'Bilanciere'],
      ['Spider curl', 'Manubri'],
      ['Curl ai cavi', 'Cavi'],
      ['Curl alla macchina', 'Macchina'],
    ],
    cal: [['Curl agli anelli', 'Anelli']],
  },
  Tricipiti: {
    gym: [
      ['Panca presa stretta', 'Bilanciere'],
      ['French press con bilanciere EZ', 'Bilanciere'],
      ['Skull crusher con manubri', 'Manubri'],
      ['Push-down ai cavi', 'Cavi'],
      ['Push-down con corda', 'Cavi'],
      ['Estensioni sopra la testa con manubrio', 'Manubri'],
      ['Estensioni sopra la testa ai cavi', 'Cavi'],
      ['Kickback con manubrio', 'Manubri'],
      ['Dip machine', 'Macchina'],
    ],
    cal: [
      ['Dip alle parallele', 'Parallele'],
      ['Dip agli anelli', 'Anelli'],
      ['Dip alla panca', 'Panca'],
      ['Korean dip', 'Parallele'],
      ['Push-up diamante', 'Corpo libero'],
      ['Estensioni tricipiti a corpo libero', 'Corpo libero'],
    ],
  },
  Avambracci: {
    gym: [
      ['Curl polso', 'Manubri'],
      ['Curl polso inverso', 'Manubri'],
      ['Reverse curl', 'Bilanciere'],
      ['Farmer walk', 'Manubri', T],
      ['Plate pinch', 'Disco', T],
    ],
  },
  Quadricipiti: {
    gym: [
      ['Squat con bilanciere', 'Bilanciere'],
      ['Front squat', 'Bilanciere'],
      ['Squat alla Smith machine', 'Macchina'],
      ['Hack squat', 'Macchina'],
      ['Leg press', 'Macchina'],
      ['Leg extension', 'Macchina'],
      ['Goblet squat', 'Manubri'],
      ['Affondi con manubri', 'Manubri'],
      ['Affondi camminati', 'Manubri'],
      ['Affondi bulgari (split squat)', 'Manubri'],
      ['Step-up con manubri', 'Manubri'],
    ],
    cal: [
      ['Squat a corpo libero', 'Corpo libero'],
      ['Jump squat', 'Corpo libero'],
      ['Affondi a corpo libero', 'Corpo libero'],
      ['Affondi saltati', 'Corpo libero'],
      ['Pistol squat', 'Corpo libero'],
      ['Pistol squat assistito', 'Corpo libero'],
      ['Shrimp squat', 'Corpo libero'],
      ['Cossack squat', 'Corpo libero'],
      ['Sissy squat', 'Corpo libero'],
      ['Box jump', 'Corpo libero'],
      ['Wall sit', 'Corpo libero', T],
    ],
  },
  Femorali: {
    gym: [
      ['Stacco rumeno', 'Bilanciere'],
      ['Stacco rumeno con manubri', 'Manubri'],
      ['Stacco a gambe tese', 'Bilanciere'],
      ['Good morning', 'Bilanciere'],
      ['Leg curl sdraiato', 'Macchina'],
      ['Leg curl seduto', 'Macchina'],
      ['Glute-ham raise', 'Macchina'],
    ],
    cal: [
      ['Nordic curl', 'Corpo libero'],
      ['Stacco rumeno a una gamba', 'Corpo libero'],
      ['Leg curl con fitball', 'Fitball'],
    ],
  },
  Glutei: {
    gym: [
      ['Hip thrust con bilanciere', 'Bilanciere'],
      ['Hip thrust alla macchina', 'Macchina'],
      ['Kettlebell swing', 'Kettlebell'],
      ['Slanci ai cavi (kickback)', 'Cavi'],
      ['Abductor machine', 'Macchina'],
      ['Adductor machine', 'Macchina'],
    ],
    cal: [
      ['Glute bridge', 'Corpo libero'],
      ['Glute bridge a una gamba', 'Corpo libero'],
      ['Donkey kick', 'Corpo libero'],
      ['Camminata laterale con elastico', 'Elastico'],
    ],
  },
  Polpacci: {
    gym: [
      ['Calf raise in piedi', 'Macchina'],
      ['Calf raise seduto', 'Macchina'],
      ['Calf alla leg press', 'Macchina'],
    ],
    cal: [
      ['Calf raise a corpo libero', 'Corpo libero'],
      ['Calf raise a una gamba', 'Corpo libero'],
    ],
  },
  Addome: {
    gym: [
      ['Crunch ai cavi', 'Cavi'],
      ['Crunch alla macchina', 'Macchina'],
      ['Pallof press', 'Cavi'],
      ['Woodchopper ai cavi', 'Cavi'],
    ],
    cal: [
      ['Plank', 'Corpo libero', T],
      ['Plank laterale', 'Corpo libero', T],
      ['Hollow body hold', 'Corpo libero', T],
      ['Arch body hold', 'Corpo libero', T],
      ['Crunch', 'Corpo libero'],
      ['Crunch inverso', 'Corpo libero'],
      ['Bicycle crunch', 'Corpo libero'],
      ['Sit-up', 'Corpo libero'],
      ['V-up', 'Corpo libero'],
      ['Leg raise a terra', 'Corpo libero'],
      ['Flutter kicks', 'Corpo libero', T],
      ['Russian twist', 'Corpo libero'],
      ['Mountain climber', 'Corpo libero'],
      ['Dead bug', 'Corpo libero'],
      ['Bird dog', 'Corpo libero'],
      ['Knee raise alla sbarra', 'Sbarra'],
      ['Leg raise alla sbarra', 'Sbarra'],
      ['Toes to bar', 'Sbarra'],
      ['Windshield wipers', 'Sbarra'],
      ['Ab wheel rollout', 'Ruota'],
      ['Dragon flag', 'Panca'],
    ],
  },
  Skill: {
    cal: [
      ['Verticale al muro', 'Corpo libero', T],
      ['Verticale libera', 'Corpo libero', T],
      ['Crow pose', 'Corpo libero', T],
      ['L-sit', 'Parallele', T],
      ['V-sit', 'Parallele', T],
      ['Support hold agli anelli', 'Anelli', T],
      ['Tuck front lever', 'Sbarra', T],
      ['Advanced tuck front lever', 'Sbarra', T],
      ['Straddle front lever', 'Sbarra', T],
      ['Front lever', 'Sbarra', T],
      ['Front lever raise', 'Sbarra'],
      ['Back lever', 'Sbarra', T],
      ['Planche lean', 'Corpo libero', T],
      ['Tuck planche', 'Corpo libero', T],
      ['Advanced tuck planche', 'Corpo libero', T],
      ['Straddle planche', 'Corpo libero', T],
      ['Elbow lever', 'Corpo libero', T],
      ['Human flag', 'Spalliera', T],
      ['Muscle-up alla sbarra', 'Sbarra'],
      ['Muscle-up agli anelli', 'Anelli'],
      ['Skin the cat', 'Anelli'],
      ['Ponte (bridge)', 'Corpo libero', T],
    ],
  },
  'Full body': {
    gym: [
      ['Girata al petto (power clean)', 'Bilanciere'],
      ['Strappo (snatch)', 'Bilanciere'],
      ['Slancio (clean and jerk)', 'Bilanciere'],
      ['Thruster', 'Bilanciere'],
      ['Turkish get-up', 'Kettlebell'],
      ['Battle rope', 'Corde', T],
    ],
    cal: [
      ['Burpees', 'Corpo libero'],
      ['Bear crawl', 'Corpo libero', T],
      ['Jumping jack', 'Corpo libero', T],
    ],
  },
  Cardio: {
    gym: [
      ['Tapis roulant', 'Macchina', T],
      ['Cyclette', 'Macchina', T],
      ['Vogatore', 'Macchina', T],
      ['Ellittica', 'Macchina', T],
      ['Stair climber', 'Macchina', T],
    ],
    cal: [
      ['Corsa', 'Corpo libero', T],
      ['Salto della corda', 'Corda', T],
      ['Camminata', 'Corpo libero', T],
    ],
  },
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export const BUILTIN_EXERCISES: Exercise[] = Object.entries(LIBRARY).flatMap(([muscle, groups]) => [
  ...(groups.gym ?? []).map((r) => toExercise(r, muscle as Muscle, G)),
  ...(groups.cal ?? []).map((r) => toExercise(r, muscle as Muscle, C)),
])

function toExercise([name, equipment, measure = 'reps']: Row, muscle: Muscle, kind: Kind): Exercise {
  return { id: slugify(name), name, muscle, kind, measure, equipment }
}
