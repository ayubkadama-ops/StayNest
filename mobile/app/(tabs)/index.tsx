import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { StatusBar } from 'expo-status-bar';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/components/AuthProvider';
import { Text, View } from '@/components/Themed';
import {
  createSearchAlert,
  discoverListings,
  resolveMediaUrl,
  type DiscoveryFilters,
  type DiscoveryResult,
  type ListingSummary,
  type SessionUser,
  setListingSaved,
} from '@/constants/marketplaceApi';

const propertyCategories = [
  { value: '', label: 'All properties', title: 'Explore properties', caption: 'Find a space that fits your plans', image: null },
  { value: 'house', label: 'Homes', title: 'Homes', caption: 'A place to settle in', image: require('../../assets/web/makazi-category-home.webp') },
  { value: 'apartment', label: 'Apartments', title: 'Apartments', caption: 'City living, made simple', image: require('../../assets/web/makazi-category-apartment.webp') },
  { value: 'land', label: 'Land', title: 'Land', caption: 'Room to build what is next', image: require('../../assets/web/makazi-category-land.webp') },
  { value: 'hotel', label: 'Hotels', title: 'Hotels', caption: 'Comfort for every stay', image: require('../../assets/web/makazi-category-hotel.webp') },
  { value: 'commercial', label: 'Commercial', title: 'Commercial', caption: 'Space for your business', image: require('../../assets/web/makazi-category-commercial.webp') },
] as const;

const initialFilters: DiscoveryFilters = {
  q: '',
  location: '',
  propertyType: '',
  transactionType: '',
  rentalMode: '',
  sort: 'new',
  region: '',
  district: '',
  ward: '',
  neighborhood: '',
  pricePeriod: '',
  currency: 'TZS',
  minPrice: '',
  maxPrice: '',
  minBedrooms: '',
  maxBedrooms: '',
  minBathrooms: '',
  minSize: '',
  maxSize: '',
  furnished: '',
  verificationStatus: '',
  amenities: [],
  availableFrom: '',
  availableTo: '',
};

