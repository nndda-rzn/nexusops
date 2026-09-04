import { db } from '@/shared/database/client'
import { orgModuleAccess } from '@/shared/database/schema/identity'
import { eq, and } from 'drizzle-orm'

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────

export interface GetEntityModulesQuery {
  orgId: string
}

// ─────────────────────────────────────────
// Handler
// ─────────────────────────────────────────

export async function getEntityModulesQuery(
  query: GetEntityModulesQuery
): Promise<string[]> {
  const rows = await db
    .select({ moduleKey: orgModuleAccess.moduleKey })
    .from(orgModuleAccess)
    .where(and(
      eq(orgModuleAccess.orgId, query.orgId),
      eq(orgModuleAccess.enabled, true),
    ))

  return rows.map(r => r.moduleKey)
}
