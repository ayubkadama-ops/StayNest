import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useAuth } from '@/components/AuthProvider';
import { Text, View } from '@/components/Themed';
import {
  decideAgentBooking,
  getAgentBookings,
  getAgentListings,
  getAgentSummary,
  type AgentBooking,
  type AgentBookingDecision,
  type AgentListing,
  type AgentSummary,
} from '@/constants/marketplaceApi';

export default function AgentWorkspaceScreen() {
  const { user, loading: sessionLoading, error: sessionError } = useAuth();
  const [summary, setSummary] = useState<AgentSummary | null>(null);
  const [listings, setListings] = useState<AgentListing[]>([]);
  const [bookings, setBookings] = useState<AgentBooking[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [listingsError, setListingsError] = useState<string | null>(null);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [busyBookingId, setBusyBookingId] = useState<number | null>(null);

  const isAgent = user?.roles.includes('agent') === true;
  const canManageListings = isAgent && (!user.isSubAgent || user.permissions.includes('listings.manage'));
  const canViewBookings = isAgent && (!user.isSubAgent || user.permissions.includes('bookings.view'));
  const canManageBookings = isAgent && (!user.isSubAgent || user.permissions.includes('bookings.manage'));

  useEffect(() => {
    if (sessionLoading) return;
    if (!isAgent) {
      setSummaryLoading(false);
      setListingsLoading(false);
      setBookingsLoading(false);
      setRefreshing(false);
      return;
    }

    let active = true;
    setSummaryLoading(true);
    setListingsLoading(canManageListings);
    setBookingsLoading(canViewBookings);
    setSummaryError(null);
    setListingsError(null);
    setBookingsError(null);

    const requests: Promise<void>[] = [
      getAgentSummary()
        .then((result) => {
          if (active) setSummary(result);
        })
        .catch((requestError: unknown) => {
          if (active) setSummaryError(errorMessage(requestError, 'Agent summary could not be loaded.'));
        })
        .finally(() => {
          if (active) setSummaryLoading(false);
        }),
    ];

    if (canManageListings) {
      requests.push(
        getAgentListings()
          .then((result) => {
            if (active) setListings(result);
          })
          .catch((requestError: unknown) => {
            if (active) setListingsError(errorMessage(requestError, 'Properties could not be loaded.'));
          })
          .finally(() => {
            if (active) setListingsLoading(false);
          }),
      );
    } else {
      setListings([]);
      setListingsError('Your account does not have permission to manage agent listings.');
    }

    if (canViewBookings) {
      requests.push(
        getAgentBookings()
          .then((result) => {
            if (active) setBookings(result);
          })
          .catch((requestError: unknown) => {
            if (active) setBookingsError(errorMessage(requestError, 'Booking requests could not be loaded.'));
          })
          .finally(() => {
            if (active) setBookingsLoading(false);
          }),
      );
    } else {
      setBookings([]);
      setBookingsError('Your account does not have permission to view booking requests.');
    }

    void Promise.all(requests).finally(() => {
      if (active) setRefreshing(false);
    });

    return () => {
      active = false;
    };
  }, [canManageListings, canViewBookings, isAgent, refreshKey, sessionLoading]);

  const refreshWorkspace = () => {
    if (!isAgent) return;
    setRefreshing(true);
    setRefreshKey((key) => key + 1);
  };

  const submitDecision = async (booking: AgentBooking, status: AgentBookingDecision) => {
    setBusyBookingId(booking.id);
    setActionError(null);
    try {
      await decideAgentBooking(booking.id, status);
      setRefreshKey((key) => key + 1);
    } catch (requestError: unknown) {
      setActionError(errorMessage(requestError, 'The booking decision could not be saved.'));
    } finally {
      setBusyBookingId(null);
    }
  };

  const confirmDecision = (booking: AgentBooking, status: AgentBookingDecision) => {
    const action = status === 'confirmed' ? 'approve' : 'decline';
    Alert.alert(
      `${action === 'approve' ? 'Approve' : 'Decline'} this request?`,
      `${booking.title}${booking.bookingCode ? ` · ${booking.bookingCode}` : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'approve' ? 'Approve' : 'Decline',
          style: action === 'decline' ? 'destructive' : 'default',
          onPress: () => {
            void submitDecision(booking, status);
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            onRefresh={refreshWorkspace}
            refreshing={refreshing}
            tintColor="#087f5b"
          />
        }>
        <Link href="/" asChild>
          <Pressable accessibilityRole="button" style={styles.backLink}>
            <Text style={styles.backLinkText}>‹ Explore</Text>
          </Pressable>
        </Link>
        <View style={styles.pageHeading}>
          <Text style={styles.eyebrow}>Agent workspace</Text>
          <Text accessibilityRole="header" style={styles.title}>
            {user ? `Good to see you, ${user.firstName || 'there'}.` : 'Your workspace'}
          </Text>
          <Text style={styles.subtitle}>
            Manage your properties and respond to customer requests.
          </Text>
        </View>

        {sessionLoading ? (
          <LoadingState message="Checking your session…" />
        ) : !user ? (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>Sign in to continue</Text>
            <Text style={styles.bodyText}>
              {sessionError || 'Agent workspace access requires an approved agent account.'}
            </Text>
            <Link href="/(tabs)/account" asChild>
              <Pressable accessibilityRole="button" style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Open account</Text>
              </Pressable>
            </Link>
          </View>
        ) : !isAgent ? (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>Agent access required</Text>
            <Text style={styles.bodyText}>
              This workspace is available to agent accounts. Your current role is {user.roles.join(', ') || 'account'}.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.stats}>
              <StatCard
                label="Your listings"
                value={summary?.assignedListings}
                loading={summaryLoading}
                error={summaryError}
              />
              <StatCard
                label="Requests to review"
                value={summary?.pendingBookings}
                loading={summaryLoading}
                error={summaryError}
              />
              <StatCard
                label="Verifications pending"
                value={summary?.verificationStatus}
                loading={summaryLoading}
                error={summaryError}
              />
            </View>
            {summaryError ? <ErrorCard message={summaryError} onRetry={refreshWorkspace} /> : null}

            <View style={styles.section}>
              <View style={styles.sectionHeading}>
                <View>
                  <Text style={styles.eyebrow}>Your inventory</Text>
                  <Text accessibilityRole="header" style={styles.sectionTitle}>Properties</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  disabled={refreshing}
                  onPress={refreshWorkspace}
                  style={styles.refreshButton}>
                  <Text style={styles.refreshText}>Refresh</Text>
                </Pressable>
              </View>
              {!canManageListings ? (
                <Notice message={listingsError || 'Listing access is not available for this account.'} />
              ) : listingsLoading ? (
                <LoadingState message="Loading your properties…" />
              ) : listingsError ? (
                <ErrorCard message={listingsError} onRetry={refreshWorkspace} />
              ) : listings.length ? (
                listings.map((listing) => <AgentListingCard key={listing.id} listing={listing} />)
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.bodyText}>You have no properties yet. Create a listing to get started.</Text>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeading}>
                <View>
                  <Text style={styles.eyebrow}>Customer requests</Text>
                  <Text accessibilityRole="header" style={styles.sectionTitle}>Booking requests</Text>
                </View>
              </View>
              {actionError ? <ErrorCard message={actionError} /> : null}
              {!canViewBookings ? (
                <Notice message={bookingsError || 'Booking access is not available for this account.'} />
              ) : bookingsLoading ? (
                <LoadingState message="Loading booking requests…" />
              ) : bookingsError ? (
                <ErrorCard message={bookingsError} onRetry={refreshWorkspace} />
              ) : bookings.length ? (
                bookings.map((booking) => (
                  <AgentBookingCard
                    key={booking.id}
                    booking={booking}
                    canManage={canManageBookings}
                    busy={busyBookingId === booking.id}
                    onDecision={confirmDecision}
                  />
                ))
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.bodyText}>No booking requests yet.</Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
  loading,
  error,
}: {
  label: string;
  value: number | undefined;
  loading: boolean;
  error: string | null;
}) {
  return (
    <View style={styles.statCard}>
      {loading ? (
        <ActivityIndicator color="#087f5b" size="small" />
      ) : error ? (
        <Text style={styles.statUnavailable}>—</Text>
      ) : (
        <Text style={styles.statValue}>{value ?? 0}</Text>
      )}
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function AgentListingCard({ listing }: { listing: AgentListing }) {
  const price = listing.salePrice ?? listing.nightlyPrice ?? listing.monthlyPrice ?? listing.yearlyPrice;
  const period = listing.salePrice !== null
    ? 'for sale'
    : listing.nightlyPrice !== null
      ? 'night'
      : listing.monthlyPrice !== null
        ? 'month'
        : listing.yearlyPrice !== null
          ? 'year'
          : null;

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemHeading}>
        <Text numberOfLines={2} style={styles.itemTitle}>{listing.title}</Text>
        <StatusBadge status={listing.status} />
      </View>
      <Text style={styles.itemMeta}>
        {[listing.rentalMode?.replace(/_/g, ' '), listing.currency, price !== null && period ? `${price.toLocaleString()} / ${period}` : null]
          .filter(Boolean)
          .join(' · ') || 'Pricing not listed'}
      </Text>
      {listing.updatedAt ? (
        <Text style={styles.itemDate}>Updated {formatDate(listing.updatedAt)}</Text>
      ) : null}
    </View>
  );
}

function AgentBookingCard({
  booking,
  canManage,
  busy,
  onDecision,
}: {
  booking: AgentBooking;
  canManage: boolean;
  busy: boolean;
  onDecision: (booking: AgentBooking, status: AgentBookingDecision) => void;
}) {
  const customerName = [booking.firstName, booking.lastName].filter(Boolean).join(' ') || 'Customer';
  const dates = booking.appointmentAt
    ? `Viewing · ${formatDate(booking.appointmentAt)}`
    : booking.checkIn && booking.checkOut
      ? `${formatDate(booking.checkIn)} to ${formatDate(booking.checkOut)}`
      : 'Dates not provided';

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemHeading}>
        <Text numberOfLines={2} style={styles.itemTitle}>{booking.title}</Text>
        <StatusBadge status={booking.status} />
      </View>
      <Text style={styles.customerName}>{customerName}</Text>
      <Text style={styles.itemMeta}>{[booking.city, dates].filter(Boolean).join(' · ')}</Text>
      <View style={styles.bookingDetails}>
        {booking.bookingCode ? <Text style={styles.itemMeta}>Request {booking.bookingCode}</Text> : null}
        {booking.guests !== null ? <Text style={styles.itemMeta}>{booking.guests} guests</Text> : null}
        {booking.totalAmount !== null ? (
          <Text style={styles.bookingAmount}>
            {booking.currency || 'TZS'} {booking.totalAmount.toLocaleString()}
          </Text>
        ) : null}
      </View>
      {canManage && booking.status === 'pending' ? (
        <View style={styles.decisionRow}>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => onDecision(booking, 'confirmed')}
            style={[styles.approveButton, busy && styles.disabledButton]}>
            <Text style={styles.approveText}>{busy ? 'Saving…' : 'Approve'}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => onDecision(booking, 'declined')}
            style={[styles.declineButton, busy && styles.disabledButton]}>
            <Text style={styles.declineText}>Decline</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <View style={[styles.statusBadge, status === 'pending' && styles.pendingBadge]}>
      <Text style={[styles.statusText, status === 'pending' && styles.pendingText]}>
        {status.replace(/_/g, ' ')}
      </Text>
    </View>
  );
}

function LoadingState({ message }: { message: string }) {
  return (
    <View style={styles.loadingState}>
      <ActivityIndicator color="#087f5b" />
      <Text style={styles.bodyText}>{message}</Text>
    </View>
  );
}

function Notice({ message }: { message: string }) {
  return (
    <View style={styles.noticeCard}>
      <Text style={styles.bodyText}>{message}</Text>
    </View>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View accessibilityRole="alert" style={styles.errorCard}>
      <Text style={styles.errorText}>{message}</Text>
      {onRetry ? (
        <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retryButton}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function formatDate(value: string): string {
  return value.replace('T', ' ').replace('Z', '').slice(0, 16);
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 36,
    backgroundColor: '#ffffff',
  },
  backLink: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  backLinkText: {
    color: '#087f5b',
    fontSize: 14,
    fontWeight: '700',
  },
  pageHeading: {
    paddingTop: 14,
    paddingBottom: 20,
  },
  eyebrow: {
    marginBottom: 7,
    color: '#087f5b',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: '#102b24',
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 7,
    color: '#61736c',
    fontSize: 14,
    lineHeight: 21,
  },
  stats: {
    gap: 12,
    marginBottom: 10,
  },
  statCard: {
    minHeight: 82,
    justifyContent: 'center',
    padding: 18,
    borderWidth: 1,
    borderColor: '#dce6e0',
    borderRadius: 5,
    backgroundColor: '#f3f7f4',
  },
  statValue: {
    color: '#062b22',
    fontSize: 28,
    lineHeight: 33,
    fontWeight: '800',
  },
  statUnavailable: {
    color: '#61736c',
    fontSize: 25,
    fontWeight: '700',
  },
  statLabel: {
    marginTop: 3,
    color: '#61736c',
    fontSize: 13,
  },
  section: {
    marginTop: 26,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#102b24',
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '800',
  },
  refreshButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#b7cec2',
    borderRadius: 4,
  },
  refreshText: {
    color: '#062b22',
    fontSize: 12,
    fontWeight: '700',
  },
  itemCard: {
    marginBottom: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#dce6e0',
    borderRadius: 5,
    backgroundColor: '#ffffff',
  },
  itemHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  itemTitle: {
    flex: 1,
    color: '#102b24',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 4,
    backgroundColor: '#edf2ef',
  },
  pendingBadge: {
    backgroundColor: '#fff2d6',
  },
  statusText: {
    color: '#52655a',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  pendingText: {
    color: '#785500',
  },
  itemMeta: {
    marginTop: 7,
    color: '#61736c',
    fontSize: 12,
    lineHeight: 18,
  },
  itemDate: {
    marginTop: 5,
    color: '#52655a',
    fontSize: 11,
  },
  customerName: {
    marginTop: 8,
    color: '#12392d',
    fontSize: 14,
    fontWeight: '700',
  },
  bookingDetails: {
    gap: 1,
    marginTop: 4,
  },
  bookingAmount: {
    marginTop: 6,
    color: '#062b22',
    fontSize: 14,
    fontWeight: '800',
  },
  decisionRow: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 14,
  },
  approveButton: {
    minHeight: 40,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    backgroundColor: '#087f5b',
  },
  approveText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  declineButton: {
    minHeight: 40,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#b7cec2',
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  declineText: {
    color: '#7b261c',
    fontSize: 13,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.55,
  },
  emptyCard: {
    padding: 18,
    borderWidth: 1,
    borderColor: '#dce6e0',
    borderRadius: 5,
    backgroundColor: '#f3f7f4',
  },
  noticeCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#dce6e0',
    borderRadius: 5,
    backgroundColor: '#f3f7f4',
  },
  noticeTitle: {
    marginBottom: 6,
    color: '#102b24',
    fontSize: 17,
    fontWeight: '700',
  },
  bodyText: {
    color: '#61736c',
    fontSize: 13,
    lineHeight: 20,
  },
  primaryButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 13,
    borderRadius: 4,
    backgroundColor: '#087f5b',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  loadingState: {
    minHeight: 90,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  errorCard: {
    marginBottom: 11,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f2c7bf',
    borderRadius: 5,
    backgroundColor: '#fff8f6',
  },
  errorText: {
    color: '#7b261c',
    fontSize: 13,
    lineHeight: 19,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingTop: 9,
    paddingBottom: 2,
  },
  retryText: {
    color: '#087f5b',
    fontSize: 13,
    fontWeight: '700',
  },
});
