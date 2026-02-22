import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { loginSchema } from "@/schemas/auth";
import { signup } from "@/lib/auth";
import { useAuthStore } from "@/lib/store";

export default function SignupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(t("auth.invalidCredentials"));
      return;
    }
    setLoading(true);
    try {
      await signup(email.trim().toLowerCase(), password);
      setAuthenticated(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("already exists")) {
        setError(t("auth.emailExists"));
      } else {
        setError(msg || t("auth.invalidCredentials"));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerClassName="flex-1 justify-center px-6"
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-8 items-center">
          <Text className="text-3xl font-bold text-foreground">
            {t("auth.signUpTitle")}
          </Text>
          <Text className="mt-2 text-muted-foreground">
            {t("auth.signUpDescription")}
          </Text>
        </View>

        <View className="gap-4">
          <View>
            <Text className="mb-1 text-sm font-medium text-foreground">
              {t("auth.email")}
            </Text>
            <TextInput
              className="rounded-lg border border-input bg-background px-4 py-3 text-foreground"
              placeholder="you@example.com"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!loading}
            />
          </View>

          <View>
            <Text className="mb-1 text-sm font-medium text-foreground">
              {t("auth.password")}
            </Text>
            <TextInput
              className="rounded-lg border border-input bg-background px-4 py-3 text-foreground"
              placeholder="••••••••"
              placeholderTextColor="#9ca3af"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              editable={!loading}
            />
          </View>

          {error && (
            <Text className="text-center text-sm text-destructive">
              {error}
            </Text>
          )}

          <TouchableOpacity
            className="items-center rounded-lg bg-primary py-3"
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="font-semibold text-primary-foreground">
                {t("auth.signUpSubmit")}
              </Text>
            )}
          </TouchableOpacity>

          <View className="mt-4 flex-row justify-center">
            <Text className="text-sm text-muted-foreground">
              {t("auth.hasAccount")}{" "}
            </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-sm font-medium text-foreground underline">
                {t("auth.signIn")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
