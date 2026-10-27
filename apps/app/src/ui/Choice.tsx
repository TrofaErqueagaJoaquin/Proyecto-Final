import { Check, type LucideIcon } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from './Button';
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
    borderWidth: 1.5,
    borderColor: t.colors.borderStrong,
    backgroundColor: t.colors.surface,
  },
  chipActive: { borderColor: t.colors.primary, backgroundColor: t.colors.primarySoft },
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
  confirm: {
    gap: t.space.sm,
    padding: t.space.md,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.dangerSoft,
  },
  confirmActions: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm },
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
 * Acción destructiva en dos pasos, en línea (Alert.alert no funciona en la web).
 * Primero muestra el botón; al tocarlo, explica la consecuencia y pide confirmar.
 */
export function ConfirmAction({
  label,
  confirmLabel,
  description,
  onConfirm,
  loading,
}: {
  label: string;
  confirmLabel: string;
  description: ReactNode;
  onConfirm: () => void;
  loading?: boolean;
}) {
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Button
        label={label}
        variant="ghost"
        onPress={() => {
          setOpen(true);
        }}
      />
    );
  }
  return (
    <View style={styles.confirm} role="alert">
      {typeof description === 'string' ? <Text>{description}</Text> : description}
      <View style={styles.confirmActions}>
        <Button label={confirmLabel} variant="danger" loading={loading} onPress={onConfirm} />
        <Button
          label="Cancelar"
          variant="secondary"
          disabled={loading}
          onPress={() => {
            setOpen(false);
          }}
        />
      </View>
    </View>
  );
}
