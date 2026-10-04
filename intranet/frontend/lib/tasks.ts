export interface TaskAssignment {
  id: number;
  user: string;
  user_name: string;
  user_email: string;
  progress_status: string;
  declared_hours: string | null;
}

export interface TaskComment {
  id: number;
  author: string;
  author_name: string;
  body: string;
  created_at: string;
}

export interface ChecklistItem {
  id: number;
  task: number;
  label: string;
  order: number;
  is_done: boolean;
}

export interface TaskSubmission {
  id: number;
  submitted_by: string;
  submitter_name: string;
  report: string;
  declared_hours: string | null;
  status: string;
  review_comment: string;
  submitted_at: string;
  attachments: { id: number; file: string }[];
}

export interface TaskLabel {
  id: number;
  name: string;
  color: string;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  priority: string;
  priority_display: string;
  status: string;
  status_display: string;
  created_by: string | null;
  created_by_name: string;
  assigned_department: number | null;
  assigned_team: number | null;
  labels: number[];
  labels_detail: TaskLabel[];
  parent: number | null;
  start_at: string | null;
  due_at: string | null;
  estimated_hours: string | null;
  is_overdue: boolean;
  assignments: TaskAssignment[];
  checklist: ChecklistItem[];
  comments: TaskComment[];
  submissions: TaskSubmission[];
  subtasks: { id: number; title: string; status: string; priority: string; due_at: string | null }[];
  created_at: string;
  closed_at: string | null;
}

export const TASK_COLUMNS: { key: string; label: string }[] = [
  { key: "todo", label: "À faire" },
  { key: "in_progress", label: "En cours" },
  { key: "in_review", label: "En révision" },
  { key: "done", label: "Terminé" },
];

export const PRIORITY_STYLE: Record<string, string> = {
  low: "bg-wagadu-sand",
  normal: "bg-wagadu-sand",
  high: "bg-wagadu-amber/30 text-wagadu-brown",
  urgent: "bg-wagadu-terracotta/25 text-wagadu-terracotta",
};

/** Code couleur par statut : terminé=vert, à faire=bleu, en cours=jaune, en révision=rouge. */
export const STATUS_STYLE: Record<string, { badge: string; bar: string; dot: string }> = {
  todo: { badge: "bg-sky-100 text-sky-800", bar: "border-l-sky-400", dot: "bg-sky-500" },
  in_progress: { badge: "bg-amber-100 text-amber-900", bar: "border-l-amber-400", dot: "bg-amber-500" },
  in_review: { badge: "bg-red-100 text-red-800", bar: "border-l-red-400", dot: "bg-red-500" },
  done: { badge: "bg-emerald-100 text-emerald-800", bar: "border-l-emerald-500", dot: "bg-emerald-500" },
};

export const STATUS_FALLBACK = { badge: "bg-wagadu-sand", bar: "border-l-wagadu-sand", dot: "bg-wagadu-sand" };
