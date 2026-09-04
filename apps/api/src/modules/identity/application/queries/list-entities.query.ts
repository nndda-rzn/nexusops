import { db } from '@/shared/database/client'
import { organizations } from '@/shared/database/schema/identity'
import { eq } from 'drizzle-orm'

export interface ListEntitiesQuery {
  holdingOrgId: string
}

export async function listEntitiesQuery(query: ListEntitiesQuery) {
  return db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      entityType: organizations.entityType,
      status: organizations.status,
      createdAt: organizations.createdAt,
    })
    .from(organizations)
    .where(eq(organizations.parentOrgId, query.holdingOrgId))
}
