"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { Paginated, UserRow } from "@/lib/types";
import { Employee } from "@/lib/hr";

export default function EmployeesPage() {
  const { can } = useAuth();
  const employees = useApi<Paginated<Employee>>("/hr/employees/");
  const users = useApi<Paginated<UserRow>>(can("hr.manage") ? "/users/" : null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ user: "", matricule: "", job_title: "", hire_date: "" });
  const [err, setErr] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await api("/hr/employees/", { method: "POST", body: form });
      setCreating(false);
      setForm({ user: "", matricule: "", job_title: "", hire_date: "" });
      employees.reload();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Échec");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-wagadu-brown">Effectif</h1>
        {can("hr.manage") && (
          <button className="btn-primary" onClick={() => setCreating((v) => !v)}>
            {creating ? "Annuler" : "Nouvelle fiche"}
          </button>
        )}
      </div>

      {creating && (
        <form onSubmit={create} className="card grid sm:grid-cols-2 gap-3">
          <select className="input" required value={form.user}
            onChange={(e) => setForm({ ...form, user: e.target.value })}>
            <option value="">— Compte utilisateur —</option>
            {users.data?.results.map((u) => <option key={u.id} value={u.id}>{u.email}</option>)}
          </select>
          <input className="input" placeholder="Matricule" required value={form.matricule}
            onChange={(e) => setForm({ ...form, matricule: e.target.value })} />
          <input className="input" placeholder="Poste" value={form.job_title}
            onChange={(e) => setForm({ ...form, job_title: e.target.value })} />
          <input type="date" className="input" value={form.hire_date}
            onChange={(e) => setForm({ ...form, hire_date: e.target.value })} />
          <div className="sm:col-span-2 flex gap-2 items-center">
            <button className="btn-primary">Créer</button>
            {err && <span className="text-sm text-wagadu-terracotta">{err}</span>}
          </div>
        </form>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-wagadu-brown">
            <tr><th className="py-2">Matricule</th><th>Nom</th><th>Poste</th><th>Type</th><th>Statut</th></tr>
          </thead>
          <tbody className="divide-y divide-wagadu-sand">
            {employees.data?.results.map((e) => (
              <tr key={e.id} className="hover:bg-wagadu-sand/30">
                <td className="py-2 font-mono text-xs">
                  <Link href={`/hr/employees/${e.id}`} className="text-wagadu-terracotta">{e.matricule}</Link>
                </td>
                <td>{e.full_name || e.email}</td>
                <td>{e.job_title || "—"}</td>
                <td>{e.employment_type}</td>
                <td><span className="badge bg-wagadu-sand">{e.hr_status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {employees.error && <p className="py-2 text-sm text-wagadu-terracotta">{employees.error}</p>}
      </div>
    </div>
  );
}
