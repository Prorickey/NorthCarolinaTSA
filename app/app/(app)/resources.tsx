import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Image, StyleSheet, TouchableOpacity, View, Modal } from "react-native";
import {
  createStackNavigator,
  StackNavigationProp,
} from "@react-navigation/stack";
import { Dimensions } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { useEffect, useState } from "react";
import ImageZoom from "react-native-image-pan-zoom";
import WebView from "react-native-webview";

const Stack = createStackNavigator();
const screenWidth = Dimensions.get("window").width;
const screenHeight = Dimensions.get("window").height;

type ResourcesStackParamList = {
  Resources: undefined;
  "Attire Guide": undefined;
  "Map": undefined;
  "Finalists": undefined;
  "Special Events": undefined;
  "Candidates": undefined;
};

type ResourcesScreenProps = {
  navigation: ResourcesScreenNavigationProp;
};

type ResourcesScreenNavigationProp = StackNavigationProp<
  ResourcesStackParamList,
  "Resources"
>;

export default function ResourcesStack() {
  return (
    <Stack.Navigator initialRouteName="Resources">
      <Stack.Screen
        name="Resources"
        component={ResourcesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Attire Guide" component={AttireGuideScreen} />
      <Stack.Screen name="Map" component={MapScreen} />
      <Stack.Screen name="Finalists" component={FinalistScreen} />
      <Stack.Screen name="Special Events" component={SpecialScreen} />
      <Stack.Screen name="Candidates" component={CandidatesScreen} />
    </Stack.Navigator>
  );
}

function ResourcesScreen({ navigation }: ResourcesScreenProps) {
  return (
    <View style={styles.flexContainer}>
      <ThemedView style={styles.contentContainer}>
        <MapBlock navigation={navigation} />
        <AttireBlock navigation={navigation} />
      </ThemedView>
      <ThemedView style={styles.contentContainer}>
        <FinalistBlock navigation={navigation} />
        <SpecialBlock navigation={navigation} />
     </ThemedView>
     <ThemedView style={styles.contentContainer}>
        <CandidatesBlock navigation={navigation} />
     </ThemedView>
     <ThemedView style={styles.contentContainer}>
     <Image
        source={require('@/assets/images/nctsa_high_res.png')}
        style={styles.logo}
        resizeMode="contain"  // Path to your local image
      />
     </ThemedView>
    </View>
  );
}

function MapBlock({ navigation }: ResourcesScreenProps) {
  return (
    <TouchableOpacity onPress={() => navigation.navigate("Map")}>
      <ThemedView style={styles.itemContainer}>
        <View style={styles.iconWrapper}>
          <Icon name="map-marker-alt" size={60} color={"#D92D2A"} />
        </View>
        <View>
          <ThemedText style={styles.itemTitle}>Event Map</ThemedText>
          <ThemedText style={styles.itemTime}>
            Click to access the event map
          </ThemedText>
        </View>
      </ThemedView>
    </TouchableOpacity>
  );
}

function AttireBlock({ navigation }: ResourcesScreenProps) {
  return (
    <TouchableOpacity onPress={() => navigation.navigate("Attire Guide")}>
      <ThemedView style={styles.itemContainer}>
        <View style={styles.iconWrapper}>
          <Icon name="user-tie" size={60} color={"#0061A8"} />
        </View>
        <View>
          <ThemedText style={styles.itemTitle}>Dress Code</ThemedText>
          <ThemedText style={styles.itemTime}>
            Click to access dress code
          </ThemedText>
        </View>
      </ThemedView>
    </TouchableOpacity>
  );
}

function FinalistBlock({ navigation }: ResourcesScreenProps) {
  return (
    <TouchableOpacity onPress={() => navigation.navigate("Finalists")}>
      <ThemedView style={styles.itemContainer}>
        <View style={styles.iconWrapper}>
          <Icon name="medal" size={60} color={"#D92D2A"} />
        </View>
        <View>
          <ThemedText style={styles.itemTitle}>Finalists</ThemedText>
          <ThemedText style={styles.itemTime}>Finalists PDF</ThemedText>
        </View>
      </ThemedView>
    </TouchableOpacity>
  );
}

{/*function FoodBlock({ navigation }: ResourcesScreenProps) {
  return(
  <TouchableOpacity onPress={() => navigation.navigate("Food Options")}>
  <ThemedView style={styles.itemContainer}>
    <View style={styles.iconWrapper}>
    <Icon name="utensils" size={60} color={'#0061A8'}/>
    </View>
    <View>
      <ThemedText style={styles.itemTitle}>Food Options</ThemedText>
      <ThemedText style={styles.itemTime}>Where to find food at the conference</ThemedText>
    </View>
  </ThemedView>
</TouchableOpacity>
  )
}*/}

function SpecialBlock({ navigation }: ResourcesScreenProps) {
  return (
    <TouchableOpacity onPress={() => navigation.navigate("Special Events")}>
      <ThemedView style={styles.itemContainer}>
        <View style={styles.iconWrapper}>
          <Icon name="address-book" size={60} color={"#D92D2A"} />
        </View>
        <View>
          <ThemedText style={styles.itemTitle}>Special Events</ThemedText>
          <ThemedText style={styles.itemTime}>
            Special events at the conference!
          </ThemedText>
        </View>
      </ThemedView>
    </TouchableOpacity>
  );
}

function CandidatesBlock({ navigation }: ResourcesScreenProps) {
  return (
    <TouchableOpacity onPress={() => navigation.navigate("Candidates")}>
      <ThemedView style={styles.itemContainer}>
        <View style={styles.iconWrapper}>
          <Icon name="address-book" size={60} color={"#D92D2A"} />
        </View>
        <View>
          <ThemedText style={styles.itemTitle}>Candidates</ThemedText>
          <ThemedText style={styles.itemTime}>
            View your state officer candidates!
          </ThemedText>
        </View>
      </ThemedView>
    </TouchableOpacity>
  );
}

function AttireGuideScreen({ navigation }: ResourcesScreenProps) {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={styles.screenContainer}>
      <ThemedText style={styles.screenHeader}>Dress Code</ThemedText>
      <ThemedView style={styles.screenContainer}>
        {/* Thumbnail image to trigger modal */}
        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <Image
            source={require("@/assets//images/dress_code.jpeg")}
            style={styles.map}
          />
        </TouchableOpacity>
      </ThemedView>

      {/* Modal for Image Viewer */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)} // Close modal on back press
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setModalVisible(false)} // Close modal on tap
          >
            <ThemedText style={styles.closeText}>X</ThemedText>
          </TouchableOpacity>
          <ImageZoom
            cropWidth={screenWidth}
            cropHeight={screenHeight}
            imageWidth={screenWidth}
            imageHeight={400}
          >
            <Image
              source={require("@/assets/images/dress_code.jpeg")} // Replace with your local image path
              style={styles.map}
              resizeMode="contain"
            />
          </ImageZoom>
        </View>
      </Modal>
    </View>
  );
}

