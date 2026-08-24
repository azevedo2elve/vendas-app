import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { database } from '@/database';
import Client from '@/database/models/Client';
import { EmptyState } from '@/components/EmptyState';
import { SearchBar } from '@/components/SearchBar';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useOrderDraft } from '@/hooks/useOrderDraft';
import type { OrderDraftStackParamList, RootStackParamList } from '@/navigation/types';
import { maskCpfCnpj, maskPhone } from '@/utils/masks';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

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
      <View style={styles.searchContainer}>
        <SearchBar placeholder="Buscar por nome ou CPF/CNPJ" onDebouncedChange={onSearchChange} />
      </View>

      <FlatList
        data={clients}
        keyExtractor={(item) => item.id}
        contentContainerStyle={clients.length === 0 ? styles.emptyContent : styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => handleSelect(item)}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSubtitle}>{maskCpfCnpj(item.document)}</Text>
            <Text style={styles.cardSubtitle}>{maskPhone(item.phone)}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <EmptyState
            title="Nenhum cliente encontrado"
            message="Cadastre um cliente para iniciar uma ordem de venda."
          />
        }
      />

      <View style={styles.footer}>
        <PrimaryButton label="Cadastrar novo cliente" variant="outline" onPress={handleNewClient} />
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
    backgroundColor: '#F8FAFC',
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  emptyContent: {
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#475569',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
});
