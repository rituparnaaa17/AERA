import * as Location from 'expo-location';
import { Accelerometer, Gyroscope } from 'expo-sensors';
import { useKeepAwake } from 'expo-keep-awake';
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
import { sendEmergencyAlert } from '@/services/alertService';
import { syncContact } from '@/services/contactService';
import { getEmergencyLocation } from '@/services/locationService';
import { predictSensorWindow, simulatePrediction, PredictionStatus } from '@/services/inferenceService';
import { DEFAULT_COUNTDOWN_SECONDS } from '@/utils/constants';
import { SensorWindowBuffer } from '@/services/sensorService';
import { loadStoredState, saveStoredState } from '@/services/storageService';
import { api } from '@/services/apiService';

export type SafetyStatus = 'SAFE' | 'ALERT' | 'EMERGENCY';

export type TripEvent = {
  id: string;
  status: SafetyStatus | 'CANCELLED';
  timestamp: string;
  label: string;
};

export type RouteSample = {
  lat: number;
  lng: number;
  t: number; // epoch ms
};

export type Trip = {
  id: string;
  startedAt: string;
  endedAt: string;
  duration: number;
  distance: number;
  hadAlert: boolean;
  events: TripEvent[];
  alertCount?: number;
  emergencyTriggered?: boolean;
  safeWindows?: number;
  route?: RouteSample[]; // GPS samples captured during the trip
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
  demoMode: boolean;
  mockAi: boolean;
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
  setDemoMode: (value: boolean) => Promise<void>;
  setMockAi: (value: boolean) => Promise<void>;
  refreshPermission: () => Promise<void>;
  simulateStatus: (status: PredictionStatus) => Promise<void>;
  windowsProcessed: number;
  networkAvailable: boolean;
  lastEventLabel: string;
  lastCompletedTrip: Trip | null;
  dismissCompletedTrip: () => void;
};

const defaultSettings: AppSettings = {
  notifyEmergencyServices: true,
  countdownSeconds: DEFAULT_COUNTDOWN_SECONDS,
  demoMode: true,
  mockAi: true,
};

