import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Accelerometer, Gyroscope } from 'expo-sensors';
import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform } from 'react-native';

export type SafetyStatus = 'SAFE' | 'ALERT' | 'EMERGENCY';

export type TripEvent = {
  id: string;
  status: SafetyStatus | 'CANCELLED';
  timestamp: string;
  label: string;
};

export type Trip = {
  id: string;
  startedAt: string;
  endedAt: string;
  duration: number;
  distance: number;
  hadAlert: boolean;
  events: TripEvent[];
};

export type Contact = {
  id: string;
  name: string;
  phone: string;
  email: string;
};

type AppSettings = {
  notifyEmergencyServices: boolean;
  countdownSeconds: number;
};

type TripContextValue = {
  hydrated: boolean;
  tripActive: boolean;
  sessionId: string | null;
  tripStartedAt: string | null;
  elapsedSeconds: number;
  distanceKm: number;
  speedKmh: number;
  status: SafetyStatus;
  confidence: number | null;
  alertSecondsLeft: number;
  emergencySent: boolean;
  canCancelEmergency: boolean;
  permissionGranted: boolean | null;
  trips: Trip[];
  contacts: Contact[];
  settings: AppSettings;
  startTrip: () => Promise<boolean>;
  stopTrip: () => Promise<void>;
  triggerManualSos: () => Promise<void>;
  acknowledgeOk: () => void;
  cancelEmergency: () => void;
  addContact: (contact: Omit<Contact, 'id'>) => Promise<void>;
  updateContact: (contact: Contact) => Promise<void>;
  removeContact: (id: string) => Promise<void>;
  setNotifyEmergencyServices: (value: boolean) => Promise<void>;
  setCountdownSeconds: (value: number) => Promise<void>;
  refreshPermission: () => Promise<void>;
};

const STORAGE_KEYS = {
  trips: '@cognisafe/trips',
  contacts: '@cognisafe/contacts',
  settings: '@cognisafe/settings',
};

const defaultSettings: AppSettings = {
  notifyEmergencyServices: true,
  countdownSeconds: 30,
};

const createId = () =>
  `${Date.now().toString()}-${Math.random().toString(36).slice(2, 9)}`;

const apiBase = () =>
  typeof process !== 'undefined'
    ? process.env.EXPO_PUBLIC_API_GATEWAY_URL
    : undefined;

