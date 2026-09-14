import { BetaAnalyticsDataClient } from '@google-analytics/data';

const CACHE_TTL_MS = 20 * 60 * 1000;
let cachedAnalytics = null;

const numericValue = value => Number.parseInt(String(value || '0'), 10) || 0;
const rowValue = (row, index) => row?.dimensionValues?.[index]?.value || '(not set)';
const metricValue = (row, index = 0) => numericValue(row?.metricValues?.[index]?.value);

async function runReport(client, propertyId, request) {
  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    ...request
  });
  return response;
}

export async function getGa4Analytics() {
  const now = Date.now();
  if (cachedAnalytics && cachedAnalytics.expiresAt > now) return cachedAnalytics.value;

  const propertyId = String(process.env.GA4_PROPERTY_ID || '').trim();
  const credentialsPath = String(process.env.GOOGLE_APPLICATION_CREDENTIALS || '').trim();
  if (!propertyId || !credentialsPath) {
    const value = { available: false, error: 'Analytics data unavailable. Configure GA4_PROPERTY_ID and GOOGLE_APPLICATION_CREDENTIALS.' };
    cachedAnalytics = { value, expiresAt: now + 5 * 60 * 1000 };
    return value;
  }

  try {
    const client = new BetaAnalyticsDataClient();
    const [users, pageTotals, pages, sources] = await Promise.all([
      runReport(client, propertyId, {
        dateRanges: [{ startDate: '7daysAgo', endDate: 'yesterday' }, { startDate: '30daysAgo', endDate: 'yesterday' }],
        metrics: [{ name: 'activeUsers' }]
      }),
      runReport(client, propertyId, {
        dateRanges: [{ startDate: '7daysAgo', endDate: 'yesterday' }],
        metrics: [{ name: 'screenPageViews' }]
      }),
      runReport(client, propertyId, {
        dateRanges: [{ startDate: '7daysAgo', endDate: 'yesterday' }],
        dimensions: [{ name: 'pagePathPlusQueryString' }],
        metrics: [{ name: 'screenPageViews' }],
        limit: 5,
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }]
      }),
      runReport(client, propertyId, {
        dateRanges: [{ startDate: '7daysAgo', endDate: 'yesterday' }],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'sessions' }],
        limit: 10,
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }]
      })
    ]);

    const value = {
      available: true,
      propertyId,
      generatedAt: new Date().toISOString(),
      activeUsers7: metricValue(users.rows?.[0], 0),
      activeUsers30: metricValue(users.rows?.[0], 1),
      pageViews7: metricValue(pageTotals.rows?.[0]),
      topPages: (pages.rows || []).map(row => ({ page: rowValue(row, 0), views: metricValue(row) })),
      trafficSources: (sources.rows || []).map(row => ({ source: rowValue(row, 0), sessions: metricValue(row) }))
    };
    cachedAnalytics = { value, expiresAt: now + CACHE_TTL_MS };
    return value;
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', event: 'ga4_report_failed', error: error.message }));
    const permissionDenied = /PERMISSION_DENIED|sufficient permissions/i.test(error.message);
    const value = {
      available: false,
      propertyId,
      error: permissionDenied
        ? `Analytics data unavailable: grant Viewer access to ${process.env.GOOGLE_APPLICATION_CREDENTIALS ? 'the configured service account' : 'the GA4 service account'} in GA4 property ${propertyId}.`
        : 'Analytics data unavailable. Check the GA4 service account, property access, and API quota.'
    };
    cachedAnalytics = { value, expiresAt: now + 5 * 60 * 1000 };
    return value;
  }
}
