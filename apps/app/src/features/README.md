# Funcionalidades de la app (`src/features`)

Cada carpeta es un tema. Adentro, `queries.ts` tiene las lecturas y escrituras (con TanStack
Query) y el resto son componentes y lógica de ese tema.

| Carpeta         | Qué hace                                                                    | Tablas o rutas principales                                               |
| --------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `auth`          | Sesión, ingreso con correo y OAuth (Google, GitHub, Discord), 2FA, términos | Supabase Auth, `profiles`, `consents`                                    |
| `families`      | Familia, integrantes, invitaciones, preferencias y el alta en un paso       | `families`, `family_memberships`, `family_members`, `create_family`      |
| `chequeo`       | Chequeo de 1 minuto y por tema: preguntas, resultado y la tarjeta de Hoy    | `assessment_attempts`, `POST /v1/assessments/:id/submit`                 |
| `assessments`   | Evaluación completa, resultados e historial                                 | `assessment_*`, `recommendations`                                        |
| `plans`         | Plan semanal, la actividad de Hoy y "Hecho"                                 | `family_plans`, `plan_items`, `activity_logs`, `POST /v1/plans/generate` |
| `logros`        | Rachas y logros (calculados, sin tabla propia)                              | `activity_logs`, `assessment_attempts`                                   |
| `goals`         | Objetivos y sus avances                                                     | `follow_up_goals`, `goal_progress_entries`                               |
| `assistant`     | Chat con el asistente (streaming) y tarjetas de riesgo                      | `conversations`, `assistant_messages`, `POST /v1/assistant/…`            |
| `professionals` | Directorio, perfil profesional, credenciales, acompañamientos y permisos    | `professional_*`, `care_assignments`, `access_grants`                    |
| `library`       | Biblioteca pública: etapas, fichas, actividades y fuentes                   | `content_items`, `activities`, `sources`                                 |
| `admin`         | Pantallas de administración                                                 | funciones `admin_*`, `/v1/admin/…`                                       |
| `brote`         | El personaje y su globo de diálogo                                          | —                                                                        |
| `feedback`      | Sonidos y vibraciones, con sus preferencias                                 | almacenamiento local                                                     |
| `forms`         | Reglas de validación de campos y `useFieldErrors`                           | —                                                                        |
| `shell`         | La estructura de la app: menú lateral o pestañas                            | —                                                                        |
| `demo`, `legal` | Cartel de "entorno de demostración" y avisos de borrador legal              | —                                                                        |

Para entender el recorrido completo de cada tema (pantalla → función → tabla → regla), ver
`docs/GUIA_DE_ESTUDIO.md`.
