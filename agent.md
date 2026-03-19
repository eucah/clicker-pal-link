# AGENTS.md

## Build rules
- Always keep the app on Bluetooth Classic only.
- Never introduce BLE APIs or BLE dependencies.
- Never introduce Wi-Fi or Wi-Fi Direct.
- Prefer minimal, high-confidence changes.
- Keep React UI behavior stable unless required by the Bluetooth migration.
- Ensure TypeScript builds cleanly.
- Ensure Capacitor Android integration remains valid.

## Architecture rules
- Master must use a native Bluetooth Classic server socket.
- Viewer must use a native Bluetooth Classic client socket.
- Messages must be UTF-8 lines terminated by `\n`.
- State payloads are JSON arrays of button states.

## Verification
- Run `npm run build`.
- If build fails, fix all import/export/type issues.
- Keep logs useful for Android device debugging.