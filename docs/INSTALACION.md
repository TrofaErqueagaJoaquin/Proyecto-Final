# Guía de instalación y configuración

Pasos para levantar Crecer en Casa en una computadora nueva: app (frontend), API (backend) y base
de datos. Están pensados para Windows; en macOS y Linux los comandos son los mismos.

## 1. Requisitos

| Herramienta        | Versión | Para qué                                           |
| ------------------ | ------- | -------------------------------------------------- |
| Git                | 2.40+   | Clonar el repositorio                              |
| Node.js            | 24      | App y API (el repositorio trae `.nvmrc`)           |
| pnpm               | 12      | Dependencias del monorepo (se activa con Corepack) |
| Cuenta de Supabase | gratis  | Base de datos PostgreSQL y autenticación           |
| Expo Go o Android  | —       | Probar en el celular (opcional)                    |

```bash
corepack enable
```

Si `corepack enable` falla por permisos en Windows:

```bash
corepack enable --install-directory "$(npm config get prefix)"
```

No clones el proyecto dentro de OneDrive ni de otra carpeta sincronizada.

## 2. Código y dependencias

```bash
git clone https://github.com/TrofaErqueagaJoaquin/Proyecto-Final.git
```

```bash
cd Proyecto-Final
```

```bash
pnpm install
```

## 3. Base de datos (Supabase)

1. Creá un proyecto en [supabase.com](https://supabase.com/dashboard) y guardá la contraseña de la
   base en tu gestor de contraseñas.
2. Vinculá la herramienta de Supabase al proyecto (pide iniciar sesión y la contraseña de la base):

   ```bash
   pnpm exec supabase login
   ```

   ```bash
   pnpm exec supabase link --project-ref <project-ref>
   ```

3. Creá las tablas, funciones y reglas de acceso, junto con los catálogos de roles y permisos:

   ```bash
   pnpm exec supabase db push --linked --include-seed
   ```

4. Regenerá los tipos de TypeScript a partir del esquema real:

   ```bash
   pnpm db:types
   ```

Los ajustes de autenticación (confirmación de correo, segundo factor, Google y GitHub) están en
[`setup/SUPABASE.md`](setup/SUPABASE.md).

## 4. Variables de entorno

Copiá los ejemplos y completalos. Los archivos `.env` no se suben a Git.

```bash
cp apps/api/.env.example apps/api/.env
```

```bash
cp apps/app/.env.example apps/app/.env
```

**`apps/api/.env`** (solo servidor):

| Variable                   | Obligatoria | Valor                                                               |
| -------------------------- | ----------- | ------------------------------------------------------------------- |
| `APP_ENV`                  | sí          | `local`                                                             |
| `PORT`                     | no          | `8787`                                                              |
| `CORS_ORIGINS`             | sí          | `http://localhost:8081`                                             |
| `SUPABASE_URL`             | sí          | `https://<project-ref>.supabase.co`                                 |
| `SUPABASE_PUBLISHABLE_KEY` | sí          | Clave _publishable_ (**Project Settings → API Keys**)               |
| `SUPABASE_SECRET_KEY`      | sí          | Clave _secret_: **saltea las reglas de acceso, nunca la compartas** |
| `APP_PUBLIC_URL`           | sí          | `http://localhost:8081`                                             |
| `ANTHROPIC_API_KEY`        | no          | Para el asistente. Sin clave, avisa que no está configurado         |
| `AI_LLM_PROVIDER`          | no          | `anthropic`, o `fake` para probar sin costo                         |
| `VOYAGE_API_KEY`           | no          | Búsqueda semántica. Sin clave, busca por texto                      |
| `RESEND_API_KEY`           | no          | Correos de invitación. Sin clave, se comparte el enlace             |

**`apps/app/.env`** (termina dentro de la app: **nunca** pongas secretos acá):

| Variable                               | Valor                               |
| -------------------------------------- | ----------------------------------- |
| `EXPO_PUBLIC_APP_ENV`                  | `local`                             |
| `EXPO_PUBLIC_API_URL`                  | `http://localhost:8787`             |
| `EXPO_PUBLIC_SUPABASE_URL`             | `https://<project-ref>.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | La misma clave _publishable_        |

## 5. Contenido y base de conocimiento

Carga la biblioteca, las actividades, las fuentes y el cuestionario desde `content/`, y prepara la
búsqueda del asistente:

```bash
pnpm content:sync
```

```bash
pnpm kb:ingest
```

Para darte el rol de administración (después hay que activar la verificación en dos pasos en
**Perfil**):

```bash
pnpm admin:grant tu-correo@ejemplo.com platform_admin
```

## 6. Ejecutar

```bash
pnpm dev
```

- API: <http://localhost:8787/v1/health> tiene que responder `{"status":"ok",…}`.
- App web: <http://localhost:8081>. En la terminal de Expo, `w` abre la web y el código QR abre la
  app en el celular con Expo Go.

Solo una de las dos: `pnpm dev:api` o `pnpm dev:app`.

## 7. Pruebas y calidad

| Comando              | Qué hace                                    |
| -------------------- | ------------------------------------------- |
| `pnpm test`          | Tests de dominio, API y app                 |
| `pnpm db:test:local` | Pruebas de permisos de la base (sin Docker) |
| `pnpm lint`          | ESLint                                      |
| `pnpm typecheck`     | TypeScript                                  |
| `pnpm build`         | Export web y paquete de la API              |

## 8. APK de Android

El APK se arma en la nube con EAS (el servicio de Expo, gratis para este uso):

```bash
cd apps/app
```

```bash
npx eas-cli@latest login
```

```bash
npx eas-cli@latest build --platform android --profile preview
```

El perfil `preview` (en `apps/app/eas.json`) genera un `.apk` instalable. Antes, cargá las variables
`EXPO_PUBLIC_*` del entorno que quieras usar (por ejemplo, el de la demo) en
**expo.dev → proyecto → Environment variables**, para el entorno _preview_. Al terminar, EAS da un
enlace y un QR para descargarlo e instalarlo en el celular.

## 9. Publicación y demo

- Web y API en Vercel, y el entorno de demostración con datos ficticios:
  [`setup/DEMO.md`](setup/DEMO.md).
- Endpoints de la API: [`API.md`](API.md).
- Cómo usar la app: [`MANUAL_DE_USUARIO.md`](MANUAL_DE_USUARIO.md).
