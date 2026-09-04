import { DomainNotFoundError } from '@/shared/errors'
export class WarehouseNotFoundError extends DomainNotFoundError {
  constructor(id: string) {
    super('warehouse-not-found', 'Warehouse Not Found', `Warehouse '${id}' does not exist.`, { warehouse_id: id })
  }
}
