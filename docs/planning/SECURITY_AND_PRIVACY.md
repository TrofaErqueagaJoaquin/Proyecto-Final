# Seguridad, privacidad y protección de menores

> **Aviso:** este documento **no es asesoramiento legal**. Lo legal es orientativo y se apoya en la investigación (§13, §19). Cada punto marcado **[Validar legalmente]** requiere el dictamen de un abogado **antes de cualquier lanzamiento con datos reales**. La versión Expotec funciona **solo con datos ficticios**.

## 1. Qué se protege

| Activo                                                             | Sensibilidad | Motivo                                                                                                                            |
| ------------------------------------------------------------------ | ------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Datos de integrantes menores (apodo, mes de nacimiento, intereses) | Alta         | Menores de edad (Ley 26.061)                                                                                                      |
| Respuestas y resultados de las evaluaciones                        | **Muy alta** | Hábitos y conductas que podrían considerarse **datos de salud** (dato sensible, Ley 25.326, arts. 2 y 7) **[Validar legalmente]** |
| Observaciones profesionales                                        | **Muy alta** | Registro de un profesional de la salud; posible relación con la historia clínica (Ley 26.529) **[Validar legalmente]**            |
| Conversaciones con el asistente                                    | **Muy alta** | Texto libre donde la familia puede contar cualquier cosa                                                                          |
| Credenciales profesionales (matrícula, documento)                  | Alta         | Datos personales identificatorios                                                                                                 |
| Cuentas (correo, sesiones)                                         | Media o alta | Toma de cuentas                                                                                                                   |
| Claves de servicios (service role, IA)                             | Crítica      | Acceso total o gasto                                                                                                              |

## 2. Modelo de amenazas (resumen STRIDE)

| Amenaza                      | Ejemplo                                                                                                                            | Controles principales                                                                                                                                                                                                                                                   |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Suplantación**             | Robo de sesión o de credenciales                                                                                                   | Supabase Auth, contraseñas de al menos 10 caracteres con chequeo de contraseñas filtradas **[A verificar disponibilidad en el plan]**, MFA obligatorio para administradores, sesiones con renovación rotativa, sesión en SecureStore en nativo y CSP estricta en la web |
| **Manipulación**             | Un usuario cambia `family_id` en un pedido para escribir en otra familia                                                           | RLS con `with check`, triggers de coherencia entre familias, validación zod en la API                                                                                                                                                                                   |
| **Repudio**                  | Un profesional niega haber accedido                                                                                                | `audit_log` de solo inserción, más el acceso por RPC auditada                                                                                                                                                                                                           |
| **Fuga de información**      | Un profesional enumera integrantes de otras familias; un administrador lee conversaciones; la clave de servicio queda en el bundle | Alcances por permiso, sin política de lectura de conversaciones para administradores, revisión de secretos en CI y solo variables `EXPO_PUBLIC_*` en el cliente                                                                                                         |
| **Denegación de servicio**   | Abuso del asistente para generar costos                                                                                            | Cuotas por usuario y por minuto, presupuesto global, límites de Supabase Auth                                                                                                                                                                                           |
| **Elevación de privilegios** | Un usuario se asigna `platform_admin` editando sus metadatos                                                                       | Los roles viven en `user_roles` (sin políticas de escritura para `authenticated`), **nunca** en `user_metadata`                                                                                                                                                         |

## 3. Controles por tema

### 3.1 Autenticación y sesiones

- Correo y contraseña con **verificación de correo obligatoria** antes de crear una familia o un perfil profesional.
- OAuth con Google y GitHub usando el flujo **PKCE**. En nativo, `expo-auth-session` y `expo-web-browser` con un _deep link_ (`crecerencasa://auth/callback`). Las URL de redirección están en una **lista blanca** en Supabase.
- Recuperación de contraseña con un enlace de un solo uso y vencimiento corto (lo configura Supabase).
- Cierre de sesión local y "cerrar todas las sesiones" (`signOut({ scope: 'global' })`).
- JWT de vida corta **[configurar 1 h, A verificar el valor por defecto]** con renovación rotativa.
- La web guarda la sesión en `localStorage` (limitación de una app sin SSR). Se mitiga con **CSP estricta** (sin `unsafe-inline` en scripts, `connect-src` limitado a Supabase, la API y Sentry), sin HTML de terceros, y renderizando el Markdown con un sanitizador (sin HTML crudo).

