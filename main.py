from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from ai_service import generate_ai_investigation
from risk_engine import analyze_company


BASE_DIR = Path(__file__).resolve().parent
DATA_FILE = BASE_DIR / "data.json"

app = FastAPI(title="AI ForeSight Demo API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_data() -> list[dict[str, Any]]:
    if not DATA_FILE.exists():
        raise HTTPException(status_code=500, detail="data.json was not found.")

    with DATA_FILE.open("r", encoding="utf-8") as file:
        return json.load(file)


def find_company(company_id: str) -> dict[str, Any]:
    for company in load_data():
        if company["company_id"] == company_id:
            return company
    raise HTTPException(status_code=404, detail="Company not found.")


@app.get("/companies")
def get_companies() -> list[dict[str, Any]]:
    companies = load_data()
    summaries = []
    for company in companies:
        analysis = analyze_company(company)
        top_indicator = next(
            (
                indicator["label"]
                for indicator in analysis["risk_indicators"]
                if indicator["severity"] in {"High", "Medium"}
            ),
            analysis["risk_indicators"][0]["label"],
        )
        summaries.append(
            {
                "company_id": company["company_id"],
                "company_name": company["company_name"],
                "commercial_registration_number": company["commercial_registration_number"],
                "sector": company["sector"],
                "city": company["city"],
                "company_size": company["company_size"],
                "risk_profile": company["risk_profile"],
                "risk_score": analysis["risk_score"],
                "risk_level": analysis["risk_level"],
                "top_indicator": top_indicator,
            }
        )
    return summaries


@app.get("/portfolio/summary")
def get_portfolio_summary() -> dict[str, Any]:
    companies = load_data()
    analyzed_companies = []
    month_labels = [month["month"] for month in companies[0]["monthly_activity"]] if companies else []

    for company in companies:
        analyzed_companies.append({**company, "analysis": analyze_company(company)})

    risk_counts = {"High": 0, "Medium": 0, "Low": 0}
    for company in analyzed_companies:
        risk_counts[company["analysis"]["risk_level"]] += 1

    monthly_trend = []
    for month_index, month_label in enumerate(month_labels):
        monthly_scores = []
        for company in companies:
            monthly_company = {
                **company,
                "monthly_activity": [company["monthly_activity"][month_index]],
            }
            monthly_scores.append(analyze_company(monthly_company)["risk_score"])

        monthly_trend.append(
            {
                "month": month_label,
                "average_risk_score": round(sum(monthly_scores) / len(monthly_scores), 1),
            }
        )

    return {
        "total_companies": len(companies),
        "risk_distribution": risk_counts,
        "risk_percentages": {
            level: round((count / len(companies)) * 100, 1) if companies else 0
            for level, count in risk_counts.items()
        },
        "monthly_risk_trend": monthly_trend,
    }


@app.get("/companies/{company_id}")
def get_company(company_id: str) -> dict[str, Any]:
    return find_company(company_id)


@app.post("/analyze/{company_id}")
def analyze(company_id: str) -> dict[str, Any]:
    company = find_company(company_id)
    analysis = analyze_company(company)
    ai_output = generate_ai_investigation(company, analysis)

    return {
        "company_id": company["company_id"],
        "company_name": company["company_name"],
        "risk_score": analysis["risk_score"],
        "risk_level": analysis["risk_level"],
        "risk_indicators": analysis["risk_indicators"],
        "ai_summary": ai_output["ai_summary"],
        "recommended_actions": ai_output["recommended_actions"],
        "investigation_report": ai_output["investigation_report"],
        "ai_provider": ai_output["ai_provider"],
        **({"ai_service_warning": ai_output["ai_service_warning"]} if "ai_service_warning" in ai_output else {}),
    }


app.mount("/", StaticFiles(directory=BASE_DIR, html=True), name="frontend")
