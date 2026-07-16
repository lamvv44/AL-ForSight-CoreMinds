const summaryFallbackCompany = {
  name: "Noura Industrial Trading"
};

const aiSummaryText = "AI ForeSight AI identified a critical risk profile. Import values are significantly higher than declared monthly sales, current revenue is below the previous year baseline, and the company's behavior deviates from comparable sector benchmarks. The pattern suggests the auditor should review import documentation, validate sales declarations, and prioritize this entity for a deeper financial investigation.";

function getSummaryCompany() {
  const storedCompany = sessionStorage.getItem("coreMindsSelectedCompany");

  if (!storedCompany) {
    return summaryFallbackCompany;
  }

  try {
    return JSON.parse(storedCompany);
  } catch {
    return summaryFallbackCompany;
  }
}

function getStoredCompanyData() {
  const storedCompany = sessionStorage.getItem("aiForeSightCompany");

  if (!storedCompany) {
    return null;
  }

  try {
    return JSON.parse(storedCompany);
  } catch {
    return null;
  }
}

async function ensureAnalysisForSelectedCompany() {
  const companyId = sessionStorage.getItem("aiForeSightCompanyId");
  const storedAnalysis = getStoredAnalysis();

  if (!companyId) {
    window.location.href = "companies.html";
    return null;
  }

  if (storedAnalysis?.company_id === companyId) {
    return storedAnalysis;
  }

  const response = await fetch(`/analyze/${companyId}`, { method: "POST" });
  if (!response.ok) {
    throw new Error("Unable to analyze selected company");
  }

  const analysis = await response.json();
  sessionStorage.setItem("aiForeSightAnalysis", JSON.stringify(analysis));
  return analysis;
}

async function ensureCompanyDataForSelectedCompany() {
  const companyId = sessionStorage.getItem("aiForeSightCompanyId");
  const storedCompany = getStoredCompanyData();

  if (storedCompany?.company_id === companyId) {
    return storedCompany;
  }

  if (!companyId) {
    return null;
  }

  try {
    const response = await fetch(`/companies/${companyId}`);
    if (!response.ok) {
      return null;
    }

    const company = await response.json();
    sessionStorage.setItem("aiForeSightCompany", JSON.stringify(company));
    return company;
  } catch {
    return null;
  }
}

function runAnalysisSequence() {
  const progressValue = document.querySelector("#progressValue");
  const progressFill = document.querySelector("#progressFill");
  const completeMessage = document.querySelector("#analysisComplete");
  const analysisStage = document.querySelector("#analysisStage");
  const dashboard = document.querySelector("#investigationDashboard");
  let progress = 0;

  const timer = setInterval(() => {
    progress += 2;
    progressValue.textContent = `${progress}%`;
    progressFill.style.width = `${progress}%`;

    if (progress >= 100) {
      clearInterval(timer);
      completeMessage.classList.add("show");

      setTimeout(() => {
        analysisStage.classList.add("complete");
        dashboard.classList.add("show");
        typeSummary();
      }, 850);
    }
  }, 55);
}

function typeSummary() {
  const target = document.querySelector("#typingSummary");
  const analysis = getStoredAnalysis();
  const summaryText = analysis?.ai_summary || aiSummaryText;
  let index = 0;

  function typeNextCharacter() {
    target.textContent = summaryText.slice(0, index);
    index += 1;

    if (index <= summaryText.length) {
      setTimeout(typeNextCharacter, 16);
    }
  }

  typeNextCharacter();
}

