'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { test } = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const moduleMatch = html.match(/<script type="module">([\s\S]*?)<\/script>/);
assert(moduleMatch, 'The application module must be present');
const moduleSource = moduleMatch[1];
const start = moduleSource.indexOf('class Rail');
const end = moduleSource.indexOf('/* MECHANISM END */');
assert(start >= 0 && end > start, 'The mechanism source boundaries must exist');

const context = vm.createContext({ Math, Number, Boolean, parseInt });
new vm.Script(moduleSource.slice(start, end) + '\nthis.mechanism = {' +
  'MarbleComputer, feedRails, carryRails, drainRails, gatePositions};').runInContext(context);
const { MarbleComputer, feedRails, carryRails, drainRails, gatePositions } = context.mechanism;

function equalPoint(actual, expected) {
  for (let axis = 0; axis < 3; axis++) {
    assert(Math.abs(actual[axis] - expected[axis]) < 1e-8,
      `Track discontinuity on axis ${axis}: ${actual[axis]} / ${expected[axis]}`);
  }
}

function contact(bit) {
  const [x, y, z] = gatePositions[bit];
  return [x, y + 0.20, z];
}

function createMachine() {
  const evidence = { flips: 0, releases: 0, collected: 0, finished: 0 };
  let machine;
  machine = new MarbleComputer({
    mode() {},
    release() { evidence.releases++; },
    move() {},
    collect() {
      assert.equal(machine.active.v, 0, 'The final marble must have stopped');
      evidence.collected++;
    },
    flip(bit) {
      assert(machine.active, 'A toggle must have an arriving marble');
      assert.equal(machine.active.target, bit);
      assert.equal(machine.active.s, machine.active.rail.length);
      equalPoint(machine.position, contact(bit));
      evidence.flips++;
    },
    done() {
      assert.equal(machine.active, null, 'Readout must wait for collection');
      assert.equal(machine.mode, 'idle');
      evidence.finished++;
    }
  });
  return { machine, evidence };
}

function queue(a, b) {
  const selected = [];
  for (const [bank, value] of [['A', a], ['B', b]]) {
    for (let bit = 0; bit < 4; bit++) {
      if (value & (1 << bit)) selected.push(bank + bit);
    }
  }
  return selected;
}

function run(machine, selected, clearOnly = false) {
  machine.begin(selected, clearOnly);
  let steps = 0;
  while (machine.busy && steps < 30000) {
    machine.step(1 / 120);
    steps++;
  }
  assert(!machine.busy, 'The mechanism must settle within the step budget');
  return machine.read();
}

test('the complete application module parses', () => {
  execFileSync(process.execPath, ['--input-type=module', '--check'], {
    input: moduleSource,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
});

test('all paths are finite and downhill, with continuous contact joins', () => {
  for (const rail of [...Object.values(feedRails), ...carryRails, ...drainRails]) {
    assert(Number.isFinite(rail.length) && rail.length > 0);
    for (let i = 0; i < rail.points.length; i++) {
      assert(rail.points[i].every(Number.isFinite));
      if (i) assert(rail.points[i][1] <= rail.points[i - 1][1] + 1e-10,
        'A gravity-fed path must not travel uphill');
    }
  }
  for (const [key, rail] of Object.entries(feedRails)) {
    equalPoint(rail.points.at(-1), contact(Number(key.slice(1))));
  }
  for (let bit = 0; bit < 5; bit++) {
    equalPoint(carryRails[bit].points[0], contact(bit));
    equalPoint(drainRails[bit].points[0], contact(bit));
    if (bit < 4) equalPoint(carryRails[bit].points.at(-1), contact(bit + 1));
  }
});

test('all 256 input pairs add and reset through marble contact', () => {
  const { machine, evidence } = createMachine();
  for (let a = 0; a < 16; a++) {
    for (let b = 0; b < 16; b++) {
      const selected = queue(a, b);
      const value = run(machine, selected);
      // Independent test oracle only. The application never performs this addition.
      assert.equal(value.decimal, a + b, `Incorrect result for ${a} and ${b}`);
      assert.equal(value.binary.length, 5);
      assert.equal(machine.dropped, selected.length);
      const cleared = run(machine, [], true);
      assert.equal(cleared.binary, '00000');
      assert.equal(cleared.decimal, 0);
    }
  }
  assert(evidence.flips > 0);
  assert.equal(evidence.releases, evidence.collected);
  assert.equal(evidence.finished, 512);
});

test('the demo sequence clears between runs and retains its final result', () => {
  const { machine, evidence } = createMachine();
  for (const [a, b, expected] of [[5, 6, '01011'], [9, 7, '10000'], [15, 15, '11110']]) {
    assert.equal(run(machine, queue(a, b)).binary, expected);
  }
  assert.equal(machine.read().decimal, 30);
  assert.equal(machine.busy, false);
  assert.equal(evidence.releases, evidence.collected);
  assert.equal(evidence.finished, 3);
});
