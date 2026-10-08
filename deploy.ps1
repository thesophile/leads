function Run-Backend {
    Set-Location "$root/backend"

    $env:ENV = "dev"

    & ".\venv\Scripts\Activate.ps1"

    python manage.py runserver 8002
}


function Run-Frontend {
    Set-Location "$root/frontend"

    npm run dev -- --mode dev
}


switch ($args[0]) {

    "backend" {
        if (-not (Deploy-Backend)) {
            exit 1
        }
    }

    "frontend" {
        if (-not (Deploy-Frontend)) {
            exit 1
        }
    }

    "full" {
        if (-not (Deploy-Backend)) {
            Write-Host "Backend failed. Frontend will NOT be deployed." -ForegroundColor Red
            exit 1
        }

        if (-not (Deploy-Frontend)) {
            Write-Host "Frontend failed." -ForegroundColor Red
            exit 1
        }

        Write-Host ""
        Write-Host "Full deployment succeeded." -ForegroundColor Green
    }

    "run-backend" {
        Run-Backend
    }

    "run-frontend" {
        Run-Frontend
    }

    default {
        Write-Host "Usage:"
        Write-Host "  .\deploy.ps1 backend"
        Write-Host "  .\deploy.ps1 frontend"
        Write-Host "  .\deploy.ps1 full"
        Write-Host "  .\deploy.ps1 run-backend"
        Write-Host "  .\deploy.ps1 run-frontend"
        exit 1
    }
}