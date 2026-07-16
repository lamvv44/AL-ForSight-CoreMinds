from __future__ import annotations

from statistics import mean
from typing import Any


SECTOR_EXPECTED_IMPORT_RATIO = {
    "Retail": 0.38,
    "Electronics": 0.62,
    "Food & Beverages": 0.30,
    "Construction Materials": 0.46,
    "Medical Supplies": 0.54,
    "Fashion": 0.48,
    "Auto Parts": 0.58,
    "Logistics": 0.16,
    "Furniture": 0.36,
    "Industrial Equipment": 0.68,
}


def _pct_gap(actual: float, expected: float) -> float:
    if expected <= 0:
        return 0.0
    return (actual - expected) / expected


def _average_monthly(company: dict[str, Any], field: str) -> float:
    months = company.get("monthly_activity", [])
    if not months:
        return 0.0
    return mean(float(month.get(field, 0)) for month in months)


def calculate_risk_indicators(company: dict[str, Any]) -> list[dict[str, Any]]:
    months = company.get("monthly_activity", [])
    if not months:
        return [
            {
                "code": "NO_ACTIVITY",
                "label": "No monthly activity",
                "severity": "High",
                "description": "No monthly financial activity was available for analysis.",
                "weight": 35,
            }
        ]

    avg_sales = _average_monthly(company, "sales_amount")
    avg_declared = _average_monthly(company, "declared_revenue")
    avg_imports = _average_monthly(company, "import_value")
    avg_sector = _average_monthly(company, "sector_average_sales")
    invoice_counts = [float(month.get("invoice_count", 0)) for month in months]
    sales_values = [float(month.get("sales_amount", 0)) for month in months]

    indicators: list[dict[str, Any]] = []

    declaration_gap = max(0.0, _pct_gap(avg_sales, avg_declared))
    if declaration_gap > 0.18:
        indicators.append(
            {
                "code": "DECLARED_REVENUE_GAP",
                "label": "Declared revenue lower than e-invoicing sales",
                "severity": "High" if declaration_gap > 0.32 else "Medium",
                "description": f"Average declared revenue is {declaration_gap:.0%} lower than observed e-invoicing sales.",
                "weight": 24 if declaration_gap > 0.32 else 14,
            }
        )
    elif declaration_gap > 0.07:
        indicators.append(
            {
                "code": "SMALL_DECLARATION_VARIANCE",
                "label": "Small declaration variance",
                "severity": "Medium",
                "description": f"Average declared revenue is {declaration_gap:.0%} below e-invoicing sales.",
                "weight": 9,
            }
        )

    import_to_sales = avg_imports / avg_sales if avg_sales else 0.0
    expected_import_ratio = SECTOR_EXPECTED_IMPORT_RATIO.get(company.get("sector"), 0.45)
    import_pressure = import_to_sales / expected_import_ratio if expected_import_ratio else 0.0
    if import_pressure > 1.7:
        indicators.append(
            {
                "code": "IMPORTS_EXCEED_SALES",
                "label": "Imports materially exceed expected sector pattern",
                "severity": "High",
                "description": f"Average import-to-sales ratio is {import_pressure:.1f}x the expected pattern for this sector.",
                "weight": 26,
            }
        )
    elif import_pressure > 1.25:
        indicators.append(
            {
                "code": "MODERATE_IMPORT_MISMATCH",
                "label": "Moderate import mismatch",
                "severity": "Medium",
                "description": f"Average import-to-sales ratio is {import_pressure:.1f}x the expected pattern for this sector.",
                "weight": 12,
            }
        )

    sector_gap = max(0.0, _pct_gap(avg_sector, avg_sales))
    if sector_gap > 0.38:
        indicators.append(
            {
                "code": "SECTOR_DEVIATION",
                "label": "Strong deviation from sector benchmark",
                "severity": "High",
                "description": f"Average sales are {sector_gap:.0%} below the sector benchmark.",
                "weight": 18,
            }
        )
    elif sector_gap > 0.18:
        indicators.append(
            {
                "code": "SECTOR_UNDERPERFORMANCE",
                "label": "Sector underperformance",
                "severity": "Medium",
                "description": f"Average sales are {sector_gap:.0%} below comparable sector activity.",
                "weight": 9,
            }
        )

    drops = []
    for previous, current in zip(sales_values, sales_values[1:]):
        if previous > 0 and (previous - current) / previous > 0.28:
            drops.append((previous - current) / previous)
    if drops:
        largest_drop = max(drops)
        indicators.append(
            {
                "code": "SUDDEN_SALES_DROP",
                "label": "Sudden sales drop",
                "severity": "High" if largest_drop > 0.42 else "Medium",
                "description": f"Monthly sales dropped by up to {largest_drop:.0%} compared with the previous month.",
                "weight": 17 if largest_drop > 0.42 else 10,
            }
        )

    if invoice_counts and mean(invoice_counts) > 0:
        high_invoice_variance = (max(invoice_counts) - min(invoice_counts)) / mean(invoice_counts)
        if high_invoice_variance > 1.05:
            indicators.append(
                {
                    "code": "ABNORMAL_INVOICE_COUNT",
                    "label": "Abnormal invoice count",
                    "severity": "High" if high_invoice_variance > 1.45 else "Medium",
                    "description": "Invoice volume shows unusually high month-to-month volatility.",
                    "weight": 13 if high_invoice_variance > 1.45 else 8,
                }
            )

    anomaly_months = [month for month in months if month.get("notes") and month["notes"] != "Normal activity"]
    if len(anomaly_months) >= 4:
        indicators.append(
            {
                "code": "REPEATED_ANOMALIES",
                "label": "Repeated monthly anomalies",
                "severity": "Medium",
                "description": f"{len(anomaly_months)} months include anomaly notes requiring auditor review.",
                "weight": 8,
            }
        )

    if not indicators:
        indicators.append(
            {
                "code": "CONSISTENT_ACTIVITY",
                "label": "Consistent activity",
                "severity": "Low",
                "description": "Sales, declarations, imports, invoices, and sector benchmarks are broadly consistent.",
                "weight": 0,
            }
        )

    return indicators


