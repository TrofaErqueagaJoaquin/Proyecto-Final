import { ExternalLink, FileBadge } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, View } from 'react-native';

import { friendlyError } from '@/copy/errors';
import {
  openCredentialDocument,
  useCredentialQueue,
  useVerifyCredential,
} from '@/features/admin/queries';
import { VerificationBadge } from '@/features/professionals/components';
import {
  CREDENTIAL_KIND_LABELS,
  CREDENTIAL_STATUS_LABELS,
  type CredentialStatus,
  type VerificationStatus,
} from '@/features/professionals/labels';
import {
  Badge,
  Banner,
  Button,
  Card,
  ChipGroup,
  EmptyState,
  ErrorState,
  Screen,
  Skeleton,
  Text,
  TextField,
} from '@/ui';

const METHODS = [
  { value: 'refeps', label: 'REFEPS / SISA' },
  { value: 'colegio', label: 'Colegio profesional' },
  { value: 'manual', label: 'Revisión manual' },
] as const;
const DATE = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });

type Credential = NonNullable<ReturnType<typeof useCredentialQueue>['data']>[number];

function CredentialReview({ credential }: { credential: Credential }) {
  const verify = useVerifyCredential();
  const [method, setMethod] = useState<(typeof METHODS)[number]['value']>('refeps');
  const [note, setNote] = useState('');
  const [docError, setDocError] = useState<unknown>(null);
  const profile = credential.professional_profiles;
  const pending = credential.status === 'submitted';

  return (
    <Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <Text variant="subheading">{profile?.display_name ?? 'Profesional'}</Text>
        <Badge tone={credential.status === 'verified' ? 'primary' : 'neutral'}>
          {CREDENTIAL_STATUS_LABELS[credential.status as CredentialStatus]}
        </Badge>
      </View>
      {profile ? (
        <VerificationBadge status={profile.verification_status as VerificationStatus} />
      ) : null}
      <Text>
        {[
          CREDENTIAL_KIND_LABELS[credential.kind as keyof typeof CREDENTIAL_KIND_LABELS],
          credential.profession,
          credential.license_number ? `N.º ${credential.license_number}` : null,
          credential.jurisdiction,
          credential.issuer,
        ]
          .filter(Boolean)
          .join(' · ')}
      </Text>
      {credential.document_path ? (
        <Button
          label="Ver el archivo (enlace de 60 s)"
          variant="secondary"
          icon={ExternalLink}
          onPress={() => {
            setDocError(null);
            void openCredentialDocument(credential.id)
              .then((url) => Linking.openURL(url))
              .catch(setDocError);
          }}
        />
      ) : (
        <Text variant="small" tone="muted">
          Sin archivo adjunto: verificá con el número de matrícula.
        </Text>
      )}
      {docError ? <Banner tone="danger">{friendlyError(docError)}</Banner> : null}

      {credential.credential_verifications.map((v) => (
        <Text key={v.checked_at} variant="small" tone="muted">
          {`${DATE.format(new Date(v.checked_at))}: ${v.result} (${v.method})${v.evidence_note ? ` · ${v.evidence_note}` : ''}`}
        </Text>
      ))}

      {pending ? (
        <View style={{ gap: 12 }}>
          <Text variant="bodyStrong">Checklist</Text>
          <Text variant="small">
            1. El nombre coincide con el perfil. 2. La matrícula figura vigente en REFEPS/SISA o en
            el colegio de la jurisdicción. 3. La profesión coincide con las especialidades
            declaradas.
          </Text>
          <ChipGroup
            label="¿Cómo lo verificaste?"
            options={METHODS}
            value={method}
            onChange={setMethod}
          />
          <TextField
            label="Nota (sin datos sensibles)"
            placeholder="Por ejemplo: REFEPS consultado el 28/10"
            value={note}
            onChangeText={setNote}
            maxLength={500}
          />
          {verify.error ? <Banner tone="danger">{friendlyError(verify.error)}</Banner> : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(
              [
                ['verified', 'Aprobar', 'primary'],
                ['needs_info', 'Pedir información', 'secondary'],
                ['rejected', 'Rechazar', 'danger'],
              ] as const
            ).map(([result, label, variant]) => (
              <Button
                key={result}
                label={label}
                variant={variant}
                loading={verify.isPending && verify.variables.result === result}
                onPress={() => {
                  verify.mutate({ credentialId: credential.id, result, method, note });
                }}
              />
            ))}
          </View>
        </View>
      ) : null}
    </Card>
  );
}

/** Cola de verificación (F10): ver la credencial, checklist y aprobar, rechazar o pedir info. */
export default function VerificationsScreen() {
  const queue = useCredentialQueue();
  if (queue.isPending) return <Skeleton height={300} />;
  if (queue.isError) return <ErrorState onRetry={() => void queue.refetch()} />;

  const pending = queue.data.filter((c) => c.status === 'submitted');
  const reviewed = queue.data.filter((c) => c.status !== 'submitted');
  return (
    <Screen maxWidth={1000}>
      <Text variant="title">Verificaciones</Text>
      {pending.length === 0 ? (
        <EmptyState icon={FileBadge} title="No hay credenciales por verificar" />
      ) : (
        pending.map((c) => <CredentialReview key={c.id} credential={c} />)
      )}
      {reviewed.length > 0 ? <Text variant="heading">Revisadas</Text> : null}
      {reviewed.map((c) => (
        <CredentialReview key={c.id} credential={c} />
      ))}
    </Screen>
  );
}
