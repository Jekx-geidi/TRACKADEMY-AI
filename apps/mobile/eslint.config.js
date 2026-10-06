import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // The Expo screens, UI kit and native-only modules are kept for reference but not built.
  { ignores: ['dist', 'node_modules', 'src/app', 'src/components', 'src/legacy', 'src/**/*.native.ts', 'src/**/*.native.tsx', 'src/lib/__tests__/sessionStorage.test.ts', 'public/sw.js'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['src/**/*.{ts,tsx}', 'db-tests/**/*.ts', 'vite.config.ts', 'vitest.db.config.ts'],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true, allowExportNames: ['greeting', 'firstName', 'useAuth', 'useSelectedChild', 'useScanSession', 'initials'] }],
    },
  },
);
