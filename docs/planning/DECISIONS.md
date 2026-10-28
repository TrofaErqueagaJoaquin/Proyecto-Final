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

### ADR-027 · Decisiones de implementación de la Fase 6

- **Fecha.** 27/10/2026 (Fase 6).
- **Decisiones:**
  1. **Motor puro en `packages/domain/src/scoring`**: `scoreAttempt` y `recommend` son funciones de (definición, especificación, edad, respuestas). El resultado no depende del orden de las respuestas: un test de propiedad lo comprueba con 300 casos con semilla. `recommend` vive en `engine.ts` junto a `scoreAttempt` porque comparte el cálculo de las respuestas que cuentan.
  2. **Cada sección del cuestionario es una dimensión.** La puntuación es el promedio de las preguntas que puntúan (0 a 100), y la banda es el primer corte que lo alcanza: 39 para `priority`, 69 para `watch` y 100 para `strength`, como propuesta del proyecto. Una pregunta sin pauta para la edad es solo descriptiva, por ejemplo las horas de pantalla desde los 5 años. Una dimensión sin preguntas que puntúen no tiene resultado.
  3. **Tres tipos de regla por pregunta**: `option_value`, `multi_sum` con tope y `age_range` (rango ideal por edad con tolerancia). El tiempo de pantalla se responde con opciones cuyo valor está en horas y se compara con la pauta de cada edad.
  4. **La definición sale de la base con `questionnaire_definition()`** en el formato exacto de `QuestionnaireDefinitionSchema`, con los ids. La API y la app la validan con el mismo esquema y traducen las respuestas por id con `answersFromRows`.
  5. **Inmutabilidad**: un trigger bloquea editar o borrar una versión publicada o retirada, y también sus secciones, preguntas y opciones. Solo se permite pasar de publicada a retirada. `content:sync` guarda un hash del archivo: si cambia una versión ya publicada, falla y pide crear la versión siguiente.
  6. **Flujo de escritura**: `start_assessment()` (DEFINER) congela la edad en meses y retoma el intento abierto. `save_answer()` (INVOKER) reemplaza la respuesta y la valida un trigger: intento abierto, pregunta de su versión, opción de su pregunta y tipo correcto. El cliente solo puede **descartar** un intento (la política exige `status = 'discarded'`). `finalize_assessment()` solo lo ejecuta `service_role`: bloquea la fila, verifica que quien envía sea owner o guardian y deja una entrada de auditoría sin respuestas ni puntajes.
  7. **`POST /v1/assessments/:id/submit` es idempotente**: si el intento ya se envió, o si otro pedido lo envió primero, responde 200 con `alreadySubmitted: true` sin volver a puntuar. Un intento descartado da 409, uno ajeno da 404 y uno con obligatorias sin responder da 400. Una recomendación cuyo destino se archivó se omite y queda en el log.
  8. **El resultado guarda "qué pesó"** (`assessment_dimension_scores.explanation`). Es parte del resultado congelado, así que no se recalcula al mostrarlo.
  9. **Sin vocabulario clínico**: `findClinicalTerms` revisa los textos de bandas y recomendaciones en `content:check` y en los tests de la app. Las bandas nunca usan el color de peligro. El aviso fijo "Es una orientación, no un diagnóstico" lleva a "Cuándo consultar".
  10. **Interfaz**: una sección por pantalla, también en el teléfono, porque las secciones tienen de 2 a 5 preguntas. Hay autoguardado optimista y el progreso se ve en la "línea de crecimiento". La caregiver no ve "Evaluaciones" en la navegación.
- **Pendiente para una v2 del cuestionario:** de los 13 años en adelante no hay ninguna regla de prioridad 1. El sueño y los dispositivos en el dormitorio llevan a la guía de la etapa 12–17, que los trata, pero sin una ficha propia. La v1 ya está publicada y no se edita.
- **Verificado:** las 35 verificaciones pgTAP nuevas en PGlite, la migración y el cuestionario publicados en `crecer-dev`, la sincronización idempotente y un recorrido completo del cuestionario real en cinco edades en los tests del dominio. **No verificado de punta a punta:** responder y enviar desde la app contra `crecer-dev`, porque requiere una sesión real.
- **Estado.** Aceptada.

### ADR-028 · Orden y alcance después de la primera prueba con la app (Fase 6)

