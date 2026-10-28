import { describe, expect, it } from 'vitest';

import { BLOCKED_ANSWER, NO_INFO_SENTENCE, postCheck } from './postcheck';
import { RISK_RESPONSES } from './responses';

describe('postCheck · citas', () => {
  it('deja las citas válidas y quita las inventadas', () => {
    const result = postCheck('Apagá una hora antes [F1]. Según un estudio [F9], ayuda [F2].', [
      'F1',
      'F2',
    ]);
    expect(result.text).toBe('Apagá una hora antes [F1]. Según un estudio, ayuda [F2].');
    expect(result.citedRefs).toEqual(['F1', 'F2']);
    expect(result.removedRefs).toEqual(['F9']);
    expect(result.outcome).toBe('answered');
  });

  it('sin citas válidas, la respuesta no cuenta como apoyada en el contenido', () => {
    expect(postCheck('Tenés que hacer esto y aquello.', ['F1']).outcome).toBe(
      'insufficient_evidence',
    );
    expect(postCheck(NO_INFO_SENTENCE, ['F1']).outcome).toBe('insufficient_evidence');
  });
});

describe('postCheck · patrones prohibidos', () => {
  it.each([
    ['una dosis', 'Podés darle 3 mg antes de dormir [F1].', 'dose'],
    ['un diagnóstico', 'Por lo que contás, tiene TDAH [F1].', 'diagnosis'],
    ['una etiqueta de adicción', 'Tu hijo es adicto a la tablet [F1].', 'addiction_label'],
    ['la palabra adicción', 'Esto es una adicción a las pantallas [F1].', 'addiction_word'],
    ['una medicación', 'Dale melatonina y listo [F1].', 'medication'],
  ])('bloquea %s', (_name, answer, reason) => {
    const result = postCheck(answer, ['F1']);
    expect(result.outcome).toBe('blocked');
    expect(result.text).toBe(BLOCKED_ANSWER);
    expect(result.blockedBy).toBe(reason);
  });
});

describe('respuestas fijas de riesgo', () => {
  it('cada categoría ofrece al menos una línea y la de emergencias o una línea gratuita', () => {
    for (const response of Object.values(RISK_RESPONSES)) {
      expect(response.lines.length).toBeGreaterThan(0);
      expect(response.body.length).toBeGreaterThan(40);
    }
  });

  it('quedan pendientes de verificación hasta que el equipo las confirme (V5)', () => {
    expect(Object.values(RISK_RESPONSES).every((r) => r.verifiedAt === null)).toBe(true);
  });
});
