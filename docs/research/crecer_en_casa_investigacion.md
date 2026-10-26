# Desarrollo infantil, crianza y bienestar digital: investigación de base y especificación de producto

Proyecto: plataforma web *Crecer en Casa* (nombre provisorio). Contexto: Argentina, piloto en Mar del Plata. Fecha del informe: octubre de 2026.

## Cómo leer este documento

Este documento reúne la investigación científica sobre desarrollo infantil y entorno digital, y la propuesta de una plataforma web para familias. Está dividido en secciones numeradas (00 a 30). Las secciones 01 a 13 tratan la evidencia científica y las orientaciones para familias. Las secciones 14 a 26 tratan el diseño del producto, la ley, los costos y la tecnología. La sección 27 es la bibliografía y la 30 es la síntesis final.

Idea central en una frase: el problema no son "las pantallas" en sí, sino lo que el uso digital desplaza (sueño, movimiento, juego, conversación con adultos), el contexto en que se usa y el diseño persuasivo de las plataformas.

## Glosario básico

- **Metaanálisis:** estudio que combina estadísticamente los resultados de muchos estudios sobre la misma pregunta. Suele dar la evidencia más sólida.
- **Revisión sistemática:** búsqueda y análisis ordenado de todos los estudios sobre un tema, con reglas fijadas de antemano.
- **Estudio de cohorte o longitudinal:** sigue a las mismas personas durante un tiempo. Permite ver qué pasa primero, pero no prueba causalidad.
- **Estudio transversal:** mide todo en un solo momento. No permite saber qué causa qué.
- **Ensayo aleatorizado:** se asigna al azar quién recibe una intervención. Es la mejor forma de probar causalidad.
- **Asociación o correlación:** dos cosas aparecen juntas. No significa que una cause la otra.
- **Causalidad inversa:** cuando lo que parece efecto es en realidad causa. Ejemplo: un chico más irritable recibe más el celular para calmarse, en lugar de que el celular lo vuelva irritable.
- **Factor de confusión:** una tercera variable que explica las dos cosas que aparecen juntas (por ejemplo, el nivel socioeconómico o el estrés de los padres).
- **r (coeficiente de correlación):** mide la fuerza de una asociación, de −1 a +1. Valores cercanos a 0,1 son efectos chicos.
- **Varianza explicada:** qué porcentaje de las diferencias entre personas se explica por una variable. 0,4% es muy poco.
- **Desplazamiento:** el tiempo frente a la pantalla reemplaza otras actividades valiosas (dormir, moverse, jugar, conversar).
- **Uso compartido (co-uso):** el adulto mira o usa el contenido junto con el chico y conversa sobre él.
- **TV de fondo:** televisor encendido aunque nadie lo esté mirando.
- **Diseño persuasivo:** funciones de las apps pensadas para que la persona siga usándolas (reproducción automática, scroll infinito, notificaciones).
- **Funciones ejecutivas:** habilidades mentales para planificar, controlar impulsos, mantener la atención y cambiar de tarea.
- **Tummy time:** tiempo boca abajo, despierto y supervisado, para bebés.
- **Las 5 C de la AAP:** Child (el chico), Content (el contenido), Calm (si se usa para calmar), Crowding out (qué desplaza) y Communication (conversar sobre el uso).
- **MVP (producto mínimo viable):** la primera versión más chica posible que igual resuelve un problema real.
- **Frontend:** la parte de la aplicación que ve el usuario. **Backend:** la lógica protegida en el servidor. **Base de datos:** donde se guarda la información.
- **RLS (Row Level Security):** regla de la base de datos que hace que cada usuario solo pueda ver sus propias filas.
- **RAG:** técnica de IA en la que el modelo responde solo a partir de documentos recuperados de una base revisada, citando la fuente.
- **PWA:** sitio web que se puede instalar en el celular y funcionar parcialmente sin conexión.
- **Dato sensible:** según la Ley 25.326 argentina, entre otros, la información de salud. Tiene protección reforzada.
- **Autonomía progresiva:** principio legal argentino por el cual los chicos y adolescentes ganan capacidad de decidir según su edad y madurez.

---

## Resumen (TL;DR)

- **El problema existe, pero tiene muchas causas y efectos chicos o moderados.** En la primera infancia, los metaanálisis encuentran asociaciones negativas pequeñas: ver programas (r = −0,16) y la TV de fondo (r = −0,10) con los resultados cognitivos. Usar la pantalla junto a un adulto se asocia en forma positiva (r = +0,14). En adolescentes, el uso digital explica como máximo el 0,4% de la variación del bienestar. Casi toda la evidencia es observacional, así que no hay que afirmar causalidad.
- **Las recomendaciones mejor respaldadas son concretas y por edad.** La OMS (2019) y la SAP desaconsejan las pantallas sedentarias antes de los 2 años (la SAP exceptúa las videollamadas) y fijan un máximo de 1 hora diaria entre los 2 y los 4-5 años, con al menos 180 minutos de actividad física y sueño suficiente. La AAP, en su declaración de 2026 *Digital Ecosystems, Children, and Adolescents*, deja de lado el tope horario único para escolares, propone las "5 C" y pone la responsabilidad en el diseño de las plataformas en lugar de culpar a las familias.
- **Decisión de producto.** El MVP tendría biblioteca pública por edades, 9 fichas de situaciones (A–I), banco de actividades con filtros y panel de administración, sobre Supabase (PostgreSQL con Row Level Security) y Vercel en planes gratuitos. No guardaría datos de salud identificables de menores: la Ley 25.326 los considera sensibles y sigue vigente, porque los proyectos de reforma 1751-D-2026 y 3397-D-2026 no tienen dictamen. La IA queda para la fase 2, como buscador RAG sobre contenido revisado, a un costo estimado de menos de un centavo de dólar por consulta.

---

## 00 · Índice y estado

| Documento | Estado |
|---|---|
| 01–03 Resumen, problema, metodología | Completos |
| 04–09 Áreas científicas | Versión 1. Faltan Cochrane, LILACS y estudios latinoamericanos |
| 10–11 Prevención y fichas A–I | Completos. Las fichas requieren revisión clínica antes de publicarse |
| 12 Banco de actividades | Inicial (14 actividades y el esquema de ficha) |
| 13 Orientación personalizada | Diseño completo |
| 14 Soluciones existentes | Parcial: no verificado con fuentes primarias |
| 15 Investigación de usuarios | Instrumentos listos, sin aplicar |
| 16–25 Producto | Versión inicial, depende del trabajo de campo |
| 26–27 Riesgos y bibliografía | Completos para las fuentes centrales |

**Decisiones tomadas:** enfoque de desarrollo integral, no "anti-pantallas"; contenido público sin registro; sin datos de salud identificables de niños en el MVP; IA, directorio y comunidad fuera del MVP.

**Preguntas abiertas:** texto completo de la declaración AAP 2026 (el sitio bloqueó la descarga automática); si las observaciones de conducta que cargan los padres cuentan como "dato de salud" (consulta legal); cómo verificar profesiones que no figuran en el registro sanitario.

---

## 01 · Hallazgos clave

