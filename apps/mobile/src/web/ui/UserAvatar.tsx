import { Link } from 'react-router';

import { useAuth } from '@/features/auth/AuthProvider';
import { useLoad } from '@/lib/useLoad';
import { getMyPhotoUrl } from '@/services/api/profile';

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** The signed-in user's photo (or initials), linking to their Profile tab. */
export function UserAvatar() {
  const { profile, session } = useAuth();
  const photo = useLoad(getMyPhotoUrl, session?.user.id ?? null);
  const name = profile?.fullName?.trim() || 'You';
  const role = profile?.role?.toLowerCase();

  const face = (
    <span className="avatar avatar-sm">{photo.data ? <img src={photo.data} alt="" /> : <span aria-hidden="true">{initials(name)}</span>}</span>
  );
  return role ? (
    <Link to={`/${role}/profile`} className="avatar-link" aria-label={`${name} – open profile`}>
      {face}
    </Link>
  ) : (
    face
  );
}
