import { clsx } from 'clsx';
import type { TransferPath } from '@flyme/shared';
import styles from './TransferPathCard.module.css';

interface Props {
  path: TransferPath;
  /** Lookup map slug → display name; populated by the parent from usePrograms */
  programNames: Record<string, string>;
}

function formatPoints(n: number): string {
  return n.toLocaleString();
}

function formatCpp(cpp: number): string {
  return `${cpp.toFixed(2)}¢`;
}

function formatDays(days: number): string {
  if (days === 0) return 'Instant';
  return days === 1 ? '1 day' : `${days} days`;
}

function formatFee(cents: number): string {
  if (cents === 0) return 'No fee';
  const dollars = cents / 100;
  return `$${dollars.toFixed(2)} fee`;
}

export default function TransferPathCard({ path, programNames }: Props) {
  const hops = path.steps.length === 1 ? 'Direct' : `${path.steps.length}-hop`;

  return (
    <div className={clsx(styles.card, !path.isViable && styles.notViable)}>
      <div className={styles.header}>
        <div>
          <div className={styles.cpp}>{formatCpp(path.effectiveCpp)} per point</div>
          <div className={styles.meta}>
            <span>{formatPoints(path.totalPointsRequired)} pts required</span>
            <span>{formatDays(path.totalTransferDays)}</span>
            <span>{hops}</span>
          </div>
        </div>
        <div
          className={styles.badge}
          title={path.isViable ? 'All partners active' : 'One or more partners inactive'}
        >
          {path.isViable ? 'Viable' : 'Not viable'}
        </div>
      </div>

      <div className={styles.steps}>
        {path.steps.map((step, i) => (
          <div key={i} className={styles.step}>
            <span className={styles.stepFrom}>
              {programNames[step.fromProgramSlug] ?? step.fromProgramSlug}
            </span>
            <span className={styles.arrow}>→</span>
            <span className={styles.stepTo}>
              {programNames[step.toProgramSlug] ?? step.toProgramSlug}
            </span>
            <div className={styles.stepPoints}>
              <span className={styles.stepPointsIn}>{formatPoints(step.pointsIn)}</span>
              {' → '}
              <span className={styles.stepPointsOut}>{formatPoints(step.pointsOut)}</span>
            </div>
            <div className={styles.stepDetail}>
              <span>Ratio {step.ratio}:1</span>
              {step.bonusPercent > 0 && (
                <span className={styles.bonus}>+{step.bonusPercent}% bonus</span>
              )}
              <span>{formatDays(step.transferTimeDays)}</span>
              <span>{formatFee(step.estimatedFeeCents)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
