import { RISK_RESPONSES } from '@crecer/domain';
import { Link } from 'expo-router';
import { HeartHandshake, House, Phone, Play, RefreshCw, Square } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { BroteSays } from '@/features/brote/Brote';
import { feedback } from '@/features/feedback/feedback';
import { Button, Card, ChipGroup, makeStyles, Screen, Text, useTheme } from '@/ui';

/**
 * Pausa para vos (rediseño de 2026): quien llega a la app suele estar cansado o preocupado. Un
 * minuto para respirar, una frase amable y, si hace falta, a quién pedir ayuda. El ánimo NO se
 * guarda: es solo para que Brote responda acorde.
 */

const MOODS = [
  { value: 'bien', label: 'Bien' },
  { value: 'cansancio', label: 'Con cansancio' },
  { value: 'estres', label: 'Con mucho estrés' },
  { value: 'limite', label: 'Al límite' },
] as const;
type Mood = (typeof MOODS)[number]['value'];

// Lo que dice Brote, corto (hasta unos 60 caracteres) para que el globo no ocupe la pantalla.
const ANSWERS: Record<Mood, string> = {
  bien: '¡Qué lindo! Regalate cinco minutos para algo que te guste.',
  cansancio: 'Criar cansa. Hoy alcanza con una sola cosa.',
  estres: 'Gracias por contarlo. Respirá conmigo un minuto.',
  limite: 'Lo que sentís importa. Pedir ayuda también es cuidar.',
};

const PHRASES = [
  'No existe la familia perfecta: existe la que sigue intentando.',
  'Un rato de atención plena vale más que una tarde entera a medias.',
  'Equivocarse y pedir perdón también enseña.',
  'Tu calma es el mejor regalo que le podés dar hoy.',
  'Lo estás haciendo mejor de lo que creés.',
  'Hoy alcanza con estar. Mañana es otro día.',
  'Cuidarte no es egoísmo: es parte de cuidar.',
  'Los chicos no necesitan adultos perfectos, necesitan adultos presentes.',
];

const PHASES = [
  { label: 'Inhalá', seconds: 4, scale: 1 },
  { label: 'Sostené', seconds: 2, scale: 1 },
  { label: 'Exhalá', seconds: 6, scale: 0.7 },
] as const;
/** Tamaño chico del círculo: 200 × 0,7 = 140 px, nunca menos. */
const SMALL = 0.7;
const CYCLES = 5; // 5 × 12 s = 1 minuto

// Emergencias (911) y la Línea 135: las de la respuesta fija de riesgo del asistente.
const HELP_LINES = RISK_RESPONSES.self_harm.lines.filter((l) => l.phone !== '102');

const useStyles = makeStyles((t) => ({
  stage: { alignItems: 'center', justifyContent: 'center', height: 250 },
  halo: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: t.colors.mintSoft,
  },
  circle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.mint,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.md,
    padding: t.space.md,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.surfaceSunken,
  },
  phrase: {
    padding: t.space.xl,
    borderRadius: t.radius.lg,
    backgroundColor: t.colors.sunSoft,
    gap: t.space.md,
  },
}));

