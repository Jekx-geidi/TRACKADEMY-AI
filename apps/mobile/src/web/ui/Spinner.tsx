export function Spinner({ size = 'normal', label = 'Loading' }: { size?: 'small' | 'normal' | 'large'; label?: string }) {
  return <span className={`spinner${size === 'normal' ? '' : ` ${size}`}`} role="status" aria-label={label} />;
}
