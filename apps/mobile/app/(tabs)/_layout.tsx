import { View } from "react-native";
import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { useCreateSheet } from "@/lib/store";
import { Sun, Inbox, Plus, Calendar, User } from "lucide-react-native";

export default function TabLayout() {
  const { t } = useTranslation();
  const openCreateSheet = useCreateSheet((s) => s.open);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#171717",
        tabBarInactiveTintColor: "#a3a3a3",
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: t("nav.today"),
          tabBarIcon: ({ color, size }) => <Sun size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: t("nav.inbox"),
          tabBarIcon: ({ color, size }) => <Inbox size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "",
          tabBarIcon: ({ size }) => (
            <View
              style={{
                width: size + 16,
                height: size + 16,
                borderRadius: (size + 16) / 2,
                backgroundColor: "#171717",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 4,
              }}
            >
              <Plus size={size} color="#fff" strokeWidth={2.5} />
            </View>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            openCreateSheet();
          },
        }}
      />
      <Tabs.Screen
        name="timeline"
        options={{
          title: t("nav.timeline"),
          tabBarIcon: ({ color, size }) => (
            <Calendar size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: t("nav.me"),
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
