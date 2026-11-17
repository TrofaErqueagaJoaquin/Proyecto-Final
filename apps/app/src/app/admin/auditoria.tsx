import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { useAdminUsers, useAuditLog, usePermissions } from '@/features/admin/queries';
import { useMe } from '@/features/auth/queries';
import { BroteEmptyState } from '@/features/brote/Brote';
import { roleLabel } from '@/features/families/labels';
import { Card, ChipGroup, ErrorState, Screen, Skeleton, Text } from '@/ui';

const ACTIONS = [
  { value: '', label: 'Todo' },
  { value: 'auth', label: 'Roles' },
  { value: 'family', label: 'Familias' },
  { value: 'consent', label: 'Permisos' },
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

/** Qué pasó, en palabras (nunca el código interno). */
const ACTION_LABELS: Record<string, string> = {
  'auth.role_granted': 'Rol administrativo dado',
  'auth.role_revoked': 'Rol administrativo quitado',
  'family.created': 'Familia creada',
  'family.deleted': 'Familia borrada',
  'family.adult_joined': 'Un adulto se sumó a una familia',
  'family.role_changed': 'Cambio de rol en una familia',
  'family.adult_removed': 'Un adulto salió de una familia',
  'family.member_added': 'Integrante agregado',
  'family.member_updated': 'Integrante editado',
  'family.member_archived': 'Integrante archivado',
  'family.member_deleted': 'Integrante borrado',
  'family.adult_invited': 'Invitación enviada',
  'family.invitation_revoked': 'Invitación cancelada',
  'consent.granted': 'Permiso dado',
  'consent.revoked': 'Permiso quitado',
  'care.requested': 'Acompañamiento pedido',
  'care.accepted': 'Acompañamiento aceptado',
  'care.rejected': 'Acompañamiento rechazado',
  'care.cancelled': 'Pedido de acompañamiento cancelado',
  'care.ended': 'Acompañamiento terminado',
  'grant.revoked': 'Se le quitó un permiso a un profesional',
  'pro.read.member_overview': 'Un profesional miró el resumen de un integrante',
  'pro.observation.created': 'Un profesional escribió una observación',
  'pro.observation.updated': 'Un profesional editó una observación',
  'credential.submitted': 'Credencial enviada',
  'credential.verified': 'Credencial aprobada',
  'credential.rejected': 'Credencial rechazada',
  'credential.needs_info': 'Credencial: se pidieron más datos',
  'content.created': 'Contenido creado',
  'content.published': 'Contenido publicado',
  'content.archived': 'Contenido archivado',
  'questionnaire.published': 'Cuestionario publicado',
  'kb.document.published': 'Documento sumado al asistente',
  'kb.document.retired': 'Documento quitado del asistente',
  'settings.updated': 'Configuración cambiada',
  'assessment.submit': 'Chequeo terminado',
};
const ADMIN_ROLES: Record<string, string> = {
  platform_admin: 'Administración',
  content_editor: 'Edición',
  content_publisher: 'Publicación',
  credential_verifier: 'Verificación',
  auditor: 'Auditoría',
};
const SETTINGS: Record<string, string> = {
  'assistant.enabled': 'Asistente',
  'assistant.monthly_budget_usd': 'Tope de gasto mensual',
  'assistant.daily_messages': 'Preguntas por día',
  'assistant.minute_messages': 'Preguntas por minuto',
};
const PURPOSES: Record<string, string> = {
  terms_privacy: 'Términos y privacidad',
  ai_personal_context: 'Que el asistente conozca a la familia',
};

type Meta = Record<string, unknown>;

function text(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/** Un detalle corto y sin datos técnicos, o nada. */
function detail(action: string, entity: string | null, meta: Meta, name: (id: string) => string) {
  const role = text(meta.role);
  if (action.startsWith('auth.role_')) {
    const who = entity ? `A ${name(entity)}` : undefined;
    const label = role ? (ADMIN_ROLES[role] ?? 'otro rol') : undefined;
    return [who, label].filter(Boolean).join(' · ') || undefined;
  }
  if (action === 'settings.updated' && entity) {
    const value = meta.value;
    const shown =
      typeof value === 'boolean'
        ? value
          ? 'encendido'
          : 'apagado'
        : typeof value === 'number'
          ? String(value)
          : undefined;
    const label = SETTINGS[entity] ?? 'Otro ajuste';
    return shown ? `${label}: ${shown}` : label;
  }
  if (action.startsWith('consent.')) {
    const purpose = text(meta.purpose);
    return purpose ? (PURPOSES[purpose] ?? undefined) : undefined;
  }
  if (action.startsWith('family.') && role) return `Rol: ${roleLabel(role)}`;
  return undefined;
}

const NO_NAMES = new Map<string, string>();

/** Los nombres salen de la lista de usuarios: solo se pide si el rol la puede ver. */
function AuditWithNames() {
  const users = useAdminUsers('');
  const names = useMemo(
    () => new Map((users.data ?? []).map((u) => [u.id, u.display_name])),
    [users.data],
  );
  return <AuditBody names={names} />;
}

function AuditBody({ names }: { names: Map<string, string> }) {
  const [action, setAction] = useState<string>('');
  const [period, setPeriod] = useState<string>('7');
  const log = useAuditLog({ action, days: period === 'all' ? null : Number(period) });
  const me = useMe();
  const name = (id: string) =>
    id === me.data?.userId ? 'vos' : (names.get(id) ?? 'una persona de la plataforma');

  return (
    <Screen maxWidth={1100}>
      <Text variant="title">Auditoría</Text>
      <ChipGroup label="Qué pasó" options={ACTIONS} value={action} onChange={setAction} />
      <ChipGroup label="Cuándo" options={PERIODS} value={period} onChange={setPeriod} />
      {log.isPending ? (
        <Skeleton height={300} />
      ) : log.isError ? (
        <ErrorState error={log.error} onRetry={() => void log.refetch()} />
      ) : log.data.length === 0 ? (
        <BroteEmptyState title="No pasó nada con esos filtros" />
      ) : (
        log.data.map((e) => {
          const extra = detail(e.action, e.entity_id, (e.metadata ?? {}) as Meta, name);
          return (
            <Card key={e.id}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Text variant="bodyStrong">{ACTION_LABELS[e.action] ?? 'Otro movimiento'}</Text>
                <Text variant="small" tone="muted">
                  {DATE_TIME.format(new Date(e.occurred_at))}
                </Text>
              </View>
              <Text variant="small" tone="muted">
                {e.actor_id === null
                  ? 'Lo hizo la plataforma'
                  : e.actor_id === me.data?.userId
                    ? 'Lo hiciste vos'
                    : `Lo hizo ${name(e.actor_id)}`}
              </Text>
              {extra ? <Text variant="small">{extra}</Text> : null}
            </Card>
          );
        })
      )}
    </Screen>
  );
}

/** Auditoría: solo metadatos (nunca textos de mensajes, observaciones ni respuestas). */
export default function AuditScreen() {
  const permissions = usePermissions();
  return permissions.has('users.read') ? <AuditWithNames /> : <AuditBody names={NO_NAMES} />;
}
