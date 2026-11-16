import { useEffect, useState } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import Svg, {
  Circle,
  Ellipse,
  G,
  Line,
  Path,
  Polygon,
  Rect,
  Text as SvgText,
} from 'react-native-svg';

import { useTheme } from '@/ui';

import {
  bodyPath,
  motionAt,
  poseAt,
  skeleton,
  type FigureElement,
  type Hue,
  type Scene,
  type ShapeElement,
} from './engine';

/** Colores vivos de las figuras y objetos (iguales en modo claro y oscuro). */
const VIVID: Partial<Record<Hue, string>> = {
  coral: '#FF7A59',
  mint: '#2FB58F',
  sun: '#F2B21B',
  sky: '#5B8DEF',
  violet: '#9B7BE0',
  leaf: '#5BAA3A',
  wood: '#B0814F',
  white: '#FFFFFF',
};

/** `night`: oscuro en los dos temas (en el oscuro, más que el fondo, para que se siga viendo). */
const NIGHT = { light: '#2B2D42', dark: '#0F0D13' } as const;

function useHues() {
  const { colors, scheme } = useTheme();
  const color = (hue: Hue | 'none' | undefined): string => {
    if (!hue || hue === 'none') return 'none';
    if (hue === 'ink') return colors.ink;
    if (hue === 'night') return NIGHT[scheme];
    if (hue === 'muted') return colors.inkMuted;
    if (hue === 'cream') return colors.surface;
    return VIVID[hue] ?? colors.ink;
  };
  const background = (hue: Hue): string =>
    ({
      mint: colors.mintSoft,
      sun: colors.sunSoft,
      coral: colors.primarySoft,
      sky: colors.infoSoft,
      leaf: colors.successSoft,
    })[hue as 'mint'] ?? colors.surfaceSunken;
  return { color, background, surface: colors.surface, ground: colors.borderStrong };
}

/** Reloj de la animación: avanza de 0 a 1 en `duration` ms y vuelve a empezar. */
function useClock(duration: number, playing: boolean, still: number) {
  const [t, setT] = useState(still);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (alive) setReduced(value);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!playing || reduced) return;
    let frame = 0;
    let last = 0;
    const start = Date.now();
    const tick = () => {
      const now = Date.now();
      // ~30 cuadros por segundo alcanzan para un dibujo simple y ahorran batería.
      if (now - last > 33) {
        last = now;
        setT(((now - start) / duration + still) % 1);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [duration, playing, reduced, still]);

  return playing && !reduced ? t : still;
}

function Figure({
  el,
  t,
  color,
  surface,
}: {
  el: FigureElement;
  t: number;
  color: (h: Hue) => string;
  surface: string;
}) {
  const k = el.scale ?? 1;
  const s = skeleton(poseAt(el.frames, t), k);
  const stroke = color(el.color);
  return (
    <G>
      <Path
        d={bodyPath(s)}
        stroke={stroke}
        strokeWidth={4.2 * Math.max(k, 0.7)}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Circle
        cx={s.head[0]}
        cy={s.head[1]}
        r={s.headR}
        fill={surface}
        stroke={stroke}
        strokeWidth={3.4 * Math.max(k, 0.7)}
      />
    </G>
  );
}

function Shape({
  el,
  t,
  color,
}: {
  el: ShapeElement;
  t: number;
  color: (h: Hue | 'none' | undefined) => string;
}) {
  const m = motionAt(el.frames, t);
  const fill = color(el.fill ?? (el.kind === 'line' ? 'none' : 'ink'));
  const stroke = el.stroke ? color(el.stroke) : 'none';
  const sw = el.sw ?? (el.stroke ? 2.5 : 0);
  const common = {
    fill,
    stroke,
    strokeWidth: sw,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  let node: React.ReactNode = null;
  switch (el.kind) {
    case 'rect':
      node = (
        <Rect
          x={-(el.w ?? 10) / 2}
          y={-(el.h ?? 10) / 2}
          width={el.w ?? 10}
          height={el.h ?? 10}
          rx={el.r ?? 0}
          {...common}
        />
      );
      break;
    case 'circle':
      node = <Circle r={el.r ?? 5} {...common} />;
      break;
    case 'ellipse':
      node = <Ellipse rx={el.rx ?? 8} ry={el.ry ?? 5} {...common} />;
      break;
    case 'line':
      node = (
        <Line
          x1={0}
          y1={0}
          x2={el.x2 ?? 10}
          y2={el.y2 ?? 0}
          {...common}
          stroke={color(el.stroke ?? 'ink')}
          strokeWidth={el.sw ?? 3}
        />
      );
      break;
    case 'path':
      node = <Path d={el.d ?? ''} {...common} />;
      break;
    case 'poly':
      node = <Polygon points={el.points ?? ''} {...common} />;
      break;
    case 'text':
      node = (
        <SvgText
          fontSize={el.size ?? 12}
          fontFamily="Nunito_800ExtraBold"
          fontWeight="800"
          textAnchor="middle"
          fill={fill}
        >
          {el.text ?? ''}
        </SvgText>
      );
      break;
  }
  return (
    <G
      opacity={m.o}
      transform={`translate(${m.x.toFixed(2)} ${m.y.toFixed(2)}) rotate(${m.rot.toFixed(1)}) scale(${m.s.toFixed(3)})`}
    >
      {node}
    </G>
  );
}

/**
 * Dibuja una escena de actividad. Con `playing`, se anima en bucle; si no (o con "reducir
 * movimiento" activado), muestra el cuadro `still`, que sirve de ilustración.
 */
export function ActivityScene({
  scene,
  width = 200,
  playing = false,
  label,
}: {
  scene: Scene;
  width?: number;
  playing?: boolean;
  /** Descripción para lectores de pantalla. */
  label: string;
}) {
  const t = useClock(scene.duration, playing, scene.still);
  const { color, background, surface, ground } = useHues();
  const height = (width * 150) / 200;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={{ width, height }}>
      <Svg width={width} height={height} viewBox="0 0 200 150">
        <Rect x={0} y={0} width={200} height={150} rx={18} fill={background(scene.bg)} />
        {scene.ground === false ? null : (
          <Line
            x1={10}
            y1={131}
            x2={190}
            y2={131}
            stroke={ground}
            strokeWidth={2.5}
            strokeLinecap="round"
            opacity={0.45}
          />
        )}
        {scene.elements.map((el, i) =>
          el.kind === 'figure' ? (
            <Figure key={i} el={el} t={t} color={color} surface={surface} />
          ) : (
            <Shape key={i} el={el} t={t} color={color} />
          ),
        )}
      </Svg>
    </View>
  );
}