export default function ExploreScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const listRef = useRef<FlatList<ListingSummary> | null>(null);
  const resultsOffset = useRef(0);
  const discoveryRequestRef = useRef(0);
  const [draft, setDraft] = useState(initialFilters);
  const [filters, setFilters] = useState(initialFilters);
  const [refreshKey, setRefreshKey] = useState(0);
  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [pagination, setPagination] = useState<DiscoveryResult['pagination']>({
    page: 1,
    limit: 24,
    total: 0,
    totalPages: 0,
    hasPrevious: false,
    hasNext: false,
  });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSearchMessage, setSaveSearchMessage] = useState('');
  const [savingSearch, setSavingSearch] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    let active = true;
    discoveryRequestRef.current += 1;
    loadingMoreRef.current = false;
    setLoadingMore(false);
    setLoading(true);
    setError(null);

    void discoverListings(filters)
      .then((results) => {
        if (active) {
          setListings(results.listings);
          setPagination(results.pagination);
        }
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setListings([]);
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Listings could not be loaded. Please try again.',
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
  }, [filters, refreshKey, user?.id]);

  const scrollToResults = () => {
    listRef.current?.scrollToOffset({ offset: resultsOffset.current, animated: true });
  };
  const applyFilters = () => {
    setFilters({ ...draft });
    setSaveSearchMessage('');
    setListings([]);
    setPagination({
      page: 1,
      limit: 24,
      total: 0,
      totalPages: 0,
      hasPrevious: false,
      hasNext: false,
    });
    setRefreshKey((key) => key + 1);
    setTypePickerOpen(false);
    setMenuOpen(false);
    scrollToResults();
  };
  const chooseCategory = (propertyType: string) => {
    const nextFilters = { ...draft, propertyType };
    setDraft(nextFilters);
    setFilters(nextFilters);
    setSaveSearchMessage('');
    setListings([]);
    setPagination({
      page: 1,
      limit: 24,
      total: 0,
      totalPages: 0,
      hasPrevious: false,
      hasNext: false,
    });
    setRefreshKey((key) => key + 1);
    setTypePickerOpen(false);
    setMenuOpen(false);
    scrollToResults();
  };
  const refreshListings = () => {
    setRefreshing(true);
    setRefreshKey((key) => key + 1);
  };
  const saveCurrentSearch = async () => {
    if (!user?.roles.includes('tenant')) {
      Alert.alert(
        'Sign in to save searches',
        'A tenant account is required to manage search alerts.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Sign in', onPress: () => router.push('/(tabs)/account') },
        ],
      );
      return;
    }

    const activeFilters = Object.entries(filters).filter(([key, value]) => (
      !['sort', 'currency'].includes(key)
      && (Array.isArray(value) ? value.length > 0 : typeof value === 'string' && value.trim().length > 0)
    ));
    if (!activeFilters.length) {
      setSaveSearchMessage('Apply at least one filter before saving.');
      return;
    }

    const category = propertyCategories.find((item) => item.value === filters.propertyType)?.label;
    const journey = filters.transactionType === 'sale' ? 'Buy'
      : filters.transactionType === 'rent' ? 'Rent'
        : filters.transactionType === 'stay' ? 'Stay' : '';
    const name = [
      filters.location,
      filters.district,
      filters.neighborhood,
      category,
      journey,
    ].filter(Boolean).join(' · ') || 'My property search';
    setSavingSearch(true);
    setSaveSearchMessage('');
    try {
      await createSearchAlert(name, filters);
      setSaveSearchMessage('Search saved.');
    } catch (requestError: unknown) {
      const message = requestError instanceof Error ? requestError.message : 'This search could not be saved.';
      setSaveSearchMessage(/auth|sign in/i.test(message) ? 'Sign in to save this search.' : message);
    } finally {
      setSavingSearch(false);
    }
  };
  const loadMoreListings = () => {
    if (!pagination.hasNext || loadingMoreRef.current) return;
    const requestId = discoveryRequestRef.current;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setError(null);
    void discoverListings(filters, pagination.page + 1)
      .then((results) => {
        if (requestId !== discoveryRequestRef.current) return;
        setListings((current) => {
          const knownIds = new Set(current.map((listing) => listing.id));
          return [...current, ...results.listings.filter((listing) => !knownIds.has(listing.id))];
        });
        setPagination(results.pagination);
      })
      .catch((requestError: unknown) => {
        if (requestId !== discoveryRequestRef.current) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'More listings could not be loaded. Please try again.',
        );
      })
      .finally(() => {
        if (requestId !== discoveryRequestRef.current) return;
        loadingMoreRef.current = false;
        setLoadingMore(false);
      });
  };
  const updateSavedState = (listingId: number, saved: boolean) => {
    setListings((current) => current.map((listing) => (
      listing.id === listingId ? { ...listing, saved } : listing
    )));
  };
  const selectedCategory = propertyCategories.find(
    (category) => category.value === draft.propertyType,
  ) ?? propertyCategories[0];

  const listHeader = (
    <View>
      <View style={styles.quickNav}>
        <ScrollView
          horizontal
          contentContainerStyle={styles.quickNavContent}
          showsHorizontalScrollIndicator={false}>
          {propertyCategories.slice(1).map((category) => (
            <Pressable
              accessibilityRole="button"
              key={category.value}
              onPress={() => chooseCategory(category.value)}
              style={({ pressed }) => [styles.quickNavItem, pressed && styles.pressed]}>
              <CategorySymbol propertyType={category.value} />
              <Text style={styles.quickNavText}>{category.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>Find your place. Make your move.</Text>
        <Text accessibilityRole="header" style={styles.heroTitle}>
          More than{'\n'}just property.{'\n'}
          <Text style={styles.heroAccent}>It’s a lifestyle.</Text>
        </Text>
        <Text style={styles.heroDescription}>
          Find homes, apartments, land, hotels, and commercial spaces across Tanzania,
          with local agents to help you take the next step.
        </Text>

        <View style={styles.searchPanel}>
          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Where</Text>
            <TextInput
              accessibilityLabel="City or neighborhood"
              autoCapitalize="words"
              onChangeText={(location) => setDraft((current) => ({ ...current, location }))}
              onSubmitEditing={applyFilters}
              placeholder="City or neighborhood"
              placeholderTextColor="#52655a"
              returnKeyType="search"
              style={styles.input}
              value={draft.location}
            />
          </View>
          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Property type</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: typePickerOpen }}
              onPress={() => setTypePickerOpen((open) => !open)}
              style={styles.selectButton}>
              <Text style={styles.selectText}>{selectedCategory.label}</Text>
              <Text style={styles.selectChevron}>{typePickerOpen ? '⌃' : '⌄'}</Text>
            </Pressable>
            {typePickerOpen ? (
              <View style={styles.selectOptions}>
                {propertyCategories.map((category) => (
                  <Pressable
                    accessibilityRole="button"
                    key={category.value || 'all'}
                    onPress={() => {
                      setDraft((current) => ({ ...current, propertyType: category.value }));
                      setTypePickerOpen(false);
                    }}
                    style={styles.selectOption}>
                    <Text
                      style={[
                        styles.selectText,
                        draft.propertyType === category.value && styles.selectedSelectText,
                      ]}>
                      {category.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={applyFilters}
            style={({ pressed }) => [styles.searchButton, pressed && styles.pressed]}>
            <Text style={styles.searchButtonText}>Search properties</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: savingSearch }}
            disabled={savingSearch}
            onPress={() => void saveCurrentSearch()}
            style={({ pressed }) => [styles.saveSearchButton, pressed && styles.pressed]}>
            <Text style={styles.saveSearchButtonText}>{savingSearch ? 'Saving search…' : 'Save this search'}</Text>
          </Pressable>
          {saveSearchMessage ? (
            <Text accessibilityRole="alert" style={styles.saveSearchMessage}>{saveSearchMessage}</Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showFilters }}
            onPress={() => setShowFilters((visible) => !visible)}
            style={styles.moreFiltersButton}>
            <Text style={styles.moreFiltersText}>
              {showFilters ? 'Fewer filters' : 'More filters'}
            </Text>
          </Pressable>
          {showFilters ? (
            <View style={styles.advancedFilters}>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Search</Text>
                <TextInput
                  accessibilityLabel="Search city, neighborhood, or property"
                  autoCapitalize="none"
                  onChangeText={(q) => setDraft((current) => ({ ...current, q }))}
                  onSubmitEditing={applyFilters}
                  placeholder="City, neighborhood, or property"
                  placeholderTextColor="#52655a"
                  returnKeyType="search"
                  style={styles.input}
                  value={draft.q}
                />
              </View>
              <SearchField
                label="Region"
                value={draft.region ?? ''}
                onChangeText={(region) => setDraft((current) => ({ ...current, region }))}
                placeholder="Region"
              />
              <SearchField
                label="District"
                value={draft.district ?? ''}
                onChangeText={(district) => setDraft((current) => ({ ...current, district }))}
                placeholder="District"
              />
              <SearchField
                label="Ward"
                value={draft.ward ?? ''}
                onChangeText={(ward) => setDraft((current) => ({ ...current, ward }))}
                placeholder="Ward"
              />
              <SearchField
                label="Neighborhood"
                value={draft.neighborhood ?? ''}
                onChangeText={(neighborhood) => setDraft((current) => ({ ...current, neighborhood }))}
                placeholder="Neighborhood"
              />
              <Text style={styles.fieldLabel}>Property journey</Text>
              <View style={styles.chipRow}>
                <FilterChip
                  label="Any"
                  selected={!draft.transactionType}
                  onPress={() => setDraft((current) => ({ ...current, transactionType: '' }))}
                />
                <FilterChip
                  label="Buy"
                  selected={draft.transactionType === 'sale'}
                  onPress={() => setDraft((current) => ({
                    ...current,
                    transactionType: 'sale',
                    pricePeriod: 'sale',
                  }))}
                />
                <FilterChip
                  label="Rent"
                  selected={draft.transactionType === 'rent'}
                  onPress={() => setDraft((current) => ({
                    ...current,
                    transactionType: 'rent',
                    pricePeriod: current.pricePeriod === 'yearly' ? 'yearly' : 'monthly',
                  }))}
                />
                <FilterChip
                  label="Stay"
                  selected={draft.transactionType === 'stay'}
                  onPress={() => setDraft((current) => ({
                    ...current,
                    transactionType: 'stay',
                    pricePeriod: 'nightly',
                  }))}
                />
              </View>
              <Text style={[styles.fieldLabel, styles.sortLabel]}>Price period</Text>
              <View style={styles.chipRow}>
                {([
                  ['sale', 'Sale'],
                  ['nightly', 'Per night'],
                  ['monthly', 'Per month'],
                  ['yearly', 'Per year'],
                ] as const).map(([pricePeriod, label]) => (
                  <FilterChip
                    key={pricePeriod}
                    label={label}
                    selected={draft.pricePeriod === pricePeriod}
                    onPress={() => setDraft((current) => ({ ...current, pricePeriod }))}
                  />
                ))}
              </View>
              <SearchField
                label="Minimum price (TZS)"
                value={draft.minPrice ?? ''}
                onChangeText={(minPrice) => setDraft((current) => ({ ...current, minPrice }))}
                placeholder="Any"
                keyboardType="numeric"
              />
              <SearchField
                label="Maximum price (TZS)"
                value={draft.maxPrice ?? ''}
                onChangeText={(maxPrice) => setDraft((current) => ({ ...current, maxPrice }))}
                placeholder="Any"
                keyboardType="numeric"
              />
              <SearchField
                label="Minimum bedrooms"
                value={draft.minBedrooms ?? ''}
                onChangeText={(minBedrooms) => setDraft((current) => ({ ...current, minBedrooms }))}
                placeholder="Any"
                keyboardType="numeric"
              />
              <SearchField
                label="Maximum bedrooms"
                value={draft.maxBedrooms ?? ''}
                onChangeText={(maxBedrooms) => setDraft((current) => ({ ...current, maxBedrooms }))}
                placeholder="Any"
                keyboardType="numeric"
              />
              <SearchField
                label="Minimum bathrooms"
                value={draft.minBathrooms ?? ''}
                onChangeText={(minBathrooms) => setDraft((current) => ({ ...current, minBathrooms }))}
                placeholder="Any"
                keyboardType="numeric"
              />
              <SearchField
                label="Minimum area (m²)"
                value={draft.minSize ?? ''}
                onChangeText={(minSize) => setDraft((current) => ({ ...current, minSize }))}
                placeholder="Any"
                keyboardType="numeric"
              />
              <SearchField
                label="Maximum area (m²)"
                value={draft.maxSize ?? ''}
                onChangeText={(maxSize) => setDraft((current) => ({ ...current, maxSize }))}
                placeholder="Any"
                keyboardType="numeric"
              />
              <Text style={[styles.fieldLabel, styles.sortLabel]}>Furnishing</Text>
              <View style={styles.chipRow}>
                {([
                  ['', 'Any'],
                  ['furnished', 'Furnished'],
                  ['partially_furnished', 'Partly furnished'],
                  ['unfurnished', 'Unfurnished'],
                ] as const).map(([furnished, label]) => (
                  <FilterChip
                    key={furnished || 'any-furnishing'}
                    label={label}
                    selected={(draft.furnished ?? '') === furnished}
                    onPress={() => setDraft((current) => ({ ...current, furnished }))}
                  />
                ))}
              </View>
              <Text style={[styles.fieldLabel, styles.sortLabel]}>Agent verification</Text>
              <View style={styles.chipRow}>
                {([
                  ['', 'Any'],
                  ['verified', 'Verified'],
                  ['unverified', 'Not verified'],
                ] as const).map(([verificationStatus, label]) => (
                  <FilterChip
                    key={verificationStatus || 'any-verification'}
                    label={label}
                    selected={(draft.verificationStatus ?? '') === verificationStatus}
                    onPress={() => setDraft((current) => ({ ...current, verificationStatus }))}
                  />
                ))}
              </View>
              <Text style={[styles.fieldLabel, styles.sortLabel]}>Amenities (all selected)</Text>
              <View style={styles.chipRow}>
                {['Parking', 'Wi-Fi', 'Swimming pool', 'Security'].map((amenity) => (
                  <FilterChip
                    key={amenity}
                    label={amenity}
                    selected={(draft.amenities ?? []).includes(amenity)}
                    onPress={() => setDraft((current) => {
                      const selected = current.amenities ?? [];
                      return {
                        ...current,
                        amenities: selected.includes(amenity)
                          ? selected.filter((item) => item !== amenity)
                          : [...selected, amenity],
                      };
                    })}
                  />
                ))}
              </View>
              <SearchField
                label="Available from (YYYY-MM-DD)"
                value={draft.availableFrom ?? ''}
                onChangeText={(availableFrom) => setDraft((current) => ({ ...current, availableFrom }))}
                placeholder="YYYY-MM-DD"
              />
              <SearchField
                label="Available until (YYYY-MM-DD)"
                value={draft.availableTo ?? ''}
                onChangeText={(availableTo) => setDraft((current) => ({ ...current, availableTo }))}
                placeholder="YYYY-MM-DD"
              />
              <Text style={[styles.fieldLabel, styles.sortLabel]}>Sort</Text>
              <View style={styles.chipRow}>
                <FilterChip
                  label="Newest"
                  selected={draft.sort === 'new'}
                  onPress={() => setDraft((current) => ({ ...current, sort: 'new' }))}
                />
                <FilterChip
                  label="Most reviewed"
                  selected={draft.sort === 'popular'}
                  onPress={() => setDraft((current) => ({ ...current, sort: 'popular' }))}
                />
                <FilterChip
                  label="Price: low to high"
                  selected={draft.sort === 'price_low'}
                  onPress={() => setDraft((current) => ({
                    ...current,
                    sort: 'price_low',
                    pricePeriod: current.pricePeriod || (
                      current.transactionType === 'sale' ? 'sale'
                        : current.transactionType === 'stay' ? 'nightly' : 'monthly'
                    ),
                  }))}
                />
                <FilterChip
                  label="Price: high to low"
                  selected={draft.sort === 'price_high'}
                  onPress={() => setDraft((current) => ({
                    ...current,
                    sort: 'price_high',
                    pricePeriod: current.pricePeriod || (
                      current.transactionType === 'sale' ? 'sale'
                        : current.transactionType === 'stay' ? 'nightly' : 'monthly'
                    ),
                  }))}
                />
                <FilterChip
                  label="Most relevant"
                  selected={draft.sort === 'relevance'}
                  onPress={() => setDraft((current) => ({ ...current, sort: 'relevance' }))}
                />
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.heroTrust}>
          <Text style={styles.heroTrustText}>✓ Verified listings</Text>
          <Text style={styles.heroTrustText}>✓ Local agents</Text>
          <Text style={styles.heroTrustText}>✓ Secure requests</Text>
        </View>
      </View>

      <Image
        accessibilityLabel="Modern home in Tanzania"
        resizeMode="cover"
        source={require('../../assets/web/makazi-go-hero.webp')}
        style={styles.heroImage}
      />

      <View style={styles.categorySection}>
        <Text style={styles.eyebrow}>Explore Makazi Go</Text>
        <Text style={styles.categoryHeading}>Find the perfect space for your needs</Text>
        <View style={styles.categoryGrid}>
          {propertyCategories.slice(1).map((category) => (
            <Pressable
              accessibilityRole="button"
              key={category.value}
              onPress={() => chooseCategory(category.value)}
              style={({ pressed }) => [styles.categoryCard, pressed && styles.cardPressed]}>
              <Image source={category.image} resizeMode="cover" style={styles.categoryImage} />
              <View pointerEvents="none" style={styles.categoryShade} />
              <View pointerEvents="none" style={styles.categoryCopy}>
                <Text style={styles.categoryTitle}>{category.title}</Text>
                <Text style={styles.categoryCaption}>{category.caption}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      <View
        onLayout={(event) => {
          resultsOffset.current = event.nativeEvent.layout.y;
        }}
        style={styles.contentSection}>
        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.eyebrow}>Current availability</Text>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Recently listed properties
            </Text>
          </View>
          <Pressable accessibilityRole="button" onPress={scrollToResults}>
            <Text style={styles.textLink}>Browse all →</Text>
          </Pressable>
        </View>
        <View style={styles.resultMeta}>
          {!loading && !error ? (
            <Text style={styles.resultCount}>{pagination.total} properties found</Text>
          ) : null}
          {filters.propertyType ? (
            <Pressable onPress={() => chooseCategory('')}>
              <Text style={styles.clearFilter}>Clear type filter</Text>
            </Pressable>
          ) : null}
        </View>
        {error ? (
          <View accessibilityRole="alert" style={styles.errorCard}>
            <Text style={styles.errorTitle}>We couldn’t load homes</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={refreshListings} style={styles.retryButton}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.siteHeader}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setMenuOpen(false);
            listRef.current?.scrollToOffset({ offset: 0, animated: true });
          }}
          style={styles.brandLockup}>
          <Image
            source={require('../../assets/web/makazi-go-icon.png')}
            style={styles.brandImage}
          />
          <Text style={styles.brandName}>
            Makazi <Text style={styles.brandAccent}>Go</Text>
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: menuOpen }}
          onPress={() => setMenuOpen((open) => !open)}
          style={({ pressed }) => [styles.menuButton, pressed && styles.pressed]}>
          <Text style={styles.menuButtonText}>{menuOpen ? 'Close' : 'Menu'}</Text>
        </Pressable>
      </View>
      {menuOpen ? (
        <View style={styles.menuPanel}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setMenuOpen(false);
              listRef.current?.scrollToOffset({ offset: 0, animated: true });
            }}
            style={styles.menuLink}>
            <Text style={styles.menuLinkText}>Explore properties</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setMenuOpen(false);
              router.push('/(tabs)/account');
            }}
            style={styles.menuLink}>
            <Text style={styles.menuLinkText}>{user ? 'Your account' : 'Sign in'}</Text>
          </Pressable>
          {user?.roles.includes('agent') ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setMenuOpen(false);
                router.push('/(tabs)/agent');
              }}
              style={styles.menuLink}>
              <Text style={styles.menuLinkText}>Agent workspace</Text>
            </Pressable>
          ) : null}
          {user?.roles.includes('administrator') ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setMenuOpen(false);
                router.push('/(tabs)/admin');
              }}
              style={styles.menuLink}>
              <Text style={styles.menuLinkText}>Admin workspace</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <FlatList
        ref={listRef}
        data={listings}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={7}
        removeClippedSubviews
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color="#087f5b" size="large" />
              <Text style={styles.emptyText}>Finding available homes…</Text>
            </View>
          ) : !error ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No homes match these filters</Text>
              <Text style={styles.emptyText}>Try a different search or location.</Text>
            </View>
          ) : undefined
        }
        ListFooterComponent={
          <View>
            {pagination.hasNext ? (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: loadingMore }}
                disabled={loadingMore}
                onPress={loadMoreListings}
                style={({ pressed }) => [styles.loadMoreButton, pressed && styles.pressed]}>
                {loadingMore ? (
                  <ActivityIndicator color="#087f5b" />
                ) : (
                  <Text style={styles.loadMoreText}>Load more properties</Text>
                )}
              </Pressable>
            ) : null}
            <HomeFooter
              onAccount={() => router.push('/(tabs)/account')}
              onBrowse={scrollToResults}
            />
          </View>
        }
        onEndReached={loadMoreListings}
        onEndReachedThreshold={0.45}
        refreshControl={
          <RefreshControl
            onRefresh={refreshListings}
            refreshing={refreshing}
            tintColor="#087f5b"
          />
        }
        renderItem={({ item }) => (
          <ListingCard listing={item} user={user} onSavedChange={updateSavedState} />
        )}
      />
    </SafeAreaView>
  );
}

