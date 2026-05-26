// UI and Interactions Utility script

document.addEventListener('DOMContentLoaded', () => {
  // Mobile accordion expand/collapse logic
  const headers = document.querySelectorAll('.mobile-expand-header');
  headers.forEach(header => {
    header.addEventListener('click', () => {
      const parent = header.closest('.mobile-expandable');
      const body = parent.querySelector('.mobile-expand-body');
      const chevron = header.querySelector('.expand-chevron');
      
      if (body) {
        const isCollapsed = body.style.display === 'none' || !body.style.display;
        if (isCollapsed) {
          body.style.display = 'block';
          if (chevron) chevron.style.transform = 'rotate(180deg)';
        } else {
          body.style.display = 'none';
          if (chevron) chevron.style.transform = 'rotate(0deg)';
        }
      }
    });
  });

  // Modal close utility helper
  const modalOverlays = document.querySelectorAll('.modal-overlay');
  modalOverlays.forEach(overlay => {
    const closeBtns = overlay.querySelectorAll('.modal-close-trigger');
    closeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        overlay.classList.remove('active');
      });
    });
    
    // Close on background click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
      }
    });
  });
});

// Confirmation Dialog helper
function confirmAction(title, message, confirmBtnText, onConfirm) {
  let modal = document.getElementById('confirmation-modal');
  if (!modal) {
    // Create dynamically if not present
    const modalHTML = `
      <div id="confirmation-modal" class="modal-overlay">
        <div class="modal-card">
          <h3 id="conf-title" class="modal-title">Confirm Action</h3>
          <p id="conf-message" class="modal-body">Are you sure you want to proceed?</p>
          <div class="modal-actions">
            <button class="btn btn--secondary modal-close-trigger" id="conf-cancel-btn">Cancel</button>
            <button class="btn btn--danger" id="conf-confirm-btn">Confirm</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    modal = document.getElementById('confirmation-modal');
    
    const cancelBtn = modal.querySelector('#conf-cancel-btn');
    cancelBtn.addEventListener('click', () => modal.classList.remove('active'));
  }
  
  modal.querySelector('#conf-title').textContent = title;
  modal.querySelector('#conf-message').textContent = message;
  
  const confirmBtn = modal.querySelector('#conf-confirm-btn');
  confirmBtn.textContent = confirmBtnText;
  
  // Clear previous listeners
  const newConfirmBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
  
  newConfirmBtn.addEventListener('click', () => {
    modal.classList.remove('active');
    onConfirm();
  });
  
  modal.classList.add('active');
}

// Financial Number Formatter Helpers
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function formatCurrency(val) {
  return currencyFormatter.format(val);
}

function formatPercent(val) {
  // Checks if value is already a full percentage scale or decimal ratio
  return percentFormatter.format(val);
}

// Export functions to window namespace
window.UI = {
  confirmAction,
  formatCurrency,
  formatPercent
};
