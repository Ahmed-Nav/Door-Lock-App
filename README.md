![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![React Native](https://img.shields.io/badge/react_native-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)
![Kotlin](https://img.shields.io/badge/kotlin-%237F52FF.svg?style=for-the-badge&logo=kotlin&logoColor=white)
![Swift](https://img.shields.io/badge/swift-F54A2A?style=for-the-badge&logo=swift&logoColor=white)

# Smart Door Lock System

A comprehensive IoT solution for managing and interacting with digital door locks. This system consists of a secure React Native mobile application for end-users and administrators, backed by a robust Node.js server managing Access Control Lists (ACLs) and cryptographic keys.

## 📋 Table of Contents

  - [System Architecture](https://www.google.com/search?q=%23system-architecture)
  - [Features](https://www.google.com/search?q=%23features)
  - [Tech Stack](https://www.google.com/search?q=%23tech-stack)
  - [Prerequisites](https://www.google.com/search?q=%23prerequisites)
  - [Installation & Setup](https://www.google.com/search?q=%23installation--setup)
      - [Backend Setup](https://www.google.com/search?q=%23backend-setup)
      - [Mobile App Setup](https://www.google.com/search?q=%23mobile-app-setup)
  - [Environment Variables](https://www.google.com/search?q=%23environment-variables)
  - [Key Concepts](https://www.google.com/search?q=%23key-concepts)

## 🏗 System Architecture

The system operates via a dual-connectivity model:

1.  **Cloud Communication:** The mobile app communicates with the backend via REST API to sync permissions, fetch access keys, and manage user roles.
2.  **Local Interaction:** The mobile app interacts directly with Door Lock hardware using Bluetooth Low Energy (BLE) for unlocking and provisioning.

## ✨ Features

### Mobile Application (`/DoorLockApp`)

  * **Secure Authentication:** Integrated with Clerk for robust user identity management.
  * **BLE Communication:** Scans, connects, and exchanges cryptographic payloads with locks using `react-native-ble-plx`.
  * **QR Code Provisioning:** Claim new locks by scanning QR codes via `react-native-vision-camera`.
  * **Role-Based Interface:** Distinct UI flows for Admins (management) and Users (access only).
  * **Offline Capability:** Caches access keys locally using `async-storage` and secure storage.

### Backend API (`/backend`)

  * **Access Control:** Complex ACL management (`AclVersion`, `Group`, `UserKey`) to handle permission granulatiry.
  * **Cryptography:** Uses `jose` and Elliptic Curve Cryptography (P-256) for generating secure envelopes and signing keys.
  * **Manufacturer Routes:** Dedicated routes for hardware provisioning and seeding (`mfgRoutes`).
  * **Organization Support:** Multi-tenancy support via Workspaces and Groups.

## 🛠 Tech Stack

| Component | Technology |
| :--- | :--- |
| **Mobile Framework** | React Native (0.81), TypeScript |
| **Mobile State/Nav** | React Navigation 7, Context API |
| **Mobile Native Modules** | BlePLX (Bluetooth), Vision Camera, Keychain |
| **Backend Runtime** | Node.js, Express.js |
| **Database** | MongoDB (via Mongoose) |
| **Authentication** | Clerk SDK |
| **Cryptography** | Elliptic (P-256), Jose (JWT/JWE) |

## 🔌 Prerequisites

  * **Node.js** (\>= 18.x)
  * **Yarn** or **npm**
  * **MongoDB** (Local instance or Atlas URI)
  * **Clerk Account** (For authentication API keys)
  * **CocoaPods** (For iOS development on macOS)
  * **Android Studio / Xcode** (For mobile emulation)

## 🚀 Installation & Setup

Clone the repository and follow the steps below for both the backend and frontend.

### Backend Setup

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure environment variables (see [Environment Variables](https://www.google.com/search?q=%23environment-variables)).
4.  Start the development server:
    ```bash
    npm run dev
    ```

### Mobile App Setup

1.  Navigate to the app directory:
    ```bash
    cd DoorLockApp
    ```
2.  Install dependencies:
    ```bash
    npm install
    # Install iOS Pods (macOS only)
    cd ios && bundle install && bundle exec pod install && cd ..
    ```
3.  Start the Metro Bundler:
    ```bash
    npm start
    ```
4.  Run on Simulator/Emulator:
    ```bash
    # Android
    npm run android

    # iOS
    npm run ios
    ```

## 🔐 Environment Variables

Create a `.env` file in both the `backend` and `DoorLockApp` directories.

**Backend (`backend/.env`):**

```env
PORT = YOUR_PORT_HERE
MONGODB_URI = YOUR_MONGODB_URI_HERE
ISSUER = YOUR_CLERK_ISSUER_HERE
CLERK_ADMIN_CLIENT_ID = YOUR_CLERK_ADMIN_CLIENT_ID_HERE
CLERK_USER_CLIENT_ID = YOUR_CLERK_USER_CLIENT_ID_HERE
CLERK_SECRET_KEY = YOUR_CLERK_SECRET_KEY_HERE
JWT_SECRET = YOUR_JWT_SECRET_HERE
FACTORY_TOKEN = YOUR_FACTORY_TOKEN_HERE
ADMIN_KEY_ENC_SECRET = YOUR_ADMIN_KEY_ENC_SECRET_HERE
ADMIN_PRIV_PEM = "-----BEGIN PRIVATE KEY-----\r\nYOUR_ADMIN_PRIV_PEM_HERE\r\n-----END PRIVATE KEY-----"
ADMIN_PUB_B64 = YOUR_ADMIN_PUB_B64_HERE
```

## 🧠 Key Concepts

  * **The Envelope:** Access credentials are packaged into a cryptographic "envelope" by the backend. The mobile app downloads this envelope but cannot modify it. It is passed directly to the lock via BLE, where the lock validates the server's signature.
  * **Claiming:** The process of associating a physical lock with a digital Workspace using a QR code containing the lock's hardware ID and manufacturing secret.

-----

## 🤝 Contributing

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/amazing-feature`).
3.  Commit your changes (`git commit -m 'Add some amazing feature'`).
4.  Push to the branch (`git push origin feature/amazing-feature`).
5.  Open a Pull Request.

## 📄 License

This project is licensed under the [ISC License](https://www.google.com/search?q=backend/package.json).
