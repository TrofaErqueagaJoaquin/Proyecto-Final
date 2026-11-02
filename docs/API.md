# Documentación de la API

Crecer en Casa tiene **dos APIs REST** que trabajan juntas:

| API                   | Qué resuelve                                                                                                         | Dónde                                                                             |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **API propia** (Hono) | Lo que no puede quedar del lado del cliente: puntajes, plan semanal, asistente con IA, invitaciones y administración | `apps/api` · `http://localhost:8787` · demo: `https://crecer-demo-api.vercel.app` |
| **Supabase** (REST)   | Registro, inicio de sesión, tokens y el CRUD de datos de la familia, protegido por reglas en la base (RLS)           | `https://<proyecto>.supabase.co`                                                  |

Todas las respuestas son JSON (salvo el asistente, que responde por _Server-Sent Events_).

## 1. Autenticación

La sesión usa **JWT con token de acceso y token de renovación** (Supabase Auth):

| Paso                  | Método y ruta (Supabase)                                                     | Cuerpo                                           |
| --------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------ |
| Registro              | `POST /auth/v1/signup`                                                       | `{ "email", "password" }`                        |
| Inicio de sesión      | `POST /auth/v1/token?grant_type=password`                                    | `{ "email", "password" }`                        |
| Renovar el token      | `POST /auth/v1/token?grant_type=refresh_token`                               | `{ "refresh_token" }`                            |
| Redes sociales        | `GET /auth/v1/authorize?provider=google` (o `github`)                        | — (redirige al proveedor y vuelve a `/callback`) |
| Segundo factor (TOTP) | `POST /auth/v1/factors` · `/factors/{id}/challenge` · `/factors/{id}/verify` | código de 6 dígitos                              |
| Cerrar sesión         | `POST /auth/v1/logout`                                                       | —                                                |

La respuesta del inicio de sesión trae `access_token` (JWT, vence en 1 hora), `refresh_token` y
`expires_in`. La app guarda la sesión en el dispositivo (SecureStore en Android, `localStorage` en la
web) y la renueva sola: la persona sigue conectada al cerrar y volver a abrir la app.

**Para llamar a la API propia** se manda el token de acceso en cada pedido:

```
Authorization: Bearer <access_token>
```

El JWT incluye `aal`: `aal1` (contraseña) o `aal2` (contraseña + segundo factor). La administración
exige `aal2`.

## 2. Middlewares de la API propia

Cada pedido pasa, en orden, por:

1. `requestId` — un identificador por pedido, que vuelve en los errores para poder rastrearlos.
2. `secureHeaders` — cabeceras de seguridad HTTP.
3. `cors` — solo los orígenes de `CORS_ORIGINS`.
4. Registro del pedido (método, ruta, estado y duración; nunca el contenido).
5. `requireAuth` — exige un JWT válido; si falta o venció, `401`.
6. `requirePermission(permiso, { mfa })` — exige un permiso administrativo y, con `mfa`, sesión `aal2`.
7. `requireFamilyRole(roles)` — exige ser adulto de la familia de la ruta con alguno de los roles.

## 3. Formato de error

Todos los errores tienen la misma forma:

```json
{
  "error": { "code": "VALIDATION_ERROR", "message": "Revisá el correo y el rol.", "requestId": "…" }
}
```

| Código HTTP | `code`               | Cuándo                                                                         |
| ----------- | -------------------- | ------------------------------------------------------------------------------ |
| 400         | `VALIDATION_ERROR`   | El cuerpo o los parámetros no son válidos                                      |
| 401         | `UNAUTHORIZED`       | Falta el token o venció                                                        |
| 403         | `FORBIDDEN`          | El rol no tiene permiso                                                        |
| 403         | `MFA_REQUIRED`       | La acción exige verificación en dos pasos                                      |
| 404         | `NOT_FOUND`          | No existe, o no es de la persona (no se revela cuál de las dos)                |
| 409         | `CONFLICT`           | El estado no permite la acción (por ejemplo, un plan sin actividades posibles) |
| 429         | `RATE_LIMITED`       | Superó el límite de preguntas al asistente                                     |
| 503         | `ASSISTANT_DISABLED` | El asistente no está configurado o se alcanzó el tope de gasto del mes         |
| 500         | `INTERNAL_ERROR`     | Error inesperado (el detalle queda solo en los registros)                      |