async function postJson(path: string, body: unknown) {
  const base = apiBase();
  if (!base) return null;
  try {
    const response = await fetch(`${base.replace(/\/$/, '')}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) return null;
    return (await response.json()) as { status?: SafetyStatus; confidence?: number };
  } catch {
    return null;
  }
}

const TripContext = createContext<TripContextValue | null>(null);

export function TripProvider({ children }: PropsWithChildren) {
  const [hydrated, setHydrated] = useState(false);
  const [tripActive, setTripActive] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [tripStartedAt, setTripStartedAt] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const [speedKmh, setSpeedKmh] = useState(0);
  const [status, setStatus] = useState<SafetyStatus>('SAFE');
  const [confidence, setConfidence] = useState<number | null>(null);
  const [alertSecondsLeft, setAlertSecondsLeft] = useState(0);
  const [alertExpiresAt, setAlertExpiresAt] = useState<number | null>(null);
  const [emergencySent, setEmergencySent] = useState(false);
  const [cancelUntil, setCancelUntil] = useState<number | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [tripEvents, setTripEvents] = useState<TripEvent[]>([]);

  const sensorBuffer = useRef<number[][]>([]);
  const latestAcceleration = useRef({ x: 0, y: 0, z: 0 });
  const latestRotation = useRef({ x: 0, y: 0, z: 0 });
  const previousLocation = useRef<{ lat: number; lng: number } | null>(null);
  const statusRef = useRef(status);
  const sessionRef = useRef(sessionId);

  useEffect(() => {
    statusRef.current = status;
    sessionRef.current = sessionId;
  }, [status, sessionId]);

  useEffect(() => {
    const load = async () => {
      const [storedTrips, storedContacts, storedSettings] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.trips),
        AsyncStorage.getItem(STORAGE_KEYS.contacts),
        AsyncStorage.getItem(STORAGE_KEYS.settings),
      ]);
      if (storedTrips) setTrips(JSON.parse(storedTrips) as Trip[]);
      if (storedContacts) setContacts(JSON.parse(storedContacts) as Contact[]);
      if (storedSettings) setSettings({ ...defaultSettings, ...JSON.parse(storedSettings) });
      setHydrated(true);
    };
    void load();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.trips, JSON.stringify(trips)),
      AsyncStorage.setItem(STORAGE_KEYS.contacts, JSON.stringify(contacts)),
      AsyncStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings)),
    ]);
  }, [hydrated, trips, contacts, settings]);

  const addEvent = useCallback((eventStatus: TripEvent['status'], label: string) => {
    setTripEvents((current) => [
      ...current,
      { id: createId(), status: eventStatus, timestamp: new Date().toISOString(), label },
    ]);
  }, []);

  const refreshPermission = useCallback(async () => {
    if (Platform.OS === 'web') {
      setPermissionGranted(true);
      return;
    }
    const result = await Location.getForegroundPermissionsAsync();
    setPermissionGranted(result.status === 'granted');
  }, []);

  useEffect(() => {
    void refreshPermission();
  }, [refreshPermission]);

  const startTrip = useCallback(async () => {
    if (Platform.OS !== 'web') {
      const result = await Location.requestForegroundPermissionsAsync();
      const granted = result.status === 'granted';
      setPermissionGranted(granted);
      if (!granted) return false;
    } else {
      setPermissionGranted(true);
    }
    const nextSession = createId();
    setSessionId(nextSession);
    setTripStartedAt(new Date().toISOString());
    setElapsedSeconds(0);
    setDistanceKm(0);
    setSpeedKmh(0);
    setStatus('SAFE');
    setConfidence(null);
    setEmergencySent(false);
    setCancelUntil(null);
    setTripEvents([
      {
        id: createId(),
        status: 'SAFE',
        timestamp: new Date().toISOString(),
        label: 'Trip started',
      },
    ]);
    sensorBuffer.current = [];
    previousLocation.current = null;
    setTripActive(true);
    return true;
  }, []);

  const stopTrip = useCallback(async () => {
    if (!tripActive || !sessionId || !tripStartedAt) return;
    const nextTrip: Trip = {
      id: sessionId,
      startedAt: tripStartedAt,
      endedAt: new Date().toISOString(),
      duration: elapsedSeconds,
      distance: distanceKm,
      hadAlert: tripEvents.some((event) => event.status === 'ALERT' || event.status === 'EMERGENCY'),
      events: tripEvents,
    };
    setTrips((current) => [nextTrip, ...current].slice(0, 30));
    setTripActive(false);
    setSessionId(null);
    setTripStartedAt(null);
    setStatus('SAFE');
    setAlertExpiresAt(null);
    setAlertSecondsLeft(0);
    setEmergencySent(false);
    setCancelUntil(null);
    sensorBuffer.current = [];
  }, [distanceKm, elapsedSeconds, sessionId, tripActive, tripEvents, tripStartedAt]);

  const sendEmergency = useCallback(async () => {
    if (!sessionRef.current) return;
    let location: { lat: number; lng: number } | null = previousLocation.current;
    if (Platform.OS !== 'web') {
      try {
        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        location = { lat: current.coords.latitude, lng: current.coords.longitude };
      } catch {
        location = previousLocation.current;
      }
    }
    await postJson('/alert', {
      sessionId: sessionRef.current,
      location,
      timestamp: new Date().toISOString(),
      notifyEmergencyServices: settings.notifyEmergencyServices,
    });
    setStatus('EMERGENCY');
    setEmergencySent(true);
    setCancelUntil(Date.now() + 8000);
    setAlertExpiresAt(null);
    setAlertSecondsLeft(0);
    addEvent('EMERGENCY', 'Emergency alert sent');
  }, [addEvent, settings.notifyEmergencyServices]);

  const triggerAlert = useCallback(
    (label: string, nextConfidence = 0.91) => {
      if (!tripActive || statusRef.current !== 'SAFE') return;
      setStatus('ALERT');
      setConfidence(nextConfidence);
      setAlertSecondsLeft(settings.countdownSeconds);
      setAlertExpiresAt(Date.now() + settings.countdownSeconds * 1000);
      addEvent('ALERT', label);
    },
    [addEvent, settings.countdownSeconds, tripActive],
  );

  useEffect(() => {
    if (status !== 'ALERT' || !alertExpiresAt) return;
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((alertExpiresAt - Date.now()) / 1000));
      setAlertSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        void sendEmergency();
      }
    }, 250);
    return () => clearInterval(timer);
  }, [alertExpiresAt, sendEmergency, status]);

  useEffect(() => {
    if (!tripActive) return;
    const timer = setInterval(() => setElapsedSeconds((current) => current + 1), 1000);
    return () => clearInterval(timer);
  }, [tripActive]);

  const handleSensorSample = useCallback(
    (acceleration: { x: number; y: number; z: number }, rotation: { x: number; y: number; z: number }) => {
      const sample = [acceleration.x, acceleration.y, acceleration.z, rotation.x, rotation.y, rotation.z];
      sensorBuffer.current.push(sample);
      if (sensorBuffer.current.length >= 150) {
        const window = sensorBuffer.current.slice(-150);
        sensorBuffer.current = sensorBuffer.current.slice(-135);
        void postJson('/predict', {
          sessionId: sessionRef.current,
          timestamp: new Date().toISOString(),
          window,
        }).then((result) => {
          if (!result) return;
          if (result.confidence !== undefined) setConfidence(result.confidence);
          if (result.status === 'ALERT') triggerAlert('Abnormal motion detected', result.confidence ?? 0.9);
          if (result.status === 'EMERGENCY') void sendEmergency();
        });
      }
      const magnitude = Math.sqrt(acceleration.x ** 2 + acceleration.y ** 2 + acceleration.z ** 2);
      const rotationMagnitude = Math.sqrt(rotation.x ** 2 + rotation.y ** 2 + rotation.z ** 2);
      if (magnitude > 17 || magnitude < 2 || rotationMagnitude > 5.4) {
        triggerAlert('Sudden motion detected', 0.94);
      }
    },
    [sendEmergency, triggerAlert],
  );

  useEffect(() => {
    if (!tripActive || Platform.OS === 'web') return;
    Accelerometer.setUpdateInterval(20);
    Gyroscope.setUpdateInterval(20);
    const accelerationSubscription = Accelerometer.addListener((data) => {
      latestAcceleration.current = data;
      handleSensorSample(latestAcceleration.current, latestRotation.current);
    });
    const gyroscopeSubscription = Gyroscope.addListener((data) => {
      latestRotation.current = data;
    });
    return () => {
      accelerationSubscription.remove();
      gyroscopeSubscription.remove();
    };
  }, [handleSensorSample, tripActive]);

  useEffect(() => {
    if (!tripActive || Platform.OS === 'web') return;
    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;
    void Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, timeInterval: 1000, distanceInterval: 5 },
      (location) => {
        if (cancelled) return;
        const { latitude, longitude, speed } = location.coords;
        setSpeedKmh(Math.max(0, (speed ?? 0) * 3.6));
        if (previousLocation.current) {
          const dLat = ((latitude - previousLocation.current.lat) * Math.PI) / 180;
          const dLng = ((longitude - previousLocation.current.lng) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos((previousLocation.current.lat * Math.PI) / 180) *
              Math.cos((latitude * Math.PI) / 180) *
              Math.sin(dLng / 2) ** 2;
          setDistanceKm((current) => current + 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
        }
        previousLocation.current = { lat: latitude, lng: longitude };
      },
    ).then((nextSubscription) => {
      if (cancelled) nextSubscription.remove();
      else subscription = nextSubscription;
    });
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [tripActive]);

  const acknowledgeOk = useCallback(() => {
    if (statusRef.current !== 'ALERT') return;
    setStatus('SAFE');
    setAlertExpiresAt(null);
    setAlertSecondsLeft(0);
    setConfidence(null);
    addEvent('SAFE', "Driver confirmed they're OK");
  }, [addEvent]);

  const cancelEmergency = useCallback(() => {
    if (!emergencySent || !cancelUntil || Date.now() > cancelUntil) return;
    setEmergencySent(false);
    setStatus('SAFE');
    setCancelUntil(null);
    setConfidence(null);
    addEvent('CANCELLED', 'Emergency alert cancelled');
  }, [addEvent, cancelUntil, emergencySent]);

  const triggerManualSos = useCallback(async () => {
    if (!tripActive) return;
    setStatus('EMERGENCY');
    addEvent('EMERGENCY', 'Manual SOS triggered');
    await sendEmergency();
  }, [addEvent, sendEmergency, tripActive]);

  const addContact = useCallback(async (contact: Omit<Contact, 'id'>) => {
    setContacts((current) => [...current, { ...contact, id: createId() }]);
  }, []);

  const updateContact = useCallback(async (contact: Contact) => {
    setContacts((current) => current.map((item) => (item.id === contact.id ? contact : item)));
  }, []);

  const removeContact = useCallback(async (id: string) => {
    setContacts((current) => current.filter((contact) => contact.id !== id));
  }, []);

  const setNotifyEmergencyServices = useCallback(async (value: boolean) => {
    setSettings((current) => ({ ...current, notifyEmergencyServices: value }));
  }, []);

  const setCountdownSeconds = useCallback(async (value: number) => {
    setSettings((current) => ({ ...current, countdownSeconds: value }));
  }, []);

  const value = useMemo<TripContextValue>(
    () => ({
      hydrated,
      tripActive,
      sessionId,
      tripStartedAt,
      elapsedSeconds,
      distanceKm,
      speedKmh,
      status,
      confidence,
      alertSecondsLeft,
      emergencySent,
      canCancelEmergency: Boolean(emergencySent && cancelUntil && Date.now() < cancelUntil),
      permissionGranted,
      trips,
      contacts,
      settings,
      startTrip,
      stopTrip,
      triggerManualSos,
      acknowledgeOk,
      cancelEmergency,
      addContact,
      updateContact,
      removeContact,
      setNotifyEmergencyServices,
      setCountdownSeconds,
      refreshPermission,
    }),
    [
      acknowledgeOk,
      addContact,
      cancelEmergency,
      confidence,
      contacts,
      distanceKm,
      elapsedSeconds,
      hydrated,
      permissionGranted,
      refreshPermission,
      sessionId,
      settings,
      speedKmh,
      startTrip,
      status,
      stopTrip,
      trips,
      triggerManualSos,
      tripActive,
      tripStartedAt,
      alertSecondsLeft,
      emergencySent,
      cancelUntil,
      removeContact,
      setCountdownSeconds,
      setNotifyEmergencyServices,
      updateContact,
    ],
  );

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

export function useTrip() {
  const value = useContext(TripContext);
  if (!value) throw new Error('useTrip must be used inside TripProvider');
  return value;
}