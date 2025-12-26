const apiBase = '/api';

function getDeviceId() {
    // Demo Mode: Use sessionStorage so data 'resets' when tab is closed
    let deviceId = sessionStorage.getItem('device_id');
    if (!deviceId) {
        deviceId = crypto.randomUUID();
        sessionStorage.setItem('device_id', deviceId);
    }
    return deviceId;
}

const DEVICE_ID = getDeviceId();
const HEADERS = {
    'Content-Type': 'application/json',
    'X-User-ID': DEVICE_ID
};

// Fetch Fetch Wrapper to include headers automatically
async function apiFetch(url, options = {}) {
    options.headers = { ...options.headers, ...HEADERS };
    const response = await fetch(url, options);
    return response;
}

// DOM Elements
const currentBalanceEl = document.getElementById('current-balance');
const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const historyList = document.getElementById('history-list');
const transactionForm = document.getElementById('transaction-form'); // Renamed from 'form'
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatBody = document.getElementById('chat-body');
const chatPopup = document.getElementById('chat-popup');
const themeToggle = document.getElementById('theme-toggle');

// Chart Contexts
const expenseCatCtx = document.getElementById('expenseCategoryChart').getContext('2d');
const monthlyTrendCtx = document.getElementById('monthlyTrendChart').getContext('2d');
const dailyTrendCtx = document.getElementById('dailyTrendChart').getContext('2d');

// Chart instances
let categoryChart = null; // Renamed from 'expenseChart'
let monthlyChart = null;
let dailyChart = null;

// --- Internationalization ---
const translations = {
    'en': {
        'nav_dashboard': 'Dashboard',
        'nav_transactions': 'Transactions',
        'nav_analytics': 'Analytics',
        'nav_settings': 'Settings',
        'dashboard_overview': 'Dashboard',
        'total_income': 'Total Income',
        'total_expense': 'Total Expense',
        'current_balance': 'Current Balance',
        'expense_breakdown': 'Expense Breakdown',
        'monthly_overview': 'Monthly Overview',
        'daily_activity': 'Daily Activity',
        'add_transaction': 'Add Transaction',
        'opt_expense': 'Expense',
        'opt_income': 'Income',
        'btn_add_transaction': 'Add Transaction',
        'recent_history': 'Recent History',
        'filter_all': 'All',
        'filter_income': 'Income',
        'filter_expense': 'Expense',
        'ai_assistant': 'AI Assistant',
        'chat_welcome': 'Hi! I can help you track expenses. <br>Try: "Spent 500 for lunch"',
        'placeholder_amount': 'Amount (৳)',
        'placeholder_category': 'Category (e.g. Food, Salary)',
        'placeholder_note': 'Note (optional)',
        'placeholder_chat': 'Type here...'
    },
    'bn': {
        'nav_dashboard': 'ড্যাশবোর্ড',
        'nav_transactions': 'লেনদেন',
        'nav_analytics': 'অ্যানালিটিক্স',
        'nav_settings': 'সেটিংস',
        'dashboard_overview': 'ড্যাশবোর্ড',
        'total_income': 'মোট আয়',
        'total_expense': 'মোট ব্যয়',
        'current_balance': 'বর্তমান ব্যালেন্স',
        'expense_breakdown': 'ব্যয়ের বিবরণ',
        'monthly_overview': 'মাসিক পর্যালোচনা',
        'daily_activity': 'দৈনিক কার্যকলাপ',
        'add_transaction': 'লেনদেন যোগ করুন',
        'opt_expense': 'ব্যয়',
        'opt_income': 'আয়',
        'btn_add_transaction': 'যোগ করুন',
        'recent_history': 'সাম্প্রতিক ইতিহাস',
        'filter_all': 'সব',
        'filter_income': 'আয়',
        'filter_expense': 'ব্যয়',
        'ai_assistant': 'এআই অ্যাসিস্ট্যান্ট',
        'chat_welcome': 'আমি আপনাকে খরচ ট্র্যাক করতে সাহায্য করতে পারি। <br>লিখুন: "দুপুরের খাবারের জন্য ৫০০ টাকা খরচ"',
        'placeholder_amount': 'পরিমাণ (৳)',
        'placeholder_category': 'ক্যাটাগরি (যেমন: খাবার, বেতন)',
        'placeholder_note': 'নোট (ঐচ্ছিক)',
        'placeholder_chat': 'এখানে লিখুন...'
    }
};

