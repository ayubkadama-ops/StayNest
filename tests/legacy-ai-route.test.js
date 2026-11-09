import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveLegacyAiRoute } from '../server/legacy-ai-route.js';

test('legacy AI aliases redirect only safe read requests to discovery', () => {
  for (const pathname of ['/ai', '/ai/', '/makazi-go-ai', '/MAKAZI-GO-AI/']) {
    assert.deepEqual(resolveLegacyAiRoute('GET', pathname), {
      status: 302,
      location: '/?feature=makazi-go-ai#explore',
    });
  }
});

test('legacy AI aliases reject writes and nested paths instead of falling through', () => {
  assert.equal(resolveLegacyAiRoute('POST', '/ai').status, 405);
  assert.equal(resolveLegacyAiRoute('DELETE', '/makazi-go-ai/').status, 405);
  assert.equal(resolveLegacyAiRoute('GET', '/ai/recommendations/1').status, 404);
  assert.equal(resolveLegacyAiRoute('GET', '/api/ai'), null);
});
