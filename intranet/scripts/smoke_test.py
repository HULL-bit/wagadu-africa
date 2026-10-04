"""Smoke test end-to-end de Wagadu Hub via l'API HTTP live (phases 1-4)."""
import io
import sys
import urllib.error
import urllib.request
import json

BASE = "http://127.0.0.1:8009/api/v1"
PASS = "Wagadu2026!Hub"
ok = 0
fail = 0


def call(method, path, token=None, body=None, files=None, expect=None):
    url = BASE + path
    headers = {}
    data = None
    if files:
        boundary = "----wagadu"
        parts = []
        for k, v in (body or {}).items():
            parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n")
        for k, (fn, content) in files.items():
            parts.append(
                f"--{boundary}\r\nContent-Disposition: form-data; name=\"{k}\"; filename=\"{fn}\"\r\n"
                f"Content-Type: text/plain\r\n\r\n"
            )
        body_bytes = b""
        for k, v in (body or {}).items():
            body_bytes += f"--{boundary}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode()
        for k, (fn, content) in files.items():
            body_bytes += (
                f"--{boundary}\r\nContent-Disposition: form-data; name=\"{k}\"; filename=\"{fn}\"\r\n"
                f"Content-Type: text/plain\r\n\r\n"
            ).encode() + content + b"\r\n"
        body_bytes += f"--{boundary}--\r\n".encode()
        headers["Content-Type"] = f"multipart/form-data; boundary={boundary}"
        data = body_bytes
    elif body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(req)
        code = resp.status
        payload = resp.read()
    except urllib.error.HTTPError as e:
        code = e.code
        payload = e.read()
    try:
        parsed = json.loads(payload) if payload else None
    except Exception:
        parsed = payload[:200]
    return code, parsed


def check(label, cond, detail=""):
    global ok, fail
    if cond:
        ok += 1
        print(f"  \033[32mPASS\033[0m {label}")
    else:
        fail += 1
        print(f"  \033[31mFAIL\033[0m {label} — {detail}")


def login(email):
    code, data = call("POST", "/auth/login/", body={"email": email, "password": PASS})
    assert code == 200, (email, code, data)
    return data["access"]


print("== Phase 1 : auth, rôles, permissions, audit ==")
root = login("root@wagadu.africa")
check("login super admin", bool(root))

code, me = call("GET", "/auth/me/", root)
check("me → super admin", me.get("is_super_admin") is True, me)

code, roles = call("GET", "/roles/", root)
role_by_slug = {r["slug"]: r["id"] for r in roles["results"]}
check("4 rôles système", {"employe", "chef", "rh", "admin"} <= set(role_by_slug), role_by_slug)

code, dept = call("POST", "/departments/", root, {"name": "Programmes", "code": "prog"})
check("création département", code == 201, (code, dept))
dept_id = dept.get("id")

users = {}
for slug, email in [("chef", "chef@wagadu.africa"), ("employe", "agent@wagadu.africa"),
                    ("rh", "rh@wagadu.africa"), ("admin", "adm@wagadu.africa")]:
    code, u = call("POST", "/users/", root, {
        "email": email, "first_name": slug.title(), "role": role_by_slug[slug],
        "password": PASS, "department": dept_id,
    })
    check(f"création compte {slug}", code == 201, (code, u))
    users[slug] = u.get("id")

# rattacher l'agent au chef
call("PATCH", f"/users/{users['employe']}/", root, {"manager": users["chef"]})

chef = login("chef@wagadu.africa")
agent = login("agent@wagadu.africa")
rh = login("rh@wagadu.africa")
adm = login("adm@wagadu.africa")

code, _ = call("GET", "/users/", agent)
check("employé interdit sur /users/ (403)", code == 403, code)

code, _ = call("GET", "/audit/", adm)
check("admin accède au journal d'audit", code == 200, code)

