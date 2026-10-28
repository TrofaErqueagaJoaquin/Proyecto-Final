# Demostración para Expotec

> Todos los datos de este documento son **ficticios**. Cualquier parecido con personas reales es casual. El entorno de demostración no contiene ni recibe datos reales.

## 1. Objetivo

En **menos de 8 minutos**, sin cargar datos en vivo, mostrar:

1. Una familia con varios integrantes.
2. Un test completado y sus resultados.
3. Una conversación con el asistente que use contexto relevante.
4. Una recomendación y una actividad concreta.
5. Un profesional con perfil, asignaciones e historial.
6. Cómo se relacionan la familia y los profesionales.
7. Las diferencias de permisos entre roles.

## 2. Aislamiento del entorno

| Elemento             | Demo                                                                                                                     | Real (`prod`)                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| Proyecto de Supabase | `crecer-demo`                                                                                                            | `crecer-prod` (otro proyecto, otras claves) |
| Despliegue web y API | `crecer-demo.vercel.app` (o `demo.<dominio>`)                                                                            | Dominio principal                           |
| `APP_ENV`            | `demo` → banner fijo "Entorno de demostración · datos ficticios"                                                         | `prod`                                      |
| Usuarios             | Ficticios, con correos `@demo.crecerencasa.invalid` (el TLD `.invalid` no recibe correo)                                 | Reales                                      |
| Claves de IA         | Una clave aparte con un **tope de gasto** propio (US$20)                                                                 | Otra clave                                  |
| Seguridad            | **Idéntica a `prod`**: mismas migraciones, RLS, MFA de administradores y cuotas. La demo **no** tiene atajos de permisos | —                                           |

**Prohibido en la demo:** botones de "ingresar como…" con credenciales dentro del bundle, desactivar RLS, el modo "superusuario" y los endpoints públicos de reinicio.

## 3. Personajes y datos del escenario

### Familia García (cuenta principal de la demo)

| Persona o integrante | Rol                  | Datos                                                                                                                 |
| -------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Laura García         | `owner` (madre)      | Cuenta `laura@demo.crecerencasa.invalid`                                                                              |
| Diego García         | `guardian` (padre)   | Cuenta propia                                                                                                         |
| Norma                | `caregiver` (abuela) | Cuenta propia (para mostrar los permisos limitados)                                                                   |
| **Tomi**             | Integrante, 4 años   | 2 evaluaciones (hace 6 semanas y hace 1 semana) con mejoras en sueño · plan semanal activo · 6 actividades realizadas |
| **Sofi**             | Integrante, 11 años  | 1 evaluación · objetivo "Dispositivos fuera del cuarto a las 21:30" con 3 registros de avance                         |

### Profesionales

| Profesional                                                          | Estado                                                                                     | Relación                                                                                                                                                       |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lic. Paula Ríos, psicopedagoga (Mar del Plata, presencial y virtual) | **Verificada** (matrícula ficticia, verificación registrada por el verificador de la demo) | Asignación activa con la familia García → **solo Sofi** (`member_profile`, `assessments`, `goals`, `observations`) · 2 observaciones (1 privada, 1 compartida) |
| Dr. Martín Suárez, pediatra                                          | **Verificado**                                                                             | Asignación activa → **solo Tomi** (`member_profile`, `assessments`) + `family_goals`                                                                           |
| Lic. Ana Benítez, psicóloga                                          | **Pendiente de verificación**                                                              | No aparece en el directorio · su credencial está en la cola de verificación                                                                                    |

### Otra familia (para mostrar el aislamiento)

Familia Pereyra, con 1 integrante, atendida también por la Lic. Ríos. Laura nunca la ve. La Lic. Ríos ve a las dos familias **por separado**.

### Administración

| Cuenta              | Rol                             | Para mostrar                                                            |
| ------------------- | ------------------------------- | ----------------------------------------------------------------------- |
| `verificador@demo…` | `credential_verifier` (con MFA) | Aprueba en vivo la credencial de Ana Benítez                            |
| `admin@demo…`       | `platform_admin` (con MFA)      | Auditoría y uso de la IA; **intenta abrir una conversación y no puede** |

### Contenido

