// Scenario: steady-state load with ample stock and no pickup-slot bottleneck.
// Measures response-time percentiles, throughput (RPS) and error rate for the
// order-creation write path (stock decrement + ETA + token + audit log).
import http from 'k6/http';
import { check } from 'k6';
import { authParams, orderBody } from './common.js';

const manifest = JSON.parse(open('../data/manifest.json'));

export const options = {
  scenarios: {
    steady: {
      executor: 'constant-arrival-rate',
      rate: manifest.rate,
      timeUnit: '1s',
      duration: `${manifest.duration}s`,
      preAllocatedVUs: 50,
      maxVUs: 300,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  const token = manifest.tokens[(__VU + __ITER) % manifest.tokens.length];
  const body = orderBody(manifest.itemId, `lt-base-${__VU}-${__ITER}-${Date.now()}`);
  const res = http.post(`${manifest.baseUrl}/api/orders`, body, authParams(token));
  check(res, { 'order created': (r) => r.status === 201 });
}
