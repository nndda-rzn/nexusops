import { DomainNotFoundError } from '@/shared/errors'

export class PortCallNotFoundError extends DomainNotFoundError {
  constructor(id: string) {
    super('port-call-not-found', 'Port Call Not Found', `Port call '${id}' does not exist.`, { port_call_id: id })
  }
}
