import { useEffect, useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

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
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      placeholderTextColor="#94A3B8"
      value={value}
      onChangeText={setValue}
      autoCorrect={false}
      autoCapitalize="none"
      clearButtonMode="while-editing"
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
});
