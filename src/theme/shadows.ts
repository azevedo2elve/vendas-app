import { Platform } from 'react-native';
import { colors } from './colors';

function shadow(elevation: number, opacity: number, radius: number, height: number) {
  return Platform.select({
    android: { elevation },
    default: {
      shadowColor: colors.navy900,
      shadowOffset: { width: 0, height },
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
  });
}

export const shadows = {
  card: shadow(2, 0.06, 8, 2),
  raised: shadow(4, 0.1, 12, 3),
  floating: shadow(6, 0.16, 16, 4),
} as const;
