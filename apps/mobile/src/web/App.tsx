import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router';

import logo from '../../assets/logo.png';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { homeFor } from '@/features/auth/roles';
import { SelectedChildProvider } from '@/features/dashboards/SelectedChild';
import { ScanSessionProvider } from '@/features/scanner/ScanSession';

import ForgotPasswordScreen from './screens/auth/ForgotPassword';
import OnboardingScreen from './screens/auth/Onboarding';
import SignInScreen from './screens/auth/SignIn';
import SignUpScreen from './screens/auth/SignUp';
import WelcomeScreen from './screens/auth/Welcome';
import ParentChildScreen from './screens/parent/Child';
import ParentHomeScreen from './screens/parent/Home';
import ParentInboxScreen from './screens/parent/Inbox';
import ParentProfileScreen from './screens/parent/Profile';
import ParentScanScreen from './screens/parent/Scan';
import ScanIndexScreen from './screens/scan/ScanIndex';
import ScanManualScreen from './screens/scan/Manual';
import ScanReviewScreen from './screens/scan/Review';
import ScanSavedScreen from './screens/scan/Saved';
import SetupParentScreen from './screens/setup/Parent';
import SetupRoleScreen from './screens/setup/Role';
import SetupStudentScreen from './screens/setup/Student';
import SetupTeacherScreen from './screens/setup/Teacher';
import StudentHomeScreen from './screens/student/Home';
import StudentProfileScreen from './screens/student/Profile';
import StudentRecordsScreen from './screens/student/Records';
import StudentSubjectsScreen from './screens/student/Subjects';
import StudentUploadScreen from './screens/student/Upload';
import TeacherAuditScreen from './screens/teacher/Audit';
import TeacherCreateScreen from './screens/teacher/Create';
import TeacherHomeScreen from './screens/teacher/Home';
import TeacherProfileScreen from './screens/teacher/Profile';
import TeacherSubjectsScreen from './screens/teacher/Subjects';
import { RoleTabBar, type TabSpec } from './ui/RoleTabBar';
import { Spinner } from './ui/Spinner';

const STUDENT_TABS: TabSpec[] = [
  { path: '', label: 'Home', icon: 'home', iconOutline: 'home-outline' },
  { path: 'subjects', label: 'Subjects', icon: 'library', iconOutline: 'library-outline' },
  { path: 'upload', label: 'Upload', icon: 'camera', iconOutline: 'camera-outline', center: true },
  { path: 'records', label: 'Records', icon: 'folder-open', iconOutline: 'folder-open-outline' },
  { path: 'profile', label: 'Profile', icon: 'person', iconOutline: 'person-outline' },
];

const PARENT_TABS: TabSpec[] = [
  { path: '', label: 'Home', icon: 'home', iconOutline: 'home-outline' },
  { path: 'child', label: 'Child', icon: 'happy', iconOutline: 'happy-outline' },
  { path: 'scan', label: 'Scan', icon: 'scan', iconOutline: 'scan-outline', center: true },
  { path: 'inbox', label: 'Inbox', icon: 'mail', iconOutline: 'mail-outline' },
  { path: 'profile', label: 'Profile', icon: 'person', iconOutline: 'person-outline' },
];

const TEACHER_TABS: TabSpec[] = [
  { path: '', label: 'Home', icon: 'home', iconOutline: 'home-outline' },
  { path: 'subjects', label: 'Subjects', icon: 'library', iconOutline: 'library-outline' },
  { path: 'create', label: 'Create', icon: 'add', iconOutline: 'add-outline', center: true },
  { path: 'audit', label: 'Audit', icon: 'shield-checkmark', iconOutline: 'shield-checkmark-outline' },
  { path: 'profile', label: 'Profile', icon: 'person', iconOutline: 'person-outline' },
];

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ScanSessionProvider>
          <AppRoutes />
        </ScanSessionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

/** Lets the routes inside through only when `allowed`; otherwise sends the user where they belong. */
function Allow({ allowed, home }: { allowed: boolean; home: string }) {
  return allowed ? <Outlet /> : <Navigate to={home} replace />;
}

