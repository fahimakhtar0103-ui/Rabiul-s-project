export type ViewState = 'dashboard' | 'settlement' | 'labours' | 'payment' | 'profile' | 'sites' | 'reports';

export interface Labour {
  id: number;
  name: string;
  fatherName: string | null;
  mobile: string | null;
  idNumber: string | null;
  siteId: number | null;
  siteName?: string;
  dailyRate: number;
  status: string;
  role: string | null;
  is_archived: boolean;
}

export interface Attendance {
  id: number;
  labourId: number;
  month: string;
  year: number;
  days: number;
}

export interface Payment {
  id: number;
  labourId: number;
  point_date: string;
  amount: number;
  mode: string | null;
  notes: string | null;
}

export interface Deduction {
  id: number;
  labourId: number;
  point_date: string;
  amount: number;
  reason: string | null;
}

export interface MonthlyEntry {
  id: number;
  labourId: number;
  month: string;
  attendance_days: number;
  daily_rate: number;
  ration: number;
  pocket_money: number;
  other_deduction: number;
  gross_salary: number;
  total_deductions: number;
  net_salary: number;
  payments_made: number;
}

export interface LabourProfileData {
  labour: Labour;
  attendance: Attendance[];
  payments: Payment[];
  deductions: Deduction[];
  monthlyEntries?: MonthlyEntry[];
}

export interface Worker extends Labour {}; // Aliasing for existing component props temporarily if needed

export interface Site {
  id: number;
  name: string;
  location: string | null;
}

export interface Activity {
  id: string;
  type: 'payment' | 'attendance' | 'new_labour' | 'report';
  title: string;
  description: string;
  time: string;
}

export interface Transaction {
  id: string;
  date: string;
  title: string;
  subtitle: string;
  debit?: number;
  credit?: number;
  balance: number;
  balanceType: 'Dr' | 'Cr';
}
