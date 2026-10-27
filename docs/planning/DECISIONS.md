# Registro de decisiones (ADR)

**Estados:**

- **Aceptada:** vigente.
- **Provisoria:** depende de una verificación pendiente.
- **Reemplazada:** ya no rige; se enlaza la nueva.

**Fecha de todas las decisiones:** 26/10/2026 (Fase 0).

**Para cambiar una decisión:** se agrega un ADR nuevo que la reemplace. Los anteriores no se editan.

---

### ADR-001 · Ampliar el alcance de la investigación con minimización y un condicionamiento legal

- **Contexto.** La investigación (§19, §23) excluía del MVP los datos de conducta de chicos identificables, la IA y los profesionales con seguimiento. El pedido de la Fase 0 los exige.
- **Decisión.** Se implementa el alcance completo con estas medidas:
  1. Minimización: apodo, mes y año de nacimiento, preguntas de hábitos (no de síntomas) y la IA sin nombres.
  2. Consentimientos por finalidad y revocables.
  3. Permisos profesionales por alcance.
  4. Funciones sensibles activables por configuración (`features.real_family_data`).
  5. **Solo datos ficticios hasta tener un dictamen legal.**
- **Alternativas descartadas:**
  - Respetar el MVP de la investigación: no cumple los requisitos académicos ni los de producto.
  - Implementar todo sin restricciones: riesgo legal y ético con menores.
- **Consecuencias.** Más trabajo en consentimientos y permisos. El lanzamiento real depende de terceros (abogado y revisión clínica).
- **Estado.** Aceptada.

### ADR-002 · La demo vive en un entorno separado

- **Decisión.** Proyecto de Supabase y despliegue propios para `demo`, con un reinicio local protegido por guardas. No hay una columna `is_demo`.
- **Alternativas descartadas:**
  - Columna `is_demo` en la misma base: riesgo de mezclar datos y de que un error de RLS exponga datos reales.
  - Un _schema_ aparte en la misma base: complica las migraciones y comparte las claves.
- **Consecuencias.** Ocupa uno de los proyectos gratuitos disponibles **[A verificar el límite]**. Las migraciones se aplican en dos destinos.
- **Estado.** Aceptada.

### ADR-003 · Monorepo con pnpm workspaces y Turborepo

- **Decisión.** Un repositorio con `apps/app`, `apps/api` y `packages/{shared,domain,config}`.
- **Alternativas descartadas:**
  - Repositorios separados: duplican tipos y validaciones.
  - Nx: más potente, pero con más configuración.
  - npm workspaces: menos estricto con las dependencias.
- **Consecuencias.** Hay que configurar Metro para el monorepo; si da problemas, se usa `node-linker=hoisted`.
- **Estado.** Aceptada.

### ADR-004 · App universal con Expo Router (web + Android + iOS)

- **Decisión.** Un solo código de interfaz con adaptaciones por plataforma (`.web.tsx` y `.native.tsx`) y una web estática desplegada en Vercel.
- **Alternativas descartadas:**
  - Next.js + Expo: duplica las pantallas, inviable en una semana.
  - Vite + Capacitor: la experiencia nativa es inferior.
  - Flutter: otro lenguaje, sin tipos compartidos.
- **Consecuencias.** Las tablas de la administración y los editores requieren componentes `.web.tsx`.
- **Revisión.** Se reconsidera separar el panel de administración en Next.js si crece mucho después de Expotec.
- **Estado.** Aceptada.

### ADR-005 · Supabase (Postgres, Auth y Storage) + API propia en Hono/Node

- **Decisión.** Supabase concentra los datos, la identidad, los archivos y la autorización (RLS). Hono concentra los secretos, la IA, la lógica en TypeScript y las escrituras privilegiadas.
- **Alternativas descartadas:**
  - Solo Edge Functions de Supabase: Deno con el monorepo y los límites de streaming.
  - NestJS + Prisma con autenticación propia: duplica la autorización y suma mucho código de base.
  - Firebase: modelo documental, sin SQL ni RLS relacional.
