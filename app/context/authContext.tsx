import { useContext, createContext, type PropsWithChildren } from "react";
import { useStorageState } from "./useStorageState";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import * as Device from "expo-device";

export default interface SessionObj {
  userId: string;
  refreshToken: {
    token: string;
    expiration: string;
  };
  token: {
    token: string;
    expiration: string;
  };
}

interface TokenRes {
  token: string;
  expiration: string;
}

const AuthContext = createContext<{
  signIn: (tsaId: string, schoolCode: string) => Promise<void>;
  signOut: () => void;
  session?: SessionObj | null;
  updateSessionToken: () => Promise<boolean>;
  isLoading: boolean;
  getRequestToken: () => Promise<string | null>;
}>({
  signIn: () => Promise.resolve(),
  signOut: () => null,
  updateSessionToken: () => Promise.resolve(false),
  session: null,
  isLoading: false,
  getRequestToken: () => Promise.resolve(null),
});

// This hook can be used to access the user info.
export function useSession() {
  const value = useContext(AuthContext);
  if (process.env.NODE_ENV !== "production") {
    if (value == null) {
      throw new Error("useSession must be wrapped in a <SessionProvider />");
    }

    if (!value.session) return value;
  }

  if (
    value.session != null &&
    new Date(value.session?.token.expiration).getTime() - 5 * 60 * 1000 <
      new Date().getTime()
  ) {
    value.updateSessionToken().catch(console.error);
  }

  return value;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [[isLoading, session], setSession] = useStorageState("session");

  /**
   * Updates the session token if it is expired.
   *
   * @returns {Promise<boolean>} - Returns true if all is well, false if not.
   */
  const updateSessionToken = async (): Promise<boolean> => {
    if (!session) return false;
    let tokenRes: object;
    try {
      tokenRes = (await fetch("https://nctsa-api.bedson.tech/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refreshToken: session.refreshToken.token,
          userId: session.userId,
        }),
      }).then((res) => res.json())) as object;
    } catch (err) {
      console.error(err);
      setSession(null);
      return false;
    }

    if ("error" in tokenRes) {
      console.error(tokenRes);
      setSession(null);
      return false;
    }

    const tokenData = tokenRes as TokenRes;

    session.token.token = tokenData.token;
    session.token.expiration = tokenData.expiration;

    setSession(session);
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        signIn: async (tsaId: string, schoolCode: string) => {
          let loginRes: object;
          try {
            loginRes = (await fetch("https://nctsa-api.bedson.tech/login", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                tsaId: parseInt(tsaId),
                schoolCode: parseInt(schoolCode),
              }),
            }).then((res) => res.json())) as object;
          } catch (err) {
            console.error(err);
            setSession(null);
            return;
          }

          if ("error" in loginRes) {
            console.error(loginRes);
            setSession(null);
            return;
          }

          interface LoginData {
            refreshToken: string;
            userId: string;
            expiration: string;
          }

          const { refreshToken, userId, expiration } = loginRes as LoginData;

          let res: object;
          try {
            res = (await fetch("https://nctsa-api.bedson.tech/token", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                refreshToken: refreshToken,
                userId: userId,
              }),
            }).then((res) => res.json())) as object;
          } catch (err) {
            console.error(err);
            setSession(null);
            return;
          }

          if ("error" in res) {
            console.error(res);
            setSession(null);
            return;
          }

          const tokenRes = res as TokenRes;

          const { token } = tokenRes;
          const tokenExpiration = tokenRes["expiration"];

          if (Platform.OS === "android") {
            await Notifications.setNotificationChannelAsync("default", {
              name: "default",
              importance: Notifications.AndroidImportance.MAX,
              vibrationPattern: [0, 250, 250, 250],
              lightColor: "#FF231F7C",
            }).catch((e) => {
              console.error("Error setting notification channel: ", e);
            });
          }

          if (Device.isDevice) {
            const { status: existingStatus } =
              await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== Notifications.PermissionStatus.GRANTED) {
              const { status } = await Notifications.requestPermissionsAsync();
              finalStatus = status;
            }

            if (finalStatus === Notifications.PermissionStatus.GRANTED) {
              try {
                const deviceToken = (
                  await Notifications.getDevicePushTokenAsync()
                ).data as string;

                const deviceType =
                  Device.osName?.toLowerCase() === "android"
                    ? "android"
                    : "ios";

                await fetch("https://nctsa-api.bedson.tech/user/device", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: token,
                  },
                  body: JSON.stringify({
                    userId: userId,
                    token: deviceToken,
                    deviceType: deviceType as string,
                  }),
                });
              } catch (e: unknown) {
                console.log(e);
              }
            }
          }

          setSession({
            userId: userId,
            refreshToken: {
              token: refreshToken,
              expiration: expiration,
            },
            token: {
              token: token,
              expiration: tokenExpiration,
            },
          });
        },
        getRequestToken: async () => {
          if (!session) {
            return null;
          }

          // Check if the token is still valid
          if (
            new Date(session.token.expiration).getTime() - 5 * 60 * 1000 <
              new Date().getTime() ||
            session.token["token"] == null
          ) {
            console.log("refresh");
            await updateSessionToken();
          }

          return session.token.token;
        },
        updateSessionToken,
        signOut: () => {
          setSession(null);
        },
        session,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
