
## Installation

```
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

## Run

Backend
```
$env:ENV = "dev"
cd $root/backend
venv\Scripts\activate
Python manage.py runserver 8002
```

frontend
```
cd $root/frontend
npm run dev -- --mode dev
```


---
migrate
```
$env:ENV = "dev"
cd ~\Desktop\Codebase\Systemsoft_suite\leads\backend
venv\Scripts\activate
Python manage.py migrate
```
## Deploy

> [!NOTE]
> Backend Deployment works from last committed version

```
$rootFile = ".leads_root"

$dir = Get-Item (Get-Location)

while ($dir -and -not (Test-Path (Join-Path $dir.FullName $rootFile))) {
    $dir = $dir.Parent
}

if (-not $dir) {
    throw "Could not find $rootFile"
}

$root = $dir.FullName

```

Backend
```
cd $root
git archive HEAD backend -o backend.zip
scp backend.zip leads:/home/newleadsprograme/
ssh leads "cd /home/newleadsprograme && unzip -o backend.zip && rm backend.zip"
ssh leads "source /home/newleadsprograme/virtualenv/backend/3.13/bin/activate && cd /home/newleadsprograme/backend && python manage.py migrate"
```

Frontend
```
cd $root/frontend
npm run build -- --mode prod
ssh leads "rm -rf ~/public_html/assets"
scp -r .\dist\* leads:/home/newleadsprograme/public_html/
scp .\dist\.htaccess leads:/home/newleadsprograme/public_html/
ssh leads "chmod -R 755 ~/public_html/assets && chmod 755 ~/public_html/v1"
```


---

### Preview

Preview confirmation mail
```
python manage.py shell -c "import django; from transactions.services import build_quotation_accepted_email; from transactions.models import Quotation; q=Quotation.objects.exclude(client_status='Accepted').first(); e=build_quotation_accepted_email(q); open('preview.html','w',encoding='utf-8').write(e.alternatives[0][0]); print(e.subject)"
```


# SQL

## Delete leads through SQL

Get the lead id
ex: LD-003664-V2

Step 1: Inspect the records first (sanity check)
```sql
-- Check the versions for this lead
SELECT id, lead_id, version_no, status, superseded_at 
FROM transactions_quotation 
WHERE lead_id = 'LD-003664';
-- Check if any order was already converted from this version
SELECT id, lead_id, proposal_no 
FROM transactions_order 
WHERE proposal_no = 'LD-003664-V2';
```

Step 2: Delete associated approvals (if any exist)
The QuotationApproval
 table has a foreign key to transactions_quotation. To avoid foreign key constraint errors:

```sql
DELETE FROM transactions_quotationapproval 
WHERE quotation_id = 'LD-003664-V2';
```

Step 3: Delete the version row
```sql
DELETE FROM transactions_quotation 
WHERE id = 'LD-003664-V2';
```

Step 4 (Optional): Restore version 1 if it was marked superseded
If ARA-2026-6563-V2 had been accepted by a client, version 1 might have had superseded_at set. You can clear it if needed:

```sql
UPDATE transactions_quotation 
SET superseded_at = NULL 
WHERE id = 'LD-003664';
```