- Las 5 etapas, las 9 fichas A–I, "cuándo consultar", 30 actividades y 18 fuentes.
- El cuestionario `habitos-v1` publicado.
- La base de conocimiento indexada.

### Conversación precargada

Una conversación de Laura sobre Tomi: "Se pone muy mal cuando le apago la tablet", con su respuesta citando la Ficha C.

**Esa respuesta se genera de verdad con el asistente** durante un ensayo (`pnpm demo:capture`) y se guarda en `scripts/demo/fixtures/conversation.json` junto con el modelo, la versión del prompt y la fecha. **No se escribe a mano.**

## 4. Guion (≈ 7 minutos)

| Min  | Pantalla                                                                                          | Quién                                  | Qué decir y mostrar                                                                                                                                                                                                                                                                            | Punto |
| ---- | ------------------------------------------------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 0:00 | Inicio público en el celular                                                                      | Visitante                              | "¿Qué edad tiene?" → etapa de 3 a 5 años → la ficha con su etiqueta de evidencia y sus fuentes. _"No es anti-pantallas: cada recomendación muestra de dónde sale."_                                                                                                                            | —     |
| 0:45 | Familia → Integrantes                                                                             | Laura (web)                            | Tomi y Sofi: solo apodo y edad. Adultos con roles. _"Minimizamos: no pedimos nombre real ni escuela."_                                                                                                                                                                                         | 1     |
| 1:30 | Evaluaciones → Tomi → resultado                                                                   | Laura                                  | Bandas por dimensión, **por qué** y la comparación con la evaluación anterior (la línea de crecimiento). _"La puntuación es por reglas, reproducible; no es un diagnóstico."_                                                                                                                  | 2     |
| 2:30 | Recomendación → ficha C → actividad "Temporizador visible + actividad puente" → plan de la semana | Laura                                  | Marcar "La hicimos". La tarjeta **Hoy** cambia                                                                                                                                                                                                                                                 | 4     |
| 3:15 | Asistente → la conversación sobre Tomi                                                            | Laura                                  | Mostrar la respuesta precargada con sus citas. **Hacer una pregunta en vivo:** "¿Y a la hora de dormir qué hago?" → la respuesta usa la edad (4 años) y el resultado de sueño, y cita fuentes. **Después:** escribir una frase de riesgo → aparece la tarjeta de ayuda sin pasar por el modelo | 3     |
| 4:30 | Profesionales (familia)                                                                           | Laura                                  | Dos acompañamientos: Ríos → Sofi y Suárez → Tomi. Accesos por alcance y "actividad de acceso" (la Lic. Ríos vio el resumen de Sofi)                                                                                                                                                            | 6     |
| 5:15 | Casos (profesional)                                                                               | Lic. Ríos (otra pestaña o dispositivo) | Ve a Sofi (evaluación, objetivo y observaciones) y **no** a Tomi. Ve a la familia Pereyra por separado. Registra una observación compartida                                                                                                                                                    | 5, 6  |
| 6:00 | Revocación en vivo                                                                                | Laura                                  | Revocar el acceso `assessments` de Sofi → Ríos actualiza y la sección desaparece                                                                                                                                                                                                               | 7     |
| 6:30 | Administración                                                                                    | Verificador / Admin                    | Aprobar a Ana Benítez → aparece en el directorio. El admin intenta abrir conversaciones y **no puede**. La auditoría muestra la revocación                                                                                                                                                     | 5, 7  |
| 7:00 | Cierre                                                                                            | —                                      | Arquitectura en una diapositiva: Expo + Supabase (RLS) + API Hono + RAG. _"Los permisos se verifican en la base, no en los botones."_                                                                                                                                                          | 7     |

**Preparación de pantallas:** 3 perfiles de navegador con la sesión ya iniciada (Laura, Lic. Ríos y Admin) + un celular Android con el APK (Laura) + una tablet o un segundo celular (Lic. Ríos). Las sesiones se inician el día anterior y se verifican esa mañana.

## 5. Carga y reinicio

```
pnpm demo:reset          # deja el entorno en el estado del guion
pnpm demo:capture        # (ensayo) genera y guarda la conversación real
pnpm demo:smoke          # E2E de solo lectura de los 7 puntos (llega con la suite E2E de F12)
```

La puesta en marcha paso a paso está en `docs/setup/DEMO.md`.