function Breathing() {
  const styles = useStyles();
  const reduced = useReducedMotion();
  const [step, setStep] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scale = useSharedValue(SMALL);

  const phase = step === null ? null : PHASES[step % PHASES.length];
  const cycle = step === null ? 0 : Math.floor(step / PHASES.length) + 1;
  const finished = step === PHASES.length * CYCLES;

  useEffect(() => {
    if (step === null || finished || !phase) return;
    scale.set(
      reduced
        ? phase.scale
        : withTiming(phase.scale, {
            duration: phase.seconds * 1000,
            easing: Easing.inOut(Easing.sin),
          }),
    );
    feedback('tap');
    timer.current = setTimeout(() => {
      const nextStep = step + 1;
      if (nextStep === PHASES.length * CYCLES) feedback('bell');
      setStep(nextStep);
    }, phase.seconds * 1000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [step, finished, phase, reduced, scale]);

  const circleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <Card>
      <Text variant="heading">Un minuto para respirar</Text>
      <Text tone="muted">Seguí el círculo: crece cuando inhalás, se achica cuando exhalás.</Text>
      <View style={styles.stage}>
        <View style={styles.halo} />
        <Animated.View style={[styles.circle, circleStyle]} />
      </View>
      {/* El texto va debajo del círculo, sobre la tarjeta: se lee igual en modo claro y oscuro. */}
      <Text variant="subheading" center accessibilityLiveRegion="polite">
        {finished ? '¡Listo!' : (phase?.label ?? 'Tu minuto')}
      </Text>
      {step !== null && !finished ? (
        <Text center tone="muted">{`Respiración ${String(cycle)} de ${String(CYCLES)}`}</Text>
      ) : null}
      {finished ? (
        <>
          <Text center>¿Mejor? Cuando quieras seguimos.</Text>
          <Link href="/hoy" asChild>
            <Button label="Volver a Hoy" icon={House} fullWidth />
          </Link>
          <Button
            label="Otra vez"
            icon={RefreshCw}
            variant="secondary"
            fullWidth
            onPress={() => {
              scale.set(SMALL);
              setStep(0);
            }}
          />
        </>
      ) : step === null ? (
        <Button
          label="Empezar"
          icon={Play}
          fullWidth
          onPress={() => {
            scale.set(SMALL);
            setStep(0);
          }}
        />
      ) : (
        <Button
          label="Terminar"
          icon={Square}
          variant="secondary"
          fullWidth
          onPress={() => {
            if (timer.current) clearTimeout(timer.current);
            scale.set(withTiming(SMALL));
            setStep(null);
          }}
        />
      )}
    </Card>
  );
}

export default function PauseScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const [mood, setMood] = useState<Mood | null>(null);
  const [phrase, setPhrase] = useState(() => Math.floor(Math.random() * PHRASES.length));

  return (
    <Screen>
      <Text variant="title">Pausa para vos</Text>
      <BroteSays mood="calma" size={104}>
        {mood ? ANSWERS[mood] : 'Antes de seguir, un momento para vos.'}
      </BroteSays>
      <ChipGroup
        label="¿Cómo estás hoy?"
        options={MOODS}
        value={mood ?? ''}
        onChange={(value) => {
          if (value === '') return;
          feedback('tap');
          setMood(value);
        }}
      />

      {mood === 'limite' ? (
        <Animated.View entering={FadeIn}>
          <Card>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <HeartHandshake color={colors.danger} size={28} aria-hidden />
              <Text variant="subheading">No estás en soledad</Text>
            </View>
            <Text>
              Hablá con alguien de confianza. Si necesitás acompañamiento, podés buscar un
              profesional en la app.
            </Text>
            <Text>Si sentís que no podés más, llamá:</Text>
            {/* Las mismas líneas que el asistente (V5: pendientes de verificación, se avisa). */}
            {HELP_LINES.map((line) => (
              <Pressable
                key={line.phone}
                accessibilityRole="button"
                accessibilityLabel={`Llamar a ${line.label}, ${line.phone}`}
                style={styles.line}
                onPress={() => {
                  void Linking.openURL(`tel:${line.phone}`);
                }}
              >
                <Phone color={colors.primary} size={20} aria-hidden />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{`${line.label} · ${line.phone}`}</Text>
                  <Text variant="small" tone="muted">
                    {line.description}
                  </Text>
                </View>
              </Pressable>
            ))}
            {RISK_RESPONSES.self_harm.verifiedAt === null ? (
              <Text variant="small" tone="muted">
                Líneas tomadas de fuentes oficiales; el equipo está verificando su vigencia en Mar
                del Plata.
              </Text>
            ) : null}
            <Link href="/profesionales" asChild>
              <Button label="Buscar un profesional" variant="secondary" icon={HeartHandshake} />
            </Link>
          </Card>
        </Animated.View>
      ) : null}

      <Breathing />

      <View style={styles.phrase}>
        <Animated.View key={phrase} entering={FadeIn.duration(500)}>
          <Text variant="heading">{PHRASES[phrase]}</Text>
        </Animated.View>
        <Button
          label="Otra frase"
          variant="ghost"
          icon={RefreshCw}
          onPress={() => {
            feedback('tap');
            setPhrase((p) => (p + 1) % PHRASES.length);
          }}
        />
      </View>
    </Screen>
  );
}
