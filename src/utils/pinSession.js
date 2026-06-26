export const PIN_SESSION_KEY = 'pos_pin_session';
export const PIN_TOKEN_KEY = 'pos_pin_token';

export function getPinSession() {
  const isOpen = localStorage.getItem(PIN_SESSION_KEY) === 'true';
  const token = localStorage.getItem(PIN_TOKEN_KEY);
  return isOpen && token ? token : null;
}

export function setPinSession(token) {
  localStorage.setItem(PIN_SESSION_KEY, 'true');
  localStorage.setItem(PIN_TOKEN_KEY, token);
}

export function clearPinSession() {
  localStorage.removeItem(PIN_SESSION_KEY);
  localStorage.removeItem(PIN_TOKEN_KEY);
}
