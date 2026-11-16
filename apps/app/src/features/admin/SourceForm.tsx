import { BookPlus } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { friendlyError } from '@/copy/errors';
import { Banner, Button, ChipGroup, TextField } from '@/ui';

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
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = () => {
    const next: Record<string, string> = {};
    if (citation.trim().length < 10)
      next.citation = 'Escribí la cita completa (autor, título, año).';
    if (url.trim() !== '' && !/^https:\/\/\S+$/.test(url.trim()))
      next.url = 'Tiene que empezar con https://';
    const yearNumber = year.trim() === '' ? null : Number(year);
    if (
      yearNumber !== null &&
      !(Number.isInteger(yearNumber) && yearNumber >= 1900 && yearNumber <= 2100)
    )
      next.year = 'Un año entre 1900 y 2100.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    create.mutate(
      {
        slug: slugify(citation.split(/[.(]/)[0] ?? citation, 'fuente'),
        citation: citation.trim(),
        study_type: studyType,
        year: yearNumber,
        url: url.trim(),
        confidence,
        notes: '',
      },
      {
        onSuccess: (source) => {
          setCitation('');
          setUrl('');
          setYear('');
          onCreated(source);
        },
      },
    );
  };

  return (
    <View style={{ gap: 16 }}>
      <TextField
        label="Cita"
        hint="Autor, título y año. Ej.: OMS. Directrices sobre actividad física (2019)."
        value={citation}
        onChangeText={setCitation}
        error={errors.citation}
        multiline
      />
      <TextField
        label="Enlace (opcional)"
        value={url}
        onChangeText={setUrl}
        error={errors.url}
        autoCapitalize="none"
        keyboardType="url"
      />
      <TextField
        label="Año (opcional)"
        value={year}
        onChangeText={setYear}
        error={errors.year}
        keyboardType="number-pad"
        maxLength={4}
      />
      <ChipGroup label="Tipo" options={STUDY_TYPES} value={studyType} onChange={setStudyType} />
      <ChipGroup
        label="Confianza"
        options={CONFIDENCE}
        value={confidence}
        onChange={setConfidence}
      />
      {create.error ? <Banner tone="danger">{friendlyError(create.error)}</Banner> : null}
      <Button label="Guardar fuente" icon={BookPlus} loading={create.isPending} onPress={submit} />
    </View>
  );
}
