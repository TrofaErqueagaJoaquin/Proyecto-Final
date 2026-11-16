# Base de datos (`supabase/`)

PostgreSQL en Supabase. Acá están las tablas, las reglas de seguridad por filas (RLS), las
funciones y sus pruebas.

## Migraciones (`migrations/`), en el orden en que se aplican

| Archivo                                 | Qué crea                                                                          |
| --------------------------------------- | --------------------------------------------------------------------------------- |
| `…000100_extensions_and_helpers`        | Extensiones, `set_updated_at`, errores de dominio y la auditoría (`audit_log`)    |
| `…000200_identity_access`               | `profiles` (con el trigger `handle_new_user`), roles y permisos de plataforma     |
| `…000300_families_consents`             | Familias, membresías, integrantes, invitaciones, preferencias y consentimientos   |
| `…000400_content_activities`            | Fuentes, contenidos, actividades, guardadas y realizadas                          |
| `…000500_questionnaires_assessments`    | Cuestionarios, intentos, respuestas, puntajes y recomendaciones                   |
| `…000600_professionals_care` y `000700` | Profesionales, credenciales, acompañamientos, permisos, observaciones y objetivos |
| `…000800_knowledge_base_assistant`      | Biblioteca para la IA (`kb_*`), conversaciones, mensajes y uso de la IA           |
| `…28000100` y `000200`                  | Mejoras de la búsqueda del asistente                                              |
| `…28000300_family_plans`                | Planes semanales y sus ideas                                                      |
| `…28000400_admin`                       | Funciones de administración (`admin_*`)                                           |

Cada migración define sus tablas **y** sus reglas RLS juntas: para saber quién puede ver una tabla,
buscá `create policy` en el mismo archivo.

## Otros archivos

- `tests/`: 231 pruebas pgTAP que comprueban las reglas de seguridad (por ejemplo, que una familia
  no vea a otra). Corren en GitHub en cada cambio y con `pnpm db:test:local`.
- `seed.sql`: roles, permisos, categorías y especialidades.
- `config.toml`: configuración de Supabase local.

Diagramas y explicación: `docs/GUIA_DE_ESTUDIO.md` y `docs/planning/DATABASE.md`.
