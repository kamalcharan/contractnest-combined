// Behavioral parity harness for the extracted wizard logic.
//
//   Verify:  npx vite-node src/components/contracts/ContractWizard/logic/__parity__/run.ts
//   Rebase:  npx vite-node src/components/contracts/ContractWizard/logic/__parity__/run.ts -- --update
//
// Compares mapper / serialization / gating outputs against goldens.json.
// Exits 0 on full parity, 1 on any drift. If a change is INTENTIONAL
// (e.g. the Group Session cadence work extends the mapper), review the diff,
// re-run with --update, and commit the new goldens alongside the change.
// Sibling contract: contractnest-api/src/__tests__/contractEventsDerivationParity.ts
// must also pass whenever computed_events output changes.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { FIXTURES } from './fixtures';
import { mapWizardToRequest } from '../mapper';
import { serializeWizardState, deserializeWizardState, sanitizeStateForTemplate } from '../state';
import { canGoNextForStep, shouldSkipAssetStepFor } from '../gating';
import type { StepId } from '../stepConfig';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN_PATH = path.join(HERE, 'goldens.json');
const UPDATE = process.argv.includes('--update');

const ALL_STEPS: StepId[] = ['path', 'nomenclature', 'counterparty', 'acceptance', 'details', 'billingCycle', 'blocks', 'billingView', 'assetSelection', 'evidencePolicy', 'events', 'review'];

// Deep-stable stringify (sorted keys) so diffs are meaningful
function stable(value: any): any {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(Object.keys(value).sort().map((k) => [k, stable(value[k])]));
  }
  if (value instanceof Date) return value.toISOString();
  return value;
}

function computeActuals() {
  const out: Record<string, any> = {};
  for (const [name, fx] of Object.entries(FIXTURES)) {
    const isRfqMode = fx.wizardMode === 'rfq';
    out[name] = {
      mapRequest: stable(mapWizardToRequest(fx, 'client')),
      serialized: stable(serializeWizardState(fx)),
      // round-trip: serialize → deserialize → serialize must be a fixpoint
      roundTrip: stable(serializeWizardState(deserializeWizardState(serializeWizardState(fx)))),
      sanitizedForTemplate: stable(serializeWizardState(sanitizeStateForTemplate(fx))),
      gating: Object.fromEntries(
        ALL_STEPS.map((s) => [s, canGoNextForStep(s, fx, { showTemplateSelection: false, isRfqMode })])
      ),
      gatingTemplateSelection: canGoNextForStep('path', fx, { showTemplateSelection: true, isRfqMode }),
      skipAssetStep: {
        contract: shouldSkipAssetStepFor(fx, { isRfqMode, isTemplateMode: false }),
        template: shouldSkipAssetStepFor(fx, { isRfqMode, isTemplateMode: true }),
      },
    };
  }
  return out;
}

const actuals = computeActuals();

if (UPDATE || !fs.existsSync(GOLDEN_PATH)) {
  fs.writeFileSync(GOLDEN_PATH, JSON.stringify(actuals, null, 2) + '\n');
  console.log(`[parity] goldens ${UPDATE ? 'updated' : 'created'} at ${GOLDEN_PATH}`);
  process.exit(0);
}

const goldens = JSON.parse(fs.readFileSync(GOLDEN_PATH, 'utf8'));
let failures = 0;

for (const [name, actual] of Object.entries(actuals)) {
  const expected = goldens[name];
  const a = JSON.stringify(actual, null, 2);
  const e = JSON.stringify(expected ?? null, null, 2);
  if (a === e) {
    console.log(`PASS  ${name}`);
  } else {
    failures++;
    console.log(`FAIL  ${name} — output drifted from golden`);
    const aLines = a.split('\n');
    const eLines = e.split('\n');
    for (let i = 0; i < Math.max(aLines.length, eLines.length); i++) {
      if (aLines[i] !== eLines[i]) {
        console.log(`  first diff at line ${i + 1}:`);
        console.log(`    golden: ${eLines[i] ?? '<missing>'}`);
        console.log(`    actual: ${aLines[i] ?? '<missing>'}`);
        break;
      }
    }
  }
}

// Round-trip fixpoint is a hard invariant regardless of goldens
for (const [name, actual] of Object.entries(actuals) as [string, any][]) {
  if (JSON.stringify(actual.serialized) !== JSON.stringify(actual.roundTrip)) {
    failures++;
    console.log(`FAIL  ${name} — serialize→deserialize→serialize is not a fixpoint`);
  }
}

if (failures) {
  console.log(`\n${failures} parity failure(s). If the change is intentional, re-run with --update and commit goldens.json.`);
  process.exit(1);
}
console.log('\nAll parity checks passed.');
