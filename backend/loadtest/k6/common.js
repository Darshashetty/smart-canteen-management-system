// Shared helpers for the k6 load-test scripts (k6 JS runtime — no Node APIs).

export function authParams(token) {
  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };
}

export function orderBody(itemId, idempotencyKey, slot) {
  const payload = {
    items: [{ item_id: itemId, quantity: 1 }],
    idempotency_key: idempotencyKey,
  };
  if (slot) payload.pickup_slot = slot;
  return JSON.stringify(payload);
}

export function classify(res) {
  if (res.status === 201) return 'created';
  if (res.status === 200) return 'ok';
  if (res.status === 409) return 'conflict';
  return `other_${res.status}`;
}
