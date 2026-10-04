# Scripts

## `smoke_test.py`

Test de bout en bout de l'API live (phases 1 à 6 + Phase 7 lot A) :
authentification, rôles & permissions, journal d'audit, congés (circuit
manager→RH), courrier, tâches, documents (diffusion, suivi de lecture, liens
externes, corbeille, signature), agenda & feed unifié, réunions Jitsi + sondages,
statut des intégrations, demandes transverses (circuit manager→admin), annonces,
sondages internes, exports XLSX/PDF, recherche globale, export RGPD, onboarding /
offboarding, cycle complet d'évaluation de performance.

```bash
cd backend
rm -f db.sqlite3
USE_SQLITE=1 python manage.py migrate
USE_SQLITE=1 python manage.py createsuperadmin --noinput \
  --email root@wagadu.africa --password 'Wagadu2026!Hub'
USE_SQLITE=1 DJANGO_SETTINGS_MODULE=wagadu.settings.dev \
  python manage.py runserver 127.0.0.1:8009 --noreload &

python ../scripts/smoke_test.py
```

Sortie attendue : `86 PASS / 0 FAIL`.
