# Crecer en Casa

Plataforma web y móvil de orientación familiar sobre desarrollo infantil y uso de pantallas
(proyecto final · Expotec). **Nombre provisorio.**

Ayuda a las familias a **comprender** qué necesita cada edad, **identificar** hábitos con una
evaluación orientativa, **actuar** con actividades y un plan semanal, y **acompañarse** con un
asistente con IA que cita sus fuentes y con profesionales de matrícula verificada.

- **Demo** (datos ficticios): <https://crecer-demo.vercel.app> · API:
  <https://crecer-demo-api.vercel.app/v1/health>
- **Tres tipos de usuario:** familia (responsable principal, responsable y cuidador/a), profesional
  y administración (con verificación en dos pasos).
- **Inicio de sesión:** correo y contraseña, Google, GitHub y verificación en dos pasos (TOTP).

| Documento                                      | Para qué                                             |
| ---------------------------------------------- | ---------------------------------------------------- |
| [Guía de instalación](docs/INSTALACION.md)     | Instalar y configurar app, API, base de datos y APK  |
| [Manual de usuario](docs/MANUAL_DE_USUARIO.md) | Cómo usar la app con cada rol                        |
| [Documentación de la API](docs/API.md)         | Endpoints, parámetros, respuestas y códigos de error |
| [Demo y publicación](docs/setup/DEMO.md)       | Entorno de demostración y despliegue en Vercel       |
| [Plan y arquitectura](docs/planning/README.md) | Decisiones, base de datos, roles y seguridad         |

## Estructura

```
apps/
  app/        App universal (Android, iOS y web) · Expo Router · rutas en src/app/
  api/        API propia · Hono sobre Node · desplegable en Vercel
packages/
  shared/     Esquemas zod, tipos y contratos compartidos entre app y API
  domain/     Lógica de dominio pura y testeable
  config/     Configuración compartida de TypeScript y ESLint
supabase/
  migrations/ Tablas, funciones y reglas de acceso (RLS) de PostgreSQL
  tests/      Pruebas de permisos (pgTAP)
content/      Biblioteca, actividades, fuentes y cuestionario (Markdown y YAML)
scripts/      Carga de contenido, base de conocimiento, roles y reinicio de la demo
docs/
  API.md, INSTALACION.md, MANUAL_DE_USUARIO.md
  planning/   Arquitectura, decisiones y plan (fuente de verdad)
  research/   Investigación de base
  demo/       Capturas de la demo
```

## Requisitos

- **Node 24** (`.nvmrc`).
- **pnpm 12** con Corepack. Si `corepack enable` falla por permisos en Windows, instalá los atajos
  en tu carpeta de usuario:
  ```bash
  corepack enable --install-directory "$(npm config get prefix)"
  ```
- **Opcional:** [gitleaks](https://github.com/gitleaks/gitleaks) (`winget install gitleaks`) para
  buscar secretos antes de cada commit. Si no está instalado, CI lo hace igual.
- No clones el repositorio dentro de OneDrive ni de otra carpeta sincronizada: `node_modules` genera
  bloqueos de archivos.

## Primeros pasos

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/app/.env.example apps/app/.env
pnpm dev          # API en http://localhost:8787 y Expo en http://localhost:8081
```

Antes hay que crear la base de datos en Supabase y completar los `.env`: los pasos están en la
[guía de instalación](docs/INSTALACION.md).

En Expo, apretá `w` para abrir la web, o escaneá el QR con Expo Go o un build de desarrollo.

## Comandos

| Comando                             | Qué hace                                                                   |
| ----------------------------------- | -------------------------------------------------------------------------- |
| `pnpm dev`                          | API y app en modo desarrollo                                               |
| `pnpm dev:api` / `pnpm dev:app`     | Solo una de las dos                                                        |
| `pnpm lint`                         | ESLint en todos los paquetes (falla con advertencias)                      |
| `pnpm typecheck`                    | TypeScript estricto en todos los paquetes                                  |
| `pnpm test`                         | Tests unitarios y de integración (Vitest)                                  |
| `pnpm build`                        | Export web estático (`apps/app/dist`) y bundle de la API (`apps/api/dist`) |
| `pnpm format` / `pnpm format:check` | Prettier                                                                   |

Turborepo cachea las tareas: si nada cambió, se repiten en milisegundos.

## Calidad automatizada

- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/es/) validados con
  commitlint. Ejemplo: `feat(api): endpoint de salud`. Los alcances permitidos están en
  `commitlint.config.mjs`.
- **pre-commit:** Prettier sobre los archivos en stage y gitleaks (si está instalado).
- **pre-push:** lint, typecheck y tests.
- **CI** (`.github/workflows/ci.yml`): formato, lint, tipos, tests, build, control de secretos en el
  bundle web y gitleaks.

## Variables de entorno

Cada app tiene su `.env.example`. Las variables `EXPO_PUBLIC_*` terminan en el bundle del cliente:
**nunca** pongas secretos ahí. Las claves del servidor (Supabase service role, IA) viven solo en
`apps/api/.env` y en Vercel. Ambas apps validan sus variables con zod al iniciar.
