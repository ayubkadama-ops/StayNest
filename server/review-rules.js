export function isReviewAuthorEligible({ authorUserId, ownerUserId, agentUserId }) {
  const author = Number(authorUserId);
  return author !== Number(ownerUserId) && (agentUserId == null || author !== Number(agentUserId));
}

export function validateReviewReply(value) {
  if (typeof value !== 'string') return { error: 'Enter a response to this review' };
  const reply = value.trim();
  if (!reply) return { error: 'Enter a response to this review' };
  if (reply.length > 2000) return { error: 'Review responses must be 2000 characters or fewer' };
  return { reply };
}
