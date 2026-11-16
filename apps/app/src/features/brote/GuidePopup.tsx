import type { ReactNode } from 'react';
import { Modal, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { Confetti } from '@/features/chequeo/Confetti';
import { Button, makeStyles, Text } from '@/ui';

import { Brote, type BroteMood } from './Brote';

const useStyles = makeStyles((t) => ({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 16, 24, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: t.space.lg,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: t.colors.bg,
    borderRadius: 28,
    padding: t.space.xl,
    gap: t.space.lg,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: t.colors.brand,
  },
  actions: { alignSelf: 'stretch', gap: t.space.sm },
}));

export interface GuideAction {
  label: string;
  onPress: () => void;
}

/**
 * Ventanita de Brote que guía al siguiente paso: al terminar una actividad, al terminar un
 * chequeo, al ganar un logro o al volver después de unos días. Grande, corta y con una acción
 * principal clara.
 */
export function GuidePopup({
  visible,
  mood = 'feliz',
  title,
  message,
  children,
  primary,
  secondary,
  celebrate = false,
  onClose,
}: {
  visible: boolean;
  mood?: BroteMood;
  title: string;
  message?: string;
  children?: ReactNode;
  primary?: GuideAction;
  secondary?: GuideAction;
  celebrate?: boolean;
  onClose: () => void;
}) {
  const styles = useStyles();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Animated.View
          entering={ZoomIn.springify().damping(14)}
          style={styles.card}
          accessibilityViewIsModal
        >
          {celebrate ? <Confetti trigger={visible ? 1 : 0} /> : null}
          <Brote mood={mood} size={128} celebrate={visible && celebrate ? 1 : 0} />
          <Text variant="title" center accessibilityRole="header">
            {title}
          </Text>
          {message ? (
            <Text variant="subheading" tone="muted" center>
              {message}
            </Text>
          ) : null}
          {children}
          <View style={styles.actions}>
            {primary ? <Button label={primary.label} fullWidth onPress={primary.onPress} /> : null}
            <Button
              label={secondary?.label ?? 'Cerrar'}
              variant="ghost"
              fullWidth
              onPress={secondary?.onPress ?? onClose}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