function MapScreen({ navigation }: ResourcesScreenProps) {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={styles.screenContainer}>
      <ThemedText style={styles.screenHeader}>
        Koury Convention Center
      </ThemedText>
      <ThemedView style={styles.screenContainer}>
        {/* Thumbnail image to trigger modal */}
        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <Image
            source={require("@/assets//images/tsamap.png")}
            style={styles.map}
          />
        </TouchableOpacity>
      </ThemedView>

      {/* Modal for Image Viewer */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)} // Close modal on back press
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setModalVisible(false)} // Close modal on tap
          >
            <ThemedText style={styles.closeText}>X</ThemedText>
          </TouchableOpacity>
          <ImageZoom
            cropWidth={screenWidth}
            cropHeight={screenHeight}
            imageWidth={screenWidth}
            imageHeight={400}
          >
            <Image
              source={require("@/assets/images/tsamap.png")} // Replace with your local image path
              style={styles.map}
              resizeMode="contain"
            />
          </ImageZoom>
        </View>
      </Modal>
    </View>
  );
}

function FinalistScreen({ navigation }: ResourcesScreenProps) {

  const [available, setAvailable] = useState(false);

  useEffect(() => {
    fetch("https://nctsa.bedson.tech/status/finalists.pdf").then((response) => {
      if (response.ok) {
        // If the request was successful, set available to true
        console.log(response.status)
        setAvailable(true);
      } else {
        // Handle the case where the file is not available
        setAvailable(false);
      }
    })
  }, [setAvailable]);

  return (
    <View style={styles.screenContainer}>
      {
        available && <WebView 
          source={{ uri: 'https://nctsa.bedson.tech/static/finalists.pdf'}} 
          />
      }
      {
        !available && 
        <ThemedText style={styles.screenText}>
          The semifinalists PDF is currently unavailable. Please check back later.
        </ThemedText>
      }
    </View>
  )
}


