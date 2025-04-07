import React from "react";
import {
  DrawerContentScrollView,
  DrawerItemList,
} from "@react-navigation/drawer";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ImageSourcePropType,
} from "react-native";
import { useSession } from "../context/authContext";
import NctsaLogo from "../assets/images/nctsa_high_res.png";

const CustomDrawer = (props: any) => {
  const { signOut } = useSession();

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.logoContainer}>
        <Image
          source={NctsaLogo as ImageSourcePropType}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.line} />

      <DrawerContentScrollView 
        {...props} 
        contentContainerStyle={styles.drawerContent}>
        <DrawerItemList {...props} /> 
      </DrawerContentScrollView> 

      <View style={styles.footerContainer}>
        <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default CustomDrawer;

const styles = StyleSheet.create({
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 50,
    paddingBottom: 5,
  },
  line: {
    borderBottomWidth: 2,
    borderBottomColor: "#e0e0e0",
    width: "85%",
    alignSelf: "center",
  },
  logo: {
    width: 250,
    height: 100,
  },
  drawerContent: {
    flexGrow: 1,
    paddingTop: 10,
  },
  notificationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  notificationLabel: {
    fontSize: 16,
    color: "#333",
  },
  badge: {
    backgroundColor: "red",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  footerContainer: {
    padding: 20,
    paddingBottom: 30,
    // borderTopWidth: 1,
    // borderTopColor: '#e0e0e0',
    // backgroundColor: '#fff',
  },

  signOutButton: {
    backgroundColor: "red",
    paddingVertical: 16,
    alignItems: "center",
    borderRadius: 16,
  },
  signOutText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
