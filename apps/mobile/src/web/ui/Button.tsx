import { Icon, type IconName } from './Icon';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  /** "submit" inside a <form>, so Enter on the keyboard sends it. */
  type?: 'button' | 'submit';
}

export function Button({ label, onPress, variant = 'primary', icon, disabled = false, loading = false, type = 'button' }: ButtonProps) {
  return (
    <button type={type} className={`btn ${variant}`} onClick={onPress} disabled={disabled || loading} aria-busy={loading || undefined}>
      {loading ? (
        <Spinner size="small" label={label} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={20} /> : null}
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
