export interface Employee {
  id: number;
  user: string;
  full_name: string;
  email: string;
  matricule: string;
  job_title: string;
  hire_date: string | null;
  employment_type: string;
  hr_status: string;
  probation_end: string | null;
  birth_date: string | null;
  national_id: string;
  seniority_years: number | null;
}

export interface LeaveType {
  id: number;
  code: string;
  label: string;
  annual_quota_days: string;
  requires_certificate: boolean;
  color: string;
}

export interface LeaveBalance {
  id: number;
  leave_type: number;
  leave_type_label: string;
  year: number;
  entitled_days: string;
  taken_days: string;
  remaining_days: string;
}

export interface ApprovalDecision {
  id: number;
  approver_email: string;
  decision: string;
  decision_display: string;
  comment: string;
  decided_at: string;
}

export interface LeaveRequest {
  id: number;
  employee: number;
  employee_name: string;
  leave_type: number;
  start_date: string;
  end_date: string;
  reason: string;
  working_days: string;
  status: string;
  status_display: string;
  submitted_at: string | null;
  approval: {
    status_display: string;
    current_step_label: string | null;
    decisions: ApprovalDecision[];
  } | null;
}

export interface MailItem {
  id: number;
  reference: string;
  direction: string;
  direction_display: string;
  subject: string;
  body: string;
  correspondent: string;
  mail_date: string;
  registered_at: string;
  status: string;
  status_display: string;
  confidentiality: string;
  category: number | null;
  assigned_to: string | null;
  due_date: string | null;
  events: { id: number; type_display: string; actor_email: string; detail: string; created_at: string }[];
  acknowledgements: { id: number; user_email: string; acknowledged_at: string }[];
}
