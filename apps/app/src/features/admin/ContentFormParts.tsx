import { AGE_STAGES, EVIDENCE_LABELS, type EvidenceLabel } from '@crecer/shared';
import { Link } from 'expo-router';
import { CircleCheck, Eye, Plus, type LucideIcon } from 'lucide-react-native';
import { useId, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Brote } from '@/features/brote/Brote';
import {
  Button,
  Card,
  Checkbox,
  ChipGroup,
  Disclosure,
  makeStyles,
  Sheet,
  Text,
  TextField,
  useOverlayTurn,
  useTheme,
} from '@/ui';
import { minTouchTarget } from '@/ui/tokens';

import { useAdminSources } from './queries';
import { SourceForm } from './SourceForm';

export const AGE_STAGE_OPTIONS = AGE_STAGES.map((s) => ({ value: s.slug, label: s.label }));

/** Etapas elegidas → rango de edad en meses (de la menor a la mayor). */
export function agesFromStages(slugs: string[]): { min: number; max: number } | null {
  const chosen = AGE_STAGES.filter((s) => slugs.includes(s.slug));
  if (chosen.length === 0) return null;
  return {
    min: Math.min(...chosen.map((s) => s.minMonths)),
    max: Math.max(...chosen.map((s) => s.maxMonths)),
  };
}

const EVIDENCE_OPTIONS = Object.entries(EVIDENCE_LABELS).map(([value, { label }]) => ({
  value: value as EvidenceLabel,
  label,
}));

/** En qué se basa lo cargado. Va dentro de "Más detalles": por defecto, propuesta del proyecto. */
export function EvidencePicker({
  value,
  onChange,
}: {
  value: EvidenceLabel;
  onChange: (value: EvidenceLabel) => void;
}) {
  return (
    <ChipGroup
      label="¿En qué se basa?"
      options={EVIDENCE_OPTIONS}
      value={value}
      onChange={onChange}
    />
  );
}

/**
 * `Disclosure` que se abre solo cuando adentro aparece un error (y queda abierto: si se cerrara
 * al corregir, el campo desaparecería mientras se escribe).
 */
export function DetailsDisclosure({
  title,
  hasError,
  children,
}: {
  title: string;
  hasError: boolean;
  children: ReactNode;
}) {
  const [forced, setForced] = useState(false);
  if (hasError && !forced) setForced(true);
  return (
    <Disclosure key={forced ? 'abierto' : 'cerrado'} title={title} initiallyOpen={forced}>
      {children}
    </Disclosure>
  );
}

const useIconStyles = makeStyles((t) => ({
  button: {
    width: minTouchTarget,
    height: minTouchTarget,
    borderRadius: minTouchTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: t.colors.surfaceSunken },
}));

/** Botón de solo ícono, de 48 px (por ejemplo, el tacho para quitar un paso). */
export function IconButton({
  icon: Icon,
  label,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
}) {
  const styles = useIconStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Icon color={colors.inkMuted} size={22} aria-hidden />
    </Pressable>
  );
}

/** Lo mismo que acepta la base (panel_source_ids). */
const MAX_SOURCES = 20;

const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Elegir fuentes buscando por texto, o cargar una nueva sin salir del formulario. */
export function SourcePicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const sources = useAdminSources();
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const addingId = useId();
  const addingVisible = useOverlayTurn(`nueva-fuente-${addingId}`, adding);
  const all = sources.data ?? [];
  const selected = all.filter((s) => value.includes(s.id));
  const q = normalize(query.trim());
  const matches =
    q.length < 2 || value.length >= MAX_SOURCES
      ? []
      : all.filter((s) => !value.includes(s.id) && normalize(s.citation).includes(q)).slice(0, 6);

  return (
    <View style={{ gap: 10 }}>
      {selected.map((s) => (
        <Checkbox
          key={s.id}
          checked
          label={s.citation}
          onChange={() => {
            onChange(value.filter((id) => id !== s.id));
          }}
        />
      ))}
      {sources.isError ? (
        <Text variant="small" tone="danger">
          No pudimos traer las fuentes. Probá de nuevo en un rato.
        </Text>
      ) : null}
      {value.length >= MAX_SOURCES ? (
        <Text variant="small" tone="muted">
          Llegaste al máximo de {MAX_SOURCES} fuentes.
        </Text>
      ) : (
        <TextField
          label="Buscar una fuente"
          hint={
            sources.isPending ? 'Cargando las fuentes…' : 'Escribí parte del autor o del título.'
          }
          value={query}
          onChangeText={setQuery}
        />
      )}
      {matches.map((s) => (
        <Checkbox
          key={s.id}
          checked={false}
          label={s.citation}
          onChange={() => {
            onChange([...value, s.id]);
            setQuery('');
          }}
        />
      ))}
      {q.length >= 2 && matches.length === 0 && sources.isSuccess ? (
        <Text variant="small" tone="muted">
          No hay coincidencias.
        </Text>
      ) : null}
      <Button
        label="Cargar una fuente nueva"
        variant="ghost"
        icon={Plus}
        onPress={() => {
          setAdding(true);
        }}
      />
      <Sheet
        visible={addingVisible}
        title="Nueva fuente"
        onClose={() => {
          setAdding(false);
        }}
      >
        <SourceForm
          onCreated={(source) => {
            onChange([...value, source.id]);
            setAdding(false);
          }}
        />
      </Sheet>
    </View>
  );
}

