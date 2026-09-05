import { describe, test, expect } from 'bun:test'
import { Plan } from '@/modules/planning/domain/entities/plan.entity'
import { Scenario } from '@/modules/planning/domain/entities/scenario.entity'

function makePlan(overrides: Record<string, unknown> = {}) {
  return Plan.fromSnapshot({
    id: 'plan_01', orgId: 'org_1', name: 'Yard Plan A',
    planType: 'YARD', status: 'DRAFT',
    createdBy: 'user_1', createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  })
}

describe('Plan state machine', () => {
  test('DRAFT → ARCHIVED allowed', () => {
    const plan = makePlan()
    plan.transition('ARCHIVED')
    expect(plan.status).toBe('ARCHIVED')
  })

  test('DRAFT stays DRAFT after approve (status unchanged)', () => {
    const plan = makePlan()
    plan.approve('user_2')
    expect(plan.status).toBe('DRAFT')
    expect(plan.toSnapshot().approvedBy).toBe('user_2')
  })

  test('approve requires DRAFT', () => {
    const plan = makePlan({ status: 'APPROVED' })
    expect(() => plan.approve('user_2')).toThrow(/Only DRAFT plans/)
  })

  test('approve then activate', () => {
    const plan = makePlan()
    plan.approve('user_2')
    plan.activate()
    expect(plan.status).toBe('ACTIVE')
    expect(plan.toSnapshot().approvedAt).toBeInstanceOf(Date)
    expect(plan.toSnapshot().activatedAt).toBeInstanceOf(Date)
  })

  test('activate without approve rejected', () => {
    const plan = makePlan()
    expect(() => plan.activate()).toThrow(/DRAFT plan must be approved/)
  })

  test('ACTIVE → SUPERSEDED → ARCHIVED', () => {
    const plan = makePlan({ status: 'ACTIVE', activatedAt: new Date() })
    plan.transition('SUPERSEDED')
    expect(plan.status).toBe('SUPERSEDED')
    plan.transition('ARCHIVED')
    expect(plan.status).toBe('ARCHIVED')
  })

  test('ARCHIVED is terminal', () => {
    const plan = makePlan({ status: 'ARCHIVED' })
    expect(() => plan.transition('ACTIVE')).toThrow(/Cannot transition/)
  })
})

describe('Scenario state machine', () => {
  test('CANDIDATE → SELECTED', () => {
    const s = Scenario.fromSnapshot({
      id: 'sc_01', orgId: 'org_1', planType: 'YARD', name: 'S1',
      status: 'CANDIDATE', createdBy: 'u1', createdAt: new Date(),
    })
    s.select()
    expect(s.status).toBe('SELECTED')
  })

  test('SELECTED cannot be selected again', () => {
    const s = Scenario.fromSnapshot({
      id: 'sc_01', orgId: 'org_1', planType: 'YARD', name: 'S1',
      status: 'SELECTED', createdBy: 'u1', createdAt: new Date(),
    })
    expect(() => s.select()).toThrow(/Only CANDIDATE/)
  })

  test('CANDIDATE → REJECTED', () => {
    const s = Scenario.fromSnapshot({
      id: 'sc_01', orgId: 'org_1', planType: 'YARD', name: 'S1',
      status: 'CANDIDATE', createdBy: 'u1', createdAt: new Date(),
    })
    s.reject()
    expect(s.status).toBe('REJECTED')
  })
})