/**
 * LedgerPro — IndexedDB Database Layer
 * Handles all persistent storage with LocalStorage fallback
 */

const DB = (() => {
  const DB_NAME = 'LedgerProDB';
  const DB_VERSION = 1;
  let db = null;

  const STORES = {
    ACCOUNTS: 'chart_of_accounts',
    ENTRIES: 'journal_entries',
    LINES: 'journal_lines',
  };

  // ── Seed Data ────────────────────────────────────────────────────
  const SEED_ACCOUNTS = [
    // ASSETS (1xxx)
    { id: 'acc_1000', code: '1000', name: 'Cash & Cash Equivalents', type: 'Asset', normal: 'Debit', balance: 0 },
    { id: 'acc_1100', code: '1100', name: 'Accounts Receivable', type: 'Asset', normal: 'Debit', balance: 0 },
    { id: 'acc_1200', code: '1200', name: 'Notes Receivable', type: 'Asset', normal: 'Debit', balance: 0 },
    { id: 'acc_1300', code: '1300', name: 'Inventory', type: 'Asset', normal: 'Debit', balance: 0 },
    { id: 'acc_1400', code: '1400', name: 'Prepaid Expenses', type: 'Asset', normal: 'Debit', balance: 0 },
    { id: 'acc_1500', code: '1500', name: 'Short-term Investments', type: 'Asset', normal: 'Debit', balance: 0 },
    { id: 'acc_1600', code: '1600', name: 'Property & Equipment', type: 'Asset', normal: 'Debit', balance: 0 },
    { id: 'acc_1700', code: '1700', name: 'Accumulated Depreciation', type: 'Asset', normal: 'Credit', balance: 0 },
    { id: 'acc_1800', code: '1800', name: 'Intangible Assets', type: 'Asset', normal: 'Debit', balance: 0 },
    // LIABILITIES (2xxx)
    { id: 'acc_2000', code: '2000', name: 'Accounts Payable', type: 'Liability', normal: 'Credit', balance: 0 },
    { id: 'acc_2100', code: '2100', name: 'Notes Payable', type: 'Liability', normal: 'Credit', balance: 0 },
    { id: 'acc_2200', code: '2200', name: 'Accrued Liabilities', type: 'Liability', normal: 'Credit', balance: 0 },
    { id: 'acc_2300', code: '2300', name: 'Deferred Revenue', type: 'Liability', normal: 'Credit', balance: 0 },
    { id: 'acc_2400', code: '2400', name: 'Income Tax Payable', type: 'Liability', normal: 'Credit', balance: 0 },
    { id: 'acc_2500', code: '2500', name: 'Long-term Debt', type: 'Liability', normal: 'Credit', balance: 0 },
    // EQUITY (3xxx)
    { id: 'acc_3000', code: '3000', name: 'Common Stock', type: 'Equity', normal: 'Credit', balance: 0 },
    { id: 'acc_3100', code: '3100', name: 'Additional Paid-in Capital', type: 'Equity', normal: 'Credit', balance: 0 },
    { id: 'acc_3200', code: '3200', name: 'Retained Earnings', type: 'Equity', normal: 'Credit', balance: 0 },
    { id: 'acc_3300', code: '3300', name: "Owner's Drawings", type: 'Equity', normal: 'Debit', balance: 0 },
    // REVENUE (4xxx)
    { id: 'acc_4000', code: '4000', name: 'Sales Revenue', type: 'Revenue', normal: 'Credit', balance: 0 },
    { id: 'acc_4100', code: '4100', name: 'Service Revenue', type: 'Revenue', normal: 'Credit', balance: 0 },
    { id: 'acc_4200', code: '4200', name: 'Interest Income', type: 'Revenue', normal: 'Credit', balance: 0 },
    { id: 'acc_4300', code: '4300', name: 'Other Income', type: 'Revenue', normal: 'Credit', balance: 0 },
    // EXPENSES (5xxx)
    { id: 'acc_5000', code: '5000', name: 'Cost of Goods Sold', type: 'Expense', normal: 'Debit', balance: 0 },
    { id: 'acc_5100', code: '5100', name: 'Salaries & Wages Expense', type: 'Expense', normal: 'Debit', balance: 0 },
    { id: 'acc_5200', code: '5200', name: 'Rent Expense', type: 'Expense', normal: 'Debit', balance: 0 },
    { id: 'acc_5300', code: '5300', name: 'Utilities Expense', type: 'Expense', normal: 'Debit', balance: 0 },
    { id: 'acc_5400', code: '5400', name: 'Depreciation Expense', type: 'Expense', normal: 'Debit', balance: 0 },
    { id: 'acc_5500', code: '5500', name: 'Insurance Expense', type: 'Expense', normal: 'Debit', balance: 0 },
    { id: 'acc_5600', code: '5600', name: 'Advertising Expense', type: 'Expense', normal: 'Debit', balance: 0 },
    { id: 'acc_5700', code: '5700', name: 'Interest Expense', type: 'Expense', normal: 'Debit', balance: 0 },
    { id: 'acc_5800', code: '5800', name: 'Income Tax Expense', type: 'Expense', normal: 'Debit', balance: 0 },
    { id: 'acc_5900', code: '5900', name: 'Miscellaneous Expense', type: 'Expense', normal: 'Debit', balance: 0 },
  ];

  const SEED_ENTRIES = [
    {
      id: 'je_001', date: '2024-01-01', description: 'Initial capital investment',
      reference: 'JE-001', status: 'Posted', createdAt: '2024-01-01T09:00:00Z'
    },
    {
      id: 'je_002', date: '2024-01-05', description: 'Purchase of office equipment',
      reference: 'JE-002', status: 'Posted', createdAt: '2024-01-05T10:30:00Z'
    },
    {
      id: 'je_003', date: '2024-01-10', description: 'Sales revenue received',
      reference: 'JE-003', status: 'Posted', createdAt: '2024-01-10T11:00:00Z'
    },
    {
      id: 'je_004', date: '2024-01-15', description: 'Monthly rent payment',
      reference: 'JE-004', status: 'Posted', createdAt: '2024-01-15T09:00:00Z'
    },
    {
      id: 'je_005', date: '2024-01-20', description: 'Service revenue on account',
      reference: 'JE-005', status: 'Posted', createdAt: '2024-01-20T14:00:00Z'
    },
    {
      id: 'je_006', date: '2024-01-25', description: 'Salaries paid',
      reference: 'JE-006', status: 'Posted', createdAt: '2024-01-25T09:00:00Z'
    },
    {
      id: 'je_007', date: '2024-02-01', description: 'Utility bill payment',
      reference: 'JE-007', status: 'Posted', createdAt: '2024-02-01T10:00:00Z'
    },
    {
      id: 'je_008', date: '2024-02-10', description: 'Sales of inventory',
      reference: 'JE-008', status: 'Posted', createdAt: '2024-02-10T11:30:00Z'
    },
  ];

  const SEED_LINES = [
    // JE-001: Initial capital investment
    { id: 'jl_001a', entryId: 'je_001', accountId: 'acc_1000', description: 'Cash from investors', debit: 50000, credit: 0, seq: 1 },
    { id: 'jl_001b', entryId: 'je_001', accountId: 'acc_3000', description: 'Common stock issued', debit: 0, credit: 30000, seq: 2 },
    { id: 'jl_001c', entryId: 'je_001', accountId: 'acc_3100', description: 'Additional paid-in capital', debit: 0, credit: 20000, seq: 3 },
    // JE-002: Equipment purchase
    { id: 'jl_002a', entryId: 'je_002', accountId: 'acc_1600', description: 'Office equipment', debit: 8000, credit: 0, seq: 1 },
    { id: 'jl_002b', entryId: 'je_002', accountId: 'acc_1000', description: 'Cash payment', debit: 0, credit: 8000, seq: 2 },
    // JE-003: Sales revenue
    { id: 'jl_003a', entryId: 'je_003', accountId: 'acc_1000', description: 'Cash received', debit: 15000, credit: 0, seq: 1 },
    { id: 'jl_003b', entryId: 'je_003', accountId: 'acc_4000', description: 'Sales revenue', debit: 0, credit: 15000, seq: 2 },
    // JE-004: Rent
    { id: 'jl_004a', entryId: 'je_004', accountId: 'acc_5200', description: 'Office rent', debit: 2000, credit: 0, seq: 1 },
    { id: 'jl_004b', entryId: 'je_004', accountId: 'acc_1000', description: 'Cash payment', debit: 0, credit: 2000, seq: 2 },
    // JE-005: Service revenue on account
    { id: 'jl_005a', entryId: 'je_005', accountId: 'acc_1100', description: 'A/R - consulting services', debit: 7500, credit: 0, seq: 1 },
    { id: 'jl_005b', entryId: 'je_005', accountId: 'acc_4100', description: 'Service revenue', debit: 0, credit: 7500, seq: 2 },
    // JE-006: Salaries
    { id: 'jl_006a', entryId: 'je_006', accountId: 'acc_5100', description: 'Salaries expense', debit: 9000, credit: 0, seq: 1 },
    { id: 'jl_006b', entryId: 'je_006', accountId: 'acc_1000', description: 'Cash paid', debit: 0, credit: 9000, seq: 2 },
    // JE-007: Utilities
    { id: 'jl_007a', entryId: 'je_007', accountId: 'acc_5300', description: 'Electricity & gas', debit: 450, credit: 0, seq: 1 },
    { id: 'jl_007b', entryId: 'je_007', accountId: 'acc_1000', description: 'Cash paid', debit: 0, credit: 450, seq: 2 },
    // JE-008: Sales of inventory
    { id: 'jl_008a', entryId: 'je_008', accountId: 'acc_1000', description: 'Cash from sales', debit: 12000, credit: 0, seq: 1 },
    { id: 'jl_008b', entryId: 'je_008', accountId: 'acc_4000', description: 'Sales revenue', debit: 0, credit: 12000, seq: 2 },
    { id: 'jl_008c', entryId: 'je_008', accountId: 'acc_5000', description: 'Cost of goods sold', debit: 7200, credit: 0, seq: 3 },
    { id: 'jl_008d', entryId: 'je_008', accountId: 'acc_1300', description: 'Inventory reduction', debit: 0, credit: 7200, seq: 4 },
  ];

  // ── Init ─────────────────────────────────────────────────────────
  function init() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        console.warn('IndexedDB not available, using localStorage fallback');
        initLocalStorage();
        resolve();
        return;
      }

      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onerror = () => reject(req.error);

      req.onupgradeneeded = (e) => {
        db = e.target.result;
        if (!db.objectStoreNames.contains(STORES.ACCOUNTS)) {
          db.createObjectStore(STORES.ACCOUNTS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.ENTRIES)) {
          const es = db.createObjectStore(STORES.ENTRIES, { keyPath: 'id' });
          es.createIndex('date', 'date', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.LINES)) {
          const ls = db.createObjectStore(STORES.LINES, { keyPath: 'id' });
          ls.createIndex('entryId', 'entryId', { unique: false });
        }
      };

      req.onsuccess = async (e) => {
        db = e.target.result;
        await seedIfEmpty();
        resolve();
      };
    });
  }

  async function seedIfEmpty() {
    const accounts = await getAll(STORES.ACCOUNTS);
    if (accounts.length === 0) {
      for (const a of SEED_ACCOUNTS) await put(STORES.ACCOUNTS, a);
      for (const e of SEED_ENTRIES) await put(STORES.ENTRIES, e);
      for (const l of SEED_LINES) await put(STORES.LINES, l);
    }
  }

  // ── LocalStorage Fallback ─────────────────────────────────────────
  function initLocalStorage() {
    const lsKey = (store) => `ledgerpro_${store}`;
    const lsGet = (store) => JSON.parse(localStorage.getItem(lsKey(store)) || '[]');
    const lsSave = (store, data) => localStorage.setItem(lsKey(store), JSON.stringify(data));

    // Check if seeded
    if (!lsGet(STORES.ACCOUNTS).length) {
      lsSave(STORES.ACCOUNTS, SEED_ACCOUNTS);
      lsSave(STORES.ENTRIES, SEED_ENTRIES);
      lsSave(STORES.LINES, SEED_LINES);
    }

    // Override IDB methods with LS versions
    DB._lsMode = true;
    DB._lsGet = lsGet;
    DB._lsSave = lsSave;
  }

  // ── IDB Helpers ───────────────────────────────────────────────────
  function tx(storeName, mode = 'readonly') {
    return db.transaction(storeName, mode).objectStore(storeName);
  }

  function idbRequest(req) {
    return new Promise((res, rej) => {
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
  }

  function getAll(storeName) {
    if (DB._lsMode) return Promise.resolve(DB._lsGet(storeName));
    return idbRequest(tx(storeName).getAll());
  }

  function get(storeName, id) {
    if (DB._lsMode) {
      const all = DB._lsGet(storeName);
      return Promise.resolve(all.find(r => r.id === id) || null);
    }
    return idbRequest(tx(storeName).get(id));
  }

  function put(storeName, record) {
    if (DB._lsMode) {
      const all = DB._lsGet(storeName);
      const idx = all.findIndex(r => r.id === record.id);
      if (idx >= 0) all[idx] = record; else all.push(record);
      DB._lsSave(storeName, all);
      return Promise.resolve(record);
    }
    return idbRequest(tx(storeName, 'readwrite').put(record));
  }

  function del(storeName, id) {
    if (DB._lsMode) {
      const all = DB._lsGet(storeName).filter(r => r.id !== id);
      DB._lsSave(storeName, all);
      return Promise.resolve();
    }
    return idbRequest(tx(storeName, 'readwrite').delete(id));
  }

  async function clearAll() {
    if (DB._lsMode) {
      Object.values(STORES).forEach(s => localStorage.removeItem(`ledgerpro_${s}`));
      initLocalStorage();
      return;
    }
    for (const store of Object.values(STORES)) {
      await idbRequest(tx(store, 'readwrite').clear());
    }
    await seedIfEmpty();
  }

  // ── Public API ────────────────────────────────────────────────────
  return {
    STORES,
    init,
    clearAll,
    // Accounts
    getAccounts: () => getAll(STORES.ACCOUNTS),
    getAccount: (id) => get(STORES.ACCOUNTS, id),
    saveAccount: (a) => put(STORES.ACCOUNTS, a),
    deleteAccount: (id) => del(STORES.ACCOUNTS, id),
    // Journal Entries
    getEntries: () => getAll(STORES.ENTRIES),
    getEntry: (id) => get(STORES.ENTRIES, id),
    saveEntry: (e) => put(STORES.ENTRIES, e),
    deleteEntry: (id) => del(STORES.ENTRIES, id),
    // Journal Lines
    getLines: () => getAll(STORES.LINES),
    getLinesForEntry: async (entryId) => {
      const all = await getAll(STORES.LINES);
      return all.filter(l => l.entryId === entryId).sort((a, b) => a.seq - b.seq);
    },
    saveLine: (l) => put(STORES.LINES, l),
    deleteLine: (id) => del(STORES.LINES, id),
    deleteLinesForEntry: async (entryId) => {
      const lines = await getAll(STORES.LINES);
      const toDelete = lines.filter(l => l.entryId === entryId);
      for (const l of toDelete) await del(STORES.LINES, l.id);
    },
    // Computed: account running balances
    async getAccountBalances() {
      const accounts = await getAll(STORES.ACCOUNTS);
      const lines = await getAll(STORES.LINES);
      const balanceMap = {};
      accounts.forEach(a => { balanceMap[a.id] = { ...a, computed: 0 }; });
      lines.forEach(l => {
        if (!balanceMap[l.accountId]) return;
        balanceMap[l.accountId].computed += (l.debit || 0) - (l.credit || 0);
      });
      // Normalize: if normal is Credit, flip sign for display
      return Object.values(balanceMap).map(a => ({
        ...a,
        balance: a.normal === 'Credit' ? -a.computed : a.computed
      }));
    }
  };
})();
