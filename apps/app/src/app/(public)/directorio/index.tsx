import { useMemo, useState } from 'react';

import { BroteEmptyState } from '@/features/brote/Brote';
import { ProfessionalCard } from '@/features/professionals/components';
import { MODALITY_LABELS, type Modality } from '@/features/professionals/labels';
import { matchesDirectory, useDirectory, useSpecialties } from '@/features/professionals/queries';
import { Button, ChipGroup, Disclosure, ErrorState, Screen, Skeleton, Text, TextField } from '@/ui';

const MODALITY_OPTIONS = (Object.keys(MODALITY_LABELS) as Modality[]).map((value) => ({
  value,
  label: MODALITY_LABELS[value],
}));

/** Directorio público: solo profesionales con credenciales verificadas (ROLES §4 regla 5). */
export default function DirectoryScreen() {
  const directory = useDirectory();
  const specialties = useSpecialties();
  const [specialty, setSpecialty] = useState<string | null>(null);
  const [modality, setModality] = useState<Modality | null>(null);
  const [place, setPlace] = useState('');

  const labels = useMemo(
    () => new Map((specialties.data ?? []).map((s) => [s.code, s.label])),
    [specialties.data],
  );
  const results = useMemo(
    () => (directory.data ?? []).filter((p) => matchesDirectory(p, { specialty, modality, place })),
    [directory.data, specialty, modality, place],
  );
  const filtered = specialty !== null || modality !== null || place.trim() !== '';

  return (
    <Screen edges={['bottom']} maxWidth={960}>
      <Text variant="title">Profesionales</Text>
      <Text tone="muted">Todos con la matrícula o el título revisados.</Text>
      <Disclosure title="¿Cómo funciona?">
        <Text>
          Revisamos la matrícula o el título de cada profesional antes de mostrarlo acá. Aun así, la
          elección es de ustedes: conversen antes de empezar.
        </Text>
        <Text>
          Desde tu espacio podés pedirle a quien elijas que acompañe a tu familia, y decidir qué
          puede ver.
        </Text>
      </Disclosure>

      {specialties.data ? (
        <ChipGroup
          label="Especialidad"
          options={specialties.data.map((s) => ({ value: s.code, label: s.label }))}
          value={specialty}
          onChange={(code) => {
            setSpecialty(specialty === code ? null : code);
          }}
        />
      ) : null}
      <ChipGroup
        label="Modalidad"
        options={MODALITY_OPTIONS}
        value={modality}
        onChange={(value) => {
          setModality(modality === value ? null : value);
        }}
      />
      <TextField
        label="Ciudad o provincia"
        placeholder="Por ejemplo: Mar del Plata"
        value={place}
        onChangeText={setPlace}
        inputMode="search"
      />

      {directory.isPending ? (
        <Skeleton height={240} />
      ) : directory.isError ? (
        <ErrorState error={directory.error} onRetry={() => void directory.refetch()} />
      ) : results.length === 0 ? (
        <BroteEmptyState
          title={
            filtered ? 'No hay profesionales con esos filtros' : 'Todavía no hay profesionales'
          }
          description={
            filtered
              ? 'Probá sacar algún filtro o buscar una provincia.'
              : 'Estamos verificando a los primeros. Volvé a mirar en unos días.'
          }
          action={
            filtered ? (
              <Button
                label="Limpiar filtros"
                variant="secondary"
                onPress={() => {
                  setSpecialty(null);
                  setModality(null);
                  setPlace('');
                }}
              />
            ) : undefined
          }
        />
      ) : (
        <>
          <Text variant="small" tone="muted" accessibilityLiveRegion="polite">
            {results.length === 1 ? '1 profesional' : `${String(results.length)} profesionales`}
          </Text>
          {results.map((p) => (
            <ProfessionalCard key={p.user_id} professional={p} specialtyLabels={labels} />
          ))}
        </>
      )}
    </Screen>
  );
}
