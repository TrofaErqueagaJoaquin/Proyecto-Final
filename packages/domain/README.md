# Lógica del dominio (`packages/domain`)

Reglas del negocio **puras**: sin base de datos, sin red y sin pantallas. Por eso tienen la mayor
parte de las pruebas (más de 500).

| Carpeta    | Qué hace                                                                                                                                                         | Lo usa                                                         |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `scoring/` | Motor de puntajes: `scoreAttempt` (respuestas → puntaje y banda por dimensión) y `recommend` (bandas → fichas y actividades). Reglas fijas y versionadas, sin IA | API (`/v1/assessments/…/submit`) y la app (preguntas visibles) |
| `plans/`   | Generador del plan semanal: filtra por edad, tiempo, espacio y presupuesto, prioriza lo recomendado y agrega una opción de 10 minutos                            | API (`/v1/plans/generate`)                                     |
| `safety/`  | Detección de frases de riesgo (`risk.ts`), respuestas fijas con líneas de ayuda (`responses.ts`) y control de lo que el modelo no puede decir (`postcheck.ts`)   | API (asistente) y la app                                       |
| `kb/`      | Corte de la biblioteca en fragmentos para la búsqueda del asistente                                                                                              | `scripts/kb-ingest.mts`                                        |
| `age.ts`   | Edad en meses a partir del mes de nacimiento                                                                                                                     | Todo el sistema                                                |
