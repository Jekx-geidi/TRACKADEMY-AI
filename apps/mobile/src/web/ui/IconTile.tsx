import { Icon, type IconName } from './Icon';

export function IconCircle({ name, tint, color, size = 52 }: { name: IconName; tint: string; color: string; size?: number }) {
  return (
    <span className="icon-circle" style={{ width: size, height: size, background: tint }}>
      <Icon name={name} size={size * 0.46} color={color} />
    </span>
  );
}

/** Square-ish action tile: tinted icon circle above a short label. */
export function IconTile({ icon, tint, color, label, onPress }: { icon: IconName; tint: string; color: string; label: string; onPress: () => void }) {
  return (
    <button type="button" className="icon-tile" onClick={onPress}>
      <IconCircle name={icon} tint={tint} color={color} />
      <span>{label}</span>
    </button>
  );
}
