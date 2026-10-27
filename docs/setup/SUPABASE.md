# Configuración de Supabase

Guía para conectar un proyecto de Supabase (por ejemplo `crecer-dev`) con el repositorio.
Los valores secretos **nunca** se pegan en chats, issues ni commits.

## 1. Claves en los `.env` locales

En el panel: **Project Settings → API Keys**.

| Variable                               | Archivo         | Valor                                                    |
| -------------------------------------- | --------------- | -------------------------------------------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`             | `apps/app/.env` | `https://<project-ref>.supabase.co`                      |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `apps/app/.env` | Clave _publishable_ (`sb_publishable_…`), pública        |
| `SUPABASE_URL`                         | `apps/api/.env` | Igual que arriba                                         |
| `SUPABASE_PUBLISHABLE_KEY`             | `apps/api/.env` | La misma clave _publishable_                             |
| `SUPABASE_SECRET_KEY`                  | `apps/api/.env` | Clave _secret_ (`sb_secret_…`): **saltea RLS**, solo API |

## 2. Vincular la CLI y aplicar las migraciones

Desde la raíz del repositorio, en tu terminal:

```bash
pnpm exec supabase login
```

```bash
pnpm exec supabase link --project-ref <project-ref>
```

`link` pide la contraseña de la base: la escribís vos y queda guardada localmente por la CLI.

```bash
pnpm db:push
```

```bash
pnpm db:types
```

`db:push` aplica `supabase/migrations/` al proyecto vinculado. `db:types` regenera
`packages/shared/src/db.types.ts` a partir del esquema real.

El seed de catálogos (`supabase/seed.sql`) se aplica solo en local y en CI. Para cargarlo en el
proyecto remoto, pegá el contenido en **SQL Editor → New query** y ejecutalo (es idempotente).

## 3. Autenticación (panel → Authentication)

| Sección                         | Ajuste                                                                                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sign In / Providers → Email** | _Confirm email_ **activado**. Las RPC asumen que toda sesión por correo está verificada                                                                             |
| **Policies → Passwords**        | Mínimo 10 caracteres, letras y números; activar la protección de contraseñas filtradas si el plan lo permite **[A verificar]**                                      |
| **URL Configuration**           | _Site URL_: `http://localhost:8081` (en `prod`, el dominio real). _Redirect URLs_: `http://localhost:8081/**`, `crecerencasa://**` y la URL de Vercel cuando exista |
| **Multi-Factor**                | TOTP habilitado (obligatorio para roles administrativos)                                                                                                            |
| **Emails → SMTP Settings**      | Configurar Resend antes de invitar personas reales: el SMTP incluido tiene un límite muy bajo **[A verificar]**                                                     |

### Google

1. En Google Cloud Console: **APIs & Services → Credentials → Create credentials → OAuth client ID**
   (tipo _Web application_).
2. _Authorized redirect URI_: `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Copiá _Client ID_ y _Client secret_ en **Authentication → Providers → Google** y activalo.

### GitHub

1. En GitHub: **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. _Authorization callback URL_: `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Copiá _Client ID_ y un _Client secret_ nuevo en **Authentication → Providers → GitHub** y activalo.

## 4. Primer administrador

Los roles administrativos no se pueden asignar desde la app (ni siquiera por otro administrador:
pasa por la API con MFA). El primero se crea a mano, una sola vez, en **SQL Editor**:

```sql
insert into public.user_roles (user_id, role_code)
select id, 'platform_admin' from auth.users where email = '<tu-correo>';
```

## 5. Pruebas de la base

| Comando              | Dónde corre                                | Requiere |
| -------------------- | ------------------------------------------ | -------- |
| `pnpm db:test:local` | PGlite (Postgres en WASM), simula Supabase | Nada     |
| `pnpm db:test`       | Supabase local real (`supabase start`)     | Docker   |
| CI (`database`)      | Ambos, en cada push y PR                   | —        |

`db:test:local` es una aproximación para iterar rápido; la fuente de verdad es CI.