- **Contexto.** El equipo probó la app después de la Fase 6. Lo más pedido es encontrar profesionales y tener el asistente. También aparecieron detalles de navegación: el logo vuelve a la portada pública aunque haya sesión, no hay botón para volver y hay textos que no entran en la pantalla.
- **Decisiones:**
  1. **Orden:** primero los arreglos de navegación y visuales, después la Fase 9 (profesionales) y después la Fase 8 (asistente). La Fase 7 se hace antes de la 9 o dentro de ella, porque los objetivos que propone el profesional usan sus tablas.
  2. **Profesionales:** la Fase 9 completa, como está en este plan.
  3. **Modelo del asistente:** `claude-sonnet-5-5`, en lugar de Opus (cambia lo inicial de ADR-009). El tope de gasto global es de **US$10 por mes**. Al llegar al 100%, `assistant.enabled = false` con aviso en la interfaz. Los límites por persona quedan como en `AI_ARCHITECTURE.md` §9. El modelo sigue siendo configurable y se puede cambiar por el banco de evaluación.
  4. **Búsqueda:** la híbrida con Voyage, como dice ADR-010. Hacen falta las claves de Anthropic y de Voyage. El equipo las crea y las carga en `apps/api/.env`, y nunca pasan por el chat.
  5. **En desarrollo, la web se sirve sin SSR** (`web.output: 'single'`), y el export sigue siendo `static`. El render en servidor de cada página tardaba unos 17 s y en Windows tiraba Metro con `EMFILE`.
- **Estado.** Aceptada.

### ADR-029 · Decisiones de implementación de la Fase 9

- **Decisiones:**
  1. **Migración 0006.** Agrega especialidades, perfil profesional, credenciales, verificaciones (solo inserción), acompañamientos, permisos por alcance, observaciones, objetivos y avances. Los objetivos (`follow_up_goals`) se crean acá porque el profesional los propone, y la Fase 7 los amplía. La 0007 suma `family_id` a `pro_cases()`.
  2. **Todo el ciclo de vida va por RPC con auditoría:** `request_care` (crea un consentimiento `professional_access` por permiso), `respond_care_request`, `end_care` (la familia cancela una solicitud y cualquiera de las partes finaliza; revoca todo en la misma transacción) y `revoke_access_grant` (revocar el perfil de un integrante revoca todo lo de ese integrante). Revocar el consentimiento de un permiso también lo revoca, con un trigger.
  3. **El profesional no lee las tablas de la familia.** Las evaluaciones, actividades y observaciones de un integrante llegan solo por `pro_member_overview()`, que deja `pro.read.member_overview` en la auditoría, y la familia lo ve en "Actividad de acceso". Los casos llegan por `pro_cases()`, con el nombre de la familia, el de quien pidió y el apodo y la edad de los integrantes autorizados. Los objetivos sí tienen una política directa, porque el profesional los crea y los actualiza.
  4. **Los permisos se activan al aceptar** (`access_grants.activated_at`). Antes de que acepte, el profesional ve la solicitud pero ningún dato.
  5. **Directorio:** `anon` lee `professional_profiles` y `professional_specialties`, pero la RLS deja ver solo los perfiles `verified` y listados. La familia también ve a los profesionales con los que tiene o tuvo un acompañamiento. **Invitar directo a un profesional sin verificar** (ROLES §4 regla 5) queda pendiente: hoy su perfil no lo ve nadie fuera de su relación con una familia.
  6. **Verificación provisoria por script** (`pnpm pro:verify <correo>`) hasta la administración de la Fase 10. Usa `verify_credential()`, que solo ejecuta `service_role`. El profesional solo puede pasar sus credenciales de "declarada" a "enviada"; si edita una ya revisada, vuelve a "declarada".
  7. **Archivos de credenciales** en el bucket privado `credentials`, siempre bajo la carpeta `{auth.uid()}/`. La migración lo crea solo si existe el esquema `storage`, porque el arnés local no lo tiene.
  8. **Interfaz:**
     - La familia llega a Profesionales desde Familia en el teléfono (no entra una sexta pestaña) y desde la barra lateral en el escritorio (`NavItem.wideOnly`).
     - El directorio público está en `/directorio`, para no chocar con `/profesionales` de la familia.
     - El espacio profesional está en `/profesional/*` y se entra desde Perfil.
     - "Compartir" es el asistente de 3 pasos; el perfil del integrante se suma solo al elegir otro alcance.
     - En la ficha de un integrante, lo no autorizado no aparece.
  9. **La barra lateral rompía en el escritorio:** expo-router no acepta arreglos de estilos en un hijo de `Link asChild`. Se aplanan con `StyleSheet.flatten`.
