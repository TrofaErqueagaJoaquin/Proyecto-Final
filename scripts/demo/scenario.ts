// Escenario de la demo (EXPOTEC_DEMO.md §3). Todo es ficticio: los correos usan el TLD .invalid,
// que no recibe correo. Las fechas son relativas al momento del reinicio.

import { DEMO_EMAIL_DOMAIN } from './guards.ts';

export const email = (user: string) => `${user}@${DEMO_EMAIL_DOMAIN}`;

export interface DemoUser {
  key: string;
  name: string;
  /** Cuentas de administración: sobreviven al reinicio para conservar su MFA. */
  staff?: 'platform_admin' | 'credential_verifier';
}

export const USERS: DemoUser[] = [
  { key: 'laura', name: 'Laura García' },
  { key: 'diego', name: 'Diego García' },
  { key: 'norma', name: 'Norma' },
  { key: 'carla', name: 'Carla Pereyra' },
  { key: 'paula', name: 'Lic. Paula Ríos' },
  { key: 'martin', name: 'Dr. Martín Suárez' },
  { key: 'ana', name: 'Lic. Ana Benítez' },
  { key: 'verificador', name: 'Verificación (demo)', staff: 'credential_verifier' },
  { key: 'admin', name: 'Administración (demo)', staff: 'platform_admin' },
];

export interface DemoProfessional {
  key: 'paula' | 'martin' | 'ana';
  displayName: string;
  bio: string;
  specialties: string[];
  modalities: ('presencial' | 'virtual')[];
  yearsExperience: number;
  credential: { profession: string; licenseNumber: string; issuer: string };
  /** false = queda en la cola de verificación (se aprueba en vivo). */
  verified: boolean;
}

export const PROFESSIONALS: DemoProfessional[] = [
  {
    key: 'paula',
    displayName: 'Lic. Paula Ríos',
    bio: 'Psicopedagoga. Acompaño a familias con chicos en edad escolar: hábitos de estudio, organización y uso de pantallas.',
    specialties: ['psicopedagogia'],
    modalities: ['presencial', 'virtual'],
    yearsExperience: 9,
    credential: {
      profession: 'Psicopedagoga',
      licenseNumber: 'DEMO-4521',
      issuer: 'Colegio de Psicopedagogos (ficticio)',
    },
    verified: true,
  },
  {
    key: 'martin',
    displayName: 'Dr. Martín Suárez',
    bio: 'Pediatra. Controles de salud, sueño y hábitos en la primera infancia.',
    specialties: ['pediatria'],
    modalities: ['presencial'],
    yearsExperience: 15,
    credential: {
      profession: 'Médico pediatra',
      licenseNumber: 'DEMO-77310',
      issuer: 'Colegio de Médicos (ficticio)',
    },
    verified: true,
  },
  {
    key: 'ana',
    displayName: 'Lic. Ana Benítez',
    bio: 'Psicóloga infantojuvenil. Regulación emocional y vínculos familiares.',
    specialties: ['psicologia'],
    modalities: ['virtual'],
    yearsExperience: 4,
    credential: {
      profession: 'Psicóloga',
      licenseNumber: 'DEMO-11873',
      issuer: 'Colegio de Psicólogos (ficticio)',
    },
    verified: false,
  },
];

export type Answers = Record<string, string | string[] | number>;

/** Tomi, hace 6 semanas: sueño corto y pantallas antes de dormir. */
export const TOMI_FIRST: Answers = {
  sleep_hours: 9.5,
  screens_before_bed: 'most_days',
  device_in_bedroom: 'yes',
  active_play: 'm30_60',
  sitting_stretch: 'sometimes',
  screen_weekday: 'h2_3',
  screen_weekend: 'gt3',
  background_tv: 'often',
  co_viewing: 'sometimes',
  content_chosen: 'sometimes',
  autoplay_off: 'dont_know',
  meals_screens: 'sometimes',
  device_to_calm: 'often',
  calm_strategies: ['hug'],
  reaction_turn_off: 'very_intense',
  clear_rules: 'partly',
  adults_follow: 'sometimes',
  rules_reviewed: 'no',
};

/** Tomi, hace 1 semana: mejoró el sueño; el apagado sigue costando. */
export const TOMI_SECOND: Answers = {
  ...TOMI_FIRST,
  sleep_hours: 11,
  screens_before_bed: 'never',
  device_in_bedroom: 'no',
  active_play: 'h1_2',
  screen_weekday: 'h1_2',
  screen_weekend: 'h2_3',
  background_tv: 'sometimes',
  co_viewing: 'often',
  autoplay_off: 'yes',
  meals_screens: 'never',
  device_to_calm: 'sometimes',
  calm_strategies: ['hug', 'music_story', 'movement'],
  reaction_turn_off: 'intense',
  clear_rules: 'yes',
  adults_follow: 'mostly',
  rules_reviewed: 'sometimes',
};

/** Sofi, hace 3 semanas: el celular duerme en su cuarto. */
export const SOFI: Answers = {
  sleep_hours: 8.5,
  screens_before_bed: 'most_days',
  device_in_bedroom: 'yes',
  active_play: 'm30_60',
  sitting_stretch: 'often',
  screen_weekday: 'h2_3',
  screen_weekend: 'gt3',
  background_tv: 'sometimes',
  co_viewing: 'rarely',
  content_chosen: 'sometimes',
  autoplay_off: 'no',
  meals_screens: 'sometimes',
  device_to_calm: 'sometimes',
  calm_strategies: ['talk', 'music_story'],
  reaction_turn_off: 'complains',
  clear_rules: 'partly',
  adults_follow: 'sometimes',
  rules_reviewed: 'no',
  child_participated: 'no',
};

export const SOFI_GOAL = {
  title: 'Dispositivos fuera del cuarto a las 21:30',
  description: 'El celular y la tablet duermen en el living, cargando.',
  progress: [
    { daysAgo: 18, progress: 20, note: 'Lo intentamos dos noches; costó mucho.' },
    { daysAgo: 11, progress: 50, note: 'Cuatro noches de siete. Ayudó el despertador analógico.' },
    { daysAgo: 4, progress: 75, note: 'Casi toda la semana. Ella misma lo deja en el cargador.' },
  ],
};

export const OBSERVATIONS = [
  {
    visibility: 'private' as const,
    body: 'Primera entrevista: refiere cansancio a la mañana y dificultad para cortar el celular. Revisar rutina de la noche en el próximo encuentro.',
  },
  {
    visibility: 'shared_family' as const,
    body: 'Para casa: acordar con Sofi un horario para dejar los dispositivos fuera del cuarto y anotarlo juntas en un lugar visible.',
  },
];

/** Pregunta de la conversación precargada (la respuesta se graba con demo:capture). */
export const CAPTURE_QUESTION = 'Se pone muy mal cuando le apago la tablet. ¿Qué puedo hacer?';
