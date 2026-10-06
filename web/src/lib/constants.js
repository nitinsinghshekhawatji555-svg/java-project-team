export const REQUEST_STATUS = {
  PENDING: 'pending',
  OFFERED: 'offered',
  ACCEPTED: 'accepted',
  EN_ROUTE: 'en_route',
  ARRIVED: 'arrived',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
}

export const SERVICE_TYPE = { 
  REPAIR: 'repair',  //has a general repair part and fallback when the request is made.
  TOWING: 'towing',
  TYRE_CHANGE: 'tyre_change',
  BATTERY_JUMP: 'battery_jump',
  FUEL_DELIVERY: 'fuel_delivery',
  OTHER: 'other',
}

export const MECHANIC_SPECIALTIES = [
  'Towing & Recovery',
  'Tyre Change',
  'Battery Jump',
  'Fuel Delivery',
  'Engine Diagnostics',
  'Other Assistance e.g. Electrical, Transmission, Bodyworks, Suspension, car wash etc.',
]


export const USER_ROLE = {
  DRIVER: 'driver',
  MECHANIC: 'mechanic',
  ADMIN: 'admin',
}

export const VERIFICATION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  MORE_INFO: 'more_info',
}

export const NOTIFICATION_TYPE = {
  SYSTEM: 'system',
  REQUEST: 'request',
  CHAT: 'chat',
  VERIFICATION: 'verification',
  NEW_REQUEST: 'new_request',
  MECHANIC_ACCEPTED: 'mechanic_accepted',
  MECHANIC_EN_ROUTE: 'mechanic_en_route',
  MECHANIC_ARRIVED: 'mechanic_arrived',
  JOB_COMPLETED: 'job_completed',
  REQUEST_CANCELLED: 'request_cancelled',
}

// how far we search for mechanics by default
export const DEFAULT_SEARCH_RADIUS_KM = 10

// how many minutes before a mechanic location is