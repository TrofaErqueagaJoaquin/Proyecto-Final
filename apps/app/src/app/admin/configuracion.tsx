import { Plus, Power, PowerOff } from 'lucide-react-native';
import { useState } from 'react';

import {
  usePermissions,
  useSettings,
  useSpecialtiesAdmin,
  useUpdateSetting,
} from '@/features/admin/queries';
import { useFieldErrors } from '@/features/forms/useFieldErrors';
import { useSpecialties } from '@/features/professionals/queries';
import {
  Button,
  Card,
  ConfirmAction,
  ErrorBanner,
  ErrorScreen,
  LoadingScreen,
  Screen,
  Text,
  TextField,
} from '@/ui';

const NUMBERS = [
  { key: 'assistant.monthly_budget_usd', label: 'Tope de gasto mensual (US$)', integer: false },
  { key: 'assistant.daily_messages', label: 'Preguntas por persona y por día', integer: true },
  { key: 'assistant.minute_messages', label: 'Preguntas por persona y por minuto', integer: true },
] as const;

/** El error del número, o `undefined` si se puede guardar. */
function numberError(value: string, integer: boolean): string | undefined {
  const text = value.trim().replace(',', '.');
  if (text === '') return 'Escribí un número.';
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) return 'Tiene que ser un número.';
  if (parsed <= 0) return 'Tiene que ser mayor que 0.';
  if (integer && !Number.isInteger(parsed)) return 'Tiene que ser un número entero.';
  return undefined;
}

function NumberSetting({
  settingKey,
  label,
  integer,
  initial,
}: {
  settingKey: string;
  label: string;
  integer: boolean;
  initial: number;
}) {
  const update = useUpdateSetting();
  const [value, setValue] = useState(String(initial));
  const [saved, setSaved] = useState(0);
  const parsed = Number(value.trim().replace(',', '.'));
  const save = () => {
    if (!form.attempt()) return;
    update.mutate(
      { key: settingKey, value: parsed },
      {
        onSuccess: () => {
          setSaved((n) => n + 1);
          form.reset();
        },
      },
    );
  };
  const form = useFieldErrors({ value: numberError(value, integer) }, { onSubmit: save });
  return (
    <>
      <TextField
        {...form.field('value')}
        label={label}
        value={value}
        onChangeText={setValue}
        inputMode={integer ? 'numeric' : 'decimal'}
      />
      <Button
        label="Guardar"
        variant="secondary"
        loading={update.isPending}
        savedKey={saved}
        onPress={save}
      />
      <ErrorBanner error={update.error} />
    </>
  );
}

function SpecialtiesCard() {
  const specialties = useSpecialties();
  const add = useSpecialtiesAdmin();
  const [label, setLabel] = useState('');
  const [saved, setSaved] = useState(0);
  const code = label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]+/g, '_')
    .replace(/^_|_$/g, '');
  const submit = () => {
    if (!form.attempt()) return;
    add.mutate(
      { code, label: label.trim() },
      {
        onSuccess: () => {
          setLabel('');
          setSaved((n) => n + 1);
          form.reset();
        },
      },
    );
  };
  const form = useFieldErrors(
    { label: code.length < 3 ? 'Escribí al menos 3 letras.' : undefined },
    { onSubmit: submit },
  );
  return (
    <Card>
      <Text variant="subheading">Especialidades</Text>
      <Text tone="muted">{(specialties.data ?? []).map((s) => s.label).join(' · ')}</Text>
      <TextField
        {...form.field('label')}
        label="Nueva especialidad"
        hint="Al menos 3 letras."
        value={label}
        onChangeText={setLabel}
        maxLength={60}
      />
      <ErrorBanner error={add.error} />
      <Button
        label="Agregar"
        variant="secondary"
        icon={Plus}
        loading={add.isPending}
        savedKey={saved}
        savedLabel="Agregada"
        onPress={submit}
      />
    </Card>
  );
}

/** Encender o apagar el asistente para todos: apagarlo pide confirmación. */
function AssistantSwitch({ enabled }: { enabled: boolean }) {
  const toggle = useUpdateSetting();
  return (
    <>
      <Text variant="bodyStrong" accessibilityLiveRegion="polite">
        {enabled ? 'El asistente está encendido.' : 'El asistente está apagado para todos.'}
      </Text>
      {enabled ? (
        <ConfirmAction
          label="Apagar el asistente"
          title="¿Apagar el asistente para todos?"
          confirmLabel="Sí, apagarlo"
          description="Nadie va a poder usarlo hasta que lo vuelvas a encender."
          icon={PowerOff}
          loading={toggle.isPending}
          onConfirm={() => {
            toggle.mutate({ key: 'assistant.enabled', value: false });
          }}
        />
      ) : (
        <Button
          label="Encender el asistente"
          icon={Power}
          loading={toggle.isPending}
          onPress={() => {
            toggle.mutate({ key: 'assistant.enabled', value: true });
          }}
        />
      )}
      <ErrorBanner error={toggle.error} />
    </>
  );
}

/** Configuración del asistente y de las especialidades. */
export default function SettingsScreen() {
  const permissions = usePermissions();
  const settings = useSettings();
  const canSettings = permissions.has('settings.manage');

  if (canSettings && settings.isPending) return <LoadingScreen lines={2} />;
  if (canSettings && settings.isError) {
    return <ErrorScreen error={settings.error} onRetry={() => void settings.refetch()} />;
  }

  return (
    <Screen maxWidth={900}>
      <Text variant="title">Configuración</Text>
      {canSettings && settings.data ? (
        <Card>
          <Text variant="subheading">Asistente</Text>
          <AssistantSwitch enabled={settings.data.get('assistant.enabled') === true} />
          {NUMBERS.map((n) => (
            <NumberSetting
              key={n.key}
              settingKey={n.key}
              label={n.label}
              integer={n.integer}
              initial={Number(settings.data.get(n.key) ?? 0)}
            />
          ))}
        </Card>
      ) : null}
      {permissions.has('catalog.manage') ? <SpecialtiesCard /> : null}
    </Screen>
  );
}