- **Verificado:**
  - Las 47 verificaciones pgTAP nuevas en PGlite, con el escenario de DATABASE.md §8: la psicopedagoga ve solo a Sofi, el pediatra solo a Tomi, revocar corta el acceso al instante, cada lectura queda auditada y un profesional sin verificar no aparece.
  - Las migraciones 0006 y 0007 aplicadas en `crecer-dev`.
  - En el navegador, sin crear datos: el directorio, Profesionales de la familia, el asistente sin profesional, la ficha inexistente, el perfil profesional nuevo y la barra lateral.
- **No verificado de punta a punta:** el recorrido solicitar → aceptar → observar → revocar con dos cuentas reales, y la subida de archivos a Storage.
- **Estado.** Aceptada.

### ADR-030 · Decisiones de implementación de la Fase 8

- **Decisiones:**
  1. **Modelo y llamada.**
     - Modelo `claude-sonnet-5-5` (ADR-028), con el SDK oficial `@anthropic-ai/sdk` 0.133.0, por streaming.
     - Pensamiento adaptativo (no se envía `thinking`) con `output_config.effort: "low"`, como recomienda la referencia para chat.
     - Sin temperatura. `max_tokens` de 4.096, porque el pensamiento también cuenta.
     - `cache_control` sobre el `system`.
     - Fallback del servidor (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`). Si igual declina (`stop_reason: "refusal"`), la familia recibe una respuesta segura.
     - Solo se muestran los bloques `text`.
  2. **Migraciones:**
     - **0008:** `app_settings`, `kb_documents`, `kb_chunks` (pgvector 1024 + `tsv`), `kb_hybrid_search` (RRF k = 60, filtro por edad), conversaciones, mensajes y `ai_usage_daily`. También las funciones `assistant_quota`, `add_ai_usage` y `purge_expired_assistant_data` (programada con `pg_cron` cada hora, si está disponible).
     - **0009:** la búsqueda por texto pasa de "todos los términos" a "cualquiera", ordena por relevancia y devuelve `fts_coverage`.
     - **0010:** las actividades del catálogo también se indexan.
  3. **Quién escribe qué.**
     - La base de conocimiento, las cuotas y el uso los toca solo `service_role`.
     - La persona crea y borra sus conversaciones (RLS: solo su autor, y solo owner o guardian).
     - Los mensajes los escribe la API, así el cliente no puede manipular el historial (AI_ARCHITECTURE.md §7.3).
     - El cliente no puede cambiar el vencimiento.
  4. **Retención:** 24 horas sin historial. Con el consentimiento `chat_history` y el historial activado en la familia, 30 o 90 días. Cada mensaje renueva el vencimiento.
  5. **Seguridad:**
     - El filtro de riesgo determinista (`packages/domain/src/safety`) corre antes que todo. El riesgo alto se responde siempre, sin modelo, sin cuotas y aunque falte la clave.
     - Los patrones se afinaron contra falsos positivos frecuentes en esta app ("abusa de las pantallas", "le toca la tablet", "se cortó el video").
     - El streaming se corta apenas aparece un patrón prohibido (dosis, diagnóstico, "adicción"), así la familia nunca lo lee.
     - El post-chequeo quita las citas inventadas.
     - Las respuestas fijas de riesgo quedan con `verifiedAt: null` hasta verificar las líneas (V5) y la interfaz lo dice.
  6. **Hay evidencia** si la similitud por vector es de al menos 0,35, o si alguno de los 3 primeros por texto cubre al menos el 20% de los términos de la pregunta.
     - Medido con preguntas reales sobre `crecer-dev`: la búsqueda ubica bien el documento, pero su cobertura va de 0,2 a 1.
     - El umbral solo frena lo que no coincide en nada; el modelo se abstiene si los documentos no alcanzan.
     - Se calibra con el banco de evaluación.
  7. **Sin claves no se rompe nada:**
     - Sin `ANTHROPIC_API_KEY`, el asistente responde "todavía no está configurado".
     - Sin `VOYAGE_API_KEY`, la búsqueda usa solo texto completo.
     - Con `AI_LLM_PROVIDER=fake`, responde sin costo para los ensayos.
     - `pnpm kb:ingest` indexa con hash, así que repetirlo no cuesta.
  8. **Tope de gasto:** el costo se estima con `usage` y la tabla de precios (Sonnet 5.5: US$2 / 10 por millón; caché US$0,20 / 2,50). Al llegar a US$10 en el mes, el asistente se pausa. Cuotas por persona: 30 por día y 6 por minuto.
  9. **Interfaz:**
     - Asistente es una pestaña para owner y guardian. En el teléfono, Evaluaciones y Profesionales se mueven a Familia y Hoy.
     - Cada conversación se crea eligiendo sobre quién es, con el interruptor "Usar el contexto de la familia", que pide el consentimiento `ai_personal_context` la primera vez.
     - Las respuestas muestran chips de citas y la tarjeta de ayuda destacada ante riesgo.
     - Arriba se ve el aviso de retención y está el botón "Borrar conversación".
     - La respuesta se lee por partes con `expo/fetch`, en web y en el teléfono.
  10. **Fuera de esta fase:**
      - El banco de evaluación de 100 preguntas y `pnpm ai:eval`: cuestan dinero, se corren a mano y el banco lo escribe el equipo.
      - Los documentos subidos (P1).
      - La reformulación de consultas (P2).
- **Para activarlo:** cargar `ANTHROPIC_API_KEY` y, si se quiere búsqueda semántica, `VOYAGE_API_KEY` en `apps/api/.env`. Después correr `pnpm kb:ingest` (con Voyage vuelve a indexar con embeddings) y reiniciar la API.
- **Verificado:**
  - Las 22 verificaciones pgTAP nuevas en PGlite (con pgvector) y las migraciones aplicadas en `crecer-dev`, con 45 documentos y 136 fragmentos indexados.
  - 174 tests de seguridad (más de 100 variantes de riesgo), los del fragmentador y 14 de la ruta con proveedores espía: el riesgo nunca llega al modelo.
  - En el navegador, con el modelo falso: crear la conversación, responder por streaming con citas, la tarjeta de riesgo y borrar.
- **No verificado:** respuestas reales de Sonnet 5.5 y embeddings de Voyage, porque faltan las claves. Tampoco que `pg_cron` haya quedado programado en `crecer-dev`.
- **Estado.** Aceptada.

### ADR-031 · Decisiones de implementación de la Fase 7

- **Decisiones:**
  1. **Generador puro** (`packages/domain/src/plans`, versión `plans.v1`), determinista: el desempate usa un hash del id y la semana. Las restricciones se verifican en 300 casos con semilla:
     - edad (en un plan familiar alcanza con que sirva para algún integrante), tiempo por día, espacio y presupuesto;
     - de 5 a 7 ítems según el tiempo (5 con 10 minutos, 7 con 30 o más);
     - ninguna actividad más de 2 veces;
     - siempre una opción de 10 minutos o menos sin materiales, si el catálogo apto tiene alguna.
  2. **Prioridades:** primero lo recomendado por la evaluación, después lo que coincide con los intereses de la familia (mapa interés → tipo de actividad). Hay penalización por repetir tipo y por lo hecho en los últimos 14 días. Los días se reparten en la semana.
  3. **Migración 0011:** `family_plans` (un plan por semana, para la familia o para cada integrante, siempre desde un lunes) y `plan_items` (con `log_id` hacia `activity_logs`).
     - `save_week_plan()` reemplaza el plan de esa semana y solo la ejecutan owner o guardian.
     - `complete_plan_item()` registra la actividad con participantes y valoración en la misma transacción. Puede marcarla cualquier adulto, y marcarla dos veces no duplica el registro.
     - La caregiver ve el plan y marca o saltea, pero no cambia actividades (trigger).
  4. **`POST /v1/plans/generate`:** lee con el JWT (RLS), genera y guarda. Si no hay actividades aptas responde 409. "Otra idea" corre el mismo generador en la app, con el catálogo público.
  5. **Objetivos desde la familia** sobre las tablas de la Fase 9: crear, anotar avances con porcentaje (100% lo marca como logrado), cambiar el estado, y "Convertir en objetivo" desde cada recomendación del resultado.
  6. **Interfaz:**
     - "Hoy" muestra la actividad del día (o la próxima) con "Hecho" y "Otra idea", y los objetivos en curso.
     - Plan y Objetivos se abren desde Actividades y desde Hoy.
     - El resultado de la evaluación lleva a "Armar el plan de la semana".
- **Verificado:**
  - Los 313 tests del generador y las 19 verificaciones pgTAP nuevas.
  - 4 tests de la API.
  - El generador con el catálogo real de `crecer-dev`, en tres perfiles de familia (sin escribir datos).
  - En el navegador: Hoy, Plan y Objetivos.
- **No verificado de punta a punta:** armar el plan y marcar "Hecho" con la cuenta real (no se crearon datos en la cuenta del equipo).
- **Estado.** Aceptada.

### ADR-032 · El asistente usa Claude Haiku 5.5 por defecto

- **Contexto.** El equipo pidió un modelo más barato con una eficiencia parecida, de Anthropic o de otra empresa.
- **Decisión.** `AI_CHAT_MODEL` pasa a `claude-haiku-5-5` por defecto, y `claude-sonnet-5-5` queda como opción con la misma variable.
  - Haiku 5.5 cuesta US$0,10 / 0,50 por millón de tokens de entrada y salida (para prompts de hasta 100.000 tokens), contra US$2 / 10 de Sonnet 5.5: unas 20 veces menos.
  - Una respuesta típica (unos 3.000 tokens de entrada y 300 de salida) cuesta unos US$0,0005, contra US$0,009 con Sonnet.
  - Con el tope de US$10 por mes alcanza para unas 20.000 respuestas.
  - Mantiene el pensamiento adaptativo con esfuerzo `low` y el contexto de 1M.
  - No tiene fallback del servidor: el proveedor solo lo pide a los modelos que lo aceptan (`supportsServerFallback`), y ante una negativa la familia recibe la respuesta segura.
- **Por qué no otra empresa por ahora.**
  - La capa `LlmProvider` permite agregar otro proveedor sin tocar la recuperación, los prompts ni la seguridad.
  - Pero haría falta otra clave, revisar sus términos de uso de datos (V7; ADR-009 descartó Gemini por el uso de datos en su nivel gratuito) y escribir y probar la implementación.
  - Haiku 5.5 ya está en el rango de precio de los modelos chicos de otras empresas y no exige nada de eso.
- **Calidad.** Como en ADR-009, el modelo definitivo se confirma con el banco de evaluación (umbrales de AI_ARCHITECTURE.md §10). Si Haiku no los alcanza, se vuelve a Sonnet cambiando la variable.
- **Estado.** Aceptada.

### ADR-033 · Decisiones de implementación de la Fase 10

- **Decisiones:**
  1. **Permiso y segundo factor, en la base.** `has_admin_permission(code)` exige el permiso y `aal = 'aal2'` en el JWT. Lo usan todas las políticas y funciones administrativas, incluida ahora la lectura de la auditoría. La API usa además `requirePermission(..., { mfa: true })`.
  2. **Sin datos sensibles:**
     - Ningún permiso administrativo abre familias, integrantes, evaluaciones, conversaciones, mensajes ni observaciones; las pruebas pgTAP lo verifican para tres roles.
     - Los usuarios se listan solo con correo, alta y roles (`admin_list_users`).
     - El uso de la IA se ve solo agregado por día (`admin_usage_summary`).
     - El panel muestra solo los números de lo que el rol puede ver (`admin_overview`).
  3. **Funciones de estado con auditoría:**
     - `admin_set_content_status`: publicar o archivar exige `content.publish`, y pasar entre borrador y revisión, `content.edit` (un editor no publica).
     - `admin_publish_questionnaire`: publica el borrador y retira la versión anterior.
     - `admin_set_kb_status` y `admin_update_setting`, que valida claves y rangos.
  4. **La API con clave secreta solo para lo que la necesita:**
     - la URL firmada de 60 s del archivo de la credencial;
     - `verify_credential`, que guarda quién verificó;
     - asignar y quitar roles (`user_roles` sigue sin escritura desde el cliente).
  5. **Verificación en dos pasos (TOTP de Supabase):** se activa en Perfil con un QR y la clave manual. El panel `/admin` pide el código si la sesión no está en `aal2`.
  6. **`pnpm admin:grant <correo> <rol>`** crea la primera cuenta de administración (con la clave secreta, bloqueado en `prod`). Después, los roles se asignan desde `/admin/usuarios`.
  7. **Interfaz `/admin`:** Resumen, Verificaciones (checklist REFEPS/SISA o colegio, aprobar, pedir información, rechazar), Usuarios, Contenidos (contenidos, actividades y cuestionarios), Base de conocimiento, Auditoría (filtros por acción y período), Uso de la IA y Configuración. Lo que un rol no puede usar no aparece.
  8. **Queda para P1:** editar contenidos desde la administración, subir PDF a la base de conocimiento y suspender cuentas. En desarrollo, `content/` sigue siendo la fuente de verdad (ADR-014).
- **Verificado:**
  - Las 22 verificaciones pgTAP nuevas en PGlite y la migración aplicada en `crecer-dev`.
  - 6 tests de la API (MFA, permisos, verificación y roles).
  - En el navegador, sin crear datos: `/admin` sin rol muestra "No tenés acceso", y Perfil muestra la verificación en dos pasos.
- **No verificado de punta a punta:** activar el MFA y usar el panel con una cuenta administradora real.
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
