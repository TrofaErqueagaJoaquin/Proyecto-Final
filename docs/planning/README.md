# Documentación de planificación — Crecer en Casa

> Fase 0 · Análisis, arquitectura y planificación. Fecha: 26/10/2026.
> Estado: **plan aprobable, no implementado.** Ninguna decisión de este directorio fue verificada experimentalmente todavía; las que dependen de precios, límites de proveedores o normas están marcadas como **[A verificar]**.

Esta carpeta es la **fuente de verdad** para las fases siguientes. Si una fase posterior necesita cambiar una decisión, primero se actualiza el documento correspondiente y `DECISIONS.md`, y después el código.

## Orden de lectura recomendado

| #   | Documento                                            | Para qué sirve                                                                  |
| --- | ---------------------------------------------------- | ------------------------------------------------------------------------------- |
| 1   | [RESEARCH_ANALYSIS.md](RESEARCH_ANALYSIS.md)         | Qué aporta la investigación existente, qué está respaldado, qué falta verificar |
| 2   | [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)           | Visión, problema, usuarios, alcance (producto completo vs. versión Expotec)     |
| 3   | [TECH_STACK.md](TECH_STACK.md)                       | Tecnologías elegidas, alternativas evaluadas y costos                           |
| 4   | [ARCHITECTURE.md](ARCHITECTURE.md)                   | Componentes, responsabilidades, comunicación, monorepo, entornos                |
| 5   | [DATABASE.md](DATABASE.md)                           | Modelo relacional, diagramas ER, normalización, migraciones                     |
| 6   | [ROLES_AND_PERMISSIONS.md](ROLES_AND_PERMISSIONS.md) | Roles globales y contextuales, alcances, matrices, RLS                          |
| 7   | [AI_ARCHITECTURE.md](AI_ARCHITECTURE.md)             | Asistente RAG, contexto personalizado, seguridad, evaluación, costos            |
| 8   | [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md)   | Amenazas, controles, privacidad, menores, marco legal a validar                 |
| 9   | [UX_AND_NAVIGATION.md](UX_AND_NAVIGATION.md)         | Principios, identidad visual, navegación por rol, flujos                        |
| 10  | [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)     | Fases 1–11, dependencias, criterios de aceptación, cronograma                   |
| 11  | [TEST_STRATEGY.md](TEST_STRATEGY.md)                 | Pruebas, calidad, CI, convenciones                                              |
| 12  | [EXPOTEC_DEMO.md](EXPOTEC_DEMO.md)                   | Guion de demostración, datos ficticios, reinicio seguro                         |
| 13  | [DECISIONS.md](DECISIONS.md)                         | Registro de decisiones (ADR) con alternativas descartadas                       |

## Glosario de prioridades usado en todos los documentos

- **P0 · Esencial (Expotec):** debe estar terminado, probado y desplegado para la exposición.
- **P1 · Complementario:** diseñado y con lugar en el modelo de datos; se implementa si sobra tiempo o justo después.
- **P2 · Futuro:** contemplado en la arquitectura, sin implementación prevista en esta etapa.

## Fuentes de entrada de esta fase

- `C:\Users\erque\OneDrive\Escritorio\files\crecer_en_casa_investigacion.md` (investigación base, 731 líneas).
- `C:\Users\erque\OneDrive\Escritorio\files\crecer_en_casa_investigacion.pdf` (misma investigación en PDF, 15 páginas; se comparó el texto extraído y coincide con el Markdown).
- Pedido de Fase 0 del equipo (requisitos funcionales, técnicos y académicos).
