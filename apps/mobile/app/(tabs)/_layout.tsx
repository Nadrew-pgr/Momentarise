import { Pressable, View } from "react-native";
import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { Sun, Inbox, Calendar, User, Plus } from "lucide-react-native";
import { useCreateSheet } from "@/lib/store";

export default function TabLayout() {
  const { t } = useTranslation();
  const { open: openCreate } = useCreateSheet();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#171717",
        tabBarInactiveTintColor: "#a3a3a3",
        tabBarShowLabel: false,
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
          tabBarIcon: () => (
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                height: 56,
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: "#171717",
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 6,
                  elevation: 6,
                }}
              >
                <Plus size={28} color="#fff" strokeWidth={2.5} />
              </View>
            </View>
          ),
          tabBarButton: (props) => {
            const { onPress, ...rest } = props;
            return (
              <Pressable
                {...rest}
                onPress={openCreate}
                accessibilityLabel={t("pages.inbox.add")}
                accessibilityRole="button"
              />
            );
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
