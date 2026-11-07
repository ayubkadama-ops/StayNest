import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { Text, View } from '@/components/Themed';
import { useAuth } from '@/components/AuthProvider';
import {
  getAdminUsers,
  type AdminUser,
  type AdminUserStatus,
} from '@/constants/marketplaceApi';

const userStatuses: { label: string; value: AdminUserStatus }[] = [
  { label: 'Pending', value: 'pending' },
  { label: 'Active', value: 'active' },
  { label: 'Suspended', value: 'suspended' },
  { label: 'Deleted', value: 'deleted' },
];

export default function AdminUsersScreen() {
  const { user, loading: authLoading } = useAuth();
  const isAdministrator = Boolean(user?.roles.includes('administrator'));
  const [status, setStatus] = useState<AdminUserStatus>('pending');
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (authLoading || !isAdministrator) {
      setLoading(authLoading);
      setUsers([]);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    setError(null);
    void getAdminUsers(status, appliedQuery)
      .then((result) => {
        if (active) setUsers(result);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setUsers([]);
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Administrator accounts could not be loaded.',
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
  }, [authLoading, isAdministrator, refreshKey, status, appliedQuery]);

  const refresh = () => {
    setRefreshing(true);
    setRefreshKey((key) => key + 1);
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
            Sign in with an administrator account or console credentials to inspect accounts.
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
        data={users}
        keyExtractor={(account) => String(account.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.eyebrow}>ADMIN WORKSPACE</Text>
            <Text accessibilityRole="header" style={styles.title}>People and access</Text>
            <Text style={styles.bodyText}>
              Search shared account records by name, email, or phone. This view is read-only while account-safety actions are reconciled.
            </Text>
            <View style={styles.searchRow}>
              <TextInput
                accessibilityLabel="Search accounts"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={100}
                onChangeText={setQuery}
                onSubmitEditing={() => setAppliedQuery(query.trim().slice(0, 100))}
                placeholder="Name, email, or phone"
                placeholderTextColor="#52655a"
                returnKeyType="search"
                style={styles.searchInput}
                value={query}
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => setAppliedQuery(query.trim().slice(0, 100))}
                style={styles.searchButton}>
                <Text style={styles.searchButtonText}>Search</Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              contentContainerStyle={styles.statusRow}
              showsHorizontalScrollIndicator={false}>
              {userStatuses.map((item) => (
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
            <Link href="/(tabs)/admin" asChild>
              <Pressable accessibilityRole="button" style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Admin overview</Text>
              </Pressable>
            </Link>
            {error ? (
              <View accessibilityRole="alert" style={styles.errorCard}>
                <Text style={styles.errorTitle}>Could not load accounts</Text>
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
              <Text style={styles.bodyText}>Loading accounts…</Text>
            </View>
          ) : !error ? (
            <View style={styles.empty}>
              <Text style={styles.cardTitle}>No accounts in this section</Text>
              <Text style={styles.bodyText}>Choose another status or adjust your search.</Text>
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
        renderItem={({ item }) => <AdminUserCard account={item} />}
      />
    </SafeAreaView>
  );
}

function AdminUserCard({ account }: { account: AdminUser }) {
  const name = [account.firstName, account.lastName].filter(Boolean).join(' ');
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.statusLabel}>{account.status}</Text>
        <Text style={styles.recordId}>Account #{account.id}</Text>
      </View>
      <Text style={styles.cardTitle}>{name || account.email || 'Unnamed account'}</Text>
      {account.email ? <Text style={styles.bodyText}>{account.email}</Text> : null}
      {account.phone ? <Text style={styles.bodyText}>{account.phone}</Text> : null}
      <Text style={styles.bodyText}>
        Roles: {account.roles.length > 0 ? account.roles.join(', ') : 'None assigned'}
      </Text>
      <Text style={styles.bodyText}>MFA: {account.mfaEnabled ? 'Enabled' : 'Not enabled'}</Text>
      {account.emailVerifiedAt ? <Text style={styles.bodyText}>Email verified</Text> : null}
      {account.createdAt ? <Text style={styles.bodyText}>Created {account.createdAt}</Text> : null}
      {account.lastLoginAt ? <Text style={styles.bodyText}>Last sign-in {account.lastLoginAt}</Text> : null}
    </View>
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
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  searchInput: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dce8df',
    color: '#173222',
    backgroundColor: '#ffffff',
    fontSize: 14,
  },
  searchButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#087f5b',
  },
  searchButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  statusRow: {
    gap: 8,
    paddingVertical: 16,
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
  secondaryButton: {
    alignSelf: 'flex-start',
    minHeight: 40,
    justifyContent: 'center',
    marginBottom: 14,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dce8df',
    backgroundColor: '#ffffff',
  },
  secondaryButtonText: {
    color: '#087f5b',
    fontSize: 13,
    fontWeight: '700',
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
