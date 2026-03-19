# AGENTS.md

## 🎯 OBJECTIF
Migrer l’application vers une implémentation **Bluetooth Classic Android native (Kotlin)** fiable entre 2 appareils Android.

- MASTER = serveur Bluetooth (BluetoothServerSocket)
- VIEWER = client Bluetooth (BluetoothSocket)
- Communication temps réel via messages JSON
- AUCUNE utilisation de BLE
- AUCUNE utilisation de Wi-Fi ou Wi-Fi Direct

---

## ❌ INTERDICTIONS STRICTES

NE JAMAIS :
- utiliser Bluetooth Low Energy (BLE)
- utiliser:
  - capgo-capacitor-bluetooth-low-energy
  - @capacitor-community/bluetooth-le
- utiliser Wi-Fi / Wi-Fi Direct
- utiliser cordova-plugin-bluetooth-serial pour la communication principale
- mélanger plusieurs stacks Bluetooth

---

## 🧠 ARCHITECTURE OBLIGATOIRE

### MASTER
- utilise BluetoothServerSocket
- appelle listenUsingRfcommWithServiceRecord
- accepte une connexion entrante
- envoie les états en continu

### VIEWER
- liste les appareils appairés
- se connecte via adresse MAC
- reçoit les messages en continu

---

## 🔌 PLUGIN NATIF ANDROID

Créer un plugin Capacitor nommé `BluetoothClassicPlugin`

### Kotlin requis

Utiliser :
- BluetoothAdapter
- BluetoothServerSocket
- BluetoothSocket
- InputStream / OutputStream
- Thread serveur
- Thread client
- Thread lecture continue

### UUID

Utiliser un UUID SPP fixe et partagé : 00001101-0000-1000-8000-00805F9B34FB

---

## 📡 PROTOCOLE DE COMMUNICATION

- Messages UTF-8
- Terminés par `\n`
- Format JSON

Exemple : [0,1,2,3,0,1]

---

## 🔁 GESTION DES CONNEXIONS

Toujours :
- fermer toute connexion avant d’en ouvrir une nouvelle
- gérer les erreurs de connexion
- gérer la déconnexion propre
- permettre reconnexion

---

## 📱 PERMISSIONS ANDROID

Doit inclure :

- BLUETOOTH
- BLUETOOTH_CONNECT
- BLUETOOTH_SCAN
- ACCESS_FINE_LOCATION (si nécessaire)

Et gestion runtime obligatoire.

---

## 🧩 API JS À EXPOSER

Le fichier `src/lib/bt-service.ts` doit exposer :

- ensureBluetoothEnabled()
- startAdvertising()         // démarre serveur (MASTER)
- stopAdvertising()
- startScanningForDevices()  // liste appareils appairés
- stopScanning()
- connectToDevice(deviceId)
- disconnect()
- sendMessage(message)
- updateAdvertisedStates(states)

+ listeners :

- onStatusChange(cb)
- onDataReceived(cb)
- onDeviceDiscovered(cb)

---

## 🎯 ÉTATS

Uniquement :

- "disconnected"
- "scanning"
- "advertising"
- "connected"

---

## ⚛️ FRONTEND

Conserver la structure actuelle :

- ProjectHome
- ViewerSessionList
- Index
- ButtonGrid

Adapter uniquement la logique Bluetooth.

---

## 🔘 FLUX UI OBLIGATOIRE

### MASTER
- bouton "Partager projet"
→ démarre serveur
→ status = advertising

- connexion entrante
→ status = connected

- envoie états en temps réel

---

### VIEWER
- bouton "Rechercher projet"
→ scan

- sélection appareil
→ connect

- réception → affichage temps réel

---

## 🧪 VALIDATION OBLIGATOIRE

Avant de terminer :

- npm install
- npm run build
- npx cap sync android

Corriger toutes les erreurs.

---

## 📊 LOGS (OBLIGATOIRE)

Ajouter logs :

- démarrage Bluetooth
- scan
- connexion
- déconnexion
- message envoyé
- message reçu

---

## 🧼 QUALITÉ DU CODE

- TypeScript strict
- pas de code mort
- pas de dépendances inutiles
- code lisible
- commentaires sur parties critiques

---

## 🚨 RÈGLE ABSOLUE

Si le Bluetooth ne fonctionne pas réellement entre 2 téléphones Android :

👉 le travail est considéré comme NON TERMINÉ

---

## 🧠 PRIORITÉ

1. Fonctionnel > esthétique
2. Stable > rapide
3. Simple > complexe
