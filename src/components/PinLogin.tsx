import { LockKeyhole } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { setPinSession } from '../utils/pinSession.js';
import { hasSupabaseConfig, supabase } from '../utils/supabase.js';

export function PinLogin({ onSuccess }: { onSuccess: (token: string) => void }) {
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pin.length !== 4 || isLoading) return;

    if (!hasSupabaseConfig) {
      setMessage('Supabase nao esta configurado.');
      return;
    }

    setIsLoading(true);
    setMessage('');

    const { data, error } = await supabase.functions.invoke('verify-pin', {
      body: { pin }
    });

    setIsLoading(false);

    if (error || !data?.success || !data?.token) {
      setPin('');
      setMessage(data?.locked ? 'Muitas tentativas. Tente novamente mais tarde.' : 'Codigo incorreto');
      return;
    }

    setPinSession(data.token);
    onSuccess(data.token);
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
          <input
            aria-label="Codigo da registadora"
            autoComplete="one-time-code"
            autoFocus
            className="pin-login-input"
            inputMode="numeric"
            maxLength={4}
            pattern="[0-9]*"
            type="password"
            value={pin}
            onChange={(event) => updatePin(event.target.value)}
          />
          {message ? <p className="error">{message}</p> : null}
          <button className="primary-action" disabled={pin.length !== 4 || isLoading}>
            {isLoading ? 'A validar...' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  );
}
