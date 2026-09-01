import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { database } from '@/database';
import Client from '@/database/models/Client';
import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { Fab } from '@/components/Fab';
import { SearchBar } from '@/components/SearchBar';
import type { RootStackParamList } from '@/navigation/types';
import { colors, radii, shadows, spacing } from '@/theme';
import { maskCpfCnpj, maskPhone } from '@/utils/masks';
import { formatClientFullAddress } from '@/utils/address';
import { openWhatsApp } from '@/utils/whatsapp';

type Props = NativeStackScreenProps<RootStackParamList, 'ClientList'>;

function observeClients(searchQuery: string) {
  const trimmed = searchQuery.trim();

  if (!trimmed) {
    return database.get<Client>('clients').query(Q.sortBy('name', Q.asc)).observe();
  }

  const like = `%${Q.sanitizeLikeString(trimmed)}%`;
  return database
    .get<Client>('clients')
    .query(Q.or(Q.where('name', Q.like(like)), Q.where('document', Q.like(like))), Q.sortBy('name', Q.asc))
    .observe();
}

type ListProps = Props & { clients: Client[]; searchQuery: string; onSearchChange: (value: string) => void };

function ClientListScreenBase({ navigation, clients, onSearchChange }: ListProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.searchContainer}>
          <SearchBar placeholder="Buscar por nome ou CPF/CNPJ" onDebouncedChange={onSearchChange} />
        </View>

        <FlatList
          data={clients}
          keyExtractor={(item) => item.id}
          contentContainerStyle={clients.length === 0 ? styles.emptyContent : styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('ClientForm', { clientId: item.id })}
              activeOpacity={0.7}
            >
              <Avatar name={item.name} />
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardSubtitle}>{maskCpfCnpj(item.document)}</Text>
                <Text style={styles.cardSubtitle}>{maskPhone(item.phone)}</Text>
                {formatClientFullAddress(item) ? (
                  <Text style={styles.cardAddress} numberOfLines={1}>
                    {formatClientFullAddress(item)}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity
                style={styles.whatsappButton}
                onPress={() => openWhatsApp(item.phone)}
                accessibilityLabel={`Abrir WhatsApp de ${item.name}`}
              >
                <Ionicons name="logo-whatsapp" size={20} color={colors.whatsapp} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title="Nenhum cliente encontrado"
              message="Toque no botão + para cadastrar o primeiro cliente."
            />
          }
        />
      </View>

      <Fab accessibilityLabel="Novo cliente" onPress={() => navigation.navigate('ClientForm', undefined)} />
    </View>
  );
}

const enhance = withObservables(['searchQuery'], ({ searchQuery }: { searchQuery: string }) => ({
  clients: observeClients(searchQuery),
}));

const EnhancedClientList = enhance(ClientListScreenBase);

export function ClientListScreen({ navigation, route }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const onSearchChange = useCallback((value: string) => setSearchQuery(value), []);

  return (
    <EnhancedClientList
      navigation={navigation}
      route={route}
      searchQuery={searchQuery}
      onSearchChange={onSearchChange}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: 820,
    alignSelf: 'center',
  },
  searchContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xs,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
    gap: spacing.sm,
  },
  emptyContent: {
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    ...shadows.card,
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: 12.5,
    color: colors.textSecondary,
  },
  cardAddress: {
    fontSize: 12,
    color: colors.textDisabled,
    marginTop: 2,
  },
  whatsappButton: {
    width: 42,
    height: 42,
    borderRadius: radii.pill,
    backgroundColor: colors.whatsappBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
