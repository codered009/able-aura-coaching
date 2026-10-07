-- Live coaching sessions, attendance, and private-audio audit trail
-- Target: MySQL 8 on Amazon RDS

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS exercises (
  id VARCHAR(191) NOT NULL,
  name VARCHAR(191) NOT NULL,
  slug VARCHAR(191) NOT NULL,
  description TEXT NOT NULL,
  ideal_angles_json TEXT NOT NULL,
  tolerance_bands TEXT NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  cue_hints TEXT NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY exercises_slug_key (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(191) NOT NULL,
  main_trainer_id VARCHAR(191) NOT NULL,
  course_id VARCHAR(191) NOT NULL,
  enrollment_id VARCHAR(191) NULL,
  start_time DATETIME(3) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  current_exercise_id VARCHAR(191) NULL,
  title VARCHAR(191) NOT NULL,
  join_code VARCHAR(16) NOT NULL,
  recording_consent_required TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  ended_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY sessions_join_code_key (join_code),
  KEY sessions_course_status_idx (course_id, status),
  KEY sessions_trainer_start_idx (main_trainer_id, start_time),
  CONSTRAINT sessions_status_check
    CHECK (status IN ('draft', 'scheduled', 'live', 'paused', 'ended', 'cancelled')),
  CONSTRAINT sessions_main_trainer_id_fkey
    FOREIGN KEY (main_trainer_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT sessions_course_id_fkey
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT,
  CONSTRAINT sessions_enrollment_id_fkey
    FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE SET NULL,
  CONSTRAINT sessions_current_exercise_id_fkey
    FOREIGN KEY (current_exercise_id) REFERENCES exercises(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS session_participants (
  id VARCHAR(191) NOT NULL,
  session_id VARCHAR(191) NOT NULL,
  student_id VARCHAR(191) NULL,
  user_id VARCHAR(191) NULL,
  role VARCHAR(32) NOT NULL,
  joined_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  left_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY session_participants_session_role_idx (session_id, role),
  CONSTRAINT session_participants_role_check
    CHECK (role IN ('main_trainer', 'secondary_trainer', 'student', 'observer')),
  CONSTRAINT session_participants_session_id_fkey
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  CONSTRAINT session_participants_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL,
  CONSTRAINT session_participants_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS private_audio_channels (
  id VARCHAR(191) NOT NULL,
  session_id VARCHAR(191) NOT NULL,
  trainer_id VARCHAR(191) NOT NULL,
  student_id VARCHAR(191) NOT NULL,
  opened_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  closed_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY private_audio_channels_session_idx (session_id),
  CONSTRAINT private_audio_channels_session_id_fkey
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  CONSTRAINT private_audio_channels_trainer_id_fkey
    FOREIGN KEY (trainer_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT private_audio_channels_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS session_recordings (
  id VARCHAR(191) NOT NULL,
  session_id VARCHAR(191) NOT NULL,
  storage_url TEXT NOT NULL,
  requested_by VARCHAR(191) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY session_recordings_session_idx (session_id),
  CONSTRAINT session_recordings_session_id_fkey
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  CONSTRAINT session_recordings_requested_by_fkey
    FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
