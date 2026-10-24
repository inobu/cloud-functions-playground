import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ESLint } from 'eslint';

const root = resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const ts = '@typescript-eslint/';
const dependency = 'functions/no-implicit-dependencies';

// Real files in tsconfig's include path are essential: these cases must exercise
// type-aware linting, not a parser-only substitute. All are removed in finally.
const cases = [
  ['handled', 'export async function f(p: Promise<void>) { await p; }'],
  ['returned', 'export function f(p: Promise<void>) { return p; }'],
  ['caught', 'Promise.reject(new Error("x")).catch((e: unknown) => { console.error(e); });'],
  ['rejection-handler', 'Promise.resolve(1).then(() => undefined, (e: unknown) => { console.error(e); });'],
  ['floating', 'Promise.resolve(1);', `${ts}no-floating-promises`, 2],
  ['void-promise', 'void Promise.resolve(1);', `${ts}no-floating-promises`, 2],
  ['async-iife', '(async () => { await Promise.resolve(1); })();', `${ts}no-floating-promises`, 2],
  ['thenable', 'declare function task(): PromiseLike<void>; task();', `${ts}no-floating-promises`, 2],
  ['promise-variable', 'declare const task: Promise<void>; task;', `${ts}no-floating-promises`, 2],
  ['then-without-rejection', 'Promise.resolve(1).then(() => undefined);', `${ts}no-floating-promises`, 2],
  ['catch-without-handler', 'Promise.reject(new Error("x")).catch();', `${ts}no-floating-promises`, 2],
  ['redundant-cast', 'export function f(value: string) { return value as string; }', `${ts}no-unnecessary-type-assertion`, 2],
  ['void-value', 'export const value = console.log("x");', `${ts}no-confusing-void-expression`, 2],
  ['void-arrow', 'export const log = () => console.log("ok");'],
  ['runtime-import', 'import { knex } from "knex"; export { knex };'],
  ['runtime-subpath', 'export { defineJsonSecret } from "firebase-functions/params";'],
  ['builtin', 'export { readFileSync } from "node:fs";'],
  ['relative', 'export { registerHook } from "../index";'],
  ['transitive', 'export * from "body-parser";', dependency, 2],
  ['uninstalled', 'export * from "not-a-declared-dependency";', dependency, 2],
  ['dev-import', 'export * from "typescript";', dependency, 2],
  ['dev-type-import', 'import type { Program } from "typescript"; export type { Program };', dependency, 2],
  ['scoped-transitive', 'export * from "@firebase/util";', dependency, 2],
  ['dynamic-import', 'export const load = () => import("body-parser");', dependency, 2],
  ['dynamic-template', 'export const load = () => import(`body-parser`);', dependency, 2],
  ['require', 'export const parser = require("body-parser");', dependency, 2],
  ['require-template', 'export const parser = require(`body-parser`);', dependency, 2],
  ['declared-template', 'export const pg = require(`pg`);'],
  ['import-equals', 'import parser = require("body-parser"); export { parser };', dependency, 2],
  ['import-type', 'export type Parser = import("body-parser").Options;', dependency, 2],
  ['manifest-runtime', 'export * from "declared-runtime";'],
  ['manifest-peer', 'export * from "declared-peer/subpath";'],
  ['manifest-dev', 'export * from "dev-only";', dependency, 2],
  ['manifest-optional', 'export * from "optional-only";', dependency, 2],
  ['empty-catch', 'try { throw new Error("expected"); } catch {}'],
  ['empty-function', 'export function f() {}', `${ts}no-empty-function`, 2],
  ['private-constructor', 'export class Factory { private constructor() {} }'],
  ['parameter-property', 'export class Holder { constructor(public value: number) {} }'],
  ['param-reassign', 'export function f(value: number) { value = 2; return value; }', 'no-param-reassign', 2],
  ['param-mutation', 'export function f(value: { count: number }) { value.count = 2; }'],
  ['duplicate-param-var', 'export function f(value: number) { var value: number; return value; }', `${ts}no-redeclare`, 2],
  ['type-shadow', 'type Value = string; export function f() { type Value = number; return 1; }', `${ts}no-shadow`, 2],
  ['parenthesized-comma', 'export const value = (console.log("x"), 1);', 'no-sequences', 2],
  ['for-initializer-comma', 'let i = 0; let j = 0; for (i = 0, j = 0; i < 2; i++) { console.log(j); }', 'no-restricted-syntax', 2],
  ['for-update-comma', 'let i = 0; let j = 0; for (; i < 2; i++, j++) { console.log(j); }'],
  ['for-update-many', 'let i = 0; let j = 0; let k = 0; for (; i < 2; i++, j++, k++) { console.log(j, k); }'],
  ['object-this', 'export const value = { read() { return this; } };', 'no-restricted-syntax', 2],
  ['explicit-this', 'export function f(this: { value: number }) { return this.value; }'],
  ['class-this', 'export class Value { read() { return this; } }'],
  ['parenthesized-assignment', 'let value = 0; if ((value = 1)) { console.log(value); }', 'no-cond-assign', 2],
  ['finally-throw', 'try { console.log("work"); } finally { throw new Error("lost result"); }', 'no-unsafe-finally', 2],
  ['empty-interface', 'export interface Empty {}', `${ts}no-empty-object-type`, 1],
  ['side-effect', 'import "pg";', 'functions/no-import-side-effect', 1],
  ['empty-import-clause', 'import {} from "pg";'],
  ['var', 'export function f() { var value = 1; value++; return value; }', 'no-var', 1],
  ['loose-equality', 'export const f = (value: unknown) => value == null;', 'eqeqeq', 1],
  ['deprecated', '/** @deprecated Use the replacement. */\nfunction oldApi() { return 1; }\nexport const value = oldApi();', `${ts}no-deprecated`, 1],
  ['for-of', 'export function sum(values: number[]) { let total = 0; for (let i = 0; i < values.length; i++) { total += values[i]; } return total; }', `${ts}prefer-for-of`, 1],
  ['overloads', 'export function f(value: string): void;\nexport function f(value: number): void;\nexport function f(value: string | number): void { console.log(value); }', `${ts}unified-signatures`, 1],
  ['const', 'export function f() { let value = 1; return value; }', 'prefer-const', 1],
  ['trailing-comma', 'export const value = {\n  key: 1\n};', '@stylistic/comma-dangle', 1],
];

