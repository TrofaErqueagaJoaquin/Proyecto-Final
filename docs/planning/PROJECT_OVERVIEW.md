# Visión general del proyecto

## 1. Nombre y propósito

**Crecer en Casa** (nombre provisorio; hay que verificar que el dominio y la marca estén disponibles).

Es una plataforma web y móvil de **orientación familiar, prevención y acompañamiento** sobre el uso de pantallas en la infancia y la adolescencia. Ayuda a las familias a:

1. **Comprender:** información confiable por edad, con la evidencia a la vista.
2. **Identificar:** evaluaciones orientativas de hábitos y rutinas, con resultados explicados en lenguaje claro.
3. **Actuar:** estrategias y actividades concretas, posibles con poco tiempo, sin materiales y en espacios chicos.
4. **Acompañarse:** un asistente con IA basado en contenido revisado y acceso a profesionales cuando corresponde.

**Lo que NO es:** una herramienta de diagnóstico médico o psicológico ni un control parental o de vigilancia. Tampoco reemplaza la consulta profesional.

Propuesta de valor, tomada de la investigación (§30): _"Qué necesita tu hijo a esta edad, qué podés hacer hoy con lo que tenés y cuándo consultar."_

## 2. Problema

Muchas familias argentinas crían en un entorno con dispositivos presentes desde el nacimiento. Reciben mensajes contradictorios o que las culpan, y no tienen acceso fácil a orientación confiable, adaptada a la edad y aplicable con sus recursos (§02).

La evidencia indica efectos chicos o moderados y con muchas causas. El factor clave es lo que el uso digital **desplaza**, más que la pantalla en sí. Por eso el producto no es "anti-pantallas": promueve sueño, movimiento, juego, vínculo y autorregulación.

## 3. Usuarios

| Perfil                                                                                       | Necesidad principal                                                                            | Plataforma típica        |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------ |
| **Madre, padre o tutor** (rol de familia)                                                    | Saber qué es esperable, qué hacer hoy y cuándo consultar                                       | Móvil (mayoritario), web |
| **Otro adulto cuidador** (abuela, niñera)                                                    | Ver el plan y las actividades, marcarlas como hechas                                           | Móvil                    |
| **Profesional** (pediatra, psicólogo, psicopedagogo, terapista ocupacional, psicomotricista) | Acompañar casos autorizados, ver evaluaciones compartidas, registrar observaciones y objetivos | Web (principal), móvil   |
| **Editor de contenidos**                                                                     | Cargar, revisar y publicar fichas, actividades y cuestionarios                                 | Web                      |
| **Verificador de credenciales**                                                              | Revisar matrículas y aprobar o rechazar                                                        | Web                      |
| **Administrador de plataforma**                                                              | Usuarios, roles, configuración, auditoría                                                      | Web                      |
| **Visitante sin cuenta**                                                                     | Leer la biblioteca pública                                                                     | Web y móvil              |

**Supuestos** (no validados: el trabajo de campo de la §15 no se hizo):

- La mayoría de las familias usa el celular.
- La conexión puede ser intermitente.
- El tiempo disponible es poco.
- Las familias desconfían de los sitios que piden muchos datos.

Los niños y adolescentes **no tienen cuenta** en la primera versión.

## 4. Alcance

### 4.1 Producto completo (lo que contempla la arquitectura)

| Módulo               | Descripción                                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Biblioteca pública   | Etapas por edad, situaciones A–I, cuándo consultar, sobre la evidencia, recursos locales                                                                     |
| Cuentas              | Correo y contraseña, Google, GitHub (Apple en P2, solo si se publica en iOS), verificación, recuperación, perfil y preferencias                              |
| Familias             | Espacio familiar, varios adultos con roles, varios integrantes, invitaciones, consentimientos                                                                |
| Evaluaciones         | Cuestionarios versionados, puntuación por reglas, resultados por dimensión, historial, recomendaciones                                                       |
| Actividades y planes | Catálogo con filtros, favoritos, realizadas, planes sugeridos por reglas                                                                                     |
| Asistente con IA     | RAG sobre contenido revisado, contexto familiar autorizado, citas, filtro de riesgo, historial con retención                                                 |
| Profesionales        | Perfil, credenciales, verificación, búsqueda, solicitudes, asignaciones, permisos por alcance, observaciones, objetivos, seguimiento, disponibilidad y citas |
| Administración       | Usuarios y roles, verificaciones, catálogos, cuestionarios, contenido, base de conocimiento, auditoría, uso, configuración                                   |
| Notificaciones       | En la aplicación (P1); push y correo (P2)                                                                                                                    |
| Demo Expotec         | Entorno aislado con datos ficticios y un reinicio reproducible                                                                                               |