- **Consecuencias.** Hay dos capas de servidor; la regla de las tres vías (`ARCHITECTURE.md` §3) evita la ambigüedad.
- **Estado.** Aceptada.

### ADR-006 · La autorización final vive en la base (RLS)

- **Decisión.**
  - RLS habilitado en todas las tablas y denegación por defecto.
  - Helpers `SECURITY DEFINER` con `search_path=''`.
  - La API usa el JWT del usuario y la clave de servicio **solo** para RPC concretas que se ejecutan exclusivamente con `service_role`.
- **Alternativa descartada.** Autorización solo en la API: un error en un endpoint expone datos, y PostgREST quedaría abierto.
- **Consecuencias.** Las políticas necesitan pruebas pgTAP exhaustivas (la matriz ejecutable).
- **Estado.** Aceptada.

### ADR-007 · Tres ejes de permisos; "profesional" y "familia" no son roles globales

- **Decisión.** Los roles globales son solo administrativos. La pertenencia a una familia es contextual (`family_memberships`) y la condición de profesional se determina por perfil y asignaciones.
- **Alternativa descartada.** Un único `role` en el perfil: no admite que una persona sea madre y profesional, ni permisos por familia.
- **Estado.** Aceptada.

### ADR-008 · Acceso profesional por alcance, con lecturas sensibles mediante RPC auditada

- **Decisión.** `care_assignments` + `access_grants` (integrante × alcance × consentimiento). Las evaluaciones se leen solo con `pro_member_overview`, que registra el acceso.
- **Alternativa descartada.** Acceso a toda la familia por asignación: viola el requisito de que distintos profesionales acompañen a distintos hijos.
- **Consecuencias.** La vista del profesional depende de las RPC, no de consultas libres.
- **Estado.** Aceptada.

### ADR-009 · Proveedor de IA: Anthropic Claude, con el modelo configurable y elegido por evaluación

- **Decisión.**
  - Interfaz `LlmProvider`, con la implementación inicial en Anthropic.
  - El modelo inicial es `claude-opus-5-5` (la recomendación por defecto de la referencia de Anthropic y el techo de calidad).
  - El equipo puede bajar a `claude-sonnet-5-5` o `claude-haiku-5-5` **solo si el modelo candidato cumple los umbrales del banco de evaluación**. El costo estimado por consulta es de unos US$0,03, US$0,015 y US$0,001 respectivamente (ver `TECH_STACK.md` §6.3).
- **Alternativas descartadas:**
  - Gemini como principal: la investigación advierte sobre el uso de datos en el nivel gratuito.
  - Un modelo propio: costo y falta de citas.
- **Consecuencias.** El costo de la demo es bajo (unos US$6 cada 200 consultas). En un piloto con mucho uso hay que medir el costo y decidir con datos.
- **Estado.** Provisoria (hay que confirmar los precios y los términos de datos en la Fase 7).

### ADR-010 · RAG híbrido sobre contenido revisado

- **Decisión.**
  - Texto completo en español (`es_unaccent`) + pgvector (HNSW), combinados con RRF.
  - Fragmentación por títulos y filtro por edad.
  - Umbral de evidencia y citas validadas.
- **Alternativas descartadas:**
  - Contexto largo con todo el conocimiento: se usa como referencia y plan B, no como diseño principal.
  - Ajuste fino: el conocimiento queda congelado y no hay citas.
- **Estado.** Aceptada.

### ADR-011 · Filtro de riesgo determinista antes del modelo

- **Decisión.** Las señales de autolesión, violencia, emergencia o _grooming_ reciben una respuesta fija, aprobada por un profesional, **sin llamar al LLM**. Las preguntas clínicas pasan al LLM con una instrucción reforzada y la tarjeta "Cuándo consultar".
- **Alternativa descartada.** Clasificar el riesgo con el LLM: no es determinista, agrega latencia y la seguridad quedaría sujeta al modelo.
- **Consecuencias.** Hay falsos positivos (aceptados) y el léxico hay que mantenerlo.
- **Estado.** Aceptada.

