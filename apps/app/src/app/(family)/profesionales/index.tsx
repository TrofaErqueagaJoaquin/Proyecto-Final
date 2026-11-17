import { Link, Redirect } from 'expo-router';
import { Search } from 'lucide-react-native';

import { BroteEmptyState } from '@/features/brote/Brote';

import { canManage, useActiveFamily } from '@/features/families/queries';
import { LinkCard } from '@/features/library/LinkCard';
import { ProfessionalAvatar, VerificationBadge } from '@/features/professionals/components';
import { CARE_STATUS_LABELS, type VerificationStatus } from '@/features/professionals/labels';
import { useFamilyCare } from '@/features/professionals/queries';
import { Button, ErrorState, LoadingScreen, Screen, Skeleton, Text } from '@/ui';

const OPEN = new Set(['requested', 'active']);

export default function FamilyProfessionalsScreen() {
  const { isPending, family } = useActiveFamily();
  const care = useFamilyCare(family?.id);

  if (isPending) return <LoadingScreen />;
  if (!family) return <Redirect href="/bienvenida" />;
  if (!canManage(family.role)) {
    return (
      <Screen>
        <BroteEmptyState
          title="Esto lo manejan los responsables"
          description="Pedile a quien maneja la familia que te cuente."
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
      <Text tone="muted">Quiénes acompañan a la familia y qué ve cada uno.</Text>
      <Link href="/directorio" asChild>
        <Button label="Buscar profesionales" icon={Search} />
      </Link>

      {care.isPending ? (
        <Skeleton height={200} />
      ) : care.isError ? (
        <ErrorState error={care.error} onRetry={() => void care.refetch()} />
      ) : list.length === 0 ? (
        <BroteEmptyState
          title="Todavía no los acompaña nadie"
          description="Buscá a quien necesiten en el directorio."
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
