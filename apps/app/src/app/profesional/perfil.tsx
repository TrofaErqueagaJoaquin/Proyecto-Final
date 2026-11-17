import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { BriefcaseMedical, FileBadge, Paperclip, Pencil, Plus, Send } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { GuidePopup } from '@/features/brote/GuidePopup';
import {
  contactError,
  displayNameError,
  placeError,
  requiredError,
} from '@/features/forms/validators';
import { useFieldErrors } from '@/features/forms/useFieldErrors';
import { confirmLeave, useUnsavedGuard } from '@/features/forms/useUnsavedGuard';
import { VerificationBadge } from '@/features/professionals/components';
import {
  CREDENTIAL_KIND_LABELS,
  CREDENTIAL_STATUS_LABELS,
  MODALITY_LABELS,
  type Modality,
} from '@/features/professionals/labels';
import {
  useDeleteCredential,
  useMyCredentials,
  useMyProfessionalProfile,
  useSaveProfessionalProfile,
  useSpecialties,
  useSubmitCredential,
  type CredentialInput,
  type ProfessionalProfile,
  type ProfileInput,
} from '@/features/professionals/queries';
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
  ErrorState,
  LoadingScreen,
  makeStyles,
  Screen,
  Skeleton,
  StepNav,
  Text,
  digitsMask,
  TextField,
  useOverlayTurn,
  useTheme,
} from '@/ui';
import { supabase } from '@/lib/supabase';

const MODALITY_OPTIONS = (Object.keys(MODALITY_LABELS) as Modality[]).map((value) => ({
  value,
  label: MODALITY_LABELS[value],
}));
const KIND_OPTIONS = (
  Object.keys(CREDENTIAL_KIND_LABELS) as (keyof typeof CREDENTIAL_KIND_LABELS)[]
).map((value) => ({ value, label: CREDENTIAL_KIND_LABELS[value] }));

const blank = (s: string) => (s.trim() === '' ? null : s.trim());

const useStyles = makeStyles((t) => ({
  progress: { gap: t.space.xs },
  bars: { flexDirection: 'row', gap: t.space.xs },
  bar: { flex: 1, height: 8, borderRadius: t.radius.pill, backgroundColor: t.colors.border },
  barDone: { backgroundColor: t.colors.primary },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm, alignItems: 'center' },
}));

type Step = 'datos' | 'matricula' | 'listo';

const STEPS: { key: Step; label: string }[] = [
  { key: 'datos', label: 'Tus datos' },
  { key: 'matricula', label: 'Tu matrícula' },
  { key: 'listo', label: 'Listo' },
];

/** Barra de avance: "Tus datos → Tu matrícula → Listo". */
function StepProgress({ step }: { step: Step }) {
  const styles = useStyles();
  const index = STEPS.findIndex((s) => s.key === step);
  const label = STEPS[index]?.label ?? '';
  return (
    <View
      style={styles.progress}
      accessibilityRole="progressbar"
      accessibilityLabel={`Paso ${String(index + 1)} de ${String(STEPS.length)}: ${label}`}
      accessibilityValue={{ min: 1, max: STEPS.length, now: index + 1 }}
    >
      <View style={styles.bars}>
        {STEPS.map((s, i) => (
          <View key={s.key} style={[styles.bar, i <= index && styles.barDone]} />
        ))}
      </View>
      <Text variant="small" tone="muted">
        {`Paso ${String(index + 1)} de ${String(STEPS.length)} · ${label}`}
      </Text>
    </View>
  );
}

function ProfileForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial: ProfessionalProfile | null;
  /** `created` es true si recién se creó el perfil. */
  onSaved: (created: boolean) => void;
  onCancel?: () => void;
}) {
  const specialties = useSpecialties();
  const save = useSaveProfessionalProfile();
  const [name, setName] = useState(initial?.display_name ?? '');
  const [bio, setBio] = useState(initial?.bio ?? '');
  const [chosen, setChosen] = useState<string[]>(initial?.specialties ?? []);
  const [modalities, setModalities] = useState<Modality[]>(initial?.modalities ?? []);
  const [city, setCity] = useState(initial?.city ?? '');
  const [province, setProvince] = useState(initial?.province ?? '');
  const [contact, setContact] = useState(initial?.public_contact ?? '');
  const [years, setYears] = useState(
    initial?.years_experience === null || initial === null ? '' : String(initial.years_experience),
  );
  const [listed, setListed] = useState(initial?.is_listed ?? true);

  // Cada campo muestra su error al salir de él; al guardar, se muestran todos.

  const yearsNumber = years.trim() === '' ? null : Number(years);
  const errors = {
    name: displayNameError(name),
    specialties: chosen.length === 0 ? 'Elegí al menos una especialidad.' : undefined,
    modalities: modalities.length === 0 ? 'Elegí al menos una modalidad.' : undefined,
    bio:
      bio.trim() === ''
        ? undefined
        : requiredError(bio, 20, 'Contá un poco más: al menos 20 caracteres.'),
    city: placeError(city),
    province: placeError(province),
    contact: contactError(contact),
    years: yearsNumber !== null && yearsNumber > 70 ? 'Un número entre 0 y 70.' : undefined,
  };
  const { shown, field, attempt, attempted, hasErrors } = useFieldErrors(errors);

  const input: ProfileInput = {
    display_name: name.trim(),
    bio: bio.trim(),
    modalities,
    city: blank(city),
    province: blank(province),
    public_contact: blank(contact),
    years_experience: yearsNumber,
    is_listed: listed,
    specialties: chosen,
  };
  // Lo último guardado (o lo que vino): si el formulario difiere, salir pregunta antes.
  const [baseline, setBaseline] = useState(() => JSON.stringify(input));
  const current = JSON.stringify(input);
  const guard = useUnsavedGuard(current !== baseline);

  return (
    <Card>
      {guard.dialog}
      <Text variant="subheading">Tus datos</Text>
      <TextField
        label="Nombre profesional"
        placeholder="Por ejemplo: Lic. Paula Ríos"
        value={name}
        onChangeText={setName}
        {...field('name')}
        maxLength={80}
      />
      {specialties.isPending ? (
        <Skeleton height={96} />
      ) : specialties.isError ? (
        // Sin la lista no se puede elegir especialidad ni guardar: se ofrece reintentar.
        <ErrorState
          error={specialties.error}
          title="No pudimos traer las especialidades"
          onRetry={() => void specialties.refetch()}
        />
      ) : (
        <ChipGroup
          multiple
          label="Especialidades"
          options={specialties.data.map((s) => ({ value: s.code, label: s.label }))}
          value={chosen}
          onChange={setChosen}
          error={shown('specialties')}
        />
      )}
      <ChipGroup
        multiple
        label="Modalidad"
        options={MODALITY_OPTIONS}
        value={modalities}
        onChange={setModalities}
        error={shown('modalities')}
      />
      <TextField
        label="Sobre tu trabajo"
        hint="Con quiénes trabajás y cómo. Las familias lo leen en el directorio."
        value={bio}
        onChangeText={setBio}
        {...field('bio')}
        // Varios renglones: Enter escribe un renglón nuevo, no pasa al campo siguiente.
        returnKeyType="default"
        multiline
        maxLength={1200}
      />
      <TextField
        label="Ciudad (opcional)"
        value={city}
        onChangeText={setCity}
        {...field('city')}
        maxLength={80}
      />
      <TextField
        label="Provincia (opcional)"
        value={province}
        onChangeText={setProvince}
        {...field('province')}
        maxLength={80}
      />
      <TextField
        label="Contacto público (opcional)"
        hint="Un correo o un teléfono de consultorio. Se muestra en el directorio."
        value={contact}
        onChangeText={setContact}
        {...field('contact')}
        autoCapitalize="none"
        maxLength={160}
      />
      <TextField
        label="Años de experiencia (opcional)"
        value={years}
        onChangeText={setYears}
        {...field('years')}
        inputMode="numeric"
        mask={digitsMask(2)}
        maxLength={2}
      />
      <Checkbox
        checked={listed}
        onChange={setListed}
        label="Aparecer en el directorio cuando mis credenciales estén verificadas"
      />
      {attempted && hasErrors ? (
        <Banner tone="danger">Revisá los campos marcados antes de guardar.</Banner>
      ) : null}
      <ErrorBanner error={save.error} />
      <Button
        label={initial ? 'Guardar cambios' : 'Crear mi perfil'}
        loading={save.isPending}
        fullWidth
        onPress={() => {
          if (!attempt()) return;
          save.mutate(
            { ...input, exists: initial !== null },
            {
              onSuccess: () => {
                setBaseline(current);
                onSaved(initial === null);
              },
            },
          );
        }}
      />
      {onCancel ? (
        <Button
          label="Cancelar"
          variant="ghost"
          disabled={save.isPending}
          onPress={() => {
            guard.confirm(onCancel);
          }}
        />
      ) : null}
    </Card>
  );
}

