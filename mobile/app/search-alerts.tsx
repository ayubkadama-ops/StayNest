import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/components/AuthProvider';
import { Text, View } from '@/components/Themed';
import {
  deleteSearchAlert,
  getSearchAlerts,
  type SearchAlert,
} from '@/constants/marketplaceApi';

const filterLabels: Record<string, string> = {
  q: 'Keywords',
  location: 'Location',
  propertyType: 'Property',
  transactionType: 'Journey',
  rentalMode: 'Rental term',
  region: 'Region',
  district: 'District',
  ward: 'Ward',
  neighborhood: 'Neighborhood',
  pricePeriod: 'Price period',
  minPrice: 'Minimum price',
  maxPrice: 'Maximum price',
  minBedrooms: 'Minimum bedrooms',
  maxBedrooms: 'Maximum bedrooms',
  minBathrooms: 'Minimum bathrooms',
  minSize: 'Minimum area',
  maxSize: 'Maximum area',
  furnished: 'Furnishing',
  verificationStatus: 'Agent verification',
  amenities: 'Amenities',
  availableFrom: 'Available from',
  availableTo: 'Available until',
};

function filterSummary(filters: Record<string, unknown>): string {
  const entries = Object.entries(filters)
    .filter(([key]) => key in filterLabels)
    .map(([key, value]) => {
      const values = Array.isArray(value) ? value : [value];
      const summary = values
        .filter((item): item is string | number => typeof item === 'string' || typeof item === 'number')
        .map(String)
        .join(', ');
      return summary ? `${filterLabels[key]}: ${summary}` : null;
    })
    .filter((entry): entry is string => entry !== null);
  return entries.slice(0, 5).join(' · ');
}

export default function SearchAlertsScreen() {
  const { user, loading: sessionLoading } = useAuth();
  const [alerts, setAlerts] = useState<SearchAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);

  const loadAlerts = useCallback(async (isRefresh = false) => {
    const request = ++requestVersion.current;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const result = await getSearchAlerts();
      if (request === requestVersion.current) setAlerts(result);
    } catch (requestError: unknown) {
      if (request === requestVersion.current) {
        setError(requestError instanceof Error ? requestError.message : 'Search alerts could not be loaded.');
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
    if (user?.roles.includes('tenant')) void loadAlerts();
    else {
      requestVersion.current += 1;
      setAlerts([]);
      setLoading(false);
      setRefreshing(false);
      setError(null);
    }
  }, [loadAlerts, sessionLoading, user?.id, user?.roles]);

  const removeAlert = async (alertId: number) => {
    setDeletingId(alertId);
    setError(null);
    try {
      await deleteSearchAlert(alertId);
      setAlerts((current) => current.filter((alert) => alert.id !== alertId));
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'The search alert could not be removed.');
    } finally {
      setDeletingId(null);
    }
  };

  const confirmRemove = (alert: SearchAlert) => {
    Alert.alert(
      'Remove saved search?',
      `“${alert.name}” will no longer be tracked for matching properties.`,
      [
        { text: 'Keep search', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => void removeAlert(alert.id) },
      ],
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Stack.Screen options={{ title: 'Search alerts', headerShown: true }} />
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={(
          <RefreshControl
            enabled={user?.roles.includes('tenant') === true}
            onRefresh={() => {
              if (user?.roles.includes('tenant')) void loadAlerts(true);
            }}
            refreshing={refreshing}
            tintColor="#087f5b"
          />
        )}>
        <Text accessibilityRole="header" style={styles.title}>Search alerts</Text>
        <Text style={styles.intro}>
          Save a filtered property search from Explore to keep track of matching listings.
        </Text>

        {error ? (
          <View accessibilityRole="alert" style={styles.errorCard}>
            <Text style={styles.error}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={() => void loadAlerts()} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>Try again</Text>
            </Pressable>
          </View>
        ) : null}

        {loading || sessionLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color="#087f5b" size="large" />
            <Text style={styles.intro}>Loading search alerts…</Text>
          </View>
        ) : !user?.roles.includes('tenant') ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Tenant account required</Text>
            <Text style={styles.intro}>Sign in with a tenant account to manage saved search alerts.</Text>
          </View>
        ) : alerts.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>No saved searches yet</Text>
            <Text style={styles.intro}>
              Apply at least one filter in Explore, then choose Save this search.
            </Text>
          </View>
        ) : alerts.map((alert) => {
          const summary = filterSummary(alert.filters);
          const busy = deletingId === alert.id;
          return (
            <View key={alert.id} style={styles.card}>
              <View style={styles.alertHeader}>
                <View style={styles.alertTitleGroup}>
                  <Text style={styles.cardTitle}>{alert.name}</Text>
                  <Text style={styles.meta}>{alert.frequency} alerts · {alert.active ? 'Active' : 'Paused'}</Text>
                </View>
                <View style={[styles.statusPill, alert.active ? styles.activePill : styles.pausedPill]}>
                  <Text style={[styles.statusText, alert.active ? styles.activeText : styles.pausedText]}>
                    {alert.active ? 'Active' : 'Paused'}
                  </Text>
                </View>
              </View>
              {summary ? <Text style={styles.filters}>{summary}</Text> : null}
              <Pressable
                accessibilityRole="button"
                disabled={deletingId !== null}
                onPress={() => confirmRemove(alert)}
                style={[styles.removeButton, deletingId !== null && styles.disabled]}>
                {busy ? <ActivityIndicator color="#a12622" /> : <Text style={styles.removeText}>Remove search</Text>}
              </Pressable>
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
  card: { marginTop: 16, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#dce8df', backgroundColor: '#fff' },
  alertHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  alertTitleGroup: { flex: 1 },
  cardTitle: { color: '#173222', fontSize: 17, lineHeight: 22, fontWeight: '800' },
  meta: { marginTop: 5, color: '#61736c', fontSize: 13 },
  statusPill: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  activePill: { backgroundColor: '#e5f4ea' },
  pausedPill: { backgroundColor: '#f1f0ec' },
  statusText: { fontSize: 11, fontWeight: '700' },
  activeText: { color: '#176b48' },
  pausedText: { color: '#6f6552' },
  filters: { marginTop: 12, color: '#52655a', fontSize: 13, lineHeight: 20 },
  removeButton: { minHeight: 42, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', marginTop: 14, paddingHorizontal: 13, borderRadius: 10, borderWidth: 1, borderColor: '#efc3c0', backgroundColor: '#fff8f7' },
  removeText: { color: '#a12622', fontSize: 13, fontWeight: '700' },
  secondaryButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', marginTop: 12, paddingHorizontal: 14, borderRadius: 11, borderWidth: 1, borderColor: '#b8d7c2', backgroundColor: '#f4faf6' },
  secondaryText: { color: '#176b48', fontSize: 14, fontWeight: '700' },
  errorCard: { marginTop: 16, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#f2b8b5', backgroundColor: '#fff7f6' },
  error: { color: '#a12622', fontSize: 14, lineHeight: 20 },
  disabled: { opacity: 0.6 },
  centered: { alignItems: 'center', padding: 30 },
});
