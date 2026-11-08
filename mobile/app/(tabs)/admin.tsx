import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { Text, View } from '@/components/Themed';
import { useAuth } from '@/components/AuthProvider';
import {
  getAdminOverview,
  getAdminListings,
  moderateListing,
  type AdminOverview,
  type AdminOverviewStats,
  type AdminListing,
  type AdminListingDecision,
  type AdminListingStatus,
} from '@/constants/marketplaceApi';

const overviewMetrics: { key: keyof AdminOverviewStats; label: string }[] = [
  { key: 'totalUsers', label: 'Total accounts' },
  { key: 'activeUsers', label: 'Active accounts' },
  { key: 'suspendedUsers', label: 'Suspended accounts' },
  { key: 'activeAgents', label: 'Active agents' },
  { key: 'activeTenants', label: 'Active tenants' },
  { key: 'activeSubagents', label: 'Active sub-agents' },
  { key: 'activeListings', label: 'Published listings' },
  { key: 'listingsNeedingReview', label: 'Listings needing review' },
  { key: 'pendingVerifications', label: 'Pending verifications' },
  { key: 'pendingBookings', label: 'Pending bookings' },
  { key: 'unreadNotifications', label: 'Unread notifications' },
  { key: 'todaysBookings', label: "Today's bookings" },
  { key: 'todaysAuditEvents', label: "Today's audit events" },
];

