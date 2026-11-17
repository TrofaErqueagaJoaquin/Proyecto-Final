import { ageInMonths } from '@crecer/domain';
import { AGE_STAGES, SPACE_LABELS } from '@crecer/shared';
import { useLocalSearchParams } from 'expo-router';
import { Puzzle, X } from 'lucide-react-native';
import { useMemo, useState, type ComponentProps } from 'react';
import { Pressable, View } from 'react-native';

import { useActiveFamily, useMembers } from '@/features/families/queries';
import {
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
  makeStyles,
  useTheme,
} from '@/ui';
import { minTouchTarget } from '@/ui/tokens';

import { ActivityGrid } from './ActivityTile';
import { activeFilterCount, EMPTY_FILTERS, matchesFilters, type ActivityFilters } from './filters';
import { useActivities, useCategories } from './queries';

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

type Stage = ActivityFilters['stage'];

const useStyles = makeStyles((t) => ({
  kidChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: t.space.sm,
    minHeight: minTouchTarget,
    paddingHorizontal: t.space.lg,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.primarySoft,
  },
}));

function stageForMonths(months: number): Stage {
  return AGE_STAGES.find((s) => months >= s.minMonths && months <= s.maxMonths)?.slug ?? null;
}

function isStage(value: string | undefined): value is NonNullable<Stage> {
  return AGE_STAGES.some((s) => s.slug === value);
}

/** Edad corta para el chip: "8 meses", "1 año", "3 años". */
function shortAge(months: number): string {
  if (months < 12) return months === 1 ? '1 mes' : `${String(months)} meses`;
  const years = Math.floor(months / 12);
  return years === 1 ? '1 año' : `${String(years)} años`;
}

/** El integrante más chico de la familia (con sesión) y la etapa que le corresponde. */
function useYoungestKid(enabled: boolean) {
  const { family } = useActiveFamily();
  const members = useMembers(enabled ? family?.id : undefined);
  return useMemo(() => {
    const now = new Date();
    const youngest = (members.data ?? [])
      .filter((m) => m.archived_at === null)
      .sort((a, b) => b.birth_month.localeCompare(a.birth_month))[0];
    if (!youngest) return null;
    try {
      const months = ageInMonths(youngest.birth_month, now);
      const stage = stageForMonths(months);
      return stage ? { alias: youngest.alias, age: shortAge(months), stage } : null;
    } catch {
      return null;
    }
  }, [members.data]);
}

/**
 * El catálogo de actividades. Se usa en la portada pública (`/actividades`) y, con sesión, dentro
 * del espacio de la familia (`/catalogo`), donde con `kidFilter` arranca filtrado por la edad del
 * más chico. `?etapa=etapa-3-5` lo abre en esa edad (llega desde la lectura de una etapa).
 */
export function ActivityCatalog({
  edges,
  kidFilter = false,
}: {
  edges?: ComponentProps<typeof Screen>['edges'];
  kidFilter?: boolean;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const activities = useActivities();
  const categories = useCategories();
  const { etapa } = useLocalSearchParams<{ etapa?: string }>();
  const paramStage = isStage(etapa) ? etapa : null;
  const youngest = useYoungestKid(kidFilter);
  const kid = kidFilter ? youngest : null;
  const [filters, setFilters] = useState<ActivityFilters>(() => ({
    ...EMPTY_FILTERS,
    stage: paramStage,
  }));
  // Si llega otra etapa por el enlace, se aplica; si no llega ninguna, la del más chico (una vez).
  const [seenParam, setSeenParam] = useState(paramStage);
  const [kidApplied, setKidApplied] = useState(false);
  if (paramStage !== seenParam) {
    setSeenParam(paramStage);
    if (paramStage) setFilters((current) => ({ ...current, stage: paramStage }));
  }
  if (!kidApplied && kid && paramStage === null) {
    setKidApplied(true);
    setFilters((current) => ({ ...current, stage: kid.stage }));
  }
  const kidFiltered = kid !== null && filters.stage === kid.stage;
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
    <Screen edges={edges} maxWidth={960}>
      <Text variant="title">Actividades</Text>
      <Text tone="muted">Tocá una para ver cómo se hace.</Text>

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
      {kidFiltered ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Quitar el filtro para ${kid.alias}`}
          style={styles.kidChip}
          onPress={() => {
            set({ stage: null });
          }}
        >
          <Text variant="bodyStrong" tone="primary">
            {`Para ${kid.alias} (${kid.age})`}
          </Text>
          <X size={18} color={colors.primary} aria-hidden />
        </Pressable>
      ) : null}

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
          <ActivityGrid activities={results} maxContent={960} />
        </>
      )}
    </Screen>
  );
}