type MyCredential = NonNullable<ReturnType<typeof useMyCredentials>['data']>[number];

/** Última revisión de cada credencial: lo que pidió o el motivo de quien verifica. */
function useCredentialReviews() {
  const auth = useAuth();
  const userId = auth.status === 'signedIn' ? auth.session.user.id : undefined;
  return useQuery({
    queryKey: ['professionals', 'me', userId ?? '', 'reviews'],
    enabled: userId !== undefined,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credential_verifications')
        .select('credential_id, result, evidence_note, checked_at')
        .order('checked_at', { ascending: false });
      if (error) throw error;
      const latest = new Map<string, (typeof data)[number]>();
      for (const review of data) {
        if (!latest.has(review.credential_id)) latest.set(review.credential_id, review);
      }
      return latest;
    },
  });
}

interface SendInput extends CredentialInput {
  /** La credencial a corregir; `null` para una nueva. */
  id: string | null;
  previousPath: string | null;
  /** Si la credencial se creó pero el envío falló, el reintento la corrige en vez de duplicarla. */
  onCreated: (created: { id: string; path: string | null }) => void;
}

/** Guarda la credencial (nueva o corregida) y la envía a verificar, en un solo paso. */
function useSendCredential() {
  const auth = useAuth();
  const userId = auth.status === 'signedIn' ? auth.session.user.id : undefined;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, previousPath, onCreated, file, ...fields }: SendInput) => {
      if (!userId) throw new Error('Sin sesión');
      let newPath: string | null = null;
      if (file) {
        const safeName = file.name.replace(/[^\w.-]+/g, '_').slice(-80);
        newPath = `${userId}/${String(Date.now())}-${safeName}`;
        const body = await (await fetch(file.uri)).blob();
        const upload = await supabase.storage
          .from('credentials')
          .upload(newPath, body, { contentType: file.type, upsert: false });
        if (upload.error) throw upload.error;
      }
      let credentialId = id;
      if (credentialId === null) {
        const created = await supabase
          .from('professional_credentials')
          .insert({ ...fields, professional_id: userId, document_path: newPath })
          .select('id')
          .single();
        if (created.error) throw created.error;
        credentialId = created.data.id;
        onCreated({ id: credentialId, path: newPath });
      }
      const { error } = await supabase
        .from('professional_credentials')
        .update({
          ...(id === null ? {} : fields),
          ...(id !== null && newPath ? { document_path: newPath } : {}),
          status: 'submitted',
        })
        .eq('id', credentialId);
      if (error) throw error;
      if (id !== null && newPath && previousPath) {
        await supabase.storage.from('credentials').remove([previousPath]);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['professionals', 'me'] }),
  });
}

