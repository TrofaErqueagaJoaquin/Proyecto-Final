# Contenido (`content/`)

Todo el contenido del proyecto en texto, revisable como el código.

| Archivo o carpeta | Qué hay                                                                          |
| ----------------- | -------------------------------------------------------------------------------- |
| `library/`        | Etapas por edad, fichas de situaciones difíciles y "cuándo consultar" (Markdown) |
| `activities.yaml` | Las 30 actividades: pasos, edades, duración, costo, espacio y fuentes            |
| `sources.yaml`    | Las 22 fuentes (OMS, SAP, AAP, estudios) con su tipo y verificación              |
| `questionnaires/` | Cuestionarios: `habitos` (completa), `chequeo` (1 minuto) y `tema-*`             |

```bash
pnpm content:check   # valida todo (también en GitHub)
pnpm content:sync    # lo carga a la base
pnpm kb:ingest       # actualiza la biblioteca del asistente
```

Una versión de cuestionario publicada no se puede cambiar: para modificarla, se copia como versión
nueva (`*-v2.yaml`).
