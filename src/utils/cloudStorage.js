import { DEFAULT_STATE } from './storage.js';
import { supabase } from './supabase.js';

const CACHE_KEY = 'cafe-pos-cloud-cache';
const PENDING_KEY = 'cafe-pos-cloud-pending-state';

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
      ...settings
    }
  };
}

function readJson(key) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

async function invokePosState(token, method, body) {
  const { data, error } = await supabase.functions.invoke('pos-state', {
    body: { method, ...body },
    headers: {
      'x-pos-session': token
    }
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export function getCachedState() {
  return normalizeState(readJson(CACHE_KEY) || DEFAULT_STATE);
}

export function hasPendingState() {
  return Boolean(localStorage.getItem(PENDING_KEY));
}

export async function loadCloudState(token) {
  const pending = readJson(PENDING_KEY);
  if (pending) return normalizeState(pending);

  const data = await invokePosState(token, 'GET');
  const state = normalizeState(data?.state);
  writeJson(CACHE_KEY, state);
  return state;
}

export async function saveCloudState(token, state) {
  const normalized = normalizeState(state);
  writeJson(CACHE_KEY, normalized);

  if (!navigator.onLine) {
    writeJson(PENDING_KEY, normalized);
    return { queued: true };
  }

  await invokePosState(token, 'POST', { state: normalized });
  localStorage.removeItem(PENDING_KEY);
  return { queued: false };
}

export async function flushPendingState(token) {
  const pending = readJson(PENDING_KEY);
  if (!pending || !navigator.onLine) return false;

  await invokePosState(token, 'POST', { state: normalizeState(pending) });
  localStorage.removeItem(PENDING_KEY);
  return true;
}
