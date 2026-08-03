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
  must_change_password BOOLEAN DEFAULT FALSE, -- Wajib ganti password saat login pertama
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
  work_update TEXT, -- Update pekerjaan saat check-out
  is_overtime BOOLEAN DEFAULT FALSE, -- True jika disetujui sebagai lembur
  overtime_hours NUMERIC(15, 2) DEFAULT 0, -- Jam lembur (2x jam kerja)
  overtime_request_id UUID, -- diisi via ALTER di bawah (FK ke overtime_requests)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, date)
);

-- 4b. Table: overtime_requests (permohonan lembur)
CREATE TABLE overtime_requests (
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

-- Pasang FK overtime_request_id -> overtime_requests setelah tabel terkait ada
ALTER TABLE attendance
  ADD CONSTRAINT fk_attendance_overtime
  FOREIGN KEY (overtime_request_id) REFERENCES overtime_requests(id) ON DELETE SET NULL;

-- 5. Table: payroll (hasil kalkulasi gaji bulanan)
CREATE TABLE payroll (
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

-- 6. Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE overtime_requests ENABLE ROW LEVEL SECURITY;

-- Karyawan bisa baca profil sendiri
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
USING (auth.uid() = auth_id);

-- Admin bisa baca semua profil
CREATE POLICY "Admins can view all profiles"
ON users FOR SELECT
USING ((SELECT role FROM users WHERE auth_id = auth.uid()) = 'Admin');

-- Karyawan hanya bisa melihat data absen sendiri
CREATE POLICY "Employees can view own attendance"
ON attendance FOR SELECT
USING (auth.uid() = (SELECT auth_id FROM users WHERE id = attendance.user_id));

-- Admin bisa melihat semua data absen
CREATE POLICY "Admins can view all attendance"
ON attendance FOR SELECT
USING ((SELECT role FROM users WHERE auth_id = auth.uid()) = 'Admin');

-- Karyawan hanya bisa lihat payroll sendiri
CREATE POLICY "Employees can view own payroll"
ON payroll FOR SELECT
USING (auth.uid() = (SELECT auth_id FROM users WHERE id = payroll.user_id));

-- Admin bisa melihat seluruh payroll
CREATE POLICY "Admins can view all payroll"
ON payroll FOR SELECT
USING ((SELECT role FROM users WHERE auth_id = auth.uid()) = 'Admin');

-- Karyawan hanya bisa lihat permohonan lembur sendiri
CREATE POLICY "Employees can view own overtime"
ON overtime_requests FOR SELECT
USING (auth.uid() = (SELECT auth_id FROM users WHERE id = overtime_requests.user_id));

-- Admin bisa lihat semua permohonan lembur
CREATE POLICY "Admins can view all overtime"
ON overtime_requests FOR SELECT
USING ((SELECT role FROM users WHERE auth_id = auth.uid()) = 'Admin');

-- (Tambahkan policy insert/update sesuai kebutuhan aplikasi)