code, ap = call("GET", "/audit/", agent)
check("employé interdit sur /audit/ (403)", code == 403, code)

code, eff = call("GET", f"/users/{users['chef']}/effective-permissions/", adm)
check("permissions effectives du chef incluent tasks.assign",
      eff.get("tasks.assign", {}).get("granted") is True, eff.get("tasks.assign"))

# exception individuelle : autoriser l'agent à diffuser
code, ov = call("POST", "/permission-overrides/", adm, {
    "user": users["employe"], "permission": None, "effect": "grant",
})  # permission id manquant -> doit échouer proprement
check("override sans permission → 400", code == 400, code)

print("\n== Phase 2 : RH & Courrier ==")
code, emp = call("POST", "/hr/employees/", rh, {
    "user": users["employe"], "matricule": "WAG-0001", "job_title": "Chargé de projet",
    "hire_date": "2025-01-06",
})
check("RH crée une fiche employé", code == 201, (code, emp))
emp_id = emp.get("id")

code, lt = call("GET", "/hr/leave-types/", agent)
annuel = next(t["id"] for t in lt["results"] if t["code"] == "annuel")
check("types de congés semés", code == 200 and annuel, code)

code, lr = call("POST", "/hr/leave-requests/", agent, {
    "leave_type": annuel, "start_date": "2026-10-05", "end_date": "2026-10-09", "reason": "Repos",
})
lr_id = lr.get("id")
check("employé crée une demande de congé", code == 201, (code, lr))

code, sub = call("POST", f"/hr/leave-requests/{lr_id}/submit/", agent)
check("soumission congé → in_review, 5 jours ouvrés",
      code == 200 and sub.get("status") == "in_review" and float(sub.get("working_days", 0)) == 5,
      (code, sub))

code, d1 = call("POST", f"/hr/leave-requests/{lr_id}/decide/", chef, {"decision": "approved"})
check("étape 1 (manager) approuve → reste in_review", d1.get("status") == "in_review", d1)

code, d2 = call("POST", f"/hr/leave-requests/{lr_id}/decide/", rh, {"decision": "approved"})
check("étape 2 (RH) approuve → approved", d2.get("status") == "approved", d2)

code, bal = call("GET", f"/hr/leave-balances/?employee={emp_id}", agent)
taken = float(bal["results"][0]["taken_days"]) if bal.get("results") else -1
check("solde décrémenté de 5 jours", taken == 5, bal)

code, other = call("POST", f"/hr/leave-requests/{lr_id}/decide/", login("adm@wagadu.africa"),
                   {"decision": "approved"})
check("re-décision sur congé clos → refus", code in (400, 403), code)

# Courrier
code, mail = call("POST", "/mail/", chef, {
    "direction": "incoming", "subject": "Partenariat reboisement",
    "correspondent": "Ministère Environnement", "mail_date": "2026-08-25",
})
mail_id = mail.get("id")
check("chef enregistre un courrier (réf. auto)",
      code == 201 and mail.get("reference", "").endswith(("-0001",)), (code, mail.get("reference")))

code, asg = call("POST", f"/mail/{mail_id}/assign/", chef, {"user": users["employe"]})
check("affectation courrier → statut assigned", asg.get("status") == "assigned", asg)

code, ack = call("POST", f"/mail/{mail_id}/acknowledge/", agent)
check("accusé de réception horodaté", code == 200 and len(ack.get("acknowledgements", [])) == 1, ack)

code, mv = call("GET", f"/mail/{mail_id}/", agent)
types = {e["type_display"] for e in mv.get("events", [])}
check("traçabilité courrier (enregistré/affecté/consulté/AR)",
      {"Enregistré", "Affecté", "Consulté"} <= types, types)

print("\n== Phase 3 : Tâches ==")
code, task = call("POST", "/tasks/", chef, {
    "title": "Rapport hebdo", "priority": "high",
    "due_at": "2026-09-04T17:00:00Z",
    "assignee_ids": [users["employe"]],
})
task_id = task.get("id")
check("chef crée + assigne une tâche", code == 201 and len(task.get("assignments", [])) == 1, (code, task))

