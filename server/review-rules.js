export function isReviewAuthorEligible({ authorUserId, ownerUserId, agentUserId }) {
  const author = Number(authorUserId);
  return author !== Number(ownerUserId) && (agentUserId == null || author !== Number(agentUserId));
}

export function canReplyToAgentReview({ requesterUserId, agentUserId }) {
  const requester = Number(requesterUserId);
  const agent = Number(agentUserId);
  return Number.isInteger(requester) && requester > 0 && requester === agent;
}

export function validateReviewSubmission(rating, comment, { requiredComment = true } = {}) {
  const numericRating = Number(rating);
  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
    return { error: 'Rating must be from 1 to 5' };
  }
  if (typeof comment !== 'string') return { error: 'Write a review before submitting' };
  const normalizedComment = comment.trim();
  if (requiredComment && normalizedComment.length < 10) {
    return { error: 'Write at least 10 characters so your review is useful' };
  }
  if (normalizedComment.length > 5000) return { error: 'Reviews must be 5000 characters or fewer' };
  return { rating: numericRating, comment: normalizedComment || null };
}

export function validateReviewReply(value) {
  if (typeof value !== 'string') return { error: 'Enter a response to this review' };
  const reply = value.trim();
  if (!reply) return { error: 'Enter a response to this review' };
  if (reply.length > 2000) return { error: 'Review responses must be 2000 characters or fewer' };
  return { reply };
}
