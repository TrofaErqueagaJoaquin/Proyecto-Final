import { useState } from 'react';
import { View } from 'react-native';
import { ScrollText } from 'lucide-react-native';

import { useAuditLog } from '@/features/admin/queries';
import { Card, ChipGroup, EmptyState, ErrorState, Screen, Skeleton, Text } from '@/ui';

const ACTIONS = [
  { value: '', label: 'Todo' },
  { value: 'auth', label: 'Roles' },
  { value: 'family', label: 'Familias' },
  { value: 'consent', label: 'Consentimientos' },
  { value: 'care', label: 'Acompañamientos' },
  { value: 'pro', label: 'Accesos de profesionales' },
  { value: 'credential', label: 'Credenciales' },
  { value: 'content', label: 'Contenidos' },
  { value: 'settings', label: 'Configuración' },
] as const;
const PERIODS = [
  { value: '1', label: 'Hoy' },
  { value: '7', label: '7 días' },
  { value: '30', label: '30 días' },
  { value: 'all', label: 'Todo' },
] as const;
const DATE_TIME = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

/** Auditoría: solo metadatos (nunca textos de mensajes, observaciones ni respuestas). */
export default function AuditScreen() {
  const [action, setAction] = useState<string>('');
  const [period, setPeriod] = useState<string>('7');
  const log = useAuditLog({ action, days: period === 'all' ? null : Number(period) });

  return (
    <Screen maxWidth={1100}>
      <Text variant="title">Auditoría</Text>
      <ChipGroup label="Acción" options={ACTIONS} value={action} onChange={setAction} />
      <ChipGroup label="Período" options={PERIODS} value={period} onChange={setPeriod} />
      {log.isPending ? (
        <Skeleton height={300} />
      ) : log.isError ? (
        <ErrorState onRetry={() => void log.refetch()} />
      ) : log.data.length === 0 ? (
        <EmptyState icon={ScrollText} title="No hay eventos con esos filtros" />
      ) : (
        log.data.map((e) => (
          <Card key={e.id}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Text variant="bodyStrong">{e.action}</Text>
              <Text variant="small" tone="muted">
                {DATE_TIME.format(new Date(e.occurred_at))}
              </Text>
            </View>
            <Text variant="small" tone="muted">
              {`${e.entity_type}${e.entity_id ? ` ${e.entity_id.slice(0, 8)}…` : ''} · por ${e.actor_id ? `${e.actor_id.slice(0, 8)}…` : 'el sistema'}`}
            </Text>
            {Object.keys(e.metadata as object).length > 0 ? (
              <Text variant="small" selectable>
                {JSON.stringify(e.metadata)}
              </Text>
            ) : null}
          </Card>
        ))
      )}
    </Screen>
  );
}
