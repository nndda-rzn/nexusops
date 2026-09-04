import { DomainNotFoundError } from '@/shared/errors'

export class AssetNotFoundError extends DomainNotFoundError {
  constructor(id: string) {
    super('asset-not-found', 'Asset Not Found', `Asset '${id}' does not exist.`, { asset_id: id })
  }
}

export class AssetCategoryNotFoundError extends DomainNotFoundError {
  constructor(id: string) {
    super('asset-category-not-found', 'Asset Category Not Found', `Asset category '${id}' does not exist.`, { category_id: id })
  }
}
