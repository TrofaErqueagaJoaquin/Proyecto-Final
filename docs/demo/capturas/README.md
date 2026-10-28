# Capturas de la demo

Pantallas del entorno de demostración (`crecer-demo.vercel.app`, datos **ficticios**), tomadas el
28/10/2026 para la presentación y el video de Expotec. Computadora: 1440 × 900 a 1,5× (2160 × 1350).
Celular: 390 × 844 a 3× (1170 × 2532).

| Carpeta   | Quién                             | Qué muestra                                                                                                                                      |
| --------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `publico` | Sin cuenta                        | Inicio, etapa de 3 a 5 años, ficha C, catálogo de actividades, una actividad y el directorio de profesionales                                    |
| `laura`   | Laura García (familia)            | Hoy, plan de la semana, familia, evaluaciones, resultado e historial de Tomi, asistente, conversación, profesionales, acompañamiento y objetivos |
| `paula`   | Lic. Paula Ríos (profesional)     | Sus casos (familias García y Pereyra por separado) y el resumen de Sofi                                                                          |
| `admin`   | Administración (`platform_admin`) | El pedido de verificación en dos pasos, verificaciones, usuarios, contenidos, auditoría, uso de la IA y configuración                            |
| `movil`   | Laura, en el celular              | Hoy, la conversación con el asistente y el historial de Tomi                                                                                     |

- `admin/03-verificaciones` sale vacía a propósito: `platform_admin` no verifica matrículas. La cola con
  Ana Benítez la ve la cuenta `verificador`.
- Al abrir el resumen de Sofi como la Lic. Ríos quedó registrado el acceso: por eso
  `laura/10-acompanamiento-rios` muestra "vio el resumen de Sofi".
- Después de `pnpm demo:reset` las fechas y los ids cambian; las pantallas se ven iguales.
