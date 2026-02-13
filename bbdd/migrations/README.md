# Migraciones SQL

Este proyecto todavia no usa un motor de migraciones automatizado.
Por ahora, las migraciones se gestionan con SQL versionado en esta carpeta.

## Convencion de nombres

- `NNN_descripcion.sql`
- Ejemplo: `001_baseline_schema.sql`

## Flujo recomendado

1. Crear nueva migracion SQL en esta carpeta.
2. Probar en entorno local.
3. Ejecutar en staging/produccion (Railway) en orden numerico.
4. Registrar en PR el resultado de ejecucion.

## Baseline actual

- Esquema base: `bbdd/database.sql`
- Datos de ejemplo: `bbdd/seed.sql`

Como siguiente paso de P1, se recomienda introducir una tabla `schema_migrations`
para llevar trazabilidad de versiones aplicadas.