1. **La hipótesis inicial ("las pantallas causan los problemas") no está demostrada como causa única.**
   - Hay asociaciones longitudinales pequeñas: más pantalla a los 24 y 36 meses predijo peores puntajes en una prueba de pesquisa del desarrollo más adelante (Madigan et al., 2019; β −0,08 y −0,06).
   - Hay una relación más clara con el sueño cuando hay dispositivos en el dormitorio o se usan antes de dormir (Carter et al., 2016).
2. **El contexto pesa tanto como la cantidad.**
   - Se asocian con mejores resultados: el uso compartido, el contenido adecuado y el comienzo más tardío.
   - Se asocian con peores resultados: la TV de fondo, el contenido inadecuado y el celular del adulto durante las rutinas (Madigan et al., 2020; Mallawaarachchi et al., 2024).
3. **Calmar con el celular funciona en las dos direcciones.** En 422 chicos de 3 a 5 años, usar más el dispositivo para calmar predijo más reactividad emocional entre 3 y 6 meses después. A la vez, más reactividad predijo más uso del dispositivo (Radesky et al., 2022). Es una asociación, no una prueba de daño.
4. **En adolescentes, la ciencia sigue debatiendo.**
   - Orben y Przybylski (2019), con 355.358 adolescentes: asociación negativa pero mínima (como máximo 0,4% de la varianza).
   - El Surgeon General de EE. UU. (2023) concluye que las redes no han demostrado ser "suficientemente seguras". Su dato de que más de 3 horas diarias de redes se asocian con el "doble de riesgo" de síntomas de depresión y ansiedad sale de un único estudio: Riehm et al. (*JAMA Psychiatry*, 2019), una cohorte de 6.595 adolescentes estadounidenses de 12 a 15 años. En ese estudio, el doble de riesgo ajustado (RRR 2,01) corresponde a problemas internalizantes y externalizantes combinados; para los problemas internalizantes solos, el RRR fue de 1,60 con 3 a 6 horas y de 1,78 con más de 6 horas.
   - Las dos posiciones son compatibles: el efecto promedio es chico, pero hay subgrupos y usos de mayor riesgo.
5. **Las intervenciones con mejor respaldo apuntan a la crianza, no al dispositivo.** Incredible Years y Triple P reducen los problemas de conducta. En el caso de Triple P, la evidencia tiene un riesgo de sesgo importante (Wilson et al., 2012).
6. **En Argentina, el uso real supera las recomendaciones.** La encuesta nacional Kids Online Argentina 2025 de UNICEF y UNESCO (5.910 chicos de 9 a 17 años) encontró que el 95% tiene celular propio con Internet. Según una especialista de UNICEF Argentina citada en la prensa, en promedio consiguen su primer dispositivo a los 9,6 años; además, el 83% de los chicos de 9 a 11 años tuvo celular antes de cumplir 10. La SAP describe una "manifiesta discordancia" entre las recomendaciones y el uso real.
7. **Oportunidad (provisoria).** No encontramos una herramienta gratuita en español rioplatense que reúna orientación por edad, actividades de bajo costo, guías para situaciones difíciles y evidencia trazable.

---

## 02 · Definición del problema y preguntas de investigación

**Problema.** Muchas familias argentinas crían en un entorno con dispositivos presentes desde el nacimiento. Reciben mensajes contradictorios o que las culpan, y no tienen acceso fácil a orientación confiable, adaptada a la edad y aplicable con sus recursos. Esa orientación debería ayudarlas a sostener el sueño, el movimiento, el juego, los vínculos y la autorregulación, y a reconocer cuándo conviene consultar.

**Preguntas de investigación:**

1. ¿Qué dimensiones del desarrollo muestran asociaciones consistentes con el entorno digital, y de qué tamaño?
2. ¿Esas asociaciones dependen de la cantidad, del contenido, del contexto, del desplazamiento de otras actividades o de factores de confusión (nivel socioeconómico, estrés parental, temperamento, sueño)?
3. ¿Qué prácticas familiares tienen respaldo experimental?
4. ¿Qué les falta a las familias de Mar del Plata? Se responde con trabajo de campo (sección 15).
5. ¿Qué puede hacer una web de manera segura y legal?

| Observación inicial | Estado según la evidencia |
|---|---|
| Menos movimiento por las pantallas | Asociación frecuente pero heterogénea. Mecanismo plausible: desplazamiento. No demostrado como causa |
| Necesidad de estímulo constante, baja tolerancia a la frustración | Hipótesis plausible. Evidencia directa escasa y bidireccional |
| Conflictos al apagar | Frecuentes en la experiencia clínica. Poca investigación cuantitativa |
| "Los padres no saben poner límites" | Simplista: los límites se aprenden (programas de crianza), y pesan el estrés, el tiempo y los recursos |

---

## 03 · Metodología y calidad de la evidencia

**Jerarquía de fuentes**, de mayor a menor peso:

1. Guías oficiales basadas en revisiones sistemáticas.
2. Revisiones sistemáticas y metaanálisis.
3. Cohortes longitudinales.
4. Ensayos aleatorizados de intervenciones.
5. Estudios transversales.
6. Opinión de sociedades científicas.
7. Propuestas propias del proyecto.

**Escala de confianza:**

- **Alta:** revisiones concordantes o guía oficial basada en evidencia.
- **Moderada:** metaanálisis de estudios observacionales, o cohortes consistentes.
- **Baja:** estudios transversales o muestras de conveniencia.
- **Hipótesis:** mecanismo plausible sin prueba directa.

**Etiquetas obligatorias en la plataforma:** [Recomendación oficial] · [Evidencia consolidada] · [Asociación, no causa] · [Hipótesis] · [Opinión profesional] · [Propuesta del proyecto].

**Problemas metodológicos que se repiten:**

- El tiempo de pantalla suele medirse por reporte de los padres.
- Queda confusión residual (nivel socioeconómico, salud mental parental, temperamento).
- Hay causalidad inversa: Danet et al. (2022) mostraron que los chicos de 3 a 4 años con funciones ejecutivas más débiles reciben más dispositivos para calmarse.
- Los efectos chicos se comunican como "doble de riesgo".
- Hay pocos estudios latinoamericanos, y los argentinos suelen ser encuestas de conveniencia. Un ejemplo es García, Velázquez, D'Agostino et al., "Uso de pantallas, sedentarismo y actividad física en los niños menores de seis años, durante el periodo de aislamiento social preventivo y obligatorio en AMBA: encuesta en línea" (*Rev Fac Cien Med Univ Nac Córdoba*, 2023;80(4):456–475), una encuesta en línea de 31 preguntas que estuvo abierta durante cuatro meses de la cuarentena.

**Fuentes consultadas:** PubMed/PMC, JAMA Pediatrics, Pediatrics, SciELO Argentina, OMS, UNICEF, SAP, InfoLEG, IAPP y la documentación oficial de los proveedores. Falta buscar en Cochrane y LILACS.

---

## 04 · Desarrollo motor y actividad física

**Recomendación oficial: OMS 2019.** Confianza alta en la dirección; los umbrales vienen de consenso de expertos.

