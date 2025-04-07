import { useEffect, useCallback, useReducer } from "react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import SessionObj from "./authContext";

type UseStateHook<T> = [[boolean, T | null], (value: T | null) => void];

function useAsyncState<T>(
  initialValue: [boolean, T | null] = [true, null],
): UseStateHook<T> {
  return useReducer(
    (
      state: [boolean, T | null],
      action: T | null = null,
    ): [boolean, T | null] => [false, action],
    initialValue,
  ) as UseStateHook<T>;
}

export async function setStorageItemAsync(key: string, value: string | null) {
  if (Platform.OS === "web") {
    try {
      if (value === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, value);
      }
    } catch (e) {
      console.error("Local storage is unavailable:", e);
    }
  } else {
    if (value == null) {
      await SecureStore.deleteItemAsync(key);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  }
}

export function useStorageState(key: string): UseStateHook<SessionObj | null> {
  // State to hold the session
  const [state, setState] = useAsyncState<SessionObj>();

  // Get stored session
  useEffect(() => {
    async function loadSession() {
      try {
        let storedValue: string | null = null;

        if (Platform.OS === "web") {
          storedValue =
            typeof localStorage !== "undefined"
              ? localStorage.getItem(key)
              : null;
        } else {
          storedValue = await SecureStore.getItemAsync(key);
        }

        if (storedValue != null) {
          setState(JSON.parse(storedValue) as SessionObj); // Parse JSON into an object
        }
      } catch (e) {
        console.error("Error loading session from storage:", e);
      }
    }

    loadSession().catch((e) => {
      console.error("Error loading session:", e);
    });
  }, [key, setState]);

  // Set stored session
  const setValue = useCallback(
    async (value: SessionObj | null) => {
      try {
        const stringifiedValue = value ? JSON.stringify(value) : null;
        setState(value);

        if (Platform.OS === "web") {
          if (typeof localStorage !== "undefined") {
            if (stringifiedValue != null) {
              localStorage.setItem(key, stringifiedValue);
            } else {
              localStorage.removeItem(key);
            }
          }
        } else {
          if (stringifiedValue != null) {
            await SecureStore.setItemAsync(key, stringifiedValue);
          } else {
            await SecureStore.deleteItemAsync(key);
          }
        }
      } catch (e) {
        console.error("Error saving session to storage:", e);
      }
    },
    [key, setState],
  );

  return [state, setValue];
}