La app traduce cada código a un mensaje claro (`apps/app/src/copy/errors.ts`).

## 4. Endpoints de la API propia

### `GET /v1/health`

Estado de la API. Sin autenticación.

```json
{ "status": "ok", "env": "demo", "version": "0.1.0" }
```

### `GET /v1/me`

Quién es la persona y a qué espacios accede. **Requiere token.**

```json
{
  "userId": "uuid",
  "email": "laura@…",
  "aal": "aal1",
  "profile": { "displayName": "Laura García", "themePref": "system" },
  "permissions": [],
  "families": [{ "id": "uuid", "name": "Familia García", "role": "owner" }]
}
```

Errores: `401`.

### `POST /v1/families/:familyId/invitations`

Invita a otro adulto a la familia. **Requiere token** y ser `owner` o `guardian` de esa familia.

| Parámetro  | Dónde  | Tipo                               |
| ---------- | ------ | ---------------------------------- |
| `familyId` | ruta   | uuid                               |
| `email`    | cuerpo | correo                             |
| `role`     | cuerpo | `owner` · `guardian` · `caregiver` |

Respuesta `201`:

```json
{
  "invitationId": "uuid",
  "expiresAt": "2026-11-09T…Z",
  "inviteUrl": "https://…/invitacion?token=…",
  "emailSent": true
}
```

Errores: `400`, `401`, `404` (no es adulto de esa familia).

### `POST /v1/assessments/:attemptId/submit`

Calcula el resultado de una evaluación con las reglas del motor (`packages/domain`) y lo guarda.
Es **idempotente**: si ya se envió, responde igual con `alreadySubmitted: true`. **Requiere token** y
ser `owner` o `guardian`.

Respuesta `200`:

```json
{ "attemptId": "uuid", "status": "submitted", "alreadySubmitted": false }
```

Errores: `400` (faltan respuestas obligatorias: "Faltan responder 2 preguntas."), `401`, `404`,
`409` (la evaluación fue descartada).

### `POST /v1/plans/generate`

Arma el plan de la semana con el generador por reglas y lo guarda (reemplaza el de esa semana).
**Requiere token** y ser `owner` o `guardian`.

| Parámetro   | Tipo               | Obligatorio | Detalle                                    |
| ----------- | ------------------ | ----------- | ------------------------------------------ |
| `familyId`  | uuid               | sí          |                                            |
| `memberId`  | uuid o `null`      | sí          | `null` = plan de toda la familia           |
| `weekStart` | fecha `AAAA-MM-DD` | no          | Lunes de la semana; por defecto, la actual |

Respuesta `200`:

```json
{ "planId": "uuid", "weekStart": "2026-11-02", "items": 7 }
```

Errores: `400`, `401`, `403` (cuidador/a), `409` (ninguna actividad entra en las preferencias).

### `POST /v1/assistant/conversations/:conversationId/messages`

Hace una pregunta al asistente. **Requiere token** y ser autor/a de la conversación. Responde por
**Server-Sent Events** (`text/event-stream`), un evento JSON por línea `data:`:

| Evento  | Contenido                                                                                                           |
| ------- | ------------------------------------------------------------------------------------------------------------------- |
| `start` | `{ "type": "start", "userMessageId": "uuid" }`                                                                      |
| `delta` | `{ "type": "delta", "text": "…" }` (la respuesta va llegando de a partes)                                           |
| `done`  | `{ "type": "done", "message": { "id", "body", "citations", "outcome", "riskLevel", "riskCategory", "rehearsal" } }` |
| `error` | `{ "type": "error", "code", "message" }`                                                                            |

