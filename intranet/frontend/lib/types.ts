export interface Paginated<T> {
  count: number;
  results: T[];
}

export interface UserRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  job_title: string;
  bio: string;
  avatar: string | null;
  role: number | null;
  role_detail: { slug: string; name: string } | null;
  department: number | null;
  manager: string | null;
  status: string;
  is_active: boolean;
  is_super_admin: boolean;
}

export interface Role {
  id: number;
  slug: string;
  name: string;
  description: string;
  is_system: boolean;
  permission_codes: string[];
  user_count: number;
}

export interface Permission {
  id: number;
  code: string;
  label: string;
  module: string;
}

export interface AuditEntry {
  id: number;
  timestamp: string;
  actor_label: string;
  actor_is_admin: boolean;
  confidential: boolean;
  module: string;
  action: string;
  action_display: string;
  severity: string;
  target_repr: string;
  message: string;
  ip_address: string | null;
}
