from __future__ import annotations

import json
import os
from typing import Any


def _fallback_ai_response(company: dict[str, Any], analysis: dict[str, Any]) -> dict[str, Any]:
    indicator_labels = [indicator["label"] for indicator in analysis["risk_indicators"]]
    indicator_text = ", ".join(indicator_labels)
    company_name = company["company_name"]
    risk_score = analysis["risk_score"]
    risk_level = analysis["risk_level"]

    return {
        "ai_provider": "fallback",
        "ai_summary": (
            f"{company_name} is classified as {risk_level} risk with a score of {risk_score}/100. "
            f"The analysis detected the following indicators: {indicator_text}. "
            "The pattern suggests the auditor should compare e-invoicing sales, declared revenue, customs imports, "
            "and sector benchmarks before closing the review."
        ),
        "recommended_actions": [
            "Review monthly e-invoicing sales against declared revenue.",
            "Compare customs/import records with sales activity for the same period.",
            "Check months with anomaly notes and request supporting documents.",
            "Benchmark the company against comparable companies in the same sector.",
        ],
        "investigation_report": {
            "company_name": company_name,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "detected_indicators": indicator_labels,
            "summary": (
                "This report was generated using the local risk engine. "
                "Set GEMINI_API_KEY to enable live Gemini-generated narrative output."
            ),
            "generated_by": "AI ForeSight AI",
        },
    }


def generate_ai_investigation(company: dict[str, Any], analysis: dict[str, Any]) -> dict[str, Any]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return _fallback_ai_response(company, analysis)

    try:
        import google.generativeai as genai

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.5-flash")
        payload = {
            "company": {
                "company_id": company["company_id"],
                "company_name": company["company_name"],
                "sector": company["sector"],
                "city": company["city"],
                "company_size": company["company_size"],
                "risk_profile": company["risk_profile"],
            },
            "recent_months": company["monthly_activity"][-4:],
            "analysis": analysis,
        }

        prompt = (
            "You are AI ForeSight, an AI financial investigation assistant for Saudi tax, zakat, "
            "and customs auditors. Generate concise, professional JSON only. "
            "Return exactly these keys: ai_summary, recommended_actions, investigation_report. "
            "recommended_actions must be a list of 4 action strings. investigation_report must include "
            "company_name, risk_score, risk_level, detected_indicators, summary, and generated_by. "
            "Use the provided synthetic data and do not invent external facts. "
            "The risk score was calculated by the system; copy it exactly and do not recalculate it.\n\n"
            f"Input data:\n{json.dumps(payload, ensure_ascii=False)}"
        )

        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"},
        )
        ai_response = json.loads(response.text)

        # Risk values always come from the system risk engine, never from Gemini.
        ai_response["investigation_report"]["company_name"] = company["company_name"]
        ai_response["investigation_report"]["risk_score"] = analysis["risk_score"]
        ai_response["investigation_report"]["risk_level"] = analysis["risk_level"]
        ai_response["investigation_report"]["detected_indicators"] = [
            indicator["label"] for indicator in analysis["risk_indicators"]
        ]
        ai_response["ai_provider"] = "gemini"
        return ai_response
    except Exception as exc:
        fallback = _fallback_ai_response(company, analysis)
        fallback["ai_service_warning"] = f"Gemini generation failed, returned local fallback: {exc}"
        return fallback
