
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

export default function LoginScreen() {
    const[showPassword, setShowPassword] =useState(false);
  return (
   <ScrollView
  style={styles.container}
  contentContainerStyle={styles.scrollContent}
  keyboardShouldPersistTaps="handled"
  showsVerticalScrollIndicator={false}
>

{/* Background decorative circles */}
<View
  pointerEvents="none"
  style={[styles.circle, styles.circleTop]}
/>

<View
  pointerEvents="none"
  style={[styles.circle, styles.circleBottom]}
/>

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
        Sign in to your cashier account to start selling.
      </Text>


<View style={styles.formContainer}>
  {/* Email input */}
  <Text style={styles.label}>Email or phone number</Text>
  <TextInput
    style={styles.input}
    placeholder="Enter your email or phone number"
    placeholderTextColor="#9CA3AF"
    autoCapitalize="none"
    keyboardType="email-address"
  />

  {/* Password input */}
  
<View style={styles.passwordContainer}>
  <TextInput
    style={[styles.input, styles.passwordInput]}
    placeholder="Enter your password"
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
  onPress={() =>
    Alert.alert(
      "Sign In",
      "We'll connect the login functionality next."
    )
  }
>
  <Text style={styles.signInText}>
    Sign In
  </Text>
</Pressable>
 

{/* Cashier Account Information */}
<View style={styles.infoBox}>
  <View style={styles.infoIcon}>
    <Text style={styles.infoIconText}>i</Text>
  </View>

  <View style={styles.infoContent}>
    <Text style={styles.infoTitle}>
      Cashier account
    </Text>

    <Text style={styles.infoDescription}>
      You'll only see sales and transactions
      assigned to your cashier role.
    </Text>
  </View>
</View>

  
{/* Sign Up Section */}
<View style={styles.signUpContainer}>
  <Text style={styles.signUpText}>
    Don't have an account?
  </Text>

  <Pressable
    onPress={() =>
      Alert.alert(
        "Sign Up",
        "We'll build the Sign Up screen next."
      )
    }
  >
    <Text style={styles.signUpLink}>
      Sign Up
    </Text>
  </Pressable>
</View>

</View>
  
{/* Login Screen Footer */}
<Text style={styles.footer}>
  © Kassa • Secure cashier access
</Text>


    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  scrollContent: {
  flexGrow: 1,
  paddingHorizontal: 32,
  paddingTop: 65,
  paddingBottom: 24,
 },

  heading: {
    fontSize: 28,
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
  fontSize: 27,
  fontWeight: "bold",
  color: "#0F6E56",
  marginTop: 8,
},


formContainer: {
  marginTop: 40,
},

label: {
  fontSize: 12,
  fontWeight: "bold",
  color: "#374151",
  marginBottom: 10,
},

input: {
  height: 52,
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
  height: 52,
  justifyContent: "center",
  alignItems: "center",
},


forgotPasswordContainer: {
  alignSelf: "flex-end",
  marginBottom: 24,
},

forgotPassword: {
  fontSize: 12,
  fontWeight: "bold",
  color: "#0F6E56",
},

signInButton: {
  backgroundColor: "#0F6E56",
  height: 52,
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


infoBox: {
  flexDirection: "row",
  alignItems: "flex-start",
  backgroundColor: "#EAF5F0",
  borderRadius: 10,
  padding: 14,
  marginTop: 32,
  borderWidth: 1,
  borderColor: "#D6EAE1",
},

infoIcon: {
  width: 26,
  height: 26,
  borderRadius: 13,
  backgroundColor: "#0F6E56",
  alignItems: "center",
  justifyContent: "center",
  marginRight: 12,
},

infoIconText: {
  color: "#FFFFFF",
  fontSize: 14,
  fontWeight: "bold",
},

infoContent: {
  flex: 1,
},

infoTitle: {
  fontSize: 12,
  fontWeight: "bold",
  color: "#174B3D",
  marginBottom: 6,
},

infoDescription: {
  fontSize: 11,
  color: "#4B635D",
  lineHeight: 17,
},


signUpContainer: {
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  marginTop: 30,
  gap: 6,
},

signUpText: {
  fontSize: 12,
  color: "#6B7280",
},

signUpLink: {
  fontSize: 12,
  fontWeight: "bold",
  color: "#0F6E56",
},

footer: {
  fontSize: 10,
  color: "#9CA3AF",
  textAlign: "center",
  marginTop: 60,
  marginBottom: 20,
},

});