| Edad | Actividad física | Pantallas | Otras pautas |
|---|---|---|---|
| Menores de 1 año | Juego interactivo en el piso varias veces al día, con al menos 30 minutos boca abajo ("tummy time") despiertos | Ninguna | — |
| 1–2 años | Al menos 180 minutos de actividad física de cualquier intensidad | Ninguna al año; a los 2, no más de 1 hora ("menos es mejor") | No estar sujetos más de 1 hora seguida |
| 3–4 años | 180 minutos, de los cuales 60 de intensidad moderada a vigorosa | Hasta 1 hora | — |

La OMS aclara que los 180 minutos vienen de las guías australianas de 2010, que se basaron en consenso de expertos. Para 5 a 17 años, la OMS 2020 recomienda un promedio de 60 minutos diarios de actividad moderada a vigorosa y limitar el tiempo recreativo frente a pantallas, sin fijar una cifra.

**Evidencia sobre pantallas y motricidad.** Confianza baja a moderada.

- Revisión sistemática de Bakht et al. (2025, *Pediatric Discovery*), niños de 0 a 7 años, 24 estudios: 17 encontraron una asociación negativa, 5 no encontraron asociación y 2 dieron resultados mixtos. Predominan los estudios transversales.
- Cohorte japonesa JECS (57.980 niños, *JAMA Pediatrics*): más TV/DVD a los 1 y 2 años se asoció con puntajes de desarrollo más bajos a los 2 y 3 años.

**Interpretación.** El mecanismo más plausible es el desplazamiento: el tiempo sentado o sujeto reemplaza el piso, el gateo y la manipulación de objetos. No hay evidencia de un efecto "tóxico" de la pantalla. Por eso la plataforma debe promover agregar movimiento más que contar minutos.

**Qué no afirmar:** que las tablets "atrofian" la motricidad fina, o que un niño camina tarde por las pantallas. Los hitos varían mucho entre chicos. Perder habilidades ya adquiridas siempre es motivo de consulta.

**Propuestas:**

- Bebés: "3 momentos de piso por día".
- 2 a 5 años: un circuito en el living.
- 6 a 11 años: desafíos de equilibrio.
- Adolescentes: caminatas y deporte social.

---

## 05 · Desarrollo cognitivo, lenguaje y aprendizaje

**Estudios centrales:**

- **Madigan et al. (2020), *JAMA Pediatrics*, metaanálisis, 0 a 12 años.** Más cantidad de pantalla y más TV de fondo se asocian con un lenguaje más pobre. Los programas educativos, el uso compartido y el comienzo más tardío se asocian con un lenguaje mejor. Confianza moderada.
- **Mallawaarachchi et al. (2024), *JAMA Pediatrics* 178(10):1017–1026, 100 estudios, más de 176.000 niños de 0 a 5 años.**
  - Asociación negativa con los resultados cognitivos: ver programas (r −0,16) y TV de fondo (r −0,10).
  - Asociación positiva: uso compartido (r +0,14, con heterogeneidad alta, I² ≈ 72%).
  - Asociación con peores resultados psicosociales: el contenido inadecuado para la edad y el uso de pantallas del adulto durante las rutinas.
  - Los propios autores advierten que la mayoría de la evidencia es transversal y con alto riesgo de sesgo.
- **Madigan et al. (2019), *JAMA Pediatrics* 173(3):244–250, cohorte de 2.441 díadas.** Más pantalla a los 24 y 36 meses predijo peores puntajes ASQ-3 a los 36 y 60 meses. La relación inversa no apareció. Los efectos son chicos y el desarrollo se midió por reporte materno.

**Lectura crítica:**

- El ingrediente activo es la conversación con un adulto. La pantalla compite con ella cuando la reemplaza (TV de fondo, adulto absorto en el celular).
- Ver juntos y conversar sobre lo que se ve mejora la experiencia.
- La SAP y la AAP exceptúan las videollamadas, porque hay interacción real.
- Que una app diga "educativa" en la tienda no significa que lo sea con evidencia.

| Tipo de experiencia | Valor potencial | Riesgo principal |
|---|---|---|
| Videollamada con familiares | Alto | Bajo |
| Contenido de calidad visto con un adulto (desde los 2 años) | Moderado | Bajo si es acotado |
| Crear (dibujar, programar, editar) | Moderado (escolares y adolescentes) | Depende de la plataforma |
| Videojuegos | Variable | Desplazamiento, compras dentro del juego |
| Reproducción automática o feed infinito | Bajo | Sueño, desplazamiento, contenido inadecuado |
| TV de fondo | Negativo | Interrumpe el juego y la conversación |

---

## 06 · Regulación emocional y comportamiento

**Evidencia: Radesky et al. (2022), *JAMA Pediatrics*.** Cohorte de 422 díadas con chicos de 3 a 5 años; muestra de conveniencia de habla inglesa en EE. UU.

- Usar más el dispositivo para calmar se asoció con más reactividad emocional, y al revés.
- En varones, la asociación uso → reactividad fue r = 0,20.
- En chicos con temperamento de alta "surgencia" (intensos, impulsivos), la relación fue bidireccional (0,11 y 0,13).
- Las funciones ejecutivas solo se asociaron en la medición inicial.

**Interpretación (hipótesis, confianza baja-moderada).** El dispositivo calma rápido, y eso refuerza que el adulto lo use. Si se vuelve la única estrategia, el chico practica menos otras formas de regularse. Pero el chico más reactivo también lleva a usar más el dispositivo. La AAP 2026 incluye esta preocupación entre sus 5 C: Calm, es decir, si los medios se usan para calmar.

**Señales para consultar** (orientativas, no diagnósticas):

- Rabietas muy frecuentes o prolongadas, o con autolesiones o agresión.
- Dificultades en varios ámbitos a la vez.
- Regresiones.
- Cambios bruscos de sueño o apetito.
- En adolescentes, aislamiento, desesperanza o ideas de autolesión. Esto requiere derivación urgente.

**Estrategias con respaldo** (los componentes comunes de los programas de crianza evaluados):

- Elogio específico.
- Rutinas predecibles.
- Anticipar las transiciones.
- Pocos límites, claros y consistentes.
- Consecuencias breves y no humillantes.
- Juego dirigido por el chico.
- Validar la emoción ("estás enojado porque se terminó").
- Coordinación entre cuidadores.

**Lenguaje:** nada de "caprichoso", "malcriado" ni "adicto". La AAP 2026 pide no alimentar la culpa parental y señalar el diseño orientado al enganche.

---

## 07 · Desarrollo social y relaciones

- **Primera infancia.** El aprendizaje social es cara a cara. El celular del adulto durante las rutinas se asocia con peores resultados psicosociales (Mallawaarachchi et al., 2024). Es un factor modificable: la propuesta son "momentos protegidos", no la culpa.
- **Escolares y adolescentes.** Lo digital puede sostener vínculos; el Surgeon General 2023 reconoce beneficios para jóvenes LGBTQ. Los riesgos son el contacto no deseado, el ciberacoso y la comparación social.
- **Posición del proyecto.** Preguntar qué vínculos facilita y cuáles desplaza la tecnología. Promover "terceros espacios" (plazas, bibliotecas, clubes), que la AAP 2026 pide financiar.

---

## 08 · Sueño, salud y hábitos

**Horas de sueño recomendadas (OMS 2019):**

| Edad | Horas diarias |
|---|---|
| 0–3 meses | 14–17 |
| 4–11 meses | 12–16 |
| 1–2 años | 11–14 |
| 3–4 años | 10–13 |

