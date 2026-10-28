import { useState } from 'react';

import { friendlyError } from '@/copy/errors';
import {
  usePermissions,
  useSettings,
  useSpecialtiesAdmin,
  useUpdateSetting,
} from '@/features/admin/queries';
import { useSpecialties } from '@/features/professionals/queries';
import {
  Banner,
  Button,
  Card,
  Checkbox,
  ErrorState,
  Screen,
  Skeleton,
  Text,
  TextField,
} from '@/ui';

const NUMBERS = [
  { key: 'assistant.monthly_budget_usd', label: 'Tope de gasto mensual (US$)' },
  { key: 'assistant.daily_messages', label: 'Preguntas por persona y por día' },
  { key: 'assistant.minute_messages', label: 'Preguntas por persona y por minuto' },
] as const;

function NumberSetting({
  settingKey,
  label,
  initial,
}: {
  settingKey: string;
  label: string;
  initial: number;
}) {
  const update = useUpdateSetting();
  const [value, setValue] = useState(String(initial));
  const parsed = Number(value.replace(',', '.'));
  return (
    <>
      <TextField label={label} value={value} onChangeText={setValue} inputMode="decimal" />
      <Button
        label="Guardar"
        variant="secondary"
        disabled={!Number.isFinite(parsed) || parsed === initial}
        loading={update.isPending}
        onPress={() => {
          update.mutate({ key: settingKey, value: parsed });
        }}
      />
      {update.error ? <Banner tone="danger">{friendlyError(update.error)}</Banner> : null}
    </>
  );
}

function SpecialtiesCard() {
  const specialties = useSpecialties();
  const add = useSpecialtiesAdmin();
  const [label, setLabel] = useState('');
  const code = label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]+/g, '_')
    .replace(/^_|_$/g, '');
  return (
    <Card>
      <Text variant="subheading">Especialidades</Text>
      <Text tone="muted">{(specialties.data ?? []).map((s) => s.label).join(' · ')}</Text>
      <TextField label="Nueva especialidad" value={label} onChangeText={setLabel} maxLength={60} />
      {add.error ? <Banner tone="danger">{friendlyError(add.error)}</Banner> : null}
      <Button
        label="Agregar"
        variant="secondary"
        disabled={code.length < 3}
        loading={add.isPending}
        onPress={() => {
          add.mutate(
            { code, label: label.trim() },
            {
              onSuccess: () => {
                setLabel('');
              },
            },
          );
        }}
      />
    </Card>
  );
}

/** Configuración (`app_settings`) del asistente y catálogos. */
export default function SettingsScreen() {
  const permissions = usePermissions();
  const settings = useSettings();
  const update = useUpdateSetting();
  const canSettings = permissions.has('settings.manage');

  if (canSettings && settings.isPending) return <Skeleton height={300} />;
  if (canSettings && settings.isError)
    return <ErrorState onRetry={() => void settings.refetch()} />;

  return (
    <Screen maxWidth={900}>
      <Text variant="title">Configuración</Text>
      {canSettings && settings.data ? (
        <Card>
          <Text variant="subheading">Asistente</Text>
          <Checkbox
            checked={settings.data.get('assistant.enabled') === true}
            label="Asistente habilitado"
            onChange={(checked) => {
              update.mutate({ key: 'assistant.enabled', value: checked });
            }}
          />
          {NUMBERS.map((n) => (
            <NumberSetting
              key={n.key}
              settingKey={n.key}
              label={n.label}
              initial={Number(settings.data.get(n.key) ?? 0)}
            />
          ))}
          {update.error ? <Banner tone="danger">{friendlyError(update.error)}</Banner> : null}
        </Card>
      ) : null}
      {permissions.has('catalog.manage') ? <SpecialtiesCard /> : null}
    </Screen>
  );
}
