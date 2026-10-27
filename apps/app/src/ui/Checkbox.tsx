import { Check } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from './Text';
import { makeStyles, useTheme } from './theme';
import { minTouchTarget } from './tokens';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Texto accesible; si `children` tiene enlaces, este texto resume la casilla. */
  label: string;
  children?: ReactNode;
  error?: string | undefined;
  disabled?: boolean;
}

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: t.space.md,
    minHeight: minTouchTarget,
  },
  box: {
    width: 24,
    height: 24,
    marginTop: 2,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: t.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.surface,
  },
  checked: { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
  invalid: { borderColor: t.colors.danger },
  body: { flex: 1, gap: t.space.xs },
}));

export function Checkbox({ checked, onChange, label, children, error, disabled }: CheckboxProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={label}
        accessibilityState={{ checked, disabled: disabled === true }}
        disabled={disabled}
        onPress={() => {
          onChange(!checked);
        }}
        style={styles.row}
      >
        <View style={[styles.box, checked && styles.checked, error ? styles.invalid : null]}>
          {checked && <Check color={colors.onPrimary} size={16} strokeWidth={3} />}
        </View>
        <View style={styles.body}>{children ?? <Text>{label}</Text>}</View>
      </Pressable>
      {error ? (
        <Text variant="small" tone="danger" role="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
