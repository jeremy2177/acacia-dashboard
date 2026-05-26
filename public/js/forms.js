// Client-side Interactive calculations and Form validation

document.addEventListener('DOMContentLoaded', () => {
  // Live calculation preview logic on Trade creation forms
  const strikeInput = document.getElementById('strike_price');
  const premiumInput = document.getElementById('premium_received');
  const contractsInput = document.getElementById('contracts');
  const expiryInput = document.getElementById('expiration_date');
  const openDateInput = document.getElementById('opened_at');
  
  const rocPreview = document.getElementById('roc-preview');
  const annualizedPreview = document.getElementById('annualized-preview');
  const dtePreview = document.getElementById('dte-preview');
  const riskPreview = document.getElementById('risk-preview');

  function calculateLiveMetrics() {
    if (!strikeInput || !premiumInput || !contractsInput) return;

    const strike = parseFloat(strikeInput.value) || 0;
    const premium = parseFloat(premiumInput.value) || 0;
    const contracts = parseInt(contractsInput.value) || 0;
    
    // Auto-calculate risk
    const capitalAtRisk = strike * contracts * 100;
    if (riskPreview) {
      riskPreview.textContent = window.UI ? window.UI.formatCurrency(capitalAtRisk) : `$${capitalAtRisk.toFixed(2)}`;
    }

    // Auto-calculate DTE
    let dte = 0;
    if (expiryInput && expiryInput.value) {
      const openDate = openDateInput && openDateInput.value ? new Date(openDateInput.value) : new Date();
      const expiryDate = new Date(expiryInput.value);
      const diffTime = expiryDate - openDate;
      dte = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      if (dtePreview) dtePreview.textContent = `${dte} days`;
    }

    // Auto-calculate ROC
    let roc = 0;
    if (capitalAtRisk > 0) {
      roc = premium / capitalAtRisk;
      if (rocPreview) {
        rocPreview.textContent = (roc * 100).toFixed(2) + '%';
      }
    } else {
      if (rocPreview) rocPreview.textContent = '0.00%';
    }

    // Auto-calculate Annualized Return
    if (dte > 0 && roc > 0) {
      const ann = roc * (365 / dte) * 100;
      if (annualizedPreview) {
        annualizedPreview.textContent = ann.toFixed(2) + '%';
      }
    } else {
      if (annualizedPreview) annualizedPreview.textContent = '0.00%';
    }
  }

  // Bind live listeners
  [strikeInput, premiumInput, contractsInput, expiryInput, openDateInput].forEach(elem => {
    if (elem) {
      elem.addEventListener('input', calculateLiveMetrics);
    }
  });

  // Run calculation once on page load to pre-fill preview metrics if values exist
  calculateLiveMetrics();

  // Handle Position to Trade auto-contract selection pre-fills
  const sharesInput = document.getElementById('shares_owned');
  if (sharesInput) {
    sharesInput.addEventListener('input', () => {
      const shares = parseInt(sharesInput.value) || 0;
      const targetContracts = Math.floor(shares / 100);
      const contractHelper = document.getElementById('contract-prefill-helper');
      if (contractHelper && targetContracts > 0) {
        contractHelper.textContent = `Equal to ${targetContracts} options contract${targetContracts > 1 ? 's' : ''}`;
      }
    });
  }

  // Pre-fill Open Price per Share on trade creation when premium / contracts change
  const openPriceInput = document.getElementById('open_price');
  if (openPriceInput && premiumInput && contractsInput) {
    const autoPriceSetter = () => {
      const premium = parseFloat(premiumInput.value) || 0;
      const contracts = parseInt(contractsInput.value) || 0;
      if (contracts > 0 && premium > 0) {
        openPriceInput.value = (premium / (contracts * 100)).toFixed(2);
      }
    };
    premiumInput.addEventListener('input', autoPriceSetter);
    contractsInput.addEventListener('input', autoPriceSetter);
  }
});