function SearchField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'numeric';
}) {
  return (
    <View style={styles.formField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#52655a"
        style={styles.input}
        value={value}
      />
    </View>
  );
}

function CategorySymbol({ propertyType }: { propertyType: string }) {
  if (propertyType === 'apartment') {
    return (
      <SymbolView
        name={{ ios: 'building.2.fill', android: 'apartment', web: 'apartment' }}
        tintColor="#ffffff"
        size={19}
      />
    );
  }
  if (propertyType === 'land') {
    return (
      <SymbolView
        name={{ ios: 'leaf.fill', android: 'landscape', web: 'landscape' }}
        tintColor="#ffffff"
        size={19}
      />
    );
  }
  if (propertyType === 'hotel') {
    return (
      <SymbolView
        name={{ ios: 'bed.double.fill', android: 'hotel', web: 'hotel' }}
        tintColor="#ffffff"
        size={19}
      />
    );
  }
  if (propertyType === 'commercial') {
    return (
      <SymbolView
        name={{ ios: 'storefront.fill', android: 'store', web: 'store' }}
        tintColor="#ffffff"
        size={19}
      />
    );
  }
  return (
    <SymbolView
      name={{ ios: 'house.fill', android: 'home', web: 'home' }}
      tintColor="#ffffff"
      size={19}
    />
  );
}

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.selectedChip,
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.chipText, selected && styles.selectedChipText]}>{label}</Text>
    </Pressable>
  );
}

