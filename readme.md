
## INstallation

```
venv\Scripts\activate
pip install -r requirements.txt
```

## Run

frontend
```
cd ~\Desktop\Codebase\leads\frontend
npm run dev -- --mode dev
```

Backend
```
cd ~\Desktop\Codebase\leads\backend
venv\Scripts\activate
Python manage.py runserver
```



### Preview

Preview confirmation mail
```
python manage.py shell -c "import django; from transactions.services import build_quotation_accepted_email; from transactions.models import Quotation; q=Quotation.objects.exclude(client_status='Accepted').first(); e=build_quotation_accepted_email(q); open('preview.html','w',encoding='utf-8').write(e.alternatives[0][0]); print(e.subject)"
```