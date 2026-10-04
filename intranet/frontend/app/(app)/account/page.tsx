"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";

const TEXT_FIELDS = [
  ["first_name", "Prénom"],
  ["last_name", "Nom"],
  ["job_title", "Fonction / intitulé de poste"],
  ["phone", "Téléphone"],
  ["secondary_email", "E-mail secondaire"],
  ["emergency_contact", "Contact d'urgence"],
  ["bank_account", "RIB / IBAN"],
] as const;

const SOCIAL_FIELDS = [
  ["linkedin_url", "LinkedIn", "https://www.linkedin.com/in/…"],
  ["twitter_url", "X / Twitter", "https://x.com/…"],
  ["facebook_url", "Facebook", "https://facebook.com/…"],
  ["website_url", "Site web", "https://…"],
  ["whatsapp", "WhatsApp", "+221 …"],
] as const;

type FormKey =
  | (typeof TEXT_FIELDS)[number][0]
  | (typeof SOCIAL_FIELDS)[number][0]
  | "bio"
  | "preferred_language";

export default function AccountPage() {
  const { me, refreshMe } = useAuth();
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [form, setForm] = useState<Record<FormKey, string>>(() => ({
    first_name: me?.first_name ?? "",
    last_name: me?.last_name ?? "",
    job_title: me?.job_title ?? "",
    phone: me?.phone ?? "",
    secondary_email: me?.secondary_email ?? "",
    emergency_contact: me?.emergency_contact ?? "",
    bank_account: me?.bank_account ?? "",
    linkedin_url: me?.linkedin_url ?? "",
    twitter_url: me?.twitter_url ?? "",
    facebook_url: me?.facebook_url ?? "",
    website_url: me?.website_url ?? "",
    whatsapp: me?.whatsapp ?? "",
    bio: me?.bio ?? "",
    preferred_language: me?.preferred_language ?? "fr",
  }));
  const [pwd, setPwd] = useState({ current_password: "", new_password: "" });

  const set = (k: FormKey, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    try {
      const file = fileRef.current?.files?.[0];
      if (file) {
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => fd.append(k, v));
        fd.append("avatar", file);
        await api("/auth/me/", { method: "PATCH", body: fd });
      } else {
        await api("/auth/me/", { method: "PATCH", body: form });
      }
      if (fileRef.current) fileRef.current.value = "";
      setPreview(null);
      await refreshMe();
      setMsg("Profil mis à jour.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Échec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await api("/auth/change-password/", { method: "POST", body: pwd });
      setPwd({ current_password: "", new_password: "" });
      setMsg("Mot de passe modifié.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Échec.");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-wagadu-brown">Mon compte</h1>
      {msg && <p className="text-sm text-wagadu-terracotta">{msg}</p>}

      <form onSubmit={saveProfile} className="card space-y-5">
        {/* Photo de profil */}
        <div className="flex items-center gap-4">
          {preview ? (
            <img src={preview} alt="" className="avatar" style={{ width: 72, height: 72 }} />
          ) : (
            <Avatar user={me} size={72} />
          )}
          <div>
            <p className="label mb-1">Photo de profil</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="text-sm"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setPreview(f ? URL.createObjectURL(f) : null);
              }}
            />
            <p className="text-xs opacity-60 mt-1">JPEG ou PNG, 2 Mo maximum.</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          {TEXT_FIELDS.map(([k, label]) => (
            <div key={k}>
              <label className="label" htmlFor={k}>{label}</label>
              <input id={k} className="input" value={form[k]}
                onChange={(e) => set(k, e.target.value)} />
            </div>
          ))}
          <div>
            <label className="label" htmlFor="lang">Langue</label>
            <select id="lang" className="input" value={form.preferred_language}
              onChange={(e) => set("preferred_language", e.target.value)}>
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="bio">Présentation (280 caractères)</label>
          <textarea id="bio" className="input" rows={2} maxLength={280} value={form.bio}
            onChange={(e) => set("bio", e.target.value)} />
        </div>

        <div>
          <p className="label">Réseaux & contact public</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {SOCIAL_FIELDS.map(([k, label, ph]) => (
              <div key={k}>
                <label className="label" htmlFor={k}>{label}</label>
                <input id={k} className="input" placeholder={ph} value={form[k]}
                  onChange={(e) => set(k, e.target.value)} />
              </div>
            ))}
          </div>
        </div>

        <button className="btn-primary" disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </form>

      <form onSubmit={changePassword} className="card space-y-3">
        <p className="label">Changer de mot de passe</p>
        <input type="password" className="input" placeholder="Mot de passe actuel"
          autoComplete="current-password" value={pwd.current_password}
          onChange={(e) => setPwd({ ...pwd, current_password: e.target.value })} />
        <input type="password" className="input" placeholder="Nouveau mot de passe"
          autoComplete="new-password" value={pwd.new_password}
          onChange={(e) => setPwd({ ...pwd, new_password: e.target.value })} />
        <button className="btn-primary">Mettre à jour</button>
      </form>

      <div className="card space-y-2">
        <p className="label">Double authentification (2FA)</p>
        <p className="text-sm">
          Statut : {me?.is_2fa_enabled ? "activée" : "désactivée"}.
        </p>
        <TwoFactor enabled={!!me?.is_2fa_enabled} onChange={refreshMe} />
      </div>

      <div className="card space-y-2">
        <p className="label">Mes données personnelles</p>
        <p className="text-sm opacity-70">
          Téléchargez l&apos;ensemble des données vous concernant détenues par la plateforme (format JSON).
        </p>
        <button type="button" className="btn-ghost" onClick={exportMyData}>Exporter mes données</button>
      </div>
    </div>
  );

  async function exportMyData() {
    const { tokenStore } = await import("@/lib/api");
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1";
    const res = await fetch(`${base}/auth/me/export/`, {
      headers: { Authorization: `Bearer ${tokenStore.access}` },
    });
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = "mes-donnees-wagadu-hub.json";
    a.click();
    URL.revokeObjectURL(url);
  }
}

function TwoFactor({ enabled, onChange }: { enabled: boolean; onChange: () => Promise<void> }) {
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function start() {
    const r = await api<{ secret: string; otpauth_uri: string }>("/auth/2fa/enable/", { method: "POST", body: {} });
    setSecret(r.secret);
  }
  async function verify() {
    try {
      await api("/auth/2fa/verify/", { method: "POST", body: { code } });
      setSecret(null);
      setCode("");
      await onChange();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Code invalide");
    }
  }
  async function disable() {
    await api("/auth/2fa/disable/", { method: "POST", body: { code } });
    setCode("");
    await onChange();
  }

  if (enabled) {
    return (
      <div className="flex gap-2 items-end">
        <input className="input font-mono w-32" placeholder="Code" value={code}
          onChange={(e) => setCode(e.target.value)} />
        <button type="button" className="btn-ghost" onClick={disable}>Désactiver</button>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {!secret ? (
        <button type="button" className="btn-primary" onClick={start}>Activer la 2FA</button>
      ) : (
        <>
          <p className="text-sm">Clé à saisir dans votre application d&apos;authentification :</p>
          <code className="badge bg-wagadu-sand font-mono">{secret}</code>
          <div className="flex gap-2 items-end">
            <input className="input font-mono w-32" placeholder="Code" value={code}
              onChange={(e) => setCode(e.target.value)} />
            <button type="button" className="btn-primary" onClick={verify}>Valider</button>
          </div>
        </>
      )}
      {msg && <p className="text-sm text-wagadu-terracotta">{msg}</p>}
    </div>
  );
}
