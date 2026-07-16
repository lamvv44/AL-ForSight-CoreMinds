let companies = [];

function formatInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function riskLevelClass(level) {
  return {
    High: "risk-level-high",
    Medium: "risk-level-medium",
    Low: "risk-level-low",
  }[level] || "risk-level-low";
}

async function loadCompanies() {
  const response = await fetch("/companies");
  if (!response.ok) {
    throw new Error("Companies API unavailable");
  }
  companies = await response.json();
}

function populateSectorFilter() {
  const sectorFilter = document.querySelector("#sectorFilter");
  const sectors = [...new Set(companies.map((company) => company.sector))].sort();

  sectorFilter.innerHTML = `<option value="All">All</option>`;
  sectors.forEach((sector) => {
    const option = document.createElement("option");
    option.value = sector;
    option.textContent = sector;
    sectorFilter.appendChild(option);
  });
}

function getFilteredCompanies() {
  const searchValue = document.querySelector("#companySearch").value.trim().toLowerCase();
  const riskValue = document.querySelector("#riskFilter").value;
  const sectorValue = document.querySelector("#sectorFilter").value;

  return companies
    .filter((company) => company.company_name.toLowerCase().includes(searchValue))
    .filter((company) => riskValue === "All" || company.risk_level === riskValue)
    .filter((company) => sectorValue === "All" || company.sector === sectorValue)
    .sort((a, b) => b.risk_score - a.risk_score);
}

function renderCompaniesTable() {
  const filteredCompanies = getFilteredCompanies();
  const tableBody = document.querySelector("#companiesTable");
  document.querySelector("#companiesCount").textContent = `${filteredCompanies.length} companies`;

  tableBody.innerHTML = filteredCompanies
    .map((company) => `
      <tr>
        <td>
          <div class="company-cell">
            <span class="company-avatar">${formatInitials(company.company_name)}</span>
            <span>${company.company_name}</span>
          </div>
        </td>
        <td>${company.sector}</td>
        <td>${company.city}</td>
        <td><span class="score-chip">${company.risk_score}/100</span></td>
        <td><span class="risk-level-chip ${riskLevelClass(company.risk_level)}">${company.risk_level}</span></td>
        <td><span class="signal-chip">${company.top_indicator}</span></td>
        <td>
          <button class="investigate-button" type="button" data-company-id="${company.company_id}" data-company-name="${company.company_name}">
            <span class="material-symbols-rounded">travel_explore</span>
            View Investigation
          </button>
        </td>
      </tr>
    `)
    .join("");

  bindInvestigationButtons();
}

function bindFilters() {
  document.querySelector("#companySearch").addEventListener("input", renderCompaniesTable);
  document.querySelector("#riskFilter").addEventListener("change", renderCompaniesTable);
  document.querySelector("#sectorFilter").addEventListener("change", renderCompaniesTable);
}

function bindInvestigationButtons() {
  document.querySelectorAll(".investigate-button").forEach((button) => {
    button.addEventListener("click", () => {
      const company = companies.find((item) => item.company_id === button.dataset.companyId);
      sessionStorage.setItem("aiForeSightCompanyId", button.dataset.companyId);
      sessionStorage.setItem(
        "coreMindsSelectedCompany",
        JSON.stringify({
          companyId: company.company_id,
          name: company.company_name,
          sector: company.sector,
          riskScore: company.risk_score,
          signal: company.top_indicator,
        })
      );
      document.body.classList.add("leaving-page");
      setTimeout(() => {
        window.location.href = "company-details.html";
      }, 220);
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadCompanies();
  populateSectorFilter();
  bindFilters();
  renderCompaniesTable();
});