### ADR-012 · La puntuación usa reglas versionadas en TypeScript y la escritura es privilegiada

- **Decisión.**
  - Un motor puro en `packages/domain` + `scoring_spec` en JSON inmutable por versión.
  - La API calcula y escribe con la RPC `finalize_assessment`, ejecutable solo por `service_role`.
- **Alternativas descartadas:**
  - Puntuar con IA: no es reproducible.
  - Puntuar en el cliente: el usuario podría falsificar el resultado.
  - Puntuar en PL/pgSQL: menos testeable para el equipo.
- **Estado.** Aceptada.

### ADR-013 · Estados como `text` + `CHECK`; catálogos como tablas

- **Decisión.** No se usan `ENUM` de Postgres.
- **Motivo.** A un ENUM no se le pueden quitar valores, y los catálogos los edita la administración.
- **Estado.** Aceptada.

### ADR-014 · El contenido inicial vive como código en `content/`

- **Decisión.** El Markdown y el YAML versionados en el repositorio se sincronizan con la base (`content:sync`). En `prod`, después de la carga inicial, la base es la fuente de verdad y se edita desde el panel. En `dev` y `demo`, la fuente es `content/`.
- **Alternativa descartada.** Cargar todo a mano desde el panel: no es reproducible y bloquea el avance mientras no exista el editor.
- **Estado.** Aceptada.

### ADR-015 · Historial del asistente: 24 h por defecto, 30 o 90 días con consentimiento

- **Decisión.** Las conversaciones se guardan siempre con un vencimiento: 24 h por defecto, y 30 o 90 días con el consentimiento `chat_history`. Se pueden borrar al instante.
- **Alternativa descartada.** No guardar nada y que el cliente mande el historial: permite manipular el historial y complica el contexto.
- **Estado.** Aceptada.

### ADR-016 · Embeddings de 1024 dimensiones (Voyage, con OpenAI como alternativa)

- **Decisión.** La columna es `vector(1024)` y se guarda `embedding_model` para poder reindexar.
- **Estado.** Provisoria (hay que verificar el modelo vigente, sus dimensiones y su precio).

### ADR-017 · Sin Sign in with Apple en P0

- **Decisión.** Correo, Google y GitHub. Apple entra junto con la publicación en iOS, porque las pautas de la App Store la pueden exigir y requiere una cuenta paga **[A verificar]**.
- **Estado.** Aceptada.

### ADR-018 · Hosting en Vercel y el repositorio fuera de OneDrive

- **Decisión.** Vercel con proyectos `web` y `api`. EAS Build para móvil. El clon local se mueve a `C:\dev\Proyecto-Final` para evitar que OneDrive sincronice `node_modules`.
- **Alternativas descartadas:**
  - Netlify o Cloudflare Pages para la web: válidas, pero se prefiere un solo proveedor para la web y la API.
  - Render o Railway para la API: servidores siempre encendidos, con costo.
- **Consecuencias.** El plan Hobby es de uso no comercial (sirve para el proyecto escolar) **[A verificar]**.
- **Estado.** Provisoria.

### ADR-019 · Sesión web en `localStorage`, con una CSP estricta

- **Decisión.** Al no tener SSR, supabase-js guarda la sesión en el navegador. Se mitiga con una CSP sin `unsafe-inline`, el Markdown sanitizado y sin scripts de terceros.
- **Alternativa descartada.** Cookies `httpOnly` con un backend-for-frontend: obligaría a usar SSR o un proxy, con más complejidad.
- **Estado.** Aceptada (riesgo residual documentado).

### ADR-020 · Desarrollo sin Docker local

- **Contexto.** Docker no está instalado en la máquina de desarrollo (verificado con `docker --version`).
- **Decisión.** Se usa el proyecto remoto `crecer-dev` para el desarrollo, y los tests pgTAP corren en GitHub Actions con `supabase start`. Si se puede, se instala Docker Desktop con WSL2.
- **Consecuencias.** El ciclo de los tests de RLS es más lento: hay que esperar a CI.
- **Estado.** Aceptada.

