import baseConfig from './base'

export default [
  ...baseConfig,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    rules: {
      // React component library specific rules
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off'
    }
  }
]