function CredentialForm({
  editing,
  onSent,
  onCancel,
}: {
  /** Credencial a corregir y reenviar; sin ella, se carga una nueva. */
  editing?: MyCredential;
  onSent: () => void;
  onCancel?: () => void;
}) {
  const send = useSendCredential();
  const [kind, setKind] = useState<CredentialInput['kind']>(
    (editing?.kind as CredentialInput['kind'] | undefined) ?? 'license',
  );
  const [profession, setProfession] = useState(editing?.profession ?? '');
  const [jurisdiction, setJurisdiction] = useState(editing?.jurisdiction ?? '');
  const [number, setNumber] = useState(editing?.license_number ?? '');
  const [issuer, setIssuer] = useState(editing?.issuer ?? '');
  const [file, setFile] = useState<CredentialInput['file']>(null);
  // Si se creó y falló el envío, el reintento sigue sobre la misma credencial.
  const [created, setCreated] = useState<{ id: string; path: string | null } | null>(null);
  const errors = {
    profession: requiredError(profession, 2, 'Escribí tu profesión, como figura en el título.'),
    jurisdiction: placeError(jurisdiction),
    number:
      number.trim() !== '' && !/^[A-Za-z0-9 ./-]+$/.test(number.trim())
        ? 'Usá solo letras, números, puntos, barras o guiones.'
        : undefined,
    issuer:
      issuer.trim() !== '' && issuer.trim().length < 2 ? 'Escribí quién la emite.' : undefined,
  };
  const { field, attempt, reset: resetErrors } = useFieldErrors(errors);
  // Con algo cargado (o cambiado, al corregir), salir pregunta antes.
  const guard = useUnsavedGuard(
    file !== null ||
      profession !== (editing?.profession ?? '') ||
      jurisdiction !== (editing?.jurisdiction ?? '') ||
      number !== (editing?.license_number ?? '') ||
      issuer !== (editing?.issuer ?? ''),
  );

  const reset = () => {
    setProfession('');
    setJurisdiction('');
    setNumber('');
    setIssuer('');
    setFile(null);
    setCreated(null);
    resetErrors();
  };

  const target = editing
    ? { id: editing.id, path: editing.document_path }
    : (created ?? { id: null, path: null });

  return (
    <View style={{ gap: 12 }}>
      {guard.dialog}
      <Text variant="bodyStrong">
        {editing ? 'Corregí tu credencial' : 'Agregar una credencial'}
      </Text>
      <ChipGroup label="Tipo" options={KIND_OPTIONS} value={kind} onChange={setKind} />
      <TextField
        label="Profesión"
        placeholder="Por ejemplo: Licenciada en Psicopedagogía"
        value={profession}
        onChangeText={setProfession}
        {...field('profession')}
        maxLength={80}
      />
      <TextField
        label="Jurisdicción"
        placeholder="Por ejemplo: Provincia de Buenos Aires"
        value={jurisdiction}
        onChangeText={setJurisdiction}
        {...field('jurisdiction')}
        maxLength={80}
      />
      <TextField
        label="Número de matrícula"
        value={number}
        onChangeText={setNumber}
        {...field('number')}
        autoCapitalize="characters"
        maxLength={40}
      />
      <TextField
        label="Quién la emite"
        placeholder="Por ejemplo: Colegio de Psicopedagogos"
        value={issuer}
        onChangeText={setIssuer}
        {...field('issuer')}
        maxLength={120}
      />
      <Button
        label={
          file
            ? `Archivo: ${file.name}`
            : editing?.document_path
              ? 'Cambiar el archivo'
              : 'Adjuntar archivo (PDF o foto)'
        }
        variant="secondary"
        icon={Paperclip}
        onPress={() => {
          void DocumentPicker.getDocumentAsync({
            type: ['application/pdf', 'image/jpeg', 'image/png'],
            copyToCacheDirectory: true,
          }).then((result) => {
            const asset = result.assets?.[0];
            if (!result.canceled && asset) {
              setFile({
                uri: asset.uri,
                name: asset.name,
                type: asset.mimeType ?? 'application/octet-stream',
              });
            }
          });
        }}
      />
      <Text variant="small" tone="muted">
        {editing?.document_path && !file
          ? 'Ya tiene un archivo. Si no lo cambiás, se envía el mismo. '
          : ''}
        Solo lo ve quien verifica tus credenciales. Máximo 5 MB.
      </Text>
      <ErrorBanner error={send.error} />
      <Button
        label={editing ? 'Corregir y reenviar' : 'Enviar a verificar'}
        icon={Send}
        loading={send.isPending}
        onPress={() => {
          if (!attempt()) return;
          send.mutate(
            {
              id: target.id,
              previousPath: target.path,
              onCreated: setCreated,
              kind,
              profession: profession.trim(),
              jurisdiction: blank(jurisdiction),
              license_number: blank(number),
              issuer: blank(issuer),
              file,
            },
            {
              onSuccess: () => {
                reset();
                onSent();
              },
            },
          );
        }}
      />
      {onCancel ? (
        <Button
          label="Cancelar"
          variant="ghost"
          disabled={send.isPending}
          onPress={() => {
            guard.confirm(onCancel);
          }}
        />
      ) : null}
    </View>
  );
}