function ListingCard({
  listing,
  user,
  onSavedChange,
}: {
  listing: ListingSummary;
  user: SessionUser | null;
  onSavedChange: (listingId: number, saved: boolean) => void;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(listing.saved === true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setSaved(listing.saved === true);
  }, [listing.saved]);
  const imageUri = resolveMediaUrl(listing.coverUrl, 900);
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
  const propertyLabel = listing.propertyType
    ? listing.propertyType.replace(/_/g, ' ')
    : 'Property';
  const toggleSaved = async () => {
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
    if (saving) return;
    const nextSaved = !saved;
    setSaving(true);
    try {
      await setListingSaved(listing.id, nextSaved);
      setSaved(nextSaved);
      onSavedChange(listing.id, nextSaved);
    } catch (requestError: unknown) {
      Alert.alert(
        'Could not update saved properties',
        requestError instanceof Error ? requestError.message : 'Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.card}>
      <Link href={{ pathname: '/listing', params: { id: String(listing.id) } }} asChild>
        <Pressable
          accessibilityLabel={`View ${listing.title}${listing.city ? ` in ${listing.city}` : ''}`}
          accessibilityRole="button"
          style={({ pressed }) => [styles.cardContent, pressed && styles.cardPressed]}>
          <View style={styles.coverWrap}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} resizeMode="cover" style={styles.cover} />
            ) : (
              <View style={[styles.cover, styles.coverPlaceholder]}>
                <Text style={styles.placeholderText}>Makazi Go</Text>
              </View>
            )}
            <Text style={styles.typeLabel}>{propertyLabel}</Text>
          </View>
          <View style={styles.cardBody}>
            <Text numberOfLines={1} style={styles.location}>
              {[listing.city, listing.neighborhood].filter(Boolean).join(' · ') || 'Location not listed'}
            </Text>
            <Text numberOfLines={2} style={styles.cardTitle}>{listing.title}</Text>
            <Text numberOfLines={1} style={styles.facts}>
              {[listing.structureType, listing.bedrooms ? `${listing.bedrooms} bedrooms` : null]
                .filter(Boolean)
                .join(' · ') || propertyLabel}
            </Text>
            {listing.propertyVerificationStatus === 'verified' ? (
              <Text style={styles.facts}>Makazi Go property checks complete</Text>
            ) : null}
            <Text style={styles.price}>
              {price !== null && period
                ? `${listing.currency || 'TZS'} ${price.toLocaleString()} / ${period}`
                : 'Contact agent'}
            </Text>
          </View>
        </Pressable>
      </Link>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: saved, disabled: saving }}
        disabled={saving}
        onPress={() => void toggleSaved()}
        style={styles.saveButton}>
        <Text style={styles.saveButtonText}>
          {saving ? 'Saving…' : saved ? 'Saved' : 'Save property'}
        </Text>
      </Pressable>
    </View>
  );
}

