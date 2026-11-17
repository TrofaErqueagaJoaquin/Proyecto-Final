import { BookPlus } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { useFieldErrors } from '@/features/forms/useFieldErrors';
import { useUnsavedGuard } from '@/features/forms/useUnsavedGuard';
import { Button, ChipGroup, ErrorBanner, TextField } from '@/ui';

import { useCreateSource } from './queries';
import { slugify } from './slug';

const STUDY_TYPES = [
  { value: 'guideline', label: 'Guía oficial' },
  { value: 'systematic_review', label: 'Revisión' },
  { value: 'cohort', label: 'Estudio' },
  { value: 'report', label: 'Informe' },
  { value: 'statute', label: 'Ley' },
  { value: 'other', label: 'Otro' },
] as const;

const CONFIDENCE = [
  { value: 'high', label: 'Alta' },
  { value: 'moderate', label: 'Media' },
  { value: 'low', label: 'Baja' },
] as const;

/** Año escrito → número (null si quedó vacío, NaN si no es un número). */
function parseYear(text: string): number | null {
  return text.trim() === '' ? null : Number(text);
}

/** Qué falta o sobra en cada campo (`undefined` = está bien). Igual que admin_create_source. */
function sourceErrors(input: { citation: string; url: string; year: string }) {
  const url = input.url.trim();
  const year = parseYear(input.year);
  return {
    citation:
      input.citation.trim().length < 10
        ? 'Escribí la cita completa (autor, título, año).'
        : undefined,
    url: url !== '' && !/^https:\/\/\S+$/.test(url) ? 'Tiene que empezar con https://' : undefined,
    year:
      year !== null && !(Number.isInteger(year) && year >= 1900 && year <= 2100)
        ? 'Un año entre 1900 y 2100.'
        : undefined,
  };
}

/** Formulario de una fuente nueva. Queda "sin verificar" hasta que alguien la revise. */
export function SourceForm({
  onCreated,
}: {
  onCreated: (source: { id: string; slug: string }) => void;
}) {
  const create = useCreateSource();
  const [citation, setCitation] = useState('');
  const [url, setUrl] = useState('');
  const [year, setYear] = useState('');
  const [studyType, setStudyType] = useState<(typeof STUDY_TYPES)[number]['value']>('guideline');
  const [confidence, setConfidence] = useState<(typeof CONFIDENCE)[number]['value']>('moderate');
  const fields = useFieldErrors(sourceErrors({ citation, url, year }));
  // Con algo escrito, salir de la pantalla pregunta antes.
  const guard = useUnsavedGuard([citation, url, year].some((t) => t.trim() !== ''));

  const submit = () => {
    if (!fields.attempt()) return;
    create.mutate(
      {
        slug: slugify(citation.split(/[.(]/)[0] ?? citation, 'fuente'),
        citation: citation.trim(),
        study_type: studyType,
        year: parseYear(year),
        url: url.trim(),
        confidence,
        notes: '',
      },
      {
        onSuccess: (source) => {
          setCitation('');
          setUrl('');
          setYear('');
          fields.reset();
          onCreated(source);
        },
      },
    );
  };

  return (
    <View style={{ gap: 16 }}>
      {guard.dialog}
      <TextField
        label="Cita"
        hint="Autor, título y año. Ej.: OMS. Directrices sobre actividad física (2019)."
        value={citation}
        onChangeText={setCitation}
        onBlur={fields.touch('citation')}
        error={fields.shown('citation')}
        multiline
      />
      <TextField
        label="Enlace (opcional)"
        value={url}
        onChangeText={setUrl}
        {...fields.field('url')}
        autoCapitalize="none"
        keyboardType="url"
      />
      <TextField
        label="Año (opcional)"
        value={year}
        onChangeText={setYear}
        {...fields.field('year')}
        keyboardType="number-pad"
        maxLength={4}
      />
      <ChipGroup label="Tipo" options={STUDY_TYPES} value={studyType} onChange={setStudyType} />
      <ChipGroup
        label="¿Cuánto confiás en ella?"
        options={CONFIDENCE}
        value={confidence}
        onChange={setConfidence}
      />
      <ErrorBanner error={create.error} />
      <Button label="Guardar fuente" icon={BookPlus} loading={create.isPending} onPress={submit} />
    </View>
  );
}
