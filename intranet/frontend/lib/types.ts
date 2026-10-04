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

export interface Incident {
  id: number;
  title: string;
  description: string;
  component: string;
  severity: string;
  severity_display: string;
  status: string;
  status_display: string;
  reported_by: string | null;
  reported_by_name: string;
  assigned_to: string | null;
  assigned_to_name: string;
  resolution_notes: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

interface HealthCheck {
  ok: boolean;
  error?: string;
}

export interface SystemHealth {
  checked_at: string;
  database: HealthCheck & { size_bytes: number | null; connections: number | null };
  redis: HealthCheck & { used_memory_bytes?: number };
  celery: HealthCheck & { workers?: number };
  disk: HealthCheck & { total_bytes?: number; used_bytes?: number; free_bytes?: number };
  incidents: { open_total: number; open_critical: number };
  audit: { last_24h_total: number; last_24h_critical: number };
}
