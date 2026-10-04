export interface ProjectRow {
  id: number;
  code: string;
  name: string;
  summary: string;
  status: string;
  status_display: string;
  lead: string | null;
  lead_name: string | null;
  department: number | null;
  department_name: string | null;
  donor: string;
  budget: string | null;
  currency: string;
  location: string;
  application_deadline: string | null;
  start_date: string | null;
  end_date: string | null;
  progress: number;
  member_count: number;
  updated_at: string;
}

export interface Milestone {
  id: number;
  project: number;
  title: string;
  description: string;
  due_date: string | null;
  status: "todo" | "in_progress" | "done";
  order: number;
  completed_at: string | null;
}

export interface Indicator {
  id: number;
  project: number;
  name: string;
  unit: string;
  baseline_value: string;
  target_value: string;
  current_value: string;
  attainment: number;
}

export interface ProgressUpdate {
  id: number;
  project: number;
  author: string | null;
  author_name: string;
  date: string;
  body: string;
  spent_amount: string | null;
  created_at: string;
}

export interface ProjectDocument {
  id: number;
  project: number;
  document_id: number;
  title: string;
  size: number | null;
  added_by_name: string;
  added_at: string;
}

export interface ProjectTaskBrief {
  id: number;
  title: string;
  status: string;
  status_display: string;
  priority: string;
  due_at: string | null;
}

export interface ProjectDetail extends ProjectRow {
  description: string;
  members: string[];
  members_detail: { id: string; name: string }[];
  created_by: string | null;
  created_at: string;
  milestones: Milestone[];
  indicators: Indicator[];
  updates: ProgressUpdate[];
  documents: ProjectDocument[];
  tasks: ProjectTaskBrief[];
}

export const PROJECT_STATUSES: { value: string; label: string }[] = [
  { value: "prospect", label: "Identifié (piste)" },
  { value: "applying", label: "Candidature déposée" },
  { value: "active", label: "En cours" },
  { value: "on_hold", label: "Suspendu" },
  { value: "completed", label: "Terminé" },
  { value: "rejected", label: "Candidature refusée" },
  { value: "cancelled", label: "Abandonné" },
];

export const PROJECT_STATUS_STYLE: Record<string, string> = {
  prospect: "bg-sky-100 text-sky-800",
  applying: "bg-violet-100 text-violet-800",
  active: "bg-amber-100 text-amber-900",
  on_hold: "bg-stone-200 text-stone-700",
  completed: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-red-100 text-red-800",
};

export const MILESTONE_STATUS_STYLE: Record<string, string> = {
  todo: "bg-sky-100 text-sky-800",
  in_progress: "bg-amber-100 text-amber-900",
  done: "bg-emerald-100 text-emerald-800",
};
