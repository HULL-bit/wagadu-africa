"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";

interface Step {
  id: number;
  order: number;
  label: string;
  approver_type: string;
  approver_role: number | null;
  approver_user: string | null;
  skip_if_unresolved: boolean;
}
interface Flow {
  id: number;
  code: string;
  label: string;
  description: string;
  is_active: boolean;
  steps: Step[];
}

export default function ValidationFlowsPage() {
  const flows = useApi<{ results: Flow[] } | Flow[]>("/validation/flows/");
  const roles = useApi<{ results: { id: number; slug: string; name: string }[] }>("/roles/");
  const [newStep, setNewStep] = useState<Record<number, { label: string; approver_type: string; approver_role: string }>>({});

  const list = Array.isArray(flows.data) ? flows.data : flows.data?.results ?? [];

  async function addStep(flow: Flow) {
    const s = newStep[flow.id];
    if (!s?.label) return;
    await api("/validation/steps/", {
      method: "POST",
      body: {
        flow: flow.id,
        order: (flow.steps.at(-1)?.order ?? 0) + 1,
        label: s.label,
        approver_type: s.approver_type,
        approver_role: s.approver_type === "role" ? Number(s.approver_role) || null : null,
        skip_if_unresolved: s.approver_type === "manager",
      },
    });
    setNewStep({ ...newStep, [flow.id]: { label: "", approver_type: "manager", approver_role: "" } });
    flows.reload();
  }

  async function removeStep(id: number) {
    await api(`/validation/steps/${id}/`, { method: "DELETE" });
    flows.reload();
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-wagadu-brown">Circuits de validation</h1>
      <p className="text-sm opacity-70 max-w-2xl">
        Étapes d'approbation successives appliquées aux demandes (congés, et demandes
        transverses à venir). L'ordre des étapes détermine l'enchaînement.
      </p>

      {list.map((flow) => (
        <div key={flow.id} className="card space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display text-lg text-wagadu-brown">{flow.label}</p>
              <p className="text-xs font-mono opacity-60">{flow.code}</p>
            </div>
            <span className={`badge ${flow.is_active ? "bg-green-100 text-green-800" : "bg-wagadu-sand"}`}>
              {flow.is_active ? "actif" : "inactif"}
            </span>
          </div>

          <ol className="space-y-1 text-sm">
            {flow.steps.map((s) => (
              <li key={s.id} className="flex items-center justify-between border-l-2 border-wagadu-gold pl-2">
                <span>
                  <span className="font-mono text-xs opacity-60">{s.order}.</span> {s.label}
                  <span className="opacity-60"> — {s.approver_type}</span>
                </span>
                <button className="text-wagadu-terracotta text-xs" onClick={() => removeStep(s.id)}>Retirer</button>
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap gap-2 items-end border-t border-wagadu-sand pt-3">
            <input className="input w-48" placeholder="Libellé de l'étape"
              value={newStep[flow.id]?.label ?? ""}
              onChange={(e) => setNewStep({ ...newStep, [flow.id]: { ...newStep[flow.id], label: e.target.value, approver_type: newStep[flow.id]?.approver_type ?? "manager", approver_role: newStep[flow.id]?.approver_role ?? "" } })} />
            <select className="input w-40" value={newStep[flow.id]?.approver_type ?? "manager"}
              onChange={(e) => setNewStep({ ...newStep, [flow.id]: { ...newStep[flow.id], approver_type: e.target.value, label: newStep[flow.id]?.label ?? "", approver_role: newStep[flow.id]?.approver_role ?? "" } })}>
              <option value="manager">Responsable hiérarchique</option>
              <option value="role">Titulaire d'un rôle</option>
            </select>
            {newStep[flow.id]?.approver_type === "role" && (
              <select className="input w-40" value={newStep[flow.id]?.approver_role ?? ""}
                onChange={(e) => setNewStep({ ...newStep, [flow.id]: { ...newStep[flow.id], approver_role: e.target.value, label: newStep[flow.id]?.label ?? "", approver_type: "role" } })}>
                <option value="">— Rôle —</option>
                {roles.data?.results.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            )}
            <button className="btn-primary" onClick={() => addStep(flow)}>Ajouter l'étape</button>
          </div>
        </div>
      ))}
    </div>
  );
}
