import { router } from 'expo-router';
import KassaBackground from '@/components/KassaBackground';
import React ,{useState} from "react";
import { 
    View, 
    Text, 
    StyleSheet, 
    Image,
    TextInput,
    Pressable,
    Alert,
    ScrollView,
} from "react-native";
import {SymbolView} from "expo-symbols";
import { useKassaSession, type KassaScope } from '@/components/kassa-demo/api';

export default function LoginScreen() {
    const[showPassword, setShowPassword] =useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [choices, setChoices] = useState<KassaScope[]>([]);
    const session = useKassaSession();
    const signIn = async () => {
      if (submitting) return;
      setSubmitting(true);
      try {
        const options = await session.signIn(email, password);
        if (options.length === 1) router.replace('/cashier');
        else setChoices(options);
      } catch (error) {
        Alert.alert('Unable to sign in', error instanceof Error ? error.message : 'Try again.');
      } finally { setSubmitting(false); }
    };
  return (
 <KassaBackground>
   <ScrollView
  style={styles.container}
  contentContainerStyle={styles.scrollContent}
  keyboardShouldPersistTaps="handled"
  showsVerticalScrollIndicator={false}
>

     <View style={styles.logoContainer}>
     <Image
      source={require("../../assets/images/logo.png")}
      style={styles.logo}
      resizeMode="contain"
     />
     <Text style={styles.brandName}>KASSA</Text>
     </View>
      <Text style={styles.heading}>Welcome back</Text>
      <Text style={styles.subtitle}>
        Enter your details to access your dashboard.
      </Text>


<View style={styles.formContainer}>
  {/* Email input */}
  <Text style={styles.label}>Email or phone number</Text>
  <TextInput
    style={styles.input}
    placeholder="Enter your email address"
    value={email}
    onChangeText={setEmail}
    placeholderTextColor="#9CA3AF"
    autoCapitalize="none"
    keyboardType="email-address"
  />

  {/* Password input */}
  
<View style={styles.passwordContainer}>
  <TextInput
    style={[styles.input, styles.passwordInput]}
    placeholder="Enter your password"
    value={password}
    onChangeText={setPassword}
    placeholderTextColor="#9CA3AF"
    secureTextEntry={!showPassword}
  />

  <Pressable
    style={styles.eyeButton}
    onPress={() => setShowPassword(!showPassword)}
    accessibilityRole="button"
    accessibilityLabel={
      showPassword ? "Hide password" : "Show password"
    }
  >
    <SymbolView
      name={
        showPassword
          ? {
              ios: "eye.slash",
              android: "visibility_off",
              web: "visibility_off",
            }
          : {
              ios: "eye",
              android: "visibility",
              web: "visibility",
            }
      }
      size={22}
      tintColor="#0F6E56"
    />
  </Pressable>
</View>

 
{/* Forgot Password */}
<Pressable
  style={styles.forgotPasswordContainer}
  onPress={() =>
    Alert.alert(
      "Forgot Password",
      "We'll set up password recovery later."
    )
  }
>
  <Text style={styles.forgotPassword}>
    Forgot password?
  </Text>
</Pressable>

{/* Sign In Button */}
<Pressable
  style={styles.signInButton}
  onPress={() => { void signIn(); }}
  disabled={submitting}
>
  <Text style={styles.signInText}>
    {submitting ? 'Signing in…' : 'Sign In'}
  </Text>
</Pressable>

{choices.length > 1 && (
  <View style={styles.branchChoices}>
    <Text style={styles.branchTitle}>Choose your assigned branch</Text>
    {choices.map(choice => (
      <Pressable
        key={choice.businessId + ':' + choice.branchId}
        style={styles.branchChoice}
        onPress={() => { session.selectScope(choice); router.replace('/cashier'); }}
      >
        <Text style={styles.branchChoiceText}>{choice.businessName} • {choice.branchName}</Text>
      </Pressable>
    ))}
  </View>
)}
  
{/* Sign Up Section */}
<View style={styles.signUpContainer}>
  <Text style={styles.signUpText}>
    New to Kassa?
  </Text>

  <Pressable
    onPress={() =>
      router.push("/cashier/sign-up")
    }
  >
    <Text style={styles.signUpLink}>
      {"\n"}Create business account
    </Text>
  </Pressable>
</View>

</View>
  
{/* Login Screen Footer */}
<Text style={styles.footer}>
  © Kassa <View style={styles.dot} /> Secure cashier access
</Text>


    </ScrollView>
 </KassaBackground>
  );
}

const styles = StyleSheet.create({
  branchChoices: { marginTop: 17, gap: 8 },
  branchTitle: { color: '#111827', fontWeight: '700', fontSize: 20 },
  branchChoice: { padding: 12, borderColor: '#D6EAE1', borderWidth: 1, borderRadius: 9, backgroundColor: '#EAF5F0' },
  branchChoiceText: { color: '#0F6E56', fontWeight: '700', fontSize: 14 },
  container: {
    flex: 1,
  },

  scrollContent: {
  flexGrow: 1,
  paddingHorizontal: 32,
  paddingTop: 65,
  paddingBottom: 24,
 },

  heading: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#111827",
  },

  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 12,
  },
  logoContainer: {
  alignItems: "center",
  marginBottom: 60,
},

logo: {
  width: 70,
  height: 70,
},

brandName: {
  fontSize: 30,
  fontWeight: "bold",
  color: "#0F6E56",
  marginTop: 8,
},


formContainer: {
  marginTop: 40,
},

label: {
  fontSize: 14,
  fontWeight: "bold",
  color: "#374151",
  marginBottom: 10,
},

input: {
  height: 56,
  borderWidth: 1,
  borderColor: "#D1D5DB",
  borderRadius: 10,
  paddingHorizontal: 16,
  fontSize: 14,
  color: "#111827",
  marginBottom: 24,
  backgroundColor: "#FFFFFF",
},


passwordContainer: {
  position: "relative",
},

passwordInput: {
  paddingRight: 55,
},

eyeButton: {
  position: "absolute",
  right: 10,
  top: 0,
  width: 44,
  height: 56,
  justifyContent: "center",
  alignItems: "center",
},


forgotPasswordContainer: {
  alignSelf: "flex-end",
  marginBottom: 24,
},

forgotPassword: {
  fontSize: 14,
  fontWeight: "bold",
  color: "#0F6E56",
},

signInButton: {
  backgroundColor: "#0F6E56",
  height: 56,
  borderRadius: 10,
  justifyContent: "center",
  alignItems: "center",
},

signInText: {
  color: "#FFFFFF",
  fontSize: 14,
  fontWeight: "bold",
},


circle: {
  position: "absolute",
  borderRadius: 999,
  backgroundColor: "#E8F3EF",
},

circleTop: {
  width: 300,
  height: 300,
  top: -130,
  right: -170,
},

circleBottom: {
  width: 350,
  height: 350,
  bottom: -200,
  left: -180,
},

signUpContainer: {
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  marginTop: 30,
  gap:1,
},

signUpText: {
  fontSize: 14,
  color: "#6B7280",
},

signUpLink: {
  fontSize: 14,
  fontWeight: "bold",
  color: "#0F6E56",
},

dot: {
  width: 4,
  height: 4,
  borderRadius: 4,
  backgroundColor: "#9CA3AF",
},

footer: {
  fontSize: 14,
  color: "#9CA3AF",
  textAlign: "center",
  marginTop: 60,
  marginBottom: 20,
},

});
