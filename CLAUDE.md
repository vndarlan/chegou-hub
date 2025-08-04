# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Backend (Django + Django REST Framework)
- **Start development server**: `cd backend && python manage.py runserver`
- **Run migrations**: `cd backend && python manage.py migrate`
- **Create migrations**: `cd backend && python manage.py makemigrations`
- **Create superuser**: `cd backend && python manage.py createsuperuser`
- **Collect static files**: `cd backend && python manage.py collectstatic`
- **Database connection check**: `cd backend && python manage.py check_db`
- **Start RQ worker**: `cd backend && python manage.py rqworker`
- **RQ status**: `cd backend && python manage.py rq_status`
- **Clear RQ jobs**: `cd backend && python manage.py clear_rq_jobs`
- **Shell**: `cd backend && python manage.py shell`

### Frontend (React with Mantine UI + shadcn/ui)
- **Start development server**: `cd frontend && npm start`
- **Build for production**: `cd frontend && npm run build`
- **Run tests**: `cd frontend && npm test`
- **Install dependencies**: `cd frontend && npm install`

## Architecture Overview

### Project Structure
This is a full-stack web application with a Django REST API backend and React frontend, organized as a monorepo with feature-based architecture.

### Backend Architecture (Django)
- **Framework**: Django 5.2 with Django REST Framework
- **Database**: PostgreSQL (production) / SQLite (development fallback)
- **Task Queue**: Django-RQ with Redis for background processing
- **Authentication**: Django session-based authentication with CSRF protection
- **Deployment**: Railway with Gunicorn + WhiteNoise

#### Feature-Based Organization
Each feature is a separate Django app in `backend/features/`:
- `agenda/` - Company calendar and events
- `mapa/` - Geographic coverage mapping
- `engajamento/` - Employee engagement metrics
- `ia/` - AI projects and automation dashboard
- `novelties/` - Company news and updates
- `processamento/` - Data processing utilities
- `metricas_primecod/` - PRIMECOD metrics integration
- `metricas_ecomhub/` - ECOMHUB metrics integration  
- `metricas_dropi/` - DROPI MX metrics integration

#### Standard Feature Structure
Each feature follows the same pattern:
```
features/[feature_name]/
├── models.py          # Database models
├── views.py           # API endpoints
├── serializers.py     # DRF serializers
├── urls.py            # URL routing
├── admin.py           # Django admin config
├── apps.py            # App configuration
└── migrations/        # Database migrations
```

### Frontend Architecture (React)
- **Framework**: React 19.1 with React Router DOM
- **UI Libraries**: Mantine 7.x + shadcn/ui components (hybrid approach)
- **Styling**: Tailwind CSS with PostCSS
- **State Management**: React hooks and Context API
- **HTTP Client**: Axios with CSRF token management

#### Component Organization
- `components/ui/` - shadcn/ui base components
- `components/` - Shared application components
- `features/[feature_name]/` - Feature-specific page components
- `pages/` - Main application pages (Login, Workspace)

### Database Design
- **Core**: Uses Django's built-in User model for authentication
- **Features**: Each feature defines its own models as needed
- **Migrations**: Handled per-feature with Django's migration system

### API Design
- **Base URL**: `/api/`
- **Authentication**: Session-based with CSRF protection
- **Endpoints**: RESTful design with DRF ViewSets and APIViews
- **CORS**: Configured for production domains

### Background Processing
- **Queue System**: Django-RQ for asynchronous task processing
- **Redis**: Required for production queue backend
- **Worker Management**: Custom management commands for worker control
- **Logging**: Dedicated RQ logging configuration

### Security & CORS
- **CSRF Protection**: Enabled with trusted origins for production domains
- **CORS**: Configured for specific allowed origins
- **Session Security**: Secure cookies in production
- **Environment Variables**: Sensitive configuration externalized

### Development Workflow
1. Backend changes require running migrations if models are modified
2. Frontend uses hot reload during development
3. Database connection testing available via custom management command
4. Background tasks can be monitored via RQ management commands

### External Integrations
- **OpenAI**: AI functionality integration
- **Selenium Servers**: Web scraping for metrics collection
- **External APIs**: PRIMECOD, ECOMHUB, and DROPI integrations
- **PostgreSQL**: Primary database for production
- **Redis**: Task queue backend