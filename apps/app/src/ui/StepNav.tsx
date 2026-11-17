import { ChevronLeft, type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { Button } from './Button';
import { makeStyles } from './theme';

const useStyles = makeStyles((t) => ({
  // "Atrás" siempre a la izquierda y el principal a la derecha; en pantallas angostas, cada uno
  // ocupa la mitad (y si no entran, el principal pasa arriba a lo ancho).
  row: { flexDirection: 'row', flexWrap: 'wrap-reverse', gap: t.space.sm },
  slot: { flexGrow: 1, flexBasis: 140 },
}));

/**
 * Botones de un paso a paso, siempre iguales: "Atrás" (secundario) a la izquierda y el principal
 * a la derecha ("Siguiente", "Ver el resultado"…). Sin `onBack` (primer paso) queda solo el
 * principal. Usalo junto con `Screen scrollKey={paso}` para volver arriba al cambiar.
 */
export function StepNav({
  onBack,
  onNext,
  nextLabel = 'Siguiente',
  nextIcon,
  nextDisabled,
  loading,
  backLabel = 'Atrás',
}: {
  onBack?: (() => void) | undefined;
  onNext: () => void;
  nextLabel?: string;
  nextIcon?: LucideIcon | undefined;
  nextDisabled?: boolean;
  /** El principal muestra que está trabajando (por ejemplo, al enviar el último paso). */
  loading?: boolean;
  backLabel?: string;
}) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      {onBack ? (
        <View style={styles.slot}>
          <Button
            label={backLabel}
            variant="secondary"
            icon={ChevronLeft}
            disabled={loading}
            fullWidth
            onPress={onBack}
          />
        </View>
      ) : null}
      <View style={styles.slot}>
        <Button
          label={nextLabel}
          icon={nextIcon}
          disabled={nextDisabled}
          loading={loading}
          fullWidth
          onPress={onNext}
        />
      </View>
    </View>
  );
}
