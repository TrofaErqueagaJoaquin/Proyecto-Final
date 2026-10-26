# Análisis de la investigación existente

> Fuente analizada: `crecer_en_casa_investigacion.md` / `.pdf` (octubre de 2026). Las referencias "§NN" remiten a las secciones de ese documento.
> Este análisis **no** volvió a consultar las fuentes primarias. Clasifica las afirmaciones según cómo las presenta la propia investigación y señala qué hay que verificar antes de publicarlas.

## 1. Inventario de lo encontrado

| Ubicación                                                  | Contenido                                                                                                      | Relación con el proyecto                      |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `Escritorio/files/crecer_en_casa_investigacion.md`         | Investigación completa: evidencia científica (§01–§13), producto (§14–§26), bibliografía (§27), síntesis (§30) | **Fuente principal**                          |
| `Escritorio/files/crecer_en_casa_investigacion.pdf`        | Misma investigación en PDF (15 páginas). Se extrajo el texto y coincide con el Markdown                        | Duplicado; usar el `.md` como canónico        |
| `Escritorio/Escritorio/Proyecto-Final/`                    | Repositorio Git vacío (sin commits) con remoto `github.com/TrofaErqueagaJoaquin/Proyecto-Final`                | **Destino del proyecto**                      |
| `Escritorio/Escritorio/proyectofinal.mwb`                  | Modelo de MySQL Workbench de 2024 (tablas `Usuarios`, `Productos`, `modelo`, `marcas`, `colores`…)             | No relacionado (proyecto de comercio de 2024) |
| `Escritorio/Escritorio/Actividad13_Manipulacion_Archivos/` | Práctica escolar de manejo de archivos en Python                                                               | No relacionado                                |
| Otras carpetas (`E-commerce`, `KaratePage`, `LSO`, etc.)   | Proyectos escolares previos                                                                                    | No relacionados                               |

No hay `CLAUDE.md`, `README` ni documentación técnica previa del proyecto.

## 2. Qué información está disponible

1. **Marco conceptual.** El problema no son "las pantallas" en sí, sino el desplazamiento de otras actividades (sueño, movimiento, juego, conversación), el contexto de uso y el diseño persuasivo de las plataformas. Esta tesis guía el tono de todo el producto.
2. **Recomendaciones oficiales por edad.** OMS 2019 (0–4 años), OMS 2020 (5–17), SAP y AAP 2026 con las "5 C" (§04, §08, §10).
3. **Evidencia con tamaño de efecto.** Mallawaarachchi 2024, Madigan 2019 y 2020, Radesky 2022, Carter 2016, Orben y Przybylski 2019, Riehm 2019 (§01, §05, §06, §08).
4. **Nueve fichas de situaciones difíciles (A–I).** Cada una tiene estructura uniforme: explicaciones, respaldo, qué hacer en casa, qué evitar, objetivo, cuándo consultar y qué no debe hacer la plataforma (§11).
5. **Banco inicial de actividades.** 14 actividades y el esquema de campos (§12).
6. **Señales para consultar** por edad y por área (§06, §10).
7. **Restricciones legales argentinas** y su efecto en el diseño (§13, §19).
8. **Diseño de producto previo.** Roles, MVP, RAG en fase 2, costos, arquitectura Next.js + Supabase (§16–§25).
9. **Instrumentos para el trabajo de campo** (§15), todavía sin aplicar.

## 3. Clasificación de las afirmaciones

La investigación ya usa una escala de confianza (§03). La plataforma la hereda tal cual como **etiquetas de evidencia obligatorias**: `recomendacion_oficial`, `evidencia_consolidada`, `asociacion_no_causa`, `hipotesis`, `opinion_profesional`, `propuesta_proyecto`.

### 3.1 Respaldadas por fuentes confiables (según la investigación)

| Afirmación                                                                                                                    | Fuente citada              | Etiqueta                        |
| ----------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------- |
| Sin pantallas sedentarias antes de 1 año; ≤1 h entre 2 y 4 años; 180 min de actividad física                                  | OMS 2019                   | Recomendación oficial           |
| Horas de sueño por edad (0–4 años)                                                                                            | OMS 2019                   | Recomendación oficial           |
| 60 min diarios de actividad moderada a vigorosa (5–17)                                                                        | OMS 2020                   | Recomendación oficial           |
| SAP: sin pantallas antes de los 2 años salvo videollamadas; sin pantallas la hora antes de dormir ni en el dormitorio         | SAP 2023                   | Recomendación oficial           |
| TV de fondo (r −0,10) y ver programas (r −0,16) se asocian con peores resultados cognitivos; el co-uso, con mejores (r +0,14) | Mallawaarachchi 2024       | Asociación, no causa            |
| Dispositivos a la hora de dormir → menos sueño y de peor calidad                                                              | Carter 2016                | Asociación (confianza moderada) |
| Calmar con el dispositivo ↔ reactividad emocional (bidireccional)                                                             | Radesky 2022               | Asociación, no causa            |
| En adolescentes, ≤0,4% de la varianza del bienestar                                                                           | Orben y Przybylski 2019    | Asociación                      |
| Incredible Years mejora la conducta disruptiva                                                                                | Menting 2013; Leijten 2017 | Evidencia consolidada           |

### 3.2 Requieren verificación antes de publicarse o de usarse para decidir

