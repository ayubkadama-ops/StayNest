import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import { test } from 'node:test';
import { createAgentEcosystemRouter } from '../server/agent-ecosystem-router.js';

function createTestApp(pool) {
  const app = express();
  app.use(express.json());
  app.use('/api', createAgentEcosystemRouter({
    pool,
    requireAuth: (req, _res, next) => {
      req.session = { user: { id: 8, roles: ['agent'] } };
      next();
    },
    requireAgentAccess: () => (_req, _res, next) => next(),
    requireAdminAccess: () => (_req, _res, next) => next(),
    requireRole: () => (_req, _res, next) => next(),
    agentOwnerId: req => req.session.user.id,
    audit: async () => {}
  }));
  app.use((error, _req, res, _next) => {
    res.status(error.status || 500).json({ error: error.message });
  });
  return app;
}

async function getJson(t, app, path) {
  const server = app.listen(0, '127.0.0.1');
  t.after(() => new Promise(resolve => server.close(resolve)));
  await once(server, 'listening');
  const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`);
  return { status: response.status, body: await response.json() };
}

test('professional workspace can load its authenticated profile', async t => {
  const pool = {
    execute: async (sql, parameters) => {
      assert.match(sql, /FROM users u/);
      assert.match(sql, /LEFT JOIN agent_profiles ap ON ap\.user_id=u\.id/);
      assert.deepEqual(parameters, [8]);
      return [[{
        specializations: '["residential_sales","land"]',
        serviceAreas: '["Dar es Salaam"]',
        identityVerified: 1,
        businessStatus: null,
        businessType: null,
        businessName: null
      }]];
    }
  };
  const result = await getJson(t, createTestApp(pool), '/api/agent/professional-profile');

  assert.equal(result.status, 200);
  assert.deepEqual(result.body.profile, {
    specializations: ['residential_sales', 'land'],
    serviceAreas: ['Dar es Salaam'],
    identityVerified: true,
    businessStatus: null,
    businessType: null,
    businessName: null
  });
});

test('professional analytics remain available while agent-review migration is pending', async t => {
  const pool = {
    execute: async sql => {
      if (sql.includes('FROM listings l')) {
        return [[{ totalListings: 2, publishedListings: 1, listingViews: 14, listingLikes: 3 }]];
      }
      if (sql.includes('FROM bookings')) {
        return [[{ eligibleRequests: 2, respondedRequests: 1, pendingRequests: 1 }]];
      }
      if (sql.includes('FROM agent_reviews')) {
        const error = new Error("Table 'staynest.agent_reviews' doesn't exist");
        error.code = 'ER_NO_SUCH_TABLE';
        throw error;
      }
      if (sql.includes('FROM reviews r')) {
        return [[{ reviewCount: 3, averageRating: '4.3' }]];
      }
      throw new Error(`Unexpected analytics query: ${sql}`);
    }
  };
  const result = await getJson(t, createTestApp(pool), '/api/agent/analytics');

  assert.equal(result.status, 200);
  assert.deepEqual(result.body.analytics, {
    totalListings: 2,
    publishedListings: 1,
    listingViews: 14,
    listingLikes: 3,
    pendingRequests: 1,
    listingReviewCount: 3,
    listingAverageRating: 4.3,
    agentReviewAnalyticsAvailable: false,
    agentReviewCount: null,
    agentAverageRating: null,
    responseRate: 50,
    eligibleRequests: 2
  });
});

test('professional workspace receives only admin-enabled plan concepts and no checkout', async t => {
  const pool = {
    execute: async (sql, parameters) => {
      if (sql.includes('FROM user_roles')) return [[{ name: 'agent' }]];
      assert.match(sql, /FROM monetization_plans/);
      assert.deepEqual(parameters, ['agents']);
      return [[{
        planKey: 'professional-agent',
        name: 'Professional Agent',
        audience: 'agents',
        description: 'Expanded listing analytics',
        priceAmount: '12000.00',
        currency: 'TZS',
        billingInterval: 'monthly',
        features: '{"analytics":true}'
      }]];
    }
  };
  const result = await getJson(t, createTestApp(pool), '/api/agent/monetization-plans');

  assert.equal(result.status, 200);
  assert.equal(result.body.checkoutAvailable, false);
  assert.deepEqual(result.body.plans[0].features, { analytics: true });
  assert.equal(result.body.plans[0].priceAmount, '12000.00');
});