function SpecialScreen({ navigation }: ResourcesScreenProps) {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    fetch("https://nctsa.bedson.tech/status/special_events.pdf").then((response) => {
      if (response.ok) {
        // If the request was successful, set available to true
        console.log(response.status)
        setAvailable(true);
      } else {
        // Handle the case where the file is not available
        setAvailable(false);
      }
    })
  }, [setAvailable]);

  return (
    <View style={styles.screenContainer}>
      {
        available && <WebView 
          source={{ uri: 'https://nctsa.bedson.tech/static/special_events.pdf'}} 
          />
      }
    </View>
  );
}

function CandidatesScreen({ navigation }: ResourcesScreenProps) {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    fetch("https://nctsa.bedson.tech/status/candidates.pdf").then((response) => {
      if (response.ok) {
        // If the request was successful, set available to true
        console.log(response.status)
        setAvailable(true);
      } else {
        // Handle the case where the file is not available
        setAvailable(false);
      }
    })
  }, [setAvailable]);

  return (
    <View style={styles.screenContainer}>
      {
        available && <WebView 
          source={{ uri: 'https://nctsa.bedson.tech/static/candidates.pdf'}} 
          />
      }
    </View>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingTop: 5,
    paddingHorizontal: 20,
    flexDirection: "row",
    height: "30%",
    backgroundColor: "white",
  },

  logo: {
    width: 350,  // Set width
    height: 200, // Set height
    marginTop: 40
  },
  screenContainer: {
    flexDirection: "column",
    height: "100%",
    backgroundColor: "white",
  },

  screenHeader: {
    color: "black",
    fontWeight: "bold",
    fontSize: 24,
    textAlign: "center",
    marginTop: 40,
    marginBottom: 10,
  },

  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)", // Semi-transparent background
  },

  closeButton: {
    position: "absolute",
    top: 70,
    right: 20,
    padding: 10,
    zIndex: 10,
  },
  closeText: {
    fontSize: 28,
    fontFamily: "sans",
    color: "white",
    fontWeight: "bold",
  },

  flexContainer: {
    flex: 1,
    flexDirection: "column", // Column layout
    justifyContent: "space-evenly", // Equal spacing between items
    padding: 10, // Optional padding
    backgroundColor: "white",
  },

  itemContainer: {
    marginTop: 0,
    paddingVertical: 20,
    paddingHorizontal: 15,
    flexDirection: "column",
    gap: 20,
    backgroundColor: "white",
    borderRadius: 18,
    borderColor: "black",
    marginRight: "auto",
    width: 0.4 * screenWidth,
    height: 0.235 * screenHeight,
    maxHeight: 300,
    borderWidth: 2,
    marginLeft: 10,
    //Shadow for Android
    shadowColor: "#000", // Shadow color
    shadowOffset: { width: 0, height: 2 }, // Shadow offset
    shadowOpacity: 0.5, // Shadow opacity
    shadowRadius: 3.84, // Shadow blur radius

    // Shadow for Android
    elevation: 5, // Elevation for Android
  },
  screenText: {
    color: "black",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 20,
    fontFamily: "Georgia",
    marginTop: 10,
  },
  tsaIcon: {
    height: 75,
    width: 75,
    alignContent: "center",
    marginBottom: -13,
  },
  itemTitle: {
    color: "black",
    fontWeight: "bold",
  },
  itemTime: {
    color: "#aaaaaa",
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: "#FFFFFF",
    width: "90%",
    marginVertical: 10,
    marginHorizontal: 15,
  },
  map: {
    width: "95%",
    resizeMode: "contain", // Keeps aspect ratio
    height: 400,
    marginLeft: "auto",
    marginRight: "auto",
  },
  iconWrapper: {
    justifyContent: "center", // Center vertically
    alignItems: "center", // Center horizontally
    width: "100%", // Ensure the wrapper takes the full width of the container
    marginBottom: 10, // Add spacing below the image
  },
});
