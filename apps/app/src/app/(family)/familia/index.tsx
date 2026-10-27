import { Users } from 'lucide-react-native';

import { Card, EmptyState, Screen, Text } from '@/ui';

// Se completa en la Fase 4 (familias, integrantes e invitaciones).
export default function FamilyScreen() {
  return (
    <Screen>
      <Text variant="title">Familia</Text>
      <Card>
        <EmptyState
          icon={Users}
          title="En construcción"
          description="Esta sección llega en la próxima fase."
        />
      </Card>
    </Screen>
  );
}
