import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import {
  StyleSheet,
  View,
  Animated,
  Image,
  TouchableOpacity,
  Text,
} from "react-native";
import { PropsWithChildren, useEffect, useMemo, useState } from "react";
import ScrollView = Animated.ScrollView;
import {
  createStackNavigator,
  StackNavigationProp,
} from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/core";
import { useSession } from "@/context/authContext";
import TsaIcon from "@/assets/images/tsaIcon.jpeg";

interface Notification {
  id: number;
  title: string;
  description: string;
  date: Date;
  createdAt: Date;
  type: string;
}

const Stack = createStackNavigator<NotificationsStackParamList>();

const NOTIF_CATEGORY: string[] = [
  'All',
  'General',
  'Chapter',
  'Event'
];

export default function NotificationsStack() {
  return (
    <Stack.Navigator initialRouteName="Notifications">
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="NotificationDetail"
        component={NotificationDetailsScreen}
        options={{ headerTitle: "" }}
      />
    </Stack.Navigator>
  );
}

type NotificationsStackParamList = {
  Notifications: { data: Notification[] };
  NotificationDetail: { item: Notification };
};

type NotificationsScreenProps = {
  navigation: StackNavigationProp<NotificationsStackParamList, "Notifications">;
};

function NotificationsScreen({ navigation }: NotificationsScreenProps) {
  const [selectedCategory, setSelectedCategory] = useState(NOTIF_CATEGORY[0]);
  const [data, setData] = useState<Notification[]>([]);
  const { signOut, getRequestToken, session } = useSession();

  // filter notifications by category
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    try {
      return data.filter(item => {
        if (selectedCategory === 'All') return true;
        return item.type.toLowerCase() === selectedCategory.toLowerCase();
      });
    } catch (error) {
      console.error('Error filtering notifications:', error);
      return [];
    }
  }, [data, selectedCategory]);

  useEffect(() => {
    if (!session) return;

    const fetchData = async () => {
      const requestToken = await getRequestToken();
      const data = (await fetch(
        "https://nctsa-api.bedson.tech/user/notifications",
        {
          headers: {
            Authorization: requestToken != null ? requestToken : "",
            'Device': "ios"
          },
        },
      )
        .then((res) => res.json())
        .catch((err) => {
          console.error("Error fetching notifications:", err);
          signOut();
        })) as object;

      if ("error" in data) {
        console.warn("Error fetching notifications:", data);
        return;
      }

      let response = data as Notification[];

      response.map((item: Notification) => {
        item.date = new Date(item.date);
        return item;
      });

      response = response.sort((a, b) => b.date.getTime() - a.date.getTime());
      setData(response);
    };

    fetchData().catch(console.error);
    const id = setInterval(() => {
      fetchData().catch(console.error);
    }, 5000);

    return () => clearInterval(id); // Cleanup on unmount
  }, [session, getRequestToken, signOut]);

  return (
    <ThemedView style={styles.mainContainer}>\
      <View style={styles.categoryBar}>
        {NOTIF_CATEGORY.map(category => {
          const isSelected = category === selectedCategory;
          return (
            <TouchableOpacity
              key={category}
              onPress={() => setSelectedCategory(category)} 
              style={[styles.categoryButton, isSelected && styles.categoryButtonSelected]}
            >
              <Text style={[styles.categoryButtonText, isSelected && styles.categoryButtonTextSelected]}>
                {category}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <ScrollView>
        {
          filteredData.map((item, n) => (
            <View key={n}>
              <NotificationItem navigation={navigation} item={item} />
              <View style={styles.divider} />
            </View>
          ))
        }
      </ScrollView>
    </ThemedView>
  );
}

type NotificationItemProps = PropsWithChildren<{
  navigation: StackNavigationProp<NotificationsStackParamList, "Notifications">;
  item: Notification;
}>;

function NotificationDetailsScreen({
  route,
}: {
  route: RouteProp<NotificationsStackParamList, "NotificationDetail">;
}) {
  const item = route.params.item;

  return (
    <ThemedView
      style={{
        height: "100%",
        flexDirection: "column",
        gap: 4,
        backgroundColor: "#FFFFFF",
      }}
    >
      <Image
        source={TsaIcon}
        style={{
          height: 150,
          width: 150,
          marginHorizontal: "auto",
          marginVertical: 20,
        }}
      />
      <ThemedText
        style={{ width: "100%", textAlign: "center", color: "#000000" }}
      >
        {item.title}
      </ThemedText>
      <ThemedText
        style={{
          width: "100%",
          textAlign: "center",
          marginBottom: 10,
          color: "#000000",
        }}
      >
        {formatDate(item.date)}
      </ThemedText>
      <View style={styles.divider} />
      <ThemedText
        style={{ marginTop: 10, marginHorizontal: 20, color: "#000000" }}
      >
        {item.description}
      </ThemedText>
    </ThemedView>
  );
}

function NotificationItem({ navigation, item }: NotificationItemProps) {
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate("NotificationDetail", { item: item })}
    >
      <ThemedView
        style={{ ...styles.itemContainer, backgroundColor: "#FFFFFF" }}
      >
        <Image source={TsaIcon} style={styles.tsaIcon} />
        <View>
          <ThemedText style={styles.itemTitle}>{item.title}</ThemedText>
          <ThemedText style={styles.itemTime}>
            {formatDate(item.date)}
          </ThemedText>
        </View>
      </ThemedView>
    </TouchableOpacity>
  );
}

const formatDate = (date: Date) => {
  return date.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const styles = StyleSheet.create({
  mainContainer: {
    height: "100%",
    backgroundColor: "white",
  },
  // all/chapter/event nav
  categoryBar: {
    flexDirection: "row",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginHorizontal: 4,
    borderRadius: 14,
    backgroundColor: "#e0e0e0",
    alignItems: "center",
    justifyContent: "center",
    height: 36,
    width: 80,
  },
  categoryButtonSelected: {
    backgroundColor: "#007AFF",
  },
  categoryButtonText: {
    fontSize: 14,
    color: "#333",
  },
  categoryButtonTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  //notification items
  itemContainer: {
    paddingVertical: 20,
    paddingHorizontal: 15,
    flex: 1,
    flexDirection: "row",
    gap: 20,
  },
  tsaIcon: {
    height: 75,
    width: 75,
  },
  itemTitle: {
    color: "#000000",
  },
  itemTime: {
    color: "#000000",
  },
  itemDescription: {
    width: "50%",
    color: "#000000",
  },
  divider: {
    height: 1,
    backgroundColor: "#ccc",
    marginVertical: 10,
    marginHorizontal: 15,
  },
});
