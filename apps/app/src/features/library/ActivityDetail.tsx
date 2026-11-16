import { COST_LABELS, SPACE_LABELS } from '@crecer/shared';
import {
  CalendarHeart,
  Clock,
  PackageOpen,
  Puzzle,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { useWindowDimensions, View } from 'react-native';

import { ActivityScene, sceneFor } from '@/features/animations';
import {
  Banner,
  Disclosure,
  EmptyState,
  ErrorState,
  EvidenceChip,
  makeStyles,
  Skeleton,
  Text,
  useTheme,
} from '@/ui';

import { SPACE_ICONS } from './activityVisuals';
import { FamilyActivityActions } from './FamilyActivityActions';
import { useActivity } from './queries';
import { SourceList } from './SourceList';

export function ageRange(minMonths: number, maxMonths: number): string {
  const years = (months: number) => Math.floor(months / 12);
  if (maxMonths < 24) return `${String(minMonths)} a ${String(maxMonths)} meses`;
  if (minMonths < 12) return `${String(minMonths)} meses a ${String(years(maxMonths))} años`;
  return `${String(years(minMonths))} a ${String(years(maxMonths))} años`;
}

const useStyles = makeStyles((t) => ({
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm },
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.xs,
    paddingVertical: t.space.xs,
    paddingHorizontal: t.space.md,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.surfaceSunken,
  },
  steps: { gap: t.space.md },
  step: { flexDirection: 'row', gap: t.space.md, alignItems: 'flex-start' },
  num: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: t.colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));

function Fact({ icon: Icon, label }: { icon: LucideIcon | undefined; label: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.fact}>
      {Icon ? <Icon color={colors.ink} size={18} aria-hidden /> : null}
      <Text variant="label">{label}</Text>
    </View>
  );
}

/**
 * Todo sobre una actividad, en orden de importancia: la guía animada, qué es, los pasos y los
 * botones. Lo demás (para qué sirve, materiales, variantes, fuentes) queda plegado.
 */
export function ActivityDetail({
  slug,
  planItemId,
  onDone,
}: {
  slug: string;
  /** Si se abrió desde el plan, "Realizado" completa ese ítem. */
  planItemId?: string;
  /** Después de marcarla como realizada (para cerrar la ventana y festejar). */
  onDone?: (activity: { id: string; slug: string; title: string }) => void;
}) {
  const styles = useStyles();
  const activity = useActivity(slug);
  const { width } = useWindowDimensions();
  const sceneWidth = Math.min(width - 48, 560);

  if (activity.isPending) return <Skeleton height={320} />;
  if (activity.isError) return <ErrorState onRetry={() => void activity.refetch()} />;
  if (!activity.data) return <EmptyState icon={Puzzle} title="No encontramos esta actividad" />;

  const a = activity.data;
  const categories = a.activity_category_links.flatMap((link) =>
    link.activity_categories ? [link.activity_categories.code] : [],
  );

  return (
    <View style={{ gap: 18 }}>
      <ActivityScene
        scene={sceneFor(a.slug, categories)}
        width={sceneWidth}
        playing
        label={`Animación: ${a.title}`}
      />
      <Text variant="subheading">{a.summary}</Text>
      <View style={styles.facts}>
        <Fact icon={Clock} label={`${String(a.duration_min)} min`} />
        <Fact icon={CalendarHeart} label={ageRange(a.age_min_months, a.age_max_months)} />
        <Fact
          icon={SPACE_ICONS[a.space]}
          label={SPACE_LABELS[a.space as keyof typeof SPACE_LABELS]}
        />
        <Fact icon={Wallet} label={COST_LABELS[a.cost_level as keyof typeof COST_LABELS]} />
        {a.materials.length === 0 ? <Fact icon={PackageOpen} label="Sin materiales" /> : null}
      </View>

      <FamilyActivityActions
        activityId={a.id}
        planItemId={planItemId}
        onDone={() => onDone?.({ id: a.id, slug: a.slug, title: a.title })}
      />

      {a.activity_steps.length > 0 ? (
        <View style={styles.steps} role="list">
          <Text variant="heading">Cómo se hace</Text>
          {a.activity_steps.map((step) => (
            <View key={step.position} style={styles.step} role="listitem">
              <View style={styles.num}>
                <Text
                  variant="bodyStrong"
                  accessibilityLabel={`Paso ${String(step.position)}`}
                  style={{ color: '#2B2D42' }}
                >
                  {step.position}
                </Text>
              </View>
              <Text style={{ flex: 1, paddingTop: 4 }}>{step.body}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {a.safety_notes ? (
        <Banner tone="caution" title="Cuidado">
          {a.safety_notes}
        </Banner>
      ) : null}

      <Disclosure title="Más información">
        <Text variant="bodyStrong">Para qué sirve</Text>
        <Text>{a.objective}</Text>
        {a.materials.length > 0 ? (
          <>
            <Text variant="bodyStrong">Qué necesitan</Text>
            {a.materials.map((m, i) => (
              <Text key={`${String(i)}-${m}`}>• {m}</Text>
            ))}
          </>
        ) : null}
        {a.variants.length > 0 ? (
          <>
            <Text variant="bodyStrong">Variantes</Text>
            {a.variants.map((v, i) => (
              <Text key={`${String(i)}-${v}`}>• {v}</Text>
            ))}
          </>
        ) : null}
        {a.accessibility_notes.length > 0 ? (
          <>
            <Text variant="bodyStrong">Adaptaciones</Text>
            {a.accessibility_notes.map((v, i) => (
              <Text key={`${String(i)}-${v}`}>• {v}</Text>
            ))}
          </>
        ) : null}
        <EvidenceChip label={a.evidence_label} />
        {a.reviewed_at === null ? (
          <Text variant="small" tone="muted">
            Pendiente de revisión profesional.
          </Text>
        ) : null}
      </Disclosure>

      <Disclosure
        title={
          a.activity_sources.length > 0
            ? `Fuentes (${String(a.activity_sources.length)})`
            : 'Fuentes'
        }
      >
        <SourceList refs={a.activity_sources} heading={false} />
        {a.activity_sources.length === 0 ? (
          <Text variant="small" tone="muted">
            Propuesta del equipo, sin fuente específica.
          </Text>
        ) : null}
      </Disclosure>
    </View>
  );
}
