// Guardas de demo:reset (EXPOTEC_DEMO.md §5). El reinicio borra usuarios y datos: solo puede correr
// contra el proyecto de Supabase de la demo, nunca contra dev ni prod.

/** Project ref de `crecer-demo`. Se completa al crear el proyecto (docs/setup/DEMO.md). */
export const DEMO_PROJECT_REF = 'vmuycohonhuaacluicoo';

export const DEMO_EMAIL_DOMAIN = 'demo.crecerencasa.invalid';
export const CONFIRMATION_PHRASE = 'RESET DEMO';
/** Marca que se carga a mano, una sola vez, en el proyecto demo (no viene en las migraciones). */
export const ENVIRONMENT_SETTING_KEY = 'app.environment';

/** `https://<ref>.supabase.co` → `<ref>`. Cualquier otra URL (local, proxy) no tiene ref. */
export function projectRefFromUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname;
    const match = /^([a-z0-9]{20})\.supabase\.co$/.exec(host);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export interface GuardInput {
  appEnv: string | undefined;
  supabaseUrl: string | undefined;
  /** Lo que escribió el operador en la terminal. */
  confirmation: string;
  /** Valor de `app.environment` en la base de destino (null si no está). */
  environmentSetting: unknown;
  demoProjectRef?: string;
}

/** Devuelve los motivos para abortar. Vacío = se puede reiniciar. */
export function checkGuards(input: GuardInput): string[] {
  const expectedRef = input.demoProjectRef ?? DEMO_PROJECT_REF;
  const problems: string[] = [];
  if (input.appEnv !== 'demo') {
    problems.push(`APP_ENV tiene que ser "demo" (es "${input.appEnv ?? ''}").`);
  }
  if (!expectedRef) {
    problems.push('Falta DEMO_PROJECT_REF en scripts/demo/guards.ts.');
  } else if (projectRefFromUrl(input.supabaseUrl ?? '') !== expectedRef) {
    problems.push(`SUPABASE_URL no es el proyecto demo (${expectedRef}).`);
  }
  if (input.confirmation.trim() !== CONFIRMATION_PHRASE) {
    problems.push(`No se escribió la confirmación "${CONFIRMATION_PHRASE}".`);
  }
  if (input.environmentSetting !== 'demo') {
    problems.push(`La base no tiene ${ENVIRONMENT_SETTING_KEY} = "demo" en app_settings.`);
  }
  return problems;
}
