-- Catálogos base, idempotentes. Se aplican en todos los entornos (DATABASE.md §9).
-- Fuente: docs/planning/ROLES_AND_PERMISSIONS.md §2.

insert into public.permissions (code, description) values
  ('users.read', 'Ver la lista de usuarios (correo, alta, roles); nunca familias ni contenido'),
  ('users.manage_roles', 'Asignar y quitar roles administrativos'),
  ('users.suspend', 'Suspender o reactivar cuentas'),
  ('content.edit', 'Crear y editar contenidos y actividades en borrador'),
  ('content.review', 'Marcar contenidos como revisados'),
  ('content.publish', 'Publicar y archivar contenidos y actividades'),
  ('questionnaires.manage', 'Crear y publicar versiones de cuestionarios'),
  ('kb.manage', 'Gestionar documentos de la base de conocimiento'),
  ('catalog.manage', 'Gestionar especialidades y categorías'),
  ('professionals.verify', 'Revisar y aprobar o rechazar credenciales profesionales'),
  ('audit.read', 'Leer la auditoría (metadatos, nunca contenido sensible)'),
  ('usage.read', 'Ver métricas agregadas de uso, costo de IA y errores'),
  ('settings.manage', 'Editar la configuración general')
on conflict (code) do update set description = excluded.description;

insert into public.roles (code, name, description) values
  ('platform_admin', 'Administración de plataforma', 'Usuarios, roles, catálogos, configuración y auditoría'),
  ('content_editor', 'Edición de contenidos', 'Carga contenidos en borrador; no publica'),
  ('content_publisher', 'Publicación de contenidos', 'Revisa y publica contenidos, cuestionarios y documentos'),
  ('credential_verifier', 'Verificación de credenciales', 'Revisa matrículas y credenciales profesionales'),
  ('auditor', 'Auditoría', 'Lee la auditoría y las métricas de uso')
on conflict (code) do update set name = excluded.name, description = excluded.description;

insert into public.role_permissions (role_code, permission_code) values
  ('platform_admin', 'users.read'),
  ('platform_admin', 'users.manage_roles'),
  ('platform_admin', 'users.suspend'),
  ('platform_admin', 'settings.manage'),
  ('platform_admin', 'catalog.manage'),
  ('platform_admin', 'audit.read'),
  ('platform_admin', 'usage.read'),
  ('content_editor', 'content.edit'),
  ('content_editor', 'questionnaires.manage'),
  ('content_editor', 'kb.manage'),
  ('content_publisher', 'content.edit'),
  ('content_publisher', 'content.review'),
  ('content_publisher', 'content.publish'),
  ('content_publisher', 'questionnaires.manage'),
  ('content_publisher', 'kb.manage'),
  ('credential_verifier', 'professionals.verify'),
  ('auditor', 'audit.read'),
  ('auditor', 'usage.read')
on conflict do nothing;
