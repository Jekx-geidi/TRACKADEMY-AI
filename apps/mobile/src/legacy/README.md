# Legacy screens (not routed)

The Phase 0 / single-dashboard tab screens, kept for reference. They are no longer under
`src/app`, so Expo Router does not serve them. Their replacements:

| Old | New |
| --- | --- |
| `tabs/index.tsx` (generic home) | `app/student/index.tsx`, `app/parent/index.tsx`, `app/teacher/index.tsx` |
| `tabs/teacher.tsx` (create assessment) | `app/teacher/create.tsx` |
| `tabs/_layout.tsx` + `components/BottomBar.tsx` | per-role `_layout.tsx` + `components/RoleTabBar.tsx` |
