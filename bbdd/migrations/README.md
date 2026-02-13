# Migraciones SQL (Baseline P1)

Este proyecto usa migraciones SQL manuales versionadas en esta carpeta.

## Orden de ejecucion

1. `000_schema_migrations.sql`
2. `001_core_schema.sql`
3. `002_reference_data.sql`
4. `003_seed_questions.sql` (opcional, solo si quieres preguntas demo)

## Entornos

- Produccion: ejecutar `000` + `001` + `002`. `003` solo si se desea contenido demo.
- Local nuevo: ejecutar `000` + `001` + `002` + `003`.

## Verificacion

```sql
USE quizquest_db;
SELECT version, description, applied_at
FROM schema_migrations
ORDER BY version;
```

## Notas

- Las migraciones son idempotentes (`IF NOT EXISTS`, `ON DUPLICATE KEY UPDATE`, `INSERT IGNORE`).
- Para cambios futuros: crear un nuevo archivo `NNN_descripcion.sql` y nunca editar una migracion ya aplicada en produccion.