### 3.2 Autorización

Ver `ROLES_AND_PERMISSIONS.md`. Principios: **denegar por defecto**, RLS en todas las tablas, permisos verificados en el servidor y acceso profesional por alcance y consentimiento.

### 3.3 Separación por familia y por asignación

- Cada política filtra por `family_id` mediante `is_family_adult()` o `pro_has_scope()`.
- Triggers evitan filas "cruzadas", por ejemplo una observación sobre un integrante de otra familia.
- Las pruebas pgTAP usan **dos familias y tres profesionales** para verificar el aislamiento.

### 3.4 Consentimiento informado y revocación

| Finalidad (`consents.purpose`) | Quién otorga     | Sujeto               | Efecto al revocar                                                     |
| ------------------------------ | ---------------- | -------------------- | --------------------------------------------------------------------- |
| `terms_privacy`                | El usuario       | Su cuenta            | No puede seguir usando funciones con cuenta (puede exportar y borrar) |
| `child_data`                   | owner o guardian | Cada integrante      | Se archiva el integrante y se ocultan sus datos; con borrado opcional |
| `ai_personal_context`          | owner o guardian | La familia           | El asistente responde sin contexto personal                           |
| `chat_history`                 | El usuario       | Sus conversaciones   | Las conversaciones vuelven a una retención de 24 h                    |
| `professional_access`          | owner o guardian | Integrante + alcance | Se revoca el `access_grant` al instante                               |

- Cada consentimiento guarda `policy_version`. Si cambia la política, se pide de nuevo.
- La pantalla de consentimiento explica en lenguaje claro **qué** se comparte, **con quién**, **para qué** y **cómo se revoca** (Ley 25.326, arts. 5 y 6: consentimiento libre, expreso e informado) **[Validar legalmente los textos]**.
- **Adolescentes (13 a 17 años):** en v1 no tienen cuenta. La interfaz sugiere conversar con ellos antes de cargar datos y de compartirlos con profesionales (autonomía progresiva, CCyC arts. 25 y 26; Res. AAIP 4/2019, criterio 5) **[Validar legalmente]**.

### 3.5 Minimización de datos

| No se pide nunca                                            | Se pide de forma mínima                                                                                            |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Nombre real, DNI, escuela, fotos o dirección del integrante | Apodo (1 a 40 caracteres) y **mes y año** de nacimiento                                                            |
| Diagnósticos, medicación o historia clínica                 | Respuestas a preguntas de **hábitos y rutinas** (no de síntomas)                                                   |
| Ubicación precisa                                           | Ciudad y provincia (solo de profesionales, para la búsqueda)                                                       |
| Texto libre sobre dificultades en los formularios           | Opciones cerradas. El texto libre solo existe en el asistente (con retención) y en las observaciones profesionales |

### 3.6 Cifrado y almacenamiento

- **En tránsito:** HTTPS/TLS en todos los servicios (Supabase, Vercel y proveedores de IA). Se aplica HSTS en la web.
- **En reposo:** lo provee Supabase (disco cifrado por el proveedor) **[A verificar la documentación]**. No se agrega cifrado por columna en P0. Para P2 se evalúa cifrar `professional_observations.body` y `messages.body` con `pgsodium` o Vault, considerando que el cifrado complica la búsqueda y la retención.
- **Archivos:** buckets privados, URL firmadas de 60 s, límite de 5 MB, tipos permitidos (PDF, JPG y PNG para credenciales; PDF y MD para la base de conocimiento), verificación de _magic bytes_ en la API y nombre aleatorio (UUID) sin datos personales.

### 3.7 Gestión de secretos

