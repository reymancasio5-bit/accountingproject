/**
 * LedgerPro — Main Application
 * Complete client-side accounting system
 */

'use strict';

// ════════════════════════════════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════════════════════════════════
const Utils = {
  fmt(n, decimals = 2) {
    const v = parseFloat(n) || 0;
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(v);
  },
  fmtCurrency(n) {
    const v = parseFloat(n) || 0;
    return '$' + this.fmt(Math.abs(v));
  },
  uid(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  },
  today() {
    return new Date().toISOString().split('T')[0];
  },
  fmtDate(d) {
    if (!d) return '';
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  },
  escHtml(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  },
  debounce(fn, ms = 300) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }
};

// ════════════════════════════════════════════════════════════════════
// TOAST
// ════════════════════════════════════════════════════════════════════
const Toast = {
  show(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4100);
  },
  success: (m) => Toast.show(m, 'success'),
  error: (m) => Toast.show(m, 'error'),
  warning: (m) => Toast.show(m, 'warning'),
};

// ════════════════════════════════════════════════════════════════════
// LOADING
// ════════════════════════════════════════════════════════════════════
const Loading = {
  show(text = 'Processing...') {
    document.getElementById('loading-text').textContent = text;
    document.getElementById('loading-overlay').classList.remove('hidden');
  },
  hide() {
    document.getElementById('loading-overlay').classList.add('hidden');
  }
};

