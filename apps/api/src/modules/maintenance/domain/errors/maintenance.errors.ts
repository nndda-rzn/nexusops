import { DomainNotFoundError } from '@/shared/errors'

export class WorkOrderNotFoundError extends DomainNotFoundError {
  constructor(id: string) {
    super('work-order-not-found', 'Work Order Not Found', `Work order '${id}' does not exist.`, { work_order_id: id })
  }
}

export class SparePartNotFoundError extends DomainNotFoundError {
  constructor(id: string) {
    super('spare-part-not-found', 'Spare Part Not Found', `Spare part '${id}' does not exist.`, { spare_part_id: id })
  }
}