| Tema                                                           | Motivo                                                                         | Quién o cómo                                             |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------- |
| AAP 2026, _Digital Ecosystems, Children, and Adolescents_      | La investigación declara que **no leyó el texto completo** (§00, Advertencias) | Conseguir el PDF y revisar las citas textuales           |
| Cifras de Kids Online Argentina 2025 (95%, 9,6 años, 83%)      | Parte proviene de prensa                                                       | Ir al informe de UNICEF y UNESCO                         |
| Soluciones existentes (§14)                                    | Declaradas "sin verificación primaria"                                         | Revisar cada sitio                                       |
| Precios de Gemini, Supabase y Vercel (§18, §20)                | Cambian seguido; parte proviene de fuentes secundarias                         | Páginas oficiales al iniciar la Fase 1 y la Fase 7       |
| Proyectos de ley 1751-D-2026 y 3397-D-2026                     | Estado legislativo variable                                                    | Consultar HCDN y un abogado antes del lanzamiento        |
| Líneas 102, 137 y 135 y recursos de Mar del Plata              | La investigación pide verificar que estén vigentes (§26)                       | Llamar o consultar sitios oficiales y registrar la fecha |
| Fichas A–I y actividades                                       | "Requieren revisión clínica antes de publicarse" (§11)                         | Pediatra y psicólogo infantil                            |
| Licencias de ASQ-3, M-CHAT y PRUNAPE                           | Pendiente (§13)                                                                | No se usan en la plataforma: solo se mencionan           |
| Si las observaciones que cargan los padres son "dato de salud" | Pregunta abierta (§00)                                                         | Dictamen legal                                           |

### 3.3 Hipótesis y propuestas propias

- Tolerancia a la frustración y "estímulo constante": hipótesis plausible, con evidencia escasa y bidireccional (§02).
- Pantallas como premio o castigo: sin evidencia sólida → `opinion_profesional` (§09).
- Ocho de las 14 actividades están etiquetadas como `propuesta_proyecto`. La de "leer con preguntas" figura como "evidencia amplia, no revisada en esta sesión" y necesita su fuente.

## 4. Fuentes reutilizables

La bibliografía anotada (§27) tiene 18 entradas con DOI o identificador. Cada una se convierte en un registro de la tabla `sources` (ver `DATABASE.md`) con estos campos: tipo de estudio, año, DOI o URL, confianza y estado de verificación. Las afirmaciones del contenido se vinculan a las fuentes con la tabla `content_sources`, indicando el localizador de sección.

**Regla:** una fuente con `verification_status = 'unverified'` puede usarse en el entorno de demostración, pero no en contenido publicado en producción.

## 5. Contenido transformable en base de conocimiento para la IA

| Bloque                             | Destino                                                                    | Fragmentación sugerida                                            |
| ---------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| §04–§09 (áreas científicas)        | `content_items` de tipo `guide` + documentos de la base de conocimiento    | Un fragmento por subtítulo, con la etiqueta de evidencia heredada |
| §10 (prevención por edades)        | 5 `content_items` de tipo `age_stage`                                      | Un fragmento por etapa                                            |
| §11 (fichas A–I)                   | 9 `content_items` de tipo `situation_card`                                 | Un fragmento por ficha y sección (en casa, evitar, consultar)     |
| §12 (actividades)                  | Tabla `activities` (no van a la base vectorial: se recomiendan con reglas) | —                                                                 |
| §06 y §10 (señales para consultar) | `content_items` de tipo `when_to_consult` + reglas del filtro de riesgo    | Fragmento propio, con prioridad alta en la recuperación           |
| Glosario                           | `content_items` de tipo `glossary`                                         | Un fragmento por término                                          |
| §14–§26 (producto, ley, costos)    | **No** van a la base de conocimiento                                       | Es documentación interna, no orientación para familias            |

## 6. Información que falta para implementar lo previsto

1. **Contenido de los cuestionarios.** La investigación propone un cuestionario de 6 preguntas no identificatorias (§13). El nuevo alcance pide un test de hábitos por integrante. Hay que redactar las preguntas, con base en las pautas de la OMS y la SAP y las 5 C, y etiquetarlas como `propuesta_proyecto`: **no son un instrumento validado**. Hay un borrador en `IMPLEMENTATION_PLAN.md` §4 (se implementa en la Fase 6).
2. **De 66 a 106 actividades más** para llegar a la meta de 80–120. Para Expotec alcanzan 30, revisadas internamente.
3. **Directorio real de profesionales.** No existe. En Expotec se usan solo perfiles ficticios.
4. **Recursos de ayuda de Mar del Plata** con fecha de verificación.
5. **Textos legales** (términos, privacidad y consentimientos) revisados por un abogado.
6. **Banco de evaluación de la IA.** La investigación propone 100 preguntas, 20 de riesgo (§18); no están escritas.
7. **Resultados del trabajo de campo** (§15). Mientras no existan, los supuestos sobre usuarios se marcan como tales.

## 7. Tensiones entre la investigación y el nuevo alcance

La investigación (§19, §23) decidía:

- No guardar datos de salud ni de conducta de niños identificables.
- Dejar la IA para la fase 2.
- Admitir cuentas solo de mayores de 18 años.
- Posponer la mensajería con profesionales.

El pedido de la Fase 0 agrega:

- Perfiles por integrante.
- Evaluaciones por hijo.
- Un asistente con contexto familiar.
- Profesionales con seguimiento y observaciones.

**Cómo se resuelve:** ver `DECISIONS.md` (ADR-001 y ADR-002) y `SECURITY_AND_PRIVACY.md`. En síntesis:

- La arquitectura implementa el alcance completo **con minimización de datos y consentimientos explícitos**.
- La versión Expotec opera **solo con datos ficticios** en un entorno aislado.
- El lanzamiento con familias reales queda **condicionado a un dictamen legal**: las funciones sensibles se activan por configuración y no por código nuevo.
