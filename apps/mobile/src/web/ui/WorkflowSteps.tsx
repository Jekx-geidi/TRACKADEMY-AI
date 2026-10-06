const STEPS = ['Scan Paper', 'Detect Code', 'Match Assessment', 'Confirm Score'] as const;

/**
 * The core workflow, with the current step highlighted. `current` is 0-based; -1 shows none.
 * `onDark` renders for use inside a HeroCard.
 */
export function WorkflowSteps({ current = -1, onDark = false }: { current?: number; onDark?: boolean }) {
  return (
    <ol
      className={`workflow${onDark ? ' on-dark' : ''}`}
      aria-label={current >= 0 ? `Step ${current + 1} of ${STEPS.length}` : 'How it works'}
      style={{ listStyle: 'none', margin: 0, padding: 0 }}
    >
      {STEPS.map((step, i) => {
        const done = current >= 0 && i < current;
        const active = i === current;
        return (
          <li key={step} className={`workflow-step${done ? ' done' : ''}${active ? ' active' : ''}`} aria-current={active ? 'step' : undefined}>
            <span className="workflow-dot">{done ? '✓' : i + 1}</span>
            <span>{step}</span>
          </li>
        );
      })}
    </ol>
  );
}