function Tabs({ base, tabs }: { base: string; tabs: TabSpec[] }) {
  return (
    <>
      <Outlet />
      <RoleTabBar base={base} tabs={tabs} />
    </>
  );
}

/**
 * Signed out → welcome / sign in; signed in → role and setup; set up → only that role's
 * tabs (/student, /parent or /teacher) and, for students and parents, the scan flow.
 * The server enforces the same rules with RLS; these only decide which screens show.
 */
function AppRoutes() {
  const { ready, session, profile } = useAuth();

  if (!ready) {
    return (
      <div className="loading-page">
        <img src={logo} alt="Trackademic" />
        <Spinner />
      </div>
    );
  }

  const signedIn = session !== null;
  // Same rule as homeFor(): set up means setup finished and a role chosen.
  const role = signedIn && profile?.setupComplete ? (profile.role ?? null) : null;
  const home = homeFor(signedIn, profile);

  return (
    <Routes>
      <Route element={<Allow allowed={!signedIn} home={home} />}>
        <Route path="/welcome" element={<WelcomeScreen />} />
        <Route path="/onboarding" element={<OnboardingScreen />} />
        <Route path="/sign-in" element={<SignInScreen />} />
        <Route path="/sign-up" element={<SignUpScreen />} />
        <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
      </Route>

      <Route element={<Allow allowed={signedIn && role === null} home={home} />}>
        <Route path="/setup/role" element={<SetupRoleScreen />} />
        <Route path="/setup/student" element={<SetupStudentScreen />} />
        <Route path="/setup/parent" element={<SetupParentScreen />} />
        <Route path="/setup/teacher" element={<SetupTeacherScreen />} />
      </Route>

      <Route element={<Allow allowed={role === 'STUDENT'} home={home} />}>
        <Route path="/student" element={<Tabs base="/student" tabs={STUDENT_TABS} />}>
          <Route index element={<StudentHomeScreen />} />
          <Route path="subjects" element={<StudentSubjectsScreen />} />
          <Route path="upload" element={<StudentUploadScreen />} />
          <Route path="records" element={<StudentRecordsScreen />} />
          <Route path="profile" element={<StudentProfileScreen />} />
        </Route>
      </Route>

      <Route element={<Allow allowed={role === 'PARENT'} home={home} />}>
        <Route
          path="/parent"
          element={
            <SelectedChildProvider>
              <Tabs base="/parent" tabs={PARENT_TABS} />
            </SelectedChildProvider>
          }
        >
          <Route index element={<ParentHomeScreen />} />
          <Route path="child" element={<ParentChildScreen />} />
          <Route path="scan" element={<ParentScanScreen />} />
          <Route path="inbox" element={<ParentInboxScreen />} />
          <Route path="profile" element={<ParentProfileScreen />} />
        </Route>
      </Route>

      <Route element={<Allow allowed={role === 'TEACHER'} home={home} />}>
        <Route path="/teacher" element={<Tabs base="/teacher" tabs={TEACHER_TABS} />}>
          <Route index element={<TeacherHomeScreen />} />
          <Route path="subjects" element={<TeacherSubjectsScreen />} />
          <Route path="create" element={<TeacherCreateScreen />} />
          <Route path="audit" element={<TeacherAuditScreen />} />
          <Route path="profile" element={<TeacherProfileScreen />} />
        </Route>
      </Route>

      {/* Students and parents save papers; teachers don't upload evidence. */}
      <Route element={<Allow allowed={role === 'STUDENT' || role === 'PARENT'} home={home} />}>
        <Route path="/scan" element={<ScanIndexScreen />} />
        <Route path="/scan/review" element={<ScanReviewScreen />} />
        <Route path="/scan/manual" element={<ScanManualScreen />} />
        <Route path="/scan/saved" element={<ScanSavedScreen />} />
      </Route>

      <Route path="*" element={<Navigate to={home} replace />} />
    </Routes>
  );
}
