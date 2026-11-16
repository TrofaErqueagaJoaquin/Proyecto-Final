# Entorno de demostración (`crecer-demo`)

Guía para armar la demo de Expotec (ver `docs/planning/EXPOTEC_DEMO.md`). La demo vive en un
proyecto de Supabase **aparte** (ADR-002): nunca se cargan datos de ejemplo en `crecer-dev` ni en
`prod`. Las claves se pegan solo en los `.env` locales y en el panel de Vercel, nunca en chats ni
commits.

## 1. Crear el proyecto de Supabase

1. El plan gratis admite 2 proyectos activos por organización. Si ya hay dos, pausá uno desde
   **Project Settings → General → Pause project** (se reactiva después).
2. **New project** → nombre `crecer-demo`, región `East US (North Virginia)` (la misma que dev).
   La contraseña de la base la elegís vos y la guardás en tu gestor.
3. Anotá el _project ref_ (la parte de la URL `https://<ref>.supabase.co`) y copialo en
   `DEMO_PROJECT_REF` de `scripts/demo/guards.ts`. Ese valor no es secreto y se commitea.

## 2. Aplicar las migraciones

La CLI trabaja con un solo proyecto vinculado a la vez: se vincula la demo, se aplica y se vuelve
a dev.

```bash
pnpm exec supabase link --project-ref <ref-de-crecer-demo>
```

```bash
pnpm exec supabase db push --linked --yes
```

```bash
pnpm exec supabase link --project-ref swqfiabkdhsstyubdrdv
```

Después, en el **SQL Editor** de `crecer-demo`, pegá y ejecutá el contenido de
`supabase/seed.sql` (roles y permisos de administración: `db push` no lo aplica). Es idempotente.

## 3. Marcar la base como demo

Es la cuarta guarda de `demo:reset`: una marca que vive en la base de destino y que ninguna
migración crea. En el panel de `crecer-demo`, **SQL Editor**:

```sql
insert into public.app_settings (key, value) values ('app.environment', '"demo"');
```

Esta marca también habilita la única excepción de seguridad de la demo (ADR-036): cargar contenido
**sin** verificación en dos pasos. Por eso se carga solo a mano y solo en `crecer-demo`: nunca en
`crecer-dev` ni en `prod`. Desde el panel no se puede prender (`admin_update_setting` acepta solo
claves conocidas).

## 4. Variables locales de la demo

Creá `apps/api/.env.demo` (está en `.gitignore`) con las claves de **crecer-demo**
(**Project Settings → API Keys**):

```
APP_ENV=demo
SUPABASE_URL=https://<ref-de-crecer-demo>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<sb_publishable_… de crecer-demo>
SUPABASE_SECRET_KEY=<sb_secret_… de crecer-demo>
AI_LLM_PROVIDER=anthropic
AI_CHAT_MODEL=claude-haiku-5-5
ANTHROPIC_API_KEY=<clave de Anthropic>
```

## 5. Cargar el escenario

```bash
pnpm demo:reset
```

Pide escribir `RESET DEMO`, borra las cuentas y familias del proyecto demo, sincroniza el contenido
y la base de conocimiento, y carga el escenario. Al final muestra las contraseñas **solo en la
terminal**: guardalas en tu gestor.

- Las cuentas `admin@…` y `verificador@…` **no se borran** entre reinicios, para que conserven su
  verificación en dos pasos. Su contraseña aparece una sola vez, la primera vez. Además de su rol,
  las dos publican contenido (`content_publisher`).
- Activá la verificación en dos pasos de esas dos cuentas desde **Perfil** (una vez).
- La cuenta `profe@…` tampoco se borra y **conserva su contraseña** (aparece "(sin cambios)"). Se
  crea con `pnpm demo:profe` (sección 6).
- `demo:reset` **no borra lo cargado desde el panel** (`content:sync` solo archiva lo que vino de
  `content/`). Si en un ensayo cargaste "AAA", archivala desde **Contenidos**: publicada, sigue
  apareciendo en Actividades y hasta puede entrar en el plan de Tomi.

Después, grabá la conversación precargada con el asistente real y volvé a reiniciar:

