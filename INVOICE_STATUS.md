# Invoice Generation Status

## Critical Issue: costoPorUnidad Reading Problem

### Problem
Drizzle ORM cannot read `decimal` fields from MySQL/TiDB correctly - always returns `null` even though database has correct values.

### Verified Facts
1. ✅ Database has correct costs: `SELECT id, costo_por_unidad FROM anuncios WHERE id=210098` returns `350.00`
2. ✅ Raw SQL with manual query works: `db.execute("SELECT ... WHERE id IN (210001,210002)")` returns data
3. ❌ Drizzle ORM `.select()` returns `costoPorUnidad: null`
4. ❌ Drizzle with `sql` template returns `costoPorUnidad: null`
5. ❌ Drizzle with `CAST(costoPorUnidad AS CHAR)` returns `null`

### Attempted Solutions
1. Changed from `.select({...})` to `.select()` - FAILED
2. Used `sql` template with `IN ${array}` - FAILED (syntax error)
3. Used `CAST(field AS CHAR)` - FAILED (still null)
4. Used raw SQL with manual string interpolation - NOT YET TESTED (code not reloading)

### Current State
- 103 OPIOIDES ads in database (73 Fijo @ $350, 30 Bonificación @ $0)
- Invoice generator skips all ads because cost=0
- Frontend shows "Total estimado: $350" (should be $25,550)
- PDF has no line items

### Next Steps
1. Force server reload to test raw SQL approach
2. If raw SQL fails, consider changing schema from `decimal` to `varchar`
3. Add invoice modal fields (production cost, other services, salesperson)
4. Fix frontend total calculation
5. Change PDF to download instead of open
6. Fix ID column to show cobertizoId
7. Change "Renovada" to "Lista" in paradas

## Database Schema Issue

The `costo_por_unidad` field is defined as:
```typescript
costoPorUnidad: decimal("costo_por_unidad", { precision: 10, scale: 2 })
```

This may need to be changed to:
```typescript
costoPorUnidad: varchar("costo_por_unidad", { length: 20 })
```

And store as string "350.00" instead of decimal.
