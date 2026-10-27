import { Link, Redirect } from 'expo-router';
import { HeartHandshake, Search } from 'lucide-react-native';

import { canManage, useActiveFamily } from '@/features/families/queries';
import { LinkCard } from '@/features/library/LinkCard';
import { ProfessionalAvatar, VerificationBadge } from '@/features/professionals/components';
import { CARE_STATUS_LABELS, type VerificationStatus } from '@/features/professionals/labels';
import { useFamilyCare } from '@/features/professionals/queries';
import { Button, EmptyState, ErrorState, Screen, Skeleton, Text } from '@/ui';

const OPEN = new Set(['requested', 'active']);

export default function FamilyProfessionalsScreen() {
  const { isPending, family } = useActiveFamily();
  const care = useFamilyCare(family?.id);

  if (isPending) return <Skeleton height={300} />;
  if (!family) return <Redirect href="/familia/nueva" />;
  if (!canManage(family.role)) {
    return (
      <Screen>
        <EmptyState
          icon={HeartHandshake}
          title="No tenés acceso a esta sección"
          description="Los acompañamientos de profesionales los manejan los responsables de la familia."
        />
      </Screen>
    );
  }

  const list = care.data ?? [];
  const open = list.filter((a) => OPEN.has(a.status));
  const closed = list.filter((a) => !OPEN.has(a.status));
  const card = (a: (typeof list)[number]) => (
    <LinkCard
      key={a.id}
      href={`/profesionales/${a.id}`}
      title={a.professional_profiles?.display_name ?? 'Profesional'}
      description={CARE_STATUS_LABELS[a.status]}
      leading={<ProfessionalAvatar name={a.professional_profiles?.display_name ?? '?'} />}
      footer={
        a.professional_profiles ? (
          <VerificationBadge
            status={a.professional_profiles.verification_status as VerificationStatus}
          />
        ) : undefined
      }
    />
  );

  return (
    <Screen>
      <Text variant="title">Profesionales</Text>
      <Text tone="muted">
        Quiénes acompañan a la familia y qué puede ver cada uno. Podés revocar cualquier permiso
        cuando quieras.
      </Text>
      <Link href="/directorio" asChild>
        <Button label="Buscar profesionales" icon={Search} />
      </Link>

      {care.isPending ? (
        <Skeleton height={200} />
      ) : care.isError ? (
        <ErrorState onRetry={() => void care.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={HeartHandshake}
          title="Todavía no hay profesionales acompañando"
          description="Buscá en el directorio a una psicóloga, un psicopedagogo, una pediatra o quien necesiten, y pedile que los acompañe."
        />
      ) : (
        <>
          {open.length > 0 ? <Text variant="heading">Ahora</Text> : null}
          {open.map(card)}
          {closed.length > 0 ? <Text variant="heading">Anteriores</Text> : null}
          {closed.map(card)}
        </>
      )}
    </Screen>
  );
}
