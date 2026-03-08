export interface Car {
  name: string;
  plate: string;
  color: string;
  primary: boolean;
  dbId: string | null;
}

export interface Payment {
  amount: number;
  method: string;
  date: string;
  receipt: string;
  receiptIssued: boolean;
  dbId?: string | null;
}

export interface Penalty {
  days: number;
  amount: number;
  date: string;
  notes: string;
  dbId?: string | null;
}

export interface Booking {
  dbId: string | null;
  id: string;
  slotId: string;
  locName: string;
  startDate: string;
  endDate: string;
  status: string;
  cancelledDate: string | null;
  car: { name: string; plate: string; color: string };
  userName: string;
  userEmail: string;
  userBlklot: string;
  rate: number;
  userId: string;
  vehicleId?: string;
  payments: Payment[];
  penalty: Penalty | null;
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  blklot: string;
  restype: string;
  avatar: string | null;
  memberSince: string | null;
}

export interface RegisteredUser {
  dbId: string | null;
  name: string;
  email: string;
  phone: string;
  pass: string;
  blklot: string;
  restype: string;
  avatar: string | null;
  memberSince: string | null;
  cars: Car[];
  bookings: Booking[];
}

export interface SpaceConfig {
  id?: string;
  name: string;
  addr: string;
  slots: number;
  rate: number;
}

export interface AppConfig {
  subdiv: string;
  theme: string;
  logo: string | null;
  appName: string;
  hoa: { phone: string; email: string; hours: string };
  spaces: SpaceConfig[];
  adminId?: string;
}

export interface Location {
  name: string;
  addr: string;
  total: number;
  rate: number;
  prefix: string;
  dbId?: string;
  spots: { id: string; ok: boolean }[];
}
