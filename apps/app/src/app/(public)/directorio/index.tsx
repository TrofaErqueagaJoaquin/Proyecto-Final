import { HeartHandshake } from 'lucide-react-native';
import { useMemo, useState } from 'react';

import { ProfessionalCard } from '@/features/professionals/components';
import { MODALITY_LABELS, type Modality } from '@/features/professionals/labels';
import { matchesDirectory, useDirectory, useSpecialties } from '@/features/professionals/queries';
import {
  Banner,
  Button,
  ChipGroup,
  EmptyState,
  ErrorState,
  Screen,
  Skeleton,
  Text,
  TextField,
} from '@/ui';

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
      <Text tone="muted">
        Psicólogas, psicopedagogos, pediatras, terapeutas y más, con sus credenciales verificadas.
        Desde tu espacio podés pedirles que acompañen a tu familia y elegir qué compartir.
      </Text>
      <Banner tone="info">
        Crecer en Casa revisa la matrícula o el título de cada profesional antes de mostrarlo acá.
        Aun así, la elección es de ustedes: conversen antes de empezar.
      </Banner>

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
        <ErrorState onRetry={() => void directory.refetch()} />
      ) : results.length === 0 ? (
        <EmptyState
          icon={HeartHandshake}
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
