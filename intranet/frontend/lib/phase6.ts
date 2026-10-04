export interface FormField {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "textarea" | "select";
  required?: boolean;
  options?: string[];
}

export interface RequestType {
  id: number;
  code: string;
  label: string;
  description: string;
  icon: string;
  form_schema: FormField[];
  is_active: boolean;
}

export interface DemandRequest {
  id: number;
  type: number;
  type_label: string;
  reference: string;
  requester: string;
  requester_name: string;
  title: string;
  data: Record<string, unknown>;
  status: string;
  status_display: string;
  submitted_at: string | null;
  decided_at: string | null;
  created_at: string;
  attachments: { id: number; file: string; label: string }[];
  comments: { id: number; author_name: string; body: string; created_at: string }[];
  approval: {
    status_display: string;
    current_step_label: string | null;
    decisions: { id: number; approver_email: string; decision_display: string; comment: string }[];
  } | null;
}

export interface Announcement {
  id: number;
  title: string;
  body: string;
  author_name: string;
  pinned: boolean;
  audience: string;
  publish_at: string;
  expires_at: string | null;
}

export interface OrgPoll {
  id: number;
  question: string;
  description: string;
  created_by_name: string;
  is_open: boolean;
  multiple_choice: boolean;
  closes_at: string | null;
  options: { id: number; label: string; vote_count: number }[];
  total_votes: number;
  my_votes: number[];
}

export interface ReportDef {
  key: string;
  label: string;
  formats: string[];
}

export interface SearchResult {
  type: string;
  id: string | number;
  title: string;
  subtitle: string;
  url: string;
}

export const REQUEST_STATUS_STYLE: Record<string, string> = {
  draft: "bg-wagadu-sand",
  in_review: "bg-wagadu-amber/30 text-wagadu-brown",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-wagadu-terracotta/25 text-wagadu-terracotta",
  cancelled: "bg-wagadu-sand opacity-60",
};

export const SEARCH_TYPE_LABEL: Record<string, string> = {
  person: "Personne", task: "Tâche", mail: "Courrier",
  document: "Document", meeting: "Réunion", request: "Demande",
};
