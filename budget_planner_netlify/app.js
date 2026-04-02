const STORAGE_KEY = 'budget_planner_premium_plus_v1';
const DEFAULT_CATEGORIES = [
  ['House Payment','🏠'],['Auto','🚗'],['Credit Cards','💳'],['Restaurant','🍽️'],
  ['Lights','💡'],['Water','💧'],['Fuel','⛽'],['Loans','📄'],['Medical','🩺'],['Insurance','🛡️']
];

const initialState = () => ({
  monthlyIncome: 0,
  currentMonth: monthKey(new Date()),
  selectedDate: dateInput(new Date()),
  categories: DEFAULT_CATEGORIES.map(([name, icon]) => ({ name, icon })),
  expenses: Object.fromEntries(DEFAULT_CATEGORIES.map(([name]) => [name, 0])),
  bills: [],
  history: [],
  theme: 'dark',
  billSearch: '',
  settings: {
    apiProvider: '',
    apiBaseUrl: '',
    apiKey: '',
    paymentLinkTemplate: ''
  }
});

let deferredPrompt = null;
let state = loadState();

const $ = id => document.getElementById(id);
const els = {
  monthLabel: $('monthLabel'),
  balanceMain: $('balanceMain'),
  incomeInline: $('incomeInline'),
  expensesInline: $('expensesInline'),
  incomeCard: $('incomeCard'),
  expenseCard: $('expenseCard'),
  openBillsCard: $('openBillsCard'),
  paidBillsCard: $('paidBillsCard'),
  summaryList: $('summaryList'),
  spendingChart: $('spendingChart'),
  monthlyIncome: $('monthlyIncome'),
  expenseFields: $('expenseFields'),
  billList: $('billList'),
  paymentQueue: $('paymentQueue'),
  calendarTitle: $('calendarTitle'),
  calendarGrid: $('calendarGrid'),
  selectedBills: $('selectedBills'),
  historyList: $('historyList'),
  installBtn: $('installBtn'),
  themeBtn: $('themeBtn'),
  billDialog: $('billDialog'),
  billForm: $('billForm'),
  billId: $('billId'),
  billName: $('billName'),
  billCategory: $('billCategory'),
  billType: $('billType'),
  billAmount: $('billAmount'),
  billDueDate: $('billDueDate'),
  billMerchant: $('billMerchant'),
  billAutoPay: $('billAutoPay'),
  billPaymentUrl: $('billPaymentUrl'),
  billNotes: $('billNotes'),
  billDialogTitle: $('billDialogTitle'),
  categoryDialog: $('categoryDialog'),
  categoryForm: $('categoryForm'),
  categoryName: $('categoryName'),
  categoryIcon: $('categoryIcon'),
  apiProvider: $('apiProvider'),
  apiBaseUrl: $('apiBaseUrl'),
  apiKeyInput: $('apiKeyInput'),
  paymentLinkTemplate: $('paymentLinkTemplate'),
  settingsStatus: $('settingsStatus'),
  billSearch: $('billSearch')
};

function normalizeState(parsed){
  const defaults = initialState();
  const categories = Array.isArray(parsed.categories) && parsed.categories.length
    ? parsed.categories.map(c => ({ name: String(c.name || '').trim(), icon: String(c.icon || '🧾').trim() || '🧾' })).filter(c => c.name)
    : defaults.categories;
  const expenses = { ...defaults.expenses, ...(parsed.expenses || {}) };
  categories.forEach(c => { if(typeof expenses[c.name] !== 'number') expenses[c.name] = Number(expenses[c.name] || 0); });
  return {
    ...defaults,
    ...parsed,
    categories,
    expenses,
    bills: Array.isArray(parsed.bills) ? parsed.bills : [],
    history: Array.isArray(parsed.history) ? parsed.history : [],
    settings: { ...defaults.settings, ...(parsed.settings || {}) }
  };
}

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return initialState();
    return normalizeState(JSON.parse(raw));
  }catch{
    return initialState();
  }
}

