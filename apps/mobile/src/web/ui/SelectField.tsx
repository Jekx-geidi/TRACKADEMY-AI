import { useId } from 'react';

import { Icon, type IconName } from './Icon';

/** A labelled native <select> styled like TextField. */
export function SelectField<T extends string | number>({
  label,
  value,
  options,
  onChange,
  icon,
  error,
  placeholder,
  disabled = false,
}: {
  label: string;
  value: T | null;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  icon?: IconName;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className={`field-box${error ? ' error' : ''}${disabled ? ' disabled' : ''}`}>
        {icon ? <Icon name={icon} size={20} /> : null}
        <select
          id={id}
          className="field-select"
          value={value === null ? '' : String(value)}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(e) => {
            const picked = options.find((o) => String(o.value) === e.target.value);
            if (picked) onChange(picked.value);
          }}
        >
          {value === null ? (
            <option value="" disabled>
              {placeholder ?? 'Choose…'}
            </option>
          ) : null}
          {options.map((o) => (
            <option key={String(o.value)} value={String(o.value)}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {error ? (
        <p id={errorId} className="field-error" aria-live="polite">
          {error}
        </p>
      ) : null}
    </div>
  );
}
