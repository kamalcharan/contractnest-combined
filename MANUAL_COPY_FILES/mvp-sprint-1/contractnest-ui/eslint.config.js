import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MVP isolation rules — keep src/lite/ deletable.
  //
  // Rule A: lite may not reach into the heavy surfaces it exists to bypass.
  //         If it needs 20 lines from one of them, copy the 20 lines.
  // Rule B: nothing outside lite may import from lite. This one-way dependency
  //         is what makes `rm -rf src/lite` a safe rollback at any moment.
  // ─────────────────────────────────────────────────────────────────────────
  {
    files: ['src/lite/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: [
              '**/components/contracts/ContractWizard/**',
              '**/pages/contracts/**',
              '**/components/catalog-studio/**',
              '**/pages/catalog-studio/**',
              '**/components/group-sessions/**',
            ],
            message:
              'src/lite must not import the heavy surfaces it bypasses. Copy what you need instead — see ClaudeDocumentation/mvp/EXECUTION-PLAN.md rule 4.',
          },
        ],
      }],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/lite/**'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['**/lite/**', '@/lite/**'],
            message:
              'Nothing outside src/lite may depend on it — that one-way rule is what keeps the MVP surface deletable.',
          },
        ],
      }],
    },
  },
)
