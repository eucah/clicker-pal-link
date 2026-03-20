# AGENTS.md

## 🎯 OBJECTIF
Migrer l’application vers une implémentation Bluetooth Classic Android native (Kotlin) fiable entre 2 appareils Android.

- MASTER = serveur Bluetooth
- VIEWER = client Bluetooth
- Communication JSON temps réel
- PAS de BLE
- PAS de Wi-Fi

---

## ❌ INTERDICTIONS STRICTES

NE JAMAIS :
- utiliser BLE
- utiliser capgo-capacitor-bluetooth-low-energy
- utiliser @capacitor-community/bluetooth-le
- utiliser Wi-Fi / Wi-Fi Direct
- mélanger plusieurs stacks Bluetooth

---

## 🧠 ARCHITECTURE OBLIGATOIRE

(identique à ta version — rien à changer ici)

---

## 🔌 PLUGIN NATIF ANDROID

(identique)

---

## 📡 PROTOCOLE

(identique)

---

## 🔁 CONNEXION

(identique)

---

## 📱 PERMISSIONS

(identique)

---

## 🧩 API JS

(identique)

---

## 🎯 ÉTATS

(identique)

---

## ⚛️ FRONTEND

(identique)

---

## 🔘 FLUX UI

(identique)

---

## 🧪 VALIDATION

Avant de terminer :

- npm install
- npm run build
- npx cap sync android

Corriger toutes les erreurs **reproductibles dans l’environnement Codex**.

---

## 📊 LOGS

(identique)

---

## 🧼 QUALITÉ

(identique)

---

## 🚨 VALIDATION RÉELLE

Le fonctionnement réel entre 2 appareils Android est requis côté produit final.

Si Codex ne peut pas tester sur appareils physiques, il doit :

- livrer une implémentation complète
- garantir la cohérence du code
- indiquer clairement ce qui reste à tester sur appareils réels

---

## 🧠 PRIORITÉ

1. Fonctionnel > esthétique  
2. Stable > rapide  
3. Simple > complexe  
