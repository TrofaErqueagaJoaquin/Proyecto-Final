import { type EvidenceLabel } from '@crecer/shared';
import { Save } from 'lucide-react-native';
import { useState } from 'react';
import { useWindowDimensions } from 'react-native';

import {
  AGE_STAGE_OPTIONS,
  agesFromStages,
  CreatedView,
  EvidencePicker,
  FormWithPreview,
  PublishChoice,
  SourcePicker,
} from '@/features/admin/ContentFormParts';
import { useCreateContentItem, usePermissions } from '@/features/admin/queries';
import { slugify } from '@/features/admin/slug';
import { useFieldErrors } from '@/features/forms/useFieldErrors';
import { useUnsavedGuard } from '@/features/forms/useUnsavedGuard';
import { Markdown } from '@/features/library/Markdown';
import {
  Banner,
  Button,
  Card,
  ChipGroup,
  Disclosure,
  ErrorBanner,
  Screen,
  Text,
  TextField,
} from '@/ui';

// Los mismos topes que la tabla content_items.
const MAX_TITLE = 160;
const MAX_SUMMARY = 400;

/** Qué falta o sobra en cada campo (`undefined` = está bien). */
function cardErrors(input: { title: string; summary: string; body: string }) {
  const title = input.title.trim();
  const summary = input.summary.trim();
  return {
    title:
      title === ''
        ? 'Poné un título.'
        : title.length > MAX_TITLE
          ? `Hasta ${String(MAX_TITLE)} letras.`
          : undefined,
    summary:
      summary === ''
        ? 'Contá en una frase de qué se trata.'
        : summary.length > MAX_SUMMARY
          ? `Hasta ${String(MAX_SUMMARY)} letras.`
          : undefined,
    body:
      input.body.trim() === ''
        ? 'Escribí el contenido.'
        : /<\/?[a-z][^>]*>/i.test(input.body)
          ? 'Sacá las etiquetas entre < y >.'
          : undefined,
  };
}

/**
 * Cargar una ficha de situación (aparece en Biblioteca → Situaciones). El texto admite el formato
 * simple de la biblioteca: títulos con ##, listas con - y **negrita**; nada de HTML.
 */
export default function NewContentScreen() {
  const permissions = usePermissions();
  const canPublish = permissions.has('content.publish');
  const create = useCreateContentItem();
  const { width } = useWindowDimensions();
  const wide = width >= 1000;

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [stages, setStages] = useState<string[]>([]);
  const [evidence, setEvidence] = useState<EvidenceLabel>('propuesta_proyecto');
  const [sources, setSources] = useState<string[]>([]);
  const [publish, setPublish] = useState(true);
  const [created, setCreated] = useState<{
    slug: string;
    title: string;
    published: boolean;
  } | null>(null);
  const fields = useFieldErrors(cardErrors({ title, summary, body }));
  // Si cargó algo y se va sin guardar, se pregunta antes.
  const guard = useUnsavedGuard(
    created === null &&
      ([title, summary, body].some((t) => t.trim() !== '') ||
        stages.length > 0 ||
        sources.length > 0),
  );

  if (created) {
    return (
      <Screen maxWidth={640}>
        <CreatedView
          title={created.title}
          published={created.published}
          viewHref={`/situaciones/${created.slug}`}
          anotherLabel="Cargar otra ficha"
          onAnother={() => {
            setTitle('');
            setSummary('');
            setBody('');
            setStages([]);
            setSources([]);
            fields.reset();
            setCreated(null);
          }}
        />
      </Screen>
    );
  }

  const submit = () => {
    if (!fields.attempt()) return;
    const ages = agesFromStages(stages);
    const willPublish = canPublish && publish;
    create.mutate(
      {
        slug: slugify(title, 'ficha'),
        type: 'situation_card',
        title: title.trim(),
        summary: summary.trim(),
        body_md: body.trim(),
        age_min_months: ages?.min ?? null,
        age_max_months: ages?.max ?? null,
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
        label="Título"
        hint="Ej.: Cuando no quiere irse a dormir."
        value={title}
        onChangeText={setTitle}
        {...fields.field('title')}
        maxLength={MAX_TITLE}
      />
      <TextField
        label="De qué se trata"
        hint="Una o dos frases: es lo que se ve en la lista."
        value={summary}
        onChangeText={setSummary}
        onBlur={fields.touch('summary')}
        error={fields.shown('summary')}
        multiline
        maxLength={MAX_SUMMARY}
      />
      <TextField
        label="Contenido"
        hint="Títulos con ##, listas con - y **negrita**."
        value={body}
        onChangeText={setBody}
        onBlur={fields.touch('body')}
        error={fields.shown('body')}
        multiline
        numberOfLines={10}
      />
      <ChipGroup
        multiple
        label="¿Para qué edades? (opcional)"
        options={AGE_STAGE_OPTIONS}
        value={stages}
        onChange={setStages}
      />
      <Disclosure title="Más detalles (opcional)">
        <EvidencePicker value={evidence} onChange={setEvidence} />
      </Disclosure>
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
        label="Guardar ficha"
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
      <Text variant="title">Nueva ficha</Text>
      <Text tone="muted">Aparece en Biblioteca → Situaciones.</Text>
      <FormWithPreview
        wide={wide}
        form={form}
        footer={footer}
        preview={
          <Card style={{ gap: 12 }}>
            <Text variant="label" tone="muted">
              Así se va a ver
            </Text>
            <Text variant="heading">{title.trim() || 'Título de la ficha'}</Text>
            {summary.trim() ? <Text variant="subheading">{summary}</Text> : null}
            {body.trim() ? <Markdown source={body} /> : null}
          </Card>
        }
      />
    </Screen>
  );
}
