import { existsSync, readFileSync } from 'node:fs';
import { isBuiltin } from 'node:module';
import { dirname, join } from 'node:path';

function packageFor(filename) {
  let directory = dirname(filename);
  for (;;) {
    const file = join(directory, 'package.json');
    if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/u, ''));
    const parent = dirname(directory);
    if (parent === directory) throw new Error(`No package.json found for ${filename}`);
    directory = parent;
  }
}

// Resolution-based dependency rules can skip uninstalled packages, import-equals
// declarations, or import() types. Check declarations directly, as TSLint did.
const noImplicitDependencies = {
  meta: {
    type: 'problem',
    docs: { description: 'Require dependencies or peerDependencies for package imports.' },
    schema: [],
    messages: {
      undeclared: "Package '{{name}}' must be declared in dependencies or peerDependencies.",
    },
  },
  create(context) {
    const manifest = packageFor(context.physicalFilename);
    const allowed = new Set([
      ...Object.keys(manifest.dependencies ?? {}),
      ...Object.keys(manifest.peerDependencies ?? {}),
    ]);

    function check(node) {
      const name = node?.type === 'Literal' ? node.value
        : node?.type === 'TemplateLiteral' && node.expressions.length === 0
          ? node.quasis[0].value.cooked : undefined;
      if (typeof name !== 'string') return;
      if (isBuiltin(name) || /^(?:\.{1,2}(?:[\\/]|$)|[\\/]|[A-Za-z]:[\\/])/u.test(name)) return;
      const parts = name.split('/');
      const packageName = name.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
      if (!allowed.has(packageName)) {
        context.report({ node, messageId: 'undeclared', data: { name: packageName } });
      }
    }

    return {
      ImportDeclaration: node => check(node.source),
      ExportNamedDeclaration: node => check(node.source),
      ExportAllDeclaration: node => check(node.source),
      ImportExpression: node => check(node.source),
      TSExternalModuleReference: node => check(node.expression),
      TSImportType: node => check(node.argument.type === 'TSLiteralType' ? node.argument.literal : node.argument),
      CallExpression(node) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'require' && node.arguments.length === 1) {
          check(node.arguments[0]);
        }
      },
    };
  },
};

export default {
  meta: { name: 'functions-lint-policy' },
  rules: {
    'no-implicit-dependencies': noImplicitDependencies,
    'no-import-side-effect': {
      meta: {
        type: 'suggestion',
        schema: [],
        messages: { sideEffect: 'Avoid imports used only for side effects.' },
      },
      create(context) {
        return {
          ImportDeclaration(node) {
            // Unlike a specifiers.length selector, this preserves TSLint's
            // distinction between import 'pkg' and import {} from 'pkg'.
            const next = context.sourceCode.getTokenAfter(context.sourceCode.getFirstToken(node));
            if (next.type === 'String') context.report({ node, messageId: 'sideEffect' });
          },
        };
      },
    },
  },
};
