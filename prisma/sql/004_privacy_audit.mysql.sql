-- Parental consent, OTP challenges, and sensitive-action audit log
-- Target: MySQL 8 on Amazon RDS

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS parental_consents (
  id VARCHAR(191) NOT NULL,
  student_id VARCHAR(191) NOT NULL,
  granted_by VARCHAR(191) NOT NULL,
  camera TINYINT(1) NOT NULL DEFAULT 0,
  recording TINYINT(1) NOT NULL DEFAULT 0,
  ai_processing TINYINT(1) NOT NULL DEFAULT 0,
  granted_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  revoked_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY parental_consents_student_idx (student_id),
  CONSTRAINT parental_consents_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT parental_consents_granted_by_fkey
    FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(191) NOT NULL,
  actor_id VARCHAR(191) NULL,
  action VARCHAR(64) NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_id VARCHAR(191) NOT NULL,
  metadata TEXT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY audit_logs_entity_idx (entity_type, entity_id),
  KEY audit_logs_actor_created_idx (actor_id, created_at),
  CONSTRAINT audit_logs_actor_id_fkey
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS otp_challenges (
  id VARCHAR(191) NOT NULL,
  user_id VARCHAR(191) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  code_hash VARCHAR(191) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  consumed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY otp_challenges_phone_created_idx (phone, created_at),
  CONSTRAINT otp_challenges_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
