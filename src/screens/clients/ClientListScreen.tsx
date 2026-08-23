import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { database } from '@/database';
import Client from '@/database/models/Client';
import { EmptyState } from '@/components/EmptyState';
import { Fab } from '@/components/Fab';
import { SearchBar } from '@/components/SearchBar';
import type { RootStackParamList } from '@/navigation/types';
import { maskCpfCnpj, maskPhone } from '@/utils/masks';
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
          >
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardSubtitle}>{maskCpfCnpj(item.document)}</Text>
              <Text style={styles.cardSubtitle}>{maskPhone(item.phone)}</Text>
              {item.address ? <Text style={styles.cardAddress}>{item.address}</Text> : null}
            </View>
            <TouchableOpacity
              style={styles.whatsappButton}
              onPress={() => openWhatsApp(item.phone)}
              accessibilityLabel={`Abrir WhatsApp de ${item.name}`}
            >
              <Text style={styles.whatsappIcon}>💬</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <EmptyState
            title="Nenhum cliente encontrado"
            message="Toque no botão + para cadastrar o primeiro cliente."
          />
        }
      />

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
    backgroundColor: '#F8FAFC',
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 96,
    gap: 10,
  },
  emptyContent: {
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  cardInfo: {
    flex: 1,
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
  cardAddress: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  whatsappButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsappIcon: {
    fontSize: 18,
  },
});
