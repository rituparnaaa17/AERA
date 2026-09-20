/**
 * TripContext.tsx — AERA
 *
 * Central state machine for the live trip safety system.
 *
 * Detection State Machine:
 *   IDLE → CALIBRATING → MONITORING → POTENTIAL_RISK → VERIFYING → SAFE | EMERGENCY
 *
 * Key fixes vs. previous version:
 *   1. Removed instant `magnitude < 2` false-positive trigger
 *   2. Added 3-second calibration phase that establishes a baseline
 *   3. Rolling 2-second buffer with multi-signal scoring
 *   4. Event IDs + 30-second post-dismiss cooldown prevent re-triggers
 *   5. Stable refs for sensor callbacks — no subscription duplication
 *   6. Full GPS LocationFix (lat, lng, accuracy, speed, heading)
 *   7. Exposed live sensor diagnostics in context for debug panel
 */

import * as Location from 'expo-location';
import { Accelerometer, Gyroscope } from 'expo-sensors';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
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
import { getEmergencyLocationFix, type LocationFix } from '@/services/locationService';
import { predictSensorWindow, simulatePrediction, PredictionStatus } from '@/services/inferenceService';
import { DEFAULT_COUNTDOWN_SECONDS } from '@/utils/constants';
import { SensorWindowBuffer } from '@/services/sensorService';
import { loadStoredState, saveStoredState } from '@/services/storageService';
import { api } from '@/services/apiService';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type SafetyStatus = 'SAFE' | 'ALERT' | 'EMERGENCY';

export type DetectionState =
  | 'IDLE'
  | 'CALIBRATING'
  | 'MONITORING'
  | 'POTENTIAL_RISK'
  | 'VERIFYING'
  | 'SAFE'
  | 'EMERGENCY';

export type TripEvent = {
  id: string;
  status: SafetyStatus | 'CANCELLED';
  timestamp: string;
  label: string;
};

