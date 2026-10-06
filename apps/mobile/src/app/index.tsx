import { Redirect } from 'expo-router';

import { useAuth } from '@/features/auth/AuthProvider';
import { homeFor } from '@/features/auth/roles';

/** "/" sends everyone to where they belong: sign in, account setup, or their role's dashboard. */
export default function Index() {
  const { session, profile } = useAuth();
  return <Redirect href={homeFor(session !== null, profile)} />;
}
