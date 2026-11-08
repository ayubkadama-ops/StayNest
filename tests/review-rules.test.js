import test from 'node:test';
import assert from 'node:assert/strict';
import { isReviewAuthorEligible, validateReviewReply } from '../server/review-rules.js';

test('listing owners and assigned agents cannot author listing reviews', () => {
  assert.equal(isReviewAuthorEligible({ authorUserId: 7, ownerUserId: 7, agentUserId: 9 }), false);
  assert.equal(isReviewAuthorEligible({ authorUserId: 9, ownerUserId: 7, agentUserId: 9 }), false);
  assert.equal(isReviewAuthorEligible({ authorUserId: 11, ownerUserId: 7, agentUserId: 9 }), true);
  assert.equal(isReviewAuthorEligible({ authorUserId: 11, ownerUserId: 7, agentUserId: null }), true);
});

test('review responses must contain non-whitespace text within the published limit', () => {
  assert.deepEqual(validateReviewReply('  Thank you for your feedback.  '), { reply: 'Thank you for your feedback.' });
  assert.match(validateReviewReply('  ').error, /enter a response/i);
  assert.match(validateReviewReply('x'.repeat(2001)).error, /2000 characters/i);
  assert.match(validateReviewReply(null).error, /enter a response/i);
});
