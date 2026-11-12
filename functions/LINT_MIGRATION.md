# TSLint to ESLint

The baseline is `master` at `0a51a35fbac6ce3978490ed326609eb663f8bd08`
(PR #47). This migration replaces TSLint 5.20.1 with ESLint 10.13.0,
typescript-eslint 8.72.0 and ESLint Stylistic 5.10.0. TypeScript stays at 5.9.2.
Use Node.js 22.13.0 or later within the existing Node.js 22 engine range;
validation used Node.js 22.23.3 and npm 10.9.9.

`npm run lint` checks `src/**/*.ts`, the source directory included by the
unchanged `tsconfig.json`. The flat configuration supplies that project to the
TypeScript parser, so typed rules actually run. Generated `lib` files,
`node_modules`, and JavaScript helper scripts are outside the lint scope, as
before. No recommended preset is added: the rules below define the policy.
Errors fail lint; warnings remain non-blocking. There is no `--max-warnings=0`.

## Complete rule mapping

`TS/` below means `@typescript-eslint/`. Each row retains its previous severity.

| Previous error rule | ESLint rule(s) | Options or differences |
| --- | --- | --- |
| `adjacent-overload-signatures` | `TS/adjacent-overload-signatures` | Require adjacent overloads. |
| `ban-comma-operator` | `no-sequences`, `no-restricted-syntax` | Reject parenthesized sequences too; add a selector for `for` initializers, which `no-sequences` otherwise permits. `for` updates remain permitted. |
| `no-namespace` | `TS/no-namespace` | Explicitly disable both declaration and definition-file exceptions; quoted ambient modules remain allowed. |
| `no-parameter-reassignment` | `no-param-reassign` | `props: false` preserves permitted mutation of a parameter's properties. |
| `no-reference` | `TS/triple-slash-reference` | Reject `path` references; continue allowing `types` and `lib` references. |
| `no-unnecessary-type-assertion` | `TS/no-unnecessary-type-assertion` | Uses project type information. |
| `label-position` | `no-labels` | Allow labels on loops and switches. |
| `no-conditional-assignment` | `no-cond-assign` | `always` also rejects parenthesized assignments. |
| `no-construct` | `no-new-wrappers` | Reject boxed String, Number and Boolean construction. |
| `no-duplicate-super` | `constructor-super` | Detect duplicate calls; also detects missing/invalid `super` calls. |
| `no-duplicate-switch-case` | `no-duplicate-case` | Detect repeated case expressions. |
| `no-duplicate-variable` with `check-parameters` | `TS/no-redeclare` | Check parameter/`var` redeclarations; do not introduce built-in-global restrictions. Legal TypeScript declaration merging stays allowed. |
| `no-shadowed-variable` | `TS/no-shadow` | `hoist: all`; disable the defaults that ignore type/value and function-type parameter shadowing. |
| `no-empty` with `allow-empty-catch` | `no-empty`, `TS/no-empty-function` | Keep empty catches, commented blocks, private/protected constructors and parameter-property constructors allowed. Empty ordinary function bodies still fail. |
| `no-floating-promises` | `TS/no-floating-promises` | Typed; check thenables, async IIFEs and `void` expressions. Expanded coverage is described below. |
| `no-implicit-dependencies` | `functions/no-implicit-dependencies` | Local compatibility rule; accept only `dependencies` and `peerDependencies`, not dev/optional dependencies. See below. |
| `no-invalid-this` | `TS/no-invalid-this`, `no-restricted-syntax` | Disable capitalized-function constructor inference. A selector retains the restriction outside classes, except for functions with explicit TypeScript `this` parameters. Unbound functions nested inside class methods are now checked too. |
| `no-string-throw` | `TS/only-throw-error` | Stronger: rejects known non-Error values, including string variables, numbers and plain objects. `any`/`unknown` rethrows retain the rule's default allowances. |
| `no-unsafe-finally` | `no-unsafe-finally` | ESLint 10 checks escaping return/throw/break/continue; jumps local to a nested loop/function remain allowed. |
| `no-void-expression` with `ignore-arrow-function-shorthand` | `TS/no-confusing-void-expression` | `ignoreArrowShorthand: true`; still reject using a void result as a value. |
| `no-duplicate-imports` | `no-duplicate-imports` | Keep duplicate imports as errors. |

| Previous warning rule | ESLint rule | Options or differences |
| --- | --- | --- |
| `no-empty-interface` | `TS/no-empty-object-type` | `allowObjectTypes: always` avoids adding restrictions on `{}` type literals. Also warns for an empty interface extending a single generic instantiation, which TSLint allowed. |
| `no-import-side-effect` | `functions/no-import-side-effect` | Local token check preserves bare-import warnings while continuing to allow `import {} from 'pkg'`. |
| `no-var-keyword` | `no-var` | Warning only. |
| `triple-equals` | `eqeqeq` | `always`; no new exception for loose null comparisons. |
| `deprecation` | `TS/no-deprecated` | Uses project types and JSDoc `@deprecated` tags; warning only. |
| `prefer-for-of` | `TS/prefer-for-of` | Warning only. |
| `unified-signatures` | `TS/unified-signatures` | Warning only. |
| `prefer-const` | `prefer-const` | Warning only. |
| `trailing-comma` | `@stylistic/comma-dangle` | Explicit `always-multiline` for arrays, objects, imports, exports and function arguments/parameters. The previous optionless TSLint rule was inactive despite its warning severity and comment. This activates that documented intent as a non-blocking warning. Other TypeScript/style categories are ignored. |

## Deliberate differences and compatibility rules

The linters have different ASTs and type/scope analyses, so this is a policy
mapping, not a claim of identical diagnostics on every possible program.

- TSLint's Promise rule only inspected call statements whose return type was
  named `Promise`. The new rule also checks `PromiseLike`/other thenables,
  Promise-valued expressions and invalid rejection handlers. `ignoreVoid: false`
  prevents `void task()` from hiding a rejected Promise. Awaiting, returning,
  `.catch(handler)` and `.then(success, failure)` remain accepted. Storing a
  Promise in a variable is not an end-to-end proof that it is eventually handled.
- There is no single standard replacement for the exact old dependency policy.
  `import-x/no-extraneous-dependencies` normally allows dev/optional dependencies,
  depends on package resolution and does not visit all TypeScript import forms.
  Instead, `eslint-rules.mjs` reads the nearest `package.json` and checks static
  ES imports/re-exports, bare imports, dynamic imports, `require` calls,
  `import name = require(...)` and `import('pkg').Type`. Subpaths and scoped
  packages are checked against their package names. Relative/absolute paths and
  Node built-ins are allowed, including modern `node:` specifiers. An uninstalled,
  undeclared package still fails lint. Nonliteral, computed module names cannot
  be verified by this syntactic check, just as with the old rule. Static template
  literals without interpolations are checked too.
- There is no dedicated core rule with TSLint's exact side-effect-import
  distinction. The second small local rule checks bare import tokens rather
  than treating every empty import-specifier list as a side effect. Neither
  local rule loads TSLint or its dependency tree.
- ESLint's scope/control-flow rules and typed replacements add checks in some
  cases: nested/unbound `this`, thrown non-Error values, constructors,
  void/undefined expressions and generic empty interfaces. Existing source
  needs no edits. None of these warning policies become errors.
- Sequence ASTs differ: TSLint reported a nested-comma diagnostic for a `for`
  update with three or more expressions, although a two-expression update was
  allowed. ESLint treats these as a single permitted update sequence. This
  narrow style-rule difference is retained instead of reproducing the old
  parser-dependent diagnostic.
- The trailing-comma warning is newly effective. TSLint 5.20.1's
  `trailingCommaRule.isEnabled()` returns false when no arguments are supplied;
  the old configuration supplied only severity. This behavior was checked
  against the installed baseline implementation, rather than inferred from
  the configuration comment.

## Audit policy and dependency scope

The CI audit remains required and unchanged:

```sh
npm audit --include=dev --audit-level=low
```

The October migration added no `continue-on-error`, overrides, advisory exclusions
or acceptance waivers, and did not change application code, the TypeScript version
or direct runtime dependency ranges. The November follow-up below adds temporary,
scoped dependency overrides while preserving the same required audit.

A fresh baseline audit on 2026-10-25 JST reports **one High finding**:
[`GHSA-27r3-jxmh-p828`](https://github.com/expressjs/body-parser/security/advisories/GHSA-27r3-jxmh-p828).
The installed path is `firebase-functions@7.3.2 -> express@5.2.1 -> body-parser@2.3.0`.
This differs from the clean historical PR #47 result because the current audit
database reports the advisory. To keep the existing gate passing, the lockfile
updates `body-parser` to 2.4.0 within Express's declared `^2.2.1` range, and `qs`
from 6.16.0 to 6.16.1 as required by the fixed parser's `^6.16.1` range. These are
the only runtime package version changes; other lockfile changes remove TSLint,
install the replacement tools, or rearrange their shared dependencies.

## November 2026 security dependency update

The 2026-11-12 audit of the unchanged migration commit reports 14 Moderate
findings from [glob](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) and
[minimatch](https://github.com/advisories/GHSA-g3hv-75wg-m249). Both advisories
were published after the October migration. PR #49 fixes the separate
[fast-xml-parser Low finding](https://github.com/advisories/GHSA-474x-hrwr-fgx4);
the Moderate findings are already present on its base.

- Update the locked `@google-cloud/firestore` from 9.3.1 to 9.4.1 within Firebase
  Admin's existing `^9.1.0` range. Its `@google-cloud/firestore-api` dependency
  moves from 0.2.0 to 0.7.1, removing the old google-gax 5 / rimraf 5 / glob 10
  dependency path and its minimatch 9 copy. No direct runtime range changes.
- Keep ESLint 10.13.0, typescript-eslint 8.72.0 and the explicit lint rules.
  Override only the minimatch dependency of `eslint@10.13.0`,
  `@eslint/config-array@0.23.5` and
  `@typescript-eslint/typescript-estree@8.72.0` to 11.0.8. This is a real
  dependency replacement, not an advisory exclusion or audit waiver.

These overrides cross minimatch's major version and are temporary. The affected
consumers use `Minimatch.match()` or the named `minimatch()` function, which v11
retains. Upstream has merged the corresponding dependency updates in
[ESLint #21492](https://github.com/eslint/eslint/pull/21492),
[config-array #535](https://github.com/eslint/rewrite/pull/535) and
[typescript-eslint #13145](https://github.com/typescript-eslint/typescript-eslint/pull/13145).
As checked on 2026-11-12, the published stable versions (10.14.0, 0.23.5 and
8.72.2 respectively) still require minimatch 10. Updating to those versions
alone does not fix this advisory. No forced downgrade or prerelease is used.

When stable releases incorporate the fixes, update the affected parent packages
within the existing ESLint 10 / typescript-eslint 8 major versions, remove the
three overrides, regenerate the lockfile and run every check below. Confirm that
all installed minimatch copies are outside the advisory range. The exact parent
versions in the overrides prevent them from silently applying to future upgrades;
the full audit remains the gate for any newly resolved vulnerable dependency.

## Verification

From `functions`, under Node.js 22:

```sh
npm ci --include=dev
npm audit --include=dev --audit-level=low
npm audit --omit=dev --audit-level=low
npm run lint
npm run test:lint
npm run build
npm test
npm ls --all
```

The lint policy tests create isolated modules under `src`, use the real typed
configuration, and remove their temporary files afterward. They check accepted
and rejected Promises, casts, void results, dependency/import forms, manifest
dependency categories, important legacy exceptions and all nine warning
categories. Separate CLI invocations check that errors exit 1 and warnings exit
0. Five file-selection cases cover globstar, brace expansion, extglobs, exclusions
and negations; additional assertions preserve the source, compiled-output and
node_modules ignore policy. CI runs these regression cases in addition to the
existing lint/build/smoke steps and required audit. The production-only audit is
an additional local check, not a replacement for CI's full audit.

The existing smoke test only verifies that the compiled entry point exists and
is nonempty; it does not invoke a deployed function or a live database.

## Primary references

- [typescript-eslint supported versions](https://typescript-eslint.io/users/dependency-versions/)
- [Type-aware linting](https://typescript-eslint.io/getting-started/typed-linting/)
- [Promise-rule options](https://typescript-eslint.io/rules/no-floating-promises/)
- [TSLint dependency policy](https://palantir.github.io/tslint/rules/no-implicit-dependencies/)
- [Import-x dependency-rule behavior](https://github.com/un-ts/eslint-plugin-import-x/blob/master/docs/rules/no-extraneous-dependencies.md)
- [TSLint trailing-comma implementation at 5.20.1](https://github.com/palantir/tslint/blob/5.20.1/src/rules/trailingCommaRule.ts)
