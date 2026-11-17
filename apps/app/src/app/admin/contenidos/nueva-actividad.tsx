import { COST_LABELS, SPACE_LABELS, type EvidenceLabel } from '@crecer/shared';
import { Plus, Save, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';

import {
  AGE_STAGE_OPTIONS,
  agesFromStages,
  CreatedView,
  DetailsDisclosure,
  EvidencePicker,
  FormWithPreview,
  IconButton,
  PublishChoice,
  SourcePicker,
} from '@/features/admin/ContentFormParts';
import { useCreateActivity, usePermissions } from '@/features/admin/queries';
import { linesToList, slugify } from '@/features/admin/slug';
import { ActivityScene, sceneFor } from '@/features/animations';
import { useFieldErrors } from '@/features/forms/useFieldErrors';
import { useUnsavedGuard } from '@/features/forms/useUnsavedGuard';
import { ageRange } from '@/features/library/ActivityDetail';
import { useCategories } from '@/features/library/queries';
import {
  Banner,
  Button,
  Card,
  ChipGroup,
  Disclosure,
  ErrorBanner,
  ErrorState,
  Screen,
  Skeleton,
  Text,
  TextField,
} from '@/ui';

const DURATIONS = ['5', '10', '15', '20', '30', '45', '60'].map((m) => ({
  value: m,
  label: `${m} min`,
}));
const SPACES = Object.entries(SPACE_LABELS).map(([value, label]) => ({
  value: value as keyof typeof SPACE_LABELS,
  label,
}));
const COSTS = Object.entries(COST_LABELS).map(([value, label]) => ({
  value: value as keyof typeof COST_LABELS,
  label,
}));

// Los mismos topes que la base (admin_create_activity y la tabla activities).
const MAX_TITLE = 120;
const MAX_SUMMARY = 400;
const MAX_STEP = 500;
const MAX_STEPS = 12;
const MAX_CATEGORIES = 4;
const MAX_MATERIALS = 20;

/** Qué falta o sobra en cada campo (`undefined` = está bien). */
function activityErrors(input: {
  title: string;
  summary: string;
  steps: string[];
  categories: string[];
  stages: string[];
  materials: string;
}) {
  const title = input.title.trim();
  const summary = input.summary.trim();
  const steps = input.steps.map((s) => s.trim()).filter((s) => s !== '');
  return {
    title:
      title === ''
        ? 'Poné un nombre.'
        : title.length > MAX_TITLE
          ? `Hasta ${String(MAX_TITLE)} letras.`
          : undefined,
    summary:
      summary === ''
        ? 'Contá en una frase de qué se trata.'
        : summary.length > MAX_SUMMARY
          ? `Hasta ${String(MAX_SUMMARY)} letras.`
          : undefined,
    steps:
      steps.length === 0
        ? 'Escribí al menos un paso.'
        : steps.length > MAX_STEPS
          ? `Hasta ${String(MAX_STEPS)} pasos.`
          : steps.some((s) => s.length > MAX_STEP)
            ? `Cada paso, hasta ${String(MAX_STEP)} letras.`
            : undefined,
    categories:
      input.categories.length === 0
        ? 'Elegí al menos una categoría.'
        : input.categories.length > MAX_CATEGORIES
          ? `Hasta ${String(MAX_CATEGORIES)} categorías.`
          : undefined,
    stages: agesFromStages(input.stages) ? undefined : 'Elegí al menos una edad.',
    materials:
      linesToList(input.materials).length > MAX_MATERIALS
        ? `Hasta ${String(MAX_MATERIALS)} materiales.`
        : undefined,
  };
}

function ActivityPreview({
  title,
  summary,
  steps,
  categories,
  stages,
  duration,
  wide,
}: {
  title: string;
  summary: string;
  steps: string[];
  categories: string[];
  stages: string[];
  duration: string;
  wide: boolean;
}) {
  const { width } = useWindowDimensions();
  const ages = agesFromStages(stages);
  const filled = steps.filter((s) => s.trim() !== '');
  return (
    <Card style={{ gap: 12 }}>
      <Text variant="label" tone="muted">
        Así la van a ver las familias
      </Text>
      <ActivityScene
        scene={sceneFor(slugify(title, 'actividad'), categories)}
        width={wide ? 340 : Math.min(width - 72, 420)}
        playing
        label=""
      />
      <Text variant="heading">{title.trim() || 'Nombre de la actividad'}</Text>
      {summary.trim() ? <Text>{summary}</Text> : null}
      <Text variant="small" tone="muted">
        {[`${duration} min`, ages ? ageRange(ages.min, ages.max) : null]
          .filter(Boolean)
          .join(' · ')}
      </Text>
      {filled.map((step, i) => (
        <Text key={i}>{`${String(i + 1)}. ${step}`}</Text>
      ))}
      <Text variant="small" tone="muted">
        El dibujo sale de la primera categoría que elijas.
      </Text>
    </Card>
  );
}

/** Cargar una actividad nueva desde el panel (ADR-036). */
export default function NewActivityScreen() {
  const permissions = usePermissions();
  const canPublish = permissions.has('content.publish');
  const categories = useCategories();
  const create = useCreateActivity();
  const { width } = useWindowDimensions();
  const wide = width >= 1000;

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [steps, setSteps] = useState<string[]>(['', '']);
  const [cats, setCats] = useState<string[]>([]);
  const [stages, setStages] = useState<string[]>(['etapa-3-5']);
  const [duration, setDuration] = useState('10');
  const [space, setSpace] = useState<keyof typeof SPACE_LABELS>('indoor');
  const [cost, setCost] = useState<keyof typeof COST_LABELS>('free');
  const [materials, setMaterials] = useState('');
  const [objective, setObjective] = useState('');
  const [safety, setSafety] = useState('');
  const [evidence, setEvidence] = useState<EvidenceLabel>('propuesta_proyecto');
  const [sources, setSources] = useState<string[]>([]);
  const [publish, setPublish] = useState(true);
  const [created, setCreated] = useState<{
    slug: string;
    title: string;
    published: boolean;
  } | null>(null);
  const fields = useFieldErrors(
    activityErrors({ title, summary, steps, categories: cats, stages, materials }),
  );
  // Si cargó algo y se va sin guardar, se pregunta antes (lo de fábrica no cuenta).
  const guard = useUnsavedGuard(
    created === null &&
      ([title, summary, materials, objective, safety, ...steps].some((t) => t.trim() !== '') ||
        cats.length > 0 ||
        sources.length > 0),
  );

  const reset = () => {
    setTitle('');
    setSummary('');
    setSteps(['', '']);
    setCats([]);
    setMaterials('');
    setObjective('');
    setSafety('');
    setSources([]);
    fields.reset();
    setCreated(null);
  };

  if (created) {
    return (
      <Screen maxWidth={640}>
        <CreatedView
          title={created.title}
          published={created.published}
          viewHref={`/actividades/${created.slug}`}
          anotherLabel="Cargar otra actividad"
          onAnother={reset}
        />
      </Screen>
    );
  }

  const submit = () => {
    const ages = agesFromStages(stages);
    if (!fields.attempt() || !ages) return;
    const willPublish = canPublish && publish;
    create.mutate(
      {
        slug: slugify(title, 'actividad'),
        title: title.trim(),
        summary: summary.trim(),
        objective: objective.trim(),
        steps: steps.map((s) => s.trim()).filter((s) => s !== ''),
        categories: cats,
        age_min_months: ages.min,
        age_max_months: ages.max,
        duration_min: Number(duration),
        space,
        cost_level: cost,
        materials: linesToList(materials),
        safety_notes: safety.trim(),
        evidence_label: evidence,
        source_ids: sources,
        publish: willPublish,
      },
      {
        onSuccess: (result) => {
          setCreated({ slug: result.slug, title: title.trim(), published: willPublish });
        },
      },
    );
  };

  const stepsError = fields.shown('steps');
  const form = (
    <>
      <TextField
        label="Nombre"
        hint="Corto y claro. Ej.: Rayuela en el pasillo."
        value={title}
        onChangeText={setTitle}
        {...fields.field('title')}
        maxLength={MAX_TITLE}
      />
      <TextField
        label="De qué se trata"
        hint="Una o dos frases."
        value={summary}
        onChangeText={setSummary}
        onBlur={fields.touch('summary')}
        error={fields.shown('summary')}
        multiline
        maxLength={MAX_SUMMARY}
      />

      <View style={{ gap: 10 }}>
        <Text variant="label">Cómo se hace</Text>
        {steps.map((step, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 4, alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <TextField
                label={`Paso ${String(i + 1)}`}
                value={step}
                onChangeText={(text) => {
                  setSteps(steps.map((s, j) => (j === i ? text : s)));
                }}
                onBlur={fields.touch('steps')}
                multiline
                maxLength={MAX_STEP}
              />
            </View>
            {steps.length > 1 ? (
              <IconButton
                icon={Trash2}
                label={`Quitar paso ${String(i + 1)}`}
                onPress={() => {
                  setSteps(steps.filter((_, j) => j !== i));
                }}
              />
            ) : null}
          </View>
        ))}
        {stepsError ? (
          <Text variant="small" tone="danger" role="alert">
            {stepsError}
          </Text>
        ) : null}
        {steps.length < MAX_STEPS ? (
          <Button
            label="Agregar un paso"
            variant="secondary"
            icon={Plus}
            onPress={() => {
              setSteps([...steps, '']);
            }}
          />
        ) : null}
      </View>

      {categories.isError ? (
        <ErrorState error={categories.error} onRetry={() => void categories.refetch()} />
      ) : categories.isPending ? (
        <Skeleton height={56} />
      ) : (
        <ChipGroup
          multiple
          label={`Categorías (hasta ${String(MAX_CATEGORIES)})`}
          options={(categories.data ?? []).map((c) => ({ value: c.code, label: c.label }))}
          value={cats}
          onChange={(next) => {
            setCats(next);
            fields.touch('categories')();
          }}
          error={fields.shown('categories')}
        />
      )}
      <ChipGroup
        multiple
        label="¿Para qué edades?"
        options={AGE_STAGE_OPTIONS}
        value={stages}
        onChange={(next) => {
          setStages(next);
          fields.touch('stages')();
        }}
        error={fields.shown('stages')}
      />
      <ChipGroup
        label="¿Cuánto dura?"
        options={DURATIONS}
        value={duration}
        onChange={setDuration}
      />
      <ChipGroup label="¿Dónde?" options={SPACES} value={space} onChange={setSpace} />
      <ChipGroup label="¿Cuánto cuesta?" options={COSTS} value={cost} onChange={setCost} />

      <DetailsDisclosure
        title="Más detalles (opcional)"
        hasError={fields.shown('materials') !== undefined}
      >
        <TextField
          label="Qué necesitan"
          hint={`Un material por renglón, hasta ${String(MAX_MATERIALS)}.`}
          value={materials}
          onChangeText={setMaterials}
          onBlur={fields.touch('materials')}
          error={fields.shown('materials')}
          multiline
        />
        <TextField label="Para qué sirve" value={objective} onChangeText={setObjective} multiline />
        <TextField
          label="Cuidados"
          hint="Algo a tener en cuenta para que sea segura."
          value={safety}
          onChangeText={setSafety}
          multiline
        />
        <EvidencePicker value={evidence} onChange={setEvidence} />
      </DetailsDisclosure>

      <Disclosure
        title={sources.length > 0 ? `Fuentes (${String(sources.length)})` : 'Fuentes (opcional)'}
      >
        <SourcePicker value={sources} onChange={setSources} />
      </Disclosure>
    </>
  );

  const footer = (
    <>
      <PublishChoice canPublish={canPublish} value={publish} onChange={setPublish} />
      <ErrorBanner error={create.error} />
      {fields.attempted && fields.hasErrors ? (
        <Banner tone="caution">Revisá lo marcado arriba.</Banner>
      ) : null}
      <Button
        label="Guardar actividad"
        icon={Save}
        fullWidth
        loading={create.isPending}
        onPress={submit}
      />
    </>
  );

  return (
    <Screen maxWidth={1100}>
      {guard.dialog}
      <Text variant="title">Nueva actividad</Text>
      <Text tone="muted">Hace falta nombre, de qué se trata, pasos, categoría y edades.</Text>
      <FormWithPreview
        wide={wide}
        form={form}
        footer={footer}
        preview={
          <ActivityPreview
            title={title}
            summary={summary}
            steps={steps}
            categories={cats}
            stages={stages}
            duration={duration}
            wide={wide}
          />
        }
      />
    </Screen>
  );
}
