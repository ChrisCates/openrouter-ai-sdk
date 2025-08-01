import prettier from 'eslint-plugin-prettier/recommended'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import tseslint from 'typescript-eslint'
import eslint from '@eslint/js'
import turbo from 'eslint-plugin-turbo'

export default tseslint.config(
  prettier,
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,
  turbo.configs['flat/recommended'],
  {
    files: ['**/*.{js,ts,tsx}'],
    plugins: {
      'simple-import-sort': simpleImportSort
    },
    languageOptions: {
      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 'latest'
      }
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_'
        }
      ],
      'prettier/prettier': [
        'warn',
        {
          singleQuote: true,
          semi: false,
          trailingComma: 'none'
        }
      ],
      'simple-import-sort/imports': [
        'warn',
        {
          groups: [
            [
              '^\\u0000',
              '^\\w[^{}]*$',
              '^@\\w[^{}]*$',
              '^\\w.*\\{.*\\}',
              '^@\\w.*\\{.*\\}',
              '^\\.'
            ]
          ]
        }
      ],
      'simple-import-sort/exports': 'warn'
    }
  },
  { 
    ignores: [
      'node_modules',
      '**/node_modules/**',
      '**/dist/**',
      '**/.turbo/**',
      '**/.next/**',
      '**/build/**'
    ] 
  }
)