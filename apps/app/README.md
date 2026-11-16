# App (`apps/app`)

La app de Crecer en Casa para web y Android, hecha con Expo y React Native. Una sola base de código.

## Por dónde empezar

| Carpeta         | Qué hay                                                                                   |
| --------------- | ----------------------------------------------------------------------------------------- |
| `src/app/`      | **Las pantallas.** Cada archivo es una ruta (Expo Router): `(family)/hoy.tsx` → `/hoy`    |
| `src/features/` | **La lógica por tema**: qué lee y escribe cada pantalla y sus componentes (ver su README) |
| `src/ui/`       | Componentes visuales compartidos (botones, campos, tarjetas) y los colores (`tokens.ts`)  |
| `src/lib/`      | Conexión con Supabase (`supabase.ts`), con la API (`api.ts`) y almacenamiento seguro      |
| `assets/`       | Ícono, pantalla de inicio, sonidos y la marca (`assets/brand/`)                           |

## Grupos de rutas (las carpetas entre paréntesis no forman parte de la URL)

| Grupo          | Para quién               | Ejemplos                                        |
| -------------- | ------------------------ | ----------------------------------------------- |
| `(public)`     | Cualquiera, sin cuenta   | `/`, `/etapas/…`, `/actividades`, `/directorio` |
| `(auth)`       | Entrar y registrarse     | `/ingresar`, `/registrarse`, `/bienvenida`      |
| `(family)`     | Adultos de una familia   | `/hoy`, `/plan`, `/chequeo/…`, `/asistente`     |
| `profesional/` | Profesionales            | `/profesional`, `/profesional/casos/…`          |
| `admin/`       | Administración (con 2FA) | `/admin/usuarios`, `/admin/auditoria`           |

## Cómo se protege

La app lee y escribe **directo en la base**, con el token de la persona. Qué puede ver lo decide la
base (RLS), no la app: ver `docs/GUIA_DE_ESTUDIO.md`, sección 11. Lo que no puede confiarse al
cliente (puntajes, plan, asistente) va por la API (`src/lib/api.ts`).

## Comandos

```bash
pnpm dev:app          # desde la raíz: servidor de desarrollo (web y Expo Go)
pnpm --filter @crecer/app test
```