/** Publicar ya o dejar en borrador (sin permiso de publicación, siempre borrador). */
export function PublishChoice({
  canPublish,
  value,
  onChange,
}: {
  canPublish: boolean;
  value: boolean;
  onChange: (publish: boolean) => void;
}) {
  if (!canPublish) {
    return <Text tone="muted">Queda guardada sin publicar hasta que alguien la publique.</Text>;
  }
  return (
    <Checkbox checked={value} onChange={onChange} label="Publicar ahora">
      <Text variant="bodyStrong">Publicar ahora</Text>
      <Text variant="small" tone="muted">
        Si no, queda guardada y las familias no la ven.
      </Text>
    </Checkbox>
  );
}

/** Pantalla de "¡Listo!" después de guardar. */
export function CreatedView({
  title,
  published,
  viewHref,
  onAnother,
  anotherLabel,
  message,
}: {
  title: string;
  /** Reemplaza el texto de publicada / en borrador. */
  message?: string;
  published: boolean;
  viewHref: string | null;
  onAnother: () => void;
  anotherLabel: string;
}) {
  return (
    <Card style={{ alignItems: 'center', gap: 14 }}>
      <Brote mood="feliz" size={128} celebrate={1} />
      <Text variant="title" center>
        ¡Listo!
      </Text>
      <Text variant="subheading" center>
        {message ??
          (published
            ? `"${title}" ya la ven las familias.`
            : `"${title}" quedó guardada sin publicar.`)}
      </Text>
      {message === undefined && published ? (
        <Text tone="muted" center>
          El asistente la va a conocer en la próxima actualización.
        </Text>
      ) : null}
      <View style={{ gap: 10, alignSelf: 'stretch' }}>
        {published && viewHref ? (
          <Link href={viewHref as never} asChild>
            <Button label="Verla en la app" icon={CircleCheck} fullWidth />
          </Link>
        ) : null}
        <Button
          label={anotherLabel}
          variant="secondary"
          icon={Plus}
          fullWidth
          onPress={onAnother}
        />
      </View>
    </Card>
  );
}

/**
 * Dos columnas en pantallas anchas (formulario y vista previa al lado). En el celular, la vista
 * previa se abre con "Ver cómo queda", antes de guardar (`footer`: publicar, avisos y Guardar).
 */
export function FormWithPreview({
  wide,
  form,
  preview,
  footer,
}: {
  wide: boolean;
  form: ReactNode;
  preview: ReactNode;
  footer: ReactNode;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewId = useId();
  const previewVisible = useOverlayTurn(`vista-previa-${previewId}`, previewOpen && !wide);
  if (!wide) {
    return (
      <View style={{ gap: 20 }}>
        {form}
        <Button
          label="Ver cómo queda"
          variant="secondary"
          icon={Eye}
          fullWidth
          onPress={() => {
            setPreviewOpen(true);
          }}
        />
        {footer}
        <Sheet
          visible={previewVisible}
          title="Cómo queda"
          onClose={() => {
            setPreviewOpen(false);
          }}
        >
          {preview}
        </Sheet>
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', gap: 24, alignItems: 'flex-start' }}>
      <View style={{ flex: 1, gap: 20 }}>
        {form}
        {footer}
      </View>
      <View style={{ width: 380 }}>{preview}</View>
    </View>
  );
}