### 4.2 Versión Expotec (primera versión funcional)

Hay que **terminar los recorridos principales**, no acumular funciones a medias. El detalle está en `IMPLEMENTATION_PLAN.md`; en resumen:

| Prioridad | Incluye                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **P0**    | Autenticación (correo, Google, GitHub), protección de rutas y RLS · familias, integrantes, invitaciones y consentimientos · 1 cuestionario publicado con puntuación, resultados, historial y recomendaciones · catálogo de actividades con filtros, favoritos y realizadas · plan semanal sugerido por reglas · asistente RAG con citas, contexto autorizado y filtro de riesgo · profesionales: perfil, credenciales con estado de verificación, búsqueda, solicitud, aceptación, permisos por alcance, observaciones, objetivos y progreso · administración: verificación, usuarios y roles, auditoría, ingestión de documentos, vista de contenidos · demo con datos ficticios y reinicio · web desplegada + APK de Android |
| **P1**    | Citas y disponibilidad · notificaciones en la aplicación · editor de contenidos con revisiones · exportación de datos · ajustes de retención del historial · retroalimentación sobre las respuestas de la IA                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **P2**    | Push · iOS en App Store (con Sign in with Apple) · perfiles infantiles y juegos · resúmenes entre conversaciones · comunidad (descartada por la investigación: riesgo de que los padres diagnostiquen y de exponer a menores) · control parental (descartado: ya existe y conlleva riesgo de vigilancia) · lectura sin conexión                                                                                                                                                                                                                                                                                                                                                                                                |

## 5. Principios del producto

1. **Desarrollo integral, no "anti-pantallas".**
2. **Evidencia etiquetada:** toda afirmación lleva su etiqueta de evidencia.
3. **Sin culpa:** lenguaje basado en fortalezas. Nada de "adicto", "caprichoso" ni "malcriado" (§06).
4. **Orientativo, nunca diagnóstico.** Las puntuaciones salen de reglas explícitas; la IA interpreta, no diagnostica.
5. **Mínimos datos posibles:** apodo y mes de nacimiento, sin nombre real, DNI, escuela ni fotos de los chicos.
6. **Privacidad por defecto:** sin publicidad ni rastreadores; los profesionales ven solo lo autorizado.
7. **Recursos reales:** cada recomendación tiene una versión "con poco tiempo, sin materiales y en un espacio chico" (§09).

## 6. Qué se puede afirmar públicamente y qué no

| Se puede decir                                                                      | No se puede decir                                            |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| "Te orienta con información basada en recomendaciones oficiales y estudios citados" | "Mejora el desarrollo de tu hijo" (no se midió; §24)         |
| "Evaluación orientativa de hábitos"                                                 | "Test diagnóstico", "detecta TDAH o autismo"                 |
| "Profesional con matrícula verificada el dd/mm/aaaa" (solo si lo está)              | "Profesional verificado" sin verificación registrada         |
| "El asistente responde a partir de contenido revisado y cita la fuente"             | "El asistente siempre tiene razón" o "reemplaza al pediatra" |

## 7. Métricas de éxito

### 7.1 Para Expotec

- Los siete puntos del guion de `EXPOTEC_DEMO.md` se muestran en menos de 8 minutos, sin cargar datos en vivo.
- Las pruebas de autorización pasan en CI.
- Las pruebas end-to-end de los recorridos principales pasan en web.
- El banco de evaluación de la IA cumple los umbrales: 0 respuestas peligrosas y al menos 90% de fidelidad a la fuente.

### 7.2 Después de Expotec

- Usabilidad: SUS, éxito en las tareas y prueba de conocimientos antes y después (§24).
- **No** se mide el efecto sobre el desarrollo sin un ensayo aprobado por un comité de ética.
