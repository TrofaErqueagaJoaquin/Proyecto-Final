import { CircleX, ExternalLink } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, View } from 'react-native';

import {
  openCredentialDocument,
  useCredentialQueue,
  useVerifyCredential,
} from '@/features/admin/queries';
import { BroteEmptyState } from '@/features/brote/Brote';
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
  Checkbox,
  ChipGroup,
  ConfirmAction,
  ErrorBanner,
  ErrorScreen,
  LoadingScreen,
  Screen,
  Text,
  TextField,
} from '@/ui';

const METHODS = [
  { value: 'refeps', label: 'REFEPS / SISA' },
  { value: 'colegio', label: 'Colegio profesional' },
  { value: 'manual', label: 'Revisión manual' },
] as const;
type Method = (typeof METHODS)[number]['value'];
const METHOD_LABELS: Record<string, string> = Object.fromEntries(
  METHODS.map((m) => [m.value, m.label]),
);
const RESULT_LABELS: Record<string, string> = {
  verified: 'Aprobada',
  rejected: 'Rechazada',
  needs_info: 'Se pidió información',
};
const CHECKS = [
  'El nombre coincide con el del perfil.',
  'La matrícula figura vigente (REFEPS, SISA o el colegio).',
  'La profesión coincide con las especialidades.',
] as const;
const DATE = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });

type Credential = NonNullable<ReturnType<typeof useCredentialQueue>['data']>[number];
type Result = 'verified' | 'rejected' | 'needs_info';

const DONE_MESSAGES: Record<Result, string> = {
  verified: 'Aprobada. Ya aparece en el directorio.',
  needs_info: 'Le enviamos tu pedido. Cuando la corrija, vuelve a esta lista.',
  rejected: 'Rechazada. Le mostramos el motivo.',
};

function CredentialReview({
  credential,
  onDone,
}: {
  credential: Credential;
  onDone: (message: string) => void;
}) {
  const verify = useVerifyCredential();
  const [method, setMethod] = useState<Method>('refeps');
  const [checks, setChecks] = useState<boolean[]>(CHECKS.map(() => false));
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string | undefined>();
  const [docError, setDocError] = useState<unknown>(null);
  const profile = credential.professional_profiles;
  const pending = credential.status === 'submitted';
  const allChecked = checks.every(Boolean);
  const hasNote = note.trim() !== '';

  const send = (result: Result) => {
    if (result !== 'verified' && !hasNote) {
      setNoteError('Escribí qué tiene que corregir o por qué no se aprueba.');
      return;
    }
    verify.mutate(
      { credentialId: credential.id, result, method, note },
      {
        onSuccess: () => {
          onDone(`${profile?.display_name ?? 'Profesional'}: ${DONE_MESSAGES[result]}`);
        },
      },
    );
  };

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
          label="Ver el archivo"
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
          Sin archivo: verificala con el número de matrícula.
        </Text>
      )}
      <ErrorBanner error={docError} />

      {credential.credential_verifications.map((v) => (
        <Text key={v.checked_at} variant="small" tone="muted">
          {[
            DATE.format(new Date(v.checked_at)),
            RESULT_LABELS[v.result] ?? v.result,
            METHOD_LABELS[v.method] ?? v.method,
            v.evidence_note,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      ))}

      {pending ? (
        <View style={{ gap: 12 }}>
          <Text variant="bodyStrong">Antes de aprobar, revisá</Text>
          {CHECKS.map((label, i) => (
            <Checkbox
              key={label}
              label={label}
              checked={checks[i] ?? false}
              onChange={(value) => {
                setChecks((prev) => prev.map((c, j) => (j === i ? value : c)));
              }}
            />
          ))}
          <ChipGroup
            label="¿Cómo lo revisaste?"
            options={METHODS}
            value={method}
            onChange={setMethod}
          />
          <TextField
            label="Nota para el profesional"
            hint="Obligatoria para pedir información o rechazar. La lee el profesional."
            placeholder="Por ejemplo: falta la foto del dorso de la matrícula"
            value={note}
            onChangeText={(value) => {
              setNote(value);
              if (value.trim() !== '') setNoteError(undefined);
            }}
            error={noteError}
            multiline
            maxLength={500}
          />
          <ErrorBanner error={verify.error} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Button
              label="Aprobar"
              disabled={!allChecked}
              loading={verify.isPending && verify.variables.result === 'verified'}
              accessibilityHint={allChecked ? undefined : 'Marcá las tres casillas para aprobar.'}
              onPress={() => {
                send('verified');
              }}
            />
            <Button
              label="Pedir información"
              variant="secondary"
              loading={verify.isPending && verify.variables.result === 'needs_info'}
              onPress={() => {
                send('needs_info');
              }}
            />
            {hasNote ? (
              <ConfirmAction
                label="Rechazar"
                icon={CircleX}
                confirmLabel="Sí, rechazar"
                title="¿Rechazar esta credencial?"
                description="El profesional ve tu nota y puede cargarla de nuevo."
                loading={verify.isPending && verify.variables.result === 'rejected'}
                onConfirm={() => {
                  send('rejected');
                }}
              />
            ) : (
              <Button
                label="Rechazar"
                variant="dangerSoft"
                icon={CircleX}
                onPress={() => {
                  send('rejected');
                }}
              />
            )}
          </View>
          {!allChecked ? (
            <Text variant="small" tone="muted">
              Marcá las tres casillas para aprobar.
            </Text>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

/** Cola de verificación (F10): ver la credencial, revisar y aprobar, rechazar o pedir info. */
export default function VerificationsScreen() {
  const queue = useCredentialQueue();
  const [done, setDone] = useState<string | null>(null);
  if (queue.isPending) return <LoadingScreen />;
  if (queue.isError) {
    return <ErrorScreen error={queue.error} onRetry={() => void queue.refetch()} />;
  }

  const pending = queue.data.filter((c) => c.status === 'submitted');
  const reviewed = queue.data.filter((c) => c.status !== 'submitted');
  return (
    <Screen maxWidth={1000}>
      <Text variant="title">Verificaciones</Text>
      {done ? <Banner tone="success">{done}</Banner> : null}
      {pending.length === 0 ? (
        <BroteEmptyState mood="feliz" title="No hay credenciales por verificar" />
      ) : (
        pending.map((c) => <CredentialReview key={c.id} credential={c} onDone={setDone} />)
      )}
      {reviewed.length > 0 ? <Text variant="heading">Revisadas</Text> : null}
      {reviewed.map((c) => (
        <CredentialReview key={c.id} credential={c} onDone={setDone} />
      ))}
    </Screen>
  );
}
