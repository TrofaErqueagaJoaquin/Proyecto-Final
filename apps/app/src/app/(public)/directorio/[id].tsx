import { Link, useLocalSearchParams } from 'expo-router';
import { HeartHandshake, MapPin, Video } from 'lucide-react-native';
import { View } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { canManage, useActiveFamily } from '@/features/families/queries';
import { ProfessionalAvatar, VerificationBadge } from '@/features/professionals/components';
import { MODALITY_LABELS } from '@/features/professionals/labels';
import { useProfessional, useSpecialties } from '@/features/professionals/queries';
import { Badge, Banner, Button, Card, EmptyState, ErrorState, Screen, Skeleton, Text } from '@/ui';

function RequestAction({ professionalId }: { professionalId: string }) {
  const auth = useAuth();
  const { family } = useActiveFamily();
  const href = `/profesionales/compartir?pro=${professionalId}`;
  if (auth.status !== 'signedIn') {
    return (
      <Link href={`/ingresar?next=${encodeURIComponent(href)}`} asChild>
        <Button label="Ingresar para pedir acompañamiento" />
      </Link>
    );
  }
  if (!family) {
    return (
      <Link href="/familia/nueva" asChild>
        <Button label="Crear tu familia para pedir acompañamiento" />
      </Link>
    );
  }
  if (!canManage(family.role)) {
    return (
      <Text tone="muted">
        Solo los responsables de la familia pueden pedir acompañamiento a un profesional.
      </Text>
    );
  }
  return (
    <Link href={href} asChild>
      <Button label="Pedir acompañamiento" icon={HeartHandshake} />
    </Link>
  );
}

export default function ProfessionalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const professional = useProfessional(id);
  const specialties = useSpecialties();

  if (professional.isPending) {
    return (
      <Screen edges={['bottom']}>
        <Skeleton height={48} width="60%" />
        <Skeleton height={240} />
      </Screen>
    );
  }
  if (professional.isError) return <ErrorState onRetry={() => void professional.refetch()} />;
  if (!professional.data) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState
          icon={HeartHandshake}
          title="No encontramos a este profesional"
          description="Puede que todavía no esté verificado o que haya dejado de figurar en el directorio."
        />
      </Screen>
    );
  }

  const p = professional.data;
  const labels = new Map((specialties.data ?? []).map((s) => [s.code, s.label]));
  const place = [p.city, p.province].filter(Boolean).join(', ');
  return (
    <Screen edges={['bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <ProfessionalAvatar name={p.display_name} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="title">{p.display_name}</Text>
          <Text tone="muted">
            {p.specialties.map((code) => labels.get(code) ?? code).join(' · ')}
          </Text>
        </View>
      </View>
      <VerificationBadge status={p.verification_status} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {p.modalities.map((m) => (
          <Badge key={m} icon={m === 'virtual' ? Video : MapPin}>
            {MODALITY_LABELS[m]}
          </Badge>
        ))}
        {place ? <Badge icon={MapPin}>{place}</Badge> : null}
        {p.years_experience !== null ? (
          <Badge>{`${String(p.years_experience)} años de experiencia`}</Badge>
        ) : null}
      </View>

      {p.bio ? (
        <Card>
          <Text variant="subheading">Sobre su trabajo</Text>
          <Text>{p.bio}</Text>
        </Card>
      ) : null}
      {p.public_contact ? (
        <Card>
          <Text variant="subheading">Contacto</Text>
          <Text selectable>{p.public_contact}</Text>
        </Card>
      ) : null}

      {p.verification_status !== 'verified' ? (
        <Banner tone="caution">
          Sus credenciales todavía no están verificadas por Crecer en Casa.
        </Banner>
      ) : null}
      <Card>
        <Text variant="subheading">Pedir acompañamiento</Text>
        <Text tone="muted">
          Le mandás una solicitud y elegís, integrante por integrante, qué puede ver. Nada se
          comparte hasta que acepte, y podés revocarlo cuando quieras.
        </Text>
        <RequestAction professionalId={p.user_id} />
      </Card>
    </Screen>
  );
}
