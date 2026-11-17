import { X } from 'lucide-react-native';
import { createContext, useContext, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from './Text';
import { makeStyles, useTheme } from './theme';
import { minTouchTarget } from './tokens';

const useStyles = makeStyles((t) => ({
  backdrop: { flex: 1, backgroundColor: 'rgba(20, 16, 24, 0.55)', justifyContent: 'flex-end' },
  // En pantallas anchas se muestra centrado, como una ventana; en el celular sube desde abajo.
  panel: {
    width: '100%',
    maxWidth: 640,
    maxHeight: '92%',
    alignSelf: 'center',
    backgroundColor: t.colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.sm,
    paddingHorizontal: t.space.lg,
    paddingTop: t.space.md,
    paddingBottom: t.space.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: t.colors.borderStrong,
    marginTop: t.space.sm,
    opacity: 0.5,
  },
  close: {
    width: minTouchTarget,
    height: minTouchTarget,
    borderRadius: minTouchTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.surfaceSunken,
  },
  content: { paddingHorizontal: t.space.lg, gap: t.space.lg },
}));

const InSheetContext = createContext(false);

/**
 * ¿Está adentro de una ventana (`Sheet`)? Sirve para no abrir otra encima: dos Modal a la vez
 * se apilan en Android y web, y en iOS el segundo no se llega a presentar.
 */
export function useInSheet(): boolean {
  return useContext(InSheetContext);
}

/**
 * Ventana que sube desde abajo con el detalle de algo (una actividad, una ficha). Lo principal
 * queda en la tarjeta; lo demás, acá, para no llenar la pantalla de texto.
 */
export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* En iOS el teclado no achica la ventana solo: sin esto tapa los campos de abajo. */}
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
        />
        <View style={styles.panel} accessibilityViewIsModal>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text variant="heading" style={{ flex: 1 }}>
              {title ?? ''}
            </Text>
            <Pressable
              onPress={onClose}
              style={styles.close}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
            >
              <X color={colors.ink} size={22} aria-hidden />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
            keyboardShouldPersistTaps="handled"
          >
            <InSheetContext.Provider value>{children}</InSheetContext.Provider>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