// ════════════════════════════════════════════════════════════════════
// PDF REPORT GENERATOR
// ════════════════════════════════════════════════════════════════════
const PDFReport = {
  async generate(type) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 48;
    const pageW = doc.internal.pageSize.getWidth();
    let y = margin;

    const addHeader = (title, subtitle) => {
      // Dark header bar
      doc.setFillColor(13, 20, 38);
      doc.rect(0, 0, pageW, 72, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text('LedgerPro', margin, 36);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(150, 170, 200);
      doc.text(`Generated: ${Utils.fmtDate(Utils.today())}`, pageW - margin, 28, { align: 'right' });
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(title, margin, 58);
      y = 96;
      // Subtitle
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(120, 130, 150);
      doc.text(subtitle, margin, y);
      y += 20;
    };

    const sectionHeader = (text) => {
      doc.setFillColor(237, 240, 248);
      doc.rect(margin - 4, y - 12, pageW - margin * 2 + 8, 18, 'F');
      doc.setFillColor(79, 142, 247);
      doc.rect(margin - 4, y - 12, 3, 18, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 49, 96);
      doc.text(text.toUpperCase(), margin + 4, y);
      y += 18;
    };

    const dataRow = (label, amount, isBold = false, isTotal = false) => {
      if (y > 700) { doc.addPage(); y = 60; }
      if (isTotal) {
        doc.setFillColor(13, 20, 38);
        doc.rect(margin - 4, y - 12, pageW - margin * 2 + 8, 18, 'F');
        doc.setTextColor(255, 255, 255);
      } else {
        doc.setTextColor(60, 70, 90);
      }
      doc.setFont('helvetica', isBold || isTotal ? 'bold' : 'normal');
      doc.setFontSize(isBold ? 10 : 9.5);
      doc.text(label, margin + 4, y);
      doc.text(amount, pageW - margin, y, { align: 'right' });
      if (!isTotal) {
        doc.setDrawColor(220, 225, 235);
        doc.line(margin, y + 4, pageW - margin, y + 4);
      }
      y += 18;
    };

    const accounts = await DB.getAccountBalances();
    const lines = await DB.getLines();

    if (type === 'income') {
      addHeader('Income Statement', 'For the period ended ' + Utils.fmtDate(Utils.today()));
      y += 8;

      const revenues = accounts.filter(a => a.type === 'Revenue');
      const expenses = accounts.filter(a => a.type === 'Expense');

      sectionHeader('Revenue');
      let totalRev = 0;
      revenues.forEach(a => {
        const bal = this._getBalance(a, lines);
        if (bal !== 0) { dataRow(a.name, Utils.fmtCurrency(bal)); totalRev += bal; }
      });
      dataRow('Total Revenue', Utils.fmtCurrency(totalRev), true);
      y += 6;

      sectionHeader('Cost of Goods Sold');
      const cogs = accounts.find(a => a.code === '5000');
      const cogsBal = cogs ? this._getBalance(cogs, lines) : 0;
      if (cogsBal) dataRow(cogs.name, Utils.fmtCurrency(cogsBal));
      dataRow('Gross Profit', Utils.fmtCurrency(totalRev - cogsBal), true);
      y += 6;

      sectionHeader('Operating Expenses');
      let totalExp = cogsBal;
      expenses.filter(a => a.code !== '5000').forEach(a => {
        const bal = this._getBalance(a, lines);
        if (bal !== 0) { dataRow(a.name, Utils.fmtCurrency(bal)); totalExp += bal; }
      });
      dataRow('Total Expenses', Utils.fmtCurrency(totalExp), true);
      y += 6;

      const netIncome = totalRev - totalExp;
      dataRow('NET INCOME (LOSS)', Utils.fmtCurrency(netIncome), true, true);

    } else if (type === 'balance') {
      addHeader('Balance Sheet', 'As of ' + Utils.fmtDate(Utils.today()));
      y += 8;

      const assets = accounts.filter(a => a.type === 'Asset');
      const liabs = accounts.filter(a => a.type === 'Liability');
      const equity = accounts.filter(a => a.type === 'Equity');

      sectionHeader('Assets');
      let totalAssets = 0;
      assets.forEach(a => {
        const bal = this._getBalance(a, lines);
        if (bal !== 0) { dataRow(a.name, Utils.fmtCurrency(bal)); totalAssets += bal; }
      });
      dataRow('Total Assets', Utils.fmtCurrency(totalAssets), true, true);
      y += 10;

      sectionHeader('Liabilities');
      let totalLiab = 0;
      liabs.forEach(a => {
        const bal = this._getBalance(a, lines);
        if (bal !== 0) { dataRow(a.name, Utils.fmtCurrency(bal)); totalLiab += bal; }
      });
      dataRow('Total Liabilities', Utils.fmtCurrency(totalLiab), true);
      y += 6;

      sectionHeader('Equity');
      let totalEq = 0;
      equity.forEach(a => {
        const bal = this._getBalance(a, lines);
        if (bal !== 0) { dataRow(a.name, Utils.fmtCurrency(bal)); totalEq += bal; }
      });

      // Add net income to retained earnings conceptually
      const revenues = accounts.filter(a => a.type === 'Revenue');
      const expenses = accounts.filter(a => a.type === 'Expense');
      let netInc = 0;
      revenues.forEach(a => netInc += this._getBalance(a, lines));
      expenses.forEach(a => netInc -= this._getBalance(a, lines));
      if (netInc !== 0) { dataRow('Net Income (Current)', Utils.fmtCurrency(netInc)); totalEq += netInc; }

      dataRow('Total Equity', Utils.fmtCurrency(totalEq), true);
      y += 6;
      dataRow('TOTAL LIABILITIES & EQUITY', Utils.fmtCurrency(totalLiab + totalEq), true, true);

    } else if (type === 'trial') {
      addHeader('Trial Balance', 'As of ' + Utils.fmtDate(Utils.today()));
      y += 8;

      // Table header
      doc.setFillColor(13, 20, 38);
      doc.rect(margin - 4, y - 12, pageW - margin * 2 + 8, 18, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text('Account', margin + 4, y);
      doc.text('Debit', pageW - margin - 70, y, { align: 'right' });
      doc.text('Credit', pageW - margin, y, { align: 'right' });
      y += 18;

      let totalDr = 0, totalCr = 0;
      const allLines = lines;
      const accountMap = {};
      accounts.forEach(a => { accountMap[a.id] = a; });

      // Group lines by account
      const acctTotals = {};
      allLines.forEach(l => {
        if (!acctTotals[l.accountId]) acctTotals[l.accountId] = { dr: 0, cr: 0 };
        acctTotals[l.accountId].dr += l.debit || 0;
        acctTotals[l.accountId].cr += l.credit || 0;
      });

      accounts
        .filter(a => acctTotals[a.id])
        .sort((a, b) => a.code.localeCompare(b.code))
        .forEach(a => {
          if (y > 700) { doc.addPage(); y = 60; }
          const t = acctTotals[a.id] || { dr: 0, cr: 0 };
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(60, 70, 90);
          doc.text(`${a.code} — ${a.name}`, margin + 4, y);
          if (t.dr > 0) { doc.text(Utils.fmtCurrency(t.dr), pageW - margin - 70, y, { align: 'right' }); totalDr += t.dr; }
          if (t.cr > 0) { doc.text(Utils.fmtCurrency(t.cr), pageW - margin, y, { align: 'right' }); totalCr += t.cr; }
          doc.setDrawColor(220, 225, 235);
          doc.line(margin, y + 4, pageW - margin, y + 4);
          y += 18;
        });

      y += 4;
      doc.setFillColor(13, 20, 38);
      doc.rect(margin - 4, y - 12, pageW - margin * 2 + 8, 18, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text('TOTALS', margin + 4, y);
      doc.text(Utils.fmtCurrency(totalDr), pageW - margin - 70, y, { align: 'right' });
      doc.text(Utils.fmtCurrency(totalCr), pageW - margin, y, { align: 'right' });

    } else if (type === 'ledger') {
      addHeader('General Ledger', 'All Accounts — Full Detail');
      y += 8;

      const entries = await DB.getEntries();
      const entryMap = {};
      entries.forEach(e => { entryMap[e.id] = e; });

      for (const acc of accounts.filter(a => lines.some(l => l.accountId === a.id))) {
        if (y > 650) { doc.addPage(); y = 60; }
        sectionHeader(`${acc.code} — ${acc.name}`);

        const accLines = lines.filter(l => l.accountId === acc.id);
        let runBal = 0;

        // Mini header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(100, 110, 130);
        doc.text('Date', margin + 4, y);
        doc.text('Description', margin + 70, y);
        doc.text('Debit', pageW - margin - 120, y, { align: 'right' });
        doc.text('Credit', pageW - margin - 60, y, { align: 'right' });
        doc.text('Balance', pageW - margin, y, { align: 'right' });
        y += 14;

        accLines.forEach(l => {
          if (y > 700) { doc.addPage(); y = 60; }
          const entry = entryMap[l.entryId] || {};
          runBal += (l.debit || 0) - (l.credit || 0);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(60, 70, 90);
          doc.text(entry.date || '', margin + 4, y);
          const desc = (l.description || entry.description || '').slice(0, 30);
          doc.text(desc, margin + 70, y);
          if (l.debit) doc.text(Utils.fmtCurrency(l.debit), pageW - margin - 120, y, { align: 'right' });
          if (l.credit) doc.text(Utils.fmtCurrency(l.credit), pageW - margin - 60, y, { align: 'right' });
          doc.text(Utils.fmtCurrency(runBal), pageW - margin, y, { align: 'right' });
          doc.setDrawColor(230, 235, 242);
          doc.line(margin, y + 3, pageW - margin, y + 3);
          y += 15;
        });
        y += 6;
      }
    }

    doc.save(`LedgerPro_${type}_${Utils.today()}.pdf`);
    Toast.success('PDF report downloaded successfully!');
  },

  _getBalance(account, lines) {
    const accLines = lines.filter(l => l.accountId === account.id);
    const computed = accLines.reduce((s, l) => s + (l.debit || 0) - (l.credit || 0), 0);
    return account.normal === 'Credit' ? -computed : computed;
  }
};

// ════════════════════════════════════════════════════════════════════
// PDF PARSER (pdf.js)
// ════════════════════════════════════════════════════════════════════
const PDFParser = {
  async extract(file) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }

    return fullText;
  },

  classify(text) {
    const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
    const entries = [];

    // Keyword maps
    const assetKw = /cash|bank|receivable|inventory|equipment|asset|prepaid|investment|property/i;
    const liabKw = /payable|loan|debt|liability|liabilities|credit|note payable|mortgage/i;
    const revKw = /revenue|income|sales|service|earning|gain/i;
    const expKw = /expense|cost|salary|salaries|wages|rent|utility|utilities|depreciation|insurance|advertising|fee/i;

    // Amount pattern: optional $ then digits with optional commas and decimal
    const amtPat = /\$?\s*([\d,]+(?:\.\d{2})?)/g;

    lines.forEach((line, idx) => {
      const amounts = [];
      let m;
      const patt = /\$?\s*([\d,]+(?:\.\d{2})?)/g;
      while ((m = patt.exec(line)) !== null) {
        const val = parseFloat(m[1].replace(/,/g, ''));
        if (val > 0) amounts.push(val);
      }

      if (amounts.length === 0) return;
      const amount = amounts[amounts.length - 1]; // use last/largest number on line

      let category = null;
      if (assetKw.test(line)) category = 'Asset';
      else if (liabKw.test(line)) category = 'Liability';
      else if (revKw.test(line)) category = 'Revenue';
      else if (expKw.test(line)) category = 'Expense';

      if (category && amount >= 1) {
        // Clean description
        const desc = line.replace(/\$?\s*[\d,]+(?:\.\d{2})?/g, '').trim().replace(/\s+/g, ' ').slice(0, 60);
        if (desc.length > 3) {
          entries.push({ description: desc, amount, category, originalLine: line });
        }
      }
    });

    return entries;
  },

  async mapToJournalEntries(classified, accounts) {
    // Map category to default account pairs
    const accountMap = {
      Asset: {
        debitCode: null, // will use first asset account
        creditCode: '1000', // cash
      },
      Liability: {
        debitCode: '1000', // cash
        creditCode: null, // will use first liability account
      },
      Revenue: {
        debitCode: '1000', // cash
        creditCode: null, // will use first revenue account
      },
      Expense: {
        debitCode: null, // will use expense account
        creditCode: '1000', // cash
      },
    };

    const findAccount = (type, code) => {
      if (code) return accounts.find(a => a.code === code);
      return accounts.find(a => a.type === type);
    };

    return classified.map(item => {
      const map = accountMap[item.category];
      let drAcct, crAcct;

      if (item.category === 'Asset') {
        drAcct = findAccount('Asset', null) || accounts[0];
        crAcct = findAccount('Asset', '1000') || accounts[0];
        // Actually debit the asset account
        drAcct = accounts.find(a => a.type === 'Asset' && a.code !== '1000') || accounts[0];
        crAcct = accounts.find(a => a.code === '1000');
      } else if (item.category === 'Liability') {
        drAcct = accounts.find(a => a.code === '1000');
        crAcct = accounts.find(a => a.type === 'Liability') || accounts[0];
      } else if (item.category === 'Revenue') {
        drAcct = accounts.find(a => a.code === '1000');
        crAcct = accounts.find(a => a.type === 'Revenue') || accounts[0];
      } else if (item.category === 'Expense') {
        drAcct = accounts.find(a => a.type === 'Expense') || accounts[0];
        crAcct = accounts.find(a => a.code === '1000');
      }

      return {
        description: item.description,
        amount: item.amount,
        category: item.category,
        debitAccount: drAcct,
        creditAccount: crAcct,
        selected: true,
      };
    });
  }
};

// ════════════════════════════════════════════════════════════════════
// PAGE RENDERERS
// ════════════════════════════════════════════════════════════════════

