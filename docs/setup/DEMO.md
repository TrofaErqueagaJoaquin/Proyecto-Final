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

## 3. Marcar la base como demo

Es la cuarta guarda de `demo:reset`: una marca que vive en la base de destino y que ninguna
migración crea. En el panel de `crecer-demo`, **SQL Editor**:

```sql
insert into public.app_settings (key, value) values ('app.environment', '"demo"');
```

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
  verificación en dos pasos. Su contraseña aparece una sola vez, la primera vez.
- Activá la verificación en dos pasos de esas dos cuentas desde **Perfil** (una vez).

Después, grabá la conversación precargada con el asistente real y volvé a reiniciar:

```bash
pnpm demo:capture
```

```bash
pnpm demo:reset
```

`demo:capture` deja `scripts/demo/fixtures/conversation.json`: revisalo y commitealo. Cuesta menos
de un centavo de dólar.

## 6. Publicar en Vercel

Son dos proyectos de Vercel conectados al mismo repositorio de GitHub.

| Proyecto            | Root Directory | Configuración                       |
| ------------------- | -------------- | ----------------------------------- |
| `crecer-demo-api`   | `apps/api`     | `apps/api/vercel.json` (Hono)       |
| `crecer-demo` (web) | `apps/app`     | `apps/app/vercel.json` (export web) |

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

## 7. Plan B sin conexión al modelo

Si el proveedor de IA falla el día de la exposición, cambiá en `crecer-demo-api`
`AI_LLM_PROVIDER=fake` y volvé a desplegar. Las respuestas dicen "Respuesta de ensayo (sin
conexión al modelo)". La API no arranca con ese valor en `prod`.
