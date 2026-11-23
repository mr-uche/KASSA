import { Alert, Linking } from 'react-native';

export const supportPhone = (process.env.EXPO_PUBLIC_KASSA_SUPPORT_PHONE || '').trim();
export const supportEmail = (process.env.EXPO_PUBLIC_KASSA_SUPPORT_EMAIL || '').trim();
export const supportWhatsApp = (process.env.EXPO_PUBLIC_KASSA_SUPPORT_WHATSAPP || '').replace(/\D/g, '');
export const supportHours = (process.env.EXPO_PUBLIC_KASSA_SUPPORT_HOURS || '').trim();

async function open(url: string) {
  try { await Linking.openURL(url); }
  catch { Alert.alert('Unavailable', 'This option could not be opened on your device.'); }
}
export function callSupport() {
  const phone = supportPhone.replace(/[^\d+]/g, '');
  if (!phone) {
    Alert.alert('Call support', 'A support phone number has not been configured.');
    return;
  }
  void open('tel:' + phone);
}
export function whatsAppSupport() {
  if (!supportWhatsApp) {
    Alert.alert('WhatsApp support', 'A support WhatsApp number has not been configured.');
    return;
  }
  void open('https://wa.me/' + supportWhatsApp + '?text=' + encodeURIComponent('Hello KASSA Support, I need assistance.'));
}
export function emailSupport(subject = 'KASSA support request') {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) {
    Alert.alert('Email support', 'A support email address has not been configured.');
    return;
  }
  void open('mailto:' + supportEmail + '?subject=' + encodeURIComponent(subject));
}
