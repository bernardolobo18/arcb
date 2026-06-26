import { Delete } from 'lucide-react';

export function NumericKeypad({ value, onChange, decimal = false, masked = false, label }) {
  function add(character) {
    if (decimal && character === ',') {
      if (value.includes(',') || value.includes('.')) return;
      onChange(value ? `${value},` : '0,');
      return;
    }
    const separator = value.includes(',') ? ',' : '.';
    const decimals = value.split(separator)[1];
    if (decimal && decimals?.length >= 2) return;
    onChange(value === '0' ? character : `${value}${character}`);
  }

  return (
    <div className="keypad-field">
      {label ? <span className="keypad-label">{label}</span> : null}
      <output className={`keypad-display ${masked ? 'masked' : ''}`} aria-live="polite">
        {value ? (masked ? '•'.repeat(value.length) : value) : (decimal ? '0,00' : '—')}
      </output>
      <div className="numeric-keypad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => (
          <button key={number} type="button" onClick={() => add(String(number))}>{number}</button>
        ))}
        {decimal ? <button type="button" onClick={() => add(',')}>,</button> : <button type="button" onClick={() => onChange('')}>C</button>}
        <button type="button" onClick={() => add('0')}>0</button>
        <button type="button" aria-label="Apagar último número" onClick={() => onChange(value.slice(0, -1))}><Delete size={24} /></button>
      </div>
      {decimal ? <button className="keypad-clear" type="button" onClick={() => onChange('')}>Limpar valor</button> : null}
    </div>
  );
}
