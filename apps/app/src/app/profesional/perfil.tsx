import * as DocumentPicker from 'expo-document-picker';
import { FileBadge, Paperclip, Send } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import {
  contactError,
  displayNameError,
  placeError,
  requiredError,
} from '@/features/forms/validators';
import { useFieldErrors } from '@/features/forms/useFieldErrors';
import { VerificationBadge } from '@/features/professionals/components';
import {
  CREDENTIAL_KIND_LABELS,
  CREDENTIAL_STATUS_LABELS,
  MODALITY_LABELS,
  type Modality,
} from '@/features/professionals/labels';
import {
  useAddCredential,
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
  Screen,
  Skeleton,
  Text,
  digitsMask,
  TextField,
  useTheme,
} from '@/ui';

const MODALITY_OPTIONS = (Object.keys(MODALITY_LABELS) as Modality[]).map((value) => ({
  value,
  label: MODALITY_LABELS[value],
}));
const KIND_OPTIONS = (
  Object.keys(CREDENTIAL_KIND_LABELS) as (keyof typeof CREDENTIAL_KIND_LABELS)[]
).map((value) => ({ value, label: CREDENTIAL_KIND_LABELS[value] }));

const blank = (s: string) => (s.trim() === '' ? null : s.trim());

function ProfileForm({ initial }: { initial: ProfessionalProfile | null }) {
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
  const { touch, shown, attempt, attempted, hasErrors } = useFieldErrors(errors);

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

  return (
    <Card>
      <Text variant="subheading">{initial ? 'Tu perfil' : 'Crear tu perfil profesional'}</Text>
      <TextField
        label="Nombre profesional"
        placeholder="Por ejemplo: Lic. Paula Ríos"
        value={name}
        onChangeText={setName}
        onBlur={touch('name')}
        error={shown('name')}
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
        onBlur={touch('bio')}
        error={shown('bio')}
        multiline
        maxLength={1200}
      />
      <TextField
        label="Ciudad (opcional)"
        value={city}
        onChangeText={setCity}
        onBlur={touch('city')}
        error={shown('city')}
        maxLength={80}
      />
      <TextField
        label="Provincia (opcional)"
        value={province}
        onChangeText={setProvince}
        onBlur={touch('province')}
        error={shown('province')}
        maxLength={80}
      />
      <TextField
        label="Contacto público (opcional)"
        hint="Un correo o un teléfono de consultorio. Se muestra en el directorio."
        value={contact}
        onChangeText={setContact}
        onBlur={touch('contact')}
        error={shown('contact')}
        autoCapitalize="none"
        maxLength={160}
      />
      <TextField
        label="Años de experiencia (opcional)"
        value={years}
        onChangeText={setYears}
        onBlur={touch('years')}
        inputMode="numeric"
        mask={digitsMask(2)}
        error={shown('years')}
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
      {save.isSuccess ? <Banner tone="success">Guardamos tu perfil.</Banner> : null}
      <ErrorBanner error={save.error} />
      <Button
        label={initial ? 'Guardar cambios' : 'Crear mi perfil'}
        loading={save.isPending}
        onPress={() => {
          if (!attempt()) return;
          save.mutate({ ...input, exists: initial !== null });
        }}
      />
    </Card>
  );
}

