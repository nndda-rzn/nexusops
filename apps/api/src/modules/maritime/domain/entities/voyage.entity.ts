import { DomainError } from '@/shared/errors'

// ─────────────────────────────────────────
// Voyage Entity
// ─────────────────────────────────────────

export type VoyageStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export interface VoyageProps {
  id: string
  orgId: string
  voyageNumber: string
  vesselId: string
  serviceName?: string | undefined
  departurePortId?: string | undefined
  destinationPortId?: string | undefined
  status: VoyageStatus
  createdAt: Date
  updatedAt: Date
}

export class Voyage {
  constructor(private props: VoyageProps) {}

  get id() { return this.props.id }
  get orgId() { return this.props.orgId }
  get voyageNumber() { return this.props.voyageNumber }
  get vesselId() { return this.props.vesselId }
  get status() { return this.props.status }

  start(): void {
    if (this.props.status !== 'PLANNED') {
      throw new DomainError('invalid-voyage-operation', 'Invalid Voyage Operation',
        `Voyage '${this.props.id}' is not in PLANNED status.`, { voyage_id: this.props.id, status: this.props.status })
    }
    this.props.status = 'IN_PROGRESS'
    this.props.updatedAt = new Date()
  }

  complete(): void {
    if (this.props.status !== 'IN_PROGRESS') {
      throw new DomainError('invalid-voyage-operation', 'Invalid Voyage Operation',
        `Voyage '${this.props.id}' is not IN_PROGRESS.`, { voyage_id: this.props.id, status: this.props.status })
    }
    this.props.status = 'COMPLETED'
    this.props.updatedAt = new Date()
  }

  cancel(): void {
    if (this.props.status === 'COMPLETED') {
      throw new DomainError('invalid-voyage-operation', 'Invalid Voyage Operation',
        `Cannot cancel a completed voyage.`, { voyage_id: this.props.id })
    }
    this.props.status = 'CANCELLED'
    this.props.updatedAt = new Date()
  }

  toSnapshot(): VoyageProps {
    return { ...this.props }
  }

  static fromSnapshot(props: VoyageProps): Voyage {
    return new Voyage(props)
  }
}
