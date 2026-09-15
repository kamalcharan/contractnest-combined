// Run from contractnest-ui: node src/pages/experience/verify.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('./model.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const model = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString('base64')}`);
assert.equal(model.relationshipFilter('revenue'), 'client,partner');
assert.equal(model.relationshipFilter('expense'), 'vendor');
assert.deepEqual(model.startActions('revenue'), ['create', 'record', 'respond', 'claim']);
assert.deepEqual(model.startActions('expense'), ['request', 'create', 'record', 'claim']);
assert.equal(model.startActions('revenue').includes('request'), false, 'Never send sellers into buyer RFQ creation');
const keys = ['tenant-a', 'tenant-b'].flatMap(id => [true, false].flatMap(live => ['revenue', 'expense'].map(p => JSON.stringify(model.experienceKey(id, live, p)))));
assert.equal(new Set(keys).size, 8, 'Every tenant/environment/perspective needs a separate cache');
assert.deepEqual(model.parseContractSnapshot({ data: { items: [], total_count: 0 } }), { items: [], total: 0 });
const item = { id: 'contract-a', status: 'active', title: 'Configurable service' };
assert.equal(model.parseContractSnapshot({ items: [item], total_count: 124 }).total, 124, 'Total must not be the sample size');
for (const invalid of [null, {}, { data: {} }, { items: [], total_count: '0' }, { items: [item], total_count: 0 }, { items: [{}], total_count: 1 }]) {
  assert.throws(() => model.parseContractSnapshot(invalid), 'Malformed data must not display an empty workspace');
}
assert.equal(model.contractDestination({ id: 'a', status: 'draft' }), '/contracts');
assert.equal(model.contractDestination(item), '/contracts/contract-a');
assert.equal(model.readableStatus('pending_acceptance'), 'Pending acceptance');
assert.equal(model.textOnBrand('#ffffff'), '#000000');
assert.equal(model.textOnBrand('#000000'), '#ffffff');
console.log('PASS: perspective filters; 8 isolated contexts; empty/active/malformed responses; server totals; draft routing; labels; button contrast.');