Para edades mayores, las guías canadienses de 24 horas proponen 9 a 11 horas (5 a 13 años) y 8 a 10 horas (14 a 17 años).

- **Carter et al. (2016), *JAMA Pediatrics* 170(12):1202–1208.** Metaanálisis de 20 estudios con 125.198 chicos (edad media 14,5 años). Usar dispositivos a la hora de dormir se asoció con dormir menos, dormir peor y tener somnolencia de día. Incluso tenerlos disponibles sin usarlos se asoció con peores resultados. Confianza moderada; la recomendación práctica cuesta poco y tiene bajo riesgo.
- **SAP:** nada de pantallas en la hora previa a dormir; sin dispositivos en el dormitorio; zonas libres de pantallas en la casa; comidas sin pantallas.
- **Interacciones.** Dormir poco aumenta la irritabilidad, empeora la atención y genera más conflictos, incluidos los conflictos por las pantallas. Conviene revisar el sueño antes de atribuirles una conducta a los dispositivos.

---

## 09 · Entorno familiar y crianza

**Programas de crianza:**

- **Incredible Years.**
  - Menting et al. (2013) lo califican como intervención "bien establecida".
  - En un metaanálisis con datos individuales de 14 ensayos europeos (n = 1.799), mejoró la conducta disruptiva y los síntomas de TDAH.
  - No mejoró los problemas emocionales ni la salud mental de los padres.
  - No amplió las desigualdades sociales.
- **Triple P.**
  - Los metaanálisis muestran efectos de pequeños a moderados (Nowak y Heinrichs, 2008; Sanders et al., 2014: 101 estudios).
  - Wilson et al. (2012) encontraron que 32 de 33 estudios tenían autores vinculados al programa.
  - Los padres varones y los observadores independientes no reportaban mejoras significativas.
  - Lección: la etiqueta "basado en evidencia" no reemplaza una evaluación independiente.

**Contexto familiar.** Pesan el tiempo, el trabajo, la vivienda, el acceso a plazas, la salud mental de los padres y las diferencias entre cuidadores. La AAP 2026 da ejemplos: un barrio inseguro, o una pantalla que le da al adulto 15 minutos para cocinar.

**Diseño:** cada recomendación tiene que tener una versión "con poco tiempo, sin materiales y en un espacio chico".

**Pantallas como premio o castigo:** no hay evidencia sólida en ningún sentido. Se etiqueta como [Opinión profesional].

---

## 10 · Prevención por edades

| Etapa | Prioridades | Pantallas (recomendación oficial) | Señales para consultar |
|---|---|---|---|
| 0–2 años | Piso, conversación, rutinas de sueño, exploración | OMS: ninguna antes del año. SAP: desaconsejadas hasta los 2, salvo videollamadas; entre los 18 y 24 meses, solo acompañadas | Pérdida de habilidades; no responde a su nombre, no señala ni balbucea a la edad esperada |
| 3–5 años | Juego simbólico, lenguaje, esperar y respetar turnos, 180 min de movimiento | Máximo 1 h, contenido de calidad y acompañado. Sin pantallas en las comidas ni antes de dormir | Lenguaje muy por debajo de lo esperado, rabietas extremas persistentes |
| 6–8 años | Lectura, juego reglado, aprender a perder | AAP 2026: aplicar las 5 C. UNICEF Argentina, citando a la SAP: hasta 1,5 h entre los 5 y 7 años | Dificultades de aprendizaje o de atención persistentes |
| 9–11 años | Autonomía gradual, acuerdos escritos, alfabetización digital | Postergar el celular propio y las redes es una decisión familiar razonable | Cambios bruscos, retraimiento, acoso |
| 12–17 años | Sueño (dispositivos fuera del dormitorio), vínculos, privacidad, acuerdos hechos en conjunto | 5 C y Plan de Medios Familiar | Insomnio, aislamiento, autolesiones (urgente) |

**Sistema preventivo (propuesta):** la familia elige 1 o 2 objetivos, recibe 3 pasos graduales y revisa a las 2 semanas. No hay puntajes de riesgo.

"Ninguna pantalla antes de los 2 años" es una recomendación oficial. "Ningún celular antes de los 14" es una preferencia de grupos de opinión, no una guía oficial.

---

## 11 · Abordaje de dificultades: fichas A–I

Son orientaciones generales, no protocolos clínicos. Un pediatra y un psicólogo infantil deben revisarlas antes de publicarlas.

**Reglas comunes a todas las fichas:**

- **Información a reunir:** en qué momentos pasa, desde cuándo, cómo duerme el chico, qué se probó antes y qué recursos hay.
- **Factores que influyen:** vivienda, trabajo, salud mental de los padres, hermanos, escuela, temperamento.
- **Indicadores de progreso:** registro voluntario y anónimo, comparado con el punto de partida.
- **Nunca:** castigo físico, humillaciones ni amenazas.

### Ficha A · Bebé que pasa mucho tiempo con videos

- Explicaciones posibles: cansancio, falta de un espacio seguro en el piso, desconocimiento de las pautas.
- Respaldo: OMS 2019; la TV de fondo se asocia con peores resultados cognitivos.
- En casa: una manta como "estación de piso"; tummy time corto varias veces al día; contarle en voz alta lo que el adulto hace; objetos seguros de la cocina.
- Evitar: TV de fondo todo el día; usar pantallas para dormirlo.
- Objetivo: reemplazar uno o dos momentos de video.
- Consultar si: no sostiene la cabeza, no hace contacto visual o pierde habilidades.
- La plataforma ofrece: guía de 0 a 12 meses y actividades de 5 minutos. No debe: evaluar el desarrollo.

### Ficha B · Necesita la pantalla para calmarse

- Explicaciones posibles: alivio inmediato que refuerza el hábito; temperamento intenso; hambre o sueño; estar en un lugar público.
- Respaldo: Radesky 2022 y los componentes de los programas de crianza.
- En casa: una "caja de calma" sin pantalla; respirar "soplando velas"; ponerle nombre a la emoción; acompañar en silencio; reducir el celular de a poco.
- Evitar: sacar la pantalla en plena crisis como castigo; gritar.
- Objetivo: usar otra estrategia en algunas situaciones.
- Consultar si: hay rabietas extremas o retroceso del lenguaje.
- La plataforma ofrece: guía "acompañar el enojo". No debe: diagnosticar.

### Ficha C · Reacción intensa al apagar

- Explicaciones posibles: contenido sin final (reproducción automática), cansancio, corte abrupto.
- Respaldo: anticipación y rutinas; la AAP 2026 señala la reproducción automática y el scroll infinito como diseño orientado al enganche.
- En casa: elegir contenidos con final (un episodio); avisar "faltan 5 minutos" y después "el último"; temporizador visible; una actividad puente; desactivar la reproducción automática.
- Evitar: apagar sin aviso; ceder después de la escalada.
- Objetivo: menos episodios en 2 a 4 semanas.
- Consultar si: las reacciones extremas aparecen en cualquier transición, no solo con pantallas, o hay agresión importante.
- La plataforma no debe: hablar de "adicción".

### Ficha D · Pocas actividades fuera de la pantalla

