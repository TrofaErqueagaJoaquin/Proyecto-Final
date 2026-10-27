import { EVIDENCE_LABELS, type EvidenceLabel } from '@crecer/shared';
import {
  BookOpen,
  Lightbulb,
  PencilLine,
  ShieldCheck,
  Shuffle,
  UserRound,
  type LucideIcon,
} from 'lucide-react-native';
import { View } from 'react-native';

import { Text } from './Text';
import { makeStyles, useTheme } from './theme';

const ICONS: Record<EvidenceLabel, LucideIcon> = {
  recomendacion_oficial: ShieldCheck,
  evidencia_consolidada: BookOpen,
  asociacion_no_causa: Shuffle,
  hipotesis: Lightbulb,
  opinion_profesional: UserRound,
  propuesta_proyecto: PencilLine,
};

const useStyles = makeStyles((t) => ({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: t.space.xs,
    paddingHorizontal: t.space.sm,
    paddingVertical: 4,
    borderRadius: t.radius.pill,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surfaceSunken,
  },
}));

/** Etiqueta de evidencia: ícono + texto (nunca solo color). */
export function EvidenceChip({ label, showHelp = false }: { label: string; showHelp?: boolean }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const info = EVIDENCE_LABELS[label as EvidenceLabel] as
    (typeof EVIDENCE_LABELS)[EvidenceLabel] | undefined;
  if (!info) return null;
  const Icon = ICONS[label as EvidenceLabel];
  return (
    <View style={{ gap: 4 }}>
      <View style={styles.chip} accessibilityLabel={`Tipo de evidencia: ${info.label}`} accessible>
        <Icon color={colors.accent} size={14} aria-hidden />
        <Text variant="caption">{info.label}</Text>
      </View>
      {showHelp ? (
        <Text variant="small" tone="muted">
          {info.description}
        </Text>
      ) : null}
    </View>
  );
}
