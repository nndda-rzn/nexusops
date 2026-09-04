export interface TerminalCreatedEvent {
  type: 'terminal.created'
  terminalId: string
  orgId: string
  code: string
  name: string
  terminalType: string
  occurredAt: Date
}

export interface TerminalGateCreatedEvent {
  type: 'terminal.gate_created'
  gateId: string
  orgId: string
  terminalId: string
  gateNumber: string
  gateType: string
  occurredAt: Date
}

export interface TerminalGateStatusUpdatedEvent {
  type: 'terminal.gate_status_updated'
  gateId: string
  orgId: string
  terminalId: string
  status: 'OPEN' | 'CLOSED' | 'RESTRICTED'
  occurredAt: Date
}