- Explicaciones posibles: falta de alternativas accesibles, inseguridad, cansancio de los adultos.
- Respaldo: desplazamiento (OMS); terceros espacios (AAP 2026).
- En casa: filtros "sin materiales, espacio chico, 10 minutos"; rotar los juguetes; plaza o biblioteca una vez por semana; partir de sus intereses.
- Evitar: listas largas; comparar con otras familias.
- Objetivo: 2 actividades nuevas por semana.
- Consultar si: también perdió el interés por la pantalla o está triste (ver ficha F).
- La plataforma no debe: reemplazar las políticas públicas de recreación.

### Ficha E · Evita las tareas que cuestan esfuerzo

- Explicaciones posibles: fracasos previos, posible dificultad de aprendizaje, sueño insuficiente, ansiedad. El uso digital es solo una hipótesis más.
- Respaldo: elogiar el esfuerzo y la estrategia; dividir las tareas.
- En casa: "desafío de 5 minutos"; rompecabezas cada vez más difíciles; celebrar los intentos.
- Evitar: etiquetas como "vago".
- Consultar si: se mantiene y afecta la escuela; corresponde una evaluación psicopedagógica o pediátrica.
- La plataforma no debe: sugerir TDAH ni dislexia.

### Ficha F · Abandona actividades que antes le gustaban

- Explicaciones posibles: cambio normal de intereses, conflictos con los pares, acoso, ánimo bajo.
- En casa: conversar sin interrogar; mantener las rutinas compartidas.
- Evitar: minimizarlo o culpar al celular de entrada.
- Consultar si: hay tristeza por más de 2 semanas, aislamiento o cambios en el sueño o el apetito. Si hay ideas de autolesión, es urgente.
- La plataforma no debe: evaluar depresión.

### Ficha G · Conflictos familiares persistentes

- Explicaciones posibles: reglas poco claras, diferencias entre cuidadores, el ejemplo de los adultos, el diseño persuasivo.
- Respaldo: coherencia entre cuidadores; Plan de Medios Familiar de la AAP.
- En casa: una reunión familiar corta; un acuerdo escrito con pocas reglas que también valgan para los adultos; revisarlo cada mes.
- Evitar: reglas que cambian; desautorizarse entre adultos.
- Consultar si: hay violencia o el vínculo se deteriora.
- La plataforma no debe: mediar conflictos de pareja o de custodia.

### Ficha H · Adolescente con un uso que interfiere en su vida

- Explicaciones posibles: uso nocturno, presión de los pares, diseño persuasivo, ansiedad o ánimo bajo (que también aumentan el uso).
- Respaldo: dispositivos fuera del dormitorio (Carter 2016); autonomía progresiva; Surgeon General 2023.
- En casa: conversar sobre cómo lo hace sentir cada app; que proponga sus propias metas; herramientas de bienestar digital elegidas por el adolescente, no espionaje.
- Evitar: vigilancia encubierta; quitarle el teléfono como castigo general.
- Objetivo: recuperar horas de sueño.
- Consultar si: hay ánimo bajo, autolesiones, acoso o contacto con adultos desconocidos.
- La plataforma no debe: mostrarles a los padres lo que respondió el adolescente.

### Ficha I · La familia ya probó castigos y prohibiciones

- Explicaciones posibles: reglas imposibles de cumplir, falta de alternativas, escalada.
- Respaldo: los programas de crianza priorizan la atención positiva y las consecuencias breves y predecibles.
- En casa: pasar de "prohibido" a acordar cuándo, dónde y qué; un cambio por vez.
- Objetivo: sostener una regla durante un mes.
- Consultar si: los adultos se sienten desbordados; puede servir una consulta psicológica o un programa de crianza.
- La plataforma no debe: reemplazar un programa profesional.

---

## 12 · Banco inicial de actividades

**Campos de cada ficha de actividad:** nombre, edades, objetivo, duración, participantes, materiales, costo, espacio, clima, pasos, adaptaciones, variantes, seguridad, barreras, etiqueta de evidencia, revisor y fecha.

| Actividad | Edad | Objetivo | Materiales y duración | Seguridad | Evidencia |
|---|---|---|---|---|---|
| Panza al piso con espejo | 0–6 meses | Motricidad gruesa | Manta y espejo irrompible; 3–5 min varias veces al día | Despierto y supervisado | [Recomendación oficial] OMS |
| Canasta de tesoros | 6–18 meses | Exploración sensorial | Objetos seguros de cocina; 10 min | Nada que pase por un tubo de papel higiénico | [Propuesta] |
| Contar lo cotidiano | 0–3 años | Lenguaje | Ninguno | — | [Asociación] |
| Circuito en el living | 2–6 años | Equilibrio | Almohadones y cinta; 15 min | Despejar las esquinas | [Recomendación oficial] OMS |
| Semáforo de la calma | 3–6 años | Regulación | Papel; 5 min | — | [Propuesta] |
| Dado y turnos | 3–7 años | Esperar | Un dado; 15 min | — | [Propuesta] |
| Leer con preguntas | 2–8 años | Lenguaje y vínculo | Libro de biblioteca; 10 min | — | [Evidencia amplia, no revisada en esta sesión] |
| Cocina sin fuego | 4–10 años | Autonomía | Ingredientes; 20 min | Sin cuchillos filosos | [Propuesta] |
| Búsqueda del tesoro en la plaza | 4–11 años | Exploración | Lista dibujada; 30 min | Supervisión | [Propuesta] |
| ¿Flota o se hunde? | 4–9 años | Pensamiento científico | Recipiente con agua; 15 min | Supervisión con agua | [Propuesta] |
| Naipes y memotest | 6–12 años | Aprender a perder | Mazo; 20 min | — | [Propuesta] |
| Desafío de equilibrio | 6–11 años | Coordinación | Pelota; 10 min | Superficie segura | [Propuesta] |
| Video familiar | 9–17 años | Crear en vez de consumir | Celular; 1 h | No publicar la cara de terceros | [Propuesta] |
| Caminata o bici con charla | 12–17 años | Vínculo y actividad | 30 min | Casco | [Recomendación oficial] OMS 2020 |

**Cómo crece el banco:** un editor carga la actividad, la revisa un profesional (pediatra, terapista ocupacional o psicomotricista), se publica con fecha y se revisa una vez por año. Meta del MVP: entre 80 y 120 actividades.

---

## 13 · Orientación personalizada

**Cuestionario voluntario** (máximo 6 preguntas, sin datos identificatorios): rango de edad del chico; uno o dos objetivos; tiempo disponible; espacio; presupuesto; intereses.

**Qué no se pregunta:** diagnósticos, medicación, detalle de conductas, nombre, escuela, fotos.

**Por qué.** La Ley 25.326:

- Considera dato sensible la información referente a la salud (art. 2).
- Establece que ninguna persona puede ser obligada a proporcionar datos sensibles (art. 7.1).
- Prohíbe formar registros que directa o indirectamente revelen datos sensibles (art. 7.3).
- En el art. 8, reserva los datos de salud a los establecimientos y profesionales de la salud.

**Instrumentos validados.** ASQ-3, M-CHAT-R/F y PRUNAPE (la prueba nacional de pesquisa) se usan solo con un profesional. La plataforma no los administra. Las condiciones de licencia quedan pendientes de verificación.

---

