# Crecer en Casa

Plataforma web y móvil de orientación familiar sobre desarrollo infantil y uso de pantallas
(proyecto final · Expotec). **Nombre provisorio.**

> Estado: **Fase 1 · Fundamentos.** Todavía no hay funcionalidades de producto: la app muestra una
> pantalla de prueba que confirma la conexión con la API. El plan completo está en
> [`docs/planning/`](docs/planning/README.md).

## Estructura

```
apps/
  app/        App universal (Android, iOS y web) · Expo Router · rutas en src/app/
  api/        API propia · Hono sobre Node · desplegable en Vercel
packages/
  shared/     Esquemas zod, tipos y contratos compartidos entre app y API
  domain/     Lógica de dominio pura y testeable
  config/     Configuración compartida de TypeScript y ESLint
docs/
  planning/   Arquitectura, decisiones y plan (fuente de verdad)
  research/   Investigación de base
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
