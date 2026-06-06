export interface Shift {
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
}

export interface DayAvailability {
  enabled: boolean;
  shifts: Shift[];
}

export interface WeeklyAvailability {
  sunday: DayAvailability;
  monday: DayAvailability;
  tuesday: DayAvailability;
  wednesday: DayAvailability;
  thursday: DayAvailability;
  friday: DayAvailability;
  saturday: DayAvailability;
}

export interface BusyBlock {
  start: string; // "HH:MM" in NY local time
  end: string;   // "HH:MM" in NY local time
}

export interface ServiceSummary {
  id: string;
  price: number;
  durationMinutes: number;
}

export interface AddonSummary {
  id: string;
  price: number;
  durationMinutes: number;
}

export interface PriceSummary {
  basePrice: number;
  addonsPrice: number;
  eveningSurcharge: number;
  total: number;
  hasEveningSurcharge: boolean;
}

export interface SlotGenerationInput {
  dateStr: string;           // "YYYY-MM-DD"
  totalDurationMinutes: number;
  weeklyAvailability: WeeklyAvailability;
  blockedDates: string[];    // ["YYYY-MM-DD"]
  busyBlocks: BusyBlock[];
}

export interface BookingRequest {
  name: string;
  email: string;
  phone: string;
  serviceId: string;
  addonIds: string[];
  notes?: string;
  localDate: string;       // YYYY-MM-DD
  localStartTime: string;  // HH:MM
  submissionId: string;    // UUID from client
}