function AddCredential() {
  const add = useAddCredential();
  const [kind, setKind] = useState<CredentialInput['kind']>('license');
  const [profession, setProfession] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [number, setNumber] = useState('');
  const [issuer, setIssuer] = useState('');
  const [file, setFile] = useState<CredentialInput['file']>(null);
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
  const { touch, shown, attempt, reset: resetErrors } = useFieldErrors(errors);

  const reset = () => {
    setProfession('');
    setJurisdiction('');
    setNumber('');
    setIssuer('');
    setFile(null);
  };

  return (
    <View style={{ gap: 12 }}>
      <Text variant="bodyStrong">Agregar una credencial</Text>
      <ChipGroup label="Tipo" options={KIND_OPTIONS} value={kind} onChange={setKind} />
      <TextField
        label="Profesión"
        placeholder="Por ejemplo: Licenciada en Psicopedagogía"
        value={profession}
        onChangeText={setProfession}
        onBlur={touch('profession')}
        error={shown('profession')}
        maxLength={80}
      />
      <TextField
        label="Jurisdicción"
        placeholder="Por ejemplo: Provincia de Buenos Aires"
        value={jurisdiction}
        onChangeText={setJurisdiction}
        onBlur={touch('jurisdiction')}
        error={shown('jurisdiction')}
        maxLength={80}
      />
      <TextField
        label="Número de matrícula"
        value={number}
        onChangeText={setNumber}
        onBlur={touch('number')}
        error={shown('number')}
        autoCapitalize="characters"
        maxLength={40}
      />
      <TextField
        label="Quién la emite"
        placeholder="Por ejemplo: Colegio de Psicopedagogos"
        value={issuer}
        onChangeText={setIssuer}
        onBlur={touch('issuer')}
        error={shown('issuer')}
        maxLength={120}
      />
      <Button
        label={file ? `Archivo: ${file.name}` : 'Adjuntar archivo (PDF o foto)'}
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
        El archivo queda en un espacio privado: solo lo ve quien verifica tus credenciales. Máximo 5
        MB.
      </Text>
      <ErrorBanner error={add.error} />
      <Button
        label="Guardar credencial"
        loading={add.isPending}
        onPress={() => {
          if (!attempt()) return;
          add.mutate(
            {
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
                resetErrors();
              },
            },
          );
        }}
      />
    </View>
  );
}

function CredentialsCard() {
  const credentials = useMyCredentials();
  const submit = useSubmitCredential();
  const remove = useDeleteCredential();
  const { colors } = useTheme();

  return (
    <Card>
      <Text variant="subheading">Credenciales</Text>
      <Text tone="muted">
        Para aparecer en el directorio, cargá tu matrícula o tu título y envialo a verificar. Crecer
        en Casa lo revisa (por ejemplo, en REFEPS o con el colegio profesional).
      </Text>
      {credentials.isPending ? <Skeleton height={80} /> : null}
      {credentials.isError ? (
        <ErrorState error={credentials.error} onRetry={() => void credentials.refetch()} />
      ) : null}
      {credentials.data?.map((c) => (
        <View key={c.id} style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <FileBadge size={18} color={colors.primary} aria-hidden />
            <Text variant="bodyStrong">{c.profession}</Text>
            <Badge tone={c.status === 'verified' ? 'primary' : 'neutral'}>
              {CREDENTIAL_STATUS_LABELS[c.status]}
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
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {c.status === 'declared' || c.status === 'rejected' ? (
              <Button
                label="Enviar a verificar"
                icon={Send}
                loading={submit.isPending && submit.variables === c.id}
                onPress={() => {
                  submit.mutate(c.id);
                }}
              />
            ) : null}
            {c.status === 'declared' || c.status === 'rejected' ? (
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
        </View>
      ))}
      <ErrorBanner error={submit.error} />
      <ErrorBanner error={remove.error} />
      <AddCredential />
    </Card>
  );
}

export default function ProfessionalProfileScreen() {
  const profile = useMyProfessionalProfile();

  if (profile.isPending) return <LoadingScreen />;
  if (profile.isError) {
    return <ErrorScreen error={profile.error} onRetry={() => void profile.refetch()} />;
  }

  return (
    <Screen>
      <Text variant="title">Mi perfil profesional</Text>
      {profile.data ? (
        <VerificationBadge status={profile.data.verification_status} />
      ) : (
        <Text tone="muted">Las familias te encuentran en el directorio.</Text>
      )}
      <ProfileForm key={profile.data?.user_id ?? 'new'} initial={profile.data} />
      {profile.data ? <CredentialsCard /> : null}
    </Screen>
  );
}
