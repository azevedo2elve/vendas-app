import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '@/theme';

type SearchBarProps = {
  placeholder?: string;
  onDebouncedChange: (value: string) => void;
  debounceMs?: number;
};

export function SearchBar({ placeholder, onDebouncedChange, debounceMs = 300 }: SearchBarProps) {
  const [value, setValue] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => onDebouncedChange(value), debounceMs);
    return () => clearTimeout(timeout);
  }, [value, debounceMs, onDebouncedChange]);

  return (
    <View style={styles.container}>
      <Ionicons name="search" size={18} color={colors.slate400} style={styles.icon} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.slate400}
        value={value}
        onChangeText={setValue}
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="while-editing"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
  },
  icon: {
    marginRight: spacing.xs,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
});
