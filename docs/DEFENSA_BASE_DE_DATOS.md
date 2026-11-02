# Por qué PostgreSQL y no MySQL

La consigna pide una base de datos relacional "del tipo MySQL". Crecer en Casa usa **PostgreSQL**,
otra base relacional de código abierto, con las mismas tablas, claves foráneas, SQL y transacciones.
La elección se hizo por una medida de seguridad que MySQL no tiene y que el proyecto necesita.

## En una frase

> Guardamos datos de chicos y familias. En PostgreSQL, **la base misma decide qué filas puede ver
> cada persona** (seguridad por filas, _Row-Level Security_). MySQL no tiene esa función: ahí la
> protección dependería solo del código de la API, y un error en ese código expondría los datos.

## 1. La razón principal: seguridad por filas (RLS)

En PostgreSQL cada tabla puede tener **políticas** que filtran las filas según quién consulta. Es una
función documentada del motor, que su manual llama _Row-Level Security_. MySQL tiene permisos por
tabla y por columna (`GRANT`), pero **no por fila**: para lograrlo hay que escribir vistas o filtrar en
cada consulta de la aplicación.

Ejemplo real del proyecto (`supabase/migrations/20261027000300_families_consents.sql`):

```sql
-- Solo los adultos de una familia ven a sus integrantes.
create policy members_select on public.family_members
  for select to authenticated using ((select public.is_family_adult(family_id)));

-- Solo el responsable principal o un responsable los modifica.
create policy members_update on public.family_members
  for update to authenticated
  using ((select public.is_family_adult(family_id, array['owner', 'guardian'])))
  with check ((select public.is_family_adult(family_id, array['owner', 'guardian'])));
```

**Qué cambia en la práctica:** si alguien modifica la app, o la API tiene un error y pide "todos los
integrantes", la base igual devuelve **solo los de su familia**. Con MySQL, ese mismo error devolvería
los de todas las familias.

Así se protege, por ejemplo:

- que una familia nunca vea a otra;
- que la Lic. Ríos vea a Sofi pero no a Tomi, porque la familia solo le dio permiso sobre Sofi;
- que la cuidadora (la abuela) vea el plan pero no las evaluaciones;
- que ningún rol de administración pueda leer conversaciones ni observaciones.

**Está probado:** el proyecto tiene **231 pruebas automáticas de permisos** sobre la base (pgTAP, en
`supabase/tests/`). Entran como cada tipo de usuario e intentan leer o modificar lo que no les
corresponde, y corren en cada cambio que se sube a GitHub.

## 2. Otras razones

| Necesidad del proyecto                                                | PostgreSQL                                                           | MySQL Community                                                                                        |
| --------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Permisos por fila (datos de chicos)                                   | Nativo (RLS)                                                         | No existe; hay que emularlo en la aplicación                                                           |
| Búsqueda del asistente por significado                                | Extensión `pgvector`, gratuita                                       | La función de distancia entre vectores (`DISTANCE()`) solo está en HeatWave, la versión paga de Oracle |
| Autenticación con JWT, 2FA y redes sociales integradas a los permisos | Supabase (gratuito) conecta el JWT de cada usuario con las políticas | Habría que programarlo aparte                                                                          |
| Reglas de integridad complejas                                        | Restricciones `check`, disparadores y funciones en SQL               | Similar, con menos tipos de datos (no tiene arreglos ni `jsonb` binario)                               |

## 3. Lo que la consigna busca, y está igual

El objetivo de pedir MySQL es trabajar con una **base relacional bien estructurada**. Eso se cumple
igual:

- **51 tablas** con claves primarias y foráneas, y relaciones uno a muchos y muchos a muchos (por
  ejemplo, profesionales ↔ especialidades).
- **Normalización hasta la tercera forma normal (3FN)**, con las excepciones justificadas en
  [`planning/DATABASE.md`](planning/DATABASE.md) §5.
- **SQL estándar:** `select`, `insert`, `update`, `delete`, `join` y transacciones, igual que en
  MySQL. Quien sabe MySQL lee estas tablas sin problema.
- **Migraciones versionadas** en `supabase/migrations/`: la base se crea desde cero con un comando.

## 4. Preguntas probables y respuestas cortas

**"¿Por qué no usaste MySQL como pedía la consigna?"**
Porque el proyecto guarda datos de menores y necesitábamos que la base misma bloquee el acceso
indebido. Esa función, la seguridad por filas, existe en PostgreSQL y no en MySQL. El resto de los
conceptos (tablas, relaciones, SQL) son los mismos.

**"¿No podías hacer lo mismo en MySQL con la API?"**
Se puede filtrar en cada consulta de la API, pero entonces la seguridad depende de no olvidarse de
filtrar nunca. Con RLS, aunque la API tenga un error, la base no entrega la fila. Son dos capas en
lugar de una: la API también verifica roles y permisos (middlewares), y la base lo vuelve a
verificar.

**"¿Cómo sé que funciona?"**
Con las 231 pruebas de permisos que corren en cada cambio. Por ejemplo, una prueba entra como una
persona ajena a la familia e intenta leer sus integrantes: la base devuelve cero filas
("Una persona ajena no ve integrantes", en `supabase/tests/03_families.test.sql`).

**"¿Es más difícil o más caro?"**
No. PostgreSQL es gratuito y de código abierto, igual que MySQL, y Supabase lo ofrece gratis para un
proyecto de este tamaño.

**"¿Sabés usar MySQL?"**
Sí: el SQL de este proyecto es el mismo que se usa en MySQL. La diferencia está en las funciones
avanzadas (seguridad por filas y búsqueda por vectores), que son justamente las que necesitábamos.

## Fuentes

- PostgreSQL, documentación oficial: _Row Security Policies_ (<https://www.postgresql.org/docs/current/ddl-rowsecurity.html>).
- MySQL 9.4, documentación oficial: _Vector Functions_. Allí dice que `DISTANCE()` "is available only
  for users of MySQL HeatWave on OCI and MySQL AI"
  (<https://dev.mysql.com/doc/refman/9.4/en/vector-functions.html>).
