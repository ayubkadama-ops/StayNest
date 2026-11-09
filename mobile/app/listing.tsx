import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text, View } from '@/components/Themed';
import { useAuth } from '@/components/AuthProvider';
import {
  createBookingRequest,
  getListingDetails,
  reportReview,
  resolveMediaUrl,
  setListingSaved,
  type BookingRequestReceipt,
  type ListingDetails,
} from '@/constants/marketplaceApi';

export default function ListingScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const { user } = useAuth();
  const [details, setDetails] = useState<ListingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [mapError, setMapError] = useState<string | null>(null);
  const [bookingKind, setBookingKind] = useState<'stay' | 'viewing'>('stay');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [guestCount, setGuestCount] = useState('1');
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingReceipt, setBookingReceipt] = useState<BookingRequestReceipt | null>(null);
  const [savingListing, setSavingListing] = useState(false);
  const idempotencyKey = useRef<string | null>(null);
  const bookingInFlight = useRef(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setDetails(null);
    setBookingKind('stay');
    setCheckIn('');
    setCheckOut('');
    setAppointmentDate('');
    setAppointmentTime('');
    setGuestCount('1');
    setBookingError(null);
    setBookingReceipt(null);
    setBookingSubmitting(false);
    idempotencyKey.current = null;

    if (!id) {
      setError('Choose a valid property to view.');
      setLoading(false);
      return () => {
        active = false;
      };
    }

    void getListingDetails(id)
      .then((result) => {
        if (active) {
          setDetails(result);
          setSelectedMedia(result.media.find((item) => item.mediaType !== 'video')?.mediaUrl
            ?? result.listing.coverUrl);
        }
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Property details could not be loaded.',
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, retryKey, user?.id]);

  const listing = details?.listing;
  const mediaItems = details?.media.filter((item) => item.mediaType !== 'video') ?? [];
  const selectedImage = resolveMediaUrl(selectedMedia, 1200);
  const price = listing?.salePrice ?? listing?.nightlyPrice ?? listing?.monthlyPrice ?? listing?.yearlyPrice ?? null;
  const period = listing?.salePrice !== null && listing?.salePrice !== undefined
    ? 'for sale'
    : listing?.nightlyPrice !== null && listing?.nightlyPrice !== undefined
      ? 'night'
      : listing?.monthlyPrice !== null && listing?.monthlyPrice !== undefined
        ? 'month'
        : listing?.yearlyPrice !== null && listing?.yearlyPrice !== undefined
          ? 'year'
          : null;
  const amenities = listing?.amenities?.split(',').map((amenity) => amenity.trim()).filter(Boolean) ?? [];
  const agentName = [listing?.agentFirstName, listing?.agentLastName].filter(Boolean).join(' ');
  const canRequestStay = ['stay', 'both'].includes(listing?.transactionType || '');
  const activeBookingKind = canRequestStay ? bookingKind : 'viewing';
  const stayQuote = getStayQuote(checkIn, checkOut, listing?.nightlyPrice, listing?.cleaningFee, listing?.minStayNights);
  const guestCountNumber = Number(guestCount);
  const guestCountLimit = Math.min(100, listing?.maxGuests ?? 0);
  const guestCountValid = /^\d+$/.test(guestCount)
    && Number.isSafeInteger(guestCountNumber)
    && guestCountNumber >= 1
    && guestCountLimit >= 1
    && guestCountNumber <= guestCountLimit;
  const changeBookingField = (update: () => void) => {
    idempotencyKey.current = null;
    setBookingReceipt(null);
    setBookingError(null);
    update();
  };
  const submitBookingRequest = async () => {
    if (!listing) return;
    if (!user) {
      Alert.alert(
        'Sign in to continue',
        'A tenant account is required to send a booking or viewing request. Your property will remain open when you return.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Sign in', onPress: () => router.push('/(tabs)/account') },
        ],
      );
      return;
    }
    if (!user.roles.includes('tenant')) {
      setBookingError('Sign in with a tenant account to send booking and viewing requests.');
      return;
    }
    if (bookingInFlight.current) return;
    bookingInFlight.current = true;
    setBookingSubmitting(true);
    setBookingError(null);
    try {
      const requestKey = idempotencyKey.current
        || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
      idempotencyKey.current = requestKey;
      const receipt = activeBookingKind === 'stay'
        ? await createBookingRequest({
          listingId: listing.id,
          bookingKind: 'stay',
          checkIn,
          checkOut,
          guests: Number(guestCount),
          idempotencyKey: requestKey,
        })
        : await createBookingRequest({
          listingId: listing.id,
          bookingKind: 'viewing',
          appointmentAt: createLocalAppointmentIso(appointmentDate, appointmentTime),
          idempotencyKey: requestKey,
        });
      setBookingReceipt(receipt);
      idempotencyKey.current = null;
    } catch (requestError: unknown) {
      setBookingError(
        requestError instanceof Error ? requestError.message : 'The request could not be sent. Please try again.',
      );
    } finally {
      bookingInFlight.current = false;
      setBookingSubmitting(false);
    }
  };
  const toggleSavedListing = async () => {
    if (!listing) return;
    if (!user?.roles.includes('tenant')) {
      Alert.alert(
        'Sign in to save properties',
        'A tenant account is required to manage saved properties.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Sign in', onPress: () => router.push('/(tabs)/account') },
        ],
      );
      return;
    }
    if (savingListing) return;
    const saved = listing.saved !== true;
    setSavingListing(true);
    try {
      await setListingSaved(listing.id, saved);
      setDetails((current) => current
        ? { ...current, listing: { ...current.listing, saved } }
        : current);
    } catch (requestError: unknown) {
      Alert.alert(
        'Could not update saved properties',
        requestError instanceof Error ? requestError.message : 'Please try again.',
      );
    } finally {
      setSavingListing(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Stack.Screen options={{ title: 'Property details', headerShown: true }} />
      <StatusBar style="dark" />
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#087f5b" size="large" />
          <Text style={styles.centeredText}>Loading property details…</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>Property unavailable</Text>
          <Text style={styles.errorText}>{error}</Text>
          <View style={styles.errorActions}>
            {id ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setRetryKey((key) => key + 1)}
                style={styles.backButton}>
                <Text style={styles.backButtonText}>Try again</Text>
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Go back</Text>
            </Pressable>
          </View>
        </View>
      ) : listing ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {selectedImage ? (
            <Image source={{ uri: selectedImage }} style={styles.heroImage} />
          ) : (
            <View style={[styles.heroImage, styles.imagePlaceholder]}>
              <Text style={styles.placeholderText}>Makazi Go</Text>
            </View>
          )}
          {mediaItems.length > 1 ? (
            <ScrollView
              horizontal
              contentContainerStyle={styles.thumbnails}
              showsHorizontalScrollIndicator={false}>
              {mediaItems.map((item) => {
                const uri = resolveMediaUrl(item.mediaUrl, 320);
                if (!uri) return null;
                return (
                  <Pressable
                    accessibilityLabel={`Show property photo${item.caption ? `: ${item.caption}` : ''}`}
                    accessibilityRole="button"
                    key={item.id}
                    onPress={() => setSelectedMedia(item.mediaUrl)}
                    style={[
                      styles.thumbnailButton,
                      selectedMedia === item.mediaUrl && styles.thumbnailSelected,
                    ]}>
                    <Image source={{ uri }} style={styles.thumbnail} />
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          <View style={styles.details}>
            <Text style={styles.location}>
              {[listing.city, listing.neighborhood, listing.region].filter(Boolean).join(' · ')
                || 'Location not listed'}
            </Text>
            <Text accessibilityRole="header" style={styles.title}>{listing.title}</Text>
            <View style={styles.metaRow}>
              {listing.rating !== null ? (
                <Text style={styles.rating}>
                  ★ {listing.rating.toFixed(1)}
                  {listing.reviewCount ? ` (${listing.reviewCount} reviews)` : ''}
                </Text>
              ) : (
                <Text style={styles.metaText}>New listing</Text>
              )}
              {listing.verifiedAgent ? <Text style={styles.verified}>Identity-checked agent</Text> : null}
            </View>
            <Text style={styles.price}>
              {price !== null && period
                ? `${listing.currency || 'TZS'} ${price.toLocaleString()} / ${period}`
                : 'Contact agent for pricing'}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: listing.saved === true, disabled: savingListing }}
              disabled={savingListing}
              onPress={() => void toggleSavedListing()}
              style={[styles.savePropertyButton, savingListing && styles.disabledBookingButton]}>
              <Text style={styles.savePropertyText}>
                {savingListing ? 'Saving…' : listing.saved === true ? 'Remove from saved properties' : 'Save property'}
              </Text>
            </Pressable>

            <View style={styles.factsCard}>
              <Fact label="Property" value={listing.propertyType} />
              <Fact label="Journey" value={listing.transactionType} />
              {listing.plotSize !== null ? <Fact label="Plot size" value={`${listing.plotSize} ${listing.plotSizeUnit || ''}`} /> : null}
              {listing.landUse ? <Fact label="Land use" value={listing.landUse} /> : null}
              {listing.titleStatus ? <Fact label="Advertiser-reported title status" value={listing.titleStatus.replace(/_/g, ' ')} /> : null}
              {listing.floorArea !== null ? <Fact label="Floor area" value={`${listing.floorArea} m²`} /> : null}
              {listing.commercialUse ? <Fact label="Commercial use" value={listing.commercialUse.replace(/_/g, ' ')} /> : null}
              <Fact label="Bedrooms" value={listing.bedrooms} />
              <Fact label="Bathrooms" value={listing.bathrooms} />
              <Fact label="Guests" value={listing.maxGuests} />
              {listing.rentalMode ? <Fact label="Stay" value={listing.rentalMode.replace('_', ' ')} /> : null}
            </View>

            <Section title="Request a stay or viewing">
              <Text style={styles.bodyText}>
                Requests go to the responsible agent for review. A booking is not confirmed until the agent accepts it.
              </Text>
              <View style={styles.bookingModeRow}>
                {canRequestStay ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: activeBookingKind === 'stay' }}
                    onPress={() => changeBookingField(() => setBookingKind('stay'))}
                    style={[styles.bookingModeButton, activeBookingKind === 'stay' && styles.bookingModeSelected]}>
                    <Text style={[styles.bookingModeText, activeBookingKind === 'stay' && styles.bookingModeSelectedText]}>Request a stay</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: activeBookingKind === 'viewing' }}
                  onPress={() => changeBookingField(() => setBookingKind('viewing'))}
                  style={[styles.bookingModeButton, activeBookingKind === 'viewing' && styles.bookingModeSelected]}>
                  <Text style={[styles.bookingModeText, activeBookingKind === 'viewing' && styles.bookingModeSelectedText]}>Request a viewing</Text>
                </Pressable>
              </View>
              {activeBookingKind === 'stay' ? (
                <>
                  <View style={styles.bookingFieldRow}>
                    <View style={styles.bookingField}>
                      <Text style={styles.bookingLabel}>Check-in</Text>
                      <TextInput
                        accessibilityLabel="Check-in date"
                        autoCorrect={false}
                        onChangeText={(value) => changeBookingField(() => setCheckIn(value))}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="#718176"
                        style={styles.bookingInput}
                        value={checkIn}
                      />
                    </View>
                    <View style={styles.bookingField}>
                      <Text style={styles.bookingLabel}>Check-out</Text>
                      <TextInput
                        accessibilityLabel="Check-out date"
                        autoCorrect={false}
                        onChangeText={(value) => changeBookingField(() => setCheckOut(value))}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="#718176"
                        style={styles.bookingInput}
                        value={checkOut}
                      />
                    </View>
                  </View>
                  <View style={styles.bookingField}>
                    <Text style={styles.bookingLabel}>Guests (maximum {listing.maxGuests ?? 'not specified'})</Text>
                    <TextInput
                      accessibilityLabel="Number of guests"
                      keyboardType="number-pad"
                      onChangeText={(value) => changeBookingField(() => setGuestCount(value))}
                      style={styles.bookingInput}
                      value={guestCount}
                    />
                  </View>
                  {!guestCountValid ? (
                    <Text style={styles.bookingHint} accessibilityRole="alert">
                      {guestCountLimit > 0
                        ? `Enter between 1 and ${guestCountLimit} guests.`
                        : 'Guest capacity is unavailable for this property. Contact the agent.'}
                    </Text>
                  ) : null}
                  {stayQuote ? (
                    <View style={styles.quoteCard}>
                      <Text style={styles.quoteText}>
                        {stayQuote.nights} {stayQuote.nights === 1 ? 'night' : 'nights'} × {listing.currency || 'TZS'} {Number(listing.nightlyPrice).toLocaleString()}
                      </Text>
                      {stayQuote.cleaningFee > 0 ? (
                        <Text style={styles.quoteText}>
                          Cleaning fee · {listing.currency || 'TZS'} {stayQuote.cleaningFee.toLocaleString()}
                        </Text>
                      ) : null}
                      <Text style={styles.quoteTotal}>
                        Estimated total · {listing.currency || 'TZS'} {stayQuote.total.toLocaleString()}
                      </Text>
                    </View>
                  ) : null}
                  {checkIn && checkOut && !stayQuote ? (
                    <Text style={styles.bookingHint} accessibilityRole="alert">
                      Enter future dates and meet the minimum stay of {listing.minStayNights || 1} night(s).
                    </Text>
                  ) : null}
                </>
              ) : (
                <View style={styles.bookingFieldRow}>
                  <View style={styles.bookingField}>
                    <Text style={styles.bookingLabel}>Viewing date</Text>
                    <TextInput
                      accessibilityLabel="Viewing date"
                      autoCorrect={false}
                      onChangeText={(value) => changeBookingField(() => setAppointmentDate(value))}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#718176"
                      style={styles.bookingInput}
                      value={appointmentDate}
                    />
                  </View>
                  <View style={styles.bookingField}>
                    <Text style={styles.bookingLabel}>Local time</Text>
                    <TextInput
                      accessibilityLabel="Viewing time"
                      onChangeText={(value) => changeBookingField(() => setAppointmentTime(value))}
                      placeholder="HH:MM"
                      placeholderTextColor="#718176"
                      style={styles.bookingInput}
                      value={appointmentTime}
                    />
                  </View>
                </View>
              )}
              {bookingError ? <Text style={styles.bookingError} accessibilityRole="alert">{bookingError}</Text> : null}
              {bookingReceipt ? (
                <View style={styles.bookingSuccess} accessibilityRole="status">
                  <Text style={styles.bookingSuccessTitle}>Request sent · {bookingReceipt.bookingCode}</Text>
                  <Text style={styles.bodyText}>
                    {bookingReceipt.bookingKind === 'stay'
                      ? `Estimated total ${listing.currency || 'TZS'} ${bookingReceipt.amount.toLocaleString()}. The agent will review your request.`
                      : 'The agent will review your viewing request.'}
                  </Text>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  disabled={bookingSubmitting || (activeBookingKind === 'stay' && (!stayQuote || !guestCountValid))}
                  onPress={() => void submitBookingRequest()}
                  style={[styles.submitBookingButton, (bookingSubmitting || (activeBookingKind === 'stay' && (!stayQuote || !guestCountValid))) && styles.disabledBookingButton]}>
                  <Text style={styles.submitBookingText}>
                    {bookingSubmitting
                      ? 'Sending request…'
                      : activeBookingKind === 'stay' ? 'Send stay request' : 'Send viewing request'}
                  </Text>
                </Pressable>
              )}
            </Section>

            <Section title="About this place">
              <Text style={styles.bodyText}>
                {listing.description || 'The agent has not added a description yet.'}
              </Text>
            </Section>

            <Section title="Approximate location">
              {listing.locationLatitude !== null && listing.locationLongitude !== null ? (
                <>
                  <Text style={styles.bodyText}>The map shows an approximate area to protect the exact address.</Text>
                  <Pressable
                    accessibilityRole="link"
                    onPress={() => {
                      const { locationLatitude, locationLongitude } = listing;
                      const url = `https://www.openstreetmap.org/?mlat=${locationLatitude}&mlon=${locationLongitude}#map=13/${locationLatitude}/${locationLongitude}`;
                      void Linking.openURL(url).then(() => setMapError(null)).catch(() => {
                        setMapError('The map could not be opened. Please try again later.');
                      });
                    }}
                    style={styles.mapLink}>
                    <Text style={styles.mapLinkText}>View approximate location on OpenStreetMap</Text>
                  </Pressable>
                  {mapError ? <Text style={styles.bodyText} accessibilityRole="alert">{mapError}</Text> : null}
                </>
              ) : (
                <Text style={styles.bodyText}>Approximate map coordinates are not available for this property.</Text>
              )}
            </Section>

            <Section title="Makazi Go property checks">
              <Text style={styles.agentName}>
                {(listing.propertyVerification?.status || 'unverified').replace(/_/g, ' ')}
              </Text>
              {[
                ['Identity', listing.propertyVerification?.identity],
                ['Location', listing.propertyVerification?.location],
                ['Owner/agent authorization', listing.propertyVerification?.ownerOrAgentAuthorization],
                ['Property documents', listing.propertyVerification?.documents],
              ].map(([label, status]) => (
                <Text key={label} style={styles.bodyText}>
                  {label}: {(status || 'not reviewed').replace(/_/g, ' ')}
                </Text>
              ))}
              <Text style={styles.bodyText}>
                These platform checks are not a legal title guarantee. Title details are advertiser-reported.
              </Text>
            </Section>

            {amenities.length ? (
              <Section title="Amenities">
                <View style={styles.amenityList}>
                  {amenities.map((amenity) => (
                    <View key={amenity} style={styles.amenityPill}>
                      <Text style={styles.amenityText}>{amenity}</Text>
                    </View>
                  ))}
                </View>
              </Section>
            ) : null}

            <Section title="Listed by">
              <Text style={styles.agentName}>{agentName || listing.agencyName || 'Makazi Go agent'}</Text>
              {listing.agencyName && agentName ? (
                <Text style={styles.bodyText}>{listing.agencyName}</Text>
              ) : null}
              {listing.responseHours !== null ? (
                <Text style={styles.bodyText}>
                  Average response time: {listing.responseHours.toFixed(1)} hours
                </Text>
              ) : null}
              {listing.agentId ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/agent-profile', params: { id: String(listing.agentId) } })}
                  style={styles.mapLink}>
                  <Text style={styles.mapLinkText}>View agent reputation and reviews</Text>
                </Pressable>
              ) : null}
            </Section>

            <Section title="Guest reviews">
              {details?.reviews.length ? details.reviews.map((review, index) => (
                <View key={`${review.createdAt || 'review'}-${index}`} style={styles.review}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewer}>
                      {[review.firstName, review.lastName].filter(Boolean).join(' ') || 'Makazi Go guest'}
                    </Text>
                    <Text style={styles.rating}>★ {review.rating.toFixed(1)}</Text>
                  </View>
                  {review.verifiedInteraction ? <Text style={styles.verified}>Verified completed stay</Text> : null}
                  {review.comment ? <Text style={styles.bodyText}>{review.comment}</Text> : null}
                  {review.hostReply ? (
                    <View style={styles.reviewReply}>
                      <Text style={styles.reviewer}>Host response</Text>
                      <Text style={styles.bodyText}>{review.hostReply}</Text>
                    </View>
                  ) : null}
                  {user ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        Alert.alert('Report this review?', 'Our team will assess the review.', [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Report',
                            style: 'destructive',
                            onPress: () => {
                              void reportReview(review.id).then(
                                () => Alert.alert('Report sent', 'Thank you for helping keep reviews trustworthy.'),
                                (requestError: unknown) => Alert.alert(
                                  'Report not sent',
                                  requestError instanceof Error ? requestError.message : 'Please try again later.',
                                ),
                              );
                            },
                          },
                        ]);
                      }}
                      style={styles.reportButton}>
                      <Text style={styles.reportText}>Report review</Text>
                    </Pressable>
                  ) : null}
                </View>
              )) : (
                <Text style={styles.bodyText}>No published reviews yet.</Text>
              )}
            </Section>

            {details?.similar.length ? (
              <Section title="Similar places">
                {details.similar.map((similar) => (
                  <Pressable
                    accessibilityRole="button"
                    key={similar.id}
                    onPress={() => router.push({ pathname: '/listing', params: { id: String(similar.id) } })}
                    style={styles.similarItem}>
                    <Text style={styles.similarTitle}>{similar.title}</Text>
                    <Text style={styles.bodyText}>
                      {[similar.city, similar.currency].filter(Boolean).join(' · ')}
                    </Text>
                  </Pressable>
                ))}
              </Section>
            ) : null}
          </View>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

