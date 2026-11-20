import { Redirect } from 'expo-router';

// Earlier app builds used a More tab. Keep old in-app links functional,
// but use Profile as the single home for additional business sections.
export default function MoreRedirect() {
  return <Redirect href="/cashier/profile"/>;
}
