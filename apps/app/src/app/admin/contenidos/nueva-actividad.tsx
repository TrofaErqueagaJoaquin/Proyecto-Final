import { COST_LABELS, EVIDENCE_LABELS, SPACE_LABELS, type EvidenceLabel } from '@crecer/shared';
import { Plus, Save, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { friendlyError } from '@/copy/errors';
import {
  AGE_STAGE_OPTIONS,
  agesFromStages,
  CreatedView,
  FormWithPreview,
  PublishChoice,
  SourcePicker,
} from '@/features/admin/ContentFormParts';
import { useCreateActivity, usePermissions } from '@/features/admin/queries';
import { linesToList, slugify } from '@/features/admin/slug';
import { ActivityScene, sceneFor } from '@/features/animations';
import { ageRange } from '@/features/library/ActivityDetail';
import { useCategories } from '@/features/library/queries';
import {
  Banner,
  Button,
  Card,
  ChipGroup,
  Disclosure,
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
const EVIDENCE = Object.entries(EVIDENCE_LABELS).map(([value, { label }]) => ({
  value: value as EvidenceLabel,
  label,
}));

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
        El dibujo animado sale de la primera categoría que elijas.
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [created, setCreated] = useState<{
    slug: string;
    title: string;
    published: boolean;
  } | null>(null);

  const reset = () => {
    setTitle('');
    setSummary('');
    setSteps(['', '']);
    setCats([]);
    setMaterials('');
    setObjective('');
    setSafety('');
    setSources([]);
    setErrors({});
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
    const filledSteps = steps.map((s) => s.trim()).filter((s) => s !== '');
    const ages = agesFromStages(stages);
    const next: Record<string, string> = {};
    if (title.trim() === '') next.title = 'Poné un nombre.';
    if (title.trim().length > 120) next.title = 'Hasta 120 letras.';
    if (summary.trim() === '') next.summary = 'Contá en una frase de qué se trata.';
    if (summary.trim().length > 400) next.summary = 'Hasta 400 letras.';
    if (filledSteps.length === 0) next.steps = 'Escribí al menos un paso.';
    if (filledSteps.some((s) => s.length > 500)) next.steps = 'Cada paso, hasta 500 letras.';
    if (cats.length === 0) next.categories = 'Elegí al menos una categoría.';
    if (cats.length > 4) next.categories = 'Hasta 4 categorías.';
    if (!ages) next.stages = 'Elegí al menos una edad.';
    if (linesToList(materials).length > 20) next.materials = 'Hasta 20 materiales.';
    setErrors(next);
    if (Object.keys(next).length > 0 || !ages) return;
    const willPublish = canPublish && publish;
    create.mutate(
      {
        slug: slugify(title, 'actividad'),
        title: title.trim(),
        summary: summary.trim(),
        objective: objective.trim(),
        steps: filledSteps,
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

  const form = (
    <>
      <TextField
        label="Nombre"
        hint="Corto y claro. Ej.: Rayuela en el pasillo."
        value={title}
        onChangeText={setTitle}
        error={errors.title}
        maxLength={120}
      />
      <TextField
        label="De qué se trata"
        hint="Una o dos frases."
        value={summary}
        onChangeText={setSummary}
        error={errors.summary}
        multiline
        maxLength={400}
      />

      <View style={{ gap: 10 }}>
        <Text variant="label">Cómo se hace</Text>
        {steps.map((step, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <TextField
                label={`Paso ${String(i + 1)}`}
                value={step}
                onChangeText={(text) => {
                  setSteps(steps.map((s, j) => (j === i ? text : s)));
                }}
                multiline
                maxLength={500}
              />
            </View>
            {steps.length > 1 ? (
              <Button
                label="Quitar"
                variant="ghost"
                icon={Trash2}
                onPress={() => {
                  setSteps(steps.filter((_, j) => j !== i));
                }}
              />
            ) : null}
          </View>
        ))}
        {errors.steps ? (
          <Text variant="small" tone="danger" role="alert">
            {errors.steps}
          </Text>
        ) : null}
        {steps.length < 12 ? (
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
        <ErrorState onRetry={() => void categories.refetch()} />
      ) : categories.isPending ? (
        <Skeleton height={56} />
      ) : (
        <ChipGroup
          multiple
          label="Categorías"
          options={(categories.data ?? []).map((c) => ({ value: c.code, label: c.label }))}
          value={cats}
          onChange={setCats}
          error={errors.categories}
        />
      )}
      <ChipGroup
        multiple
        label="¿Para qué edades?"
        options={AGE_STAGE_OPTIONS}
        value={stages}
        onChange={setStages}
        error={errors.stages}
      />
      <ChipGroup
        label="¿Cuánto dura?"
        options={DURATIONS}
        value={duration}
        onChange={setDuration}
      />
      <ChipGroup label="¿Dónde?" options={SPACES} value={space} onChange={setSpace} />
      <ChipGroup label="¿Cuánto cuesta?" options={COSTS} value={cost} onChange={setCost} />

      <Disclosure title="Más detalles (opcional)">
        <TextField
          label="Qué necesitan"
          hint="Un material por renglón. Vacío = sin materiales."
          value={materials}
          onChangeText={setMaterials}
          error={errors.materials}
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
        <ChipGroup label="Respaldo" options={EVIDENCE} value={evidence} onChange={setEvidence} />
      </Disclosure>

      <Disclosure
        title={sources.length > 0 ? `Fuentes (${String(sources.length)})` : 'Fuentes (opcional)'}
      >
        <SourcePicker value={sources} onChange={setSources} />
      </Disclosure>

      <PublishChoice canPublish={canPublish} value={publish} onChange={setPublish} />
      {create.error ? <Banner tone="danger">{friendlyError(create.error)}</Banner> : null}
      {Object.keys(errors).length > 0 ? (
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
      <Text variant="title">Nueva actividad</Text>
      <Text tone="muted">
        Lo obligatorio: nombre, de qué se trata, los pasos, una categoría y las edades.
      </Text>
      <FormWithPreview
        wide={wide}
        form={form}
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
