import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message: 'Read configuration from src/config.ts instead of process.env.',
        },
      ],
      // Services must go through repositories; only repositories touch Prisma directly.
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@prisma/client',
              message:
                'Import enums from common/enums and use repositories. Only `import type` is allowed.',
              allowTypeImports: true,
            },
          ],
          patterns: [
            {
              group: ['**/common/db'],
              importNames: ['prisma'],
              message: 'Do not use the prisma client directly; go through a repository.',
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  { files: ['src/config.ts'], rules: { 'no-restricted-properties': 'off' } },
  {
    files: [
      'src/**/*.repository.ts',
      'src/common/db.ts',
      'src/common/enums.ts',
      'src/common/prisma-errors.ts',
      'src/common/prisma-errors.test.ts',
      'src/scripts/**',
      'src/test-utils/**',
      'src/**/*.int.test.ts',
    ],
    rules: { '@typescript-eslint/no-restricted-imports': 'off' },
  },
  prettier,
);