// ── DASHBOARD ────────────────────────────────────────────────────────
async function renderDashboard() {
  const container = document.getElementById('page-dashboard');
  container.innerHTML = '<div class="page-header"><div><div class="page-title">Dashboard</div><div class="page-subtitle">Financial overview & recent activity</div></div></div><div class="page-body" id="dashboard-body"><div style="text-align:center;padding:40px;color:#aaa">Loading...</div></div>';

  const accounts = await DB.getAccountBalances();
  const lines = await DB.getLines();
  const entries = (await DB.getEntries()).sort((a, b) => b.date.localeCompare(a.date));

  // Calculate totals
  const totalAssets = accounts.filter(a => a.type === 'Asset').reduce((s, a) => s + a.balance, 0);
  const totalLiab = accounts.filter(a => a.type === 'Liability').reduce((s, a) => s + a.balance, 0);
  const totalRev = accounts.filter(a => a.type === 'Revenue').reduce((s, a) => s + a.balance, 0);
  const totalExp = accounts.filter(a => a.type === 'Expense').reduce((s, a) => s + a.balance, 0);
  const netIncome = totalRev - totalExp;
  const equity = totalAssets - totalLiab;

  const body = document.getElementById('dashboard-body');

  const recentEntries = entries.slice(0, 7);
  const recentHTML = recentEntries.length === 0
    ? '<div class="empty-state"><div class="empty-state-icon">📒</div><p>No journal entries yet</p></div>'
    : recentEntries.map(e => `
      <div class="entry-item">
        <div>
          <div class="entry-desc">${Utils.escHtml(e.description)}</div>
          <div class="entry-date">${Utils.fmtDate(e.date)} · ${e.reference}</div>
        </div>
        <span class="badge ${e.status === 'Posted' ? 'badge-revenue' : 'badge-asset'}">${e.status}</span>
      </div>
    `).join('');

  // Active accounts
  const activeAccounts = accounts.filter(a => a.balance !== 0).length;

  body.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total Assets</div>
        <div class="stat-value">${Utils.fmtCurrency(totalAssets)}</div>
        <div class="stat-change">${activeAccounts} active accounts</div>
      </div>
      <div class="stat-card green">
        <div class="stat-label">Net Income</div>
        <div class="stat-value" style="color: ${netIncome >= 0 ? 'var(--green)' : 'var(--red)'}">${Utils.fmtCurrency(netIncome)}</div>
        <div class="stat-change">Revenue vs Expenses</div>
      </div>
      <div class="stat-card gold">
        <div class="stat-label">Total Revenue</div>
        <div class="stat-value">${Utils.fmtCurrency(totalRev)}</div>
        <div class="stat-change">Gross revenue</div>
      </div>
      <div class="stat-card red">
        <div class="stat-label">Total Equity</div>
        <div class="stat-value">${Utils.fmtCurrency(equity)}</div>
        <div class="stat-change">Assets − Liabilities</div>
      </div>
    </div>

    <div class="dashboard-grid">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Recent Journal Entries</span>
          <button class="btn btn-sm btn-ghost" onclick="App.navigate('journal')">+ New Entry</button>
        </div>
        <div class="card-body">
          <ul class="recent-entries-list">${recentHTML}</ul>
        </div>
      </div>
      <div>
        <div class="card mb-16">
          <div class="card-header"><span class="card-title">Quick Reports</span></div>
          <div class="card-body" style="display:flex;flex-direction:column;gap:8px">
            <button class="btn btn-ghost" style="justify-content:space-between" onclick="PDFReport.generate('income')">
              <span>Income Statement</span><span>↓ PDF</span>
            </button>
            <button class="btn btn-ghost" style="justify-content:space-between" onclick="PDFReport.generate('balance')">
              <span>Balance Sheet</span><span>↓ PDF</span>
            </button>
            <button class="btn btn-ghost" style="justify-content:space-between" onclick="PDFReport.generate('trial')">
              <span>Trial Balance</span><span>↓ PDF</span>
            </button>
            <button class="btn btn-ghost" style="justify-content:space-between" onclick="PDFReport.generate('ledger')">
              <span>General Ledger</span><span>↓ PDF</span>
            </button>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">Financial Summary</span></div>
          <div class="card-body">
            <div class="report-row"><span>Total Revenue</span><span class="report-amount amount-positive">${Utils.fmtCurrency(totalRev)}</span></div>
            <div class="report-row"><span>Total Expenses</span><span class="report-amount amount-negative">${Utils.fmtCurrency(totalExp)}</span></div>
            <div class="report-row" style="font-weight:600;border-top:2px solid var(--gray-200)"><span>Net Income</span><span class="report-amount" style="color:${netIncome>=0?'var(--green)':'var(--red)'}">${Utils.fmtCurrency(netIncome)}</span></div>
            <hr class="divider">
            <div class="report-row"><span>Total Liabilities</span><span class="report-amount">${Utils.fmtCurrency(totalLiab)}</span></div>
            <div class="report-row"><span>Owner's Equity</span><span class="report-amount">${Utils.fmtCurrency(equity)}</span></div>
            <div class="report-row ${Math.abs(totalAssets - totalLiab - equity) < 0.01 ? 'balance-ok' : ''}" style="font-weight:600;font-size:11px;margin-top:8px;border-radius:6px;text-align:center;padding:8px;background:${Math.abs(totalAssets - totalLiab - equity) < 0.01 ? 'rgba(52,201,125,0.1)' : 'rgba(232,88,88,0.1)'}">
              Balance Sheet: ${Math.abs(totalAssets - (totalLiab + equity)) < 1 ? '✓ Balanced' : '⚠ Unbalanced'}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ── CHART OF ACCOUNTS ────────────────────────────────────────────────
async function renderCOA() {
  const container = document.getElementById('page-coa');
  container.innerHTML = `
    <div class="page-header">
      <div><div class="page-title">Chart of Accounts</div><div class="page-subtitle">Manage your account structure</div></div>
      <button class="btn btn-primary" onclick="showAddAccountModal()">+ Add Account</button>
    </div>
    <div class="page-body" id="coa-body">Loading...</div>
  `;

  const accounts = await DB.getAccountBalances();
  const lines = await DB.getLines();
  const body = document.getElementById('coa-body');

  const types = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];
  const typeColors = { Asset: 'badge-asset', Liability: 'badge-liability', Equity: 'badge-equity', Revenue: 'badge-revenue', Expense: 'badge-expense' };

  let html = '';
  for (const type of types) {
    const typeAccts = accounts.filter(a => a.type === type).sort((a, b) => a.code.localeCompare(b.code));
    if (!typeAccts.length) continue;

    html += `<div class="account-type-group">
      <div class="account-type-header">
        <span>${type}s</span>
        <span>${typeAccts.length} accounts</span>
      </div>
      <div class="card" style="border-radius: 0 0 var(--radius) var(--radius)">
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>Code</th><th>Name</th><th>Type</th><th>Normal</th><th class="text-right">Balance</th><th></th>
            </tr></thead>
            <tbody>`;

    for (const acc of typeAccts) {
      html += `<tr>
        <td class="mono">${acc.code}</td>
        <td style="font-weight:500">${Utils.escHtml(acc.name)}</td>
        <td><span class="badge ${typeColors[acc.type]}">${acc.type}</span></td>
        <td class="text-muted" style="font-size:12px">${acc.normal}</td>
        <td class="text-right mono ${acc.balance > 0 ? 'amount-positive' : acc.balance < 0 ? 'amount-negative' : ''}">${Utils.fmtCurrency(acc.balance)}</td>
        <td>
          <button class="btn btn-sm btn-ghost" onclick="showEditAccountModal('${acc.id}')">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteAccount('${acc.id}')">Del</button>
        </td>
      </tr>`;
    }

    html += '</tbody></table></div></div></div>';
  }

  body.innerHTML = html || '<div class="empty-state"><div class="empty-state-icon">📋</div><p>No accounts found</p></div>';
}