## 14 · Soluciones existentes (preliminar, sin verificación primaria)

| Solución | Modelo | Fortaleza | Limitación | Qué tomar |
|---|---|---|---|---|
| AAP Family Media Plan / 5 C | Gratuito | Respaldo de la AAP, no culpabiliza | Contexto de EE. UU. | Plantilla de acuerdos |
| CDC "Learn the Signs. Act Early." | Gratuito, público | Hitos revisados en 2022 | No reemplaza la pesquisa | Lenguaje de "cuándo consultar" |
| Vroom | Gratuito | Consejos breves y diarios | Efectividad no verificada | Formato de consejo del día |
| Common Sense Media | ONG | Reseñas de contenido por edad | Centrado en EE. UU. | Etiquetas de contenido |
| Kinedu / BabySparks | Freemium o pago | Actividades de 0 a 3 años | Muro de pago | Formato de ficha |
| Family Link / Qustodio | Control parental | Límites técnicos | Riesgo de vigilancia | Solo como información |
| Triple P Online | Licenciado | Probado en ensayos | Costo, posible conflicto de interés | Componentes de crianza |
| Internet Matters | ONG del Reino Unido | Guías por plataforma | Contexto británico | Guías por app |
| UNICEF Argentina, SAP, Ministerio de Salud | Público | Contexto local | Disperso, en PDF | Fuente de contenidos |

**Cómo diferenciarse:** español rioplatense, actividades gratuitas, evidencia etiquetada, sin vigilancia, recursos de Mar del Plata.

---

## 15 · Investigación de usuarios

**Muestra:** 8 a 12 familias con distintas edades de hijos y distintos niveles socioeconómicos; 3 a 5 docentes; 2 a 4 profesionales; una encuesta anónima.

**Guía de entrevista para familias:**

1. Contame cómo es un día típico.
2. ¿Qué momentos son más difíciles y qué hacés en ellos?
3. ¿Qué te gustaría saber que hoy no sabés dónde buscar?
4. ¿Dónde te informás y en qué confiás?
5. ¿Qué probaste y qué funcionó?
6. ¿Qué te impide hacer más actividades?
7. ¿Cómo usan los dispositivos los adultos y los chicos en tu casa?
8. ¿Qué tendría que tener una web gratuita para que la uses? ¿Qué te daría desconfianza?
9. ¿Usarías un asistente con IA? ¿Qué te preocuparía?

**Ética:**

- Consentimiento escrito, anonimato y aval de la escuela.
- No entrevistar a menores en esta etapa.
- Si más adelante se incluye a adolescentes, hacen falta autorización de la escuela, consentimiento de los padres, asentimiento del propio adolescente y supervisión. Esto respeta su derecho a opinar conforme a su madurez y desarrollo (Ley 26.061, art. 24).
- No inventar testimonios.

---

## 16–17 · Requisitos, roles y permisos

**Roles:** Visitante, Familia, Profesional verificado, Editor científico, Moderador (fase 3) y Administrador.

| Recurso | Visitante | Familia | Profesional | Editor | Admin |
|---|---|---|---|---|---|
| Leer contenidos | Sí | Sí | Sí | Sí | Sí |
| Favoritos y objetivos | No | Solo los propios | Solo los propios | No | No |
| Registro voluntario | No | Solo el propio | No | No | Sin acceso |
| Proponer contenido | No | No | Borrador | Crear y editar | Publicar (auditado) |
| Verificar profesionales | No | No | Solicitar | No | Sí (auditado) |
| Datos de otras familias | No | No | Nunca | Nunca | Solo agregados |
| Gestionar roles | No | No | No | No | Sí (auditado) |

**Control de acceso en el backend:**

- Row Level Security de PostgreSQL en todas las tablas (por ejemplo, `user_id = auth.uid()`).
- Los roles se guardan en una tabla que solo controla el administrador, nunca en metadatos que el cliente pueda editar.
- La clave de servicio solo se usa en el servidor.
- Un `audit_log` de solo inserción registra publicaciones, verificaciones, cambios de rol y borrados.

**Verificación profesional:**

- Para profesiones de la salud se usa el Buscador Nacional de Profesionales de la Salud (REFEPS/SISA, Ministerio de Salud). Reúne lo que informan los colegios y ministerios de todo el país y permite buscar por DNI, matrícula o nombre.
- La matrícula habilita el ejercicio de la profesión dentro del territorio de la jurisdicción que la emite.
- Para las profesiones que no figuran ahí, se verifica con el colegio o consejo provincial (pendiente).
- El rol profesional no da acceso a datos familiares.

---

## 18 · Inteligencia artificial

| Función | ¿Necesita un modelo generativo? | Decisión |
|---|---|---|
| D. Buscador | No: búsqueda de texto completo en Postgres | MVP sin IA |
| B. Recomendador de actividades | No: filtros y reglas | MVP sin IA |
| E. Derivación profesional | No: reglas fijas y palabras de riesgo | MVP con reglas |
| A. Asistente de orientación (RAG) | Sí | Fase 2, piloto controlado |
| C. Generador de planes | Primero plantillas | Fase 2 |

**Cómo funcionaría el RAG en la fase 2:**

1. Solo se indexa contenido publicado y revisado, guardado en pgvector.
2. Para cada pregunta se recuperan los fragmentos más relevantes.
3. El modelo responde solo con esos fragmentos y cita la ficha con su enlace.
4. Si no hay un fragmento relevante, responde "no tengo información revisada sobre esto".
5. Antes del modelo, un filtro de riesgo (autolesión, violencia, abuso, emergencia) muestra directamente los recursos de ayuda; esos mensajes no pasan por el modelo.
6. No da diagnósticos ni dosis.
7. Las conversaciones no se guardan por defecto.

**Costos (octubre de 2026):**

- La página oficial de precios de Gemini indica US$3,75 por millón de tokens de salida para Gemini 3.8 Flash hasta el 31/12/2026, y US$7,50 desde el 1/1/2027.
- Fuentes secundarias indican US$0,75 por millón de tokens de entrada.
- Los embeddings de búsqueda de archivos cuestan US$0,15 por millón.
- Estimación propia: una consulta de 3.000 tokens de entrada y 500 de salida costaría unos US$0,004 en 2026 y US$0,008 en 2027. Con 10.000 consultas por mes, serían entre US$40 y US$85.
- Hay un nivel gratuito con límites. Antes de enviar textos de familias, hay que verificar en los términos si el proveedor puede usar los datos del nivel gratuito; si no hay garantía, usar el nivel pago.
- Alternativas: modelos abiertos autoalojados.
- Controles de gasto: límite diario por usuario, caché y tope mensual.

**Evaluación antes del lanzamiento.** Un banco de 100 preguntas (20 de ellas de riesgo) revisado por un profesional. Umbral: ninguna respuesta peligrosa y al menos 90% de fidelidad a la fuente.

---

## 19 · Privacidad, ética y legislación

**Normas vigentes:**