def calculate_risk_score(company: dict[str, Any], indicators: list[dict[str, Any]] | None = None) -> int:
    months = company.get("monthly_activity", [])
    if not months:
        return 100

    avg_sales = _average_monthly(company, "sales_amount")
    avg_declared = _average_monthly(company, "declared_revenue")
    avg_imports = _average_monthly(company, "import_value")
    avg_sector = _average_monthly(company, "sector_average_sales")
    invoice_counts = [float(month.get("invoice_count", 0)) for month in months]
    sales_values = [float(month.get("sales_amount", 0)) for month in months]
    anomaly_months = [month for month in months if month.get("notes") and month["notes"] != "Normal activity"]

    declaration_gap = max(0.0, _pct_gap(avg_sales, avg_declared))
    import_to_sales = avg_imports / avg_sales if avg_sales else 0.0
    expected_import_ratio = SECTOR_EXPECTED_IMPORT_RATIO.get(company.get("sector"), 0.45)
    import_pressure = import_to_sales / expected_import_ratio if expected_import_ratio else 0.0
    sector_gap = max(0.0, _pct_gap(avg_sector, avg_sales))
    invoice_variance = (max(invoice_counts) - min(invoice_counts)) / mean(invoice_counts) if invoice_counts and mean(invoice_counts) else 0.0
    largest_drop = max(
        [(previous - current) / previous for previous, current in zip(sales_values, sales_values[1:]) if previous > 0],
        default=0.0,
    )

    score = 8

    if declaration_gap > 0.24:
        score += 24
    elif declaration_gap > 0.12:
        score += 16
    elif declaration_gap > 0.04:
        score += 13

    if import_pressure > 1.7:
        score += 20
    elif import_pressure > 1.35:
        score += 12
    elif import_pressure > 1.15:
        score += 8

    if sector_gap > 0.30:
        score += 14
    elif sector_gap > 0.15:
        score += 7

    if largest_drop > 0.40:
        score += 15
    elif largest_drop > 0.25:
        score += 9
    elif largest_drop > 0.15:
        score += 5

    if invoice_variance > 1.15:
        score += 10
    elif invoice_variance > 0.65:
        score += 6
    elif invoice_variance > 0.35:
        score += 5

    if len(anomaly_months) >= 4:
        score += 8
    elif len(anomaly_months) >= 2:
        score += 7

    return max(0, min(100, score))


def classify_risk(score: int) -> str:
    if score >= 70:
        return "High"
    if score >= 40:
        return "Medium"
    return "Low"


def analyze_company(company: dict[str, Any]) -> dict[str, Any]:
    indicators = calculate_risk_indicators(company)
    risk_score = calculate_risk_score(company, indicators)
    risk_level = classify_risk(risk_score)

    return {
        "company_id": company["company_id"],
        "company_name": company["company_name"],
        "risk_score": risk_score,
        "risk_level": risk_level,
        "risk_indicators": indicators,
    }
