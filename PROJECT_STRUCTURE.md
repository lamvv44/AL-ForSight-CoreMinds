# Project Structure

This document explains the purpose of the main files in AI ForeSight.

The project intentionally keeps the existing flat folder structure to preserve compatibility with the current startup command:

```powershell
python -m uvicorn main:app --reload
```

No core source files are moved or renamed.

## Backend Files

### `main.py`

FastAPI application entry point.

Responsibilities:

- Creates the FastAPI application.
- Loads company data from `data.json`.
- Defines the API endpoints.
- Calls `risk_engine.py` for risk scoring.
- Calls `ai_service.py` for AI-generated investigation content.
- Serves the static frontend files.

Important endpoints:

- `GET /companies`
- `GET /portfolio/summary`
- `GET /companies/{company_id}`
- `POST /analyze/{company_id}`

### `risk_engine.py`

Local business logic for risk analysis.

Responsibilities:

- Calculates risk indicators.
- Calculates the numeric risk score.
- Classifies the risk level as `High`, `Medium`, or `Low`.

This file contains the core risk methodology and should not be changed unless the calculation approach is intentionally updated.

### `ai_service.py`

Gemini AI service layer.

Responsibilities:

- Loads Gemini configuration using the existing environment-variable mechanism.
- Sends company and risk-analysis context to Gemini.
- Returns AI-generated investigation content.
- Returns a local fallback response if AI generation is unavailable.
- Preserves the response keys expected by the backend and frontend.

Gemini is used for narrative content only. The system risk engine remains responsible for risk score and risk level.

### `requirements.txt`

Lists Python dependencies required to run the backend:

- FastAPI
- Uvicorn
- Google Generative AI SDK

### `test_gemini.py`

Optional manual utility for checking Gemini connectivity during development or demonstration setup.

## Data File

### `data.json`

Synthetic dataset used by the project.

Contains:

- Company profile details
- Sector and city information
- Monthly sales activity
- Declared revenue
- Import values
- Invoice counts
- Sector benchmark values
- Activity notes

The backend reads this file directly when serving API requests.

## Frontend Files

### `index.html`

Main dashboard page.

Displays portfolio-level summaries and risk overview information.

### `companies.html`

Company list page.

Displays available companies and their calculated risk summaries.

### `company-details.html`

Company detail page.

Displays company information, calculated risk values, and detected indicators.

### `ai-investigation.html`

AI investigation page.

Displays the AI-generated summary, recommended actions, and structured investigation report.

### `styles.css`

Shared styling for all frontend pages.

Controls layout, colors, cards, buttons, tables, and responsive design.

### `app.js`

JavaScript for the dashboard page.

Fetches:

- `/companies`
- `/portfolio/summary`

### `companies.js`

JavaScript for the company list page.

Fetches:

- `/companies`

### `details.js`

JavaScript for the company details page.

Fetches:

- `/companies/{company_id}`
- `/analyze/{company_id}`

### `investigation.js`

JavaScript for the AI investigation report page.

Fetches:

- `/analyze/{company_id}`

## Configuration and Documentation

### `.env.example`

Example environment variable file showing the Gemini key variable name without exposing a real secret.

### `README.md`

Main project documentation for setup, running, API access, and project review.

### `PROJECT_STRUCTURE.md`

File-by-file explanation of the project structure.

## Execution Flow

```text
User opens frontend page
        |
        v
Frontend JavaScript calls FastAPI endpoint
        |
        v
main.py loads company data from data.json
        |
        v
risk_engine.py calculates risk score and indicators
        |
        v
ai_service.py generates AI narrative content when available
        |
        v
main.py returns the same JSON structure expected by the frontend
        |
        v
Frontend displays the result
```

## Compatibility Notes

- Startup command remains unchanged.
- API route names remain unchanged.
- JSON response structures remain unchanged.
- Frontend file references remain unchanged.
- Risk calculations remain unchanged.
- Gemini integration behavior remains unchanged.
