# Able Aura Online Coaching

**GitHub:** https://github.com/codered009/able-aura-coaching

Subscription SaaS for Able Aura — live group coaching for children with autism, cerebral palsy, and locomotor or cognitive disabilities.

The main trainer broadcasts to everyone. Secondary trainers watch student cameras and speak privately for corrections. On-device posture models flag form **only to trainers**. The AI never speaks to the child.

## What this repo contains

- Responsive web desk (admin, main trainer, secondary trainer, parent, student)
- Session lifecycle: `draft → scheduled → live → paused → ended | cancelled`
- WebRTC signalling (trainer broadcast, student cameras to trainers only, private audio)
- Eight Priority-1 on-device movement models
- Progress reports written when a session ends
- Training-video upload for later pose-template work
- Android / Android TV student client under `android-student/`
- Chromecast / TV receiver at `/receiver`

## Database: MySQL on Amazon RDS

Production data lives in **MySQL 8 on RDS**, not Postgres.

Existing tables this product must keep (do not rename columns):

`person_entities`, `users`, `students`, `courses`, `enrollments`, `student_subscriptions`, `payments`, `pending_payments`

New tables (apply in order):

1. `prisma/sql/001_existing_core.mysql.sql` — documents the core contract and adds optional `students.user_id` for Android / TV logins
2. `prisma/sql/002_sessions.mysql.sql` — `exercises`, `sessions`, `session_participants`, `private_audio_channels`, `session_recordings`
3. `prisma/sql/003_ai_posture.mysql.sql` — `pose_templates`, `ai_analysis_events`, `progress_reports`, `training_video_uploads`
4. `prisma/sql/004_privacy_audit.mysql.sql` — `parental_consents`, `audit_logs`, `otp_challenges`

Amounts are **integer paise** (₹8,999.00 → `899900`).

Prisma maps:

- Local preview: `prisma/schema.prisma` (SQLite) so the app runs without RDS credentials
- RDS production: `prisma/schema.mysql.prisma` with  
  `DATABASE_URL="mysql://USER:PASSWORD@your-instance.ap-south-1.rds.amazonaws.com:3306/able_aura"`

If production IDs are `INT`/`BIGINT` rather than string cuids, keep the existing column types and skip the `CREATE TABLE` statements in `001_`. Only run the additive `students.user_id` alter.

## Run locally

```bash
git clone https://github.com/codered009/able-aura-coaching.git
cd able-aura-coaching
cp .env.example .env
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

- Web: http://127.0.0.1:43123  
- Signalling: ws://127.0.0.1:43124/signal  

Demo OTP is `123456`:

| Phone | Role |
| --- | --- |
| 9800000001 | Admin — Kavya Rao |
| 9800000002 | Main trainer — Arjun Mehta |
| 9800000003 | Secondary trainer — Nisha Varghese |
| 9800000004 | Parent — Ananya Iyer |
| 9800000006 | Student — Aanya Iyer |

Saturday morning Foundation Lab join code: `482913`.

Kabir Menon has a due subscription — he cannot join live until that pending payment is marked paid (Billing → Pay with Razorpay demo).

## Session join rules

A student may enter a live room only when all of these are true:

- `enrollments.status = active` for the session `course_id`
- `student_subscriptions.status = active` and today is inside `start_date`–`end_date`
- Parental consent exists for camera (and AI, if landmarks will be sent)

Parents join as observers and see the main trainer only. Student cameras and AI badges stay on the trainer grid.

## AI rules

- Default engine is on-device (MediaPipe / MoveNet). Cloud GPU is on-demand or for weak devices.
- Network payload is landmarks + derived metrics. Raw video is not sent unless a trainer requests a short clip.
- Suggested cues go to main and secondary trainers. They are never spoken or shown to the child.

## Team presentation

Open the interactive briefing (arrow keys, clickable workstreams, remaining days):

- Public: https://codered009.github.io/
- Local: http://127.0.0.1:43123/team-plan.html
- Or click **Team plan** on the landing page

## Android & Android TV (native student client)

The web app is the **trainer / parent / admin desk**. Children are meant to join from the native app in `android-student/`.

- **Phone** (`PhoneActivity`) — camera + mic so trainers can see form, large join pad
- **Android TV / Google TV** (`TvActivity`, Leanback launcher) — D-pad OTP, number pad for the class code, full-screen trainer only. No AI badges, no other children on the TV.

Open `android-student/` in Android Studio, start an **Android TV (1080p)** emulator, and run the app. The emulator reaches this machine at `10.0.2.2:43123`. On a living-room Google TV, set the Server screen to your LAN IP.

Full steps: `android-student/README.md`. Chromecast `/receiver` remains a browser fallback, not the TV client.
