import js from '@eslint/js'
import globals from 'globals'
import hooks from 'eslint-plugin-react-hooks'
import refresh from 'eslint-plugin-react-refresh'
export default [{ ignores: ['dist'] }, { files: ['**/*.{js,jsx}'], ...js.configs.recommended, languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: globals.browser, parserOptions: { ecmaFeatures: { jsx: true } } }, plugins: { 'react-hooks': hooks, 'react-refresh': refresh }, rules: { ...js.configs.recommended.rules, ...hooks.configs.recommended.rules, ...refresh.configs.vite.rules, 'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^[A-Z_]' }] } }]
