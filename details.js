const fallbackCompany = {
  company_id: "C001",
  name: "Noura Industrial Trading",
  company_name: "Noura Industrial Trading",
  sector: "Industrial Supplies",
  monthlySales: 4200000,
  previousYearSales: 6800000,
  importValue: 7200000,
  taxDeclaration: 3900000,
  riskScore: 92
};

function getSelectedCompany() {
  const storedCompany = sessionStorage.getItem("coreMindsSelectedCompany");

  if (!storedCompany) {
    return fallbackCompany;
  }

  try {
    return JSON.parse(storedCompany);
  } catch {
    return fallbackCompany;
  }
}

function getStoredAnalysis() {
  const storedAnalysis = sessionStorage.getItem("aiForeSightAnalysis");

  if (!storedAnalysis) {
    return null;
  }

  try {
    return JSON.parse(storedAnalysis);
  } catch {
    return null;
  }
}

function formatInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatSar(value) {
  return `SAR ${(value / 1000000).toFixed(1)}M`;
}

function normalizeCompany(company) {
  if (company.monthly_activity) {
    const latestMonth = company.monthly_activity[company.monthly_activity.length - 1];
    const firstMonth = company.monthly_activity[0];

    return {
      companyId: company.company_id,
      name: company.company_name,
      sector: company.sector,
      monthlySales: latestMonth.sales_amount,
      previousYearSales: Math.round(firstMonth.sales_amount * 12),
      importValue: latestMonth.import_value,
      taxDeclaration: latestMonth.declared_revenue,
      riskScore: company.risk_score || company.riskScore || 0,
    };
  }

  return {
    companyId: company.companyId || company.company_id || "C001",
    name: company.name || company.company_name,
    sector: company.sector,
    monthlySales: company.monthlySales,
    previousYearSales: company.previousYearSales,
    importValue: company.importValue,
    taxDeclaration: company.taxDeclaration,
    riskScore: company.riskScore,
  };
}

async function loadCompanyDetails() {
  const companyId = sessionStorage.getItem("aiForeSightCompanyId");

  if (!companyId) {
    window.location.href = "companies.html";
    return normalizeCompany(getSelectedCompany());
  }

  try {
    const [companyResponse, analysisResponse] = await Promise.all([
      fetch(`/companies/${companyId}`),
      fetch(`/analyze/${companyId}`, { method: "POST" }),
    ]);

    if (!companyResponse.ok || !analysisResponse.ok) {
      throw new Error("Company API unavailable");
    }

    const company = await companyResponse.json();
    const analysis = await analysisResponse.json();
    sessionStorage.setItem("aiForeSightCompanyId", companyId);
    sessionStorage.setItem("aiForeSightCompany", JSON.stringify(company));
    sessionStorage.setItem("aiForeSightAnalysis", JSON.stringify(analysis));
    return normalizeCompany({ ...company, risk_score: analysis.risk_score });
  } catch {
    return normalizeCompany(getSelectedCompany());
  }
}

function hydrateCompanyDetails(company) {

  document.querySelector("#companyName").textContent = company.name;
  document.querySelector("#companyInitials").textContent = formatInitials(company.name);
  document.querySelector("#companySector").textContent = company.sector;
  document.querySelector("#monthlySales").textContent = formatSar(company.monthlySales);
  document.querySelector("#previousYearSales").textContent = formatSar(company.previousYearSales);
  document.querySelector("#importValue").textContent = formatSar(company.importValue);
  document.querySelector("#taxDeclaration").textContent = formatSar(company.taxDeclaration);
  document.querySelector("#riskScore").textContent = company.riskScore;
  document.querySelector(".gauge-shell").style.setProperty("--score", company.riskScore);
}

function indicatorClass(severity) {
  if (severity === "High") {
    return "danger-indicator";
  }
  if (severity === "Medium") {
    return "warning-indicator";
  }
  return "success-indicator";
}

function indicatorIcon(code) {
  const icons = {
    DECLARED_REVENUE_GAP: "receipt_long",
    SMALL_DECLARATION_VARIANCE: "receipt_long",
    IMPORTS_EXCEED_SALES: "local_shipping",
    MODERATE_IMPORT_MISMATCH: "local_shipping",
    SECTOR_DEVIATION: "monitoring",
    SECTOR_UNDERPERFORMANCE: "monitoring",
    SUDDEN_SALES_DROP: "trending_down",
    ABNORMAL_INVOICE_COUNT: "format_list_numbered",
    REPEATED_ANOMALIES: "warning",
    CONSISTENT_ACTIVITY: "check_circle",
  };

  return icons[code] || "travel_explore";
}

function hydrateRiskIndicators() {
  const analysis = getStoredAnalysis();
  const grid = document.querySelector("#detailsIndicatorGrid");

  if (!analysis || !grid) {
    return;
  }

  grid.innerHTML = analysis.risk_indicators
    .map((indicator) => `
      <article class="indicator-card ${indicatorClass(indicator.severity)}">
        <div class="indicator-icon">
          <span class="material-symbols-rounded">${indicatorIcon(indicator.code)}</span>
        </div>
        <div>
          <h3>${indicator.label}</h3>
          <p>${indicator.description}</p>
        </div>
      </article>
    `)
    .join("");
}

function bindGenerateSummary() {
  const button = document.querySelector("#generateSummaryButton");
  const overlay = document.querySelector("#loadingOverlay");

  button.addEventListener("click", async () => {
    overlay.classList.add("show");
    overlay.setAttribute("aria-hidden", "false");

    const companyId = sessionStorage.getItem("aiForeSightCompanyId");
    if (companyId) {
      try {
        const response = await fetch(`/analyze/${companyId}`, { method: "POST" });
        if (response.ok) {
          const analysis = await response.json();
          sessionStorage.setItem("aiForeSightAnalysis", JSON.stringify(analysis));
        }
      } catch {
        // The static fallback keeps the Functional MVP usable when opened without the backend.
      }
    }

    setTimeout(() => {
      window.location.href = "ai-investigation.html";
    }, 2000);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const company = await loadCompanyDetails();
  hydrateCompanyDetails(company);
  hydrateRiskIndicators();
  bindGenerateSummary();
});