**Guardas de `demo:reset`** (en `scripts/demo/guards.ts`). El script **aborta** si no se cumplen todas estas condiciones:

1. `APP_ENV === 'demo'`.
2. El _project ref_ de `SUPABASE_URL` es igual a `DEMO_PROJECT_REF` (constante del repositorio).
3. El operador escribe la confirmación `RESET DEMO` en la terminal.
4. La tabla `app_settings` del destino tiene `environment = 'demo'`, sembrada por la migración del proyecto demo.

**Qué hace:**

1. Borra las familias y, con la API de administración de Auth, todas las cuentas del proyecto salvo `admin@…` y `verificador@…`, que se conservan para no perder su verificación en dos pasos (ADR-034).
2. Vacía las tablas de negocio (no los catálogos).
3. Ejecuta `content:sync` y la ingestión (o reutiliza los embeddings guardados si no cambió el `checksum`).
4. Crea los usuarios con **contraseñas generadas en ese momento**, que se muestran **solo en la terminal** del operador y se guardan en su gestor de contraseñas.
5. Inserta el escenario con UUID deterministas.
6. Registra `demo.reset` en la auditoría.

Tarda menos de 2 minutos. **No existe un endpoint HTTP de reinicio:** solo el script local con la clave de servicio del proyecto demo.

## 6. Plan B (conectividad)

| Falla                                        | Respuesta                                                                                                                                                                                      |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El Wi-Fi de la exposición es inestable       | Hotspot del celular (probado de antemano)                                                                                                                                                      |
| No hay ninguna conexión                      | **Video grabado** del guion completo (en el escritorio y en un pendrive) + diapositivas de la arquitectura                                                                                     |
| El proveedor de IA está caído o lento        | `AI_LLM_PROVIDER=fake` **solo en `demo`**: devuelve respuestas de ensayo grabadas con el aviso visible "Respuesta de ensayo (sin conexión al modelo)". Nunca se presenta como generada en vivo |
| Se cerró una sesión                          | Login normal; las contraseñas están en el gestor del operador                                                                                                                                  |
| Alguien modificó datos durante la exposición | `pnpm demo:reset` entre las presentaciones                                                                                                                                                     |

## 7. Checklist del día

- [ ] `demo:reset` + `demo:smoke` en verde (mañana y mediodía).
- [ ] Sesiones iniciadas en los 3 perfiles y en los dispositivos; celulares cargados y en modo "no molestar".
- [ ] Gasto de IA del mes por debajo del tope; cuota de usuarios de la demo ampliada para Laura (solo en `demo`, por `app_settings`).
- [ ] Hotspot probado; video de respaldo abierto.
- [ ] El banner de "datos ficticios" se ve en todas las pantallas.

## 8. Preguntas técnicas probables del jurado (y dónde está la respuesta)

| Pregunta                                                      | Respuesta breve                                                                                                                                  | Documento                   |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- |
| "¿Qué pasa si alguien modifica la app para ver otra familia?" | RLS en Postgres: la base rechaza la fila aunque el cliente esté modificado. Lo demuestran los tests pgTAP                                        | `ROLES_AND_PERMISSIONS.md`  |
| "¿La IA puede inventar?"                                      | Responde solo con fragmentos recuperados, las citas se validan y, si no hay evidencia, dice que no sabe. Hay un banco de evaluación con umbrales | `AI_ARCHITECTURE.md`        |
| "¿Cómo calculan el resultado?"                                | Reglas explícitas y versionadas en `scoring_spec`, con un motor puro con tests; la IA no puntúa                                                  | `IMPLEMENTATION_PLAN.md` §4 |
| "¿Por qué Postgres y no MySQL o Mongo?"                       | Relaciones muchos a muchos, RLS y pgvector en un solo motor                                                                                      | `TECH_STACK.md` §4          |
| "¿Está normalizada la base?"                                  | Hasta la 3FN, con excepciones justificadas                                                                                                       | `DATABASE.md` §5            |
| "¿Cumple la ley?"                                             | Se diseñó siguiendo la Ley 25.326 y la 26.061. El lanzamiento real está condicionado a un dictamen legal; la demo usa solo datos ficticios       | `SECURITY_AND_PRIVACY.md`   |
