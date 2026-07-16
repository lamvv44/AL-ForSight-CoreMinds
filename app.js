let companies = [];

let portfolioSummary = {
  total_companies: 0,
  risk_distribution: { High: 0, Medium: 0, Low: 0 },
  risk_percentages: { High: 0, Medium: 0, Low: 0 },
  monthly_risk_trend: []
};

const palette = {
  primary: "#6d28d9",
  danger: "#dc2626",
  warning: "#f97316",
  success: "#16a34a",
  grid: "#eef0f5",
  muted: "#667085"
};

function formatInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function renderHighRiskTable() {
  const tableBody = document.querySelector("#highRiskTable");

  tableBody.innerHTML = companies
    .filter((company) => company.riskScore >= 70)
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 8)
    .map((company) => `
      <tr>
        <td>
          <div class="company-cell">
            <span class="company-avatar">${formatInitials(company.name)}</span>
            <span>${company.name}</span>
          </div>
        </td>
        <td>${company.sector}</td>
        <td><span class="score-chip">${company.riskScore}/100</span></td>
        <td><span class="signal-chip">${company.signal}</span></td>
        <td>
          <button class="investigate-button" type="button" data-company="${company.name}" data-company-id="${company.companyId || ""}">
            <span class="material-symbols-rounded">travel_explore</span>
            View Investigation
          </button>
        </td>
      </tr>
    `)
    .join("");
}

function updateDashboardMetrics() {
  const total = portfolioSummary.total_companies;
  const high = portfolioSummary.risk_distribution.High;
  const medium = portfolioSummary.risk_distribution.Medium;
  const low = portfolioSummary.risk_distribution.Low;
  const counters = document.querySelectorAll("[data-count]");
  const values = [total, high, medium, low];

  counters.forEach((counter, index) => {
    counter.dataset.count = values[index];
    counter.textContent = "0";
  });

  document.querySelector("#portfolioEntityCount").textContent = `${total} companies`;
  document.querySelector(".donut-center span").textContent = `${portfolioSummary.risk_percentages.High}%`;
  document.querySelector("#highRiskLegend").textContent = `High ${portfolioSummary.risk_percentages.High}%`;
  document.querySelector("#mediumRiskLegend").textContent = `Medium ${portfolioSummary.risk_percentages.Medium}%`;
  document.querySelector("#lowRiskLegend").textContent = `Low ${portfolioSummary.risk_percentages.Low}%`;
}

async function loadDashboardDataFromApi() {
  try {
    const [companiesResponse, summaryResponse] = await Promise.all([
      fetch("/companies"),
      fetch("/portfolio/summary"),
    ]);

    if (!companiesResponse.ok || !summaryResponse.ok) {
      throw new Error("Dashboard API unavailable");
    }

    const apiCompanies = await companiesResponse.json();
    portfolioSummary = await summaryResponse.json();
    companies = apiCompanies.map((company) => ({
      companyId: company.company_id,
      name: company.company_name,
      sector: company.sector,
      riskScore: company.risk_score,
      signal: company.top_indicator,
    }));
  } catch {
    companies = [];
  }
}

function animateCounters() {
  document.querySelectorAll("[data-count]").forEach((counter) => {
    const target = Number(counter.dataset.count);
    const duration = 900;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      counter.textContent = Math.round(target * eased).toLocaleString("en-US");

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  });
}

function renderCharts() {
  Chart.defaults.font.family = "Inter";
  Chart.defaults.color = palette.muted;

  const donutContext = document.querySelector("#riskDistributionChart");
  const lineContext = document.querySelector("#monthlyRiskTrendChart");

  const riskDistribution = portfolioSummary.risk_distribution;
  const monthlyTrend = portfolioSummary.monthly_risk_trend;

  new Chart(donutContext, {
    type: "doughnut",
    data: {
      labels: ["High Risk", "Medium Risk", "Low Risk"],
      datasets: [
        {
          data: [riskDistribution.High, riskDistribution.Medium, riskDistribution.Low],
          backgroundColor: [palette.danger, palette.warning, palette.success],
          borderColor: "#ffffff",
          borderWidth: 5,
          hoverOffset: 8
        }
      ]
    },
    options: {
      cutout: "70%",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#111827",
          padding: 12,
          cornerRadius: 8,
          titleFont: { weight: 800 },
          bodyFont: { weight: 600 }
        }
      },
      animation: {
        animateRotate: true,
        duration: 1200,
        easing: "easeOutQuart"
      }
    }
  });

  const gradient = lineContext.getContext("2d").createLinearGradient(0, 0, 0, 320);
  gradient.addColorStop(0, "rgba(109, 40, 217, 0.24)");
  gradient.addColorStop(1, "rgba(109, 40, 217, 0.02)");

  new Chart(lineContext, {
    type: "line",
    data: {
      labels: monthlyTrend.map((point) => {
        const date = new Date(`${point.month}-01T00:00:00`);
        return date.toLocaleString("en-US", { month: "short" });
      }),
      datasets: [
        {
          label: "Average Portfolio Risk Score",
          data: monthlyTrend.map((point) => point.average_risk_score),
          borderColor: palette.primary,
          backgroundColor: gradient,
          fill: true,
          tension: 0.42,
          pointRadius: 4,
          pointHoverRadius: 7,
          pointBackgroundColor: "#ffffff",
          pointBorderColor: palette.primary,
          pointBorderWidth: 3,
          borderWidth: 3
        },
        {
          label: "High Risk Threshold",
          data: [75, 75, 75, 75, 75, 75, 75, 75],
          borderColor: "rgba(220, 38, 38, 0.48)",
          borderDash: [8, 8],
          pointRadius: 0,
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: "index"
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { font: { weight: 700 } }
        },
        y: {
          min: 0,
          max: 100,
          grid: { color: palette.grid },
          border: { display: false },
          ticks: {
            stepSize: 25,
            font: { weight: 700 }
          }
        }
      },
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            boxHeight: 8,
            font: { weight: 750 }
          }
        },
        tooltip: {
          backgroundColor: "#111827",
          padding: 12,
          cornerRadius: 8,
          titleFont: { weight: 800 },
          bodyFont: { weight: 600 }
        }
      },
      animation: {
        duration: 1300,
        easing: "easeOutQuart"
      }
    }
  });
}

function bindInvestigationButtons() {
  document.querySelectorAll(".investigate-button").forEach((button) => {
    button.addEventListener("click", () => {
      const selectedCompany = companies.find((company) => company.name === button.dataset.company);
      sessionStorage.setItem("coreMindsSelectedCompany", JSON.stringify(selectedCompany));
      sessionStorage.setItem("aiForeSightCompanyId", button.dataset.companyId || selectedCompany.companyId || "C001");
      document.body.classList.add("leaving-page");
      setTimeout(() => {
        window.location.href = "company-details.html";
      }, 220);
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadDashboardDataFromApi();
  updateDashboardMetrics();
  renderHighRiskTable();
  animateCounters();
  renderCharts();
  bindInvestigationButtons();
});
