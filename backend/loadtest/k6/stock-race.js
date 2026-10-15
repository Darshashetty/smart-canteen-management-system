// Scenario: many distinct customers race for an item that has exactly 1 unit.
// No pickup_slot is supplied so the slot capacity cannot mask a stock oversell.
// Expectation: exactly one order succeeds; the rest receive 409.
import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';
import { authParams, orderBody, classify } from './common.js';

const manifest = JSON.parse(open('../data/manifest.json'));

const created = new Counter('lt_created');
const conflicts = new Counter('lt_conflict');
const other = new Counter('lt_other');

export const options = {
  scenarios: {
    burst: {
      executor: 'per-vu-iterations',
      vus: manifest.concurrency,
      iterations: 1,
      maxDuration: '60s',
    },
  },
};

export default function () {
  const token = manifest.tokens[(__VU - 1) % manifest.tokens.length];
  const body = orderBody(manifest.itemId, `lt-stock-${__VU}-${__ITER}`);
  const res = http.post(`${manifest.baseUrl}/api/orders`, body, authParams(token));
  const kind = classify(res);
  if (kind === 'created') created.add(1);
  else if (kind === 'conflict') conflicts.add(1);
  else other.add(1);
  check(res, { 'status is 201 or 409': (r) => r.status === 201 || r.status === 409 });
}
