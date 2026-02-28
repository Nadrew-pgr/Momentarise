import { View } from "react-native";
import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { Sun, Inbox, Calendar, User } from "lucide-react-native";
import { useCreateSheet } from "@/lib/store";
import { CreateTabIcon } from "@/components/CreateTabIcon";

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
          tabBarIcon: () => <CreateTabIcon />,
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