function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function money(v){ return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(v||0)); }
function monthKey(date){ const d = new Date(date); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
function monthTitle(k){ const [y,m]=k.split('-').map(Number); return new Date(y,m-1,1).toLocaleDateString('en-US',{month:'long',year:'numeric'}); }
function dateInput(date){ const d = new Date(date); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function totalExpenses(){ return Object.values(state.expenses).reduce((a,b)=>a+Number(b||0),0); }
function endingBalance(){ return Number(state.monthlyIncome||0)-totalExpenses(); }
function paidBills(){ return state.bills.filter(b=>b.isPaid).length; }
function openBills(){ return state.bills.filter(b=>!b.isPaid).length; }
function today(){ const d=new Date(); return new Date(d.getFullYear(),d.getMonth(),d.getDate()); }
function escapeHtml(str){ return String(str ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'); }
function slugify(text){ return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }
function searchFilter(){ return String(state.billSearch || '').trim().toLowerCase(); }
function filteredBills(){
  const term = searchFilter();
  const list = [...state.bills].sort((a,b)=>a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title));
  if(!term) return list;
  return list.filter(b => [b.title,b.category,b.type,b.merchant,b.notes,b.dueDate].some(v => String(v || '').toLowerCase().includes(term)));
}
function billsForDate(dateStr){ return state.bills.filter(b=>b.dueDate===dateStr).sort((a,b)=>a.title.localeCompare(b.title)); }
function unpaidBills(){ return filteredBills().filter(b=>!b.isPaid); }
function validateUrl(url){
  if(!url) return false;
  try{
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  }catch{return false;}
}

function applyTheme(){ document.body.classList.toggle('light', state.theme === 'light'); }
function categoryIcon(name){ return state.categories.find(c => c.name === name)?.icon || '🧾'; }

function renderBudgetFields(){
  els.expenseFields.innerHTML = '';
  state.categories.forEach(({ name, icon }) => {
    const card = document.createElement('div');
    card.className = 'category-card';
    card.innerHTML = `
      <div class="category-top">
        <div class="category-main">
          <div class="category-icon">${escapeHtml(icon)}</div>
          <div><strong>${escapeHtml(name)}</strong></div>
        </div>
        ${DEFAULT_CATEGORIES.some(([n]) => n === name) ? '' : '<button class="icon-btn" title="Remove category">✕</button>'}
      </div>
      <input type="number" min="0" step="0.01" placeholder="0.00" value="${state.expenses[name] || ''}" />
    `;
    card.querySelector('input').addEventListener('input', e => {
      state.expenses[name] = Number(e.target.value || 0);
      persistAndRender(false);
    });
    const removeBtn = card.querySelector('.icon-btn');
    if(removeBtn){
      removeBtn.addEventListener('click', () => {
        if(state.bills.some(b => b.category === name)){
          alert('This category is in use by one or more bills. Change those bills first, then remove the category.');
          return;
        }
        state.categories = state.categories.filter(c => c.name !== name);
        delete state.expenses[name];
        persistAndRender();
      });
    }
    els.expenseFields.appendChild(card);
  });
}

function renderDashboard(){
  els.monthLabel.textContent = `Current month: ${monthTitle(state.currentMonth)}`;
  els.balanceMain.textContent = money(endingBalance());
  els.incomeInline.textContent = money(state.monthlyIncome);
  els.expensesInline.textContent = money(totalExpenses());
  els.incomeCard.textContent = money(state.monthlyIncome);
  els.expenseCard.textContent = money(totalExpenses());
  els.openBillsCard.textContent = String(openBills());
  els.paidBillsCard.textContent = String(paidBills());

  const overdueCount = state.bills.filter(b => !b.isPaid && new Date(b.dueDate) < today()).length;
  const insuranceBills = state.bills.filter(b => (b.category === 'Insurance' || b.type === 'insurance') && !b.isPaid).length;
  const linkedPayments = state.bills.filter(b => resolvePaymentUrl(b)).length;
  els.summaryList.innerHTML = `
    <li>${paidBills()} bill${paidBills()===1?'':'s'} marked paid.</li>
    <li>${openBills()} open bill${openBills()===1?'':'s'} remaining.</li>
    <li>${overdueCount} overdue bill${overdueCount===1?'':'s'} this month.</li>
    <li>${insuranceBills} unpaid insurance bill${insuranceBills===1?'':'s'} tracked.</li>
    <li>${linkedPayments} bill${linkedPayments===1?'':'s'} with payment links ready.</li>
    <li>Projected rollover: ${money(Math.max(endingBalance(),0))}.</li>
  `;

  const maxValue = Math.max(1, ...state.categories.map(({name}) => Number(state.expenses[name] || 0)));
  els.spendingChart.innerHTML = state.categories.map(({name, icon}) => {
    const amount = Number(state.expenses[name] || 0);
    const pct = Math.round((amount / maxValue) * 100);
    return `
      <div class="chart-row">
        <div class="chart-head">
          <span>${escapeHtml(icon)} ${escapeHtml(name)}</span>
          <span>${money(amount)}</span>
        </div>
        <div class="chart-track"><div class="chart-fill" style="width:${pct}%"></div></div>
      </div>
    `;
  }).join('');
}

function renderBills(){
  const bills = filteredBills();
  if(!bills.length){
    els.billList.innerHTML = '<div class="bill-item"><div>No matching bills yet. Add your first bill.</div></div>';
    return;
  }
  els.billList.innerHTML = '';
  bills.forEach(bill => {
    const overdue = !bill.isPaid && new Date(bill.dueDate) < today();
    const paymentUrl = resolvePaymentUrl(bill);
    const div = document.createElement('div');
    div.className = 'bill-item';
    div.innerHTML = `
      <div class="bill-left">
        <input type="checkbox" ${bill.isPaid ? 'checked' : ''}>
        <div>
          <div><strong>${escapeHtml(bill.title)}</strong> — ${money(bill.amount)}</div>
          <div class="bill-meta">
            ${escapeHtml(bill.category || 'General')} • ${escapeHtml(bill.type || 'recurring')} • Due ${escapeHtml(bill.dueDate)}<br>
            ${bill.merchant ? `Merchant: ${escapeHtml(bill.merchant)}<br>` : ''}
            ${bill.notes ? `Notes: ${escapeHtml(bill.notes)}<br>` : ''}
            ${paymentUrl ? `Payment ready` : `No payment link yet`}
          </div>
        </div>
      </div>
      <div class="bill-actions">
        ${bill.autoPay ? '<span class="pill autopay">Auto Pay</span>' : ''}
        <span class="pill ${bill.isPaid ? 'paid' : overdue ? 'overdue' : 'open'}">${bill.isPaid ? 'Paid' : overdue ? 'Overdue' : 'Open'}</span>
        <button class="btn ghost" data-action="pay">Pay</button>
        <button class="btn ghost" data-action="edit">Edit</button>
        <button class="btn ghost" data-action="delete">Delete</button>
      </div>
    `;
    const checkbox = div.querySelector('input');
    const buttons = div.querySelectorAll('button');
    checkbox.addEventListener('change', e => {
      bill.isPaid = e.target.checked;
      bill.paidAt = bill.isPaid ? new Date().toISOString() : '';
      persistAndRender();
    });
    buttons.forEach(btn => btn.addEventListener('click', () => handleBillAction(btn.dataset.action, bill)));
    els.billList.appendChild(div);
  });
}

function renderPayments(){
  const bills = unpaidBills();
  if(!bills.length){
    els.paymentQueue.innerHTML = '<div class="payment-item"><div>No unpaid bills in the current list.</div></div>';
    return;
  }
  els.paymentQueue.innerHTML = '';
  bills.forEach(bill => {
    const paymentUrl = resolvePaymentUrl(bill);
    const overdue = new Date(bill.dueDate) < today();
    const item = document.createElement('div');
    item.className = 'payment-item';
    item.innerHTML = `
      <div>
        <div><strong>${escapeHtml(bill.title)}</strong> — ${money(bill.amount)}</div>
        <div class="bill-meta">
          ${escapeHtml(bill.category || 'General')} • Due ${escapeHtml(bill.dueDate)} ${overdue ? '• Overdue' : ''}<br>
          ${paymentUrl ? escapeHtml(paymentUrl) : 'Add a bill payment URL or a global payment link template in Settings.'}
        </div>
      </div>
      <div class="bill-actions">
        <button class="btn primary" data-action="pay">Open Pay Link</button>
        <button class="btn ghost" data-action="mark">Mark Paid</button>
      </div>
    `;
    item.querySelector('[data-action="pay"]').addEventListener('click', () => payBill(bill));
    item.querySelector('[data-action="mark"]').addEventListener('click', () => {
      bill.isPaid = true;
      bill.paidAt = new Date().toISOString();
      persistAndRender();
    });
    els.paymentQueue.appendChild(item);
  });
}

function renderCalendar(){
  const [year, month] = state.currentMonth.split('-').map(Number);
  const first = new Date(year, month - 1, 1);
  const start = first.getDay();
  const days = new Date(year, month, 0).getDate();
  els.calendarTitle.textContent = monthTitle(state.currentMonth);
  els.calendarGrid.innerHTML = '';
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d => {
    const el = document.createElement('div');
    el.className = 'cal-head';
    el.textContent = d;
    els.calendarGrid.appendChild(el);
  });
  for(let i=0; i<start; i++){
    const blank = document.createElement('div');
    blank.className = 'cal-day muted';
    els.calendarGrid.appendChild(blank);
  }
  for(let day=1; day<=days; day++){
    const dateStr = `${state.currentMonth}-${String(day).padStart(2,'0')}`;
    const count = billsForDate(dateStr).length;
    const btn = document.createElement('button');
    btn.className = 'cal-day';
    if(state.selectedDate === dateStr) btn.classList.add('selected');
    btn.innerHTML = `<div>${day}</div>${count ? `<div class="cal-count">${count} bill${count===1?'':'s'}</div>` : ''}`;
    btn.addEventListener('click', () => {
      state.selectedDate = dateStr;
      persistAndRender(false);
    });
    els.calendarGrid.appendChild(btn);
  }
  renderSelectedBills();
}

function renderSelectedBills(){
  const bills = billsForDate(state.selectedDate);
  if(!bills.length){
    els.selectedBills.innerHTML = `<div class="day-item"><div>No bills due on ${state.selectedDate}.</div></div>`;
    return;
  }
  els.selectedBills.innerHTML = bills.map(b => `
    <div class="day-item">
      <div>
        <strong>${escapeHtml(b.title)}</strong>
        <div class="bill-meta">${escapeHtml(b.category || 'General')} • ${escapeHtml(b.type || 'recurring')}</div>
      </div>
      <div class="bill-actions">
        <strong>${money(b.amount)}</strong>
        <button class="btn ghost" onclick="window.__payBill('${b.id}')">Pay</button>
      </div>
    </div>
  `).join('');
}

function renderHistory(){
  const history = [...state.history].reverse();
  if(!history.length){
    els.historyList.innerHTML = '<div class="history-item"><div>No completed month history yet.</div></div>';
    return;
  }
  els.historyList.innerHTML = history.map(item => `
    <div class="history-item">
      <div>
        <strong>${escapeHtml(item.month)}</strong>
        <div class="bill-meta">Income ${money(item.income)} • Expenses ${money(item.expenses)}</div>
      </div>
      <div><strong>${money(item.balance)}</strong></div>
    </div>
  `).join('');
}

function renderSettings(){
  els.apiProvider.value = state.settings.apiProvider || '';
  els.apiBaseUrl.value = state.settings.apiBaseUrl || '';
  els.apiKeyInput.value = state.settings.apiKey || '';
  els.paymentLinkTemplate.value = state.settings.paymentLinkTemplate || '';
}

function renderAll(){
  applyTheme();
  els.monthlyIncome.value = state.monthlyIncome || '';
  els.billSearch.value = state.billSearch || '';
  renderBudgetFields();
  renderDashboard();
  renderBills();
  renderPayments();
  renderCalendar();
  renderHistory();
  renderSettings();
}

function persistAndRender(full = true){
  saveState();
  if(full) renderAll();
  else {
    applyTheme();
    renderDashboard();
    renderPayments();
    renderCalendar();
    renderHistory();
  }
}

function openBillDialog(bill = null){
  els.billDialogTitle.textContent = bill ? 'Edit Bill' : 'Add Bill';
  els.billId.value = bill?.id || '';
  els.billName.value = bill?.title || '';
  els.billCategory.value = bill?.category || 'Insurance';
  els.billType.value = bill?.type || (bill?.category === 'Insurance' ? 'insurance' : 'recurring');
  els.billAmount.value = bill?.amount || '';
  els.billDueDate.value = bill?.dueDate || state.selectedDate || dateInput(new Date());
  els.billMerchant.value = bill?.merchant || '';
  els.billAutoPay.value = bill?.autoPay ? 'yes' : 'no';
  els.billPaymentUrl.value = bill?.paymentUrl || '';
  els.billNotes.value = bill?.notes || '';
  els.billDialog.showModal();
}

function closeBillDialog(){
  els.billDialog.close();
  els.billForm.reset();
}

function resolvePaymentUrl(bill){
  if(validateUrl(bill.paymentUrl)) return bill.paymentUrl;
  const template = String(state.settings.paymentLinkTemplate || '').trim();
  if(!template) return '';
  return template
    .replaceAll('{billId}', encodeURIComponent(bill.id))
    .replaceAll('{amount}', encodeURIComponent(Number(bill.amount || 0).toFixed(2)))
    .replaceAll('{title}', encodeURIComponent(bill.title || 'Bill'))
    .replaceAll('{category}', encodeURIComponent(bill.category || 'General'))
    .replaceAll('{merchant}', encodeURIComponent(bill.merchant || ''));
}

function payBill(bill){
  const paymentUrl = resolvePaymentUrl(bill);
  if(!validateUrl(paymentUrl)){
    alert('No valid payment link is set for this bill yet. Add one on the bill or in Settings.');
    return;
  }
  window.open(paymentUrl, '_blank', 'noopener,noreferrer');
}

function handleBillAction(action, bill){
  if(action === 'edit') return openBillDialog(bill);
  if(action === 'delete'){
    state.bills = state.bills.filter(b => b.id !== bill.id);
    persistAndRender();
    return;
  }
  if(action === 'pay'){
    payBill(bill);
  }
}

function addCategory(name, icon){
  const trimmed = String(name || '').trim();
  if(!trimmed) return;
  if(state.categories.some(c => c.name.toLowerCase() === trimmed.toLowerCase())){
    alert('That category already exists.');
    return;
  }
  state.categories.push({ name: trimmed, icon: String(icon || '🧾').trim() || '🧾' });
  state.expenses[trimmed] = 0;
  persistAndRender();
}

function rolloverMonth(){
  const balance = endingBalance();
  state.history.push({
    month: monthTitle(state.currentMonth),
    income: Number(state.monthlyIncome || 0),
    expenses: totalExpenses(),
    balance
  });
  const parts = state.currentMonth.split('-').map(Number);
  const nextDate = new Date(parts[0], parts[1], 1);
  state.currentMonth = monthKey(nextDate);
  state.selectedDate = dateInput(nextDate);
  state.monthlyIncome = Math.max(balance, 0);
  state.categories.forEach(({name}) => { state.expenses[name] = 0; });
  state.bills = state.bills.map(b => {
    if(b.type === 'one-time'){
      return { ...b, archived: true };
    }
    const oldDue = new Date(b.dueDate);
    const safeDay = Math.min(oldDue.getDate(), 28);
    const due = new Date(nextDate.getFullYear(), nextDate.getMonth(), safeDay);
    return { ...b, dueDate: dateInput(due), isPaid: false, paidAt: '' };
  }).filter(b => !b.archived);
  persistAndRender();
  alert('Budget rolled into the next month. Recurring bills moved forward. One-time bills were archived.');
}

function saveSettings(){
  state.settings = {
    apiProvider: els.apiProvider.value.trim(),
    apiBaseUrl: els.apiBaseUrl.value.trim(),
    apiKey: els.apiKeyInput.value.trim(),
    paymentLinkTemplate: els.paymentLinkTemplate.value.trim()
  };
  persistAndRender();
  els.settingsStatus.textContent = 'Settings saved on this device.';
}

async function copySettings(){
  const text = JSON.stringify(state.settings, null, 2);
  try{
    await navigator.clipboard.writeText(text);
    els.settingsStatus.textContent = 'Settings JSON copied to clipboard.';
  }catch{
    els.settingsStatus.textContent = 'Copy failed. Your browser blocked clipboard access.';
  }
}

function exportBackup(){
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `budget-planner-backup-${state.currentMonth}.json`;
  a.click();
  URL.revokeObjectURL(url);
  els.settingsStatus.textContent = 'Backup exported.';
}

function importBackup(file){
  const reader = new FileReader();
  reader.onload = () => {
    try{
      state = normalizeState(JSON.parse(String(reader.result || '{}')));
      persistAndRender();
      els.settingsStatus.textContent = 'Backup imported successfully.';
    }catch{
      els.settingsStatus.textContent = 'Import failed. That file is not a valid backup.';
    }
  };
  reader.readAsText(file);
}

function setActiveTab(tabName){
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const active = document.getElementById(`tab-${tabName}`);
  if(active) active.classList.add('active');
}

window.__payBill = id => {
  const bill = state.bills.find(b => b.id === id);
  if(bill) payBill(bill);
};

document.querySelectorAll('.nav-item').forEach(btn => btn.addEventListener('click', () => setActiveTab(btn.dataset.tab)));
els.monthlyIncome.addEventListener('input', e => { state.monthlyIncome = Number(e.target.value || 0); persistAndRender(false); });
els.billSearch.addEventListener('input', e => { state.billSearch = e.target.value; renderBills(); renderPayments(); saveState(); });
$('addBillBtn').addEventListener('click', () => openBillDialog());
$('quickAddInsuranceBtn').addEventListener('click', () => openBillDialog({ category: 'Insurance', type: 'insurance' }));
$('cancelBillBtn').addEventListener('click', closeBillDialog);
$('rolloverBtn').addEventListener('click', rolloverMonth);
$('prevMonthBtn').addEventListener('click', () => { const parts = state.currentMonth.split('-').map(Number); const d = new Date(parts[0], parts[1]-2, 1); state.currentMonth = monthKey(d); state.selectedDate = dateInput(d); persistAndRender(false); });
$('nextMonthBtn').addEventListener('click', () => { const parts = state.currentMonth.split('-').map(Number); const d = new Date(parts[0], parts[1], 1); state.currentMonth = monthKey(d); state.selectedDate = dateInput(d); persistAndRender(false); });
els.themeBtn.addEventListener('click', () => { state.theme = state.theme === 'dark' ? 'light' : 'dark'; persistAndRender(false); });
$('addCategoryBtn').addEventListener('click', () => els.categoryDialog.showModal());
$('cancelCategoryBtn').addEventListener('click', () => { els.categoryDialog.close(); els.categoryForm.reset(); });
$('openPaymentSettingsBtn').addEventListener('click', () => setActiveTab('settings'));
$('saveSettingsBtn').addEventListener('click', saveSettings);
$('copySettingsBtn').addEventListener('click', copySettings);
$('exportDataBtn').addEventListener('click', exportBackup);
$('importDataInput').addEventListener('change', e => { const file = e.target.files?.[0]; if(file) importBackup(file); e.target.value = ''; });

els.categoryForm.addEventListener('submit', e => {
  e.preventDefault();
  addCategory(els.categoryName.value, els.categoryIcon.value);
  els.categoryDialog.close();
  els.categoryForm.reset();
});

els.billForm.addEventListener('submit', e => {
  e.preventDefault();
  const category = els.billCategory.value.trim() || 'General';
  if(!state.categories.some(c => c.name.toLowerCase() === category.toLowerCase())){
    state.categories.push({ name: category, icon: category.toLowerCase().includes('insurance') ? '🛡️' : '🧾' });
    if(typeof state.expenses[category] !== 'number') state.expenses[category] = 0;
  }
  const bill = {
    id: els.billId.value || (crypto.randomUUID ? crypto.randomUUID() : `bill-${Date.now()}-${Math.random().toString(16).slice(2)}`),
    title: els.billName.value.trim(),
    category,
    type: els.billType.value,
    amount: Number(els.billAmount.value || 0),
    dueDate: els.billDueDate.value,
    merchant: els.billMerchant.value.trim(),
    autoPay: els.billAutoPay.value === 'yes',
    paymentUrl: els.billPaymentUrl.value.trim(),
    notes: els.billNotes.value.trim(),
    isPaid: state.bills.find(b => b.id === els.billId.value)?.isPaid || false,
    paidAt: state.bills.find(b => b.id === els.billId.value)?.paidAt || ''
  };
  if(!bill.title || !bill.dueDate) return;
  const idx = state.bills.findIndex(b => b.id === bill.id);
  if(idx >= 0) state.bills[idx] = bill;
  else state.bills.push(bill);
  if(Object.prototype.hasOwnProperty.call(state.expenses, bill.category)){
    const billsTotal = state.bills.filter(b => b.category === bill.category && !b.isPaid).reduce((sum, b) => sum + Number(b.amount || 0), 0);
    state.expenses[bill.category] = billsTotal;
  }
  closeBillDialog();
  persistAndRender();
});

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  els.installBtn.classList.remove('hidden');
});
els.installBtn.addEventListener('click', async () => {
  if(!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  els.installBtn.classList.add('hidden');
});

if('serviceWorker' in navigator){
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
}

renderAll();
