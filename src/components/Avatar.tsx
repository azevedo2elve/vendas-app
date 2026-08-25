import { StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '@/theme';

type AvatarProps = {
  name: string;
  size?: number;
};

const PALETTE = [colors.accent, colors.success, colors.warning, colors.info, colors.navy800];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getColorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % PALETTE.length;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function Avatar({ name, size = 44 }: AvatarProps) {
  const backgroundColor = getColorForName(name);
  const fontSize = Math.round(size * 0.38);

  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: radii.pill, backgroundColor },
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{getInitials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: colors.white,
    fontWeight: '700',
  },
});
