import { Baby, Lightbulb, Moon, Sprout } from 'lucide-react-native';

import { FALLBACK_VISUAL, shortTitle, situationVisual, stageVisual } from './libraryVisuals';

describe('shortTitle', () => {
  it('saca el "Ficha X ·" del principio', () => {
    expect(shortTitle('Ficha B · Necesita la pantalla para calmarse')).toBe(
      'Necesita la pantalla para calmarse',
    );
  });

  it('deja igual los títulos sin prefijo', () => {
    expect(shortTitle('Rabietas en el súper')).toBe('Rabietas en el súper');
  });
});

describe('situationVisual', () => {
  it('usa el ícono de las fichas conocidas', () => {
    expect(situationVisual('ficha-a-bebe-videos').icon).toBe(Baby);
  });

  it('adivina por palabras para fichas nuevas', () => {
    expect(situationVisual('no-quiere-ir-a-dormir', 'No quiere ir a dormir').icon).toBe(Moon);
  });

  it('tiene un ícono de respaldo', () => {
    expect(situationVisual('algo-nuevo', 'Algo nuevo')).toBe(FALLBACK_VISUAL);
    expect(FALLBACK_VISUAL.icon).toBe(Lightbulb);
  });
});

describe('stageVisual', () => {
  it('tiene un ícono por etapa y uno de respaldo', () => {
    expect(stageVisual('etapa-0-2').icon).toBe(Baby);
    expect(stageVisual('etapa-nueva').icon).toBe(Sprout);
  });
});