export type RouteSample = {
  lat: number;
  lng: number;
  t: number;
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
  route?: RouteSample[];
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

// Live sensor diagnostics (exposed to debug panel)
export type SensorDiagnostics = {
  accelX: number;
  accelY: number;
  accelZ: number;
  accelMagnitude: number;
  accelActive: boolean;
  accelError: string | null;
  gyroX: number;
  gyroY: number;
  gyroZ: number;
  gyroMagnitude: number;
  gyroActive: boolean;
  gyroError: string | null;
  gpsActive: boolean;
  gpsPermission: 'granted' | 'denied' | 'unknown';
  gpsLat: number | null;
  gpsLng: number | null;
  gpsAccuracy: number | null;
  gpsSpeed: number | null;
  gpsHeading: number | null;
  gpsLastUpdate: number | null;
  crashConfidence: number | null;
  detectionState: DetectionState;
  calibrating: boolean;
  lastSensorUpdate: number | null;
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
  diagnostics: SensorDiagnostics;
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

// ─── Constants ──────────────────────────────────────────────────────────────────

const defaultSettings: AppSettings = {
  notifyEmergencyServices: true,
  countdownSeconds: DEFAULT_COUNTDOWN_SECONDS,
  // Both demoMode and mockAi default to OFF so the app uses real sensors and real AI by default.
  // Users can toggle these in Settings → Developer if needed.
  demoMode: false,
  mockAi: false,
};

/** How long to calibrate at trip start (ms) */
const CALIBRATION_DURATION_MS = 4000;
/** How long to suppress alerts after "I'm OK" (ms) */
const POST_DISMISS_COOLDOWN_MS = 30_000;
/** Evaluation interval for rolling window analysis (ms) */
const EVAL_INTERVAL_MS = 300;
/** Rolling window duration (ms) */
const ROLLING_WINDOW_MS = 2000;
/** Min risk score to enter POTENTIAL_RISK state */
const RISK_SCORE_THRESHOLD = 6;
/** Target sensor update rate (ms) */
const SENSOR_INTERVAL_MS = 20;

const createId = () =>
  `${Date.now().toString()}-${Math.random().toString(36).slice(2, 9)}`;

const defaultDiagnostics: SensorDiagnostics = {
  accelX: 0, accelY: 0, accelZ: 0, accelMagnitude: 0,
  accelActive: false, accelError: null,
  gyroX: 0, gyroY: 0, gyroZ: 0, gyroMagnitude: 0,
  gyroActive: false, gyroError: null,
  gpsActive: false, gpsPermission: 'unknown',
  gpsLat: null, gpsLng: null, gpsAccuracy: null,
  gpsSpeed: null, gpsHeading: null, gpsLastUpdate: null,
  crashConfidence: null, detectionState: 'IDLE',
  calibrating: false, lastSensorUpdate: null,
};

// ─── Context ────────────────────────────────────────────────────────────────────

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
  const [diagnostics, setDiagnostics] = useState<SensorDiagnostics>(defaultDiagnostics);

  // ── Stable refs (avoid closing over stale state in sensor callbacks) ──────────
  const sensorBuffer = useRef(new SensorWindowBuffer());
  const latestAccel = useRef({ x: 0, y: 0, z: 0, ts: 0 });
  const latestGyro = useRef({ x: 0, y: 0, z: 0, ts: 0 });
  const latestLocation = useRef<LocationFix | null>(null);
  const previousLocation = useRef<{ lat: number; lng: number } | null>(null);
  const routeSamples = useRef<RouteSample[]>([]);

  const statusRef = useRef(status);
  const sessionRef = useRef(sessionId);
  const tripActiveRef = useRef(tripActive);
  const settingsRef = useRef(settings);
  const confidenceRef = useRef(confidence);
  const speedKmhRef = useRef(speedKmh);

  // ── Detection state machine refs ──────────────────────────────────────────────
  const detectionStateRef = useRef<DetectionState>('IDLE');
  const calibratingRef = useRef(false);
  const calibrationStartRef = useRef(0);
  const calibrationSamplesRef = useRef<number[]>([]);
  const baselineMeanRef = useRef(1.0);  // ≈ 1g at rest
  const baselineStddevRef = useRef(0.1);
  const cooldownUntilRef = useRef(0);
  const currentAlertIdRef = useRef<string | null>(null);
  const dismissedAlertIdRef = useRef<string | null>(null);
  const rollingBufferRef = useRef<Array<{ accelMag: number; gyroMag: number; ts: number }>>([]);
  const evalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Sensor subscription refs (stable, avoid duplication) ─────────────────────
  const accelSubRef = useRef<{ remove: () => void } | null>(null);
  const gyroSubRef = useRef<{ remove: () => void } | null>(null);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const locationSubCancelledRef = useRef(false);

  useEffect(() => {
    if (tripActive) {
      void activateKeepAwakeAsync('aera-trip');
    } else {
      void deactivateKeepAwake('aera-trip');
    }
  }, [tripActive]);

  // ── Sync refs with state ──────────────────────────────────────────────────────
  useEffect(() => {
    statusRef.current = status;
    sessionRef.current = sessionId;
    tripActiveRef.current = tripActive;
    settingsRef.current = settings;
    confidenceRef.current = confidence;
    speedKmhRef.current = speedKmh;
  }, [status, sessionId, tripActive, settings, confidence, speedKmh]);

  // ── Hydration ─────────────────────────────────────────────────────────────────
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

  // ── Permission ────────────────────────────────────────────────────────────────
  const refreshPermission = useCallback(async () => {
    if (Platform.OS === 'web') {
      setPermissionGranted(true);
      setDiagnostics((d) => ({ ...d, gpsPermission: 'granted' }));
      return;
    }
    const result = await Location.getForegroundPermissionsAsync();
    const granted = result.status === 'granted';
    setPermissionGranted(granted);
    setDiagnostics((d) => ({ ...d, gpsPermission: granted ? 'granted' : 'denied' }));
  }, []);

  useEffect(() => {
    void refreshPermission();
  }, [refreshPermission]);

  // ── Sensor cleanup ────────────────────────────────────────────────────────────
  const stopSensors = useCallback(() => {
    accelSubRef.current?.remove();
    accelSubRef.current = null;
    gyroSubRef.current?.remove();
    gyroSubRef.current = null;
    if (evalTimerRef.current) {
      clearInterval(evalTimerRef.current);
      evalTimerRef.current = null;
    }
    calibratingRef.current = false;
    detectionStateRef.current = 'IDLE';
    rollingBufferRef.current = [];
    calibrationSamplesRef.current = [];
  }, []);

  const stopGps = useCallback(() => {
    locationSubCancelledRef.current = true;
    locationSubRef.current?.remove();
    locationSubRef.current = null;
  }, []);

  // ── Emergency sender ──────────────────────────────────────────────────────────
  const sendEmergency = useCallback(async () => {
    if (!sessionRef.current) return;
    if (statusRef.current === 'EMERGENCY') return; // already sent

    // Get freshest available location
    let location: LocationFix | null = null;
    if (Platform.OS !== 'web') {
      try {
        location = await getEmergencyLocationFix();
      } catch {
        // fall through to cached
      }
    }
    if (!location && latestLocation.current) {
      location = latestLocation.current;
    }

    await sendEmergencyAlert({
      sessionId: sessionRef.current,
      location: location ? {
        lat: location.lat,
        lng: location.lng,
        accuracy: location.accuracy,
        speed: location.speed,
        heading: location.heading,
      } : null,
      timestamp: new Date().toISOString(),
      notifyEmergencyServices: settingsRef.current.notifyEmergencyServices,
      confidence: confidenceRef.current ?? 0,
    });

    setNetworkAvailable(true);
    setStatus('EMERGENCY');
    setEmergencySent(true);
    setCancelUntil(Date.now() + 8000);
    setAlertExpiresAt(null);
    setAlertSecondsLeft(0);
    addEvent('EMERGENCY', 'Emergency alert sent');
    detectionStateRef.current = 'EMERGENCY';
    setDiagnostics((d) => ({ ...d, detectionState: 'EMERGENCY' }));
  }, [addEvent]);

  // ── Alert trigger ─────────────────────────────────────────────────────────────
  const triggerAlert = useCallback(
    (label: string, nextConfidence = 0.91, alertId?: string) => {
      if (!tripActiveRef.current) return;
      if (statusRef.current !== 'SAFE') return;
      if (Date.now() < cooldownUntilRef.current) return;

      const eventId = alertId ?? createId();
      // Do not re-trigger if this event was dismissed
      if (eventId === dismissedAlertIdRef.current) return;

      currentAlertIdRef.current = eventId;
      detectionStateRef.current = 'VERIFYING';

      setStatus('ALERT');
      setConfidence(nextConfidence);
      setAlertSecondsLeft(settingsRef.current.countdownSeconds);
      setAlertExpiresAt(Date.now() + settingsRef.current.countdownSeconds * 1000);
      addEvent('ALERT', label);
      setDiagnostics((d) => ({ ...d, detectionState: 'VERIFYING', crashConfidence: nextConfidence }));
    },
    [addEvent],
  );

  // ── Rolling window evaluator (runs every EVAL_INTERVAL_MS while trip active) ──
  const evaluateRollingWindow = useCallback(() => {
    if (!tripActiveRef.current) return;
    if (calibratingRef.current) return;
    if (statusRef.current !== 'SAFE') return;
    if (Date.now() < cooldownUntilRef.current) return;

    const now = Date.now();
    const window = rollingBufferRef.current.filter((s) => now - s.ts <= ROLLING_WINDOW_MS);
    rollingBufferRef.current = window;

    if (window.length < 5) return; // not enough samples yet

    const accelMags = window.map((s) => s.accelMag);
    const gyroMags = window.map((s) => s.gyroMag);
    const peakAccel = Math.max(...accelMags);
    const peakGyro = Math.max(...gyroMags);
    const meanAccel = accelMags.reduce((a, b) => a + b, 0) / accelMags.length;
    const deltaAccel = meanAccel - baselineMeanRef.current;
    const currentSpeed = speedKmhRef.current;

    // ── Multi-signal risk scoring ─────────────────────────────────────────────
    let riskScore = 0;

    // Large deviation from calibrated baseline
    if (deltaAccel > baselineStddevRef.current * 4) riskScore += 3;

    // Absolute extreme acceleration (> 3.5g ≈ 34 m/s² but sensors report in g)
    if (peakAccel > 3.5) riskScore += 2;

    // Significant rotation
    if (peakGyro > 3.0) riskScore += 2;

    // Speed context: moving vehicle amplifies risk
    if (currentSpeed > 10 && deltaAccel > 1.5) riskScore += 3;
    if (currentSpeed > 30 && peakAccel > 2.5) riskScore += 2;

    // Stationary penalty: heavily penalize alerts when phone is not moving
    if (currentSpeed < 2) riskScore -= 6;

    // Brief spike < 200ms probably not a crash
    const spikeDuration = window.filter((s) => s.accelMag > baselineMeanRef.current + baselineStddevRef.current * 3).length;
    if (spikeDuration < 3) riskScore -= 2; // very brief spike, likely noise

    if (riskScore >= RISK_SCORE_THRESHOLD) {
      const alertConfidence = Math.min(0.99, 0.6 + (riskScore - RISK_SCORE_THRESHOLD) * 0.05);
      triggerAlert('Abnormal driving pattern detected', alertConfidence);
    }
  }, [triggerAlert]);

  // ── Sensor callback (stable — only recreated when absolutely needed) ──────────
  const handleAccelSample = useCallback((data: { x: number; y: number; z: number }) => {
    const ts = Date.now();
    latestAccel.current = { ...data, ts };
    const accelMag = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2);

    // Push to rolling buffer
    rollingBufferRef.current.push({
      accelMag,
      gyroMag: Math.sqrt(
        latestGyro.current.x ** 2 +
        latestGyro.current.y ** 2 +
        latestGyro.current.z ** 2
      ),
      ts,
    });

    // Calibration phase: accumulate baseline samples
    if (calibratingRef.current) {
      calibrationSamplesRef.current.push(accelMag);
    }

    // Push to ML sensor buffer (uses separate logic)
    if (tripActiveRef.current && !calibratingRef.current) {
      const windows = sensorBuffer.current.push({
        ax: data.x, ay: data.y, az: data.z,
        gx: latestGyro.current.x, gy: latestGyro.current.y, gz: latestGyro.current.z,
        timestamp: ts,
      });
      if (windows.length > 0) {
        setWindowsProcessed((c) => c + 1);
        for (const win of windows) {
          void predictSensorWindow(win, sessionRef.current ?? '', settingsRef.current.mockAi).then((result) => {
            if (!result) { setNetworkAvailable(false); return; }
            setNetworkAvailable(true);
            // ML model result is advisory only — decision engine decides
            if (result.confidence > 0.92 && result.status === 'EMERGENCY') {
              // Very high confidence: boost rolling window score but don't auto-escalate
              setDiagnostics((d) => ({ ...d, crashConfidence: result.confidence }));
            }
          });
        }
      }
    }

    // Update diagnostics
    setDiagnostics((d) => ({
      ...d,
      accelX: data.x,
      accelY: data.y,
      accelZ: data.z,
      accelMagnitude: accelMag,
      accelActive: true,
      accelError: null,
      lastSensorUpdate: ts,
    }));
  }, []);

  const handleGyroSample = useCallback((data: { x: number; y: number; z: number }) => {
    const ts = Date.now();
    latestGyro.current = { ...data, ts };
    const gyroMag = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2);
    setDiagnostics((d) => ({
      ...d,
      gyroX: data.x,
      gyroY: data.y,
      gyroZ: data.z,
      gyroMagnitude: gyroMag,
      gyroActive: true,
      gyroError: null,
    }));
  }, []);

  // ── Calibration completion ────────────────────────────────────────────────────
  const finishCalibration = useCallback(() => {
    const samples = calibrationSamplesRef.current;
    if (samples.length > 0) {
      const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
      const variance = samples.reduce((a, b) => a + (b - mean) ** 2, 0) / samples.length;
      baselineMeanRef.current = mean;
      baselineStddevRef.current = Math.max(0.05, Math.sqrt(variance));
    }
    calibratingRef.current = false;
    detectionStateRef.current = 'MONITORING';
    setDiagnostics((d) => ({ ...d, calibrating: false, detectionState: 'MONITORING' }));
    addEvent('SAFE', 'Safety monitoring active');
  }, [addEvent]);

  // ── Start sensors ─────────────────────────────────────────────────────────────
  const startSensors = useCallback(() => {
    // Ensure clean slate — stop any existing subscriptions first
    stopSensors();

    if (Platform.OS === 'web') return;

    calibratingRef.current = true;
    calibrationStartRef.current = Date.now();
    calibrationSamplesRef.current = [];
    rollingBufferRef.current = [];
    detectionStateRef.current = 'CALIBRATING';
    setDiagnostics((d) => ({ ...d, calibrating: true, detectionState: 'CALIBRATING', accelActive: false, gyroActive: false }));

    // Calibration timeout
    setTimeout(() => {
      if (calibratingRef.current) finishCalibration();
    }, CALIBRATION_DURATION_MS);

    try {
      Accelerometer.setUpdateInterval(SENSOR_INTERVAL_MS);
      accelSubRef.current = Accelerometer.addListener(handleAccelSample);
    } catch (err) {
      setDiagnostics((d) => ({ ...d, accelError: String(err), accelActive: false }));
    }

    try {
      Gyroscope.setUpdateInterval(SENSOR_INTERVAL_MS);
      gyroSubRef.current = Gyroscope.addListener(handleGyroSample);
    } catch (err) {
      setDiagnostics((d) => ({ ...d, gyroError: String(err), gyroActive: false }));
    }

    // Start rolling window evaluator
    evalTimerRef.current = setInterval(evaluateRollingWindow, EVAL_INTERVAL_MS);
  }, [stopSensors, finishCalibration, handleAccelSample, handleGyroSample, evaluateRollingWindow]);

  // ── Start GPS ─────────────────────────────────────────────────────────────────
  const startGps = useCallback(() => {
    stopGps();
    if (Platform.OS === 'web') return;

    locationSubCancelledRef.current = false;
    setDiagnostics((d) => ({ ...d, gpsActive: false }));

    void Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 0,
      },
      (loc) => {
        if (locationSubCancelledRef.current) return;
        const { latitude, longitude, accuracy, speed, heading } = loc.coords;
        const fix: LocationFix = {
          lat: latitude,
          lng: longitude,
          accuracy: accuracy ?? undefined,
          speed: speed !== null && speed !== undefined && speed >= 0 ? speed : undefined,
          heading: heading !== null && heading !== undefined && heading >= 0 ? heading : undefined,
          timestamp: loc.timestamp,
        };
        latestLocation.current = fix;

        const speedMs = fix.speed ?? 0;
        const kmh = Math.max(0, speedMs * 3.6);
        setSpeedKmh(kmh);
        speedKmhRef.current = kmh;

        // Haversine distance
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

        // Route buffer
        const buf = routeSamples.current;
        const last = buf[buf.length - 1];
        const isDupe = last && last.lat === latitude && last.lng === longitude;
        if (!isDupe) buf.push({ lat: latitude, lng: longitude, t: Date.now() });
        if (buf.length > 2000) buf.splice(0, buf.length - 2000);

        setDiagnostics((d) => ({
          ...d,
          gpsActive: true,
          gpsLat: latitude,
          gpsLng: longitude,
          gpsAccuracy: fix.accuracy ?? null,
          gpsSpeed: kmh,
          gpsHeading: fix.heading ?? null,
          gpsLastUpdate: Date.now(),
        }));
      },
    ).then((sub) => {
      if (locationSubCancelledRef.current) {
        sub.remove();
      } else {
        locationSubRef.current = sub;
      }
    }).catch((err) => {
      console.warn('[TripContext] GPS watcher failed:', err);
      setDiagnostics((d) => ({ ...d, gpsActive: false }));
    });
  }, [stopGps]);

  // ── Start Trip ────────────────────────────────────────────────────────────────
  const startTrip = useCallback(async () => {
    if (Platform.OS !== 'web') {
      const result = await Location.requestForegroundPermissionsAsync();
      const granted = result.status === 'granted';
      setPermissionGranted(granted);
      setDiagnostics((d) => ({ ...d, gpsPermission: granted ? 'granted' : 'denied' }));
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
      { id: createId(), status: 'SAFE', timestamp: startedAt, label: 'Trip started — calibrating sensors…' },
    ]);

    sensorBuffer.current.clear();
    previousLocation.current = null;
    latestLocation.current = null;
    routeSamples.current = [];
    cooldownUntilRef.current = 0;
    currentAlertIdRef.current = null;
    dismissedAlertIdRef.current = null;
    sessionRef.current = nextSession;
    tripActiveRef.current = true;

    setTripActive(true);

    // Backend sync (non-blocking)
    void api.trips.create({ tripId: nextSession, startTime: startedAt })
      .catch((err) => console.warn('[TripContext] Backend trip create failed:', err));

    // Seed initial location
    if (Platform.OS !== 'web') {
      try {
        const first = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { latitude, longitude } = first.coords;
        previousLocation.current = { lat: latitude, lng: longitude };
        latestLocation.current = {
          lat: latitude, lng: longitude,
          accuracy: first.coords.accuracy ?? undefined,
          speed: undefined, heading: undefined,
          timestamp: first.timestamp,
        };
        routeSamples.current.push({ lat: latitude, lng: longitude, t: Date.now() });
      } catch {
        // Watcher will pick up first fix
      }
    }

    // Start sensors and GPS
    startSensors();
    startGps();

    return true;
  }, [startSensors, startGps]);

  // ── Stop Trip ─────────────────────────────────────────────────────────────────
  const stopTrip = useCallback(async () => {
    if (!tripActiveRef.current || !sessionRef.current || !tripStartedAt) return;
    const endedAt = new Date().toISOString();
    const currentSession = sessionRef.current;

    // Stop all sensors and GPS first
    stopSensors();
    stopGps();
    tripActiveRef.current = false;

    // Final location fix if no route
    if (routeSamples.current.length === 0 && Platform.OS !== 'web') {
      try {
        const last = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        routeSamples.current.push({ lat: last.coords.latitude, lng: last.coords.longitude, t: Date.now() });
      } catch { /* no fix */ }
    }

    const currentEvents = tripEvents;
    const currentElapsed = elapsedSeconds;
    const currentDistance = distanceKm;
    const currentWindows = windowsProcessed;

    const nextTrip: Trip = {
      id: currentSession,
      startedAt: tripStartedAt,
      endedAt,
      duration: currentElapsed,
      distance: currentDistance,
      hadAlert: currentEvents.some((e) => e.status === 'ALERT' || e.status === 'EMERGENCY'),
      events: currentEvents,
      alertCount: currentEvents.filter((e) => e.status === 'ALERT').length,
      emergencyTriggered: currentEvents.some((e) => e.status === 'EMERGENCY'),
      safeWindows: currentWindows,
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
    detectionStateRef.current = 'IDLE';
    setDiagnostics((d) => ({
      ...d,
      accelActive: false,
      gyroActive: false,
      gpsActive: false,
      calibrating: false,
      detectionState: 'IDLE',
    }));

    void api.trips.update(currentSession, {
      endTime: endedAt,
      duration: currentElapsed,
      distance: currentDistance,
      alertCount: nextTrip.alertCount,
      emergencyTriggered: nextTrip.emergencyTriggered,
      safeWindows: currentWindows,
    }).catch((err) => console.warn('[TripContext] Backend trip update failed:', err));
  }, [distanceKm, elapsedSeconds, sessionId, tripStartedAt, tripEvents, windowsProcessed, stopSensors, stopGps]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSensors();
      stopGps();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Alert countdown ───────────────────────────────────────────────────────────
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

  // ── Elapsed timer ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!tripActive) return;
    const timer = setInterval(() => setElapsedSeconds((current) => current + 1), 1000);
    return () => clearInterval(timer);
  }, [tripActive]);

  // ── Acknowledge OK ────────────────────────────────────────────────────────────
  const acknowledgeOk = useCallback(() => {
    if (statusRef.current !== 'ALERT') return;
    // Mark the current event as dismissed and enter 30s cooldown
    dismissedAlertIdRef.current = currentAlertIdRef.current;
    cooldownUntilRef.current = Date.now() + POST_DISMISS_COOLDOWN_MS;
    currentAlertIdRef.current = null;
    detectionStateRef.current = 'MONITORING';

    // Clear buffer so old samples belonging to this event do not re-trigger
    sensorBuffer.current.clear();
    rollingBufferRef.current = [];

    setStatus('SAFE');
    setAlertExpiresAt(null);
    setAlertSecondsLeft(0);
    setConfidence(null);
    addEvent('SAFE', "Driver confirmed they're OK");
    setDiagnostics((d) => ({ ...d, detectionState: 'MONITORING', crashConfidence: null }));
  }, [addEvent]);

  // ── Cancel Emergency ──────────────────────────────────────────────────────────
  const cancelEmergency = useCallback(() => {
    if (!emergencySent || !cancelUntil || Date.now() > cancelUntil) return;
    setEmergencySent(false);
    setStatus('SAFE');
    setCancelUntil(null);
    setConfidence(null);
    detectionStateRef.current = 'MONITORING';
    addEvent('CANCELLED', 'Emergency alert cancelled');
  }, [addEvent, cancelUntil, emergencySent]);

  // ── Manual SOS ────────────────────────────────────────────────────────────────
  const triggerManualSos = useCallback(async () => {
    if (!tripActiveRef.current) return;
    addEvent('EMERGENCY', 'Manual SOS triggered');
    await sendEmergency();
  }, [addEvent, sendEmergency]);

  // ── Simulate (dev/demo) ───────────────────────────────────────────────────────
  const simulateStatus = useCallback(
    async (nextStatus: PredictionStatus) => {
      if (!tripActiveRef.current) return;
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
    [addEvent, sendEmergency, triggerAlert],
  );

  // ── Contacts ──────────────────────────────────────────────────────────────────
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

  // ── Settings ──────────────────────────────────────────────────────────────────
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

  // ── Context value ─────────────────────────────────────────────────────────────
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
      diagnostics,
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
      diagnostics,
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