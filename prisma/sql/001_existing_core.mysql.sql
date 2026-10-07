-- Able Aura existing core schema (MySQL 8 on Amazon RDS)
-- These tables already exist in production. This file is the contract
-- this product must keep. Do not rename columns.
-- IDs are VARCHAR(191) to stay under the utf8mb4 index key limit.
-- If a production table already uses INT/BIGINT ids, do not run the
-- CREATE TABLE statements — only apply the additive students.user_id alter.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS person_entities (
  id VARCHAR(191) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(191) NOT NULL,
  person_entity_id VARCHAR(191) NOT NULL,
  role VARCHAR(64) NOT NULL,
  name VARCHAR(191) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  email VARCHAR(191) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY users_person_entity_id_key (person_entity_id),
  UNIQUE KEY users_phone_key (phone),
  KEY users_role_idx (role),
  CONSTRAINT users_person_entity_id_fkey
    FOREIGN KEY (person_entity_id) REFERENCES person_entities(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS students (
  id VARCHAR(191) NOT NULL,
  fathers_id VARCHAR(191) NULL,
  mothers_id VARCHAR(191) NULL,
  name VARCHAR(191) NOT NULL,
  date_of_birth DATETIME(3) NOT NULL,
  disability_notes TEXT NULL,
  baseline_posture TEXT NULL,
  user_id VARCHAR(191) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY students_user_id_key (user_id),
  KEY students_fathers_id_fkey (fathers_id),
  KEY students_mothers_id_fkey (mothers_id),
  CONSTRAINT students_fathers_id_fkey
    FOREIGN KEY (fathers_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT students_mothers_id_fkey
    FOREIGN KEY (mothers_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT students_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Additive only: link a student row to a login user for Android / TV.
-- Safe to run on an existing RDS students table that predates this column.
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'students'
    AND COLUMN_NAME = 'user_id'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE students ADD COLUMN user_id VARCHAR(191) NULL, ADD UNIQUE KEY students_user_id_key (user_id), ADD CONSTRAINT students_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS courses (
  id VARCHAR(191) NOT NULL,
  name VARCHAR(191) NOT NULL,
  description TEXT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS enrollments (
  id VARCHAR(191) NOT NULL,
  student_id VARCHAR(191) NOT NULL,
  course_id VARCHAR(191) NOT NULL,
  status VARCHAR(32) NOT NULL,
  enrolled_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY enrollments_student_id_course_id_key (student_id, course_id),
  KEY enrollments_course_status_idx (course_id, status),
  CONSTRAINT enrollments_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT,
  CONSTRAINT enrollments_course_id_fkey
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_subscriptions (
  id VARCHAR(191) NOT NULL,
  student_id VARCHAR(191) NOT NULL,
  plan_or_course_ref VARCHAR(191) NOT NULL,
  status VARCHAR(32) NOT NULL,
  start_date DATETIME(3) NOT NULL,
  end_date DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY student_subscriptions_student_status_idx (student_id, status),
  CONSTRAINT student_subscriptions_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(191) NOT NULL,
  student_subscription_id VARCHAR(191) NOT NULL,
  amount INT NOT NULL,
  status VARCHAR(32) NOT NULL,
  paid_at DATETIME(3) NULL,
  provider_ref VARCHAR(191) NULL,
  PRIMARY KEY (id),
  KEY payments_subscription_idx (student_subscription_id),
  CONSTRAINT payments_student_subscription_id_fkey
    FOREIGN KEY (student_subscription_id) REFERENCES student_subscriptions(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pending_payments (
  id VARCHAR(191) NOT NULL,
  student_subscription_id VARCHAR(191) NOT NULL,
  amount INT NOT NULL,
  due_date DATETIME(3) NOT NULL,
  status VARCHAR(32) NOT NULL,
  PRIMARY KEY (id),
  KEY pending_payments_subscription_idx (student_subscription_id),
  CONSTRAINT pending_payments_student_subscription_id_fkey
    FOREIGN KEY (student_subscription_id) REFERENCES student_subscriptions(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