| Secreto                                | Dónde vive                                                                      | Nunca                                     |
| -------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------- |
| `SUPABASE_SERVICE_ROLE_KEY`            | Variables de Vercel (proyecto `api`), GitHub Secrets (scripts de demo y backup) | En la app o en un archivo `EXPO_PUBLIC_*` |
| `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`  | Variables de Vercel (`api`)                                                     | En el cliente o en los logs               |
| `RESEND_API_KEY`                       | Supabase (SMTP) + Vercel (`api`)                                                | —                                         |
| Credenciales de Google y GitHub OAuth  | Panel de Supabase                                                               | En el repositorio                         |
| Contraseñas de los usuarios de la demo | Gestor del equipo y GitHub Secrets; se generan en cada `demo:reset`             | En el repositorio o en el bundle          |

**Controles:**

- `gitleaks` en CI y como _pre-commit hook_.
- `.env*` en `.gitignore` y `.env.example` sin valores.
- Al iniciar, la API valida con zod que existan las variables necesarias.
- Un test de CI busca `service_role` en el bundle de la web exportada.

### 3.8 Validación de entradas e inyección

- **zod en el cliente (experiencia de uso) y en la API (seguridad)**, con los mismos esquemas de `packages/shared`.
- La base valida con `CHECK` (largos, rangos, estados).
- **Inyección SQL:** PostgREST y supabase-js usan consultas parametrizadas. En las RPC está prohibido el `EXECUTE` con concatenación (`format()` con `%I`/`%L` si fuera necesario). Lo revisan el linter de SQL y la revisión de PR.
- **XSS:** React escapa por defecto. El Markdown se renderiza con una librería que **no** admite HTML crudo, más una lista blanca de enlaces (`https:` y `mailto:`). Se aplica CSP.
- **Inyección de prompts:** ver `AI_ARCHITECTURE.md` §7.3.

### 3.9 Límites de solicitudes y abuso

- Supabase Auth: límites propios para registro, login y correos **[A verificar y ajustar]**.
- API: límites por usuario y por IP con un _token bucket_ en Postgres (`rate_limits`, tabla UNLOGGED o con limpieza por `pg_cron`). Para la IA, las cuotas de `ai_usage_daily`.
- CAPTCHA en el registro (Supabase admite hCaptcha y Turnstile) **[P1, A verificar]**.

### 3.10 Auditoría

Ver la lista de eventos en `ROLES_AND_PERMISSIONS.md` §8. La auditoría no guarda contenido sensible, solo se le insertan filas y la familia ve los accesos a sus datos.

### 3.11 Derechos sobre los datos y retención

| Derecho o proceso                          | Implementación                                                                                                                                                                                                                  | Prioridad                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Acceso y exportación (art. 14)             | `GET /v1/account/export`: JSON con los datos propios y los de la familia (si es owner)                                                                                                                                          | P1 (en P0 se documenta el procedimiento manual) |
| Rectificación (art. 16)                    | Edición desde el perfil y la familia                                                                                                                                                                                            | P0                                              |
| Supresión                                  | `DELETE /v1/account`: si es el único owner de una familia con otros adultos, exige transferir la propiedad o borrar la familia; borra en cascada; elimina el usuario de Auth; registra `account.deleted` (sin datos personales) | P0                                              |
| Retención de conversaciones                | 24 h, 30 o 90 días, con `pg_cron` diario                                                                                                                                                                                        | P0                                              |
| Invitaciones vencidas                      | Se borran a los 30 días                                                                                                                                                                                                         | P0                                              |
| Auditoría                                  | 2 años **[Validar legalmente]**                                                                                                                                                                                                 | P0                                              |
| Backups                                    | El borrado se completa al rotar los backups: 14 días en la etapa escolar; la investigación proponía 30 días con backups incluidos                                                                                               | P0                                              |
| Profesional que finaliza un acompañamiento | Conserva la lectura de sus observaciones **[Validar legalmente]**                                                                                                                                                               | P0                                              |

## 4. Marco legal aplicable (a verificar)

