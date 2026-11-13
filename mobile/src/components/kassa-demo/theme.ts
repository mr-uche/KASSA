export const C = {
  green: '#0F6E56',
  greenDark: '#174B3D',
  mint: '#EAF5F0',
  mintBorder: '#D6EAE1',
  background: '#F8FAF9',
  white: '#FFFFFF',
  title: '#111827',
  text: '#374151',
  muted: '#6B7280',
  faint: '#9CA3AF',
  border: '#E5E7EB',
  orange: '#B76A17',
  danger: '#AE3333',
} as const;

export const naira = (value: number) => `₦${value.toLocaleString('en-NG')}`;