function HomeFooter({ onAccount, onBrowse }: { onAccount: () => void; onBrowse: () => void }) {
  return (
    <View style={styles.homeFooter}>
      <View style={styles.trustSection}>
        <Image
          accessibilityLabel="Family finding their next place to call home"
          resizeMode="cover"
          source={require('../../assets/web/makazi-go-family.webp')}
          style={styles.trustImage}
        />
        <View style={styles.trustCopy}>
          <Text style={styles.eyebrow}>Real people. Real properties.</Text>
          <Text accessibilityRole="header" style={styles.trustTitle}>
            The right place{'\n'}for every stage of life.
          </Text>
          <View style={styles.benefitGrid}>
            <Benefit symbol="⌂" title="Wide range of properties">
              From family homes to places to grow a business.
            </Benefit>
            <Benefit symbol="✓" title="Verified and secure listings">
              Clear details and a direct path to the responsible agent.
            </Benefit>
            <Benefit symbol="↔" title="Flexible options">
              Short stays, long-term rentals, and property enquiries.
            </Benefit>
            <Benefit symbol="◉" title="Support from local professionals">
              Ask the agent about availability, viewings, and terms.
            </Benefit>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={onBrowse}
            style={({ pressed }) => [styles.footerCta, pressed && styles.pressed]}>
            <Text style={styles.searchButtonText}>Browse properties</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.howSection}>
        <Text style={styles.eyebrow}>A clear path forward</Text>
        <Text accessibilityRole="header" style={styles.howTitle}>Search. Compare. Connect.</Text>
        <HowStep number="01" title="Choose what fits">
          Filter by property type, place, and rental term.
        </HowStep>
        <HowStep number="02" title="Review the details">
          Check pricing, media, and the responsible local agent.
        </HowStep>
        <HowStep number="03" title="Make an informed request">
          Request a stay or contact the agent about property terms.
        </HowStep>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerBrand}>
          <Image source={require('../../assets/web/makazi-go-icon.png')} style={styles.footerLogo} />
          <Text style={styles.footerBrandText}>
            Makazi <Text style={styles.footerAccent}>Go</Text>
          </Text>
        </View>
        <Text style={styles.footerDescription}>Find your place. Make your move.</Text>
        <View style={styles.footerLinks}>
          <Pressable accessibilityRole="button" onPress={onBrowse}>
            <Text style={styles.footerLink}>Browse properties</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onAccount}>
            <Text style={styles.footerLink}>Sign in</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function Benefit({
  symbol,
  title,
  children,
}: {
  symbol: string;
  title: string;
  children: string;
}) {
  return (
    <View style={styles.benefit}>
      <Text style={styles.benefitSymbol}>{symbol}</Text>
      <View style={styles.benefitCopy}>
        <Text style={styles.benefitTitle}>{title}</Text>
        <Text style={styles.benefitDescription}>{children}</Text>
      </View>
    </View>
  );
}

