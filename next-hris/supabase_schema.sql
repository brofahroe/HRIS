-- Schema Migration untuk HRIS (Supabase / PostgreSQL)

-- 1. Enum Types
CREATE TYPE user_role AS ENUM ('Admin', 'Employee');
CREATE TYPE attendance_status AS ENUM ('Hadir', 'Terlambat', 'Izin', 'Sakit', 'Cuti', 'Alpa');

-- 2. Table: users
CREATE TABLE users (
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
  face_descriptor TEXT, -- Menyimpan data biometrik matriks wajah (JSON array)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Table: shifts
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  late_tolerance_mins INTEGER DEFAULT 15,
  is_active BOOLEAN DEFAULT TRUE
);

ALTER TABLE users ADD CONSTRAINT fk_user_shift FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE SET NULL;

-- 4. Table: attendance
CREATE TABLE attendance (
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

-- 5. Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Karyawan hanya bisa melihat data absen sendiri
CREATE POLICY "Employees can view own attendance"
ON attendance FOR SELECT
USING (auth.uid() = (SELECT auth_id FROM users WHERE id = attendance.user_id));

-- Admin bisa melihat semua data absen
CREATE POLICY "Admins can view all attendance"
ON attendance FOR SELECT
USING ((SELECT role FROM users WHERE auth_id = auth.uid()) = 'Admin');

-- (Tambahkan policy insert/update sesuai kebutuhan aplikasi)