function getStayQuote(
  checkIn: string,
  checkOut: string,
  nightlyPrice: number | null | undefined,
  cleaningFee: number | null | undefined,
  minimumNights: number | null | undefined,
): { nights: number; cleaningFee: number; total: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut)
    || nightlyPrice === null || nightlyPrice === undefined || !Number.isFinite(nightlyPrice) || nightlyPrice <= 0) {
    return null;
  }
  const start = new Date(`${checkIn}T00:00:00Z`);
  const end = new Date(`${checkOut}T00:00:00Z`);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())
    || start.toISOString().slice(0, 10) !== checkIn || end.toISOString().slice(0, 10) !== checkOut
    || checkIn < new Date().toISOString().slice(0, 10)) return null;
  const nights = (end.getTime() - start.getTime()) / 86_400_000;
  const fee = cleaningFee ?? 0;
  if (!Number.isInteger(nights) || nights < Math.max(1, minimumNights ?? 1)
    || !Number.isFinite(fee) || fee < 0) return null;
  return { nights, cleaningFee: fee, total: nightlyPrice * nights + fee };
}

function createLocalAppointmentIso(dateValue: string, timeValue: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue) || !/^\d{2}:\d{2}$/.test(timeValue)) {
    throw new Error('Choose a valid viewing date and time.');
  }
  const [year, month, day] = dateValue.split('-').map(Number);
  const [hour, minute] = timeValue.split(':').map(Number);
  const date = new Date(year, month - 1, day, hour, minute);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day
    || date.getHours() !== hour || date.getMinutes() !== minute || date <= new Date()) {
    throw new Error('Viewing requests must be scheduled for a future local date and time.');
  }
  return date.toISOString();
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string | number | null }) {
  if (value === null || value === '') return null;
  return (
    <View style={styles.fact}>
      <Text style={styles.factValue}>{String(value)}</Text>
      <Text style={styles.factLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f7f5',
  },
  content: {
    paddingBottom: 36,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  centeredText: {
    marginTop: 12,
    color: '#53665b',
    fontSize: 14,
  },
  errorTitle: {
    color: '#173222',
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
  },
  errorText: {
    marginTop: 9,
    color: '#53665b',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  errorActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 18,
  },
  backButton: {
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#087f5b',
  },
  backButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dce8df',
    backgroundColor: '#ffffff',
  },
  secondaryButtonText: {
    color: '#173222',
    fontWeight: '700',
  },
  bookingModeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  bookingModeButton: {
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: '#cbd9ce',
    borderRadius: 10,
    backgroundColor: '#ffffff',
  },
  bookingModeSelected: {
    borderColor: '#087f5b',
    backgroundColor: '#e5f2eb',
  },
  bookingModeText: {
    color: '#345044',
    fontSize: 13,
    fontWeight: '700',
  },
  bookingModeSelectedText: {
    color: '#075d43',
  },
  bookingFieldRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  bookingField: {
    flex: 1,
    minWidth: 0,
    marginTop: 12,
  },
  bookingLabel: {
    marginBottom: 6,
    color: '#345044',
    fontSize: 12,
    fontWeight: '700',
  },
  bookingInput: {
    minHeight: 46,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#cbd9ce',
    borderRadius: 9,
    color: '#173222',
    backgroundColor: '#ffffff',
    fontSize: 15,
  },
  quoteCard: {
    gap: 5,
    marginTop: 12,
    padding: 13,
    borderRadius: 10,
    backgroundColor: '#eef5ef',
  },
  quoteText: {
    color: '#53665b',
    fontSize: 13,
  },
  quoteTotal: {
    marginTop: 3,
    color: '#173222',
    fontSize: 15,
    fontWeight: '800',
  },
  bookingHint: {
    marginTop: 10,
    color: '#8a4c13',
    fontSize: 13,
    lineHeight: 19,
  },
  bookingError: {
    marginTop: 10,
    color: '#9b2727',
    fontSize: 13,
    lineHeight: 19,
  },
  bookingSuccess: {
    gap: 5,
    marginTop: 14,
    padding: 13,
    borderRadius: 10,
    backgroundColor: '#e5f2eb',
  },
  bookingSuccessTitle: {
    color: '#075d43',
    fontSize: 15,
    fontWeight: '800',
  },
  submitBookingButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#087f5b',
  },
  disabledBookingButton: {
    opacity: 0.5,
  },
  submitBookingText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  heroImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#e8f3ec',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#087f5b',
    fontSize: 20,
    fontWeight: '800',
  },
  thumbnails: {
    gap: 9,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  thumbnailButton: {
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 11,
  },
  thumbnailSelected: {
    borderColor: '#087f5b',
  },
  thumbnail: {
    width: 76,
    height: 60,
    backgroundColor: '#e8f3ec',
  },
  details: {
    paddingHorizontal: 20,
  },
  location: {
    marginTop: 20,
    color: '#087f5b',
    fontSize: 13,
    fontWeight: '700',
  },
  title: {
    marginTop: 7,
    color: '#173222',
    fontSize: 29,
    lineHeight: 35,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  rating: {
    color: '#6a5010',
    fontSize: 13,
    fontWeight: '700',
  },
  verified: {
    color: '#087f5b',
    fontSize: 13,
    fontWeight: '700',
  },
  metaText: {
    color: '#52655a',
    fontSize: 13,
  },
  price: {
    marginTop: 18,
    color: '#173222',
    fontSize: 20,
    fontWeight: '800',
  },
  savePropertyButton: {
    minHeight: 44,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    marginTop: 13,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#b8d7c2',
    borderRadius: 11,
    backgroundColor: '#f4faf6',
  },
  savePropertyText: {
    color: '#176b48',
    fontSize: 14,
    fontWeight: '700',
  },
  factsCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 20,
    padding: 14,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#dce8df',
    backgroundColor: '#ffffff',
  },
  fact: {
    minWidth: '28%',
    paddingVertical: 5,
  },
  factValue: {
    color: '#173222',
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  factLabel: {
    marginTop: 3,
    color: '#52655a',
    fontSize: 11,
  },
  section: {
    marginTop: 26,
  },
  sectionTitle: {
    marginBottom: 10,
    color: '#173222',
    fontSize: 19,
    fontWeight: '800',
  },
  bodyText: {
    color: '#53665b',
    fontSize: 14,
    lineHeight: 22,
  },
  mapLink: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#e5f2eb',
  },
  mapLinkText: {
    color: '#087f5b',
    fontSize: 14,
    fontWeight: '700',
  },
  amenityList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#e8f3ec',
  },
  amenityText: {
    color: '#087f5b',
    fontSize: 13,
    fontWeight: '600',
  },
  agentName: {
    color: '#173222',
    fontSize: 15,
    fontWeight: '700',
  },
  review: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#dce8df',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  reviewer: {
    color: '#173222',
    fontSize: 14,
    fontWeight: '700',
  },
  reviewReply: {
    marginTop: 8,
    padding: 10,
    borderRadius: 9,
    backgroundColor: '#eef5ef',
    gap: 4,
  },
  reportButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 5,
  },
  reportText: {
    color: '#785050',
    fontSize: 13,
    fontWeight: '700',
  },
  similarItem: {
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#dce8df',
  },
  similarTitle: {
    color: '#173222',
    fontSize: 15,
    fontWeight: '700',
  },
});