function HowStep({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: string;
}) {
  return (
    <View style={styles.howStep}>
      <Text style={styles.stepNumber}>{number}</Text>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepDescription}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  siteHeader: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#dce6e0',
    backgroundColor: '#ffffff',
  },
  brandLockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  brandImage: {
    width: 36,
    height: 36,
    borderRadius: 5,
  },
  brandName: {
    color: '#062b22',
    fontSize: 21,
    fontWeight: '800',
  },
  brandAccent: {
    color: '#20c98b',
  },
  menuButton: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: '#dce6e0',
    borderRadius: 4,
  },
  menuButtonText: {
    color: '#102b24',
    fontSize: 13,
    fontWeight: '700',
  },
  menuPanel: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#dce6e0',
    backgroundColor: '#ffffff',
  },
  menuLink: {
    paddingVertical: 4,
  },
  menuLinkText: {
    color: '#40584e',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 0,
    backgroundColor: '#ffffff',
  },
  quickNav: {
    minHeight: 68,
    justifyContent: 'center',
    backgroundColor: '#0b3b2e',
  },
  quickNavContent: {
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 12,
  },
  quickNavItem: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  quickNavText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 38,
    paddingBottom: 24,
    backgroundColor: '#062b22',
  },
  heroEyebrow: {
    marginBottom: 10,
    color: '#5de0aa',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 40,
    lineHeight: 42,
    fontWeight: '800',
    letterSpacing: -1,
  },
  heroAccent: {
    color: '#45d5a0',
    fontSize: 40,
    lineHeight: 42,
    fontWeight: '800',
  },
  heroDescription: {
    marginTop: 12,
    color: '#d3e6dc',
    fontSize: 15,
    lineHeight: 23,
  },
  searchPanel: {
    gap: 10,
    marginTop: 22,
    padding: 12,
    borderRadius: 5,
    backgroundColor: '#ffffff',
  },
  formField: {
    gap: 5,
  },
  fieldLabel: {
    color: '#102b24',
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    minHeight: 43,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#dce6e0',
    borderRadius: 4,
    color: '#102b24',
    backgroundColor: '#ffffff',
    fontSize: 14,
  },
  selectButton: {
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#dce6e0',
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  selectText: {
    color: '#102b24',
    fontSize: 14,
  },
  selectChevron: {
    color: '#61736c',
    fontSize: 18,
  },
  selectOptions: {
    borderWidth: 1,
    borderColor: '#dce6e0',
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  selectOption: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  selectedSelectText: {
    color: '#087f5b',
    fontWeight: '700',
  },
  searchButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    paddingHorizontal: 14,
    borderRadius: 4,
    backgroundColor: '#087f5b',
  },
  searchButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  saveSearchButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#b7cec2',
    borderRadius: 4,
  },
  saveSearchButtonText: {
    color: '#087f5b',
    fontSize: 13,
    fontWeight: '700',
  },
  saveSearchMessage: {
    color: '#52655a',
    fontSize: 12,
    textAlign: 'center',
  },
  moreFiltersButton: {
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  moreFiltersText: {
    color: '#087f5b',
    fontSize: 12,
    fontWeight: '700',
  },
  advancedFilters: {
    gap: 9,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#dce6e0',
  },
  sortLabel: {
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  chip: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: '#dce6e0',
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  selectedChip: {
    borderColor: '#087f5b',
    backgroundColor: '#e8f3ec',
  },
  chipText: {
    color: '#52655a',
    fontSize: 12,
    fontWeight: '600',
  },
  selectedChipText: {
    color: '#087f5b',
  },
  heroTrust: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 15,
  },
  heroTrustText: {
    color: '#d6ebe1',
    fontSize: 11,
    fontWeight: '700',
  },
  heroImage: {
    width: '100%',
    height: 250,
    backgroundColor: '#0b3b2e',
  },
  categorySection: {
    paddingHorizontal: 16,
    paddingTop: 34,
    paddingBottom: 12,
  },
  eyebrow: {
    marginBottom: 8,
    color: '#087f5b',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  categoryHeading: {
    maxWidth: 380,
    marginBottom: 17,
    color: '#102b24',
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '800',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  categoryCard: {
    width: '48%',
    height: 190,
    overflow: 'hidden',
    backgroundColor: '#0a3429',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  categoryShade: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    height: '58%',
    backgroundColor: 'rgba(3, 31, 23, 0.62)',
  },
  categoryCopy: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    left: 10,
    gap: 2,
  },
  categoryTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  categoryCaption: {
    color: '#e1eee8',
    fontSize: 10,
    lineHeight: 14,
  },
  contentSection: {
    paddingHorizontal: 16,
    paddingTop: 34,
    paddingBottom: 10,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#102b24',
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '800',
  },
  textLink: {
    paddingBottom: 3,
    color: '#087f5b',
    fontSize: 13,
    fontWeight: '700',
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  resultCount: {
    color: '#61736c',
    fontSize: 13,
  },
  loadMoreButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#b7cec2',
    borderRadius: 4,
  },
  loadMoreText: {
    color: '#087f5b',
    fontSize: 14,
    fontWeight: '700',
  },
  clearFilter: {
    color: '#087f5b',
    fontSize: 12,
    fontWeight: '700',
  },
  errorCard: {
    marginBottom: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f2c7bf',
    borderRadius: 4,
    backgroundColor: '#fff8f6',
  },
  errorTitle: {
    color: '#7b261c',
    fontSize: 16,
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
    marginTop: 9,
    paddingVertical: 6,
  },
  retryText: {
    color: '#087f5b',
    fontWeight: '700',
  },
  emptyState: {
    minHeight: 145,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
    paddingVertical: 28,
  },
  emptyTitle: {
    color: '#102b24',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 8,
    color: '#52655a',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  card: {
    overflow: 'hidden',
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#dce6e0',
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  cardContent: {
    flex: 1,
  },
  cardPressed: {
    opacity: 0.9,
  },
  saveButton: {
    minHeight: 40,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    marginHorizontal: 15,
    marginBottom: 14,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: '#b8d7c2',
    borderRadius: 10,
    backgroundColor: '#f4faf6',
  },
  saveButtonText: {
    color: '#176b48',
    fontSize: 13,
    fontWeight: '700',
  },
  coverWrap: {
    position: 'relative',
    backgroundColor: '#f3f7f4',
  },
  cover: {
    width: '100%',
    height: 230,
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#087f5b',
    fontSize: 18,
    fontWeight: '800',
  },
  typeLabel: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 3,
    overflow: 'hidden',
    color: '#102b24',
    backgroundColor: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  cardBody: {
    padding: 15,
  },
  location: {
    marginBottom: 5,
    color: '#61736c',
    fontSize: 13,
  },
  cardTitle: {
    marginVertical: 5,
    color: '#102b24',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
  },
  facts: {
    color: '#61736c',
    fontSize: 13,
  },
  price: {
    marginTop: 12,
    color: '#062b22',
    fontSize: 15,
    fontWeight: '800',
  },
  homeFooter: {
    paddingTop: 20,
  },
  trustSection: {
    marginHorizontal: 16,
    marginBottom: 30,
    backgroundColor: '#f1f6f2',
  },
  trustImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#dce6e0',
  },
  trustCopy: {
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  trustTitle: {
    marginBottom: 22,
    color: '#082d23',
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '800',
  },
  benefitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 23,
  },
  benefit: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
  },
  benefitSymbol: {
    width: 25,
    height: 25,
    overflow: 'hidden',
    borderRadius: 13,
    color: '#ffffff',
    backgroundColor: '#087f5b',
    fontSize: 13,
    lineHeight: 25,
    textAlign: 'center',
    fontWeight: '800',
  },
  benefitCopy: {
    flex: 1,
    gap: 3,
  },
  benefitTitle: {
    color: '#12392d',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  benefitDescription: {
    color: '#61736c',
    fontSize: 10,
    lineHeight: 14,
  },
  footerCta: {
    minHeight: 43,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 4,
    backgroundColor: '#087f5b',
  },
  howSection: {
    paddingHorizontal: 20,
    paddingTop: 34,
    paddingBottom: 40,
    backgroundColor: '#f3f7f4',
  },
  howTitle: {
    marginBottom: 22,
    color: '#102b24',
    fontSize: 26,
    lineHeight: 31,
    fontWeight: '800',
  },
  howStep: {
    paddingTop: 13,
    paddingBottom: 16,
    borderTopWidth: 2,
    borderTopColor: '#087f5b',
  },
  stepNumber: {
    color: '#087f5b',
    fontSize: 12,
    fontWeight: '800',
  },
  stepTitle: {
    marginTop: 7,
    color: '#102b24',
    fontSize: 16,
    fontWeight: '700',
  },
  stepDescription: {
    marginTop: 4,
    color: '#61736c',
    fontSize: 13,
    lineHeight: 19,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 25,
    backgroundColor: '#062b22',
  },
  footerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerLogo: {
    width: 32,
    height: 32,
    borderRadius: 4,
  },
  footerBrandText: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: '800',
  },
  footerAccent: {
    color: '#20c98b',
  },
  footerDescription: {
    marginTop: 12,
    color: '#e3f1ea',
    fontSize: 13,
  },
  footerLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    marginTop: 17,
  },
  footerLink: {
    color: '#e3f1ea',
    fontSize: 13,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.78,
  },
});