### ADR-021 · Reordenar las fases

- **Decisión.**
  - Se agrega la fase "Contenido, biblioteca y actividades" (F5) antes de las evaluaciones.
  - Los fixtures de demo se construyen en cada fase.
  - La administración va después de los profesionales.
- **Motivo.** Las recomendaciones, los planes y la base de conocimiento dependen del contenido. La verificación necesita que existan perfiles profesionales.
- **Estado.** Aceptada.

### ADR-022 · Versiones y herramientas fijadas en la Fase 1

- **Fecha.** 26/10/2026 (Fase 1).
- **Decisiones:**
  1. **TypeScript `~6.0.3`**, aunque existe la 7.0: `typescript-eslint` 8.72 solo admite `<6.1.0` y el template de Expo SDK 58 fija `~6.0.3`.
  2. **Expo SDK 58** (React Native 0.88, React 19.3). Las rutas viven en `apps/app/src/app/`, que es la convención del template de este SDK.
  3. **pnpm 12 con instalación aislada** (sin `nodeLinker: hoisted`). La documentación de Expo indica que desde el SDK 54 se admiten dependencias aisladas, y funcionó en la primera prueba. Si aparece un paquete incompatible, el plan B sigue siendo `nodeLinker: hoisted`.
  4. **Scripts de instalación explícitos** (`allowBuilds` en `pnpm-workspace.yaml`): `esbuild` permitido; `unrs-resolver` denegado (su binario llega por dependencias opcionales).
  5. **ESLint 10 en `shared`, `domain` y `api`** (`typescript-eslint` strict-type-checked) y **ESLint 9 en la app**, porque `eslint-config-expo` depende de `eslint-plugin-react` y `eslint-plugin-import`, que todavía no admiten ESLint 10. La app usa la configuración de Expo, sin chequeo de tipos en el lint. Los tipos se controlan con `tsc` y se reevalúa al actualizar `eslint-config-expo`.
  6. **ESLint no corre en pre-commit** (cada paquete tiene su propia configuración y versión). En pre-commit corre solo Prettier, y lint, tipos y tests corren en pre-push y en CI.
  7. **La API se empaqueta con esbuild** (`apps/api/build.mjs`) porque `@crecer/shared` y `@crecer/domain` se publican como TypeScript fuente. Las dependencias de npm quedan externas.
  8. **Variables de entorno por app** (`apps/app/.env`, `apps/api/.env`): Expo lee `.env` desde la carpeta de la app.
- **Estado.** Aceptada.

### ADR-023 · Decisiones de implementación de la Fase 2

- **Fecha.** 27/10/2026 (Fase 2).
- **Decisiones:**
  1. **Banco de pruebas local con PGlite** (`pnpm db:test:local`). Corre las migraciones y las pruebas pgTAP sin Docker, con un simulador mínimo de Supabase y un subconjunto de pgTAP. Es una aproximación: CI corre además `supabase test db` contra el Supabase real. En su primera ejecución detectó un bug real (`RAISE … detail = NULL`).
  2. **Las altas pasan por RPC.** El cliente no tiene `INSERT` sobre familias, membresías ni integrantes: `create_family`, `add_family_member` (exige el consentimiento `child_data`) y `accept_family_invitation`. Las ediciones usan privilegios por columna (`GRANT UPDATE (col, …)`), así nadie puede mover filas entre familias aunque RLS lo permitiera.
  3. **La auditoría se escribe en un solo lugar: triggers.** Las RPC no auditan por su cuenta, para no duplicar eventos.
  4. **Correo de invitación como `text` en minúsculas**, no `citext`. Con `search_path` vacío, los operadores de `citext` no se resuelven y la comparación terminaría distinguiendo mayúsculas.
  5. **Los roles administrativos no se escriben desde el cliente.** `user_roles` no tiene políticas de escritura: solo la API (con clave secreta, después de verificar `users.manage_roles` y MFA) o un SQL manual para el primer administrador.
  6. **La API verifica los JWT con JWKS y solo algoritmos asimétricos** (ES256 o RS256). Nunca necesita el secreto de firma. El proyecto `crecer-dev` firma con ES256 (verificado en su `jwks.json`).
  7. **Claves nuevas de Supabase:** `sb_publishable_…` (pública) y `sb_secret_…` (servidor), en lugar de `anon` y `service_role`.
  8. **Mientras no haya tipos generados** (`pnpm db:types`, después de `supabase link`), todo resultado de Supabase se valida con zod antes de usarse.
