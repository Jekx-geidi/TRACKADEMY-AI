import { useId, useState, type InputHTMLAttributes } from 'react';

import { Icon, type IconName } from './Icon';

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  icon?: IconName;
  error?: string;
  hint?: string;
  /** Hides the value and adds a show/hide toggle. */
  secret?: boolean;
  type?: 'text' | 'email' | 'tel' | 'url' | 'search';
  editable?: boolean;
}

export function TextField({ label, value, onChangeText, icon, error, hint, secret = false, editable = true, type = 'text', ...input }: TextFieldProps) {
  const [hidden, setHidden] = useState(true);
  const id = useId();
  const noteId = `${id}-note`;
  const note = error ?? hint;

  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      {/* The box turns accent-coloured on focus (styles.css), so the input itself has no outline. */}
      <div className={`field-box${error ? ' error' : ''}${editable ? '' : ' disabled'}`}>
        {icon ? <Icon name={icon} size={20} /> : null}
        <input
          {...input}
          id={id}
          type={secret && hidden ? 'password' : secret ? 'text' : type}
          value={value}
          onChange={(e) => onChangeText(e.target.value)}
          disabled={!editable}
          aria-invalid={error ? true : undefined}
          aria-describedby={note ? noteId : undefined}
        />
        {secret ? (
          <button type="button" className="field-toggle" aria-label={hidden ? 'Show password' : 'Hide password'} onClick={() => setHidden((h) => !h)}>
            <Icon name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} />
          </button>
        ) : null}
      </div>
      {error ? (
        <p id={noteId} className="field-error" aria-live="polite">
          {error}
        </p>
      ) : hint ? (
        <p id={noteId} className="field-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