const createId = () =>
  `${Date.now().toString()}-${Math.random().toString(36).slice(2, 9)}`;

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
  const [windowsProcessed, setWindowsProcessed] = useState(0);
  const [networkAvailable, setNetworkAvailable] = useState(true);
  const [lastCompletedTrip, setLastCompletedTrip] = useState<Trip | null>(null);

  const sensorBuffer = useRef(new SensorWindowBuffer());
  const latestAcceleration = useRef({ x: 0, y: 0, z: 0, timestamp: 0 });
  const latestRotation = useRef({ x: 0, y: 0, z: 0, timestamp: 0 });
  const previousLocation = useRef<{ lat: number; lng: number } | null>(null);
  const routeSamples = useRef<RouteSample[]>([]);
  const statusRef = useRef(status);
  const sessionRef = useRef(sessionId);
  useKeepAwake(tripActive ? 'aera-trip' : undefined);

  useEffect(() => {
    statusRef.current = status;
    sessionRef.current = sessionId;
  }, [status, sessionId]);

  useEffect(() => {
    const load = async () => {
      const stored = await loadStoredState();
      setTrips(stored.trips);
      setContacts(stored.contacts);
      setSettings({ ...defaultSettings, ...stored.settings });
      setHydrated(true);
    };
    void load();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void saveStoredState({ trips, contacts, settings });
  }, [hydrated, trips, contacts, settings]);

  const addEvent = useCallback((eventStatus: TripEvent['status'], label: string) => {
    setTripEvents((current) => [
      ...current,
      { id: createId(), status: eventStatus, timestamp: new Date().toISOString(), label },
    ]);
  }, []);

  const lastEventLabel = tripEvents[tripEvents.length - 1]?.label ?? 'Monitoring ready';

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
    const startedAt = new Date().toISOString();
    setSessionId(nextSession);
    setTripStartedAt(startedAt);
    setElapsedSeconds(0);
    setDistanceKm(0);
    setSpeedKmh(0);
    setStatus('SAFE');
    setConfidence(null);
    setEmergencySent(false);
    setCancelUntil(null);
    setLastCompletedTrip(null);
    setWindowsProcessed(0);
    setNetworkAvailable(true);
    setTripEvents([
      {
        id: createId(),
        status: 'SAFE',
        timestamp: startedAt,
        label: 'Trip started',
      },
    ]);
    sensorBuffer.current.clear();
    previousLocation.current = null;
    routeSamples.current = [];
    setTripActive(true);

    // Backend sync — additive, does not block trip start
    void api.trips.create({ tripId: nextSession, startTime: startedAt })
      .catch((err) => console.warn('[TripContext] Backend trip create failed:', err));

    // Seed the route buffer with an immediate fix so stationary trips still
    // have at least one usable coordinate.
    if (Platform.OS !== 'web') {
      try {
        const first = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const { latitude, longitude } = first.coords;
        previousLocation.current = { lat: latitude, lng: longitude };
        routeSamples.current.push({ lat: latitude, lng: longitude, t: Date.now() });
      } catch {
        // No fix yet — watcher will pick one up as soon as it's available.
      }
    }

    return true;
  }, []);

  const stopTrip = useCallback(async () => {
    if (!tripActive || !sessionId || !tripStartedAt) return;
    const endedAt = new Date().toISOString();

    // Edge case: subscription never fired (permissions revoked mid-trip,
    // very short trip, etc.). Try to grab one final fix so at least a
    // single marker survives on Trip Details.
    if (routeSamples.current.length === 0 && Platform.OS !== 'web') {
      try {
        const last = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        routeSamples.current.push({
          lat: last.coords.latitude,
          lng: last.coords.longitude,
          t: Date.now(),
        });
      } catch {
        // No fix — Trip Details will show the "Route unavailable" state.
      }
    }
    const nextTrip: Trip = {
      id: sessionId,
      startedAt: tripStartedAt,
      endedAt,
      duration: elapsedSeconds,
      distance: distanceKm,
      hadAlert: tripEvents.some((event) => event.status === 'ALERT' || event.status === 'EMERGENCY'),
      events: tripEvents,
      alertCount: tripEvents.filter((event) => event.status === 'ALERT').length,
      emergencyTriggered: tripEvents.some((event) => event.status === 'EMERGENCY'),
      safeWindows: windowsProcessed,
      route: routeSamples.current.length ? routeSamples.current.slice() : undefined,
    };
    setTrips((current) => [nextTrip, ...current].slice(0, 30));
    setLastCompletedTrip(nextTrip);
    setTripActive(false);
    setSessionId(null);
    setTripStartedAt(null);
    setStatus('SAFE');
    setAlertExpiresAt(null);
    setAlertSecondsLeft(0);
    setEmergencySent(false);
    setCancelUntil(null);
    sensorBuffer.current.clear();

    // Backend sync — additive, does not block trip end
    void api.trips.update(sessionId, {
      endTime: endedAt,
      duration: elapsedSeconds,
      distance: distanceKm,
      alertCount: nextTrip.alertCount,
      emergencyTriggered: nextTrip.emergencyTriggered,
      safeWindows: windowsProcessed,
    }).catch((err) => console.warn('[TripContext] Backend trip update failed:', err));
  }, [distanceKm, elapsedSeconds, sessionId, tripActive, tripEvents, tripStartedAt, windowsProcessed]);

  const sendEmergency = useCallback(async () => {
    if (!sessionRef.current) return;
    const location = Platform.OS === 'web' ? previousLocation.current : await getEmergencyLocation() ?? previousLocation.current;
    await sendEmergencyAlert({
      sessionId: sessionRef.current,
      location,
      timestamp: new Date().toISOString(),
      notifyEmergencyServices: settings.notifyEmergencyServices,
      confidence: confidence ?? 0.91,
    });
    setNetworkAvailable(true);
    setStatus('EMERGENCY');
    setEmergencySent(true);
    setCancelUntil(Date.now() + 8000);
    setAlertExpiresAt(null);
    setAlertSecondsLeft(0);
    addEvent('EMERGENCY', 'Emergency alert sent');
  }, [addEvent, confidence, settings.notifyEmergencyServices]);

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
      const windows = sensorBuffer.current.push({
        ax: acceleration.x,
        ay: acceleration.y,
        az: acceleration.z,
        gx: rotation.x,
        gy: rotation.y,
        gz: rotation.z,
        timestamp: Date.now(),
      });
      for (const window of windows) {
        setWindowsProcessed((current) => current + 1);
        void predictSensorWindow(window, sessionRef.current ?? '', settings.mockAi).then((result) => {
          if (!result) {
            setNetworkAvailable(false);
            return;
          }
          setNetworkAvailable(true);
          setConfidence(result.confidence);
          if (result.status === 'ALERT') triggerAlert('Abnormal motion detected', result.confidence);
          if (result.status === 'EMERGENCY') void sendEmergency();
        });
      }
      const magnitude = Math.sqrt(acceleration.x ** 2 + acceleration.y ** 2 + acceleration.z ** 2);
      const rotationMagnitude = Math.sqrt(rotation.x ** 2 + rotation.y ** 2 + rotation.z ** 2);
      if (magnitude > 17 || magnitude < 2 || rotationMagnitude > 5.4) {
        triggerAlert('Sudden motion detected', 0.94);
      }
    },
    [sendEmergency, settings.mockAi, triggerAlert],
  );

  useEffect(() => {
    if (!tripActive || Platform.OS === 'web') return;
    Accelerometer.setUpdateInterval(20);
    Gyroscope.setUpdateInterval(20);
    const accelerationSubscription = Accelerometer.addListener((data) => {
      latestAcceleration.current = { ...data, timestamp: Date.now() };
      if (latestAcceleration.current.timestamp - latestRotation.current.timestamp < 100) {
        handleSensorSample(latestAcceleration.current, latestRotation.current);
      }
    });
    const gyroscopeSubscription = Gyroscope.addListener((data) => {
      latestRotation.current = { ...data, timestamp: Date.now() };
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
      // A `distanceInterval` of 5 m suppressed callbacks on stationary
      // devices (the phone never moved 5 m so no fix arrived). Set it to 0
      // so `timeInterval` alone drives updates — this keeps parked / desk
      // trips populated with at least one sample per second.
      { accuracy: Location.Accuracy.Balanced, timeInterval: 1000, distanceInterval: 0 },
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
        // Persist the sample for later replay in Trip Details / Live Location.
        // Skip duplicate consecutive fixes (identical stationary coordinate)
        // so the buffer doesn't fill with 3 600 identical rows/hour. Cap to
        // 2 000 entries as an overall safety.
        const buf = routeSamples.current;
        const last = buf[buf.length - 1];
        const isDupe =
          last && last.lat === latitude && last.lng === longitude;
        if (!isDupe) buf.push({ lat: latitude, lng: longitude, t: Date.now() });
        if (buf.length > 2000) buf.splice(0, buf.length - 2000);
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
    addEvent('EMERGENCY', 'Manual SOS triggered');
    await sendEmergency();
  }, [addEvent, sendEmergency, tripActive]);

  const simulateStatus = useCallback(
    async (nextStatus: PredictionStatus) => {
      if (!tripActive) return;
      const result = await simulatePrediction(nextStatus);
      setConfidence(result.confidence);
      if (result.status === 'SAFE') {
        setStatus('SAFE');
        setAlertExpiresAt(null);
        setAlertSecondsLeft(0);
        addEvent('SAFE', 'Demo: simulated safe window');
      }
      if (result.status === 'ALERT') triggerAlert('Demo: unusual motion detected', result.confidence);
      if (result.status === 'EMERGENCY') await sendEmergency();
    },
    [addEvent, sendEmergency, triggerAlert, tripActive],
  );

  const addContact = useCallback(async (contact: Omit<Contact, 'id'>) => {
    const saved = { ...contact, id: createId() };
    setContacts((current) => [...current, saved]);
    void syncContact(saved);
  }, []);

  const updateContact = useCallback(async (contact: Contact) => {
    setContacts((current) => current.map((item) => (item.id === contact.id ? contact : item)));
    void syncContact(contact);
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

  const setDemoMode = useCallback(async (value: boolean) => {
    setSettings((current) => ({ ...current, demoMode: value }));
  }, []);

  const setMockAi = useCallback(async (value: boolean) => {
    setSettings((current) => ({ ...current, mockAi: value }));
  }, []);

  const dismissCompletedTrip = useCallback(() => setLastCompletedTrip(null), []);

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
      setDemoMode,
      setMockAi,
      refreshPermission,
      simulateStatus,
      windowsProcessed,
      networkAvailable,
      lastEventLabel,
      lastCompletedTrip,
      dismissCompletedTrip,
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
      setDemoMode,
      setMockAi,
      setNotifyEmergencyServices,
      updateContact,
      simulateStatus,
      windowsProcessed,
      networkAvailable,
      lastEventLabel,
      lastCompletedTrip,
      dismissCompletedTrip,
    ],
  );

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

export function useTrip() {
  const value = useContext(TripContext);
  if (!value) throw new Error('useTrip must be used inside TripProvider');
  return value;
}