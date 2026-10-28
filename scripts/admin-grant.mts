// Da (o quita) un rol administrativo. Sirve para crear la primera cuenta de administración:
// después, quien tenga users.manage_roles los asigna desde /admin/usuarios.
//
//   pnpm admin:grant persona@correo.com platform_admin
//   pnpm admin:grant persona@correo.com credential_verifier --revoke
//
// Roles: platform_admin, content_editor, content_publisher, credential_verifier, auditor.
// Para usar la administración, la cuenta además tiene que activar la verificación en dos pasos.

import { type Database } from '@crecer/shared';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const ROLES = [
  'platform_admin',
  'content_editor',
  'content_publisher',
  'credential_verifier',
  'auditor',
] as const;

const args = process.argv.slice(2);
const email = args.find((a) => a.includes('@'))?.toLowerCase();
const role = z.enum(ROLES).safeParse(args.find((a) => (ROLES as readonly string[]).includes(a)));
const revoke = args.includes('--revoke');
if (!email || !role.success) {
  console.error(`Uso: pnpm admin:grant <correo> <${ROLES.join('|')}> [--revoke]`);
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
  throw new Error('En prod los roles se asignan desde la administración (con MFA).');
}

const db = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let userId: string | null = null;
for (let page = 1; page < 50 && !userId; page++) {
  const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;
  userId = data.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
  if (data.users.length < 200) break;
}
if (!userId) {
  console.error(`No hay ninguna cuenta con el correo ${email}.`);
  process.exit(1);
}

const result = revoke
  ? await db.from('user_roles').delete().eq('user_id', userId).eq('role_code', role.data)
  : await db
      .from('user_roles')
      .upsert({ user_id: userId, role_code: role.data }, { ignoreDuplicates: true });
if (result.error) throw new Error(result.error.message);
console.log(
  `${revoke ? 'Quitado' : 'Asignado'}: ${role.data} → ${email}. ` +
    (revoke ? '' : 'Activá la verificación en dos pasos en Perfil para entrar a /admin.'),
);