| Norma                                                                 | Qué impacta en el diseño                                                                                                                                                                                                       | Estado                                                                                |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| **Ley 25.326**, de Protección de Datos Personales                     | Consentimiento (art. 5), datos sensibles y de salud (arts. 2, 7 y 8), seguridad (art. 9), confidencialidad (art. 10), derechos de acceso, rectificación y supresión (arts. 14 a 16), **transferencia internacional (art. 12)** | Vigente según la investigación. **[Validar legalmente]** cómo aplica a cada módulo    |
| **Res. AAIP 47/2018**                                                 | Medidas de seguridad recomendadas (acceso, respaldos, incidentes, vulnerabilidades, entornos)                                                                                                                                  | Se toma como checklist (§5)                                                           |
| **Res. AAIP 4/2019, criterio 5**                                      | Consentimiento de menores según su madurez; si no tienen capacidad, lo da el responsable parental                                                                                                                              | Afecta el diseño de los consentimientos                                               |
| **Ley 26.061**, de Protección Integral de Niñas, Niños y Adolescentes | Intimidad (art. 10), no difundir datos ni imágenes identificatorias (art. 22), derecho a opinar (art. 24)                                                                                                                      | Se aplica la minimización; sin fotos                                                  |
| **Código Civil y Comercial**, arts. 25, 26 y 639                      | Autonomía progresiva; adolescentes desde los 13 años                                                                                                                                                                           | Las cuentas de adolescentes quedan en P2                                              |
| **Ley 26.529**, de Derechos del Paciente                              | Si las observaciones profesionales cuentan como historia clínica: custodia, acceso y conservación                                                                                                                              | **[Validar legalmente]** antes de habilitar las observaciones con datos reales        |
| Registro de bases de datos ante la AAIP                               | Si corresponde inscribir la base                                                                                                                                                                                               | **[Validar legalmente]**                                                              |
| Transferencia internacional                                           | Supabase (región São Paulo), Vercel, Anthropic, Voyage y Sentry (EE. UU. u otros países). El art. 12 limita las transferencias a países sin protección adecuada; existen cláusulas modelo de la AAIP                           | **[Validar legalmente]**: es el punto de mayor riesgo para el lanzamiento             |
| Proyectos de reforma 1751-D-2026 y 3397-D-2026                        | Incorporan privacidad desde el diseño y por defecto, y la edad de 16 años para el consentimiento (proyecto 3397)                                                                                                               | Sin dictamen al 26/09/2026 según la investigación. Se diseña para cumplirlos desde ya |
| Pautas de las tiendas (Google Play Families, App Store)               | Apps relacionadas con la niñez: declaraciones de datos y política de privacidad pública                                                                                                                                        | **[A verificar]** antes de publicar en las tiendas                                    |

**Lo que este documento no afirma:** que el producto cumpla con la ley. Afirma que el diseño **sigue los principios** de esas normas y que hay puntos concretos para validar.

## 5. Checklist según la Res. AAIP 47/2018 (adaptado)

- [ ] Control de acceso: roles, RLS, MFA de administradores, revisión trimestral de roles.
- [ ] Respaldos: dump semanal cifrado + prueba de restauración documentada.
- [ ] Gestión de incidentes: `docs/security/INCIDENT_RESPONSE.md` (Fase 11) con detección, contención, evaluación, notificación (a definir con un abogado) y lecciones aprendidas.
- [ ] Vulnerabilidades: Dependabot, `pnpm audit` en CI y revisión de los avisos de seguridad de Supabase (_Security Advisor_).
- [ ] Entornos separados: `dev`, `demo` y `prod`, sin datos reales fuera de `prod`.
- [ ] Registro y monitoreo: Sentry sin datos personales y la auditoría.
- [ ] Cifrado en tránsito y en reposo (del proveedor).

## 6. Condiciones para lanzar con datos reales

`features.real_family_data` pasa a `true` en `prod` **solo si se cumplen todas estas condiciones**:

1. Dictamen legal escrito sobre: datos de salud en las evaluaciones, observaciones profesionales, transferencia internacional, textos de consentimiento, términos, política de privacidad e inscripción de la base.
2. Revisión clínica de los cuestionarios, las fichas A–I, las actividades publicadas y las respuestas fijas de riesgo, con nombre y fecha del revisor.
3. Banco de evaluación de la IA aprobado con los umbrales de `AI_ARCHITECTURE.md` §10.
4. Recursos de ayuda verificados, con fecha (líneas y salud mental en Mar del Plata).
5. Backups en un plan con respaldo automático y una restauración probada.
6. Pentest básico (OWASP ASVS nivel 1 como guía) y revisión de las políticas RLS por otra persona.
7. Plan de incidentes aprobado.