function showAddAccountModal() {
  const accounts_types = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];
  document.getElementById('modal-content').innerHTML = `
    <div class="modal-title">Add Account</div>
    <div class="form-group">
      <label class="form-label">Account Code</label>
      <input class="form-control" id="acc-code" placeholder="e.g. 1050">
    </div>
    <div class="form-group">
      <label class="form-label">Account Name</label>
      <input class="form-control" id="acc-name" placeholder="e.g. Petty Cash">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Type</label>
        <select class="form-control" id="acc-type" onchange="updateNormal()">
          ${accounts_types.map(t => `<option>${t}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Normal Balance</label>
        <select class="form-control" id="acc-normal">
          <option>Debit</option>
          <option>Credit</option>
        </select>
      </div>
    </div>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px">
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveNewAccount()">Save Account</button>
    </div>
  `;
  App.openModal();
}

function updateNormal() {
  const type = document.getElementById('acc-type').value;
  const normal = document.getElementById('acc-normal');
  normal.value = (type === 'Asset' || type === 'Expense') ? 'Debit' : 'Credit';
}

async function saveNewAccount() {
  const code = document.getElementById('acc-code').value.trim();
  const name = document.getElementById('acc-name').value.trim();
  const type = document.getElementById('acc-type').value;
  const normal = document.getElementById('acc-normal').value;

  if (!code || !name) { Toast.error('Please fill in all fields'); return; }

  const acc = { id: Utils.uid('acc'), code, name, type, normal, balance: 0 };
  await DB.saveAccount(acc);
  App.closeModal();
  Toast.success('Account created successfully');
  App.navigate('coa');
}

async function showEditAccountModal(id) {
  const acc = await DB.getAccount(id);
  if (!acc) return;

  const types = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];
  document.getElementById('modal-content').innerHTML = `
    <div class="modal-title">Edit Account</div>
    <div class="form-group">
      <label class="form-label">Account Code</label>
      <input class="form-control" id="edit-code" value="${Utils.escHtml(acc.code)}">
    </div>
    <div class="form-group">
      <label class="form-label">Account Name</label>
      <input class="form-control" id="edit-name" value="${Utils.escHtml(acc.name)}">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Type</label>
        <select class="form-control" id="edit-type">
          ${types.map(t => `<option ${t === acc.type ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Normal Balance</label>
        <select class="form-control" id="edit-normal">
          <option ${acc.normal === 'Debit' ? 'selected' : ''}>Debit</option>
          <option ${acc.normal === 'Credit' ? 'selected' : ''}>Credit</option>
        </select>
      </div>
    </div>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px">
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveEditAccount('${id}')">Update Account</button>
    </div>
  `;
  App.openModal();
}

async function saveEditAccount(id) {
  const acc = await DB.getAccount(id);
  acc.code = document.getElementById('edit-code').value.trim();
  acc.name = document.getElementById('edit-name').value.trim();
  acc.type = document.getElementById('edit-type').value;
  acc.normal = document.getElementById('edit-normal').value;
  await DB.saveAccount(acc);
  App.closeModal();
  Toast.success('Account updated');
  App.navigate('coa');
}

async function deleteAccount(id) {
  const lines = await DB.getLines();
  if (lines.some(l => l.accountId === id)) {
    Toast.error('Cannot delete: account has journal entries');
    return;
  }
  if (!confirm('Delete this account?')) return;
  await DB.deleteAccount(id);
  Toast.success('Account deleted');
  App.navigate('coa');
}

// ── JOURNAL ENTRY ────────────────────────────────────────────────────
let journalLines = [];

async function renderJournal() {
  const container = document.getElementById('page-journal');
  const accounts = await DB.getAccounts();
  const accountOptions = accounts
    .sort((a, b) => a.code.localeCompare(b.code))
    .map(a => `<option value="${a.id}">${a.code} — ${a.name}</option>`)
    .join('');

  journalLines = [
    { id: Utils.uid('jl'), accountId: '', description: '', debit: '', credit: '' },
    { id: Utils.uid('jl'), accountId: '', description: '', debit: '', credit: '' },
  ];

  container.innerHTML = `
    <div class="page-header">
      <div><div class="page-title">Journal Entry</div><div class="page-subtitle">Record double-entry transactions</div></div>
    </div>
    <div class="page-body">
      <div class="card mb-24">
        <div class="card-header"><span class="card-title">Entry Details</span></div>
        <div class="card-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Date</label>
              <input class="form-control" type="date" id="je-date" value="${Utils.today()}">
            </div>
            <div class="form-group">
              <label class="form-label">Reference</label>
              <input class="form-control" id="je-ref" placeholder="JE-009" value="JE-${String(Math.floor(Math.random()*900)+100)}">
            </div>
            <div class="form-group">
              <label class="form-label">Description</label>
              <input class="form-control" id="je-desc" placeholder="Transaction description">
            </div>
          </div>
        </div>
      </div>

      <div class="card mb-24">
        <div class="card-header">
          <span class="card-title">Journal Lines</span>
          <button class="btn btn-sm btn-ghost" onclick="addJournalLine()">+ Add Line</button>
        </div>
        <div class="card-body">
          <div class="table-wrap">
            <table class="journal-lines-table">
              <thead>
                <tr>
                  <th style="width:38%">Account</th>
                  <th style="width:28%">Description</th>
                  <th style="width:14%">Debit</th>
                  <th style="width:14%">Credit</th>
                  <th style="width:6%"></th>
                </tr>
              </thead>
              <tbody id="journal-lines-body">
              </tbody>
            </table>
          </div>
          <div class="journal-totals">
            <div class="journal-total-item">
              <div class="journal-total-label">Total Debits</div>
              <div class="journal-total-val" id="total-debit">$0.00</div>
            </div>
            <div class="journal-total-item">
              <div class="journal-total-label">Total Credits</div>
              <div class="journal-total-val" id="total-credit">$0.00</div>
            </div>
            <div class="journal-total-item">
              <div class="journal-total-label">Difference</div>
              <div class="journal-total-val" id="total-diff">$0.00</div>
            </div>
          </div>
          <div id="balance-status" class="balance-status balance-err">⚠ Debits ≠ Credits — Entry not balanced</div>
        </div>
      </div>

      <div style="display:flex;gap:12px;justify-content:flex-end">
        <button class="btn btn-secondary btn-lg" onclick="clearJournal()">Clear</button>
        <button class="btn btn-primary btn-lg" onclick="postJournalEntry()">Post Entry</button>
      </div>

      <div class="card mt-24">
        <div class="card-header">
          <span class="card-title">Recent Journal Entries</span>
        </div>
        <div id="je-history" class="table-wrap">Loading...</div>
      </div>
    </div>
  `;

  window._accountOptions = accountOptions;
  renderJournalLines();
  loadJournalHistory();
}

function renderJournalLines() {
  const tbody = document.getElementById('journal-lines-body');
  if (!tbody) return;

  tbody.innerHTML = journalLines.map((line, idx) => `
    <tr>
      <td>
        <select class="account-selector" onchange="updateJournalLine(${idx}, 'accountId', this.value)">
          <option value="">— Select Account —</option>
          ${window._accountOptions}
        </select>
      </td>
      <td>
        <input type="text" placeholder="Description" value="${Utils.escHtml(line.description)}"
          oninput="updateJournalLine(${idx}, 'description', this.value)" style="width:100%;padding:7px 10px;border:1.5px solid var(--gray-300);border-radius:6px;font-size:13px;font-family:'DM Sans',sans-serif;outline:none">
      </td>
      <td>
        <input type="number" placeholder="0.00" value="${line.debit || ''}" min="0" step="0.01"
          oninput="updateJournalLine(${idx}, 'debit', this.value)" class="mono" style="width:100%;padding:7px 10px;border:1.5px solid var(--gray-300);border-radius:6px;font-size:13px;outline:none;font-family:'DM Mono',monospace">
      </td>
      <td>
        <input type="number" placeholder="0.00" value="${line.credit || ''}" min="0" step="0.01"
          oninput="updateJournalLine(${idx}, 'credit', this.value)" class="mono" style="width:100%;padding:7px 10px;border:1.5px solid var(--gray-300);border-radius:6px;font-size:13px;outline:none;font-family:'DM Mono',monospace">
      </td>
      <td style="text-align:center">
        <button class="line-remove-btn" onclick="removeJournalLine(${idx})" ${journalLines.length <= 2 ? 'disabled style="opacity:.3"' : ''}>×</button>
      </td>
    </tr>
  `).join('');

  // Restore select values
  const rows = tbody.querySelectorAll('tr');
  journalLines.forEach((line, idx) => {
    const sel = rows[idx]?.querySelector('select');
    if (sel && line.accountId) sel.value = line.accountId;
  });

  updateJournalTotals();
}

function updateJournalLine(idx, field, value) {
  journalLines[idx][field] = value;
  updateJournalTotals();
}

function addJournalLine() {
  journalLines.push({ id: Utils.uid('jl'), accountId: '', description: '', debit: '', credit: '' });
  renderJournalLines();
}

function removeJournalLine(idx) {
  if (journalLines.length <= 2) return;
  journalLines.splice(idx, 1);
  renderJournalLines();
}

function updateJournalTotals() {
  const totalDr = journalLines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCr = journalLines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const diff = Math.abs(totalDr - totalCr);

  const drEl = document.getElementById('total-debit');
  const crEl = document.getElementById('total-credit');
  const diffEl = document.getElementById('total-diff');
  const statusEl = document.getElementById('balance-status');

  if (drEl) drEl.textContent = Utils.fmtCurrency(totalDr);
  if (crEl) crEl.textContent = Utils.fmtCurrency(totalCr);
  if (diffEl) diffEl.textContent = Utils.fmtCurrency(diff);

  if (statusEl) {
    if (diff < 0.001 && totalDr > 0) {
      statusEl.className = 'balance-status balance-ok';
      statusEl.textContent = '✓ Entry is balanced — Debits equal Credits';
    } else {
      statusEl.className = 'balance-status balance-err';
      statusEl.textContent = `⚠ Debits ≠ Credits — Difference: ${Utils.fmtCurrency(diff)}`;
    }
  }
}

function clearJournal() {
  journalLines = [
    { id: Utils.uid('jl'), accountId: '', description: '', debit: '', credit: '' },
    { id: Utils.uid('jl'), accountId: '', description: '', debit: '', credit: '' },
  ];
  document.getElementById('je-date').value = Utils.today();
  document.getElementById('je-desc').value = '';
  renderJournalLines();
}

async function postJournalEntry() {
  const date = document.getElementById('je-date').value;
  const ref = document.getElementById('je-ref').value.trim();
  const desc = document.getElementById('je-desc').value.trim();

  if (!date || !desc) { Toast.error('Please fill in date and description'); return; }

  const totalDr = journalLines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCr = journalLines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);

  if (Math.abs(totalDr - totalCr) > 0.001) {
    Toast.error('Entry not balanced! Debits must equal Credits');
    return;
  }
  if (totalDr === 0) { Toast.error('Entry has no amounts'); return; }

  const validLines = journalLines.filter(l => l.accountId && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0));
  if (validLines.length < 2) { Toast.error('At least 2 lines with accounts and amounts required'); return; }

  const entryId = Utils.uid('je');
  const entry = { id: entryId, date, reference: ref || `JE-${Date.now()}`, description: desc, status: 'Posted', createdAt: new Date().toISOString() };
  await DB.saveEntry(entry);

  for (let i = 0; i < validLines.length; i++) {
    const l = validLines[i];
    await DB.saveLine({
      id: Utils.uid('jl'),
      entryId,
      accountId: l.accountId,
      description: l.description,
      debit: parseFloat(l.debit) || 0,
      credit: parseFloat(l.credit) || 0,
      seq: i + 1
    });
  }

  Toast.success('Journal entry posted successfully!');
  clearJournal();
  loadJournalHistory();
}