- **Estado.** Aceptada.

### ADR-024 · Decisiones de implementación de la Fase 3

- **Fecha.** 27/10/2026 (Fase 3).
- **Decisiones:**
  1. **Sistema de diseño propio** (`apps/app/src/ui`: tokens, `makeStyles` por esquema claro/oscuro y componentes base) **en lugar de NativeWind**. NativeWind 4 depende de Tailwind 3 y de una capa de compatibilidad sin soporte claro para React Native 0.88. Un `StyleSheet` con tokens funciona igual en web y en nativo, sin pasos de build. Reemplaza la elección de `TECH_STACK.md` §2.2.
  2. **El contraste se verifica con tests** (`tokens.test.ts`): todo par texto/fondo usado cumple WCAG AA (4,5:1) y los bordes e íconos cumplen 3:1, en ambos temas.
  3. **Sin rutas tipadas de Expo Router.** Los tipos se generan solo al correr `expo start` y quedaban desactualizados o ausentes en CI. Las rutas son texto y las redirecciones de usuario pasan por `safeNextPath` (solo rutas internas).
  4. **Sesión nativa en SecureStore en fragmentos** (la sesión de Supabase supera el límite por valor); en web, `localStorage` (ADR-019).
  5. **Términos y privacidad:** la casilla del registro guarda la versión en los metadatos del usuario y se convierte en un consentimiento real en el primer ingreso. Quien entra con Google o GitHub, o cuando cambia la versión, pasa por `/bienvenida`.
  6. **Tests de la app con jest-expo y Testing Library 14** (`render` y `fireEvent` son asíncronos). `lucide-react-native` se resuelve a su build CJS en Jest.
  7. **El chequeo de secretos del bundle web** busca claves reales (prefijo y valor), porque `supabase-js` contiene el prefijo `sb_secret_` en su propio código.
- **Pendiente de verificar con una cuenta real:** registro, confirmación por correo, ingreso, recuperación de contraseña, OAuth y la aceptación de términos. Quedan programados y con tests de unidad, pero sin probar de punta a punta contra Supabase. Esta noche no se crearon cuentas ni se ingresaron contraseñas.
- **Estado.** Aceptada.

### ADR-025 · Decisiones de implementación de la Fase 4

- **Fecha.** 27/10/2026 (Fase 4).
- **Decisiones:**
  1. **Las invitaciones devuelven un enlace para compartir** (por ejemplo, por WhatsApp), además del correo opcional (Resend). Sin un proveedor de correo configurado, el flujo funciona igual. El token solo existe en el enlace: la base guarda su hash.
  2. **El enlace funciona solo con el correo invitado** (`INVITATION_EMAIL_MISMATCH`), vence en 7 días y es de un solo uso.
  3. **Las guardas de sesión y de términos conservan los parámetros de la URL**, para no perder el token si hay que ingresar o aceptar términos antes.
  4. **Integrantes:** apodo, mes y año (`MM/AAAA`) e intereses de un catálogo cerrado. Nunca hay texto libre sobre un menor.
  5. **Revocar el consentimiento `child_data` archiva al integrante.** Reactivarlo exige darlo de alta de nuevo con un consentimiento nuevo (no se "des-revoca").
  6. **Las acciones destructivas se confirman en línea** (`ConfirmAction`), porque `Alert.alert` no funciona en react-native-web.
  7. **Una familia activa por persona en la interfaz** (la primera de `/v1/me`). El modelo admite varias; el selector queda pendiente.
