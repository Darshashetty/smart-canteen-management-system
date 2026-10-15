// Scenario: the same customer fires the same idempotency key concurrently.
// Expectation: all responses are 201/200 and exactly one order exists in the DB.
import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';
import { authParams, orderBody, classify } from './common.js';

const manifest = JSON.parse(open('../data/manifest.json'));

const created = new Counter('lt_created');
const replayed = new Counter('lt_replayed');
const other = new Counter('lt_other');

export const options = {
  scenarios: {
    burst: {
      executor: 'per-vu-iterations',
      vus: manifest.repeats,
      iterations: 1,
      maxDuration: '60s',
    },
  },
};

export default function () {
  const body = orderBody(manifest.itemId, manifest.idempotencyKey);
  const res = http.post(`${manifest.baseUrl}/api/orders`, body, authParams(manifest.token));
  const kind = classify(res);
  if (kind === 'created') created.add(1);
  else if (kind === 'ok') replayed.add(1);
  else other.add(1);
  check(res, { 'status is 201 or 200': (r) => r.status === 201 || r.status === 200 });
}
