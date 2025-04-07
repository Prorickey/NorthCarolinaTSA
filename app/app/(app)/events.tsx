import { Animated, SectionList, StyleSheet, TouchableOpacity, View, Text } from "react-native";
import { ThemedView } from "@/components/ThemedView";
import ScrollView = Animated.ScrollView;
import React, { PropsWithChildren, useEffect, useState } from "react";
import { ThemedText } from "@/components/ThemedText";
import { TextInput } from "react-native";
import { useSession } from "../../context/authContext";
import {
  createStackNavigator,
  StackNavigationProp,
} from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { Feather, FontAwesome } from '@expo/vector-icons';
import { AgendaItem, AgendaItemView, groupEventsByStartTime } from ".";

const styles = StyleSheet.create({
  mainContainer: {
    paddingTop: 50,
    paddingBottom: 70,
    height: "100%",
    backgroundColor: "white",
  },

  searchInput: {
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 100,
    paddingHorizontal: 10,
    marginHorizontal: 15,
    marginBottom: 10,
    marginTop: -30,
  },
  itemContainer: {
    paddingVertical: 20,
    paddingHorizontal: 15,
    flex: 1,
    gap: 20,
    backgroundColor: "white",
  },
  tsaIcon: {
    height: 75,
    width: 75,
  },
  itemTitle: {
    color: "black",
    fontFamily: "Roboto",
    fontWeight: "600",
  },
  itemTime: {
    color: "#aaaaaa",
  },
  itemDescription: {
    width: "100%",
    color: "#gray",
  },
  divider: {
    height: 1,
    backgroundColor: "#ccc",
    marginVertical: 10,
    marginHorizontal: 15,
  },
  title: {
    paddingTop: 20,
    paddingLeft: 15,
    fontSize: 22,
    fontWeight: "bold",
  },
  sectionHeaderContainer: {
    backgroundColor: "#f9f9f9",
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  emptyContainer: {
    alignItems: "center",
    padding: 16,
  },
});

interface EventItem {
  id: string; // Matches the "id" field in the JSON
  name: string; // Matches the "name" field in the JSON
  location: string; // Matches the "location" field in the JSON
  startTime: string; // Matches the "startTime" field in the JSON
  endTime: string; // Matches the "endTime" field in the JSON
  createdAt: string; // Matches the "createdAt" field in the JSON
  selected: boolean; // Used to track if the event is selected/bookmarked
  semifinalists: string[] | undefined; // Optional field to store finalists if available
}

const Stack = createStackNavigator<EventStackParamList>();

type EventStackParamList = {
  Events: { data: EventItem[] };
  EventDetail: { item: EventItem };
};

type EventsScreenProps = {
  navigation: StackNavigationProp<EventStackParamList, "Events">;
};

export default function EventStack() {
  return (
    <Stack.Navigator initialRouteName="Events">
      <Stack.Screen
        name="Events"
        component={EventScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EventDetail"
        component={EventDetail}
        options={{ headerTitle: "" }}
      />
    </Stack.Navigator>
  );
}

function EventScreen({ navigation }: EventsScreenProps) {
  const [data, setData] = useState<EventItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const { getRequestToken, session } = useSession();

  useEffect(() => {
    if (!session) return;

    const fetchData = async () => {
      const requestToken = await getRequestToken();
      let response = (await fetch("https://nctsa-api.bedson.tech/user/events", {
        headers: {
          Authorization: requestToken != null ? requestToken : "",
          'Device': "ios"
        },
      }).then((res) => res.json())) as EventItem[];

      if (response == null || response.length === 0) return;

      response.map((item: EventItem) => {
        return item;
      });

      response = response.sort((a, b) => a.name.localeCompare(b.name));

      const eresponse = (await fetch("https://nctsa-api.bedson.tech/user/agenda/events", {
        headers: {
          Authorization: requestToken != null ? requestToken : "",
          'Device': "ios"
        },
      }).then((res) => res.json())) as EventItem[];

      if(response != null && response.length > 0) {
        const agendaEventIds = eresponse.map((item: EventItem) => item.id);
        response = response.map((item: EventItem) => {
          return {
            ...item,
            selected: agendaEventIds.includes(item.id), 
          };
        });
      }

      setData(response); 
    };

    fetchData().catch(console.error);
    const id = setInterval(() => {
      fetchData().catch(console.error);
    }, 5000);

    return () => clearInterval(id); // Cleanup on unmount
  }, [session, getRequestToken]);

  const filteredData = data.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <View style={styles.mainContainer}>
      <TextInput
        style={styles.searchInput}
        placeholder="Event Search"
        placeholderTextColor="black"
        value={searchQuery}
        onChangeText={(text) => setSearchQuery(text)} // Update search query
      />
      <ScrollView>
        {filteredData.map((item, n) => (
          <View key={n}>
            <EventItemView item={item} navigation={navigation} />
            <View style={styles.divider} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

type EventItemProps = PropsWithChildren<{
  item: EventItem;
  navigation: StackNavigationProp<EventStackParamList, "Events">; // Pass navigation prop to handle navigation
}>;

function EventItemView({ item, navigation }: EventItemProps) {
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate("EventDetail", { item: item })}
    >
      <ThemedView style={styles.itemContainer}>
        <View>
          <ThemedText style={styles.itemTitle}>{item.name}</ThemedText>
          <ThemedText style={styles.itemDescription}>
            {item.location}
          </ThemedText>
        </View>
      </ThemedView>
    </TouchableOpacity>
  );
}

function EventDetail({
  route,
}: {
  route: RouteProp<EventStackParamList, "EventDetail">;
}) {
  const item = route.params.item;
  const [selected, setSelected] = useState(item.selected); 
  const [agenda, setAgenda] = useState<AgendaItem[]>([]); // Local state to store agenda items

  const semifinalists: string[] = item.semifinalists || []; // Fallback to empty array if undefined

  const { getRequestToken } = useSession();

  useEffect(() => {
    const fetchAgenda = async () => {
      const requestToken = await getRequestToken();
      if (!requestToken) {
        console.error("No request token found");
        return;
      }

      const response = await fetch(`https://nctsa-api.bedson.tech/user/events/${item.id}/schedules`, {
        headers: {
          Authorization: requestToken,
          'Device': "ios"
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAgenda(data as AgendaItem[]);
      } else {
        console.error("Failed to fetch agenda");
      }
    };

    fetchAgenda().catch(console.error);
  }, [setAgenda])

  const toggleBookmark = async () => {
    const requestToken = await getRequestToken();
    if (!requestToken) {
      console.error("No request token found");
      return;
    }

    let response;
    if(item.selected) {
      response = await fetch(
        `https://nctsa-api.bedson.tech/user/agenda/events/${item.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: requestToken,
            'Device': "ios"
          },
        }
      );
    } else {
      response = await fetch(
        `https://nctsa-api.bedson.tech/user/agenda/events`,
        {
          method: "POST",
          headers: {
            Authorization: requestToken,
            'Content-Type': 'application/json',
            'Device': "ios"
          },
          body: JSON.stringify({
            eventId: item.id, // Pass the ID of the event to bookmark
          }),
        }
      );
    }

    if (response.ok) {
      item.selected = !item.selected; // Update the local state
      setSelected(item.selected); // Update the state to reflect the new selection status
    } else {
      console.error("Failed to toggle bookmark");
    }
  }

  return (
    <ThemedView style={styles.itemContainer}>
      <View style={{flexDirection: "row"}}>
          <ThemedText style={{...styles.itemTitle, marginRight: "auto"}}>{item.name}</ThemedText>
          <TouchableOpacity style={{ padding: 3 }} onPress={toggleBookmark}>
          { selected ? (
            <FontAwesome name="bookmark" size={32} color="#007AFF" />
          ) : (
            <Feather name="bookmark" size={32} color="#007AFF" />
          )}
          </TouchableOpacity>
      </View>
      <View>
          {
            semifinalists.length == 0 && (
              <Text style={{}}>Semifinalists not released yet</Text>
            )
          }
          {
            semifinalists.length > 0 && (
              <View>
                <Text style={{ fontSize: 16, fontWeight: "bold", paddingVertical: 10 }}>Semifinalists:</Text>
                {semifinalists.map((semifinalist, index) => (
                  <Text key={index} style={{ paddingVertical: 2 }}>{semifinalist}</Text>
                ))}
              </View>
            )
          }
      </View>
      <SectionList
        sections={groupEventsByStartTime(agenda, true)}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <AgendaItemView agendaItem={item} />}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionHeaderText}>{section.title}</Text>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text>No events are available for this event right now.</Text>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 0 }}
      />
    </ThemedView>
  );
}