- **Pendiente para el despliegue web:** la ruta dinámica `familia/integrante/[id]` necesita una regla de reescritura en Vercel hacia `familia/integrante/[id].html`.
- **Sin probar de punta a punta contra Supabase** (requiere una sesión real): crear la familia, las invitaciones, aceptarlas y los consentimientos. Las reglas que los sostienen están probadas en pgTAP (65 verificaciones) y la API, con tests de integración.
- **Estado.** Aceptada.

### ADR-026 · Decisiones de implementación de la Fase 5

- **Fecha.** 27/10/2026 (Fase 5).
- **Decisiones:**
  1. **El catálogo es público**: `anon` solo puede leer lo publicado, sobre una lista cerrada de 8 tablas (contenido, fuentes y actividades). El test de seguridad base exige exactamente esa lista, así que cualquier tabla nueva expuesta lo hace fallar.
  2. **El contenido inicial vive en `content/`** (22 fuentes, 15 contenidos y 30 actividades) y se carga con `pnpm content:sync` (clave secreta, idempotente, archiva lo que se quita). CI corre `pnpm content:check`.
  3. **Todo el contenido figura "en revisión profesional"** (`reviewed_at` nulo) y **todas las fuentes, como "cita pendiente de verificación"**. Esta noche no se verificaron contra las fuentes primarias. No se inventaron enlaces: solo se usan DOI o URL que figuran en la investigación.
  4. **Las líneas de ayuda no se publicaron**, porque la investigación pide verificarlas antes. "Cuándo consultar" lo aclara.
  5. **Markdown propio y mínimo** (títulos, párrafos, listas y negrita). Nunca se interpreta HTML; el esquema rechaza contenido con etiquetas.
  6. **Las actividades se filtran en el dispositivo**: con 30 a 120 actividades, una sola consulta en caché da filtros instantáneos y la lógica queda en una función pura con tests. La búsqueda en la base (`tsvector` con `es_unaccent`) queda lista para el asistente (Fase 8).
  7. **Los planes y objetivos van en su propia migración (Fase 7)**, no en la de actividades: se crean cuando se usan.
  8. **Actividades realizadas sin texto libre** (solo fecha, participantes y valoración de 1 a 5): no se registra información sobre los chicos.
- **Verificado contra `crecer-dev`:** lectura anónima de lo publicado, `permission denied` en familias, búsqueda sin tildes, sincronización idempotente y las pantallas públicas en el navegador. **No verificado de punta a punta:** guardar y registrar actividades, porque requiere una sesión real.
- **Estado.** Aceptada.

---

## Decisiones pendientes de validación externa

| #   | Tema                                                                                         | Quién valida                                 | Bloquea                                  |
| --- | -------------------------------------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------- |
| V1  | Si las respuestas de hábitos y las observaciones son datos de salud; si aplica la Ley 26.529 | Abogado                                      | El lanzamiento real                      |
| V2  | Transferencia internacional (Supabase, Vercel, Anthropic, Voyage, Sentry)                    | Abogado                                      | El lanzamiento real                      |
| V3  | Textos de consentimiento, términos y privacidad; inscripción de la base                      | Abogado                                      | El lanzamiento real                      |
| V4  | Cuestionario v1, fichas A–I, actividades y respuestas fijas de riesgo                        | Pediatra y psicólogo infantil                | La publicación en `prod`                 |
| V5  | Líneas de ayuda y recursos de Mar del Plata vigentes                                         | Equipo (llamado o fuente oficial, con fecha) | La demo (se muestran con fecha) y `prod` |
| V6  | Precios y límites de Supabase, Vercel, EAS, Resend, Anthropic y Voyage                       | Equipo (páginas oficiales)                   | Las Fases 1 y 7                          |
| V7  | Términos de uso de datos y retención de los proveedores de IA                                | Equipo + abogado                             | El uso con datos reales                  |
| V8  | Método de verificación de profesiones que no figuran en REFEPS                               | Equipo + colegios profesionales              | La verificación real                     |
| V9  | Texto completo de la AAP 2026                                                                | Equipo                                       | Las citas textuales en el contenido      |
