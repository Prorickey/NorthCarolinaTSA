import {
  View,
  Text,
  TextInput,
  Image,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useState } from "react";
import { Link, router } from "expo-router";
import { useSession } from "../context/authContext";
import { ThemedText } from "@/components/ThemedText";
import NctsaLogo from "../assets/images/nctsa_high_res.png";

export default function LoginScreen() {
  const [studentId, setStudentId] = useState("");
  const [schoolVerification, setSchoolVerification] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { signIn } = useSession();

  const isDisabled = studentId === "" || schoolVerification === "";

  function login() {
    if (!isDisabled) {
      setError(null);
      signIn(studentId, schoolVerification)
        .then(() => router.replace("/"))
        .catch((err) => {
          setError(err instanceof Error ? err.message : "An error occurred");
        });
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.container]}>
        <Image source={NctsaLogo} style={styles.logo} />

        {error != null && (
          <ThemedText style={{ color: "red" }}>{error}</ThemedText>
        )}

        <TextInput
          style={[styles.input]}
          placeholder="TSA ID"
          placeholderTextColor="#6b7280"
          value={studentId}
          onChangeText={setStudentId}
          keyboardType="numeric"
        />

        <TextInput
          style={[styles.input]}
          placeholder="Chapter ID"
          placeholderTextColor="#6b7280"
          value={schoolVerification}
          onChangeText={setSchoolVerification}
          keyboardType="numeric"
        />

        <TouchableOpacity
          style={[styles.buttonContainer, isDisabled && styles.buttonDisabled]}
          disabled={isDisabled}
          onPress={login}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>

        <Text style={[styles.termsText]}>
          By clicking continue, you agree to our{" "}
          <Text style={styles.linkText}>Terms of Service</Text> and{" "}
          <Link href="/modal" style={styles.linkText}>
            Privacy Policy
          </Link>
          .
        </Text>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logo: {
    width: "105%",
    height: 80,
    marginBottom: 24,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    marginBottom: 16,
    color: "#000",
  },
  buttonContainer: {
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#2563eb",
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#9ca3af",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  termsText: {
    color: "#6b7280",
    fontSize: 14,
    marginTop: 16,
    textAlign: "center",
  },
  linkText: {
    color: "#2563eb",
    fontWeight: "bold",
  },
});