code, denied = call("POST", "/tasks/", agent, {"title": "x"})
check("employé interdit de créer une tâche (403)", code == 403, code)

code, st = call("POST", f"/tasks/{task_id}/submit/", agent, {"report": "Fait", "declared_hours": 3})
check("soumission → tâche in_review", st.get("status") == "in_review", st)

code, dv = call("POST", f"/tasks/{task_id}/decide/", chef, {"user": users["employe"], "decision": "validated"})
check("validation → tâche done + closed", dv.get("status") == "done" and dv.get("closed_at"), dv)

code, perf = call("GET", "/tasks/performance/", chef)
check("tableau de bord performance (chef)", code == 200 and "completed" in perf, (code, perf))

code, perf2 = call("GET", "/tasks/performance/", agent)
check("performance interdite à l'employé (403)", code == 403, code)

print("\n== Phase 4 : Documents ==")
code, doc = call("POST", "/documents/", chef, body={"title": "Note de service"},
                 files={"file": ("note.txt", b"Reglement interieur - respect des communautes")})
doc_id = doc.get("id")
check("upload document (v1)", code == 201 and doc["current_version_detail"]["version_number"] == 1, (code, doc))

code, v2 = call("POST", f"/documents/{doc_id}/versions/", chef, body={"note": "corr."},
                files={"file": ("note2.txt", b"version 2")})
check("nouvelle version → v2, historique conservé",
      v2["current_version_detail"]["version_number"] == 2 and len(v2["versions"]) == 2, v2)

code, dist = call("POST", f"/documents/{doc_id}/distribute/", chef, {
    "mode": "selection", "user_ids": [users["employe"], users["rh"]], "message": "Pour info",
})
dist_id = dist.get("id")
check("diffusion ciblée (2 destinataires)", code == 201 and dist.get("total_count") == 2, (code, dist))

code, recv = call("GET", "/documents/received/", agent)
check("document apparaît dans « reçus » non lu",
      any(r["document_id"] == doc_id and r["is_read"] is False for r in recv), recv)

call("GET", f"/documents/{doc_id}/preview/", agent)  # marque lu
code, detail = call("GET", f"/document-distributions/{dist_id}/", chef)
check("suivi de lecture : 1/2 lu", detail.get("read_count") == 1, detail)

code, rem = call("POST", f"/document-distributions/{dist_id}/remind/", chef)
check("relance des non-lecteurs", rem.get("reminded") == 1, rem)

code, link = call("POST", f"/documents/{doc_id}/share-links/", chef, {"password": "secret", "max_downloads": 2})
token = link.get("token")
check("création lien de partage externe", code == 201 and token, (code, link))

code, meta = call("GET", f"/public/share/{token}/", None)
check("lien public accessible sans auth (mot de passe requis)",
      code == 200 and meta.get("password_required") is True, (code, meta))

code, bad = call("POST", f"/public/share/{token}/", None, {"password": "nope"})
check("mauvais mot de passe → 403", code == 403, code)

code, dl = call("POST", f"/public/share/{token}/", None, {"password": "secret"})
check("téléchargement externe OK avec mot de passe", code == 200, code)

# recherche full-text (icontains en sqlite)
code, sr = call("GET", "/documents/?search=communautes", chef)
check("recherche « contenu » (texte extrait)", sr.get("count", 0) >= 1, sr)

# corbeille
call("DELETE", f"/documents/{doc_id}/", chef)
code, trash = call("GET", "/documents/?trashed=true", chef)
check("document en corbeille", any(d["id"] == doc_id for d in trash.get("results", [])), trash)
call("POST", f"/documents/{doc_id}/restore/", chef)
code, live = call("GET", "/documents/", chef)
check("restauration depuis la corbeille", any(d["id"] == doc_id for d in live.get("results", [])), live)

