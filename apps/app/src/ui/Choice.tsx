import { Check, Trash2, type LucideIcon } from 'lucide-react-native';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from './Button';
import { useOverlayTurn } from './OverlayQueue';
import { Sheet, useInSheet } from './Sheet';
import { Text } from './Text';
import { makeStyles, useTheme } from './theme';
import { minTouchTarget } from './tokens';

const useStyles = makeStyles((t) => ({
  group: { gap: t.space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.xs,
    minHeight: minTouchTarget,
    paddingHorizontal: t.space.lg,
    borderRadius: t.radius.pill,
    borderWidth: 2,
    // Contorno de 3:1 como mínimo: sin elegir, el chip igual tiene que verse como botón.
    borderColor: t.colors.borderStrong,
    backgroundColor: t.colors.surface,
  },
  chipActive: { borderColor: t.colors.brand, backgroundColor: t.colors.primarySoft },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: t.space.sm,
    paddingVertical: 2,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.surfaceSunken,
  },
  badgeCaution: { backgroundColor: t.colors.cautionSoft },
  badgePrimary: { backgroundColor: t.colors.primarySoft },
  confirmActions: { gap: t.space.sm },
  confirmInline: {
    gap: t.space.md,
    padding: t.space.lg,
    borderRadius: t.radius.lg,
    borderWidth: 2,
    borderColor: t.colors.borderStrong,
    backgroundColor: t.colors.surface,
  },
}));

interface Option<V extends string> {
  value: V;
  label: string;
}

/**
 * Opciones como chips. `multiple`: casillas (checkbox); si no, opción única (radio).
 * Siempre con etiqueta del grupo visible.
 */
export function ChipGroup<V extends string>({
  label,
  options,
  value,
  onChange,
  error,
}: {
  label: string;
  options: readonly Option<V>[];
  error?: string | undefined;
} & (
  | { multiple?: false; value: V | null; onChange: (value: V) => void }
  | { multiple: true; value: V[]; onChange: (value: V[]) => void }
)) {
  const styles = useStyles();
  const { colors } = useTheme();
  const multiple = Array.isArray(value);
  const isSelected = (option: V) => (multiple ? value.includes(option) : value === option);

  return (
    <View style={styles.group}>
      <Text variant="label">{label}</Text>
      <View
        style={styles.chips}
        role={multiple ? 'group' : 'radiogroup'}
        accessibilityLabel={label}
      >
        {options.map((option) => {
          const selected = isSelected(option.value);
          return (
            <Pressable
              key={option.value}
              accessibilityRole={multiple ? 'checkbox' : 'radio'}
              accessibilityState={{ checked: selected }}
              accessibilityLabel={option.label}
              style={[styles.chip, selected && styles.chipActive]}
              onPress={() => {
                if (Array.isArray(value)) {
                  (onChange as (v: V[]) => void)(
                    selected ? value.filter((v) => v !== option.value) : [...value, option.value],
                  );
                } else {
                  (onChange as (v: V) => void)(option.value);
                }
              }}
            >
              {selected ? <Check color={colors.primary} size={16} aria-hidden /> : null}
              <Text variant={selected ? 'bodyStrong' : 'body'}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <Text variant="small" tone="danger" role="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function Badge({
  children,
  tone = 'neutral',
  icon: Icon,
}: {
  children: string;
  tone?: 'neutral' | 'caution' | 'primary';
  icon?: LucideIcon | undefined;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.badge,
        tone === 'caution' && styles.badgeCaution,
        tone === 'primary' && styles.badgePrimary,
      ]}
    >
      {Icon ? (
        <Icon color={tone === 'primary' ? colors.primary : colors.inkMuted} size={14} aria-hidden />
      ) : null}
      <Text variant="caption">{children}</Text>
    </View>
  );
}

/**
 * Acción que borra o quita, en dos pasos. El botón es rojo suave con ícono (tacho por defecto);
 * al tocarlo aparece una frase y dos botones: confirmar o "Cancelar".
 * - Suelta en una pantalla, la pregunta se abre en su propia ventana, con turno en la cola de
 *   ventanas (`useOverlayTurn`).
 * - Adentro de un `Sheet` (o con `inline`), la pregunta reemplaza al botón en el mismo lugar:
 *   no se abre una ventana encima de otra.
 * Con `loading`, la pregunta queda a la vista mientras se hace y se cierra sola al terminar.
 */
export function ConfirmAction({
  label,
  confirmLabel,
  description,
  onConfirm,
  loading,
  icon = Trash2,
  title,
  inline,
}: {
  label: string;
  confirmLabel: string;
  /** Una frase con la consecuencia ("Se borra ya. No se puede deshacer."). */
  description: ReactNode;
  onConfirm: () => void;
  loading?: boolean;
  /** Ícono del botón (por ejemplo, un candado para "Revocar"). */
  icon?: LucideIcon;
  /** Título de la ventana; si no, "¿{label}?". */
  title?: string;
  /** Pregunta en el mismo lugar, sin ventana. Por defecto, sí cuando está adentro de un `Sheet`. */
  inline?: boolean;
}) {
  const styles = useStyles();
  const inSheet = useInSheet();
  const isInline = inline ?? inSheet;
  const [open, setOpen] = useState(false);
  const wasLoading = useRef(false);
  const id = useId();
  const visible = useOverlayTurn(`confirmar-${id}`, open && !isInline);

  // Al terminar la acción (loading pasa de true a false) la ventana se cierra sola.
  useEffect(() => {
    if (wasLoading.current && loading !== true) setOpen(false);
    wasLoading.current = loading === true;
  }, [loading]);

  const close = () => {
    if (loading !== true) setOpen(false);
  };

  const question = title ?? `¿${label}?`;
  const body = typeof description === 'string' ? <Text>{description}</Text> : description;
  const actions = (
    <View style={styles.confirmActions}>
      <Button
        label={confirmLabel}
        variant="danger"
        icon={icon}
        loading={loading}
        fullWidth
        onPress={() => {
          onConfirm();
          if (loading === undefined) setOpen(false);
        }}
      />
      <Button label="Cancelar" variant="secondary" disabled={loading} fullWidth onPress={close} />
    </View>
  );
  const trigger = (
    <Button
      label={label}
      variant="dangerSoft"
      icon={icon}
      onPress={() => {
        setOpen(true);
      }}
    />
  );

  if (isInline) {
    if (!open) return trigger;
    return (
      <View style={styles.confirmInline} accessibilityLiveRegion="polite">
        <Text variant="bodyStrong" role="heading">
          {question}
        </Text>
        {body}
        {actions}
      </View>
    );
  }

  return (
    <>
      {trigger}
      <Sheet visible={visible} onClose={close} title={question}>
        {body}
        {actions}
      </Sheet>
    </>
  );
}
