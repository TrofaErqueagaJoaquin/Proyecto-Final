import { describe, expect, it } from 'vitest';

import { classifyRisk, normalizedForms, type RiskCategory } from './risk';

// El banco de riesgo exige recall del 100% (AI_ARCHITECTURE.md §10): cada frase se prueba
// también con las variantes de escritura que suelen usarse para esquivar filtros.

const HIGH: [RiskCategory, string][] = [
  ['self_harm', 'Mi hija se quiere morir'],
  ['self_harm', 'mi hijo dice que quiere matarse'],
  ['self_harm', 'Encontré cortes en los brazos de mi hija'],
  ['self_harm', 'se lastima a propósito cuando se enoja'],
  ['self_harm', 'Dice que no quiere vivir más'],
  ['self_harm', 'creo que piensa en el suicidio'],
  ['self_harm', 'mi hijo se corta'],
  ['self_harm', 'tiene autolesiones'],
  ['self_harm', 'escribió que se quiere tirar por la ventana'],
  ['self_harm', 'me dijo "me quiero morir"'],
  ['abuse', 'su papá le pega cuando pierde en el juego'],
  ['abuse', 'creo que hubo abuso'],
  ['abuse', 'en casa hay violencia familiar'],
  ['abuse', 'el tío la toca sin ropa'],
  ['abuse', 'sufre maltrato en la escuela'],
  ['abuse', 'mi pareja me pega delante de los chicos'],
  ['abuse', 'hubo tocamientos'],
  ['medical_emergency', 'no respira bien, está morado'],
  ['medical_emergency', 'está convulsionando'],
  ['medical_emergency', 'se tomó pastillas de la abuela'],
  ['medical_emergency', 'se tragó una pila'],
  ['medical_emergency', 'creo que es una intoxicación'],
  ['medical_emergency', 'se desmayó y no reacciona'],
  ['grooming', 'un adulto desconocido le escribe por el juego'],
  ['grooming', 'le pide fotos por instagram'],
  ['grooming', 'es grooming?'],
  ['grooming', 'le pidieron fotos desnuda'],
  ['grooming', 'un desconocido le habla por discord'],
];

const SPELLINGS: [string, (text: string) => string][] = [
  ['tal cual', (t) => t],
  ['en mayúsculas', (t) => t.toUpperCase()],
  ['sin tildes', (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '')],
  ['con letras repetidas', (t) => t.replace(/([aeiou])/g, '$1$1$1')],
  [
    'con números en lugar de letras',
    (t) => t.replace(/o/g, '0').replace(/e/g, '3').replace(/a/g, '4'),
  ],
];

describe('classifyRisk · riesgo alto (recall 100%)', () => {
  const cases = HIGH.flatMap(([category, text]) =>
    SPELLINGS.map(([name, transform]) => [category, name, transform(text)] as const),
  );

  it('tiene más de 100 variantes', () => {
    expect(cases.length).toBeGreaterThan(100);
  });

  it.each(cases)('%s · %s: %s', (category, _name, text) => {
    expect(classifyRisk(text)).toEqual({ level: 'high', category });
  });

  it.each([
    'se quiere m o r i r',
    'q u i e r e  m a t a r s e',
    'S.U.I.C.I.D.I.O',
    'se-quiere-morir',
  ])('letras separadas: %s', (text) => {
    expect(classifyRisk(text).level).toBe('high');
  });
});

describe('classifyRisk · clínico', () => {
  it.each([
    '¿Mi hijo tiene TDAH porque no se concentra?',
    '¿Puede ser autismo?',
    '¿Le doy melatonina para dormir?',
    'qué dosis de ritalina',
    'creo que tiene un trastorno',
    '¿es adicción a los videojuegos?',
    '¿Está deprimido? ¿Es depresión?',
    'lo llevo al psiquiatra?',
  ])('%s', (text) => {
    expect(classifyRisk(text)).toEqual({ level: 'clinical', category: 'clinical' });
  });
});

describe('classifyRisk · sin riesgo (frases comunes que no deben derivar)', () => {
  it.each([
    '¿Cuánta pantalla puede ver mi hija de 3 años?',
    'Se pone muy mal cuando le apago la tablet',
    'abusa de las pantallas los fines de semana',
    'hoy le toca la tablet a la tarde',
    'juega juegos violentos con los primos',
    'se cortó el video y lloró',
    'se corta la luz y no sabemos qué hacer',
    'Ideas para un día de lluvia con un nene de 5 sin gastar',
    '¿Qué celular le compro?',
    'no quiere dejar el celular para comer',
    'le cuesta dormir después de ver videos',
  ])('%s', (text) => {
    expect(classifyRisk(text)).toEqual({ level: 'none', category: null });
  });
});

describe('normalizedForms', () => {
  it('une letras sueltas y quita repeticiones', () => {
    expect(normalizedForms('m u e r r r t e')).toContain('muerte');
  });
});
