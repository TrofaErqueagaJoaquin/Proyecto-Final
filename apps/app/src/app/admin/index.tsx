import { View } from 'react-native';

import { adminNav } from '@/features/admin/nav';
import { useAdminOverview, usePermissions } from '@/features/admin/queries';
import { LinkCard } from '@/features/library/LinkCard';
import { Card, ErrorState, Screen, Skeleton, Text } from '@/ui';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card style={{ flexGrow: 1, flexBasis: 180 }}>
      <Text variant="small" tone="muted">
        {label}
      </Text>
      <Text variant="title">{value}</Text>
    </Card>
  );
}

/** Inicio de la administración: pendientes y uso del mes, según el rol. */
export default function AdminHome() {
  const overview = useAdminOverview();
  const permissions = usePermissions();

  if (overview.isPending) return <Skeleton height={200} />;
  if (overview.isError) return <ErrorState onRetry={() => void overview.refetch()} />;
  const o = overview.data;

  return (
    <Screen maxWidth={1100}>
      <Text variant="title">Administración</Text>
      <Text tone="muted">
        Desde acá se opera la plataforma sin acceder a datos de las familias: ningún rol
        administrativo ve evaluaciones, conversaciones ni observaciones.
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {o.pending_credentials !== null ? (
          <Stat label="Credenciales por verificar" value={String(o.pending_credentials)} />
        ) : null}
        {o.content_in_review !== null ? (
          <Stat label="Contenidos en revisión" value={String(o.content_in_review)} />
        ) : null}
        {o.month_cost_usd !== null ? (
          <Stat
            label="Gasto de IA del mes"
            value={`US$${Number(o.month_cost_usd).toFixed(2)} de ${String(o.month_budget_usd ?? 0)}`}
          />
        ) : null}
        {o.users !== null ? <Stat label="Cuentas" value={String(o.users)} /> : null}
      </View>
      <View style={{ gap: 8 }}>
        {adminNav(permissions)
          .filter((item) => item.href !== '/admin' && item.href !== '/hoy')
          .map((item) => (
            <LinkCard key={item.href} href={item.href} title={item.label} />
          ))}
      </View>
    </Screen>
  );
}
