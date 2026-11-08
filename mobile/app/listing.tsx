import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text, View } from '@/components/Themed';
import {
  getListingDetails,
  resolveMediaUrl,
  type ListingDetails,
} from '@/constants/marketplaceApi';

export default function ListingScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const [details, setDetails] = useState<ListingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setDetails(null);

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
  }, [id, retryKey]);

  const listing = details?.listing;
  const mediaItems = details?.media.filter((item) => item.mediaType !== 'video') ?? [];
  const selectedImage = resolveMediaUrl(selectedMedia);
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
                const uri = resolveMediaUrl(item.mediaUrl);
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
                  {review.comment ? <Text style={styles.bodyText}>{review.comment}</Text> : null}
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