```bash
pnpm demo:capture
```

```bash
pnpm demo:reset
```

`demo:capture` deja `scripts/demo/fixtures/conversation.json`: revisalo y commitealo. Cuesta menos
de un centavo de dólar.

**Capturas para la presentación** (después de un `demo:reset`, con la web ya publicada):

```
pnpm demo:screens
```

Abre la web de la demo con el Chrome de la compu, entra como cada persona con una sesión de enlace
mágico (sin contraseñas ni correos) y guarda las pantallas en `docs/demo/capturas/`: computadora a
1440 × 900 (1,5×) y celular a 390 × 844 (3×). Para otra web, pasala como argumento:
`pnpm demo:screens http://localhost:8082`. Arma el plan de la semana de Laura si falta y completa
el chequeo de sueño de Tomi para mostrar el resultado; el próximo `demo:reset` lo deshace. La
administración pide verificación en dos pasos y se captura a mano.

## 6. Cuenta del profe para cargar contenido

El profesor pidió poder cargar contenido en la demo (por ejemplo, una actividad "AAA" para verla
primera en Actividades). Para eso hay una cuenta `profe@demo.crecerencasa.invalid` con el rol
`content_publisher` y **sin** verificación en dos pasos: entra directo a **Administración →
Contenidos** y no ve nada más de la administración (ADR-036).

```bash
pnpm demo:profe <archivo fuera del repositorio>
```

- Crea la cuenta si no existe o le pone una **contraseña nueva** si ya existe, le da el rol y acepta
  los términos. También asegura que `admin@…` y `verificador@…` tengan `content_publisher`.
- La contraseña se escribe **solo en el archivo que le pasás** (se agrega al final, no lo pisa),
  nunca en la terminal. Usá un archivo fuera del repositorio (por ejemplo, el de tus cuentas de la
  demo) y no lo commitees.
- No pide `RESET DEMO` porque no borra nada, pero sí verifica las otras tres guardas: `APP_ENV=demo`,
  el _project ref_ de `crecer-demo` y la marca `app.environment` de la sección 3.
- Cada vez que lo corrés, la contraseña anterior deja de servir. `demo:reset` no la cambia.
- Pasale la contraseña al profe en persona, no por chat ni por correo.

Para probarla: entrá con esa cuenta en `crecer-demo.vercel.app` → **Contenidos → Nueva actividad**,
cargá "AAA" con **Publicar ahora** y mirá que aparezca primera en **Actividades**. Después,
archivala.

## 7. Publicar en Vercel

Son dos proyectos de Vercel conectados al mismo repositorio de GitHub.

| Proyecto            | Root Directory | Configuración                                                                   |
| ------------------- | -------------- | ------------------------------------------------------------------------------- |
| `crecer-demo-api`   | `apps/api`     | `apps/api/vercel.json` (función `api/index.mjs` con el paquete de `pnpm build`) |
| `crecer-demo` (web) | `apps/app`     | `apps/app/vercel.json` (export web)                                             |

**Variables de `crecer-demo-api`** (Settings → Environment Variables): las mismas del punto 4, más
`CORS_ORIGINS=https://<dominio-de-la-web>` y `APP_PUBLIC_URL=https://<dominio-de-la-web>`.

**Variables de `crecer-demo`:**

```
EXPO_PUBLIC_APP_ENV=demo
EXPO_PUBLIC_API_URL=https://<dominio-de-la-api>
EXPO_PUBLIC_SUPABASE_URL=https://<ref-de-crecer-demo>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<sb_publishable_… de crecer-demo>
```

En Supabase (**Authentication → URL Configuration**), agregá el dominio de la web como _Site URL_ y
en _Redirect URLs_.

Con `EXPO_PUBLIC_APP_ENV=demo`, todas las pantallas muestran el banner "Entorno de demostración ·
datos ficticios".

## 8. Plan B sin conexión al modelo

Si el proveedor de IA falla el día de la exposición, cambiá en `crecer-demo-api`
`AI_LLM_PROVIDER=fake` y volvé a desplegar. Las respuestas dicen "Respuesta de ensayo (sin
conexión al modelo)". La API no arranca con ese valor en `prod`.
