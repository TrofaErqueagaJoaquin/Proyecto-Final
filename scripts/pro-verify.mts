// Verifica (o rechaza) las credenciales que un profesional envió a verificar.
// Es el reemplazo provisorio de la pantalla de administración (Fase 10): lo corre a mano una
// persona del equipo, después de revisar la matrícula (por ejemplo, en REFEPS).
//
//   pnpm pro:verify persona@correo.com                  → verifica las credenciales enviadas
//   pnpm pro:verify persona@correo.com --reject         → las rechaza
//   pnpm pro:verify persona@correo.com --note "REFEPS 12/11"
//
// Usa la clave secreta de apps/api/.env y la RPC verify_credential (solo service_role).

import { type Database } from '@crecer/shared';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const args = process.argv.slice(2);
const email = args.find((a) => !a.startsWith('--') && a.includes('@'))?.toLowerCase();
const reject = args.includes('--reject');
const noteIndex = args.indexOf('--note');
const note = noteIndex >= 0 ? (args[noteIndex + 1] ?? null) : null;

if (!email) {
  console.error('Uso: pnpm pro:verify <correo> [--reject] [--note "texto"]');
  process.exit(1);
}

const env = z
  .object({
    APP_ENV: z.string().default('local'),
    SUPABASE_URL: z.url(),
    SUPABASE_SECRET_KEY: z.string().min(1),
  })
  .parse(process.env);
if (env.APP_ENV === 'prod' && !args.includes('--allow-prod')) {
  throw new Error('En prod la verificación se hace desde la administración (Fase 10).');
}

const db = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findUserId(target: string): Promise<string | null> {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const user = data.users.find((u) => u.email?.toLowerCase() === target);
    if (user) return user.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

const userId = await findUserId(email);
if (!userId) {
  console.error(`No hay ninguna cuenta con el correo ${email}.`);
  process.exit(1);
}

const { data: credentials, error } = await db
  .from('professional_credentials')
  .select('id, profession, license_number, status')
  .eq('professional_id', userId)
  .eq('status', 'submitted');
if (error) throw error;
if (credentials.length === 0) {
  console.error(
    'Esa cuenta no tiene credenciales enviadas a verificar. Tiene que cargarlas y tocar "Enviar a verificar" en Mi perfil.',
  );
  process.exit(1);
}

for (const credential of credentials) {
  const { error: rpcError } = await db.rpc('verify_credential', {
    p_credential: credential.id,
    p_verifier: null as unknown as string,
    p_method: 'manual',
    p_result: reject ? 'rejected' : 'verified',
    ...(note ? { p_note: note } : {}),
  });
  if (rpcError) throw rpcError;
  console.log(
    `${reject ? '✖ Rechazada' : '✔ Verificada'}: ${credential.profession}${
      credential.license_number ? ` (${credential.license_number})` : ''
    }`,
  );
}

const { data: profile } = await db
  .from('professional_profiles')
  .select('display_name, verification_status, is_listed')
  .eq('user_id', userId)
  .single();
if (profile) {
  console.log(
    `${profile.display_name}: ${profile.verification_status}${
      profile.verification_status === 'verified' && profile.is_listed
        ? ' · aparece en el directorio'
        : ''
    }`,
  );
}
