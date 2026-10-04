"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { PRIORITY_STYLE, TASK_COLUMNS, Task } from "@/lib/tasks";
import { BackLink } from "@/components/BackLink";
import { Icon } from "@/components/Icon";

const PRIORITIES = [["low", "Basse"], ["normal", "Normale"], ["high", "Haute"], ["urgent", "Urgente"]] as const;

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { me, can } = useAuth();
  const router = useRouter();
  const { data: task, reload } = useApi<Task>(`/tasks/${id}/`);
  const [report, setReport] = useState("");
  const [hours, setHours] = useState("");
  const [comment, setComment] = useState("");
  const [reviewComment, setReviewComment] = useState<Record<string, string>>({});
  const [newItem, setNewItem] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", priority: "normal", due_at: "" });

  if (!task) return <p className="text-sm opacity-60">Chargement…</p>;
  const mine = task.assignments.find((a) => a.user === me?.id);
  const isChef = task.created_by === me?.id || can("tasks.oversee");
  const canManage = isChef || can("tasks.assign");
  const mySubmission = task.submissions.find((s) => s.submitted_by === me?.id);

  function startEdit() {
    setForm({
      title: task!.title,
      description: task!.description ?? "",
      priority: task!.priority,
      due_at: task!.due_at ? task!.due_at.slice(0, 16) : "",
    });
    setEditing(true);
  }
  async function saveEdit() {
    await api(`/tasks/${id}/`, { method: "PATCH", body: { ...form, due_at: form.due_at || null } });
    setEditing(false);
    reload();
  }
  async function removeTask() {
    if (!confirm("Supprimer définitivement cette tâche ?")) return;
    await api(`/tasks/${id}/`, { method: "DELETE" });
    router.push("/tasks");
  }

  async function act(path: string, body: unknown = {}) {
    await api(`/tasks/${id}/${path}/`, { method: "POST", body });
    reload();
  }
  async function addComment() {
    if (!comment.trim()) return;
    await api("/task-comments/", { method: "POST", body: { task: Number(id), body: comment } });
    setComment("");
    reload();
  }
  async function toggleItem(itemId: number, done: boolean) {
    await api(`/task-checklist-items/${itemId}/`, { method: "PATCH", body: { is_done: done } });
    reload();
  }
  async function addItem() {
    if (!newItem.trim()) return;
    await api("/task-checklist-items/", { method: "POST", body: { task: Number(id), label: newItem } });
    setNewItem("");
    reload();
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <BackLink href="/tasks" />
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-display text-2xl text-wagadu-brown">{task.title}</h1>
          <p className="text-sm opacity-60">
            Créée par {task.created_by_name} · {task.status_display}
          </p>
        </div>
        <div className="flex gap-1 items-center">
          <span className={`badge ${PRIORITY_STYLE[task.priority]}`}>{task.priority_display}</span>
          {task.is_overdue && <span className="badge bg-wagadu-terracotta/25 text-wagadu-terracotta">En retard</span>}
          {canManage && !editing && (
            <>
              <button className="p-1.5 rounded-lg hover:bg-wagadu-sand/60 text-wagadu-brown" title="Modifier" onClick={startEdit}>
                <Icon name="pencil" className="w-4 h-4" />
              </button>
              <button className="p-1.5 rounded-lg text-wagadu-terracotta hover:bg-wagadu-terracotta/10" title="Supprimer" onClick={removeTask}>
                <Icon name="trash" className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {editing ? (
        <div className="card grid sm:grid-cols-2 gap-3">
          <input className="input sm:col-span-2" value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Titre" />
          <textarea className="input sm:col-span-2" rows={3} value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" />
          <select className="input" value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            {PRIORITIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input type="datetime-local" className="input" value={form.due_at}
            onChange={(e) => setForm({ ...form, due_at: e.target.value })} />
          <div className="sm:col-span-2 flex gap-2">
            <button className="btn-primary" onClick={saveEdit}>Enregistrer</button>
            <button className="btn-ghost" onClick={() => setEditing(false)}>Annuler</button>
          </div>
        </div>
      ) : (
        <>
          {task.description && <div className="card whitespace-pre-wrap text-sm">{task.description}</div>}
          {task.due_at && (
            <p className="text-sm font-mono">Échéance : {new Date(task.due_at).toLocaleString("fr-FR")}
              {task.estimated_hours && ` · charge estimée ${task.estimated_hours} h`}</p>
          )}
        </>
      )}

      {/* Kanban status (chef) */}
      {isChef && (
        <div className="card flex flex-wrap gap-2 items-center">
          <span className="label mb-0">Statut :</span>
          {TASK_COLUMNS.map((c) => (
            <button key={c.key}
              className={task.status === c.key ? "btn-primary" : "btn-ghost"}
              onClick={() => act("status", { status: c.key })}>
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* Checklist */}
      <div className="card">
        <p className="label">Checklist</p>
        <ul className="space-y-1 text-sm">
          {task.checklist.map((i) => (
            <li key={i.id} className="flex items-center gap-2">
              <input type="checkbox" checked={i.is_done} onChange={(e) => toggleItem(i.id, e.target.checked)} />
              <span className={i.is_done ? "line-through opacity-60" : ""}>{i.label}</span>
            </li>
          ))}
        </ul>
        <div className="flex gap-2 mt-2">
          <input className="input" placeholder="Nouvel élément" value={newItem}
            onChange={(e) => setNewItem(e.target.value)} />
          <button className="btn-ghost" onClick={addItem}>Ajouter</button>
        </div>
      </div>

      {/* Sous-tâches */}
      {task.subtasks.length > 0 && (
        <div className="card">
          <p className="label">Sous-tâches</p>
          <ul className="text-sm divide-y divide-wagadu-sand">
            {task.subtasks.map((s) => (
              <li key={s.id} className="py-1.5">
                <Link href={`/tasks/${s.id}`} className="text-wagadu-terracotta">{s.title}</Link>
                <span className="opacity-60"> — {s.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Panneau de soumission (employé assigné) */}
      {mine && (
        <div className="card space-y-2">
          <p className="label">Ma soumission — {mine.progress_status}</p>
          {mySubmission?.review_comment && (
            <p className="text-sm text-wagadu-terracotta">Retour du chef : {mySubmission.review_comment}</p>
          )}
          <textarea className="input" rows={3} placeholder="Compte-rendu"
            value={report || mySubmission?.report || ""} onChange={(e) => setReport(e.target.value)} />
          <input type="number" step="0.5" className="input w-40" placeholder="Temps réel (h)"
            value={hours} onChange={(e) => setHours(e.target.value)} />
          <button className="btn-primary"
            onClick={() => act("submit", { report: report || mySubmission?.report || "", declared_hours: hours || null })}>
            {mySubmission ? "Re-soumettre" : "Soumettre le livrable"}
          </button>
        </div>
      )}

      {/* Suivi des assignés (chef) */}
      {isChef && (
        <div className="card">
          <p className="label">Assignés &amp; livrables</p>
          <div className="space-y-3">
            {task.assignments.map((a) => {
              const sub = task.submissions.find((s) => s.submitted_by === a.user);
              return (
                <div key={a.id} className="border-l-2 border-wagadu-sand pl-2">
                  <p className="text-sm font-medium">{a.user_name || a.user_email} — {a.progress_status}
                    {a.declared_hours && ` · ${a.declared_hours} h déclarées`}</p>
                  {sub && (
                    <>
                      <p className="text-sm opacity-70">{sub.report || "(pas de compte-rendu)"}</p>
                      {sub.status === "submitted" && (
                        <div className="flex gap-2 mt-1">
                          <input className="input" placeholder="Commentaire"
                            value={reviewComment[a.user] || ""}
                            onChange={(e) => setReviewComment({ ...reviewComment, [a.user]: e.target.value })} />
                          <button className="btn-primary"
                            onClick={() => act("decide", { user: a.user, decision: "validated", comment: reviewComment[a.user] || "" })}>
                            Valider
                          </button>
                          <button className="btn-ghost text-wagadu-terracotta border-wagadu-terracotta/40"
                            onClick={() => act("decide", { user: a.user, decision: "returned", comment: reviewComment[a.user] || "" })}>
                            Renvoyer
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fil de commentaires */}
      <div className="card">
        <p className="label">Commentaires</p>
        <ul className="space-y-2 text-sm">
          {task.comments.map((c) => (
            <li key={c.id}>
              <span className="font-medium">{c.author_name || "—"}</span>
              <span className="text-xs opacity-50 font-mono"> · {new Date(c.created_at).toLocaleString("fr-FR")}</span>
              <p className="opacity-80">{c.body}</p>
            </li>
          ))}
        </ul>
        <div className="flex gap-2 mt-2">
          <input className="input" placeholder="Écrire un commentaire" value={comment}
            onChange={(e) => setComment(e.target.value)} />
          <button className="btn-ghost" onClick={addComment}>Envoyer</button>
        </div>
      </div>
    </div>
  );
}
