# Bike Management & Renewal Journal (PWA) — Implementation Plan

## 1. Overview & System Architecture
This application is designed as an **Offline-First Progressive Web App (PWA)** built with **HTML5, Tailwind CSS, React (via Babel standalone/CDN), and IndexedDB (via Dexie.js)** inside a single deployable or executable file. It targets Android, iOS, and Web platforms through PWA installation features (Add to Home Screen).

### Key Architectural Highlights
- **Storage:** Local IndexedDB using Dexie.js for storing bikes, service logs, renewal records, document images, and settings.
- **Offline Capability:** Fully functional offline via Service Worker caching.
- **Multi-Device Sync:** Peer-to-peer / File-based JSON Export & Import (encrypted optional) or WebRTC sync to transfer data between Android, iOS, and Web without relying on central paid backend servers.
- **Security:** PIN/Passcode lock with Web Authentication API (Biometrics: Fingerprint / Face ID / Touch ID) support.
- **Localization & Nepali Context:** Built-in BS (Bikram Sambat) to AD (Anno Domini) converter, dual-calendar picker support, Nepali font options (e.g., Mukta / Sagarmatha), and multi-stage Tax/Renewal status badge system tailored for Nepal vehicle laws.

---

## 2. Feature Breakdown & Requirements Matrix

| Feature | Description | Implementation Strategy |
| :--- | :--- | :--- |
| **Bike Profile** | Stores bike name, category, purchase year, plate number, engine details. | IndexedDB `bikes` table |
| **Service Journal** | Tracks last service date, current Odometer (km), next service reminder (days/km), cost breakdown. | IndexedDB `services` table |
| **Renewals & Taxes (Nepal Law)** | Tracks tax renewal dates, 90-day grace period status, fine alerts. | Dual Date logic (BS/AD) + Status Badges |
| **Documents Vault** | Securely stores photos of Bike and Blue Book pages. | Base64 strings / Blobs stored in IndexedDB |
| **Expense Tracking & Analytics** | Categorizes expenditures (Service, Repairs, Renewal Tax, Insurance, Modifications). | Recharts / Chart.js canvas visuals |
| **Nepali Calendar & Converter** | Supports dual BS/AD date selection, Nepali language UI toggle. | Custom Nepali Date Utility (BS 2000 - 2090+) |
| **Biometric / PIN Lock** | Secures access to personal bike/tax data. | `navigator.credentials` + Local Storage PIN hash |
| **PWA Installability** | Offline manifest, app icon, service worker registration for native app feel. | `manifest.json` + `sw.js` |

---

## 3. Nepali Tax Renewal & Grace Period Logic

Nepal vehicle law requires annual renewal with specific status bands based on the renewal date:

```
[ Valid Tax Period ] ---> [ Expiry Date ] ---> [ 90-Day Grace Period ] ---> [ Fined Period ]
  (Green Badge)             (Yellow Warning)       (Orange Tag)               (Red Alert)
```

### Calculation Rules
1. **Valid (`IN_TIME`):** Today $\le$ Renewal Expiry Date.
2. **Grace Period (`GRACE_PERIOD`):** Renewal Expiry Date $<$ Today $\le$ Renewal Expiry Date + 90 Days. *(Displays: "Within 90-day grace period - No fine yet")*
3. **Overdue Fined (`FINED`):** Today $>$ Renewal Expiry Date + 90 Days. *(Displays fine tier alerts: 15%, 30%, or 100% depending on elapsed years)*

---

## 4. Data Models (IndexedDB Schema)

```typescript
// Dexie.js Data Schema
interface Bike {
  id?: number;
  name: string;
  category: 'Bike' | 'Scooter' | 'Car' | 'Other';
  registrationNumber: string;
  boughtYearBS: string;
  boughtYearAD: string;
  photoUrl?: string; // Base64 or Blob
  createdDate: string;
}

interface ServiceRecord {
  id?: number;
  bikeId: number;
  serviceDateAD: string;
  serviceDateBS: string;
  odometerKm: number;
  nextServiceKm?: number;
  nextServiceDateAD?: string;
  snoozeDays?: number; // Postpone reminder count
  cost: number;
  workDone: string; // Description/Items replaced
  receiptPhoto?: string;
}

interface RenewalRecord {
  id?: number;
  bikeId: number;
  renewedDateAD: string;
  renewedDateBS: string;
  validUntilAD: string;
  validUntilBS: string;
  taxAmount: number;
  fineAmount: number;
  totalPaid: number;
  officeLocation: string; // e.g., Ekantakuna, Gurhudhumo
  bluebookPages: string[]; // Array of Base64 image strings
}
```

---

## 5. Offline Data Synchronization Strategy

Because the application requires zero hosting overhead and total privacy, two sync modes are supported:

1. **File-Based Sync (Zero Cloud):**
   - **Export:** Serializes all local IndexedDB data into an encrypted or formatted `.json` journal file.
   - **Import:** Reads `.json` files on another device (Android, iOS, PC), merging or replacing local data cleanly.
2. **Direct P2P Sync (QR Code / WebRTC):**
   - Displays a QR code containing modern snapshot payloads or creates a WebRTC peer channel to pass data directly from phone to desktop browser without an intermediary server.

---

## 6. Additional Recommended Features

1. **Fuel & Mileage Log:** Optional log for quick entries when refueling to compute actual KM/L alongside maintenance costs.
2. **Emergency Contacts & Insurance Details:** Quick access cards for roadside assistance, insurance policy numbers, and policy expiration reminders.
3. **PDF / Image Export for Blue Book:** Export stored Blue Book pages into a single printable PDF or zip file for traffic police inspections.