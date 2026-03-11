-- Create room type enum
CREATE TYPE public.room_type AS ENUM (
  'aula', 'ufficio', 'bagno', 'ascensore', 'uscita_sicurezza', 'passaggio_disabili'
);

-- Buildings
CREATE TABLE public.buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  address TEXT
);

-- Floors
CREATE TABLE public.floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  floor_number INT NOT NULL,
  name TEXT,
  map_image_url TEXT
);

-- Rooms
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id UUID NOT NULL REFERENCES public.floors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type room_type NOT NULL,
  x_coord FLOAT,
  y_coord FLOAT,
  is_accessible BOOLEAN DEFAULT false,
  description TEXT
);

-- QR Locations
CREATE TABLE public.qr_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  floor_id UUID NOT NULL REFERENCES public.floors(id) ON DELETE CASCADE,
  label TEXT,
  qr_code_data TEXT NOT NULL
);

-- User Favorites
CREATE TABLE public.user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  custom_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User Recent
CREATE TABLE public.user_recent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  navigated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reviews
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  route_from UUID NOT NULL REFERENCES public.rooms(id),
  route_to UUID NOT NULL REFERENCES public.rooms(id),
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Navigation Logs
CREATE TABLE public.navigation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  from_room_id UUID NOT NULL REFERENCES public.rooms(id),
  to_room_id UUID NOT NULL REFERENCES public.rooms(id),
  completed BOOLEAN DEFAULT false,
  duration_seconds INT,
  is_accessible_route BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_recent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navigation_logs ENABLE ROW LEVEL SECURITY;

-- Public read policies for campus data
CREATE POLICY "Anyone can read buildings" ON public.buildings FOR SELECT USING (true);
CREATE POLICY "Anyone can read floors" ON public.floors FOR SELECT USING (true);
CREATE POLICY "Anyone can read rooms" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Anyone can read qr_locations" ON public.qr_locations FOR SELECT USING (true);

-- User favorites: auth users only
CREATE POLICY "Users can view own favorites" ON public.user_favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own favorites" ON public.user_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorites" ON public.user_favorites FOR DELETE USING (auth.uid() = user_id);

-- User recent: auth users only
CREATE POLICY "Users can view own recent" ON public.user_recent FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own recent" ON public.user_recent FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own recent" ON public.user_recent FOR DELETE USING (auth.uid() = user_id);

-- Reviews: anyone can read and insert
CREATE POLICY "Anyone can read reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Anyone can insert reviews" ON public.reviews FOR INSERT WITH CHECK (true);

-- Navigation logs: anyone can insert, users can read own
CREATE POLICY "Anyone can insert navigation logs" ON public.navigation_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own navigation logs" ON public.navigation_logs FOR SELECT USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_floors_building ON public.floors(building_id);
CREATE INDEX idx_rooms_floor ON public.rooms(floor_id);
CREATE INDEX idx_rooms_type ON public.rooms(type);
CREATE INDEX idx_qr_locations_room ON public.qr_locations(room_id);
CREATE INDEX idx_user_favorites_user ON public.user_favorites(user_id);
CREATE INDEX idx_user_recent_user ON public.user_recent(user_id);
CREATE INDEX idx_navigation_logs_user ON public.navigation_logs(user_id);