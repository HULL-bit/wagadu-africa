export interface LifecycleItem {
  id: number;
  process: number;
  label: string;
  category: string;
  responsible_role: string;
  responsible: string | null;
  responsible_email: string | null;
  due_date: string | null;
  is_done: boolean;
  notes: string;
  order: number;
}

export interface LifecycleProcess {
  id: number;
  kind: string;
  kind_display: string;
  employee: number;
  employee_name: string;
  matricule: string;
  reference_date: string;
  status: string;
  progress: { done: number; total: number; percent: number };
  items: LifecycleItem[];
  created_at: string;
  completed_at: string | null;
}

export interface EvalQuestion {
  id: number;
  section: string;
  label: string;
  type: string;
  weight: string;
  order: number;
}

export interface EvalAnswer {
  id: number;
  question: number;
  question_label: string;
  question_type: string;
  section: string;
  self_value: string;
  manager_value: string;
  comment: string;
}

export interface Evaluation {
  id: number;
  campaign: number;
  campaign_name: string;
  employee: number;
  employee_name: string;
  evaluator: string | null;
  status: string;
  status_display: string;
  self_score: string | null;
  manager_score: string | null;
  overall_comment: string;
  employee_comment: string;
  form: number;
  questions: EvalQuestion[];
  answers: EvalAnswer[];
  created_at: string;
  finalized_at: string | null;
}

export interface EvalCampaign {
  id: number;
  name: string;
  form: number;
  form_name: string;
  period_start: string;
  period_end: string;
  department: number | null;
  status: string;
  status_display: string;
  evaluation_count: number;
}

export const CATEGORY_LABEL: Record<string, string> = {
  task: "Tâche", document: "Document", equipment: "Matériel",
  access: "Accès", handover: "Passation", admin: "Administratif",
};

export const EVAL_STATUS_STYLE: Record<string, string> = {
  pending: "bg-wagadu-sand",
  self_assessed: "bg-wagadu-amber/30 text-wagadu-brown",
  manager_assessed: "bg-wagadu-amber/30 text-wagadu-brown",
  acknowledged: "bg-wagadu-gold/30",
  finalized: "bg-green-100 text-green-800",
};
