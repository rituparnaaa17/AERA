# AERA - Architecture & File Structure

AERA is a modern mobile vehicular safety and emergency response application built with **React Native**, **Expo (Expo Router)**, and **TypeScript**.

---

## 📁 Clean File Structure Overview

```text
aera/
├── 📂 app/                           # Expo Router File-Based Routing (Screens)
│   ├── 📂 (auth)/                    # Authentication Navigation Group
│   │   ├── _layout.tsx               # Auth Stack Layout
│   │   ├── login.tsx                 # Login Screen
│   │   ├── signup.tsx                # Driver Signup Screen
│   │   └── forgot-password.tsx       # Password Recovery Screen
│   │
│   ├── 📂 (tabs)/                    # Main Navigation Group (Bottom Tabs)
│   │   ├── _layout.tsx               # Bottom Navigation Bar
│   │   ├── index.tsx                 # 🏠 Dashboard / Safety Monitor (Main Screen)
│   │   ├── live.tsx                  # 📡 Live Sensor Stream & Telemetry
│   │   ├── history.tsx               # 📜 Trip History & Incident Logs
│   │   ├── contacts.tsx              # 📞 Emergency Contacts Management
│   │   └── settings.tsx              # ⚙️ App & Safety Settings
│   │
│   ├── _layout.tsx                   # Global Root Navigation Stack
│   ├── alert.tsx                     # ⚠️ Crash Impact Confirmation Overlay (Countdown)
│   ├── emergency.tsx                 # 🚨 SOS & Escalation Screen
│   ├── trip.tsx                      # 🚗 Active Trip Safety Tracking
│   ├── summary.tsx                   # 📊 Post-Trip Analytics & Summary
│   └── +not-found.tsx                # 404 Route Fallback
│
├── 📂 assets/                        # Static Branding & Media Assets
│   └── images/
│       └── logo.png                  # App Logo & Branding Graphics
│
├── 📂 components/                    # Modular & Reusable UI Components
│   ├── AppPrimitives.tsx             # Design System (Cards, Badges, Buttons, Stat Callouts)
│   ├── SensorStatusCard.tsx          # Real-time Telemetry Status Card
│   ├── SOSButton.tsx                 # Hold-to-Trigger Emergency Button
│   ├── TripContext.tsx               # Global State Manager (Sensors, Trip Logic, SOS)
│   ├── ErrorBoundary.tsx             # Crash & Exception Boundary Wrapper
│   └── ErrorFallback.tsx             # Graceful Error UI Display
│
├── 📂 services/                      # Decoupled Business Logic & Hardware Drivers
│   ├── sensorService.ts              # Accelerometer & Gyroscope Hardware Integration
│   ├── locationService.ts            # GPS Location Service Handler
│   ├── inferenceService.ts           # AI Risk Inference (150x6 window @ stride 15)
│   ├── alertService.ts               # Haptic Vibration & Sound Alert Manager
│   ├── contactService.ts             # Emergency Contacts Manager
│   └── storageService.ts             # Local Storage & AsyncStorage Handler
│
├── 📂 constants/                     # Color Tokens & Design System Variables
│   └── colors.ts                     # Palette Definitions (Emergency Dark & Light Themes)
│
├── 📂 hooks/                         # Custom React Hooks
│   └── useColors.ts                  # Theme & Color Management Hook
│
├── 📂 utils/                         # Helper Constants & Math Utilities
│   └── constants.ts                  # Sensor Thresholds & Sampling Rates
│
├── app.json                          # Expo Application Configuration
├── metro.config.js                   # Metro Bundler Configuration
└── package.json                      # NPM Dependencies & Scripts
```

---

## 🛠️ Key Architectural Layer Responsibilities

1. **`app/` (Presentation & Routing)**
   - Utilizes Expo Router file-based routing.
   - Screen files focus purely on layout, user interaction, and presentation.

2. **`components/` (UI Primitives & Global Context)**
   - Reusable UI widgets built using clean design tokens.
   - `TripContext.tsx` handles real-time sensor sampling, window buffering, risk status transitions (`SAFE` → `ALERT` → `EMERGENCY`), active trip timer, and SOS triggers.

3. **`services/` (Hardware & Business Logic)**
   - Pure, decoupled modules for hardware sensor access (`expo-sensors`), location tracking (`expo-location`), audio/vibration feedback (`expo-av`, `Haptics`), and AI temporal inference window calculations.

4. **`constants/` & `hooks/` (Design System)**
   - Unified color system supporting modern dark/light safety themes with high contrast emergency indicators.
