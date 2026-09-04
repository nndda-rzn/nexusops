export interface AviationFlightScheduledEvent { type: 'aviation.flight_scheduled'; flightId: string; orgId: string; flightNumber: string; occurredAt: Date }
export interface AviationSlotConfirmedEvent { type: 'aviation.slot_confirmed'; flightId: string; orgId: string; slotId: string; occurredAt: Date }
export interface AviationManifestClosedEvent { type: 'aviation.manifest_closed'; flightId: string; orgId: string; manifestId: string; occurredAt: Date }
export interface AviationLoadPlanApprovedEvent { type: 'aviation.load_plan_approved'; flightId: string; orgId: string; loadPlanId: string; occurredAt: Date }
export interface AviationFlightDepartedEvent { type: 'aviation.flight_departed'; flightId: string; orgId: string; actualDeparture: Date; occurredAt: Date }
export interface AviationFlightArrivedEvent { type: 'aviation.flight_arrived'; flightId: string; orgId: string; actualArrival: Date; occurredAt: Date }
export interface AviationFlightDelayedEvent { type: 'aviation.flight_delayed'; flightId: string; orgId: string; occurredAt: Date }
export interface AviationAogDeclaredEvent { type: 'aviation.aog_declared'; aircraftId: string; orgId: string; flightId?: string | undefined; occurredAt: Date }
export interface AviationCargoAcceptedEvent { type: 'aviation.cargo_accepted'; flightId: string; orgId: string; awbId: string; occurredAt: Date }
