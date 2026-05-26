// Charting Utilities and Setup using Chart.js

// Color variables mapped from main CSS variables
const CHART_COLORS = {
  accent: '#4f8ef7',
  success: '#22c55e',
  danger: '#ef4444',
  warning: '#f59e0b',
  border: '#2e3347',
  text: '#8892aa',
  grid: 'rgba(46, 51, 71, 0.4)',
  tooltipBg: '#1a1d27',
};

function initMonthlyIncomeChart(elementId, monthlyData) {
  const ctx = document.getElementById(elementId);
  if (!ctx) return;

  const labels = monthlyData.map(d => d.label);
  const premiumData = monthlyData.map(d => d.totalPremium);
  const pnlData = monthlyData.map(d => d.netPnL);

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Premium Collected',
          data: premiumData,
          backgroundColor: 'rgba(79, 142, 247, 0.7)',
          borderColor: CHART_COLORS.accent,
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: 'Net P&L (Realized)',
          data: pnlData,
          backgroundColor: pnlData.map(val => val >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)'),
          borderColor: pnlData.map(val => val >= 0 ? CHART_COLORS.success : CHART_COLORS.danger),
          borderWidth: 1,
          borderRadius: 4,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: CHART_COLORS.text,
            font: { family: 'Inter', size: 12 }
          }
        },
        tooltip: {
          backgroundColor: CHART_COLORS.tooltipBg,
          borderColor: CHART_COLORS.border,
          borderWidth: 1,
          titleColor: '#ffffff',
          bodyColor: CHART_COLORS.text,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: CHART_COLORS.text }
        },
        y: {
          grid: { color: CHART_COLORS.grid },
          ticks: {
            color: CHART_COLORS.text,
            callback: function(value) {
              return '$' + value;
            }
          }
        }
      }
    }
  });
}

function initPositionPnLChart(elementId, performanceHistory) {
  const ctx = document.getElementById(elementId);
  if (!ctx) return;

  const labels = performanceHistory.map(d => d.label);
  const premiumData = performanceHistory.map(d => d.premium);
  const pnlData = performanceHistory.map(d => d.pnl);

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Premium Collected',
          data: premiumData,
          borderColor: CHART_COLORS.accent,
          backgroundColor: 'rgba(79, 142, 247, 0.05)',
          fill: true,
          tension: 0.3,
          borderWidth: 2
        },
        {
          label: 'Net P&L (Realized)',
          data: pnlData,
          borderColor: CHART_COLORS.success,
          backgroundColor: 'rgba(34, 197, 94, 0.05)',
          fill: true,
          tension: 0.3,
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: CHART_COLORS.text }
        },
        tooltip: {
          backgroundColor: CHART_COLORS.tooltipBg,
          borderColor: CHART_COLORS.border,
          borderWidth: 1,
          callbacks: {
            label: function(context) {
              return context.dataset.label + ': $' + context.parsed.y.toFixed(2);
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: CHART_COLORS.text }
        },
        y: {
          grid: { color: CHART_COLORS.grid },
          ticks: { color: CHART_COLORS.text }
        }
      }
    }
  });
}

function initRiskConcentrationChart(elementId, concentrationData) {
  const ctx = document.getElementById(elementId);
  if (!ctx) return;

  const labels = concentrationData.map(d => d.ticker);
  const exposures = concentrationData.map(d => d.exposure);

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: exposures,
        backgroundColor: [
          '#4f8ef7',
          '#22c55e',
          '#f59e0b',
          '#ec4899',
          '#8b5cf6',
          '#3b82f6',
          '#10b981'
        ],
        borderWidth: 1,
        borderColor: CHART_COLORS.border
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: CHART_COLORS.text,
            font: { family: 'Inter' }
          }
        },
        tooltip: {
          backgroundColor: CHART_COLORS.tooltipBg,
          borderColor: CHART_COLORS.border,
          borderWidth: 1,
          callbacks: {
            label: function(context) {
              const val = context.parsed;
              return ` ${context.label}: $${val.toLocaleString()} (${val > 0 ? (val / exposures.reduce((a,b)=>a+b, 0) * 100).toFixed(1) : 0}%)`;
            }
          }
        }
      }
    }
  });
}

// Export utilities
window.Charts = {
  initMonthlyIncomeChart,
  initPositionPnLChart,
  initRiskConcentrationChart
};