async function loadJournalHistory() {
  const container = document.getElementById('je-history');
  if (!container) return;

  const entries = (await DB.getEntries()).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);
  const lines = await DB.getLines();
  const accounts = await DB.getAccounts();
  const acctMap = {};
  accounts.forEach(a => { acctMap[a.id] = a; });

  if (!entries.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📒</div><p>No entries posted yet</p></div>';
    return;
  }

  let html = `<table><thead><tr><th>Date</th><th>Reference</th><th>Description</th><th class="text-right">Debits</th><th class="text-right">Credits</th><th></th></tr></thead><tbody>`;

  for (const e of entries) {
    const eLines = lines.filter(l => l.entryId === e.id);
    const totalDr = eLines.reduce((s, l) => s + (l.debit || 0), 0);
    const totalCr = eLines.reduce((s, l) => s + (l.credit || 0), 0);
    html += `<tr>
      <td class="mono">${e.date}</td>
      <td><span class="badge badge-asset">${Utils.escHtml(e.reference)}</span></td>
      <td>${Utils.escHtml(e.description)}</td>
      <td class="text-right mono amount-positive">${Utils.fmtCurrency(totalDr)}</td>
      <td class="text-right mono amount-negative">${Utils.fmtCurrency(totalCr)}</td>
      <td>
        <button class="btn btn-sm btn-ghost" onclick="viewEntry('${e.id}')">View</button>
        <button class="btn btn-sm btn-danger" onclick="deleteEntry('${e.id}')">Del</button>
      </td>
    </tr>`;
  }
  html += '</tbody></table>';
  container.innerHTML = html;
}

async function viewEntry(id) {
  const entry = await DB.getEntry(id);
  const lines = await DB.getLinesForEntry(id);
  const accounts = await DB.getAccounts();
  const acctMap = {};
  accounts.forEach(a => { acctMap[a.id] = a; });

  const linesHTML = lines.map(l => {
    const acc = acctMap[l.accountId];
    return `<tr>
      <td>${acc ? `${acc.code} — ${Utils.escHtml(acc.name)}` : l.accountId}</td>
      <td>${Utils.escHtml(l.description)}</td>
      <td class="text-right mono amount-positive">${l.debit > 0 ? Utils.fmtCurrency(l.debit) : ''}</td>
      <td class="text-right mono amount-negative">${l.credit > 0 ? Utils.fmtCurrency(l.credit) : ''}</td>
    </tr>`;
  }).join('');

  document.getElementById('modal-content').innerHTML = `
    <div class="modal-title">Journal Entry: ${Utils.escHtml(entry.reference)}</div>
    <p style="color:var(--gray-500);font-size:13px;margin-bottom:16px">${Utils.fmtDate(entry.date)} · ${Utils.escHtml(entry.description)}</p>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Account</th><th>Description</th><th class="text-right">Debit</th><th class="text-right">Credit</th></tr></thead>
        <tbody>${linesHTML}</tbody>
      </table>
    </div>
  `;
  App.openModal();
}

async function deleteEntry(id) {
  if (!confirm('Delete this journal entry and all its lines?')) return;
  await DB.deleteLinesForEntry(id);
  await DB.deleteEntry(id);
  Toast.success('Entry deleted');
  loadJournalHistory();
}

// ── PDF UPLOAD ────────────────────────────────────────────────────────
function renderPDFUpload() {
  const container = document.getElementById('page-pdf-upload');
  container.innerHTML = `
    <div class="page-header">
      <div><div class="page-title">PDF Import</div><div class="page-subtitle">Auto-encode transactions from PDF documents</div></div>
    </div>
    <div class="page-body">
      <div class="card mb-24">
        <div class="card-header"><span class="card-title">Upload Financial Document</span></div>
        <div class="card-body">
          <div class="upload-zone" id="upload-zone" onclick="document.getElementById('pdf-input').click()"
            ondragover="event.preventDefault();this.classList.add('drag-over')"
            ondragleave="this.classList.remove('drag-over')"
            ondrop="handlePDFDrop(event)">
            <div class="upload-icon">📄</div>
            <div class="upload-title">Drop PDF here or click to browse</div>
            <div class="upload-sub">Supports bank statements, invoices, trial balances · PDF files only</div>
          </div>
          <input type="file" id="pdf-input" accept=".pdf" style="display:none" onchange="handlePDFUpload(this.files[0])">
        </div>
      </div>
      <div id="pdf-preview-section" class="hidden">
        <div class="card">
          <div class="card-header">
            <span class="card-title">Detected Transactions</span>
            <div style="display:flex;gap:8px">
              <button class="btn btn-sm btn-ghost" onclick="selectAllPreviews(true)">Select All</button>
              <button class="btn btn-sm btn-ghost" onclick="selectAllPreviews(false)">Deselect All</button>
              <button class="btn btn-primary btn-sm" onclick="importSelectedEntries()">Import Selected</button>
            </div>
          </div>
          <div class="card-body" id="pdf-preview-list"></div>
        </div>
      </div>
    </div>
  `;
}

