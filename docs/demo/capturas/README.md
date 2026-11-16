# Capturas de la demo

Pantallas del entorno de demostración (`crecer-demo.vercel.app`, datos **ficticios**), con el
rediseño de noviembre de 2026 (ADR-035). Se sacan con `pnpm demo:screens` después de un
`pnpm demo:reset` (docs/setup/DEMO.md). Computadora: 1440 × 900 a 1,5× (2160 × 1350). Celular:
390 × 844 a 3× (1170 × 2532).

| Carpeta   | Quién                             | Qué muestra                                                                                                                                              |
| --------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `publico` | Sin cuenta                        | Inicio, etapa de 3 a 5 años, ficha C, catálogo de actividades, directorio, crear cuenta e ingresar                                                       |
| `laura`   | Laura García (familia)            | Hoy, plan de la semana, familia, evaluaciones, resultado e historial de Tomi, asistente, conversación, profesionales, objetivos, Pausa para vos y perfil |
| `paula`   | Lic. Paula Ríos (profesional)     | Sus casos y el resumen de Sofi                                                                                                                           |
| `movil`   | Laura, en el celular              | Hoy, la conversación con el asistente, el historial de Tomi, una pregunta y el resultado del chequeo de sueño, y Pausa para vos                          |
| `admin`   | Administración (`platform_admin`) | Del 28/10/2026, con el diseño anterior: la administración pide verificación en dos pasos y se captura a mano                                             |

- `laura/10-acompanamiento-rios` también es del 28/10 (diseño anterior).
- `admin/03-verificaciones` sale vacía a propósito: `platform_admin` no verifica matrículas. La cola con
  Ana Benítez la ve la cuenta `verificador`.
- Al abrir el resumen de Sofi como la Lic. Ríos quedó registrado el acceso: por eso
  `laura/10-acompanamiento-rios` muestra "vio el resumen de Sofi".
- Después de `pnpm demo:reset` las fechas y los ids cambian; las pantallas se ven iguales.
