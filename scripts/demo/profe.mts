// Cuenta del profe para cargar contenido en la demo (ADR-036): `pnpm demo:profe <archivo>`.
// Crea la cuenta (o le pone una contraseña nueva si ya existe), le da el rol de publicación de
// contenidos y deja la contraseña SOLO en el archivo indicado: no se muestra en pantalla.
// También asegura los roles de las demás cuentas de administración (admin y verificador cargan
// contenido). No borra nada, así que no pide la frase de confirmación de demo:reset.

import { appendFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

import { CURRENT_POLICY_VERSION } from '@crecer/shared';

import { demoId, demoPassword, enforceTarget, must, ok, service } from './lib.ts';
import { email, USERS } from './scenario.ts';

const file = process.argv[2];
if (!file) throw new Error('Uso: pnpm demo:profe <archivo donde guardar la contraseña>');
const target = resolve(file);
// Nunca dentro del repositorio: un archivo suelto ahí se podría subir sin querer.
const inRepo = relative(resolve(import.meta.dirname, '..', '..'), target);
if (!inRepo.startsWith('..') && !/^[a-z]:/i.test(inRepo)) {
  throw new Error('Guardá la contraseña fuera del repositorio (por ejemplo, en el escritorio).');
}

await enforceTarget();

const staffIds = new Map<string, string>();
for (let page = 1; ; page++) {
  const { data, error } = await service.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;
  for (const user of data.users) if (user.email) staffIds.set(user.email, user.id);
  if (data.users.length < 200) break;
}

const profe = USERS.find((u) => u.key === 'profe');
if (!profe) throw new Error('Falta la cuenta profe en scenario.ts');
const address = email(profe.key);
const password = demoPassword();
let profeId = staffIds.get(address);
if (profeId) {
  ok(await service.auth.admin.updateUserById(profeId, { password }), `Contraseña de ${address}`);
} else {
  const created = await service.auth.admin.createUser({
    id: demoId(`user:${profe.key}`),
    email: address,
    password,
    email_confirm: true,
    user_metadata: { full_name: profe.name },
  });
  if (created.error) throw new Error(`Crear ${address}: ${created.error.message}`);
  profeId = created.data.user.id;
  staffIds.set(address, profeId);
}

for (const user of USERS) {
  const userId = staffIds.get(email(user.key));
  if (!userId) continue;
  for (const role of user.staff ?? []) {
    ok(
      await service
        .from('user_roles')
        .upsert({ user_id: userId, role_code: role }, { ignoreDuplicates: true }),
      `rol ${role} de ${user.key}`,
    );
  }
}

const accepted = must(
  await service
    .from('consents')
    .select('id')
    .eq('purpose', 'terms_privacy')
    .eq('granted_by', profeId)
    .is('revoked_at', null),
  'consents (lectura)',
);
if (accepted.length === 0) {
  ok(
    await service.from('consents').insert({
      purpose: 'terms_privacy',
      granted_by: profeId,
      policy_version: CURRENT_POLICY_VERSION,
    }),
    'consents terms_privacy',
  );
}

await appendFile(
  target,
  `\nCuenta del profe (carga de contenido, sin verificación en dos pasos)\n` +
    `Correo: ${address}\nContraseña: ${password}\n` +
    `Entra en crecer-demo.vercel.app → Administración → Contenidos.\n`,
  { encoding: 'utf8', mode: 0o600 },
);
console.log(`✔ Cuenta ${address} lista. La contraseña quedó en ${target} (no se muestra acá).`);
