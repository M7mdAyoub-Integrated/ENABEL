import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'

/**
 * Two rules here are load-bearing for 08_FRONTEND_BUILD_PLAN sections 2 and 3.
 * They are errors, not warnings, so `npm run build` fails on violation.
 *
 *   1. No literal user-visible string in JSX.
 *   2. No physical-direction Tailwind classes (ml/mr/pl/pr/left/right/text-left/text-right).
 *
 * Both are on from day one. Do not downgrade either to a warning to get a build
 * green -- fix the code instead. A physical-direction class does not fail in
 * English, only in Arabic, which means a warning would ship broken RTL.
 */

/** Physical-direction Tailwind utilities that break RTL. */
const PHYSICAL_DIRECTION =
  '(?:^|[\\s:\\[])-?(?:ml|mr|pl|pr|left|right)-'
/** text-left / text-right specifically (text-start / text-end are the correct forms). */
const PHYSICAL_TEXT_ALIGN = '(?:^|[\\s:\\[])text-(?:left|right)(?:$|[\\s\\]])'

/** Props whose string value is rendered to, or read out to, a user. */
const USER_VISIBLE_PROPS = [
  'aria-label',
  'aria-description',
  'aria-placeholder',
  'aria-valuetext',
  'aria-roledescription',
  'placeholder',
  'title',
  'alt',
  'label',
]

const userVisiblePropSelector = USER_VISIBLE_PROPS.map(
  (p) => `JSXAttribute[name.name="${p}"] > Literal`,
).join(', ')

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'src/types/database.ts'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...reactHooks.configs.recommended.rules,

      // ---- RULE 1: no hardcoded user-visible strings -----------------------
      // Catches literal text nodes in JSX: <p>Hello</p>
      'react/jsx-no-literals': [
        'error',
        {
          noStrings: true,
          ignoreProps: true, // props handled by the targeted rule below
          allowedStrings: [], // no exceptions
          noAttributeStrings: false,
        },
      ],

      // ---- RULE 2: no physical-direction classes + user-visible prop strings
      'no-restricted-syntax': [
        'error',
        {
          selector: `JSXAttribute[name.name="className"] Literal[value=/${PHYSICAL_DIRECTION}/]`,
          message:
            'Physical-direction class breaks RTL. Use logical properties: ms-/me-/ps-/pe-/start-/end-.',
        },
        {
          selector: `JSXAttribute[name.name="className"] Literal[value=/${PHYSICAL_TEXT_ALIGN}/]`,
          message: 'Use text-start / text-end, never text-left / text-right.',
        },
        {
          selector: `JSXAttribute[name.name="className"] TemplateElement[value.raw=/${PHYSICAL_DIRECTION}/]`,
          message:
            'Physical-direction class breaks RTL. Use logical properties: ms-/me-/ps-/pe-/start-/end-.',
        },
        {
          selector: `JSXAttribute[name.name="className"] TemplateElement[value.raw=/${PHYSICAL_TEXT_ALIGN}/]`,
          message: 'Use text-start / text-end, never text-left / text-right.',
        },
        {
          selector: userVisiblePropSelector,
          message:
            'User-visible prop must come from a translation file, not a literal. Use t(...).',
        },
      ],
    },
  },
  // The i18n bootstrap legitimately names locales and namespaces as literals.
  {
    files: ['src/i18n/**/*.ts', 'src/lib/format.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
)
