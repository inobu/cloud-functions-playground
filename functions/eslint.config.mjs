import stylistic from '@stylistic/eslint-plugin';
import tseslint from 'typescript-eslint';
import functionsPolicy from './eslint-rules.mjs';

// Keep the explicit TSLint policy instead of adding a recommended preset's rules.
// See LINT_MIGRATION.md for the complete mapping and behavior differences.
export default [
  { ignores: ['lib/**', 'node_modules/**'] },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      '@stylistic': stylistic,
      functions: functionsPolicy,
    },
    rules: {
      // Errors: preserve all 21 previous error policies.
      '@typescript-eslint/adjacent-overload-signatures': 'error',
      'no-sequences': ['error', { allowInParentheses: false }],
      '@typescript-eslint/no-namespace': ['error', {
        allowDeclarations: false,
        allowDefinitionFiles: false,
      }],
      'no-param-reassign': ['error', { props: false }],
      '@typescript-eslint/triple-slash-reference': ['error', {
        path: 'never', types: 'always', lib: 'always',
      }],
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      'no-labels': ['error', { allowLoop: true, allowSwitch: true }],
      'no-cond-assign': ['error', 'always'],
      'no-new-wrappers': 'error',
      'constructor-super': 'error',
      'no-duplicate-case': 'error',
      '@typescript-eslint/no-redeclare': ['error', { builtinGlobals: false }],
      '@typescript-eslint/no-shadow': ['error', {
        hoist: 'all',
        ignoreTypeValueShadow: false,
        ignoreFunctionTypeParameterNameValueShadow: false,
      }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      '@typescript-eslint/no-empty-function': ['error', {
        allow: ['private-constructors', 'protected-constructors'],
      }],
      '@typescript-eslint/no-floating-promises': ['error', {
        checkThenables: true,
        ignoreVoid: false,
        ignoreIIFE: false,
      }],
      'functions/no-implicit-dependencies': 'error',
      '@typescript-eslint/no-invalid-this': ['error', { capIsConstructor: false }],
      'no-restricted-syntax': ['error', {
        // no-sequences permits both for-loop initializers and updates. TSLint
        // only permitted updates, so retain the initializer check explicitly.
        selector: 'ForStatement > SequenceExpression.init',
        message: 'Do not use the comma operator in a for-loop initializer.',
      }, {
        // ESLint otherwise permits object methods and bind/call receivers that
        // TSLint rejected. Explicit TypeScript this parameters remain allowed.
        selector: 'ThisExpression:not(ClassDeclaration ThisExpression):not(ClassExpression ThisExpression):not(FunctionDeclaration:has(> Identifier[name="this"]) ThisExpression):not(FunctionExpression:has(> Identifier[name="this"]) ThisExpression)',
        message: 'Use this inside a class or a function with an explicit this parameter.',
      }],
      '@typescript-eslint/only-throw-error': 'error',
      'no-unsafe-finally': 'error',
      '@typescript-eslint/no-confusing-void-expression': ['error', {
        ignoreArrowShorthand: true,
      }],
      'no-duplicate-imports': 'error',

      // Warnings remain non-blocking: do not add --max-warnings=0 to lint.
      '@typescript-eslint/no-empty-object-type': ['warn', {
        allowObjectTypes: 'always',
      }],
      'functions/no-import-side-effect': 'warn',
      'no-var': 'warn',
      eqeqeq: ['warn', 'always'],
      '@typescript-eslint/no-deprecated': 'warn',
      '@typescript-eslint/prefer-for-of': 'warn',
      '@typescript-eslint/unified-signatures': 'warn',
      'prefer-const': 'warn',
      '@stylistic/comma-dangle': ['warn', {
        arrays: 'always-multiline',
        objects: 'always-multiline',
        imports: 'always-multiline',
        exports: 'always-multiline',
        functions: 'always-multiline',
        enums: 'ignore',
        generics: 'ignore',
        tuples: 'ignore',
        importAttributes: 'ignore',
        dynamicImports: 'ignore',
      }],
    },
  },
];
