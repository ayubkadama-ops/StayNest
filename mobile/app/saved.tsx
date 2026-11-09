import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Link, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/components/AuthProvider';
import { Text, View } from '@/components/Themed';
import {
  getSavedListings,
  resolveMediaUrl,
  setListingSaved,
  type SavedListing,
} from '@/constants/marketplaceApi';

function priceLabel(listing: SavedListing): string {
  const price = listing.salePrice ?? listing.nightlyPrice ?? listing.monthlyPrice ?? listing.yearlyPrice;
  const period = listing.salePrice !== null
    ? 'total'
    : listing.nightlyPrice !== null
      ? 'per night'
      : listing.monthlyPrice !== null
        ? 'per month'
        : listing.yearlyPrice !== null
          ? 'per year'
          : null;
  return price !== null && period
    ? `${listing.currency || 'TZS'} ${price.toLocaleString()} ${period === 'total' ? '' : period}`
    : 'Contact agent for pricing';
}

export default function SavedPropertiesScreen() {
  const { user, loading: sessionLoading } = useAuth();
  const [listings, setListings] = useState<SavedListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);

  const loadSavedListings = useCallback(async (isRefresh = false) => {
    const request = ++requestVersion.current;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const savedListings = await getSavedListings();
      if (request === requestVersion.current) setListings(savedListings);
    } catch (requestError: unknown) {
      if (request === requestVersion.current) {
        setError(requestError instanceof Error ? requestError.message : 'Saved properties could not be loaded.');
      }
    } finally {
      if (request === requestVersion.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    if (sessionLoading) return;
    if (user?.roles.includes('tenant')) void loadSavedListings();
    else {
      requestVersion.current += 1;
      setListings([]);
      setLoading(false);
      setRefreshing(false);
      setError(null);
    }
  }, [loadSavedListings, sessionLoading, user?.id, user?.roles]);

  const removeSavedListing = async (listingId: number) => {
    setWorkingId(listingId);
    setError(null);
    try {
      await setListingSaved(listingId, false);
      setListings((current) => current.filter((listing) => listing.id !== listingId));
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'The property could not be removed.');
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Stack.Screen options={{ title: 'Saved properties', headerShown: true }} />
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={(
          <RefreshControl
            enabled={user?.roles.includes('tenant') === true}
            onRefresh={() => {
              if (user?.roles.includes('tenant')) void loadSavedListings(true);
            }}
            refreshing={refreshing}
            tintColor="#087f5b"
          />
        )}
        keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={styles.title}>Saved properties</Text>
        <Text style={styles.intro}>Keep the properties you want to compare or revisit in one place.</Text>

        {error ? (
          <View accessibilityRole="alert" style={styles.errorCard}>
            <Text style={styles.error}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={() => void loadSavedListings()} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>Try again</Text>
            </Pressable>
          </View>
        ) : null}

        {loading || sessionLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color="#087f5b" size="large" />
            <Text style={styles.intro}>Loading saved properties…</Text>
          </View>
        ) : !user?.roles.includes('tenant') ? (
          <View style={styles.card}>
            <Text style={styles.intro}>Sign in with a tenant account to see saved properties.</Text>
          </View>
        ) : listings.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>No saved properties yet</Text>
            <Text style={styles.intro}>Use Save on a property card or its details page to add it here.</Text>
          </View>
        ) : listings.map((listing) => {
          const imageUri = resolveMediaUrl(listing.coverUrl, 900);
          const available = listing.listingStatus === 'published';
          const busy = workingId === listing.id;
          return (
            <View key={listing.id} style={styles.card}>
              {available ? (
                <Link href={{ pathname: '/listing', params: { id: String(listing.id) } }} asChild>
                  <Pressable accessibilityRole="button" accessibilityLabel={`View ${listing.title}`}>
                    <SavedListingImage uri={imageUri} />
                    <View style={styles.cardBody}>
                      <Text numberOfLines={1} style={styles.location}>
                        {[listing.city, listing.neighborhood].filter(Boolean).join(' · ') || 'Location not listed'}
                      </Text>
                      <Text numberOfLines={2} style={styles.cardTitle}>{listing.title}</Text>
                      <Text style={styles.price}>{priceLabel(listing)}</Text>
                      {listing.rating !== null ? (
                        <Text style={styles.rating}>
                          ★ {listing.rating.toFixed(1)}
                          {listing.reviewCount ? ` · ${listing.reviewCount} reviews` : ''}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                </Link>
              ) : (
                <>
                  <SavedListingImage uri={imageUri} />
                  <View style={styles.cardBody}>
                    <Text numberOfLines={1} style={styles.location}>
                      {[listing.city, listing.neighborhood].filter(Boolean).join(' · ') || 'Location not listed'}
                    </Text>
                    <Text numberOfLines={2} style={styles.cardTitle}>{listing.title}</Text>
                    <Text style={styles.unavailable}>This property is not currently available.</Text>
                  </View>
                </>
              )}
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => void removeSavedListing(listing.id)}
                style={[styles.removeButton, busy && styles.disabled]}>
                {busy ? <ActivityIndicator color="#176b48" /> : <Text style={styles.secondaryText}>Remove from saved</Text>}
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function SavedListingImage({ uri }: { uri: string | null }) {
  return uri ? (
    <Image source={{ uri }} resizeMode="cover" style={styles.image} />
  ) : (
    <View style={[styles.image, styles.imagePlaceholder]}>
      <Text style={styles.placeholder}>Makazi Go</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7f5' },
  content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 36 },
  title: { marginBottom: 8, color: '#173222', fontSize: 28, lineHeight: 34, fontWeight: '800' },
  intro: { marginTop: 5, color: '#53665b', fontSize: 14, lineHeight: 21 },
  card: { overflow: 'hidden', marginTop: 16, borderRadius: 16, borderWidth: 1, borderColor: '#dce8df', backgroundColor: '#fff' },
  cardBody: { padding: 15 },
  cardTitle: { marginTop: 5, color: '#173222', fontSize: 17, lineHeight: 22, fontWeight: '800' },
  location: { color: '#61736c', fontSize: 13 },
  price: { marginTop: 10, color: '#087f5b', fontSize: 15, fontWeight: '800' },
  rating: { marginTop: 6, color: '#53665b', fontSize: 13 },
  unavailable: { marginTop: 8, color: '#705714', fontSize: 13, lineHeight: 19 },
  image: { width: '100%', height: 190 },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#eef4ef' },
  placeholder: { color: '#087f5b', fontSize: 18, fontWeight: '800' },
  removeButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginHorizontal: 14, marginBottom: 14, borderRadius: 11, borderWidth: 1, borderColor: '#b8d7c2', backgroundColor: '#f4faf6' },
  secondaryButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 12, paddingHorizontal: 14, borderRadius: 11, borderWidth: 1, borderColor: '#b8d7c2', backgroundColor: '#f4faf6' },
  secondaryText: { color: '#176b48', fontSize: 14, fontWeight: '700' },
  errorCard: { marginTop: 16, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#f2b8b5', backgroundColor: '#fff7f6' },
  error: { color: '#a12622', fontSize: 14, lineHeight: 20 },
  disabled: { opacity: 0.6 },
  centered: { alignItems: 'center', padding: 30 },
});
