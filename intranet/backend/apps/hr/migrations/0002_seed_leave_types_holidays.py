"""Types de congés de base + jours fériés du Sénégal (année courante et suivante).

Les dates fériées mobiles (fêtes musulmanes, Lundi de Pâques, Ascension,
Pentecôte) varient chaque année : le RH complète/corrige la table via l'admin.
"""
import datetime

from django.db import migrations


LEAVE_TYPES = [
    ("annuel", "Congé annuel", 30, True, False, "#F6BB24"),
    ("maladie", "Congé maladie", 0, True, True, "#D2812E"),
    ("maternite", "Congé de maternité", 98, True, True, "#6E3C13"),
    ("paternite", "Congé de paternité", 1, True, False, "#6E3C13"),
    ("exceptionnel", "Congé exceptionnel / évènement familial", 0, True, False, "#4A2A12"),
    ("sans_solde", "Congé sans solde", 0, False, False, "#1E0F04"),
]


def _fixed_holidays(year):
    return [
        (datetime.date(year, 1, 1), "Jour de l'An"),
        (datetime.date(year, 4, 4), "Fête de l'Indépendance"),
        (datetime.date(year, 5, 1), "Fête du Travail"),
        (datetime.date(year, 8, 15), "Assomption"),
        (datetime.date(year, 11, 1), "Toussaint"),
        (datetime.date(year, 12, 25), "Noël"),
    ]


def seed(apps, schema_editor):
    LeaveType = apps.get_model("hr", "LeaveType")
    PublicHoliday = apps.get_model("hr", "PublicHoliday")

    for code, label, quota, paid, cert, color in LEAVE_TYPES:
        LeaveType.objects.update_or_create(
            code=code,
            defaults={
                "label": label, "annual_quota_days": quota, "paid": paid,
                "requires_certificate": cert, "color": color, "is_active": True,
            },
        )

    current_year = datetime.date.today().year
    for year in (current_year, current_year + 1):
        for date, label in _fixed_holidays(year):
            PublicHoliday.objects.get_or_create(date=date, defaults={"label": label})


def unseed(apps, schema_editor):
    apps.get_model("hr", "LeaveType").objects.filter(
        code__in=[c for c, *_ in LEAVE_TYPES]
    ).delete()


class Migration(migrations.Migration):
    dependencies = [("hr", "0001_initial")]
    operations = [migrations.RunPython(seed, unseed)]
