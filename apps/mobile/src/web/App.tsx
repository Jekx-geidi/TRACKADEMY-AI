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
import StudentClassScreen from './screens/student/Class';
import StudentClassesScreen from './screens/student/Classes';
import StudentHomeScreen from './screens/student/Home';
import StudentNotificationsScreen from './screens/student/Notifications';
import StudentProfileScreen from './screens/student/Profile';
import StudentRecordScreen from './screens/student/Record';
import StudentSubjectScreen from './screens/student/Subject';
import StudentUploadScreen from './screens/student/Upload';
import StudentWorkScreen from './screens/student/Work';
import JoinScreen from './screens/join/Join';
import { usePendingJoin } from './screens/join/usePendingJoin';
import TeacherAssessmentScreen from './screens/teacher/Assessment';
import TeacherDashboardScreen from './screens/teacher/Dashboard';
import TeacherNotificationsScreen from './screens/teacher/Notifications';
import TeacherProfileScreen from './screens/teacher/Profile';
import TeacherSectionScreen from './screens/teacher/Section';
import TeacherSectionsScreen from './screens/teacher/Sections';
import TeacherStudentScreen from './screens/teacher/Student';
import TeacherStudentsScreen from './screens/teacher/Students';
import TeacherSubjectScreen from './screens/teacher/Subject';
import { useTeacherBadge } from './screens/teacher/useTeacherBadge';
import { RoleTabBar, type TabSpec } from './ui/RoleTabBar';
import { Spinner } from './ui/Spinner';

// Exactly five student actions (PRD v0.7 §2, §45): scores, subjects, records, lacking and
// inbox live inside them.
const STUDENT_TABS: TabSpec[] = [
  { path: '', label: 'Dashboard', icon: 'home', iconOutline: 'home-outline' },
  { path: 'classes', label: 'Classes', icon: 'library', iconOutline: 'library-outline' },
  { path: 'upload', label: 'Upload', icon: 'camera', iconOutline: 'camera-outline', center: true },
  { path: 'notifications', label: 'Notifications', icon: 'notifications', iconOutline: 'notifications-outline' },
  { path: 'profile', label: 'Profile', icon: 'person', iconOutline: 'person-outline' },
];

const PARENT_TABS: TabSpec[] = [
  { path: '', label: 'Home', icon: 'home', iconOutline: 'home-outline' },
  { path: 'child', label: 'Child', icon: 'happy', iconOutline: 'happy-outline' },
  { path: 'scan', label: 'Scan', icon: 'scan', iconOutline: 'scan-outline', center: true },
  { path: 'inbox', label: 'Inbox', icon: 'mail', iconOutline: 'mail-outline' },
  { path: 'profile', label: 'Profile', icon: 'person', iconOutline: 'person-outline' },
];

// Exactly five teacher actions (PRD v0.5 §2, §47): everything else lives under one of them.
const TEACHER_TABS: TabSpec[] = [
  { path: '', label: 'Dashboard', icon: 'pulse', iconOutline: 'pulse-outline' },
  { path: 'sections', label: 'Sections', icon: 'folder', iconOutline: 'folder-outline' },
  { path: 'notifications', label: 'Notifications', icon: 'notifications', iconOutline: 'notifications-outline' },
  { path: 'students', label: 'Students', icon: 'people', iconOutline: 'people-outline' },
  { path: 'profile', label: 'Profile', icon: 'person', iconOutline: 'person-outline' },
];

/** A role's tabs with the unread count on its Notifications tab. */
function BadgedTabs({ base, tabs }: { base: string; tabs: TabSpec[] }) {
  const unread = useTeacherBadge();
  return <Tabs base={base} tabs={tabs.map((t) => (t.path === 'notifications' ? { ...t, badge: unread } : t))} />;
}

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
  // After signing in from an invite link, continue to that join screen.
  usePendingJoin();
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
        <Route path="/student" element={<BadgedTabs base="/student" tabs={STUDENT_TABS} />}>
          <Route index element={<StudentHomeScreen />} />
          <Route path="classes" element={<StudentClassesScreen />} />
          <Route path="classes/:classId" element={<StudentClassScreen />} />
          <Route path="subjects/:subjectId" element={<StudentSubjectScreen />} />
          {/* My Work / My Lacking / My Records: one list, filtered (PRD v0.7 §17, §31, §32). */}
          <Route path="work" element={<StudentWorkScreen />} />
          <Route path="records/:evidenceId" element={<StudentRecordScreen />} />
          <Route path="upload" element={<StudentUploadScreen />} />
          <Route path="notifications" element={<StudentNotificationsScreen />} />
          <Route path="profile" element={<StudentProfileScreen />} />
          {/* Older links. */}
          <Route path="inbox" element={<Navigate to="/student/notifications" replace />} />
          <Route path="records" element={<Navigate to="/student/work?status=SUBMITTED" replace />} />
          <Route path="subjects" element={<Navigate to="/student/classes" replace />} />
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
        <Route path="/teacher" element={<BadgedTabs base="/teacher" tabs={TEACHER_TABS} />}>
          <Route index element={<TeacherDashboardScreen />} />
          <Route path="dashboard" element={<Navigate to="/teacher" replace />} />
          <Route path="sections" element={<TeacherSectionsScreen />} />
          <Route path="sections/:sectionId" element={<TeacherSectionScreen />} />
          <Route path="subjects/:subjectId" element={<TeacherSubjectScreen />} />
          <Route path="assessments/:assessmentId" element={<TeacherAssessmentScreen />} />
          <Route path="notifications" element={<TeacherNotificationsScreen />} />
          <Route path="students" element={<TeacherStudentsScreen />} />
          <Route path="students/:studentId" element={<TeacherStudentScreen />} />
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

      {/* Invite links (PRD v0.3 §9.2): anyone can open one; the screen handles sign-in and roles. */}
      <Route path="/join/:code" element={<JoinScreen />} />

      <Route path="*" element={<Navigate to={home} replace />} />
    </Routes>
  );
}
