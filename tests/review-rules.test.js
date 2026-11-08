import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isReviewAuthorEligible,
  canReplyToAgentReview,
  validateReviewReply,
  validateReviewSubmission
} from '../server/review-rules.js';

test('listing owners and assigned agents cannot author listing reviews', () => {
  assert.equal(isReviewAuthorEligible({ authorUserId: 7, ownerUserId: 7, agentUserId: 9 }), false);
  assert.equal(isReviewAuthorEligible({ authorUserId: 9, ownerUserId: 7, agentUserId: 9 }), false);
  assert.equal(isReviewAuthorEligible({ authorUserId: 11, ownerUserId: 7, agentUserId: 9 }), true);
  assert.equal(isReviewAuthorEligible({ authorUserId: 11, ownerUserId: 7, agentUserId: null }), true);
});

test('only the reviewed agent can publish an agent-review response', () => {
  assert.equal(canReplyToAgentReview({ requesterUserId: 7, agentUserId: 7 }), true);
  assert.equal(canReplyToAgentReview({ requesterUserId: 8, agentUserId: 7 }), false);
  assert.equal(canReplyToAgentReview({ requesterUserId: null, agentUserId: 7 }), false);
});

test('review responses must contain non-whitespace text within the published limit', () => {
  assert.deepEqual(validateReviewReply('  Thank you for your feedback.  '), { reply: 'Thank you for your feedback.' });
  assert.match(validateReviewReply('  ').error, /enter a response/i);
  assert.match(validateReviewReply('x'.repeat(2001)).error, /2000 characters/i);
  assert.match(validateReviewReply(null).error, /enter a response/i);
});

test('submitted reviews require a useful comment and a valid star rating', () => {
  assert.deepEqual(
    validateReviewSubmission('4', '  A thoughtful and reliable host.  '),
    { rating: 4, comment: 'A thoughtful and reliable host.' }
  );
  assert.match(validateReviewSubmission(6, 'A detailed review').error, /1 to 5/);
  assert.match(validateReviewSubmission(5, 'Too short').error, /10 characters/i);
  assert.match(validateReviewSubmission(5, 'x'.repeat(5001)).error, /5000 characters/i);
});
