# Marca de Crecer en Casa

Isotipo: una casa coral que abriga un brote con una hoja menta y otra sol. La versión horizontal
suma el nombre en Nunito ExtraBold ("Crecer" en tinta, "en Casa" en coral profundo).

| Archivo                 | Para qué                                                                    |
| ----------------------- | --------------------------------------------------------------------------- |
| `logo-mark.svg`         | Isotipo solo (íconos, presentación, redes). Es el mismo dibujo que `BrandMark` |
| `logo-horizontal.svg`   | Isotipo + nombre (encabezados, diapositivas, documentos)                    |
| `logo-google-120.png`   | 120 × 120 px para la pantalla de consentimiento de Google (opcional)        |
| `logo-hoja.png`         | Hoja de usos: fondo claro, oscuro, ícono de app y tamaños chicos            |

Colores: coral `#FF7A59`, menta `#3CC9A0`, sol `#FFC93C`, crema `#FFF8F0`, tinta `#2B2D42`,
coral profundo `#B8452A`.

El ícono de la app, el ícono adaptable de Android (con su versión monocromática), la pantalla de
inicio y el favicon (`assets/images/`) salen de `logo-mark.svg`. Si se cambia el dibujo, hay que
actualizar también `src/ui/BrandMark.tsx` y volver a generar esas imágenes.

Si se sube un logo a la pantalla de consentimiento de Google, Google pide verificar la app completa.
