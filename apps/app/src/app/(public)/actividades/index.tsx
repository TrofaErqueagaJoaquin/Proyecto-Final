import { AGE_STAGES, COST_LABELS, SPACE_LABELS } from '@crecer/shared';
import { Puzzle } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import {
  activeFilterCount,
  EMPTY_FILTERS,
  matchesFilters,
  type ActivityFilters,
} from '@/features/library/filters';
import { LinkCard } from '@/features/library/LinkCard';
import { useActivities, useCategories } from '@/features/library/queries';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  ChipGroup,
  EmptyState,
  ErrorState,
  Screen,
  Skeleton,
  Text,
  TextField,
} from '@/ui';

const STAGE_OPTIONS = AGE_STAGES.map((s) => ({ value: s.slug, label: s.label }));
const MINUTE_OPTIONS = [
  { value: '10', label: 'Hasta 10 min' },
  { value: '20', label: 'Hasta 20 min' },
  { value: '30', label: 'Hasta 30 min' },
] as const;
const SPACE_OPTIONS = (Object.keys(SPACE_LABELS) as (keyof typeof SPACE_LABELS)[]).map((value) => ({
  value,
  label: SPACE_LABELS[value],
}));

export default function ActivitiesScreen() {
  const activities = useActivities();
  const categories = useCategories();
  const [filters, setFilters] = useState<ActivityFilters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const set = (changes: Partial<ActivityFilters>) => {
    setFilters((current) => ({ ...current, ...changes }));
  };

  const results = useMemo(
    () => (activities.data ?? []).filter((a) => matchesFilters(a, filters)),
    [activities.data, filters],
  );
  const active = activeFilterCount(filters);

  return (
    <Screen edges={['bottom']} maxWidth={960}>
      <Text variant="title">Actividades</Text>
      <Text tone="muted">
        Ideas para hacer en casa o cerca, con poco tiempo y lo que tengan a mano.
      </Text>

      <TextField
        label="Buscar"
        placeholder="Por ejemplo: calma, plaza, cuento"
        value={filters.query}
        onChangeText={(query) => {
          set({ query });
        }}
        autoCapitalize="none"
        inputMode="search"
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button
          label={
            showFilters ? 'Ocultar filtros' : `Filtros${active > 0 ? ` (${String(active)})` : ''}`
          }
          variant="secondary"
          onPress={() => {
            setShowFilters((value) => !value);
          }}
        />
        {active > 0 ? (
          <Button
            label="Limpiar"
            variant="ghost"
            onPress={() => {
              setFilters(EMPTY_FILTERS);
            }}
          />
        ) : null}
      </View>

      {showFilters ? (
        <Card>
          <ChipGroup
            label="Edad"
            options={STAGE_OPTIONS}
            value={filters.stage}
            onChange={(stage) => {
              set({ stage: filters.stage === stage ? null : stage });
            }}
          />
          <ChipGroup
            label="Tiempo disponible"
            options={MINUTE_OPTIONS}
            value={filters.maxMinutes === null ? null : (String(filters.maxMinutes) as '10')}
            onChange={(value) => {
              const minutes = Number(value) as 10 | 20 | 30;
              set({ maxMinutes: filters.maxMinutes === minutes ? null : minutes });
            }}
          />
          <ChipGroup
            label="Espacio"
            options={SPACE_OPTIONS}
            value={filters.space}
            onChange={(space) => {
              set({ space: filters.space === space ? null : space });
            }}
          />
          {categories.data ? (
            <ChipGroup
              label="Tipo de actividad"
              options={categories.data.map((c) => ({ value: c.code, label: c.label }))}
              value={filters.category}
              onChange={(category) => {
                set({ category: filters.category === category ? null : category });
              }}
            />
          ) : null}
          <Checkbox
            checked={filters.noMaterials}
            onChange={(noMaterials) => {
              set({ noMaterials });
            }}
            label="Sin materiales"
          />
          <Checkbox
            checked={filters.freeOnly}
            onChange={(freeOnly) => {
              set({ freeOnly });
            }}
            label="Solo gratis"
          />
        </Card>
      ) : null}

      {activities.isPending ? (
        <Skeleton height={300} />
      ) : activities.isError ? (
        <ErrorState onRetry={() => void activities.refetch()} />
      ) : results.length === 0 ? (
        <EmptyState
          icon={Puzzle}
          title="No hay actividades con esos filtros"
          description="Probá sacar algún filtro."
          action={
            <Button
              label="Limpiar filtros"
              variant="secondary"
              onPress={() => {
                setFilters(EMPTY_FILTERS);
              }}
            />
          }
        />
      ) : (
        <>
          <Text variant="small" tone="muted" accessibilityLiveRegion="polite">
            {results.length === 1 ? '1 actividad' : `${String(results.length)} actividades`}
          </Text>
          {results.map((activity) => (
            <LinkCard
              key={activity.id}
              href={`/actividades/${activity.slug}`}
              title={activity.title}
              description={activity.summary}
              footer={
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  <Badge>{`${String(activity.duration_min)} min`}</Badge>
                  <Badge>{SPACE_LABELS[activity.space as keyof typeof SPACE_LABELS]}</Badge>
                  <Badge>{COST_LABELS[activity.cost_level as keyof typeof COST_LABELS]}</Badge>
                  {activity.materials.length === 0 ? (
                    <Badge tone="primary">Sin materiales</Badge>
                  ) : null}
                </View>
              }
            />
          ))}
        </>
      )}
    </Screen>
  );
}