/** Paso 2: cargar la matrícula (o corregirla) y enviarla a verificar. */
function CredentialsCard({ onFinish }: { onFinish: () => void }) {
  const credentials = useMyCredentials();
  const reviews = useCredentialReviews();
  const submit = useSubmitCredential();
  const remove = useDeleteCredential();
  const { colors } = useTheme();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [sent, setSent] = useState(false);
  const sentVisible = useOverlayTurn('credencial-enviada', sent);

  const onSent = () => {
    setEditing(null);
    setAdding(false);
    setSent(true);
  };
  const hasAny = (credentials.data?.length ?? 0) > 0;

  return (
    <Card>
      <Text variant="subheading">Tu matrícula</Text>
      <Text tone="muted">Para aparecer en el directorio. La revisamos en unos días.</Text>
      {credentials.isPending ? <Skeleton height={80} /> : null}
      {credentials.isError ? (
        <ErrorState error={credentials.error} onRetry={() => void credentials.refetch()} />
      ) : null}
      {credentials.data?.map((c) => {
        const review = reviews.data?.get(c.id);
        const needsInfo = c.status === 'declared' && review?.result === 'needs_info';
        const rejected = c.status === 'rejected' && review?.result === 'rejected';
        const editable = c.status === 'declared' || c.status === 'rejected';
        const statusLabel = needsInfo
          ? 'Falta información'
          : c.status === 'declared'
            ? 'Sin enviar'
            : CREDENTIAL_STATUS_LABELS[c.status];
        return (
          <View key={c.id} style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <FileBadge size={18} color={colors.primary} aria-hidden />
              <Text variant="bodyStrong">{c.profession}</Text>
              <Badge
                tone={
                  c.status === 'verified'
                    ? 'primary'
                    : needsInfo || rejected
                      ? 'caution'
                      : 'neutral'
                }
              >
                {statusLabel}
              </Badge>
            </View>
            <Text variant="small" tone="muted">
              {[
                CREDENTIAL_KIND_LABELS[c.kind as keyof typeof CREDENTIAL_KIND_LABELS],
                c.license_number,
                c.jurisdiction,
                c.document_path ? 'con archivo' : 'sin archivo',
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            {c.status === 'submitted' ? (
              <Text variant="small" tone="muted">
                La estamos revisando. Suele tardar unos días.
              </Text>
            ) : null}
            {(needsInfo || rejected) && editing !== c.id ? (
              <Banner
                tone={rejected ? 'danger' : 'caution'}
                title={rejected ? 'No la aprobamos. Motivo:' : 'Te pidieron:'}
                action={{
                  label: 'Corregir y reenviar',
                  onPress: () => {
                    setEditing(c.id);
                  },
                }}
              >
                {review?.evidence_note ?? 'Revisá los datos y el archivo.'}
              </Banner>
            ) : null}
            {editing === c.id ? (
              <CredentialForm
                key={c.id}
                editing={c}
                onSent={onSent}
                onCancel={() => {
                  setEditing(null);
                }}
              />
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {c.status === 'declared' && !needsInfo ? (
                  <Button
                    label="Enviar a verificar"
                    icon={Send}
                    loading={submit.isPending && submit.variables === c.id}
                    onPress={() => {
                      submit.mutate(c.id, { onSuccess: onSent });
                    }}
                  />
                ) : null}
                {editable ? (
                  <ConfirmAction
                    label="Borrar"
                    confirmLabel="Sí, borrar"
                    description="Se borra la credencial y su archivo."
                    loading={remove.isPending}
                    onConfirm={() => {
                      remove.mutate({ id: c.id, document_path: c.document_path });
                    }}
                  />
                ) : null}
              </View>
            )}
          </View>
        );
      })}
      <ErrorBanner error={submit.error} />
      <ErrorBanner error={remove.error} />
      {editing !== null || credentials.isPending ? null : !hasAny || adding ? (
        <CredentialForm
          onSent={onSent}
          onCancel={
            hasAny
              ? () => {
                  setAdding(false);
                }
              : undefined
          }
        />
      ) : (
        <Button
          label="Agregar otra credencial"
          variant="secondary"
          icon={Plus}
          onPress={() => {
            setAdding(true);
          }}
        />
      )}
      <GuidePopup
        visible={sentVisible}
        celebrate
        title="¡Enviada!"
        message="La revisamos en unos días. El resultado lo ves en Mi ficha."
        primary={{
          label: 'Ver mi ficha',
          onPress: () => {
            setSent(false);
            onFinish();
          },
        }}
        secondary={{
          label: 'Ir a mis casos',
          onPress: () => {
            setSent(false);
            router.push('/profesional');
          },
        }}
        onClose={() => {
          setSent(false);
          onFinish();
        }}
      />
    </Card>
  );
}

type Credentials = NonNullable<ReturnType<typeof useMyCredentials>['data']>;

/** ¿Ya mandó alguna credencial (en revisión o aprobada)? */
function hasSentCredential(credentials: Credentials | undefined): boolean {
  return (credentials ?? []).some((c) => c.status === 'submitted' || c.status === 'verified');
}

/** Dónde arranca la pantalla: con la matrícula enviada (o verificado), en "Listo". */
function startStep(profile: ProfessionalProfile, credentials: Credentials | undefined): Step {
  if (profile.verification_status === 'verified' || hasSentCredential(credentials)) return 'listo';
  return 'matricula';
}

/** Paso 3 (y modo lectura si ya está verificado): lo cargado, con "Editar" en cada parte. */
function Summary({
  profile,
  onEdit,
  savedKey,
}: {
  profile: ProfessionalProfile;
  onEdit: (step: Step) => void;
  /** Al volver de guardar los datos, "Editar mis datos" muestra "✓ Guardado" un momento. */
  savedKey: number;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const specialties = useSpecialties();
  const credentials = useMyCredentials();
  const sent = hasSentCredential(credentials.data);
  const specialtyLabels = profile.specialties.map(
    (code) => specialties.data?.find((s) => s.code === code)?.label ?? code,
  );
  const place = [profile.city, profile.province].filter(Boolean).join(', ');
  return (
    <>
      <Card>
        <Text variant="subheading">Tus datos</Text>
        <Text variant="bodyStrong">{profile.display_name}</Text>
        {specialtyLabels.length > 0 ? <Text>{specialtyLabels.join(' · ')}</Text> : null}
        <Text tone="muted">
          {[profile.modalities.map((m) => MODALITY_LABELS[m]).join(' y '), place]
            .filter(Boolean)
            .join(' · ')}
        </Text>
        <Button
          label="Editar mis datos"
          variant="secondary"
          icon={Pencil}
          savedKey={savedKey}
          onPress={() => {
            onEdit('datos');
          }}
        />
      </Card>
      <Card>
        <Text variant="subheading">Tu matrícula</Text>
        {credentials.isPending ? <Skeleton height={48} /> : null}
        {credentials.isError ? (
          <ErrorState error={credentials.error} onRetry={() => void credentials.refetch()} />
        ) : null}
        {credentials.data?.length === 0 ? <Text tone="muted">Todavía no la cargaste.</Text> : null}
        {credentials.data?.map((c) => (
          <View key={c.id} style={styles.row}>
            <FileBadge size={18} color={colors.primary} aria-hidden />
            <Text variant="bodyStrong">{c.profession}</Text>
            <Badge tone={c.status === 'verified' ? 'primary' : 'neutral'}>
              {c.status === 'declared' ? 'Sin enviar' : CREDENTIAL_STATUS_LABELS[c.status]}
            </Badge>
          </View>
        ))}
        <Button
          label={sent ? 'Ver o agregar' : 'Cargar mi matrícula'}
          variant={sent ? 'secondary' : 'primary'}
          icon={sent ? Pencil : FileBadge}
          onPress={() => {
            onEdit('matricula');
          }}
        />
      </Card>
      {sent ? (
        <Button
          label="Ir a mis casos"
          icon={BriefcaseMedical}
          fullWidth
          onPress={() => {
            router.push('/profesional');
          }}
        />
      ) : null}
    </>
  );
}

/**
 * Mi ficha profesional en tres pasos: Tus datos → Tu matrícula → Listo. Ya verificada, se ve
 * en modo lectura y cada parte tiene su "Editar".
 */
export default function ProfessionalProfileScreen() {
  const profile = useMyProfessionalProfile();
  const credentials = useMyCredentials();
  // Sin elegir un paso, se arranca donde corresponde (startStep).
  const [chosen, setChosen] = useState<Step | null>(null);
  const [created, setCreated] = useState(false);
  const createdVisible = useOverlayTurn('perfil-creado', created);
  const [savedKey, setSavedKey] = useState(0);

  if (profile.isPending || (profile.data && credentials.isPending)) return <LoadingScreen />;
  if (profile.isError) {
    return <ErrorScreen error={profile.error} onRetry={() => void profile.refetch()} />;
  }

  const data = profile.data;
  const step: Step = data ? (chosen ?? startStep(data, credentials.data)) : 'datos';
  const verified = data?.verification_status === 'verified';
  // Cambiar de paso desarma el formulario abierto: si tiene cambios, pregunta antes.
  const goTo = (next: Step) => {
    confirmLeave(() => {
      setSavedKey(0);
      setChosen(next);
    });
  };

  return (
    <Screen scrollKey={step}>
      <Text variant="title">{data ? 'Mi ficha' : 'Crear tu perfil profesional'}</Text>
      {data ? (
        <VerificationBadge status={data.verification_status} />
      ) : (
        <Text tone="muted">Las familias te encuentran en el directorio.</Text>
      )}
      {/* Ya verificada, la ficha se lee y se edita por partes: sin pasos. */}
      {verified && step === 'listo' ? null : <StepProgress step={step} />}

      {step === 'datos' || !data ? (
        <ProfileForm
          key={data?.user_id ?? 'new'}
          initial={data}
          onSaved={(isNew) => {
            if (isNew) {
              setCreated(true);
              setChosen('matricula');
            } else {
              setSavedKey((n) => n + 1);
              setChosen('listo');
            }
          }}
          onCancel={
            data
              ? () => {
                  setChosen('listo');
                }
              : undefined
          }
        />
      ) : step === 'matricula' ? (
        <>
          <CredentialsCard
            onFinish={() => {
              setChosen('listo');
            }}
          />
          <StepNav
            onBack={() => {
              goTo('datos');
            }}
            nextLabel={hasSentCredential(credentials.data) ? 'Ver mi ficha' : 'Lo hago después'}
            onNext={() => {
              goTo('listo');
            }}
          />
        </>
      ) : (
        <Summary profile={data} onEdit={goTo} savedKey={savedKey} />
      )}

      <GuidePopup
        visible={createdVisible}
        celebrate
        title="¡Creaste tu perfil!"
        message="Ahora cargá tu matrícula para aparecer en el directorio."
        primary={{
          label: 'Cargar mi matrícula',
          onPress: () => {
            setCreated(false);
            setChosen('matricula');
          },
        }}
        secondary={{
          label: 'Más tarde',
          onPress: () => {
            setCreated(false);
            setChosen('listo');
          },
        }}
        onClose={() => {
          setCreated(false);
        }}
      />
    </Screen>
  );
}