Cuerpo: `{ "question": "…" }` (1 a 2.000 caracteres).

Errores antes de empezar: `400`, `401`, `404` (no existe o venció), `429` (límite diario o por
minuto), `503` (sin configurar o tope mensual alcanzado). Una frase de riesgo alto se responde
siempre, sin modelo ni cuotas.

### Administración

Todas exigen **token, el permiso indicado y verificación en dos pasos (`aal2`)**.

| Método y ruta                                 | Permiso                | Cuerpo                                                                                                    | Respuesta                           |
| --------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `POST /v1/admin/credentials/:id/document-url` | `professionals.verify` | —                                                                                                         | `{ "url", "expiresInSeconds": 60 }` |
| `POST /v1/admin/credentials/:id/verify`       | `professionals.verify` | `{ "result": "verified·rejected·needs_info", "method": "refeps·colegio·manual", "note"?, "validUntil"? }` | `{ "status": "ok" }`                |
| `POST /v1/admin/users/:userId/roles`          | `users.manage_roles`   | `{ "role": "platform_admin·content_editor·content_publisher·credential_verifier·auditor" }`               | `{ "status": "ok" }`                |
| `DELETE /v1/admin/users/:userId/roles/:role`  | `users.manage_roles`   | —                                                                                                         | `{ "status": "ok" }`                |

Errores: `400`, `401`, `403` (`FORBIDDEN` o `MFA_REQUIRED`), `404`.

## 5. Datos de la familia (CRUD con Supabase REST)

El resto de los datos se lee y se escribe con la API REST de Supabase (`/rest/v1/<tabla>` y
`/rest/v1/rpc/<función>`), siempre con el JWT de la persona. Las reglas de acceso viven en la base:
aunque alguien modifique la app, la base rechaza lo que no le corresponde.

| Recurso                     | Crear                                     | Leer | Actualizar                                            | Borrar                    |
| --------------------------- | ----------------------------------------- | ---- | ----------------------------------------------------- | ------------------------- |
| Familias                    | `rpc/create_family`                       | ✓    | —                                                     | —                         |
| Integrantes                 | `rpc/add_family_member`                   | ✓    | ✓                                                     | ✓ (o archivar)            |
| Preferencias de la familia  | (con la familia)                          | ✓    | ✓                                                     | —                         |
| Evaluaciones y respuestas   | `rpc/start_assessment`, `rpc/save_answer` | ✓    | ✓ (mientras está abierta)                             | descartar                 |
| Objetivos y avances         | ✓                                         | ✓    | ✓ (estado: logrado, en pausa, abandonado)             | —                         |
| Actividades guardadas       | ✓                                         | ✓    | —                                                     | ✓                         |
| Plan: marcar como hecho     | `rpc/complete_plan_item`                  | ✓    | ✓                                                     | —                         |
| Conversaciones              | ✓                                         | ✓    | ✓ (título)                                            | ✓                         |
| Acompañamientos             | `rpc/request_care`                        | ✓    | `rpc/respond_care_request`, `rpc/revoke_access_grant` | `rpc/end_care`            |
| Observaciones (profesional) | ✓                                         | ✓    | ✓                                                     | —                         |
| Perfil profesional          | ✓                                         | ✓    | ✓                                                     | —                         |
| Credenciales (matrícula)    | ✓                                         | ✓    | ✓ (enviar a verificar)                                | ✓ (si no está verificada) |

El detalle de tablas, columnas y reglas está en [`planning/DATABASE.md`](planning/DATABASE.md) y
[`planning/ROLES_AND_PERMISSIONS.md`](planning/ROLES_AND_PERMISSIONS.md).

## 6. Probar la API

```bash
curl https://crecer-demo-api.vercel.app/v1/health
```

```bash
curl -H "Authorization: Bearer <access_token>" https://crecer-demo-api.vercel.app/v1/me
```

Los tests de cada endpoint están junto a su código (`apps/api/src/**/*.test.ts`) y corren con
`pnpm test`.
