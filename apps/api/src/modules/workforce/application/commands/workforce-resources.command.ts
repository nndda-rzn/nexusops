import { shifts, crews, crewMembers, qualifications, certifications, availability } from '@/shared/database/schema/workforce'
import { generateId } from '@/shared/ids'
import type { DbContext } from '@/shared/database/client'

// ─── Shift ───

export interface CreateShiftCommand {
  orgId: string
  name: string
  startTime: string
  endTime: string
  durationHours: number
  breakDurationMinutes?: number | undefined
  shiftType: 'DAY' | 'EVENING' | 'NIGHT' | 'ROTATING'
}

export async function createShiftCommand(cmd: CreateShiftCommand, db: DbContext): Promise<{ id: string }> {
  const id = generateId()
  await db.insert(shifts).values({
    id, orgId: cmd.orgId, name: cmd.name,
    startTime: cmd.startTime, endTime: cmd.endTime,
    durationHours: cmd.durationHours,
    breakDurationMinutes: cmd.breakDurationMinutes ?? 0,
    shiftType: cmd.shiftType,
    createdAt: new Date(),
  })
  return { id }
}

// ─── Crew ───

export interface CreateCrewCommand {
  orgId: string
  name: string
  crewType: 'CRANE' | 'STEVEDORE' | 'GATE' | 'YARD' | 'WAREHOUSE' | 'RAIL' | 'ROAD'
  leaderId?: string | undefined
  shiftId?: string | undefined
}

export async function createCrewCommand(cmd: CreateCrewCommand, db: DbContext): Promise<{ id: string }> {
  const id = generateId()
  const now = new Date()
  await db.insert(crews).values({
    id, orgId: cmd.orgId, name: cmd.name,
    crewType: cmd.crewType, leaderId: cmd.leaderId,
    shiftId: cmd.shiftId, status: 'AVAILABLE',
    createdAt: now, updatedAt: now,
  })
  return { id }
}

export interface AddCrewMemberCommand {
  crewId: string
  employeeId: string
  role: string
}

export async function addCrewMemberCommand(cmd: AddCrewMemberCommand, db: DbContext): Promise<{ id: string }> {
  const id = generateId()
  await db.insert(crewMembers).values({
    id, crewId: cmd.crewId, employeeId: cmd.employeeId,
    role: cmd.role, joinedAt: new Date(),
  })
  return { id }
}

// ─── Qualification & Certification ───

export interface AddQualificationCommand {
  orgId: string
  employeeId: string
  qualificationType: string
  level: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'
  acquiredAt: string
  validUntil?: string | undefined
}

export async function addQualificationCommand(cmd: AddQualificationCommand, db: DbContext): Promise<{ id: string }> {
  const id = generateId()
  await db.insert(qualifications).values({
    id, orgId: cmd.orgId, employeeId: cmd.employeeId,
    qualificationType: cmd.qualificationType, level: cmd.level,
    acquiredAt: cmd.acquiredAt, validUntil: cmd.validUntil,
    createdAt: new Date(),
  })
  return { id }
}

export interface AddCertificationCommand {
  orgId: string
  employeeId: string
  certificationName: string
  issuingBody: string
  certificateNumber: string
  issuedAt: string
  expiresAt?: string | undefined
  documentId?: string | undefined
}

export async function addCertificationCommand(cmd: AddCertificationCommand, db: DbContext): Promise<{ id: string }> {
  const id = generateId()
  const now = new Date()
  await db.insert(certifications).values({
    id, orgId: cmd.orgId, employeeId: cmd.employeeId,
    certificationName: cmd.certificationName, issuingBody: cmd.issuingBody,
    certificateNumber: cmd.certificateNumber,
    issuedAt: cmd.issuedAt, expiresAt: cmd.expiresAt,
    status: 'VALID', documentId: cmd.documentId,
    createdAt: now, updatedAt: now,
  })
  return { id }
}

// ─── Availability ───

export interface SetAvailabilityCommand {
  orgId: string
  employeeId: string
  date: string
  availabilityType: 'AVAILABLE' | 'LEAVE' | 'SICK' | 'OFF' | 'TRAINING'
  notes?: string | undefined
}

export async function setAvailabilityCommand(cmd: SetAvailabilityCommand, db: DbContext): Promise<{ id: string }> {
  const id = generateId()
  await db.insert(availability).values({
    id, orgId: cmd.orgId, employeeId: cmd.employeeId,
    date: cmd.date, availabilityType: cmd.availabilityType,
    notes: cmd.notes, createdAt: new Date(),
  })
  return { id }
}
