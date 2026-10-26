// Conventional Commits (TEST_STRATEGY.md §7). Ejemplo: feat(assessments): motor de puntuación v1
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'repo',
        'ci',
        'docs',
        'config',
        'shared',
        'domain',
        'api',
        'app',
        'db',
        'auth',
        'families',
        'content',
        'activities',
        'assessments',
        'plans',
        'assistant',
        'kb',
        'professionals',
        'admin',
        'demo',
      ],
    ],
    // Los mensajes van en español: sin forzar mayúsculas/minúsculas en el asunto.
    'subject-case': [0],
  },
};
