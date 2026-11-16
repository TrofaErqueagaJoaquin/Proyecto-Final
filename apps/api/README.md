# API (`apps/api`)

API en Hono, publicada como función en Vercel. Hace **solo** lo que no puede quedar en el cliente:

| Módulo (`src/modules/`) | Rutas                                           | Por qué está en el servidor                                         |
| ----------------------- | ----------------------------------------------- | ------------------------------------------------------------------- |
| `me`                    | `GET /v1/me`                                    | Junta perfil, familias, roles y permisos en una respuesta           |
| `families`              | invitaciones (`/v1/families/…`)                 | Genera el token de invitación y manda el correo                     |
| `assessments`           | `POST /v1/assessments/:attemptId/submit`        | Corre el motor de puntajes: el cliente no puede elegir su resultado |
| `plans`                 | `POST /v1/plans/generate`                       | Arma el plan semanal con el generador                               |
| `assistant`             | `POST /v1/assistant/conversations/:id/messages` | Usa la clave de la IA, aplica cuotas, riesgo y guarda el historial  |
| `admin`                 | `/v1/admin/…`                                   | Roles y verificación de credenciales, con permiso y 2FA             |

Cada módulo tiene `route.ts` (la ruta, validación y respuestas) y `port.ts` (el acceso a la base),
así las pruebas reemplazan la base por datos de ejemplo.

- `src/app.ts`: arma la app (CORS, encabezados de seguridad, autenticación y rutas).
- `src/middleware/auth.ts`: verifica el token de Supabase de cada pedido.
- `src/ai/`: el proveedor de Claude (`providers/anthropic.ts`), los embeddings (Voyage) y los
  prompts (`prompts/`).
- `src/env.ts`: las variables de entorno, validadas al arrancar.

Documentación de cada ruta: `docs/API.md`. Cómo funciona el asistente paso a paso:
`docs/GUIA_DE_ESTUDIO.md`, sección 8.
