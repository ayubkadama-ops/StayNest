import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/components/AuthProvider';
import { Text, View } from '@/components/Themed';
import {
  cancelAccountBooking,
  getAccountBookings,
  getBookingDetails,
  rescheduleAccountBooking,
  type AccountBooking,
  type BookingDetail,
} from '@/constants/marketplaceApi';

function displayStatus(status: string): string {
  return status.replace(/_/g, ' ');
}

function displayDateRange(booking: AccountBooking): string {
  if (booking.bookingKind === 'viewing') {
    return booking.appointmentAt ? `Viewing · ${booking.appointmentAt}` : 'Viewing request';
  }
  if (booking.checkIn && booking.checkOut) return `${booking.checkIn} to ${booking.checkOut}`;
  return 'Stay dates not available';
}

export default function BookingsScreen() {
  const params = useLocalSearchParams<{ bookingId?: string | string[] }>();
  const bookingIdParam = Array.isArray(params.bookingId) ? params.bookingId[0] : params.bookingId;
  const requestedBookingId = bookingIdParam && /^[1-9]\d*$/.test(bookingIdParam) ? Number(bookingIdParam) : null;
  const { user } = useAuth();
  const [bookings, setBookings] = useState<AccountBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [bookingDetail, setBookingDetail] = useState<BookingDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [confirmationId, setConfirmationId] = useState<number | null>(null);
  const [workingId, setWorkingId] = useState<number | null>(null);
  const detailRequestId = useRef(0);
  const autoOpenedBookingId = useRef<number | null>(null);

  const loadBookings = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setBookings(await getAccountBookings());
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Your bookings could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  useEffect(() => {
    if (
      requestedBookingId === null
      || autoOpenedBookingId.current === requestedBookingId
      || selectedBookingId === requestedBookingId
    ) return;
    const booking = bookings.find((item) => item.id === requestedBookingId);
    if (!booking) return;
    autoOpenedBookingId.current = requestedBookingId;
    setSelectedBookingId(booking.id);
    setBookingDetail(null);
    setCheckIn(booking.checkIn || '');
    setCheckOut(booking.checkOut || '');
    const requestId = ++detailRequestId.current;
    setDetailLoading(true);
    void getBookingDetails(booking.id)
      .then((details) => {
        if (requestId === detailRequestId.current) setBookingDetail(details);
      })
      .catch((requestError: unknown) => {
        if (requestId === detailRequestId.current) {
          setError(requestError instanceof Error ? requestError.message : 'Booking details could not be loaded.');
        }
      })
      .finally(() => {
        if (requestId === detailRequestId.current) setDetailLoading(false);
      });
  }, [bookings, requestedBookingId, selectedBookingId]);

  const openDetails = async (booking: AccountBooking) => {
    if (selectedBookingId === booking.id) {
      detailRequestId.current += 1;
      setSelectedBookingId(null);
      setBookingDetail(null);
      setConfirmationId(null);
      return;
    }
    setSelectedBookingId(booking.id);
    setBookingDetail(null);
    setConfirmationId(null);
    setCheckIn(booking.checkIn || '');
    setCheckOut(booking.checkOut || '');
    const requestId = ++detailRequestId.current;
    setDetailLoading(true);
    setError(null);
    try {
      const details = await getBookingDetails(booking.id);
      if (requestId === detailRequestId.current) setBookingDetail(details);
    } catch (requestError: unknown) {
      if (requestId === detailRequestId.current) {
        setError(requestError instanceof Error ? requestError.message : 'Booking details could not be loaded.');
      }
    } finally {
      if (requestId === detailRequestId.current) setDetailLoading(false);
    }
  };

  const cancelBooking = async (bookingId: number) => {
    setWorkingId(bookingId);
    setError(null);
    try {
      await cancelAccountBooking(bookingId);
      setConfirmationId(null);
      setSelectedBookingId(null);
      setBookingDetail(null);
      await loadBookings(true);
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'The booking could not be cancelled.');
    } finally {
      setWorkingId(null);
    }
  };

  const rescheduleBooking = async (bookingId: number) => {
    setWorkingId(bookingId);
    setError(null);
    try {
      await rescheduleAccountBooking(bookingId, checkIn.trim(), checkOut.trim());
      setSelectedBookingId(null);
      setBookingDetail(null);
      await loadBookings(true);
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'The booking dates could not be updated.');
    } finally {
      setWorkingId(null);
    }
  };

  const canChangeBooking = (booking: AccountBooking) =>
    booking.bookingKind === 'stay'
      && booking.paymentStatus === 'unpaid'
      && ['pending', 'confirmed'].includes(booking.status);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Stack.Screen options={{ title: 'Your bookings', headerShown: true }} />
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => void loadBookings(true)} refreshing={refreshing} tintColor="#087f5b" />}
        keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={styles.title}>Your bookings</Text>
        <Text style={styles.intro}>Track stay and viewing requests, review their status, and manage eligible stays.</Text>

        {error ? (
          <View accessibilityRole="alert" style={styles.errorCard}>
            <Text style={styles.error}>{error}</Text>
            {!loading ? (
              <Pressable accessibilityRole="button" onPress={() => void loadBookings()} style={styles.secondaryButton}>
                <Text style={styles.secondaryText}>Try again</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color="#087f5b" size="large" />
            <Text style={styles.intro}>Loading your bookings…</Text>
          </View>
        ) : !user?.roles.includes('tenant') ? (
          <View style={styles.card}>
            <Text style={styles.intro}>Sign in with a tenant account to see your bookings.</Text>
          </View>
        ) : bookings.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>No booking requests yet</Text>
            <Text style={styles.intro}>Stay and viewing requests you make from a property will appear here.</Text>
          </View>
        ) : bookings.map((booking) => {
          const expanded = selectedBookingId === booking.id;
          const detailReady = bookingDetail?.id === booking.id;
          const canManage = canChangeBooking(booking);
          const busy = workingId === booking.id;
          return (
            <View key={booking.id} style={styles.card}>
              <Text style={styles.cardTitle}>{booking.title}</Text>
              <Text style={styles.intro}>{displayDateRange(booking)}</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.meta}>Request {booking.bookingCode}</Text>
                <Text style={styles.status}>{displayStatus(booking.status)}</Text>
              </View>
              {booking.bookingKind === 'stay' ? (
                <Text style={styles.meta}>
                  {booking.currency} {booking.totalAmount.toLocaleString()}
                </Text>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                onPress={() => void openDetails(booking)}
                style={styles.secondaryButton}>
                <Text style={styles.secondaryText}>{expanded ? 'Hide details' : 'View details and actions'}</Text>
              </Pressable>

              {expanded ? (
                <View style={styles.details}>
                  {detailLoading ? (
                    <ActivityIndicator color="#087f5b" />
                  ) : detailReady ? (
                    <>
                      <Text style={styles.meta}>Property: {bookingDetail.title}</Text>
                      {bookingDetail.city ? <Text style={styles.meta}>City: {bookingDetail.city}</Text> : null}
                      {bookingDetail.addressLine1 ? (
                        <Text style={styles.meta}>Address: {bookingDetail.addressLine1}</Text>
                      ) : (
                        <Text style={styles.meta}>The exact address is shared after the booking is confirmed.</Text>
                      )}
                      <Text style={styles.meta}>Guests: {bookingDetail.guests}</Text>
                      <Text style={styles.meta}>Payment: {displayStatus(bookingDetail.paymentStatus)}</Text>
                      {bookingDetail.appointmentAt ? (
                        <Text style={styles.meta}>Requested viewing: {bookingDetail.appointmentAt}</Text>
                      ) : null}
                      <Text style={styles.meta}>
                        Current total: {bookingDetail.currency} {bookingDetail.totalAmount.toLocaleString()}
                      </Text>

                      {booking.paymentStatus !== 'unpaid' ? (
                        <Text style={styles.paymentNotice}>
                          A payment is attached to this booking. Contact support for cancellation, refunds, or date changes.
                        </Text>
                      ) : null}
                      {canManage && booking.bookingKind === 'stay' ? (
                        <View style={styles.reschedulePanel}>
                          <Text style={styles.label}>Change stay dates</Text>
                          <TextInput
                            accessibilityLabel="New check-in date"
                            autoCapitalize="none"
                            onChangeText={setCheckIn}
                            placeholder="Check-in · YYYY-MM-DD"
                            placeholderTextColor="#68796f"
                            style={styles.input}
                            value={checkIn}
                          />
                          <TextInput
                            accessibilityLabel="New check-out date"
                            autoCapitalize="none"
                            onChangeText={setCheckOut}
                            placeholder="Check-out · YYYY-MM-DD"
                            placeholderTextColor="#68796f"
                            style={styles.input}
                            value={checkOut}
                          />
                          <Pressable
                            accessibilityRole="button"
                            disabled={busy}
                            onPress={() => void rescheduleBooking(booking.id)}
                            style={[styles.primaryButton, busy && styles.disabled]}>
                            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Request new dates</Text>}
                          </Pressable>
                        </View>
                      ) : null}

                      {canManage ? (
                        confirmationId === booking.id ? (
                          <View style={styles.confirmPanel}>
                            <Text style={styles.meta}>Cancel this booking request?</Text>
                            <View style={styles.actions}>
                              <Pressable
                                accessibilityRole="button"
                                disabled={busy}
                                onPress={() => setConfirmationId(null)}
                                style={styles.secondaryButton}>
                                <Text style={styles.secondaryText}>Keep booking</Text>
                              </Pressable>
                              <Pressable
                                accessibilityRole="button"
                                disabled={busy}
                                onPress={() => void cancelBooking(booking.id)}
                                style={[styles.dangerButton, busy && styles.disabled]}>
                                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Confirm cancellation</Text>}
                              </Pressable>
                            </View>
                          </View>
                        ) : (
                          <Pressable
                            accessibilityRole="button"
                            disabled={busy}
                            onPress={() => setConfirmationId(booking.id)}
                            style={styles.dangerOutlineButton}>
                            <Text style={styles.dangerText}>Cancel booking</Text>
                          </Pressable>
                        )
                      ) : null}
                    </>
                  ) : (
                    <Text style={styles.meta}>Booking details are not available. Close and try again.</Text>
                  )}
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7f5' },
  content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 36 },
  title: { marginBottom: 8, color: '#173222', fontSize: 28, lineHeight: 34, fontWeight: '800' },
  intro: { marginTop: 5, color: '#53665b', fontSize: 14, lineHeight: 21 },
  card: { marginTop: 16, padding: 18, borderRadius: 16, borderWidth: 1, borderColor: '#dce8df', backgroundColor: '#fff' },
  errorCard: { marginTop: 16, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#f2b8b5', backgroundColor: '#fff7f6' },
  error: { color: '#a12622', fontSize: 14, lineHeight: 20 },
  paymentNotice: { marginTop: 12, color: '#705714', fontSize: 13, lineHeight: 19 },
  cardTitle: { color: '#173222', fontSize: 17, fontWeight: '800' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 10 },
  status: { color: '#087f5b', fontSize: 13, fontWeight: '800', textTransform: 'capitalize' },
  meta: { marginTop: 8, color: '#53665b', fontSize: 13, lineHeight: 19 },
  details: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e7eee9' },
  label: { color: '#173222', fontSize: 14, fontWeight: '700' },
  reschedulePanel: { marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: '#f5f8f5' },
  input: { minHeight: 46, marginTop: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#dce8df', color: '#173222', backgroundColor: '#fff', fontSize: 14 },
  primaryButton: { minHeight: 46, alignItems: 'center', justifyContent: 'center', marginTop: 12, paddingHorizontal: 14, borderRadius: 11, backgroundColor: '#087f5b' },
  primaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  secondaryButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 12, paddingHorizontal: 14, borderRadius: 11, borderWidth: 1, borderColor: '#b8d7c2', backgroundColor: '#f4faf6' },
  secondaryText: { color: '#176b48', fontSize: 14, fontWeight: '700' },
  dangerOutlineButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 12, borderRadius: 11, borderWidth: 1, borderColor: '#e5b7b3', backgroundColor: '#fffafa' },
  dangerText: { color: '#a12622', fontSize: 14, fontWeight: '700' },
  dangerButton: { minHeight: 44, flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 12, paddingHorizontal: 10, borderRadius: 11, backgroundColor: '#a12622' },
  confirmPanel: { marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: '#fff7f6' },
  actions: { flexDirection: 'row', gap: 8 },
  disabled: { opacity: 0.6 },
  centered: { alignItems: 'center', padding: 30 },
});
