import { COST_LABELS, SPACE_LABELS } from '@crecer/shared';
import { useLocalSearchParams } from 'expo-router';
import { CalendarHeart, Clock, Puzzle, Wallet } from 'lucide-react-native';
import { View } from 'react-native';

import { ActivityIcon, SPACE_ICONS } from '@/features/library/activityVisuals';
import { FamilyActivityActions } from '@/features/library/FamilyActivityActions';
import { useActivity } from '@/features/library/queries';
import { SourceList } from '@/features/library/SourceList';
import {
  Badge,
  Banner,
  Card,
  EmptyState,
  ErrorState,
  EvidenceChip,
  Screen,
  Skeleton,
  Text,
  useTheme,
} from '@/ui';

function ageRange(minMonths: number, maxMonths: number): string {
  const years = (months: number) => Math.floor(months / 12);
  if (maxMonths < 24) return `De ${String(minMonths)} a ${String(maxMonths)} meses`;
  if (minMonths < 12) return `De ${String(minMonths)} meses a ${String(years(maxMonths))} años`;
  return `De ${String(years(minMonths))} a ${String(years(maxMonths))} años`;
}

export default function ActivityScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const activity = useActivity(slug);
  const { colors } = useTheme();

  if (activity.isPending) {
    return (
      <Screen edges={['bottom']}>
        <Skeleton height={40} width="60%" />
        <Skeleton height={280} />
      </Screen>
    );
  }
  if (activity.isError) return <ErrorState onRetry={() => void activity.refetch()} />;
  if (!activity.data) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState icon={Puzzle} title="No encontramos esta actividad" />
      </Screen>
    );
  }

  const a = activity.data;
  const categories = a.activity_category_links.flatMap((link) =>
    link.activity_categories ? [link.activity_categories.code] : [],
  );
  return (
    <Screen edges={['bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <ActivityIcon categories={categories} size={64} />
        <Text variant="title" style={{ flex: 1 }}>
          {a.title}
        </Text>
      </View>
      <Text variant="subheading" tone="muted">
        {a.summary}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        <Badge icon={CalendarHeart}>{ageRange(a.age_min_months, a.age_max_months)}</Badge>
        <Badge icon={Clock}>{`${String(a.duration_min)} min`}</Badge>
        <Badge icon={SPACE_ICONS[a.space]}>
          {SPACE_LABELS[a.space as keyof typeof SPACE_LABELS]}
        </Badge>
        <Badge icon={Wallet}>{COST_LABELS[a.cost_level as keyof typeof COST_LABELS]}</Badge>
        {a.activity_category_links.map((link) =>
          link.activity_categories ? (
            <Badge key={link.activity_categories.code} tone="primary">
              {link.activity_categories.label}
            </Badge>
          ) : null,
        )}
      </View>
      <EvidenceChip label={a.evidence_label} />

      <FamilyActivityActions activityId={a.id} />

      <Card>
        <Text variant="subheading">Para qué sirve</Text>
        <Text>{a.objective}</Text>
        {a.materials.length > 0 ? (
          <>
            <Text variant="subheading">Qué necesitan</Text>
            {a.materials.map((m) => (
              <Text key={m}>• {m}</Text>
            ))}
          </>
        ) : (
          <Text tone="success">No necesitan materiales.</Text>
        )}
      </Card>

      <Card>
        <Text variant="subheading">Paso a paso</Text>
        <View role="list" style={{ gap: 12 }}>
          {a.activity_steps.map((step) => (
            <View
              key={step.position}
              role="listitem"
              style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: colors.primarySoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  variant="bodyStrong"
                  tone="primary"
                  accessibilityLabel={`Paso ${String(step.position)}`}
                >
                  {step.position}
                </Text>
              </View>
              <Text style={{ flex: 1, paddingTop: 2 }}>{step.body}</Text>
            </View>
          ))}
        </View>
      </Card>

      {a.safety_notes ? (
        <Banner tone="caution" title="Seguridad">
          {a.safety_notes}
        </Banner>
      ) : null}

      {a.variants.length > 0 || a.accessibility_notes.length > 0 ? (
        <Card>
          {a.variants.length > 0 ? (
            <>
              <Text variant="subheading">Variantes</Text>
              {a.variants.map((v) => (
                <Text key={v}>• {v}</Text>
              ))}
            </>
          ) : null}
          {a.accessibility_notes.length > 0 ? (
            <>
              <Text variant="subheading">Adaptaciones</Text>
              {a.accessibility_notes.map((v) => (
                <Text key={v}>• {v}</Text>
              ))}
            </>
          ) : null}
        </Card>
      ) : null}

      {a.reviewed_at === null ? (
        <Text variant="small" tone="muted">
          Actividad pendiente de revisión profesional.
        </Text>
      ) : null}
      <Card>
        <SourceList refs={a.activity_sources} />
        {a.activity_sources.length === 0 ? (
          <Text variant="small" tone="muted">
            Propuesta del equipo, sin fuente específica.
          </Text>
        ) : null}
      </Card>
    </Screen>
  );
}