let currentLang = localStorage.getItem('lang') || 'en';

function applyLanguage(lang) {
    document.documentElement.lang = lang;
    const t = translations[lang];

    // Update Text Content
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) {
            if (key === 'chat_welcome') el.innerHTML = t[key]; // HTML content support
            else el.innerText = t[key];
        }
    });

    // Update Placeholders
    if (t['placeholder_amount']) document.getElementById('t-amount').placeholder = t['placeholder_amount'];
    if (t['placeholder_category']) document.getElementById('t-category').placeholder = t['placeholder_category'];
    if (t['placeholder_note']) document.getElementById('t-note').placeholder = t['placeholder_note'];
    if (t['placeholder_chat']) document.getElementById('chat-input').placeholder = t['placeholder_chat'];

    // Update Toggle Button Text
    const langBtn = document.getElementById('lang-toggle');
    if (langBtn) {
        langBtn.innerText = lang === 'en' ? '🇺🇸' : '🇧🇩';
    }
}

// Set Today's Date (Local Time)
function setTodayDate() {
    const dateInput = document.getElementById('t-date');
    if (dateInput) {
        const now = new Date();
        // Adjust for timezone offset to get local YYYY-MM-DD
        const offset = now.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(now - offset)).toISOString().slice(0, 10);
        dateInput.value = localISOTime;
    }
}

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    // ... existing setup ...
    applyLanguage(currentLang);

    // Language Toggle
    const langBtn = document.getElementById('lang-toggle');
    if (langBtn) {
        langBtn.addEventListener('click', () => {
            currentLang = currentLang === 'en' ? 'bn' : 'en';
            localStorage.setItem('lang', currentLang);
            applyLanguage(currentLang);
        });
    }

    // Set default date to today
    setTodayDate();
    fetchSummary();
    fetchTransactions();

    // Theme check
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
    }

    // Event Listeners for forms
    transactionForm.addEventListener('submit', handleAddTransaction);
    chatForm.addEventListener('submit', handleChatSubmit);
});

// Theme Toggle
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
});

// Chat Toggle
function toggleChat() {
    chatPopup.classList.toggle('hidden');
}

// Sidebar Toggle (Mobile Slide / Desktop Collapse)
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const mainWrapper = document.querySelector('.main-wrapper');
    const btnIcon = document.querySelector('.sidebar-close-btn i');
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
        // Mobile: Slide in/out
        sidebar.classList.toggle('active');
    } else {
        // Desktop: Collapse/Expand
        sidebar.classList.toggle('collapsed');
        mainWrapper.classList.toggle('collapsed');

        // Toggle Icon
        if (sidebar.classList.contains('collapsed')) {
            btnIcon.classList.remove('fa-chevron-left');
            btnIcon.classList.add('fa-chevron-right');
        } else {
            btnIcon.classList.remove('fa-chevron-right');
            btnIcon.classList.add('fa-chevron-left');
        }
    }
}

// API Calls
async function fetchSummary() {
    try {
        const res = await apiFetch(`${apiBase}/summary`);
        const data = await res.json();

        totalIncomeEl.innerText = `৳${data.total_income}`;
        totalExpenseEl.innerText = `৳${data.total_expense}`;
        currentBalanceEl.innerText = `৳${data.balance}`;

        updateCharts(data);
    } catch (err) {
        console.error("Error fetching summary:", err);
    }
}

async function fetchTransactions(type = null) {
    try {
        let url = `${apiBase}/transactions`;
        if (type && type !== 'all') {
            url += `?type=${type}`;
        }

        const res = await apiFetch(url);
        const data = await res.json();

        renderHistory(data);
    } catch (err) {
        console.error("Error fetching transactions:", err);
    }
}

