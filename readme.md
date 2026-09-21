
## INstallation

```
venv\Scripts\activate
pip install -r requirements.txt
```

## Run

Backend
```
$env:ENV = "dev"
cd ~\Desktop\Codebase\leads\backend
venv\Scripts\activate
Python manage.py runserver
```

frontend
```
cd ~\Desktop\Codebase\leads\frontend
npm run dev -- --mode dev
```


---
migrate
```
$env:ENV = "dev"
cd ~\Desktop\Codebase\leads\backend
venv\Scripts\activate
Python manage.py migrate
```
## Deploy

Backend
```
cd ~\Desktop\Codebase\leads
git archive HEAD backend -o backend.zip
scp backend.zip leads:/home/newleadsprograme/
ssh leads "cd /home/newleadsprograme && unzip -o backend.zip && rm backend.zip"
ssh leads "source /home/newleadsprograme/virtualenv/backend/3.13/bin/activate && cd /home/newleadsprograme/backend && python manage.py migrate"
```

Frontend
```
cd ~\Desktop\Codebase\leads\frontend
npm run build -- --mode prod
ssh leads "rm -rf ~/public_html/assets"
scp -r .\dist\* leads:/home/newleadsprograme/public_html/
scp .\dist\.htaccess leads:/home/newleadsprograme/public_html/
ssh leads "chmod -R 755 ~/public_html/assets && chmod 755 ~/public_html/v1"
```



### Preview

Preview confirmation mail
```
python manage.py shell -c "import django; from transactions.services import build_quotation_accepted_email; from transactions.models import Quotation; q=Quotation.objects.exclude(client_status='Accepted').first(); e=build_quotation_accepted_email(q); open('preview.html','w',encoding='utf-8').write(e.alternatives[0][0]); print(e.subject)"
```