async function handlePDFDrop(event) {
  event.preventDefault();
  document.getElementById('upload-zone').classList.remove('drag-over');
  const file = event.dataTransfer.files[0];
  if (file && file.type === 'application/pdf') {
    await handlePDFUpload(file);
  } else {
    Toast.error('Please drop a PDF file');
  }
}

async function handlePDFUpload(file) {
  if (!file) return;
  Loading.show('Parsing PDF document...');
  try {
    const text = await PDFParser.extract(file);
    Loading.show('Classifying transactions...');
    const classified = PDFParser.classify(text);

    if (classified.length === 0) {
      Toast.warning('No recognizable transactions found in PDF. Try a statement with line items.');
      Loading.hide();
      return;
    }

    const accounts = await DB.getAccounts();
    const mapped = await PDFParser.mapToJournalEntries(classified, accounts);

    Loading.hide();
    renderPDFPreview(mapped);
    Toast.success(`Found ${mapped.length} potential transaction(s)`);
  } catch (err) {
    Loading.hide();
    Toast.error('Error parsing PDF: ' + err.message);
    console.error(err);
  }
}

let pdfPreviewData = [];

function renderPDFPreview(entries) {
  pdfPreviewData = entries;
  const section = document.getElementById('pdf-preview-section');
  const list = document.getElementById('pdf-preview-list');
  section.classList.remove('hidden');

  const typeColors = { Asset: 'badge-asset', Liability: 'badge-liability', Revenue: 'badge-revenue', Expense: 'badge-expense' };

  list.innerHTML = entries.map((e, idx) => `
    <div class="preview-entry">
      <div class="preview-entry-header">
        <div style="display:flex;align-items:center;gap:10px">
          <input type="checkbox" id="prev-chk-${idx}" checked>
          <span class="preview-entry-desc">${Utils.escHtml(e.description)}</span>
          <span class="badge ${typeColors[e.category] || 'badge-asset'}">${e.category}</span>
        </div>
        <span class="font-mono" style="font-size:15px;font-weight:600;color:var(--navy-800)">${Utils.fmtCurrency(e.amount)}</span>
      </div>
      <div class="preview-lines">
        <div class="preview-line">
          <span>DR: ${e.debitAccount ? `${e.debitAccount.code} — ${e.debitAccount.name}` : 'Unknown'}</span>
          <span class="font-mono amount-positive">${Utils.fmtCurrency(e.amount)}</span>
        </div>
        <div class="preview-line">
          <span>CR: ${e.creditAccount ? `${e.creditAccount.code} — ${e.creditAccount.name}` : 'Unknown'}</span>
          <span class="font-mono amount-negative">${Utils.fmtCurrency(e.amount)}</span>
        </div>
      </div>
    </div>
  `).join('');
}

function selectAllPreviews(state) {
  pdfPreviewData.forEach((_, idx) => {
    const chk = document.getElementById(`prev-chk-${idx}`);
    if (chk) chk.checked = state;
  });
}

async function importSelectedEntries() {
  const selected = pdfPreviewData.filter((_, idx) => {
    const chk = document.getElementById(`prev-chk-${idx}`);
    return chk && chk.checked;
  });

  if (!selected.length) { Toast.warning('No entries selected'); return; }

  for (const e of selected) {
    if (!e.debitAccount || !e.creditAccount) continue;
    const entryId = Utils.uid('je');
    await DB.saveEntry({
      id: entryId,
      date: Utils.today(),
      reference: `PDF-${Date.now()}`,
      description: e.description.slice(0, 80),
      status: 'Posted',
      createdAt: new Date().toISOString()
    });
    await DB.saveLine({ id: Utils.uid('jl'), entryId, accountId: e.debitAccount.id, description: e.description, debit: e.amount, credit: 0, seq: 1 });
    await DB.saveLine({ id: Utils.uid('jl'), entryId, accountId: e.creditAccount.id, description: e.description, debit: 0, credit: e.amount, seq: 2 });
  }

  Toast.success(`${selected.length} entr${selected.length > 1 ? 'ies' : 'y'} imported successfully!`);
  document.getElementById('pdf-preview-section').classList.add('hidden');
  pdfPreviewData = [];
}

// ── GENERAL LEDGER ────────────────────────────────────────────────────
async function renderGeneralLedger() {
  const container = document.getElementById('page-general-ledger');
  container.innerHTML = `
    <div class="page-header">
      <div><div class="page-title">General Ledger</div><div class="page-subtitle">Full transaction history by account</div></div>
      <button class="btn btn-primary" onclick="PDFReport.generate('ledger')">↓ Export PDF</button>
    </div>
    <div class="page-body">
      <div class="filter-bar">
        <div class="form-group">
          <label class="form-label">Filter by Account</label>
          <select class="form-control" id="gl-filter-acct" onchange="renderGLData()">
            <option value="">All Accounts</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">From Date</label>
          <input type="date" class="form-control" id="gl-from" onchange="renderGLData()">
        </div>
        <div class="form-group">
          <label class="form-label">To Date</label>
          <input type="date" class="form-control" id="gl-to" onchange="renderGLData()">
        </div>
      </div>
      <div id="gl-data">Loading...</div>
    </div>
  `;

  const accounts = await DB.getAccounts();
  const sel = document.getElementById('gl-filter-acct');
  accounts.sort((a, b) => a.code.localeCompare(b.code)).forEach(a => {
    const opt = document.createElement('option');
    opt.value = a.id;
    opt.textContent = `${a.code} — ${a.name}`;
    sel.appendChild(opt);
  });

  renderGLData();
}

