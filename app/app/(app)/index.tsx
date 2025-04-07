import { useSession } from "@/context/authContext";
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import AntDesign from '@expo/vector-icons/AntDesign';

export interface AgendaItem {
  id: string;
  eventId: string;
  title: string;
  location: string;
  description: string;
  date: string;
  createdAt: string;
}

const DATES: string[] = [
  "2025-04-03T00:00:00Z",
  "2025-04-04T00:00:00Z",
  "2025-04-05T00:00:00Z",
];

export function groupEventsByStartTime(events: AgendaItem[], showDate = false) {
  if (events == null || events.length === 0) return [];

  const groups: Record<string, AgendaItem[]> = {};

  events.forEach((event) => {
    // Parse the date from startTime
    const eventDate = new Date(event.date);

    // Round down to the nearest 2-hour block
    // First set minutes and seconds to 0
    eventDate.setMinutes(0, 0, 0);
    // Then round down the hours to the nearest multiple of 2
    eventDate.setHours(Math.floor(eventDate.getHours() / 2) * 2);

    // Create a key for the 2-hour block
    const timeBlockKey = eventDate.toISOString();

    if (!(timeBlockKey in groups)) {
      groups[timeBlockKey] = [];
    }
    groups[timeBlockKey].push(event);
  });

  // Sort the groups by their time block keys
  const sortedTimeBlockKeys = Object.keys(groups).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  return sortedTimeBlockKeys.map((timeBlockKey) => {
    const blockStart = new Date(timeBlockKey);
    const blockEnd = new Date(timeBlockKey);
    blockEnd.setHours(blockStart.getHours() + 2);

    // Format the time block title as "HH:MM - HH:MM "
    let title = `${blockStart.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC", // Ensure consistent time formatting
    })} - ${blockEnd.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC", // Ensure consistent time formatting
    })}`;

    if (showDate) {
      title += ` • (${blockStart.toLocaleDateString("en-US", {
        month: "short", // e.g. Apr
        day: "numeric", // e.g. 4
        timeZone: "UTC", // Ensure consistent date formatting
      })})`; // Append the date for clarity
    }

    return {
      title,
      data: groups[timeBlockKey],
    };
  });
}

export const AgendaItemView = ({ agendaItem }: { agendaItem: AgendaItem }) => {
  const { getRequestToken } = useSession();

  const removeItem = async () => {
    const requestToken = await getRequestToken();
    if (!requestToken) {
      console.error("No request token available");
      return;
    }
    const response = await fetch(
      `https://nctsa-api.bedson.tech/user/agenda/events/${agendaItem.eventId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: requestToken,
          'Device': "ios"
        },
      }
    );

    if (!response.ok) {
      console.error("Failed to toggle bookmark");
    } 
  }

  return (
    <View style={styles.agendaItemContainer}>
      <View style={styles.timeContainer}>
        <View style={styles.timeContainer}>
          <Text>
            <Text style={styles.startTimeText}>
              {new Date(agendaItem.date).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "UTC", // Ensure consistent time formatting
              })}
            </Text>
          </Text>
        </View>
      </View>
      <View style={styles.verticalLine} />
      <View style={styles.detailsContainer}>
        <Text style={styles.titleText}>{agendaItem.title}</Text>
        <Text style={styles.locationText}>{agendaItem.description} • {agendaItem.location}</Text>
      </View>
      {
        "eventId" in agendaItem && <TouchableOpacity onPress={removeItem}>
          <AntDesign name="minuscircleo" size={24} color="#007AFF" />
        </TouchableOpacity>
      }
    </View>
  );
};

export default function AgendaScreen() {
  const [selectedDate, setSelectedDate] = useState(DATES[0]);
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const { session, getRequestToken } = useSession();

  useEffect(() => {
    if (!session) return;
    const fetchAgenda = async () => {
      const requestToken = await getRequestToken();
      const data = (await fetch("https://nctsa-api.bedson.tech/user/agenda", {
        headers: {
          Authorization: requestToken != null ? requestToken : "",
          'Device': "ios"
        },
      })
        .then((res) => res.json())
        .catch((err) => {
          console.error("Error fetching agenda:", err);
          return { error: "Failed to fetch agenda" };
        })) as object;

      if ("error" in data) {
        console.warn("Error fetching agenda:", data);
        return;
      }

      setAgenda(data as AgendaItem[]);
    };

    fetchAgenda().catch(console.error);
    const interval = setInterval(() => {
      fetchAgenda().catch(console.error);
    }, 5000); // Refresh every 1000000ms

    return () => clearInterval(interval); // Cleanup on unmount
  }, [session, getRequestToken]);

  // Filter agenda items for the selected date
  const filteredAgenda = useMemo(() => {
    if (agenda == null || agenda.length === 0) return [];
    try {
      return agenda.filter((item) => {
        // Extract just the date part for comparison
        const itemDate = new Date(item.date);
        const selectedDateObj = new Date(selectedDate);

        return (
          itemDate.getFullYear() === selectedDateObj.getFullYear() &&
          itemDate.getMonth() === selectedDateObj.getMonth() &&
          itemDate.getDate() === selectedDateObj.getDate()
        );
      });
    } catch (error) {
      console.error("Error filtering agenda:", error);
      return [];
    }
  }, [agenda, selectedDate]);

  // Only group the filtered agenda items
  const sections = useMemo(() => {
    return groupEventsByStartTime(filteredAgenda);
  }, [filteredAgenda]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.dateBar}>
        {DATES.map((date) => {
          const isSelected = date === selectedDate;
          return (
            <TouchableOpacity
              key={date}
              onPress={() => setSelectedDate(date)}
              style={[
                styles.dateButton,
                isSelected && styles.dateButtonSelected,
              ]}
            >
              <Text
                style={[styles.dateText, isSelected && styles.dateTextSelected]}
              >
                {new Date(date).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  timeZone: "UTC",
                })}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <AgendaItemView agendaItem={item} />}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionHeaderText}>{section.title}</Text>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text>No events for this date.</Text>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 0 }}
      />
      <View style={styles.grayBackground} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
  },
  grayBackground: {
    flex: 1,
    backgroundColor: "#f0f0f0",
  },
  dateBar: {
    flexDirection: "row",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  dateButton: {
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
  dateButtonSelected: {
    backgroundColor: "#007AFF",
  },
  dateText: {
    fontSize: 14,
    color: "#333",
  },
  dateTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  //section header styles
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
  //event item styles
  agendaItemContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  verticalLine: {
    width: 1,
    height: "90%",
    backgroundColor: "#ccc",
    marginHorizontal: 8,
  },
  timeContainer: {
    width: 80,
  },
  startTimeText: {
    fontWeight: "500",
    color: "#000",
    fontSize: 14,
  },
  endTimeText: {
    color: "#555",
    fontSize: 14,
  },
  timeText: {
    fontSize: 14,
    color: "#666",
  },
  detailsContainer: {
    flex: 1,
    marginLeft: 10,
  },
  titleText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 2,
  },
  locationText: {
    fontSize: 14,
    color: "#777",
  },
  addButton: {
    padding: 5,
  },
  emptyContainer: {
    alignItems: "center",
    padding: 16,
  },
});
