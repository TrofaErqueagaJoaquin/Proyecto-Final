import type { HighRiskCategory } from './risk';

/**
 * Respuestas fijas ante riesgo alto: NO pasan por el modelo (AI_ARCHITECTURE.md §7.1).
 *
 * Las líneas de ayuda son las de la investigación (§16) y quedan PENDIENTES de verificación
 * (DECISIONS.md, V5): `verifiedAt` en null hasta que el equipo confirme vigencia y alcance en
 * Mar del Plata, y la interfaz lo muestra. El texto lo revisa un profesional antes de `prod` (V4).
 */
export interface HelpLine {
  label: string;
  phone: string;
  description: string;
}

export interface RiskResponse {
  title: string;
  body: string;
  lines: HelpLine[];
  verifiedAt: string | null;
}

const EMERGENCY: HelpLine = {
  label: 'Emergencias',
  phone: '911',
  description: 'Si hay riesgo inmediato.',
};
const SAME: HelpLine = {
  label: 'Emergencias médicas (SAME)',
  phone: '107',
  description: 'Ambulancia y atención médica urgente.',
};
const CHILDHOOD: HelpLine = {
  label: 'Línea 102',
  phone: '102',
  description: 'Derechos de niñas, niños y adolescentes. Gratuita y confidencial.',
};
const FAMILY_VIOLENCE: HelpLine = {
  label: 'Línea 137',
  phone: '137',
  description: 'Violencia familiar y sexual. Las 24 horas.',
};
const SUICIDE: HelpLine = {
  label: 'Línea 135 (Centro de Asistencia al Suicida)',
  phone: '135',
  description: 'Desde CABA y GBA. Desde el resto del país: (011) 5275-1135.',
};

export const RISK_RESPONSES: Record<HighRiskCategory, RiskResponse> = {
  self_harm: {
    title: 'Esto es importante y no tienen que atravesarlo solos',
    body:
      'Lo que contás puede ser una señal de que necesita ayuda ahora. No lo dejes solo o sola, ' +
      'escuchalo sin juzgar y sacá de su alcance lo que pueda usar para lastimarse. ' +
      'Comunicate ya con alguna de estas líneas o con su pediatra.',
    lines: [EMERGENCY, SUICIDE, CHILDHOOD],
    verifiedAt: null,
  },
  abuse: {
    title: 'Hay personas que pueden ayudarte ahora',
    body:
      'Si un chico o una chica está en peligro o sufre violencia, lo primero es su seguridad. ' +
      'Creele y no lo dejes a solas con quien lo lastima. Estas líneas orientan y reciben ' +
      'denuncias, también de forma anónima.',
    lines: [EMERGENCY, FAMILY_VIOLENCE, CHILDHOOD],
    verifiedAt: null,
  },
  medical_emergency: {
    title: 'Puede ser una emergencia',
    body:
      'Llamá ya a emergencias. Si se tragó algo, no le des nada por boca ni provoques el vómito, ' +
      'y tené a mano el envase. Mantenelo acompañado hasta que llegue la ayuda.',
    lines: [EMERGENCY, SAME],
    verifiedAt: null,
  },
  grooming: {
    title: 'Esto puede ser grooming, y se puede denunciar',
    body:
      'Si un adulto le pide fotos, que guarde secretos o que se encuentren, no es su culpa. ' +
      'No borren los mensajes: hacé capturas, bloqueá al contacto y denuncialo. ' +
      'Hablalo con calma y sin retarlo.',
    lines: [FAMILY_VIOLENCE, CHILDHOOD, EMERGENCY],
    verifiedAt: null,
  },
};
