import { pgSchema, pgTable, text, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { ulid } from 'ulid'

// ─────────────────────────────────────────
// Schema
// ─────────────────────────────────────────
export const identitySchema = pgSchema('identity')

// ─────────────────────────────────────────
// Enums
// ─────────────────────────────────────────
export const entityTypeEnum = pgEnum('entity_type', [
  'HOLDING',
  'MARITIME',
  'RAIL',
  'ROAD',
  'WAREHOUSE',
  'AVIATION',
])

export const orgStatusEnum = pgEnum('org_status', [
  'ACTIVE',
  'SUSPENDED',
  'INACTIVE',
])

export const userStatusEnum = pgEnum('user_status', [
  'ACTIVE',
  'INACTIVE',
  'SUSPENDED',
])

export const loginStatusEnum = pgEnum('login_status', [
  'SUCCESS',
  'FAILED',
])

// ─────────────────────────────────────────
// Tables
// ─────────────────────────────────────────

// Organizations
export const organizations = identitySchema.table('organizations', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  parentOrgId: text('parent_org_id'),
  hierarchyPath: text('hierarchy_path'),           // ltree stored as text
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  entityType: entityTypeEnum('entity_type').notNull(),
  status: orgStatusEnum('status').notNull().default('ACTIVE'),
  timezone: text('timezone').notNull().default('Asia/Jakarta'),
  currency: text('currency').notNull().default('IDR'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

// Users
export const users = identitySchema.table('users', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  mfaEnabled: boolean('mfa_enabled').notNull().default(false),
  mfaSecret: text('mfa_secret'),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  status: userStatusEnum('status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

// Roles
export const roles = identitySchema.table('roles', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  isSystem: boolean('is_system').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// Permissions
export const permissions = identitySchema.table('permissions', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  key: text('key').notNull().unique(),
  description: text('description'),
  module: text('module').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// Role Permissions
export const rolePermissions = identitySchema.table('role_permissions', {
  roleId: text('role_id').notNull(),
  permissionId: text('permission_id').notNull(),
})

// Org Members
export const orgMembers = identitySchema.table('org_members', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  userId: text('user_id').notNull(),
  roleId: text('role_id').notNull(),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  invitedBy: text('invited_by'),
})

// Org Module Access
export const orgModuleAccess = identitySchema.table('org_module_access', {
  orgId: text('org_id').notNull(),
  moduleKey: text('module_key').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
  grantedBy: text('granted_by').notNull(),
})

// Refresh Tokens
export const refreshTokens = identitySchema.table('refresh_tokens', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  userId: text('user_id').notNull(),
  orgId: text('org_id').notNull(),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
})

// Login History
export const loginHistory = identitySchema.table('login_history', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  userId: text('user_id'),
  orgId: text('org_id'),
  entityType: text('entity_type'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  status: loginStatusEnum('status').notNull(),
  attemptedAt: timestamp('attempted_at', { withTimezone: true }).notNull().defaultNow(),
})

// Entity Data Access (Tier 2 cross-entity visibility)
export const entityDataAccess = identitySchema.table('entity_data_access', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id').notNull(),
  ownerOrgId: text('owner_org_id').notNull(),
  granteeOrgId: text('grantee_org_id').notNull(),
  accessType: text('access_type').notNull().default('READ'),
  grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  grantedBy: text('granted_by').notNull(),
})