- **Ley 25.326 (2000), vigente.** Consentimiento libre, expreso e informado (art. 5). La salud es un dato sensible (arts. 2 y 7). Seguridad y confidencialidad (art. 9) y deber de secreto (art. 10). La Res. AAIP 47/2018 aprueba medidas de seguridad recomendadas: control de acceso, respaldos, incidentes, vulnerabilidades y entornos de desarrollo.
- **Res. AAIP 4/2019, criterio 5.** Por la autonomía progresiva (arts. 26 y 639 del CCyC), el menor puede consentir según su desarrollo. Si no tiene capacidad suficiente, consiente quien ejerce la responsabilidad parental. El responsable debe hacer esfuerzos razonables para verificarlo.
- **Código Civil y Comercial (Ley 26.994), arts. 25 y 26.** Adolescente es quien cumplió 13 años. Con edad y grado de madurez suficiente, el menor ejerce por sí los actos que la ley le permite, y tiene derecho a ser oído y a participar en las decisiones sobre su persona. Entre los 13 y los 16 años se presume que puede decidir sobre tratamientos no invasivos. Desde los 16 se lo considera adulto para el cuidado de su propio cuerpo.
- **Ley 26.061 (2005).** Art. 10: vida privada e intimidad familiar. Art. 22: prohíbe difundir datos o imágenes que identifiquen a niños y lesionen su dignidad. Art. 24: derecho a opinar.
- **Reformas en trámite.** 1751-D-2026 (Martín Yeza): 72 artículos, deroga la Ley 25.326. 3397-D-2026 (Agustín Rossi, presentado el 16/07/2026): reproduce el proyecto del Poder Ejecutivo de 2023 y fija en 16 años la edad para que un adolescente consienta solo el tratamiento de sus datos. Se informaron otros proyectos de Pablo Carro y Martín Doñate. Al 26/09/2026 ninguno tenía dictamen. Todos incorporan privacidad desde el diseño y por defecto; conviene aplicarla desde ya.

**Consecuencias para el diseño:**

1. Sin datos de salud ni de conducta de un chico identificable: solo rango de edad y un apodo opcional.
2. El seguimiento (fase 2) se guarda en el dispositivo, o en el servidor sin texto libre sobre dificultades. Requiere dictamen legal.
3. Las cuentas son solo para mayores de 18. El contenido para adolescentes es público y no pide cuenta.
4. Exportar y borrar la cuenta en un clic; el borrado se completa en 30 días, respaldos incluidos.
5. Sin publicidad ni rastreadores. La AAP 2026 pide evitar la vigilancia y la publicidad dirigida a chicos.
6. Un plan de incidentes de seguridad (AAIP 47/2018).
7. Políticas escritas en lenguaje claro y revisadas por un abogado (pendiente).
8. Se posponen la comunidad, la mensajería con profesionales y el historial de IA.

---

## 20 · Sostenibilidad y costos

| Rubro | Etapa escolar | Piloto (hasta ~20.000 usuarios) |
|---|---|---|
| Hosting | Vercel Hobby, US$0. Solo uso personal y no comercial: confirmar si califica | Vercel Pro, US$20 por mes |
| Base de datos y autenticación | Supabase Free, US$0: 500 MB, 50.000 usuarios activos por mes, 1 GB de archivos, 5 GB de egreso. Se pausa tras 7 días sin actividad y no tiene backups | Supabase Pro, US$25 por mes: 8 GB, 100.000 usuarios activos, backups diarios |
| IA | US$0 | Entre US$40 y US$85 por mes cada 10.000 consultas (estimado) |
| Dominio | Entre US$10 y US$15 por año | Igual |
| Revisión científica | Voluntaria o por convenio | El costo principal: tiempo de profesionales |

**Modelo de financiamiento:** convenio con una universidad o un colegio profesional de Mar del Plata para revisar contenidos, más convocatorias de innovación social y donaciones transparentes.

**Descartado:** vender datos, publicidad dirigida y muros de pago.

---

## 21 · Arquitectura técnica

- **Frontend (lo que ve el usuario).** Next.js, recomendado porque la biblioteca tiene que aparecer en los buscadores. Alternativa: React con Vite. Funcionaría como PWA, para leer fichas sin conexión.
- **Backend (la lógica protegida).** Supabase: autenticación, API generada y Edge Functions para todo lo que use claves secretas.
- **Base de datos.** PostgreSQL con RLS; en la fase 2 se suma pgvector. Los contenidos pasan por los estados borrador, revisión y publicado, con versiones.
- **Seguridad:** el cliente solo tiene la clave anónima; tests de las políticas de RLS; doble factor (MFA) para administradores y editores; límite de solicitudes; un respaldo semanal cifrado (pg_dump), porque el plan gratuito no incluye backups.
- **Modelo de datos del MVP:** `profiles`; `content` (tipo, edad mínima, edad máxima, etiqueta de evidencia, estado, revisor, fecha de revisión); `activities` (costo, espacio, duración, materiales); `tags`; `favorites`; `goals` (rango de edad, código de objetivo); `professional_requests` (matrícula, jurisdicción, estado); `audit_log`.

---

## 22 · Experiencia de usuario

**Mapa del sitio:** Inicio ("¿Qué edad tiene?") → Etapas → Situaciones difíciles (A–I) → Actividades (filtros por edad, tiempo, espacio, costo y clima) → ¿Cuándo consultar? → Recursos locales → Sobre la evidencia → Cuenta (opcional).

**Principios:** voseo y lenguaje claro; fichas que entren en una pantalla; opción de audio; accesibilidad WCAG 2.2 AA; páginas livianas; un tono que no culpe a los padres ni trate al chico como un problema.

---

## 23 · Producto mínimo viable

| Función | Etapa | Criterio de aceptación |
|---|---|---|
| Biblioteca por edad | 1 | 5 etapas, con al menos 4 artículos revisados en cada una |
| Fichas A–I | 1 | Revisadas por un profesional |
| Actividades con filtros | 1 | Al menos 80, con respuesta en menos de 1 segundo |
| Cuándo consultar y recursos | 1 | Recursos verificados y con fecha |
| Panel de edición con auditoría | 1 | Circuito borrador, revisión y publicado |
| Cuentas y favoritos | 1 (opcional) | Borrado de cuenta funcionando |
| Objetivos y seguimiento local | 2 | Sin datos sensibles en el servidor |
| Asistente RAG | 2 | Cumple los umbrales de la sección 18 |
| Directorio profesional | 2–3 | Verificación por REFEPS o colegio |
| Comunidad | Descartada | Riesgo de que los padres diagnostiquen y de exponer a menores |
| Control parental propio | Descartado | Ya existe y conlleva riesgo de vigilancia |

---

## 24 · Evaluación de impacto

**Qué se puede medir en el proyecto escolar:**

- **Usabilidad:** 5 a 8 usuarios por ronda, con tareas concretas, tasa de éxito y la escala SUS.
- **Conocimientos:** un cuestionario de 10 preguntas antes y después.
- **Utilidad percibida:** una encuesta a las 2 semanas.
- **Calidad de la IA:** el banco de prueba de la sección 18.

**Qué no se puede medir:** el efecto sobre el desarrollo. Haría falta un ensayo con comité de ética, así que la plataforma no debe afirmar que mejora el desarrollo.

---

## 25 · Plan de desarrollo con Claude Code

**Orden de implementación:**

1. Next.js con Supabase, tablas con RLS y tests de las políticas.
2. Lectura pública con filtros.
3. Panel de edición con auditoría.
4. Cuentas opcionales, favoritos y borrado.
5. Reglas de "cuándo consultar".
6. PWA y accesibilidad.
7. Pruebas de usabilidad.
8. Fase 2: RAG.