function bindReportGeneration() {
  const button = document.querySelector("#generateReportButton");
  const report = document.querySelector("#reportCard");
  const toast = document.querySelector("#reportToast");
  let toastTimer;

  button.addEventListener("click", () => {
    report.classList.add("show");
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
    report.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

function hydrateCompanyNames() {
  const company = getSummaryCompany();
  const analysis = getStoredAnalysis();
  const companyName = analysis?.company_name || company.name || company.company_name;
  document.querySelector("#summaryCompanyName").textContent = companyName;
  document.querySelector("#reportCompanyName").textContent = companyName;
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

function hydrateAnalysisContent() {
  const analysis = getStoredAnalysis();

  if (!analysis) {
    return;
  }

  const riskValue = document.querySelector(".summary-risk-value");
  const indicatorList = document.querySelector(".anomaly-list");
  const actionList = document.querySelector(".action-list");
  const riskExplanation = document.querySelector("#riskExplanation");
  const reportRisk = document.querySelector("#reportRiskScore");
  const reportIndicators = document.querySelector("#reportIndicators");
  const reportSummary = document.querySelector("#reportSummary");
  const reportActions = document.querySelector("#reportActions");

  riskValue.innerHTML = `${analysis.risk_score}<span>/100</span>`;
  riskExplanation.textContent = buildRiskExplanation(analysis);
  indicatorList.innerHTML = analysis.risk_indicators
    .filter((indicator) => indicator.severity !== "Low")
    .map((indicator) => `<span>${indicator.label}</span>`)
    .join("");
  actionList.innerHTML = analysis.recommended_actions.map((action) => `<li>${action}</li>`).join("");
  reportRisk.textContent = `${analysis.risk_score}/100`;
  reportIndicators.textContent = analysis.risk_indicators.map((indicator) => indicator.label).join(", ");
  reportSummary.textContent = analysis.investigation_report.summary || analysis.ai_summary;
  reportActions.textContent = analysis.recommended_actions.join(" ");
}

function buildRiskExplanation(analysis) {
  const meaningfulIndicators = analysis.risk_indicators
    .filter((indicator) => indicator.severity !== "Low")
    .map((indicator) => indicator.label.toLowerCase());
  const indicatorText = meaningfulIndicators.length
    ? meaningfulIndicators.slice(0, 3).join(", ")
    : "consistent financial activity";

  if (analysis.risk_level === "High") {
    return `High risk level driven by ${indicatorText}.`;
  }

  if (analysis.risk_level === "Medium") {
    return `Medium risk level driven by ${indicatorText}.`;
  }

  return `Low risk level supported by ${indicatorText}.`;
}

function average(values) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function setBarWidth(element, percent) {
  element.style.width = `${Math.max(4, Math.min(100, percent))}%`;
}

function hydrateSectorComparison(company) {
  const card = document.querySelector("#sectorComparisonCard");
  const companyLabel = document.querySelector("#companyComparisonLabel");
  const sectorLabel = document.querySelector("#sectorComparisonLabel");
  const companyRatio = document.querySelector("#companyImportSalesRatio");
  const sectorRatio = document.querySelector("#sectorBenchmarkRatio");
  const companyBar = document.querySelector("#companyImportSalesBar");
  const sectorBar = document.querySelector("#sectorBenchmarkBar");
  const months = company?.monthly_activity || [];
  const avgSales = average(months.map((month) => Number(month.sales_amount || 0)).filter(Boolean));
  const avgSectorSales = average(months.map((month) => Number(month.sector_average_sales || 0)).filter(Boolean));

  if (!avgSales || !avgSectorSales) {
    card.style.display = "none";
    return;
  }

  const companyVsSectorRatio = avgSales / avgSectorSales;

  companyLabel.textContent = "Company sales vs sector average";
  sectorLabel.textContent = "Sector benchmark";
  companyRatio.textContent = formatPercent(companyVsSectorRatio);
  sectorRatio.textContent = "100%";
  setBarWidth(companyBar, companyVsSectorRatio * 100);
  setBarWidth(sectorBar, 100);
}

function hydrateMonthlyTrend(company) {
  const card = document.querySelector("#monthlyTrendCard");
  const bars = document.querySelector("#monthlyTrendBars");
  const caption = document.querySelector("#monthlyTrendCaption");
  const months = company?.monthly_activity || [];
  const salesValues = months.map((month) => Number(month.sales_amount || 0)).filter(Boolean);

  if (salesValues.length < 2) {
    card.style.display = "none";
    return;
  }

  const maxSales = Math.max(...salesValues);
  const recentMonths = months.slice(-6);
  const anomalyCount = recentMonths.filter((month, index) => {
    if (index === 0) {
      return month.notes && month.notes !== "Normal activity";
    }

    const previousSales = Number(recentMonths[index - 1].sales_amount || 0);
    const currentSales = Number(month.sales_amount || 0);
    const salesDrop = previousSales > 0 ? (previousSales - currentSales) / previousSales : 0;
    return salesDrop > 0.25 || (month.notes && month.notes !== "Normal activity");
  }).length;

  bars.innerHTML = recentMonths
    .map((month, index) => {
      const previousSales = index > 0 ? Number(recentMonths[index - 1].sales_amount || 0) : 0;
      const currentSales = Number(month.sales_amount || 0);
      const salesDrop = previousSales > 0 ? (previousSales - currentSales) / previousSales : 0;
      const isAnomaly = salesDrop > 0.25 || (month.notes && month.notes !== "Normal activity");
      const height = maxSales > 0 ? Math.max(12, Math.round((currentSales / maxSales) * 100)) : 12;
      return `<span${isAnomaly ? ' class="anomaly-bar"' : ""} style="height: ${height}%"></span>`;
    })
    .join("");
  caption.textContent = anomalyCount
    ? `${anomalyCount} month${anomalyCount === 1 ? "" : "s"} show abnormal drops or anomaly notes.`
    : "Monthly sales trend is broadly consistent with historical patterns.";
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await ensureAnalysisForSelectedCompany();
    const company = await ensureCompanyDataForSelectedCompany();
    hydrateCompanyNames();
    hydrateAnalysisContent();
    hydrateSectorComparison(company);
    hydrateMonthlyTrend(company);
    bindReportGeneration();
    runAnalysisSequence();
  } catch {
    window.location.href = "companies.html";
  }
});
