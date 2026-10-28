import { RISK_RESPONSES, type HighRiskCategory } from '@crecer/domain';
import type { AssistantCitation } from '@crecer/shared';
import { Link } from 'expo-router';
import { BookOpen, LifeBuoy, Phone } from 'lucide-react-native';
import { Linking, Pressable, View } from 'react-native';

import { EvidenceChip, makeStyles, Text, useTheme } from '@/ui';
import { minTouchTarget } from '@/ui/tokens';

import { boldSegments, groupCitations } from './format';

const useStyles = makeStyles((t) => ({
  bubble: {
    maxWidth: '88%',
    padding: t.space.md,
    borderRadius: t.radius.lg,
    gap: t.space.sm,
  },
  user: { alignSelf: 'flex-end', backgroundColor: t.colors.primarySoft },
  assistant: {
    alignSelf: 'flex-start',
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    // Los títulos largos se cortan en líneas dentro del chip en vez de salirse de la burbuja.
    maxWidth: '100%',
    minHeight: minTouchTarget - 8,
    paddingHorizontal: t.space.sm,
    borderRadius: t.radius.pill,
    borderWidth: 1,
    borderColor: t.colors.borderStrong,
  },
  risk: {
    gap: t.space.md,
    padding: t.space.lg,
    borderRadius: t.radius.lg,
    borderWidth: 2,
    borderColor: t.colors.caution,
    backgroundColor: t.colors.cautionSoft,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.md,
    minHeight: minTouchTarget + 8,
    paddingHorizontal: t.space.md,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.surface,
  },
  consult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.sm,
    padding: t.space.md,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.infoSoft,
  },
}));

export function UserBubble({ text }: { text: string }) {
  const styles = useStyles();
  return (
    <View style={[styles.bubble, styles.user]}>
      <Text>{text}</Text>
    </View>
  );
}

/** Respuesta con chips de citas (F1, F2…) que abren la ficha (UX_AND_NAVIGATION.md §5.3). */
export function AssistantBubble({
  text,
  citations,
  pending,
  rehearsal,
}: {
  text: string;
  citations: AssistantCitation[];
  pending?: boolean;
  /** Respuesta del modelo de ensayo: nunca se presenta como generada en vivo (EXPOTEC_DEMO.md §6). */
  rehearsal?: boolean;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={[styles.bubble, styles.assistant]} accessibilityLiveRegion="polite">
      {rehearsal ? (
        <Text variant="caption" tone="muted">
          Respuesta de ensayo (sin conexión al modelo)
        </Text>
      ) : null}
      <Text tone={pending && !text ? 'muted' : 'default'}>
        {text
          ? boldSegments(text).map((segment, index) =>
              segment.bold ? (
                <Text key={index} variant="bodyStrong">
                  {segment.text}
                </Text>
              ) : (
                segment.text
              ),
            )
          : 'Buscando en fichas revisadas…'}
      </Text>
      {citations.length > 0 ? (
        <View style={styles.chips}>
          {groupCitations(citations).map((c) =>
            c.urlPath ? (
              <Link key={c.ref} href={c.urlPath} asChild>
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={`${c.ref}: ${c.title}`}
                  style={styles.chip}
                >
                  <BookOpen size={14} color={colors.primary} aria-hidden />
                  <Text variant="caption" tone="primary" style={{ flexShrink: 1 }}>
                    {`${c.ref} · ${c.title}`}
                  </Text>
                </Pressable>
              </Link>
            ) : (
              <View key={c.ref} style={styles.chip}>
                <BookOpen size={14} color={colors.inkMuted} aria-hidden />
                <Text variant="caption" style={{ flexShrink: 1 }}>
                  {`${c.ref} · ${c.title}`}
                </Text>
              </View>
            ),
          )}
        </View>
      ) : null}
      {citations.length > 0 ? (
        <View style={styles.chips}>
          {[...new Set(citations.map((c) => c.evidenceLabel))].map((label) => (
            <EvidenceChip key={label} label={label} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Tarjeta de ayuda destacada en lugar de una burbuja de chat (§5.3), con botones para llamar. */
export function RiskCard({ category }: { category: HighRiskCategory }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const response = RISK_RESPONSES[category];
  return (
    <View style={styles.risk} role="alert">
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <LifeBuoy color={colors.caution} size={24} aria-hidden />
        <Text variant="subheading" style={{ flex: 1 }}>
          {response.title}
        </Text>
      </View>
      <Text>{response.body}</Text>
      {response.lines.map((line) => (
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
      {response.verifiedAt === null ? (
        <Text variant="small" tone="muted">
          Líneas tomadas de fuentes oficiales; el equipo está verificando su vigencia en Mar del
          Plata.
        </Text>
      ) : null}
    </View>
  );
}

export function WhenToConsultCard() {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Link href="/cuando-consultar" asChild>
      <Pressable accessibilityRole="link" style={styles.consult}>
        <BookOpen color={colors.info} size={20} aria-hidden />
        <Text style={{ flex: 1 }}>
          Esto es para conversar con un profesional. Mirá “Cuándo consultar”.
        </Text>
      </Pressable>
    </Link>
  );
}
