-- Schema HRIS (Supabase / PostgreSQL) — IDEMPOTEN, aman dijalankan berulang kali.
-- Bila tabel/enum/policy sudah ada, script akan melewatinya (tidak error).
-- Kolom tambahan (must_change_password, work_update, dll) ditambahkan
-- via ALTER TABLE ... ADD COLUMN IF NOT EXISTS agar DB yang sudah jalan tetap ter-update.

-- 1. Enum Types (guarded)
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('Admin', 'Employee');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE attendance_status AS ENUM ('Hadir', 'Terlambat', 'Izin', 'Sakit', 'Cuti', 'Alpa');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Table: users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nik VARCHAR(50) UNIQUE NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  role user_role DEFAULT 'Employee',
  position VARCHAR(100),
  division VARCHAR(100),
  shift_id UUID,
  is_active BOOLEAN DEFAULT TRUE,
  daily_salary NUMERIC(15, 2) DEFAULT 0,
  monthly_salary NUMERIC(15, 2) DEFAULT 0,
  allowance NUMERIC(15, 2) DEFAULT 0,
  child_allowance NUMERIC(15, 2) DEFAULT 0,
  photo_url TEXT,
  face_descriptor TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;

-- 3. Table: shifts
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  late_tolerance_mins INTEGER DEFAULT 15,
  is_active BOOLEAN DEFAULT TRUE
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_shift') THEN
    ALTER TABLE users ADD CONSTRAINT fk_user_shift FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Table: attendance
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_out_time TIMESTAMP WITH TIME ZONE,
  check_in_lat DOUBLE PRECISION,
  check_in_lng DOUBLE PRECISION,
  check_in_photo TEXT,
  check_out_lat DOUBLE PRECISION,
  check_out_lng DOUBLE PRECISION,
  check_out_photo TEXT,
  status attendance_status DEFAULT 'Hadir',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, date)
);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS work_update TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS is_overtime BOOLEAN DEFAULT FALSE;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS overtime_hours NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS overtime_request_id UUID;

-- 4b. Table: overtime_requests
CREATE TABLE IF NOT EXISTS overtime_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending | approved | rejected
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, date)
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_attendance_overtime') THEN
    ALTER TABLE attendance ADD CONSTRAINT fk_attendance_overtime FOREIGN KEY (overtime_request_id) REFERENCES overtime_requests(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 5. Table: payroll
CREATE TABLE IF NOT EXISTS payroll (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  employee_name VARCHAR(150),
  nik VARCHAR(50),
  present_days INTEGER DEFAULT 0,
  late_days INTEGER DEFAULT 0,
  base_salary NUMERIC(15, 2) DEFAULT 0,
  total_allowance NUMERIC(15, 2) DEFAULT 0,
  late_deductions NUMERIC(15, 2) DEFAULT 0,
  net_salary NUMERIC(15, 2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'Pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, month, year)
);

-- 6. Row Level Security (idempoten: no-op bila sudah aktif)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE overtime_requests ENABLE ROW LEVEL SECURITY;

-- 7. Policies (guarded — tidak error bila sudah ada)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own profile') THEN
    CREATE POLICY "Users can view own profile"
    ON users FOR SELECT USING (auth.uid() = auth_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all profiles') THEN
    CREATE POLICY "Admins can view all profiles"
    ON users FOR SELECT USING ((SELECT role FROM users WHERE auth_id = auth.uid()) = 'Admin');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Employees can view own attendance') THEN
    CREATE POLICY "Employees can view own attendance"
    ON attendance FOR SELECT USING (auth.uid() = (SELECT auth_id FROM users WHERE id = attendance.user_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all attendance') THEN
    CREATE POLICY "Admins can view all attendance"
    ON attendance FOR SELECT USING ((SELECT role FROM users WHERE auth_id = auth.uid()) = 'Admin');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Employees can view own payroll') THEN
    CREATE POLICY "Employees can view own payroll"
    ON payroll FOR SELECT USING (auth.uid() = (SELECT auth_id FROM users WHERE id = payroll.user_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all payroll') THEN
    CREATE POLICY "Admins can view all payroll"
    ON payroll FOR SELECT USING ((SELECT role FROM users WHERE auth_id = auth.uid()) = 'Admin');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Employees can view own overtime') THEN
    CREATE POLICY "Employees can view own overtime"
    ON overtime_requests FOR SELECT USING (auth.uid() = (SELECT auth_id FROM users WHERE id = overtime_requests.user_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all overtime') THEN
    CREATE POLICY "Admins can view all overtime"
    ON overtime_requests FOR SELECT USING ((SELECT role FROM users WHERE auth_id = auth.uid()) = 'Admin');
  END IF;
END $$;
