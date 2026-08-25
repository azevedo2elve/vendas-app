import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import type { NativeStackScreenProps, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { database } from '@/database';
import Client from '@/database/models/Client';
import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { OrderProgressBar } from '@/components/OrderProgressBar';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SearchBar } from '@/components/SearchBar';
import { useOrderDraft } from '@/hooks/useOrderDraft';
import type { OrderDraftStackParamList, RootStackParamList } from '@/navigation/types';
import { colors, radii, shadows, spacing } from '@/theme';
import { maskCpfCnpj, maskPhone } from '@/utils/masks';

type Props = NativeStackScreenProps<OrderDraftStackParamList, 'OrderSelectClient'>;

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

function OrderSelectClientScreenBase({ navigation, clients, onSearchChange }: ListProps) {
  const { setClient } = useOrderDraft();

  function handleSelect(client: Client) {
    setClient(client.id, client.name);
    navigation.navigate('OrderItems');
  }

  function handleNewClient() {
    const parentNavigation = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
    parentNavigation?.navigate('ClientForm', undefined);
  }

  return (
    <View style={styles.container}>
      <OrderProgressBar step={1} />

      <View style={styles.content}>
        <View style={styles.searchContainer}>
          <Text style={styles.heading}>Selecione o cliente</Text>
          <SearchBar placeholder="Buscar por nome ou CPF/CNPJ" onDebouncedChange={onSearchChange} />
        </View>

        <FlatList
          data={clients}
          keyExtractor={(item) => item.id}
          contentContainerStyle={clients.length === 0 ? styles.emptyContent : styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => handleSelect(item)} activeOpacity={0.7}>
              <Avatar name={item.name} />
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardSubtitle}>
                  {maskCpfCnpj(item.document)} · {maskPhone(item.phone)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.slate300} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title="Nenhum cliente encontrado"
              message="Cadastre um cliente para iniciar uma ordem de venda."
            />
          }
        />

        <View style={styles.footer}>
          <PrimaryButton
            label="Cadastrar novo cliente"
            variant="outline"
            icon="person-add-outline"
            onPress={handleNewClient}
          />
        </View>
      </View>
    </View>
  );
}

const enhance = withObservables(['searchQuery'], ({ searchQuery }: { searchQuery: string }) => ({
  clients: observeClients(searchQuery),
}));

const EnhancedClientList = enhance(OrderSelectClientScreenBase);

export function OrderSelectClientScreen({ navigation, route }: Props) {
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
    maxWidth: 720,
    alignSelf: 'center',
  },
  searchContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
  },
  heading: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
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
    color: colors.textMuted,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
