# Able Aura student app — Android + Android TV

This is the **native client**. Trainers, parents, and admins stay on the web desk.
Children join from a phone **or** from an Android TV / Google TV.

The TV app is a 10-foot D-pad client:

1. Sign in with mobile OTP (demo student `9800000006` / `123456`)
2. Enter the 6-digit class code with the remote (`482913` in the seed)
3. Full-screen **main trainer** video and audio
4. A banner if a trainer opens private audio — never an AI voice

The TV does **not** show other children, AI badges, or suggested cues.
Those stay on the trainer web grid.

The phone app is the camera device: it publishes the student feed so trainers
can watch form, and can run on-device pose later. The living-room TV is
subscribe-only (most TVs have no camera).

## Run on Android TV / Google TV

1. Start the Able Aura web + signalling servers on your computer (`npm run dev`).
2. Open `android-student/` in **Android Studio** (Ladybug / Koala or newer).
3. Let Gradle sync. First sync downloads the Android Gradle Plugin.
4. Create an **Android TV** virtual device: Device Manager → TV → Television (1080p) → API 34.
5. Run the `app` configuration. Android Studio launches `TvActivity` via the Leanback intent on a TV image, or `PhoneActivity` on a phone image.
6. On a **TV emulator**, the default server is already `10.0.2.2:43123` (your host machine).
7. On a **real Google TV / Android TV on Wi-Fi**, open **Server** on the sign-in screen and set:

```
API        http://YOUR_LAN_IP:43123
Signalling ws://YOUR_LAN_IP:43124/signal
```

Your computer’s firewall must allow those ports.

## What each screen is

| Entry | Activity | Role |
| --- | --- | --- |
| Phone launcher | `PhoneActivity` | Student camera + join pad |
| Android TV / Google TV launcher | `TvActivity` | D-pad sign-in, join pad, trainer stage |

Chromecast is still available from the web `/receiver` page if you only need a browser cast. The Leanback app is the native TV client.

## Demo

| Field | Value |
| --- | --- |
| Student phone | `9800000006` (Aanya Iyer) |
| OTP | `123456` |
| Class code | `482913` |

Aanya must have an active enrolment and subscription (seeded). Kabir cannot join until his pending payment is paid.