print("\n== Phase 5 : Agenda, Réunions, Messagerie ==")
import datetime as _dt

_start = _dt.datetime.now(_dt.timezone.utc)
_end = _start + _dt.timedelta(days=30)

code, ev = call("POST", "/agenda/events/", agent, {
    "title": "RDV projet",
    "start": (_start + _dt.timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%S"),
    "end": (_start + _dt.timedelta(days=1, hours=1)).strftime("%Y-%m-%dT%H:%M:%S"),
    "attendee_ids": [users["chef"]],
    "reminders": [{"minutes_before": 30, "channel": "notification"}],
})
check("création d'un évènement d'agenda avec invité", code == 201, (code, ev))

code, resp = call("POST", f"/agenda/events/{ev['id']}/respond/", chef, {"response": "accepted"})
check("confirmation de présence à un évènement", resp.get("my_response") == "accepted", resp)

code, mtg = call("POST", "/meetings/", chef, {
    "title": "Comité hebdo",
    "start": (_start + _dt.timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%S"),
    "end": (_start + _dt.timedelta(days=1, hours=1)).strftime("%Y-%m-%dT%H:%M:%S"),
    "agenda": "1. Budget\n2. Terrain",
    "participant_ids": [users["employe"]],
})
mtg_id = mtg.get("id")
check("planification d'une réunion (lien Jitsi auto)",
      code == 201 and mtg.get("join_url", "").endswith(mtg.get("room_slug", "x")), (code, mtg))

code, joininfo = call("GET", f"/meetings/{mtg_id}/join/", agent)
check("participant peut rejoindre (Jitsi non configuré → lien simple)",
      code == 200 and joininfo.get("jwt") is None and joininfo.get("configured") is False, joininfo)

code, joindenied = call("GET", f"/meetings/{mtg_id}/join/", rh)
check("réunion sur invitation → tiers refusé", code in (403, 404), code)

code, poll = call("POST", "/meeting-polls/", chef, {
    "meeting": mtg_id, "question": "Créneau ?", "option_labels": ["09h", "14h"],
})
check("sondage de réunion créé", code == 201 and len(poll.get("options", [])) == 2, (code, poll))
opt_id = poll["options"][1]["id"]
code, voted = call("POST", f"/meeting-polls/{poll['id']}/vote/", agent, {"option": opt_id})
check("vote au sondage (choix unique)",
      sum(o["vote_count"] for o in voted.get("options", [])) == 1, voted)

code, closed = call("POST", f"/meetings/{mtg_id}/close/", chef, {"minutes": "Décisions : créneau 14h."})
check("clôture de réunion + compte-rendu", closed.get("status") == "ended", closed)

code, feed = call("GET",
    f"/agenda/?start={_start.strftime('%Y-%m-%dT%H:%M:%S')}&end={_end.strftime('%Y-%m-%dT%H:%M:%S')}", agent)
ftypes = {i["type"] for i in feed} if isinstance(feed, list) else set()
check("feed agenda fusionne évènements + tâches + réunions",
      {"meeting"} <= ftypes and isinstance(feed, list), ftypes)

code, ics = call("GET", "/agenda/export.ics", agent)
ics_text = ics.decode() if isinstance(ics, bytes) else str(ics)
check("export iCal", "BEGIN:VCALENDAR" in ics_text, ics_text[:40])

code, st = call("GET", "/integrations/status/", agent)
check("statut des intégrations (RC/Jitsi non configurés)",
      st.get("rocketchat", {}).get("configured") is False, st)

code, sso = call("POST", "/chat/sso/", agent, {})
check("SSO messagerie → 503 tant que Rocket.Chat non configuré", code == 503, code)

print("\n== Phase 6 : Demandes, exports, compléments ==")
code, rtypes = call("GET", "/request-types/", agent)
achat_id = next(t["id"] for t in rtypes["results"] if t["code"] == "achat")
check("3 types de demande semés", {t["code"] for t in rtypes["results"]} == {"achat", "mission", "remboursement"}, rtypes)

code, dem = call("POST", "/requests/", agent, {
    "type": achat_id, "title": "Achat de 2 PC portables",
    "data": {"designation": "PC portable", "quantite": 2, "montant_estime": 900000, "justification": "Renouvellement du parc"},
})
dem_id = dem.get("id")
check("création d'une demande (référence DEM-)", code == 201 and dem.get("reference", "").startswith("DEM-"), (code, dem))

code, dsub = call("POST", f"/requests/{dem_id}/submit/", agent)
check("soumission demande → in_review", dsub.get("status") == "in_review", dsub)

# agent a pour manager 'chef' (défini en Phase 1) -> étape 1 = chef
code, dd1 = call("POST", f"/requests/{dem_id}/decide/", chef, {"decision": "approved"})
check("étape 1 (responsable) approuve", dd1.get("status") == "in_review", dd1)
code, dd2 = call("POST", f"/requests/{dem_id}/decide/", adm, {"decision": "approved"})
check("étape 2 (administration) approuve → approved", dd2.get("status") == "approved", dd2)

code, badsubmit = call("POST", "/requests/", agent, {"type": achat_id, "title": "Incomplet", "data": {"designation": "x"}})
code, bs = call("POST", f"/requests/{badsubmit['id']}/submit/", agent)
check("soumission bloquée si champ obligatoire manquant", code == 400, code)

# Annonces
code, ann = call("POST", "/announcements/", adm, {"title": "Séminaire annuel", "body": "Le 15 octobre", "pinned": True})
check("admin publie une annonce épinglée", code == 201, (code, ann))
code, annfeed = call("GET", "/announcements/", agent)
check("annonce visible dans le fil", any(a["id"] == ann["id"] for a in annfeed["results"]), annfeed)
code, _anndenied = call("POST", "/announcements/", agent, {"title": "x", "body": "y"})
check("employé ne peut pas publier d'annonce", code == 403, code)

# Sondage interne
code, poll = call("POST", "/polls/", chef, {"question": "Lieu du prochain atelier ?", "option_labels": ["Dakar", "Thiès"]})
check("création d'un sondage interne", code == 201 and len(poll.get("options", [])) == 2, (code, poll))
code, pv = call("POST", f"/polls/{poll['id']}/vote/", agent, {"option": poll["options"][0]["id"]})
check("vote au sondage interne", sum(o["vote_count"] for o in pv.get("options", [])) == 1, pv)

# Exports
code, catalog = call("GET", "/reports/", adm)
check("catalogue de rapports filtré par permission",
      {"mail", "requests", "audit"} <= {d["key"] for d in catalog}, catalog)
code, xlsx = call("GET", "/reports/requests.xlsx", adm)
xb = xlsx if isinstance(xlsx, bytes) else str(xlsx).encode()
check("export XLSX du registre des demandes", xb[:2] == b"PK", xb[:8])
code, pdf = call("GET", "/reports/audit.pdf", root)
pb = pdf if isinstance(pdf, bytes) else str(pdf).encode()
check("export PDF du journal d'audit", pb[:4] == b"%PDF", pb[:8])
code, xdenied = call("GET", "/reports/audit.xlsx", agent)
check("export refusé sans permission", code == 403, code)

# Recherche globale
code, sr = call("GET", "/search/?q=PC%20portables", agent)
check("recherche globale trouve la demande",
      any(r["type"] == "request" for r in sr.get("results", [])), sr)

# Export RGPD
code, myexport = call("GET", "/auth/me/export/", agent)
has_keys = isinstance(myexport, dict) and "account" in myexport and "requests" in myexport
check("export RGPD des données personnelles", code == 200 and has_keys,
      list(myexport)[:6] if isinstance(myexport, dict) else str(myexport)[:60])

print("\n== Phase 7 Lot A : onboarding / offboarding / évaluations ==")
# une fiche employé a été créée en Phase 2 (emp_id) -> onboarding auto-généré
code, procs = call("GET", f"/hr/lifecycle-processes/?employee={emp_id}&kind=onboarding", rh)
onb = procs["results"][0] if procs.get("results") else {}
check("onboarding auto-généré à la création de la fiche employé",
      onb.get("kind") == "onboarding" and onb.get("progress", {}).get("total", 0) >= 10, procs)

# l'agent coche un item dont il est responsable
own = next((i for i in onb.get("items", []) if i["responsible_role"] == "employee"), None)
code, toggled = call("POST", f"/hr/lifecycle-items/{own['id']}/toggle/", agent, {"done": True})
check("l'employé coche un item de sa checklist d'intégration",
      toggled.get("progress", {}).get("done", 0) >= 1, toggled)

# campagne d'évaluation
code, forms = call("GET", "/hr/evaluation-forms/", rh)
form_id = forms["results"][0]["id"]
code, camp = call("POST", "/hr/evaluation-campaigns/", rh, {
    "name": "Évaluation test", "form": form_id,
    "period_start": "2026-01-01", "period_end": "2026-12-31",
})
camp_id = camp.get("id")
check("RH crée une campagne d'évaluation", code == 201, (code, camp))

code, opened = call("POST", f"/hr/evaluation-campaigns/{camp_id}/open/", rh)
check("ouverture de campagne → statut open", opened.get("status") == "open", opened)

code, mine_ev = call("GET", "/hr/evaluations/mine/", agent)
ev_id = mine_ev[0]["id"] if mine_ev else None
check("une évaluation est générée pour l'employé", bool(ev_id), mine_ev)

rating_qs = [q["id"] for q in mine_ev[0]["questions"] if q["type"] == "rating_1_5"]
code, sa = call("POST", f"/hr/evaluations/{ev_id}/self-assess/", agent,
                {"answers": {str(q): "4" for q in rating_qs}})
check("auto-évaluation → score calculé", sa.get("status") == "self_assessed" and float(sa.get("self_score") or 0) == 4.0, sa)

code, ma = call("POST", f"/hr/evaluations/{ev_id}/manager-assess/", chef,
                {"answers": {str(q): "3" for q in rating_qs}})
check("évaluation du responsable (manager = chef de l'agent)",
      ma.get("status") == "manager_assessed" and float(ma.get("manager_score") or 0) == 3.0, ma)

code, ack = call("POST", f"/hr/evaluations/{ev_id}/acknowledge/", agent, {})
check("prise de connaissance par l'employé", ack.get("status") == "acknowledged", ack)

code, fin = call("POST", f"/hr/evaluations/{ev_id}/finalize/", rh)
check("finalisation RH → évènement de carrière créé", fin.get("status") == "finalized", fin)

print("\n== Dashboard & audit ==")
code, dash = call("GET", "/dashboard/", chef)
check("dashboard chef : widgets présents",
      code == 200 and "administration" not in dash["widgets"] and "shortcuts" in dash, dash.get("widgets"))

code, dash_adm = call("GET", "/dashboard/", adm)
check("dashboard admin : widget administration", "administration" in dash_adm["widgets"], dash_adm["widgets"])

code, audit = call("GET", "/audit/?module=hr", adm)
check("journal d'audit contient des entrées RH", audit.get("count", 0) > 0, audit.get("count"))

code, audit_crit = call("GET", "/audit/?severity=critical", root)
check("entrées critiques tracées (création admin, override…)", audit_crit.get("count", 0) > 0, audit_crit.get("count"))

print(f"\n{'='*50}\n  {ok} PASS / {fail} FAIL\n{'='*50}")
sys.exit(1 if fail else 0)