**Pruebas críticas:** una familia no puede ver los datos de otra; un profesional no ve datos de familias; un editor no puede cambiar roles; no hay claves secretas en el código del cliente; borrar una cuenta elimina todos sus datos.

---

## 26 · Riesgos y decisiones pendientes

| Riesgo | Mitigación |
|---|---|
| Presentar asociaciones como causas | Etiquetas de evidencia obligatorias |
| Contenido que suene a diagnóstico | Revisión profesional |
| Datos de salud de menores | Minimización, seguimiento local y dictamen legal |
| Respuestas peligrosas de la IA | IA fuera del MVP y filtro de riesgo sin modelo |
| Pausa del plan gratuito y falta de backups | Backups propios |
| Culpabilizar a las familias | Tono basado en fortalezas (AAP 2026) |

**Decisiones pendientes antes de programar:**

1. Next.js o Vite.
2. Si el MVP tendrá cuentas.
3. Qué institución revisa los contenidos.
4. La consulta legal.
5. Nombre y dominio.
6. Recursos locales de ayuda (líneas 102, 137 y 135; salud mental en Mar del Plata): verificar que estén vigentes.

---

## 27 · Bibliografía anotada

1. **OMS (2019).** *Guidelines on physical activity, sedentary behaviour and sleep for children under 5 years of age* (NCBI Bookshelf NBK541173). Guía oficial, 0–4 años; los 180 min surgen de consenso. Confianza alta.
2. **OMS (2020).** Guías de actividad física, 5–17 años (IJBNPA, doi 10.1186/s12966-020-01037-z). 60 min diarios en promedio. Confianza alta.
3. **Munzer T, Parga-Belinkie J, Matile Milkovich L, et al.; AAP (2026).** "Digital Ecosystems, Children, and Adolescents", *Pediatrics* 157(2):e2025075320. Reemplaza las declaraciones de 2016; 5 C; contra la vigilancia y la publicidad dirigida. No se leyó el texto completo.
4. **SAP (2023).** *Guía de uso de pantallas para las familias*. Recomendación oficial argentina.
5. **Madigan S, Browne D, Racine N, Mori C, Tough S (2019).** *JAMA Pediatrics* 173(3):244–250 (doi 10.1001/jamapediatrics.2018.5056). Cohorte, n = 2.441. Confianza moderada.
6. **Madigan S, McArthur BA, Anhorn C, Eirich R, Christakis DA (2020).** *JAMA Pediatrics* 174(7):665–675 (doi 10.1001/jamapediatrics.2020.0327). Metaanálisis sobre lenguaje. Confianza moderada.
7. **Mallawaarachchi S, et al. (2024).** *JAMA Pediatrics* 178(10):1017–1026 (doi 10.1001/jamapediatrics.2024.2620). 100 estudios, alto riesgo de sesgo. Confianza moderada.
8. **Radesky JS, Kaciroti N, Weeks HM, Schaller A, Miller AL (2022).** *JAMA Pediatrics* (doi 10.1001/jamapediatrics.2022.4793; PMC9857453). Cohorte, n = 422. Confianza baja a moderada.
9. **Bakht et al. (2025).** *Pediatric Discovery* (doi 10.1002/pdi3.70002). Revisión sobre motricidad. Confianza baja a moderada.
10. **Carter B, Rees P, Hale L, Bhattacharjee D, Paradkar MS (2016).** *JAMA Pediatrics* 170(12):1202–1208. Metaanálisis sobre sueño. Confianza moderada.
11. **Orben A, Przybylski AK (2019).** *Nature Human Behaviour* 3:173–182 (doi 10.1038/s41562-018-0506-1). Como máximo 0,4% de la varianza; datos transversales. Confianza moderada.
12. **U.S. Surgeon General (2023).** *Social Media and Youth Mental Health*. Aviso de precaución basado en estudios observacionales.
13. **Menting ATA, de Castro BO, Matthys W (2013).** *Clinical Psychology Review* 33. Metaanálisis de Incredible Years. Confianza alta.
14. **Wilson P, et al. (2012).** *BMC Medicine* 10:130. Revisión crítica de Triple P.
15. **Leijten P, Gardner F, et al. (2017).** Datos individuales de Incredible Years (n = 1.799).
16. **UNICEF Argentina y UNESCO (2025).** *Kids Online Argentina*; comunicado de UNICEF del 13/08/2026. 95% con celular propio; primer dispositivo entre los 9 y 10 años (9,6 según una especialista de UNICEF en la prensa).
17. **Archivos Argentinos de Pediatría (2019) 117(5).** "Pantallas: discordancias entre las recomendaciones y el uso real".
18. **Normas.** Ley 25.326; Res. AAIP 47/2018 y 4/2019; Ley 26.061; Código Civil y Comercial, arts. 25 y 26; proyectos 1751-D-2026 y 3397-D-2026.

---

## 30 · Síntesis y propuesta

**Lo que tiene mejor respaldo:** pautas de 24 horas de la OMS; ninguna pantalla sedentaria antes del año; uso junto a un adulto; dispositivos fuera del dormitorio; programas de crianza positiva.

**Lo que sigue incierto:** la causalidad, los umbrales para escolares, los efectos de las redes según el subgrupo y los efectos de la IA en los chicos.

**Propuesta: *Crecer en Casa* (nombre provisorio; verificar que esté disponible).**

- **Propósito:** acompañar el desarrollo integral con información confiable y actividades posibles.
- **Público:** quienes crían chicos de 0 a 17 años en Argentina, con un piloto en Mar del Plata.
- **Propuesta de valor:** "Qué necesita tu hijo a esta edad, qué podés hacer hoy con lo que tenés y cuándo consultar". Gratis, sin vigilancia y con la evidencia a la vista.
- **Módulos del MVP:** biblioteca, fichas A–I, actividades, cuándo consultar y administración.
- **Tecnología:** Next.js, Supabase (con RLS) y Vercel; IA como RAG acotado en la fase 2.
- **Sostenibilidad:** convenio académico, subsidios y donaciones.
- **Hoja de ruta:** meses 1–2, contenidos y revisión; meses 3–4, desarrollo del MVP; mes 5, pruebas; mes 6, piloto; después, fase 2.

---

## Advertencias

- La AAP 2026 se leyó a través de resúmenes oficiales y secundarios, no del texto completo.
- La sección 14 no está verificada con fuentes primarias.
- Los precios de IA y de hosting cambian seguido; parte de los precios de entrada de Gemini viene de fuentes secundarias.
- Las fichas y las actividades necesitan revisión clínica antes de publicarse.
- Todo lo legal es orientativo y requiere el dictamen de un abogado.

## Documento de continuidad

**Estado:** la Sesión 1 está en versión 1 y la Sesión 2, en borrador.

**Pendientes:** PDF completo de la AAP 2026; búsqueda en Cochrane y LILACS; verificar las soluciones existentes; consulta legal; mapear los recursos de Mar del Plata; hacer las entrevistas; llegar a 80 actividades.

**Instrucción para Claude Code:** empezar por el paso 1 de la sección 25, sin IA ni comunidad.
