-- Hybrid on-device + cloud posture models
-- Only landmarks and derived metrics travel the network by default.
-- Target: MySQL 8 on Amazon RDS

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS pose_templates (
  id VARCHAR(191) NOT NULL,
  exercise_id VARCHAR(191) NOT NULL,
  version INT NOT NULL,
  created_from_upload TINYINT(1) NOT NULL DEFAULT 0,
  rules_json TEXT NOT NULL,
  model_data MEDIUMTEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY pose_templates_exercise_id_version_key (exercise_id, version),
  CONSTRAINT pose_templates_exercise_id_fkey
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_analysis_events (
  id VARCHAR(191) NOT NULL,
  session_id VARCHAR(191) NOT NULL,
  student_id VARCHAR(191) NOT NULL,
  exercise_id VARCHAR(191) NOT NULL,
  severity VARCHAR(16) NOT NULL,
  issue_type VARCHAR(64) NOT NULL,
  suggested_cue TEXT NOT NULL,
  timestamp DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  metrics_json TEXT NULL,
  reviewed_by VARCHAR(191) NULL,
  reviewed_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY ai_analysis_events_session_ts_idx (session_id, timestamp),
  KEY ai_analysis_events_student_ts_idx (student_id, timestamp),
  CONSTRAINT ai_analysis_events_severity_check
    CHECK (severity IN ('low', 'moderate', 'high')),
  CONSTRAINT ai_analysis_events_session_id_fkey
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  CONSTRAINT ai_analysis_events_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT,
  CONSTRAINT ai_analysis_events_exercise_id_fkey
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT,
  CONSTRAINT ai_analysis_events_reviewed_by_fkey
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS progress_reports (
  id VARCHAR(191) NOT NULL,
  student_id VARCHAR(191) NOT NULL,
  session_id VARCHAR(191) NULL,
  enrollment_id VARCHAR(191) NULL,
  course_id VARCHAR(191) NULL,
  metrics_json TEXT NOT NULL,
  trainer_notes TEXT NULL,
  author_id VARCHAR(191) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY progress_reports_student_created_idx (student_id, created_at),
  CONSTRAINT progress_reports_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT,
  CONSTRAINT progress_reports_session_id_fkey
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL,
  CONSTRAINT progress_reports_enrollment_id_fkey
    FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE SET NULL,
  CONSTRAINT progress_reports_course_id_fkey
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
  CONSTRAINT progress_reports_author_id_fkey
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS training_video_uploads (
  id VARCHAR(191) NOT NULL,
  uploader_id VARCHAR(191) NOT NULL,
  exercise_id VARCHAR(191) NOT NULL,
  video_url TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  notes TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY training_video_uploads_exercise_idx (exercise_id),
  CONSTRAINT training_video_uploads_status_check
    CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
  CONSTRAINT training_video_uploads_uploader_id_fkey
    FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT training_video_uploads_exercise_id_fkey
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
