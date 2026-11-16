import { EVIDENCE_LABELS, type EvidenceLabel } from '@crecer/shared';
import { Save } from 'lucide-react-native';
import { useState } from 'react';
import { useWindowDimensions } from 'react-native';

import { friendlyError } from '@/copy/errors';
import {
  AGE_STAGE_OPTIONS,
  agesFromStages,
  CreatedView,
  FormWithPreview,
  PublishChoice,
  SourcePicker,
} from '@/features/admin/ContentFormParts';
import { useCreateContentItem, usePermissions } from '@/features/admin/queries';
import { slugify } from '@/features/admin/slug';
import { Markdown } from '@/features/library/Markdown';
import { Banner, Button, Card, ChipGroup, Disclosure, Screen, Text, TextField } from '@/ui';

const EVIDENCE = Object.entries(EVIDENCE_LABELS).map(([value, { label }]) => ({
  value: value as EvidenceLabel,
  label,
}));

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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [created, setCreated] = useState<{
    slug: string;
    title: string;
    published: boolean;
  } | null>(null);

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
            setErrors({});
            setCreated(null);
          }}
        />
      </Screen>
    );
  }

  const submit = () => {
    const next: Record<string, string> = {};
    if (title.trim() === '') next.title = 'Poné un título.';
    if (title.trim().length > 160) next.title = 'Hasta 160 letras.';
    if (summary.trim() === '') next.summary = 'Contá en una frase de qué se trata.';
    if (summary.trim().length > 400) next.summary = 'Hasta 400 letras.';
    if (body.trim() === '') next.body = 'Escribí el contenido.';
    if (/<\/?[a-z][^>]*>/i.test(body)) next.body = 'El texto no puede tener HTML.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
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
        error={errors.title}
        maxLength={160}
      />
      <TextField
        label="De qué se trata"
        hint="Una o dos frases: es lo que se ve en la lista."
        value={summary}
        onChangeText={setSummary}
        error={errors.summary}
        multiline
        maxLength={400}
      />
      <TextField
        label="Contenido"
        hint="Títulos con ##, listas con - y **negrita**."
        value={body}
        onChangeText={setBody}
        error={errors.body}
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
      <ChipGroup label="Respaldo" options={EVIDENCE} value={evidence} onChange={setEvidence} />
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
      <Text variant="title">Nueva ficha</Text>
      <Text tone="muted">Aparece en Biblioteca → Situaciones.</Text>
      <FormWithPreview
        wide={wide}
        form={form}
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
