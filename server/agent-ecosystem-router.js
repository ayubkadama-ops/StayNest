import { Router } from 'express';
import { parseAgentProfileList, normalizeAgentServiceAreas, normalizeAgentSpecializations } from './agent-profile.js';
import { boundedPage, positiveId } from './validation.js';
import { resolvePropertyVerificationStatus, validatePropertyVerificationDecision } from './property-verification.js';

export function createAgentEcosystemRouter({
  pool,
  requireAuth,
  requireAgentAccess,
  requireAdminAccess,
  requireRole,
  agentOwnerId,
  audit
}) {
  const router = Router();

  router.get('/agents/:id/professional-profile', async (req, res, next) => {
    try {
      const agentId = positiveId(req.params.id);
      if (!agentId) return res.status(400).json({ error: 'Choose a valid professional profile' });
      const [[profile]] = await pool.execute(
        `SELECT u.id, p.first_name firstName, p.last_name lastName,
          ap.specializations, ap.service_areas serviceAreas,
          CASE WHEN iv.status='approved' AND (iv.expires_at IS NULL OR iv.expires_at>=UTC_DATE())
            THEN TRUE ELSE FALSE END identityVerified,
          CASE WHEN b.status='verified' THEN TRUE ELSE FALSE END agencyVerified,
          CASE WHEN b.status='verified' THEN b.legal_name ELSE NULL END verifiedBusinessName,
          CASE WHEN b.status='verified' THEN b.business_type ELSE NULL END businessType
         FROM users u
         JOIN user_profiles p ON p.user_id=u.id
         JOIN user_roles ur ON ur.user_id=u.id
         JOIN roles r ON r.id=ur.role_id
         LEFT JOIN agent_profiles ap ON ap.user_id=u.id
         LEFT JOIN businesses b ON b.id=ap.business_id
         LEFT JOIN identity_verifications iv ON iv.id=(
           SELECT iv2.id FROM identity_verifications iv2
           WHERE iv2.user_id=u.id
           ORDER BY (iv2.status='approved' AND (iv2.expires_at IS NULL OR iv2.expires_at>=UTC_DATE())) DESC,
                    iv2.created_at DESC LIMIT 1
         )
         WHERE u.id=? AND u.status='active' AND r.name IN ('agent','property_owner','agency','developer')
         ORDER BY r.name='agent' DESC LIMIT 1`,
        [agentId]
      );
      if (!profile) return res.status(404).json({ error: 'Professional profile not found' });
      res.json({
        profile: {
          ...profile,
          identityVerified: Boolean(profile.identityVerified),
          agencyVerified: Boolean(profile.agencyVerified),
          specializations: parseAgentProfileList(profile.specializations),
          serviceAreas: parseAgentProfileList(profile.serviceAreas)
        }
      });
    } catch (error) { next(error); }
  });

  router.patch('/agent/professional-profile', requireAuth, requireAgentAccess('profile.manage'), async (req, res, next) => {
    try {
      const specializations = normalizeAgentSpecializations(req.body.specializations);
      const serviceAreas = normalizeAgentServiceAreas(req.body.serviceAreas);
      if (specializations.error) return res.status(400).json({ error: specializations.error });
      if (serviceAreas.error) return res.status(400).json({ error: serviceAreas.error });
      await pool.execute(
        `INSERT INTO agent_profiles (user_id, specializations, service_areas)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE specializations=VALUES(specializations), service_areas=VALUES(service_areas)`,
        [agentOwnerId(req), JSON.stringify(specializations.value), JSON.stringify(serviceAreas.value)]
      );
      await audit(req, 'agent_professional_profile_updated', 'agent_profile', agentOwnerId(req), {
        specializations: specializations.value,
        serviceAreas: serviceAreas.value
      });
      res.json({ ok: true, profile: { specializations: specializations.value, serviceAreas: serviceAreas.value } });
    } catch (error) { next(error); }
  });

  router.get('/agent/analytics', requireAuth, requireAgentAccess('listings.manage'), async (req, res, next) => {
    try {
      const ownerId = agentOwnerId(req);
      const [[listings]] = await pool.execute(
        `SELECT COUNT(DISTINCT l.id) totalListings,
          COUNT(DISTINCT CASE WHEN l.status='published' THEN l.id END) publishedListings,
          COALESCE(SUM(views.view_count), 0) listingViews,
          COALESCE(SUM(likes.like_count), 0) listingLikes
         FROM listings l
         LEFT JOIN (
           SELECT listing_id, COUNT(*) view_count FROM listing_views GROUP BY listing_id
         ) views ON views.listing_id=l.id
         LEFT JOIN (
           SELECT listing_id, COUNT(*) like_count FROM listing_likes GROUP BY listing_id
         ) likes ON likes.listing_id=l.id
         WHERE l.agent_user_id=? AND l.deleted_at IS NULL`,
        [ownerId]
      );
      const [[requests]] = await pool.execute(
        `SELECT COUNT(*) eligibleRequests,
          SUM(status IN ('confirmed','declined','completed')) respondedRequests,
          SUM(status='pending') pendingRequests
         FROM bookings
         WHERE host_user_id=? AND status<>'cancelled'`,
        [ownerId]
      );
      const [[reviews]] = await pool.execute(
        `SELECT COUNT(*) reviewCount, AVG(r.rating) averageRating
         FROM reviews r JOIN listings l ON l.id=r.listing_id
         WHERE l.agent_user_id=? AND r.status='published'`,
        [ownerId]
      );
      const eligibleRequests = Number(requests.eligibleRequests || 0);
      const respondedRequests = Number(requests.respondedRequests || 0);
      res.json({
        analytics: {
          totalListings: Number(listings.totalListings || 0),
          publishedListings: Number(listings.publishedListings || 0),
          listingViews: Number(listings.listingViews || 0),
          listingLikes: Number(listings.listingLikes || 0),
          pendingRequests: Number(requests.pendingRequests || 0),
          reviewCount: Number(reviews.reviewCount || 0),
          averageRating: reviews.averageRating === null ? null : Number(reviews.averageRating),
          responseRate: eligibleRequests ? Math.round((respondedRequests / eligibleRequests) * 100) : null,
          eligibleRequests
        }
      });
    } catch (error) { next(error); }
  });

  router.get('/agent/business', requireAuth, requireAgentAccess('profile.manage'), async (req, res, next) => {
    try {
      const [[business]] = await pool.execute(
        `SELECT b.id, b.business_type businessType, b.legal_name legalName,
          b.registration_number registrationNumber, b.status, b.created_at createdAt
         FROM businesses b
         JOIN agent_profiles ap ON ap.business_id=b.id
         WHERE ap.user_id=? LIMIT 1`,
        [agentOwnerId(req)]
      );
      res.json({ business: business || null });
    } catch (error) { next(error); }
  });

  router.post('/agent/business', requireAuth, requireAgentAccess('profile.manage'), async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
      const businessType = ['agency', 'developer'].includes(req.body.businessType) ? req.body.businessType : null;
      const legalName = String(req.body.legalName || '').trim().replace(/\s+/g, ' ');
      const registrationNumber = String(req.body.registrationNumber || '').trim();
      if (!businessType) return res.status(400).json({ error: 'Choose an agency or developer organization type' });
      if (!legalName || legalName.length > 190) return res.status(400).json({ error: 'Enter an organization name of 1 to 190 characters' });
      if (registrationNumber.length > 100) return res.status(400).json({ error: 'Registration number must be 100 characters or fewer' });
      await connection.beginTransaction();
      const [[profile]] = await connection.execute(
        `SELECT ap.business_id businessId, b.status
         FROM agent_profiles ap LEFT JOIN businesses b ON b.id=ap.business_id
         WHERE ap.user_id=? FOR UPDATE`,
        [agentOwnerId(req)]
      );
      if (profile?.status === 'verified') {
        await connection.rollback();
        return res.status(409).json({ error: 'A verified organization profile cannot be changed through this form. Contact support to update it.' });
      }
      let businessId = profile?.businessId;
      if (businessId) {
        await connection.execute(
          `UPDATE businesses SET business_type=?, legal_name=?, registration_number=?,
           status='pending' WHERE id=? AND owner_user_id=?`,
          [businessType, legalName, registrationNumber || null, businessId, agentOwnerId(req)]
        );
      } else {
        const [created] = await connection.execute(
          `INSERT INTO businesses (business_type, owner_user_id, legal_name, registration_number, status)
           VALUES (?, ?, ?, ?, 'pending')`,
          [businessType, agentOwnerId(req), legalName, registrationNumber || null]
        );
        businessId = created.insertId;
        await connection.execute(
          `INSERT INTO agent_profiles (user_id, business_id) VALUES (?, ?)
           ON DUPLICATE KEY UPDATE business_id=VALUES(business_id)`,
          [agentOwnerId(req), businessId]
        );
      }
      await connection.commit();
      await audit(req, 'business_verification_submitted', 'business', businessId, { businessType });
      res.status(202).json({ ok: true, business: { id: businessId, businessType, legalName, status: 'pending' } });
    } catch (error) {
      await connection.rollback();
      next(error);
    } finally { connection.release(); }
  });

  router.get('/admin/agent-businesses', requireAuth, requireAdminAccess('verifications'), async (req, res, next) => {
    try {
      const { page, limit, offset } = boundedPage(req.query, { defaultLimit: 25, maxLimit: 100 });
      const [businesses] = await pool.execute(
        `SELECT b.id, b.business_type businessType, b.legal_name legalName,
          b.registration_number registrationNumber, b.status, b.created_at createdAt,
          u.id ownerId, p.first_name firstName, p.last_name lastName, u.email
         FROM businesses b JOIN users u ON u.id=b.owner_user_id
         LEFT JOIN user_profiles p ON p.user_id=u.id
         WHERE b.business_type IN ('agency','developer')
         ORDER BY b.status='pending' DESC, b.created_at DESC
         LIMIT ? OFFSET ?`,
        [limit, offset]
      );
      res.json({ businesses, page, limit });
    } catch (error) { next(error); }
  });

  router.post('/admin/agent-businesses/:id/decision', requireAuth, requireAdminAccess('verifications'), async (req, res, next) => {
    try {
      const businessId = positiveId(req.params.id);
      const status = ['verified', 'rejected'].includes(req.body.status) ? req.body.status : null;
      const reason = String(req.body.reason || '').trim();
      if (!businessId || !status) return res.status(400).json({ error: 'Choose a valid organization and review decision' });
      if (status === 'rejected' && !reason) return res.status(400).json({ error: 'Enter a reason when rejecting an organization' });
      if (reason.length > 500) return res.status(400).json({ error: 'Review reason must be 500 characters or fewer' });
      const [result] = await pool.execute(
        `UPDATE businesses SET status=? WHERE id=? AND business_type IN ('agency','developer')`,
        [status, businessId]
      );
      if (!result.affectedRows) return res.status(404).json({ error: 'Organization application not found' });
      await audit(req, `business_verification_${status}`, 'business', businessId, { reason: reason || null });
      res.json({ ok: true, id: businessId, status });
    } catch (error) { next(error); }
  });

  router.get('/verification/listings', requireAuth, requireRole('verification_officer'), async (req, res, next) => {
    try {
      const { page, limit, offset } = boundedPage(req.query, { defaultLimit: 25, maxLimit: 100 });
      const [listings] = await pool.execute(
        `SELECT l.id, l.title, l.city, l.region, l.status listingStatus,
          v.verification_status verificationStatus, v.identity_status identityStatus,
          v.location_status locationStatus, v.authority_status authorityStatus,
          v.documents_status documentsStatus, v.updated_at updatedAt
         FROM listings l JOIN listing_verifications v ON v.listing_id=l.id
         WHERE v.verification_status IN ('submitted','under_review','rejected')
         ORDER BY v.updated_at ASC, l.id ASC LIMIT ? OFFSET ?`,
        [limit, offset]
      );
      res.json({ listings, page, limit });
    } catch (error) { next(error); }
  });

  router.post('/verification/listings/:id/decision', requireAuth, requireRole('verification_officer'), async (req, res, next) => {
    const decision = validatePropertyVerificationDecision(req.body);
    const listingId = positiveId(req.params.id);
    if (decision.error) return res.status(400).json({ error: decision.error });
    if (!listingId) return res.status(400).json({ error: 'Choose a valid listing' });
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [[listing]] = await connection.execute('SELECT id FROM listings WHERE id=? FOR UPDATE', [listingId]);
      if (!listing) {
        await connection.rollback();
        return res.status(404).json({ error: 'Listing not found' });
      }
      let [[verification]] = await connection.execute(
        'SELECT * FROM listing_verifications WHERE listing_id=? FOR UPDATE',
        [listingId]
      );
      if (!verification) {
        await connection.execute(
          `INSERT INTO listing_verifications (listing_id, verification_status, submitted_at)
           VALUES (?, 'submitted', UTC_TIMESTAMP())`,
          [listingId]
        );
        [[verification]] = await connection.execute(
          'SELECT * FROM listing_verifications WHERE listing_id=? FOR UPDATE',
          [listingId]
        );
      }
      const previousStatus = verification[decision.check];
      const nextChecks = { ...verification, [decision.check]: decision.status };
      const verificationStatus = resolvePropertyVerificationStatus(nextChecks);
      await connection.execute(
        `UPDATE listing_verifications SET ${decision.check}=?, verification_status=?,
         reviewed_by=?, verified_at=IF(?='verified', UTC_TIMESTAMP(), NULL),
         rejection_reason=? WHERE listing_id=?`,
        [decision.status, verificationStatus, req.session.user.id, verificationStatus,
          decision.status === 'rejected' ? decision.reason : null, listingId]
      );
      const actorLabel = `${req.session.user.firstName || ''} ${req.session.user.lastName || ''}`.trim()
        || req.session.user.email || 'Verification officer';
      await connection.execute(
        `INSERT INTO listing_verification_events
         (listing_id, actor_user_id, actor_label, check_name, previous_status, new_status, reason)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [listingId, req.session.user.id, actorLabel, decision.check, previousStatus, decision.status, decision.reason]
      );
      await connection.commit();
      await audit(req, `property_${decision.check.replace('_status', '')}_${decision.status}`, 'listing', listingId, {
        check: decision.check, verificationStatus
      });
      res.json({ ok: true, check: decision.check, status: decision.status, verificationStatus });
    } catch (error) {
      await connection.rollback();
      next(error);
    } finally { connection.release(); }
  });

  return router;
}
