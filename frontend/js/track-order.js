// Update this if the backend API isn't served from the same origin/proxy path.
const API_BASE = window.PRICHOY_API_BASE || '/api';

const form = document.getElementById('track-form');
const submitBtn = document.getElementById('track-submit');
const errorBox = document.getElementById('form-error');
const resultBox = document.getElementById('result');

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
  resultBox.hidden = true;
}

function clearError() {
  errorBox.hidden = true;
}

function renderResult(data) {
  clearError();
  resultBox.hidden = false;

  resultBox.querySelector('.result-order-no').textContent = `Order #${data.orderNo}`;
  resultBox.querySelector('.result-date').textContent = new Date(data.orderDate).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  resultBox.querySelector('.result-status-badge').textContent = data.statusLabel;
  resultBox.querySelector('.result-courier').textContent = data.courierName || 'Not yet assigned';
  resultBox.querySelector('.result-tracking-number').textContent = data.trackingNumber || 'Not yet available';
  resultBox.querySelector('.result-eta').textContent = data.estimatedDelivery
    ? new Date(data.estimatedDelivery).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Not yet available';

  const timeline = document.getElementById('timeline');
  timeline.innerHTML = '';
  data.timeline.forEach((step) => {
    const li = document.createElement('li');
    const label = document.createElement('div');
    label.className = 't-label';
    label.textContent = step.statusLabel;
    const time = document.createElement('div');
    time.className = 't-time';
    time.textContent = new Date(step.changedAt).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    li.appendChild(label);
    li.appendChild(time);
    timeline.appendChild(li);
  });

  resultBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function trackByOrderAndPhone(orderNo, phone) {
  const res = await fetch(`${API_BASE}/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderNo, phone }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Order not found');
  }
  return json.data;
}

async function trackByToken(token) {
  const res = await fetch(`${API_BASE}/track/${encodeURIComponent(token)}`);
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Tracking link is invalid or has expired');
  }
  return json.data;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();
  submitBtn.disabled = true;
  submitBtn.textContent = 'Tracking...';

  try {
    const orderNo = document.getElementById('orderNo').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const data = await trackByOrderAndPhone(orderNo, phone);
    renderResult(data);
  } catch (err) {
    showError(err.message || 'Something went wrong. Please try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Track Order';
  }
});

// Support the "Track My Order" email button / QR code, which links here
// with ?token=<trackingToken> — skip the form entirely in that case.
(function initFromQueryToken() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  if (!token) return;

  submitBtn.disabled = true;
  trackByToken(token)
    .then(renderResult)
    .catch((err) => showError(err.message || 'Tracking link is invalid or has expired'))
    .finally(() => { submitBtn.disabled = false; });
})();
