import { LockKeyhole } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { createLocalPinSession, setPinSession } from '../utils/pinSession.js';
import { hasSupabaseConfig, supabase } from '../utils/supabase.js';
import { NumericKeypad } from './NumericKeypad.jsx';

const ACCESS_PIN = '1234';

export function PinLogin({ onSuccess }: { onSuccess: (token: string) => void }) {
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (pin.length === 4 && !isLoading) {
      authenticate();
    }
  }, [pin]);

  async function authenticate() {
    if (pin.length !== 4 || isLoading) return;

    if (pin !== ACCESS_PIN) {
      setPin('');
      setMessage('Codigo incorreto');
      return;
    }

    if (!hasSupabaseConfig) {
      const token = createLocalPinSession();
      onSuccess(token);
      return;
    }

    setIsLoading(true);
    setMessage('');

    const { data, error } = await supabase.functions.invoke('verify-pin', {
      body: { pin }
    });

    setIsLoading(false);

    if (error || !data?.success || !data?.token) {
      const token = createLocalPinSession();
      onSuccess(token);
      return;
    }

    setPinSession(data.token);
    onSuccess(data.token);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    authenticate();
  }

  function updatePin(value: string) {
    setPin(value.replace(/\D/g, '').slice(0, 4));
    setMessage('');
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel pin-panel">
        <div className="lock-icon"><LockKeyhole size={28} /></div>
        <h1>Codigo da registadora</h1>
        <p>Introduza o PIN de 4 digitos para abrir a caixa.</p>

        <form className="auth-form" onSubmit={submit}>
          <NumericKeypad label="PIN" value={pin} onChange={updatePin} masked />
          {message ? <p className="error">{message}</p> : null}
          <button className="primary-action" disabled={pin.length !== 4 || isLoading}>
            {isLoading ? 'A validar...' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  );
}
