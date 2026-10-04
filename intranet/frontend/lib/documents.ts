import { tokenStore } from "./api";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1";

export interface DocVersion {
  id: number;
  version_number: number;
  original_filename: string;
  size: number;
  content_type: string;
  note: string;
  uploaded_by_email: string;
  uploaded_at: string;
}

export interface DocSignature {
  id: number;
  signer_name: string;
  signer_email: string;
  statement: string;
  signed_at: string;
}

export interface VisibilityRule {
  id: number;
  subject_type: string;
  subject_id: string;
}

export interface DocumentItem {
  id: number;
  title: string;
  description: string;
  keywords: string;
  folder: number | null;
  folder_name: string | null;
  owner_email: string;
  is_in_library: boolean;
  visibility: string;
  current_version: number | null;
  current_version_detail: DocVersion | null;
  versions: DocVersion[];
  visibility_rules: VisibilityRule[];
  signatures: DocSignature[];
  is_trashed: boolean;
  updated_at: string;
}

export interface Distribution {
  id: number;
  document_title: string;
  mode: string;
  mode_display: string;
  message: string;
  sent_at: string;
  read_count: number;
  total_count: number;
  recipients: {
    id: number;
    user_email: string;
    user_name: string;
    is_read: boolean;
    read_at: string | null;
  }[];
}

export interface ReceivedDoc {
  id: number;
  document_id: number;
  title: string;
  description: string;
  sent_by_email: string;
  message: string;
  sent_at: string;
  is_read: boolean;
  read_at: string | null;
}

/** Ouvre un aperçu ou télécharge un fichier protégé par jeton. */
export async function openDocumentFile(docId: number, mode: "preview" | "download") {
  const res = await fetch(`${BASE}/documents/${docId}/${mode}/`, {
    headers: { Authorization: `Bearer ${tokenStore.access}` },
  });
  if (!res.ok) throw new Error("Fichier indisponible");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  if (mode === "preview") {
    window.open(url, "_blank", "noopener");
  } else {
    const a = document.createElement("a");
    a.href = url;
    const cd = res.headers.get("content-disposition") || "";
    a.download = /filename="?([^"]+)"?/.exec(cd)?.[1] || "document";
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}
