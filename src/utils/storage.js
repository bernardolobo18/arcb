import { CATALOG_VERSION, DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, DEFAULT_SETTINGS } from '../data/defaultData.js';

const DATABASE_NAME = 'cafe-pos-local';
const DATABASE_VERSION = 2;
const LEGACY_STORAGE_KEY = 'simple-pos-state-v1';

export const DEFAULT_STATE = {
  categories: DEFAULT_CATEGORIES,
  products: DEFAULT_PRODUCTS,
  orders: [],
  cashSessions: [],
  expenses: [],
  settings: DEFAULT_SETTINGS
};

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains('categories')) database.createObjectStore('categories', { keyPath: 'id' });
      if (!database.objectStoreNames.contains('products')) database.createObjectStore('products', { keyPath: 'id' });
      if (!database.objectStoreNames.contains('orders')) database.createObjectStore('orders', { keyPath: 'id' });
      if (!database.objectStoreNames.contains('cashSessions')) database.createObjectStore('cashSessions', { keyPath: 'id' });
      if (!database.objectStoreNames.contains('expenses')) database.createObjectStore('expenses', { keyPath: 'id' });
      if (!database.objectStoreNames.contains('settings')) database.createObjectStore('settings', { keyPath: 'key' });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function mergeCatalogDefaults(state) {
  const categories = [
    ...DEFAULT_CATEGORIES.map((defaultCategory) => {
      const existing = state.categories.find((category) => category.id === defaultCategory.id);
      return existing ? { ...existing, name: defaultCategory.name } : defaultCategory;
    }),
    ...state.categories.filter((category) => !DEFAULT_CATEGORIES.some((defaultCategory) => defaultCategory.id === category.id))
  ];
  const products = [
    ...DEFAULT_PRODUCTS.map((defaultProduct) => {
      const existing = state.products.find((product) => product.id === defaultProduct.id);
      return existing ? { ...existing, ...defaultProduct } : defaultProduct;
    }),
    ...state.products.filter((product) => !DEFAULT_PRODUCTS.some((defaultProduct) => defaultProduct.id === product.id))
  ];

  return {
    ...state,
    categories,
    products,
    settings: { ...state.settings, catalogVersion: CATALOG_VERSION }
  };
}

function normalizeState(value = {}) {
  const settings = value.settings || {};
  return {
    categories: Array.isArray(value.categories) ? value.categories : DEFAULT_STATE.categories,
    products: Array.isArray(value.products) ? value.products : DEFAULT_STATE.products,
    orders: Array.isArray(value.orders) ? value.orders : [],
    cashSessions: Array.isArray(value.cashSessions) ? value.cashSessions : [],
    expenses: Array.isArray(value.expenses) ? value.expenses : [],
    settings: {
      ...DEFAULT_STATE.settings,
      ...settings,
      catalogVersion: Object.prototype.hasOwnProperty.call(settings, 'catalogVersion') ? settings.catalogVersion : 0
    }
  };
}

export async function loadState() {
  const database = await openDatabase();
  const transaction = database.transaction(['categories', 'products', 'orders', 'cashSessions', 'expenses', 'settings'], 'readonly');
  const [categories, products, orders, cashSessions, expenses, settingRows] = await Promise.all([
    requestResult(transaction.objectStore('categories').getAll()),
    requestResult(transaction.objectStore('products').getAll()),
    requestResult(transaction.objectStore('orders').getAll()),
    requestResult(transaction.objectStore('cashSessions').getAll()),
    requestResult(transaction.objectStore('expenses').getAll()),
    requestResult(transaction.objectStore('settings').getAll())
  ]);

  if (!categories.length && !products.length && !orders.length && !cashSessions.length && !expenses.length && !settingRows.length) {
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    let initial = DEFAULT_STATE;
    if (legacy) {
      try {
        initial = mergeCatalogDefaults(normalizeState(JSON.parse(legacy)));
      } catch {
        initial = DEFAULT_STATE;
      }
    }
    await saveState(initial);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return initial;
  }

  const settings = Object.fromEntries(settingRows.map(({ key, value }) => [key, value]));
  const state = mergeCatalogDefaults(normalizeState({
    categories,
    products,
    orders: orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    cashSessions: cashSessions.sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt)),
    expenses: expenses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    settings
  }));

  if (
    Number(settings.catalogVersion || 0) < CATALOG_VERSION ||
    state.categories.length !== categories.length ||
    state.products.length !== products.length
  ) {
    await saveState(state);
  }

  return state;
}

export async function saveState(value) {
  const state = normalizeState(value);
  const database = await openDatabase();
  const transaction = database.transaction(['categories', 'products', 'orders', 'cashSessions', 'expenses', 'settings'], 'readwrite');

  for (const storeName of ['categories', 'products', 'orders', 'cashSessions', 'expenses', 'settings']) {
    transaction.objectStore(storeName).clear();
  }
  state.categories.forEach((category) => transaction.objectStore('categories').put(category));
  state.products.forEach((product) => transaction.objectStore('products').put(product));
  state.orders.forEach((order) => transaction.objectStore('orders').put(order));
  state.cashSessions.forEach((session) => transaction.objectStore('cashSessions').put(session));
  state.expenses.forEach((expense) => transaction.objectStore('expenses').put(expense));
  Object.entries(state.settings).forEach(([key, value]) => transaction.objectStore('settings').put({ key, value }));

  await transactionDone(transaction);
}

export function validateBackup(value) {
  if (!value || !Array.isArray(value.categories) || !Array.isArray(value.products) || !Array.isArray(value.orders)) {
    throw new Error('O ficheiro não contém uma cópia de segurança válida.');
  }
  return normalizeState(value);
}
