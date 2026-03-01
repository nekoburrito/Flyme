import { useState } from 'react';
import { usePrograms } from './hooks/usePrograms.js';
import { useTransferPaths } from './hooks/useTransferPaths.js';
import TransferSearchForm from './components/TransferSearchForm.js';
import TransferPathCard from './components/TransferPathCard.js';
import styles from './TransfersPage.module.css';

interface SearchState {
  from: string;
  to: string;
  amount: number;
}

export default function TransfersPage() {
  const [search, setSearch] = useState<Partial<SearchState>>({});

  // All programs — used to build the slug → name lookup for path cards
  const { data: allPrograms } = usePrograms();
  const programNames: Record<string, string> = {};
  allPrograms?.forEach((p) => {
    programNames[p.slug] = p.shortName;
  });

  const { data: paths, isFetching, isError, error } = useTransferPaths(search);

  function handleSearch(from: string, to: string, amount: number) {
    setSearch({ from, to, amount });
  }

  const hasSearched = !!search.from && !!search.to && !!search.amount;

  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>Transfer Advisor</h1>
      <p className={styles.subheading}>
        Find the best path to move your credit card points to an airline program.
      </p>

      <TransferSearchForm onSearch={handleSearch} loading={isFetching} />

      {hasSearched && (
        <section className={styles.results}>
          {isError ? (
            <div className={styles.error}>
              {error instanceof Error ? error.message : 'Something went wrong. Please try again.'}
            </div>
          ) : isFetching ? (
            <p className={styles.resultsHeader}>Searching…</p>
          ) : paths && paths.length > 0 ? (
            <>
              <p className={styles.resultsHeader}>
                {paths.length} {paths.length === 1 ? 'path' : 'paths'} found — sorted by value
              </p>
              {paths.map((path, i) => (
                <TransferPathCard key={i} path={path} programNames={programNames} />
              ))}
            </>
          ) : (
            <div className={styles.empty}>
              No transfer paths found between these programs.
            </div>
          )}
        </section>
      )}
    </main>
  );
}