// Render DOM
function renderHistory(transactions) {
    historyList.innerHTML = '';
    transactions.forEach(t => {
        const item = document.createElement('li');
        // Match new CSS class 'transaction-item'
        item.classList.add('transaction-item');
        // Add styling border color dynamically or via helper class if needed
        item.style.borderLeft = `4px solid ${t.type === 'income' ? 'var(--success)' : 'var(--danger)'}`;

        item.innerHTML = `
            <div class="t-info">
                <h4>${t.category}</h4>
                <span>${t.date} | ${t.note || ''}</span>
            </div>
            <div class="t-amount" style="color: ${t.type === 'income' ? 'var(--success)' : 'var(--danger)'}">
                ${t.type === 'income' ? '+' : '-'}৳${t.amount}
                <button class="delete-btn" onclick="deleteTransaction('${t.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        historyList.appendChild(item);
    });
}

function updateCharts(data) {
    // 1. Category Chart (Pie/Doughnut)
    if (categoryChart) categoryChart.destroy();

    categoryChart = new Chart(expenseCatCtx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(data.category_expense),
            datasets: [{
                data: Object.values(data.category_expense),
                backgroundColor: ['#e74c3c', '#3498db', '#f1c40f', '#9b59b6', '#2ecc71', '#e67e22'],
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: { display: true, text: 'Expense by Category' }
            }
        }
    });

    // 2. Monthly Trend (Bar)
    if (monthlyChart) monthlyChart.destroy();

    // Sort months strictly is better, but simple keys sort works for ISO "YYYY-MM" usually
    const months = Object.keys(data.breakdown.monthly.income).concat(Object.keys(data.breakdown.monthly.expense));
    const uniqueMonths = [...new Set(months)].sort();

    monthlyChart = new Chart(monthlyTrendCtx, {
        type: 'bar',
        data: {
            labels: uniqueMonths,
            datasets: [
                {
                    label: 'Income',
                    data: uniqueMonths.map(m => data.breakdown.monthly.income[m] || 0),
                    backgroundColor: '#2ecc71'
                },
                {
                    label: 'Expense',
                    data: uniqueMonths.map(m => data.breakdown.monthly.expense[m] || 0),
                    backgroundColor: '#e74c3c'
                }
            ]
        },
        options: {
            responsive: true,
            plugins: { title: { display: true, text: 'Monthly Overview' } }
        }
    });

    // 3. Daily Trend (Line) - Last 30 days visualization ideally, but showing all for now
    if (dailyChart) dailyChart.destroy();

    const days = Object.keys(data.breakdown.daily.income).concat(Object.keys(data.breakdown.daily.expense));
    const uniqueDays = [...new Set(days)].sort().slice(-14); // Last 14 days active

    dailyChart = new Chart(dailyTrendCtx, {
        type: 'line',
        data: {
            labels: uniqueDays,
            datasets: [
                {
                    label: 'Income',
                    data: uniqueDays.map(d => data.breakdown.daily.income[d] || 0),
                    borderColor: '#2ecc71',
                    fill: false
                },
                {
                    label: 'Expense',
                    data: uniqueDays.map(d => data.breakdown.daily.expense[d] || 0),
                    borderColor: '#e74c3c',
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            plugins: { title: { display: true, text: 'Daily Trend (Last 14 Days)' } }
        }
    });
}

// Event Listeners
async function handleAddTransaction(e) {
    e.preventDefault();

    const transaction = {
        id: crypto.randomUUID(),
        type: document.getElementById('t-type').value,
        amount: parseFloat(document.getElementById('t-amount').value),
        category: document.getElementById('t-category').value,
        date: document.getElementById('t-date').value,
        note: document.getElementById('t-note').value
    };

    const res = await apiFetch(`${apiBase}/transactions`, {
        method: 'POST',
        body: JSON.stringify(transaction)
    });

    if (res.ok) {
        transactionForm.reset();
        setTodayDate(); // Reset date to today
        fetchSummary();
        fetchTransactions();
    } else {
        alert('Error adding transaction');
    }
}

function addChatMessage(text, sender) {
    const div = document.createElement('div');
    div.classList.add('chat-message', sender);
    div.innerText = text;
    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
}

async function handleChatSubmit(e) {
    e.preventDefault();
    const text = chatInput.value;
    addChatMessage(text, 'user');
    chatInput.value = '';

    const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-User-ID': DEVICE_ID
        },
        body: JSON.stringify({ text })
    });

    const result = await res.json();
    if (res.ok) {
        addChatMessage(`✅ Added: ${result.data.type} of ৳${result.data.amount} for ${result.data.category}`, 'bot');
        fetchSummary();
        fetchTransactions();
    } else {
        addChatMessage(`❌ Error: ${result.detail}`, 'bot');
    }
}

async function deleteTransaction(id) {
    if (!confirm('Delete this transaction?')) return;

    await apiFetch(`${apiBase}/transactions/${id}`, { method: 'DELETE' });
    fetchSummary();
    fetchTransactions();
}

function filterTransactions(type) {
    document.querySelectorAll('.filters button').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');

    if (type === 'all') fetchTransactions();
    else fetchTransactions(type);
}
