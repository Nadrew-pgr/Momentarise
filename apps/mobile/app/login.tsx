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
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { loginSchema } from "@momentarise/shared";
import { login } from "@/lib/auth";
import { useAuthStore } from "@/lib/store";
import { GoogleIcon, AppleIcon, GitHubIcon } from "@/components/icons/BrandIcons";

export default function LoginScreen() {
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
      await login(email.trim().toLowerCase(), password);
      setAuthenticated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.invalidCredentials"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 72 : 0}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 24 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View className="mx-auto w-full max-w-md gap-6">
            <View className="items-center">
              <Text className="text-3xl font-bold text-foreground">{t("common.appName")}</Text>
              <Text className="mt-2 text-muted-foreground">{t("auth.loginDescription")}</Text>
            </View>

            <View className="gap-4">
              <View>
                <Text className="mb-1 text-sm font-medium text-foreground">{t("auth.email")}</Text>
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
                <Text className="mb-1 text-sm font-medium text-foreground">{t("auth.password")}</Text>
                <TextInput
                  className="rounded-lg border border-input bg-background px-4 py-3 text-foreground"
                  placeholder="••••••••"
                  placeholderTextColor="#9ca3af"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="password"
                  editable={!loading}
                />
              </View>

              {error ? (
                <Text className="text-center text-sm text-destructive">{error}</Text>
              ) : null}

              <TouchableOpacity
                className="items-center rounded-lg bg-primary py-3"
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.7}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="font-semibold text-primary-foreground">{t("auth.submit")}</Text>
                )}
              </TouchableOpacity>

              <View className="my-4 flex-row items-center">
                <View className="flex-1 border-t border-border" />
                <Text className="mx-4 text-sm text-muted-foreground">{t("auth.continueWith")}</Text>
                <View className="flex-1 border-t border-border" />
              </View>

              {(
                [
                  { key: "Google", icon: <GoogleIcon size={18} /> },
                  { key: "Apple", icon: <AppleIcon size={18} color="#a3a3a3" /> },
                  { key: "GitHub", icon: <GitHubIcon size={18} color="#a3a3a3" /> },
                ] as const
              ).map(({ key, icon }) => (
                <TouchableOpacity
                  key={key}
                  className="flex-row items-center justify-center gap-3 rounded-lg border border-input py-3 opacity-50"
                  disabled
                >
                  {icon}
                  <Text className="text-sm text-muted-foreground">{t(`auth.continueWith${key}`)}</Text>
                </TouchableOpacity>
              ))}

              <View className="mt-4 flex-row justify-center">
                <Text className="text-sm text-muted-foreground">{t("auth.noAccount")} </Text>
                <TouchableOpacity onPress={() => router.push("/signup")}>
                  <Text className="text-sm font-medium text-foreground underline">{t("auth.signUp")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