const listingStatuses: { label: string; value: AdminListingStatus }[] = [
  { label: 'Review queue', value: 'pending_review' },
  { label: 'Draft', value: 'draft' },
  { label: 'Published', value: 'published' },
  { label: 'Unpublished', value: 'unpublished' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Archived', value: 'archived' },
];

export default function AdminScreen() {
  const { user, loading: authLoading } = useAuth();
  const isAdministrator = Boolean(user?.roles.includes('administrator'));
  const [status, setStatus] = useState<AdminListingStatus>('pending_review');
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyListingId, setBusyListingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (authLoading || !isAdministrator) {
      setOverviewLoading(authLoading);
      setOverview(null);
      return () => {
        active = false;
      };
    }

    setOverviewLoading(true);
    setOverviewError(null);
    void getAdminOverview()
      .then((result) => {
        if (active) setOverview(result);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setOverview(null);
        setOverviewError(
          requestError instanceof Error
            ? requestError.message
            : 'Administrator overview could not be loaded.',
        );
      })
      .finally(() => {
        if (active) setOverviewLoading(false);
      });

    return () => {
      active = false;
    };
  }, [authLoading, isAdministrator, refreshKey]);

  useEffect(() => {
    let active = true;
    if (authLoading || !isAdministrator) {
      setLoading(authLoading);
      setListings([]);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    setError(null);
    void getAdminListings(status)
      .then((result) => {
        if (active) setListings(result);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setListings([]);
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Administrator listings could not be loaded.',
        );
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => {
      active = false;
    };
  }, [authLoading, isAdministrator, refreshKey, status]);

  const refresh = () => {
    setRefreshing(true);
    setRefreshKey((key) => key + 1);
  };

  const requestDecision = (listing: AdminListing, decision: AdminListingDecision) => {
    const labels: Record<AdminListingDecision, string> = {
      published: 'publish',
      rejected: 'reject',
      unpublished: 'unpublish',
    };
    const action = labels[decision];
    Alert.alert(
      `${action[0].toUpperCase()}${action.slice(1)} listing?`,
      `${listing.title} will be ${decision} in the shared marketplace.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action[0].toUpperCase() + action.slice(1),
          style: decision === 'rejected' ? 'destructive' : 'default',
          onPress: () => {
            void applyDecision(listing, decision);
          },
        },
      ],
    );
  };

  const applyDecision = async (listing: AdminListing, decision: AdminListingDecision) => {
    setBusyListingId(listing.id);
    setError(null);
    try {
      await moderateListing(listing.id, decision);
      setRefreshKey((key) => key + 1);
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'The listing decision could not be saved.',
      );
    } finally {
      setBusyListingId(null);
    }
  };

  if (authLoading) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator color="#087f5b" size="large" />
          <Text style={styles.bodyText}>Checking administrator access…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAdministrator) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.centered}>
          <Text style={styles.title}>Administrator access required</Text>
          <Text style={styles.bodyText}>
            Sign in with an administrator account or console credentials to manage shared marketplace records.
          </Text>
          <Link href="/(tabs)/account" asChild>
            <Pressable accessibilityRole="button" style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Open account sign-in</Text>
            </Pressable>
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <FlatList
        data={listings}
        keyExtractor={(listing) => String(listing.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.eyebrow}>ADMIN WORKSPACE</Text>
            <Text accessibilityRole="header" style={styles.title}>Listing moderation</Text>
            <Text style={styles.bodyText}>
              Decisions are saved through the authorized API to the shared marketplace database. Web and Explore results reflect changes after refresh.
            </Text>
            <View style={styles.overviewSection}>
              <Text style={styles.sectionTitle}>Marketplace overview</Text>
              {overviewLoading ? (
                <ActivityIndicator color="#087f5b" style={styles.overviewLoading} />
              ) : overviewError ? (
                <View accessibilityRole="alert" style={styles.errorCard}>
                  <Text style={styles.errorText}>{overviewError}</Text>
                  <Pressable accessibilityRole="button" onPress={refresh} style={styles.retryButton}>
                    <Text style={styles.retryText}>Try again</Text>
                  </Pressable>
                </View>
              ) : overview ? (
                <>
                  <View style={styles.statsGrid}>
                    {overviewMetrics.map((metric) => (
                      <View key={metric.key} style={styles.statCard}>
                        <Text style={styles.statValue}>
                          {overview.unavailableMetrics.includes(metric.key)
                            ? 'Unavailable'
                            : overview.stats[metric.key].toLocaleString()}
                        </Text>
                        <Text style={styles.statLabel}>{metric.label}</Text>
                      </View>
                    ))}
                  </View>
                  {overview.unavailableMetrics.length > 0 ? (
                    <Text style={styles.metricWarning}>
                      Some metrics could not be loaded. Their values are shown as unavailable, not zero.
                    </Text>
                  ) : null}
                </>
              ) : null}
            </View>
            <Link href="/admin-posts" asChild>
              <Pressable accessibilityRole="button" style={styles.postsButton}>
                <Text style={styles.postsButtonText}>Post moderation</Text>
              </Pressable>
            </Link>
            <Link href="/admin-users" asChild>
              <Pressable accessibilityRole="button" style={styles.peopleButton}>
                <Text style={styles.peopleButtonText}>People and access</Text>
              </Pressable>
            </Link>
            <ScrollView
              horizontal
              contentContainerStyle={styles.statusRow}
              showsHorizontalScrollIndicator={false}>
              {listingStatuses.map((item) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: status === item.value }}
                  key={item.value}
                  onPress={() => setStatus(item.value)}
                  style={[styles.statusChip, status === item.value && styles.statusChipSelected]}>
                  <Text style={[styles.statusChipText, status === item.value && styles.statusChipTextSelected]}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            {error ? (
              <View accessibilityRole="alert" style={styles.errorCard}>
                <Text style={styles.errorTitle}>Could not complete the request</Text>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable accessibilityRole="button" onPress={refresh} style={styles.retryButton}>
                  <Text style={styles.retryText}>Try again</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color="#087f5b" size="large" />
              <Text style={styles.bodyText}>Loading listings…</Text>
            </View>
          ) : !error ? (
            <View style={styles.empty}>
              <Text style={styles.cardTitle}>No listings in this section</Text>
              <Text style={styles.bodyText}>Choose another status or refresh the queue.</Text>
            </View>
          ) : undefined
        }
        refreshControl={
          <RefreshControl
            onRefresh={refresh}
            refreshing={refreshing}
            tintColor="#087f5b"
          />
        }
        renderItem={({ item }) => (
          <AdminListingCard
            listing={item}
            busy={busyListingId === item.id}
            onDecision={requestDecision}
          />
        )}
      />
    </SafeAreaView>
  );
}

function AdminListingCard({
  listing,
  busy,
  onDecision,
}: {
  listing: AdminListing;
  busy: boolean;
  onDecision: (listing: AdminListing, decision: AdminListingDecision) => void;
}) {
  const price = listing.nightlyPrice ?? listing.monthlyPrice;
  const period = listing.nightlyPrice !== null ? 'night' : 'month';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.statusLabel}>{listing.status.replace('_', ' ')}</Text>
        <Text style={styles.recordId}>#{listing.id}</Text>
      </View>
      <Text style={styles.cardTitle}>{listing.title}</Text>
      <Text style={styles.bodyText}>{listing.city || 'Location not listed'}</Text>
      <Text style={styles.bodyText}>Submitted by {listing.ownerName}</Text>
      <Text style={styles.price}>
        {price !== null
          ? `${listing.currency || 'TZS'} ${price.toLocaleString()} / ${period}`
          : 'Price not listed'}
      </Text>
      {busy ? (
        <ActivityIndicator color="#087f5b" style={styles.cardLoader} />
      ) : (
        <View style={styles.actionRow}>
          {listing.status !== 'published' && listing.status !== 'archived' ? (
            <DecisionButton
              label="Publish"
              onPress={() => onDecision(listing, 'published')}
            />
          ) : null}
          {listing.status === 'pending_review' || listing.status === 'draft' ? (
            <DecisionButton
              label="Reject"
              destructive
              onPress={() => onDecision(listing, 'rejected')}
            />
          ) : null}
          {listing.status === 'published' ? (
            <DecisionButton
              label="Unpublish"
              destructive
              onPress={() => onDecision(listing, 'unpublished')}
            />
          ) : null}
        </View>
      )}
    </View>
  );
}

function DecisionButton({
  label,
  destructive = false,
  onPress,
}: {
  label: string;
  destructive?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.actionButton, destructive && styles.destructiveButton]}>
      <Text style={[styles.actionButtonText, destructive && styles.destructiveButtonText]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f7f5',
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  eyebrow: {
    color: '#087f5b',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  title: {
    marginTop: 8,
    color: '#173222',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
  },
  bodyText: {
    marginTop: 7,
    color: '#53665b',
    fontSize: 13,
    lineHeight: 19,
  },
  statusRow: {
    gap: 8,
    paddingVertical: 16,
  },
  overviewSection: {
    marginTop: 18,
  },
  sectionTitle: {
    color: '#173222',
    fontSize: 17,
    fontWeight: '800',
  },
  overviewLoading: {
    alignSelf: 'flex-start',
    marginTop: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  statCard: {
    width: '48%',
    minHeight: 66,
    justifyContent: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dce8df',
    backgroundColor: '#ffffff',
  },
  statValue: {
    color: '#087f5b',
    fontSize: 17,
    fontWeight: '800',
  },
  statLabel: {
    marginTop: 3,
    color: '#53665b',
    fontSize: 11,
    lineHeight: 15,
  },
  metricWarning: {
    marginTop: 8,
    color: '#705714',
    fontSize: 12,
    lineHeight: 17,
  },
  postsButton: {
    alignSelf: 'flex-start',
    minHeight: 40,
    justifyContent: 'center',
    marginTop: 14,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dce8df',
    backgroundColor: '#ffffff',
  },
  postsButtonText: {
    color: '#087f5b',
    fontSize: 13,
    fontWeight: '700',
  },
  peopleButton: {
    alignSelf: 'flex-start',
    minHeight: 40,
    justifyContent: 'center',
    marginTop: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dce8df',
    backgroundColor: '#ffffff',
  },
  peopleButtonText: {
    color: '#087f5b',
    fontSize: 13,
    fontWeight: '700',
  },
  statusChip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#dce8df',
    backgroundColor: '#ffffff',
  },
  statusChipSelected: {
    borderColor: '#087f5b',
    backgroundColor: '#e8f3ec',
  },
  statusChipText: {
    color: '#53665b',
    fontSize: 12,
    fontWeight: '600',
  },
  statusChipTextSelected: {
    color: '#087f5b',
  },
  errorCard: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f2c7bf',
    backgroundColor: '#fff8f6',
  },
  errorTitle: {
    color: '#7b261c',
    fontSize: 15,
    fontWeight: '700',
  },
  errorText: {
    marginTop: 5,
    color: '#6f4a45',
    fontSize: 13,
    lineHeight: 19,
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 5,
  },
  retryText: {
    color: '#087f5b',
    fontWeight: '700',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
  },
  empty: {
    alignItems: 'center',
    padding: 26,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 13,
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dce8df',
    backgroundColor: '#ffffff',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusLabel: {
    color: '#087f5b',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  recordId: {
    color: '#52655a',
    fontSize: 12,
  },
  cardTitle: {
    marginTop: 8,
    color: '#173222',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
  },
  price: {
    marginTop: 7,
    color: '#173222',
    fontSize: 13,
    fontWeight: '700',
  },
  cardLoader: {
    marginTop: 15,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  actionButton: {
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#087f5b',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  destructiveButton: {
    borderWidth: 1,
    borderColor: '#eed0cc',
    backgroundColor: '#ffffff',
  },
  destructiveButtonText: {
    color: '#943226',
  },
  primaryButton: {
    minHeight: 46,
    justifyContent: 'center',
    marginTop: 18,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#087f5b',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
