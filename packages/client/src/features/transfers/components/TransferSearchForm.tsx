import { useState } from 'react';
import type { FormEvent } from 'react';
import { usePrograms } from '../hooks/usePrograms.js';
import styles from './TransferSearchForm.module.css';

interface Props {
  onSearch: (from: string, to: string, amount: number) => void;
  loading?: boolean;
}

export default function TransferSearchForm({ onSearch, loading = false }: Props) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');

  const { data: creditCards, isLoading: ccsLoading } = usePrograms('credit_card');
  const { data: airlines, isLoading: airlinesLoading } = usePrograms('airline');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const n = parseInt(amount, 10);
    if (from && to && n > 0) onSearch(from, to, n);
  }

  const canSubmit =
    from !== '' && to !== '' && parseInt(amount, 10) > 0 && !loading;

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label htmlFor="from-program">Transfer from</label>
        <select
          id="from-program"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          disabled={ccsLoading}
        >
          <option value="">Select a points program…</option>
          {creditCards?.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label htmlFor="to-program">Transfer to</label>
        <select
          id="to-program"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          disabled={airlinesLoading}
        >
          <option value="">Select an airline…</option>
          {airlines?.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label htmlFor="amount">Points to transfer</label>
        <input
          id="amount"
          type="number"
          min={1000}
          step={1000}
          placeholder="e.g. 60000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      <button type="submit" className={styles.submit} disabled={!canSubmit}>
        {loading ? 'Searching…' : 'Find paths'}
      </button>
    </form>
  );
}
