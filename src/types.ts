export type ViewState = 'dashboard' | 'settlement' | 'labours' | 'payment' | 'profile' | 'sites' | 'reports' | 'settings';

export interface Labour {
  id: number;
  name: string;
  father_name: string | null;
  mobile: string | null;
  id_number: string | null;
  site_id: number | null;
  site_name?: string;
  daily_rate: number;
  status: string;
  role: string | null;
  is_archived: boolean;
}

export interface Attendance {
  id: number;
  labour_id: number;
  month: number;
  year: number;
  attendance_attendance_days: number;
  created_at?: string;
}

export interface Payment {
  id: number;
  labour_id: number;
  payment_date: string;
  amount: number;
  mode: string | null;
  notes: string | null;
  month: number;
  year: number;
}

export interface Deduction {
  id: number;
  labour_id: number;
  month: number;
  year: number;
  ration_amount: number;
  pocket_money_amount: number;
  other_deduction_amount: number;
  notes: string | null;
}

export interface MonthlySettlement {
  id: number;
  labour_id: number;
  month: number;
  year: number;
  attendance_attendance_days: number;
  daily_rate: number;
  gross_salary: number;
  ration_amount: number;
  pocket_money_amount: number;
  other_deduction_amount: number;
  total_deductions: number;
  previous_due: number;
  total_payments: number;
  net_salary: number;
  net_payable: number;
}

export interface LabourProfileData {
  labour: Labour;
  attendance: Attendance[];
  payments: Payment[];
  deductions: Deduction[];
  monthly_settlement?: MonthlySettlement[];
}

export interface Worker extends Labour {}; // Aliasing for existing component props temporarily if needed

export interface Site {
  id: number;
  name: string;
  location: string | null;
  status: string;
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