const directory = mkdtempSync(join(root, 'src', 'lint-policy-'));
try {
  const manifestDirectory = join(directory, 'manifest');
  mkdirSync(manifestDirectory);
  writeFileSync(join(manifestDirectory, 'package.json'), JSON.stringify({
    dependencies: { 'declared-runtime': '*' },
    peerDependencies: { 'declared-peer': '*' },
    devDependencies: { 'dev-only': '*' },
    optionalDependencies: { 'optional-only': '*' },
  }));
  const files = cases.map(([name, source]) => {
    const file = join(name.startsWith('manifest-') ? manifestDirectory : directory, `${name}.ts`);
    writeFileSync(file, `export {};\n${source}\n`);
    return file;
  });
  const results = await new ESLint({ cwd: root }).lintFiles(files);
  const byFile = new Map(results.map(result => [result.filePath, result]));
  for (const [index, [name, , rule, severity]] of cases.entries()) {
    const result = byFile.get(files[index]);
    assert.ok(result, `${name}: file was not linted`);
    assert.equal(result.fatalErrorCount, 0, `${name}: ${JSON.stringify(result.messages)}`);
    if (rule) {
      assert.ok(result.messages.some(message => message.ruleId === rule && message.severity === severity),
        `${name}: expected ${rule} at severity ${severity}, got ${JSON.stringify(result.messages)}`);
      if (severity === 1) assert.equal(result.errorCount, 0, `${name}: warning became blocking`);
    } else {
      assert.deepEqual(result.messages, [], `${name}: valid code was rejected`);
    }
  }

  // Check actual exit behavior as well as diagnostic severity.
  const cli = join(require.resolve('eslint/package.json'), '..', 'bin', 'eslint.js');
  for (const [name, expected] of [['var', 0], ['floating', 1]]) {
    const result = spawnSync(process.execPath, [cli, join(directory, `${name}.ts`)], {
      cwd: root, encoding: 'utf8', timeout: 30_000,
    });
    assert.equal(result.status, expected, `${name}: ${result.error ?? ''}\n${result.stdout}\n${result.stderr}`);
  }
  console.log(`Passed ${cases.length} lint policy cases; errors block and warnings do not.`);
} finally {
  rmSync(directory, { recursive: true, force: true });
}
