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
  const reportRisk = document.querySelector("#reportRiskScore");
  const reportIndicators = document.querySelector("#reportIndicators");
  const reportSummary = document.querySelector("#reportSummary");
  const reportActions = document.querySelector("#reportActions");

  riskValue.innerHTML = `${analysis.risk_score}<span>/100</span>`;
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

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await ensureAnalysisForSelectedCompany();
    hydrateCompanyNames();
    hydrateAnalysisContent();
    bindReportGeneration();
    runAnalysisSequence();
  } catch {
    window.location.href = "companies.html";
  }
});