async function renderGLData() {
  const container = document.getElementById('gl-data');
  if (!container) return;

  const filterAcct = document.getElementById('gl-filter-acct')?.value || '';
  const fromDate = document.getElementById('gl-from')?.value || '';
  const toDate = document.getElementById('gl-to')?.value || '';

  const accounts = await DB.getAccounts();
  const entries = await DB.getEntries();
  const allLines = await DB.getLines();

  const acctMap = {};
  accounts.forEach(a => { acctMap[a.id] = a; });
  const entryMap = {};
  entries.forEach(e => { entryMap[e.id] = e; });

  let filteredAccounts = accounts.sort((a, b) => a.code.localeCompare(b.code));
  if (filterAcct) filteredAccounts = filteredAccounts.filter(a => a.id === filterAcct);

  let html = '';

  for (const acc of filteredAccounts) {
    let accLines = allLines.filter(l => l.accountId === acc.id);
    if (!accLines.length) continue;

    // Date filter
    if (fromDate || toDate) {
      accLines = accLines.filter(l => {
        const entry = entryMap[l.entryId];
        if (!entry) return false;
        if (fromDate && entry.date < fromDate) return false;
        if (toDate && entry.date > toDate) return false;
        return true;
      });
    }
    if (!accLines.length) continue;

    let runBal = 0;
    const linesHTML = accLines.map(l => {
      const entry = entryMap[l.entryId] || {};
      runBal += (l.debit || 0) - (l.credit || 0);
      const dispBal = acc.normal === 'Credit' ? -runBal : runBal;
      return `<tr>
        <td class="mono">${entry.date || ''}</td>
        <td><span class="badge badge-asset" style="font-size:10px">${Utils.escHtml(entry.reference || '')}</span></td>
        <td>${Utils.escHtml(l.description || entry.description || '')}</td>
        <td class="text-right mono amount-positive">${l.debit > 0 ? Utils.fmtCurrency(l.debit) : ''}</td>
        <td class="text-right mono amount-negative">${l.credit > 0 ? Utils.fmtCurrency(l.credit) : ''}</td>
        <td class="text-right mono ${dispBal >= 0 ? 'amount-positive' : 'amount-negative'}">${Utils.fmtCurrency(dispBal)}</td>
      </tr>`;
    }).join('');

    const totalDr = accLines.reduce((s, l) => s + (l.debit || 0), 0);
    const totalCr = accLines.reduce((s, l) => s + (l.credit || 0), 0);

    html += `
      <div class="report-section">
        <div class="report-section-title">${acc.code} — ${Utils.escHtml(acc.name)} <span style="float:right;font-weight:normal;text-transform:none;letter-spacing:0">${acc.type} · Normal: ${acc.normal}</span></div>
        <div class="card" style="border-radius:0 0 var(--radius) var(--radius)">
          <div class="table-wrap">
            <table>
              <thead><tr>
                <th>Date</th><th>Reference</th><th>Description</th>
                <th class="text-right">Debit</th><th class="text-right">Credit</th><th class="text-right">Balance</th>
              </tr></thead>
              <tbody>${linesHTML}</tbody>
              <tfoot>
                <tr style="background:var(--gray-100);font-weight:600">
                  <td colspan="3">Totals</td>
                  <td class="text-right mono amount-positive">${Utils.fmtCurrency(totalDr)}</td>
                  <td class="text-right mono amount-negative">${Utils.fmtCurrency(totalCr)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  container.innerHTML = html || '<div class="empty-state"><div class="empty-state-icon">📒</div><p>No transactions found for the selected filters</p></div>';
}

// ── INCOME STATEMENT ─────────────────────────────────────────────────
async function renderIncomeStatement() {
  const container = document.getElementById('page-income-statement');
  container.innerHTML = `
    <div class="page-header">
      <div><div class="page-title">Income Statement</div><div class="page-subtitle">Profit & Loss for the period</div></div>
      <button class="btn btn-primary" onclick="PDFReport.generate('income')">↓ Export PDF</button>
    </div>
    <div class="page-body" id="is-body">Loading...</div>
  `;

  const accounts = await DB.getAccountBalances();
  const lines = await DB.getLines();
  const body = document.getElementById('is-body');

  const revenues = accounts.filter(a => a.type === 'Revenue').sort((a, b) => a.code.localeCompare(b.code));
  const expenses = accounts.filter(a => a.type === 'Expense').sort((a, b) => a.code.localeCompare(b.code));

  let totalRev = 0, totalCOGS = 0, totalOpEx = 0;

  const revRows = revenues.map(a => {
    const bal = PDFReport._getBalance(a, lines);
    totalRev += bal;
    return `<div class="report-row"><span>${Utils.escHtml(a.name)}</span><span class="report-amount mono">${Utils.fmtCurrency(bal)}</span></div>`;
  }).join('') || '<div class="report-row text-muted"><span>No revenue accounts</span><span>$0.00</span></div>';

  const cogs = expenses.find(a => a.code === '5000');
  const cogsRows = cogs ? (() => {
    const bal = PDFReport._getBalance(cogs, lines);
    totalCOGS = bal;
    return `<div class="report-row"><span>${Utils.escHtml(cogs.name)}</span><span class="report-amount mono">${Utils.fmtCurrency(bal)}</span></div>`;
  })() : '';

  const grossProfit = totalRev - totalCOGS;

  const opExRows = expenses.filter(a => a.code !== '5000').map(a => {
    const bal = PDFReport._getBalance(a, lines);
    totalOpEx += bal;
    return `<div class="report-row"><span>${Utils.escHtml(a.name)}</span><span class="report-amount mono">${Utils.fmtCurrency(bal)}</span></div>`;
  }).join('') || '<div class="report-row text-muted"><span>No operating expenses</span><span>$0.00</span></div>';

  const netIncome = totalRev - totalCOGS - totalOpEx;

  body.innerHTML = `
    <div class="card" style="max-width:700px;margin:0 auto">
      <div class="card-header" style="background:var(--navy-900)">
        <div>
          <div style="font-family:'Playfair Display',serif;font-size:16px;color:white">Income Statement</div>
          <div style="font-size:12px;color:var(--gray-400);margin-top:2px">For the period ended ${Utils.fmtDate(Utils.today())}</div>
        </div>
      </div>
      <div>
        <div class="report-section-title">Revenue</div>
        ${revRows}
        <div class="report-row subtotal"><span>Total Revenue</span><span class="report-amount mono">${Utils.fmtCurrency(totalRev)}</span></div>

        ${cogsRows ? `
        <div class="report-section-title" style="margin-top:16px">Cost of Goods Sold</div>
        ${cogsRows}
        <div class="report-row subtotal"><span>Gross Profit</span><span class="report-amount mono">${Utils.fmtCurrency(grossProfit)}</span></div>
        ` : ''}

        <div class="report-section-title" style="margin-top:16px">Operating Expenses</div>
        ${opExRows}
        <div class="report-row subtotal"><span>Total Operating Expenses</span><span class="report-amount mono">${Utils.fmtCurrency(totalCOGS + totalOpEx)}</span></div>

        <div class="report-row total">
          <span>NET INCOME (LOSS)</span>
          <span class="report-amount mono">${Utils.fmtCurrency(netIncome)}</span>
        </div>
      </div>
    </div>
  `;
}

// ── BALANCE SHEET ─────────────────────────────────────────────────────
async function renderBalanceSheet() {
  const container = document.getElementById('page-balance-sheet');
  container.innerHTML = `
    <div class="page-header">
      <div><div class="page-title">Balance Sheet</div><div class="page-subtitle">Financial position at a point in time</div></div>
      <button class="btn btn-primary" onclick="PDFReport.generate('balance')">↓ Export PDF</button>
    </div>
    <div class="page-body" id="bs-body">Loading...</div>
  `;

  const accounts = await DB.getAccountBalances();
  const lines = await DB.getLines();
  const body = document.getElementById('bs-body');

  const assets = accounts.filter(a => a.type === 'Asset').sort((a, b) => a.code.localeCompare(b.code));
  const liabs = accounts.filter(a => a.type === 'Liability').sort((a, b) => a.code.localeCompare(b.code));
  const equity = accounts.filter(a => a.type === 'Equity').sort((a, b) => a.code.localeCompare(b.code));

  let totalAssets = 0, totalLiab = 0, totalEquity = 0;

  const assetRows = assets.map(a => {
    const bal = PDFReport._getBalance(a, lines);
    totalAssets += bal;
    return `<div class="report-row"><span>${Utils.escHtml(a.name)}</span><span class="report-amount mono">${Utils.fmtCurrency(bal)}</span></div>`;
  }).join('') || '<div class="report-row text-muted"><span>No asset balances</span><span>$0.00</span></div>';

  const liabRows = liabs.map(a => {
    const bal = PDFReport._getBalance(a, lines);
    totalLiab += bal;
    return `<div class="report-row"><span>${Utils.escHtml(a.name)}</span><span class="report-amount mono">${Utils.fmtCurrency(bal)}</span></div>`;
  }).join('') || '<div class="report-row text-muted"><span>No liability balances</span><span>$0.00</span></div>';

  const eqRows = equity.map(a => {
    const bal = PDFReport._getBalance(a, lines);
    totalEquity += bal;
    return `<div class="report-row"><span>${Utils.escHtml(a.name)}</span><span class="report-amount mono">${Utils.fmtCurrency(bal)}</span></div>`;
  }).join('') || '';

  // Net income added to equity conceptually
  const revenues = accounts.filter(a => a.type === 'Revenue');
  const expenses = accounts.filter(a => a.type === 'Expense');
  let netInc = 0;
  revenues.forEach(a => netInc += PDFReport._getBalance(a, lines));
  expenses.forEach(a => netInc -= PDFReport._getBalance(a, lines));
  totalEquity += netInc;

  const totalLiabEquity = totalLiab + totalEquity;
  const balanced = Math.abs(totalAssets - totalLiabEquity) < 0.01;

  body.innerHTML = `
    <div class="card" style="max-width:700px;margin:0 auto">
      <div class="card-header" style="background:var(--navy-900)">
        <div>
          <div style="font-family:'Playfair Display',serif;font-size:16px;color:white">Balance Sheet</div>
          <div style="font-size:12px;color:var(--gray-400);margin-top:2px">As of ${Utils.fmtDate(Utils.today())}</div>
        </div>
        <span class="${balanced ? 'balance-ok' : 'balance-err'}" style="font-size:12px;padding:4px 10px;border-radius:20px">${balanced ? '✓ Balanced' : '⚠ Unbalanced'}</span>
      </div>
      <div>
        <div class="report-section-title">Assets</div>
        ${assetRows}
        <div class="report-row total"><span>TOTAL ASSETS</span><span class="report-amount mono">${Utils.fmtCurrency(totalAssets)}</span></div>

        <div class="report-section-title" style="margin-top:16px">Liabilities</div>
        ${liabRows}
        <div class="report-row subtotal"><span>Total Liabilities</span><span class="report-amount mono">${Utils.fmtCurrency(totalLiab)}</span></div>

        <div class="report-section-title" style="margin-top:16px">Equity</div>
        ${eqRows}
        ${netInc !== 0 ? `<div class="report-row"><span>Net Income (Current Period)</span><span class="report-amount mono ${netInc >= 0 ? 'amount-positive' : 'amount-negative'}">${Utils.fmtCurrency(netInc)}</span></div>` : ''}
        <div class="report-row subtotal"><span>Total Equity</span><span class="report-amount mono">${Utils.fmtCurrency(totalEquity)}</span></div>

        <div class="report-row total"><span>TOTAL LIABILITIES & EQUITY</span><span class="report-amount mono">${Utils.fmtCurrency(totalLiabEquity)}</span></div>
      </div>
    </div>
    ${!balanced ? `<div class="balance-err" style="max-width:700px;margin:12px auto;padding:12px;border-radius:8px;text-align:center;font-size:13px">⚠ Balance Sheet is off by ${Utils.fmtCurrency(Math.abs(totalAssets - totalLiabEquity))} — check your journal entries</div>` : ''}
  `;
}

// ── TRIAL BALANCE ─────────────────────────────────────────────────────
async function renderTrialBalance() {
  const container = document.getElementById('page-trial-balance');
  container.innerHTML = `
    <div class="page-header">
      <div><div class="page-title">Trial Balance</div><div class="page-subtitle">Verify debits equal credits</div></div>
      <button class="btn btn-primary" onclick="PDFReport.generate('trial')">↓ Export PDF</button>
    </div>
    <div class="page-body" id="tb-body">Loading...</div>
  `;

  const accounts = await DB.getAccounts();
  const allLines = await DB.getLines();
  const body = document.getElementById('tb-body');

  // Calculate raw debit/credit totals per account
  const acctTotals = {};
  accounts.forEach(a => { acctTotals[a.id] = { ...a, totalDr: 0, totalCr: 0 }; });
  allLines.forEach(l => {
    if (!acctTotals[l.accountId]) return;
    acctTotals[l.accountId].totalDr += l.debit || 0;
    acctTotals[l.accountId].totalCr += l.credit || 0;
  });

  const activeAccounts = Object.values(acctTotals)
    .filter(a => a.totalDr > 0 || a.totalCr > 0)
    .sort((a, b) => a.code.localeCompare(b.code));

  const totalDr = activeAccounts.reduce((s, a) => s + a.totalDr, 0);
  const totalCr = activeAccounts.reduce((s, a) => s + a.totalCr, 0);
  const balanced = Math.abs(totalDr - totalCr) < 0.01;

  const typeColors = { Asset: 'badge-asset', Liability: 'badge-liability', Equity: 'badge-equity', Revenue: 'badge-revenue', Expense: 'badge-expense' };

  const rows = activeAccounts.map(a => `
    <tr>
      <td class="mono">${a.code}</td>
      <td style="font-weight:500">${Utils.escHtml(a.name)}</td>
      <td><span class="badge ${typeColors[a.type] || ''}">${a.type}</span></td>
      <td class="text-right mono amount-positive">${a.totalDr > 0 ? Utils.fmtCurrency(a.totalDr) : ''}</td>
      <td class="text-right mono amount-negative">${a.totalCr > 0 ? Utils.fmtCurrency(a.totalCr) : ''}</td>
    </tr>
  `).join('');

  body.innerHTML = `
    <div class="card">
      <div class="card-header" style="background:var(--navy-900)">
        <div>
          <div style="font-family:'Playfair Display',serif;font-size:16px;color:white">Trial Balance</div>
          <div style="font-size:12px;color:var(--gray-400);margin-top:2px">As of ${Utils.fmtDate(Utils.today())}</div>
        </div>
        <span class="${balanced ? 'balance-ok' : 'balance-err'}" style="font-size:12px;padding:4px 10px;border-radius:20px">${balanced ? '✓ Balanced' : '⚠ Unbalanced'}</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Account Name</th>
              <th>Type</th>
              <th class="text-right">Debit</th>
              <th class="text-right">Credit</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr style="background:var(--navy-900);color:white;font-weight:700">
              <td colspan="3" style="padding:12px 14px;font-size:13px">TOTALS</td>
              <td class="text-right mono" style="padding:12px 14px;font-size:13px">${Utils.fmtCurrency(totalDr)}</td>
              <td class="text-right mono" style="padding:12px 14px;font-size:13px">${Utils.fmtCurrency(totalCr)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
    ${!balanced ? `<div class="balance-err" style="margin-top:12px;padding:12px;border-radius:8px;text-align:center;font-size:13px">⚠ Trial Balance is off by ${Utils.fmtCurrency(Math.abs(totalDr - totalCr))}</div>` : ''}
  `;
}

// ════════════════════════════════════════════════════════════════════
// APP CONTROLLER
// ════════════════════════════════════════════════════════════════════
const App = {
  currentPage: 'dashboard',

  async init() {
    Loading.show('Initializing database...');
    try {
      await DB.init();
      Loading.hide();
      this.navigate('dashboard');
      this.setupNavigation();
    } catch (err) {
      Loading.hide();
      Toast.error('Database init failed: ' + err.message);
      console.error(err);
    }
  },

  setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.dataset.page;
        this.navigate(page);
        // Close mobile sidebar
        if (window.innerWidth < 768) {
          document.getElementById('sidebar').classList.remove('open');
        }
      });
    });
  },

  navigate(page) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    // Show target
    const target = document.getElementById(`page-${page}`);
    if (target) target.classList.add('active');

    this.currentPage = page;

    // Render
    switch (page) {
      case 'dashboard': renderDashboard(); break;
      case 'coa': renderCOA(); break;
      case 'journal': renderJournal(); break;
      case 'pdf-upload': renderPDFUpload(); break;
      case 'general-ledger': renderGeneralLedger(); break;
      case 'income-statement': renderIncomeStatement(); break;
      case 'balance-sheet': renderBalanceSheet(); break;
      case 'trial-balance': renderTrialBalance(); break;
    }
  },

  openModal() {
    document.getElementById('modal-overlay').classList.remove('hidden');
  },

  closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
  },

  toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
  },

  async resetData() {
    if (!confirm('Reset all data and restore demo seed data? This cannot be undone.')) return;
    Loading.show('Resetting data...');
    await DB.clearAll();
    Loading.hide();
    Toast.success('Demo data restored');
    this.navigate(this.currentPage);
  }
};

// Close modal on overlay click
document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-overlay')) App.closeModal();
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') App.closeModal();
});

// Start app
document.addEventListener('DOMContentLoaded', () => App.init());
