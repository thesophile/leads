# Migrate LEADS data → SystemSoft (server)

One-off migration that copies LEADS users, companies, and **staff (employees)**
into SystemSoft **on the production server**, then links the LEADS accounts to
their new SystemSoft identities.

- LEADS server: `leads` → `/home/newleadsprograme` (venv `/home/newleadsprograme/virtualenv/backend/3.13/bin/activate`)
- SystemSoft server: `core` → `/home/systemsoftprogra` (venv `/home/systemsoftprogra/virtualenv/backend/3.13/bin/activate`)
- LEADS prod DB: `newleadsprograme_leadsdb`
- SystemSoft prod DB: `systemsoftprogra_core_db`

> The commands below are idempotent (safe to re-run). Run them in order.

---

## Part 0 — Prerequisites

1. The new migration commands must exist on the servers. They are shipped via the
   normal backend deploy, which archives the **last committed version**, so
   **commit them first**:
   - LEADS: `backend/accounts/management/commands/export_core_staff.py` (new)
   - LEADS: `backend/accounts/management/commands/link_core_users.py` (updated)
   - SystemSoft: `backend/apps/users/management/commands/import_leads_staff.py` (new)

2. `AUTH_SIGNING_KEY` must be identical in both projects' `.env.prod` (it already is).

---

## Part 1 — Deploy the updated backends

**LEADS** (run from the `leads` repo root on your machine):

```bash
git archive HEAD backend -o backend.zip
scp backend.zip leads:/home/newleadsprograme/
ssh leads "cd /home/newleadsprograme && unzip -o backend.zip && rm backend.zip"
```

**SystemSoft** (run from the `system_core` repo root):

```bash
git archive HEAD backend -o backend.zip
scp backend.zip core:/home/systemsoftprogra/
ssh core "cd /home/systemsoftprogra && unzip -o backend.zip && rm backend.zip"
```

Make sure the SystemSoft schema is current:

```bash
ssh core "source /home/systemsoftprogra/virtualenv/backend/3.13/bin/activate && cd /home/systemsoftprogra/backend && python manage.py migrate"
```

> Shortcut (skip the full deploy and just copy the 3 command files) — from the
> `Systemsoft_suite` folder:
> ```bash
> scp leads/backend/accounts/management/commands/export_core_staff.py leads:/home/newleadsprograme/backend/accounts/management/commands/
> scp leads/backend/accounts/management/commands/link_core_users.py  leads:/home/newleadsprograme/backend/accounts/management/commands/
> scp system_core/backend/apps/users/management/commands/import_leads_staff.py core:/home/systemsoftprogra/backend/apps/users/management/commands/
> ```

---

## Part 2 — Run the migration

### Step 1 — LEADS: export users + companies

```bash
ssh leads "source /home/newleadsprograme/virtualenv/backend/3.13/bin/activate && cd /home/newleadsprograme/backend && python manage.py export_core_users --output /home/newleadsprograme/leads_users.json"
```

### Step 2 — LEADS: export staff

```bash
ssh leads "source /home/newleadsprograme/virtualenv/backend/3.13/bin/activate && cd /home/newleadsprograme/backend && python manage.py export_core_staff --output /home/newleadsprograme/leads_staff.json"
```

### Step 3 — Copy the two JSON files from LEADS to SystemSoft

```bash
scp leads:/home/newleadsprograme/leads_users.json .
scp leads:/home/newleadsprograme/leads_staff.json .
scp leads_users.json leads_staff.json core:/home/systemsoftprogra/
```

### Step 4 — SystemSoft: import users + create organizations (writes the id maps)

```bash
ssh core "source /home/systemsoftprogra/virtualenv/backend/3.13/bin/activate && cd /home/systemsoftprogra/backend && python manage.py import_leads_users --input /home/systemsoftprogra/leads_users.json --create-orgs --map-out /home/systemsoftprogra/users_map.json --org-map-out /home/systemsoftprogra/org_map.json"
```

### Step 5 — SystemSoft: import staff as memberships + employee records

```bash
ssh core "source /home/systemsoftprogra/virtualenv/backend/3.13/bin/activate && cd /home/systemsoftprogra/backend && python manage.py import_leads_staff --input /home/systemsoftprogra/leads_staff.json --org-map /home/systemsoftprogra/org_map.json"
```

### Step 6 — Copy the id maps from SystemSoft back to LEADS

```bash
scp core:/home/systemsoftprogra/users_map.json .
scp core:/home/systemsoftprogra/org_map.json .
scp users_map.json org_map.json leads:/home/newleadsprograme/
```

### Step 7 — LEADS: link local accounts/companies to the new SystemSoft ids

```bash
ssh leads "source /home/newleadsprograme/virtualenv/backend/3.13/bin/activate && cd /home/newleadsprograme/backend && python manage.py link_core_users --users-map /home/newleadsprograme/users_map.json --orgs-map /home/newleadsprograme/org_map.json"
```

---

## Part 3 — Verify

```bash
ssh core "source /home/systemsoftprogra/virtualenv/backend/3.13/bin/activate && cd /home/systemsoftprogra/backend && python manage.py shell -c 'from backend.apps.organizations.models import Organization; from backend.apps.employees.models import Employee; print([o.name for o in Organization.objects.all()]); print(Employee.objects.count())'"
```

Expected: the LEADS company names appear as organizations, and the employee count
matches the number of LEADS staff (staff without a linked login/company are
skipped).

To view them in the SystemSoft admin portal after switching organizations, the
frontend must also include the organization switcher (`src/admin/OrgSwitcher.jsx`)
— deploy the SystemSoft frontend as usual if it isn't there yet.

---

## Notes

- **Staff without a login/email are skipped** (they cannot be matched to a
  SystemSoft user). The command prints how many were skipped.
- An email that no longer matches between the two systems is also skipped and
  reported.
- If Step 7 fails with a duplicate `core_user_id` error on an older server, it
  means a prior run left stale ids; the updated `link_core_users` now clears
  those first, so simply re-running it resolves the conflict.
- No passwords are invented: LEADS password hashes are copied verbatim, so
  accounts that had unusable LEADS passwords keep that state and need a reset.
- The two JSON files (`leads_users.json`, `leads_staff.json`) and the id maps are
  transient artifacts; delete them from the servers once verification passes.
