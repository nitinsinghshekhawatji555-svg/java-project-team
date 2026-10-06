-- CREATE TABLE IF NOT EXISTS public.fuel_ev_stations
CREATE TABLE IF NOT EXISTS public.fuel_ev_stations (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'fuel', -- 'fuel' or 'ev'
    latitude NUMERIC(10, 6) NOT NULL,
    longitude NUMERIC(10, 6) NOT NULL,
    address TEXT,
    region VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Turn on Row-Level Security so everyone can query them on the map
ALTER TABLE public.fuel_ev_stations ENABLE ROW LEVEL SECURITY;

-- Allow public read access to stations
CREATE POLICY "Allow public read access to stations" 
ON public.fuel_ev_stations FOR SELECT TO authenticated, anon USING (true);

-- Seed initial data defensively (only if table is currently empty)
INSERT INTO public.fuel_ev_stations (name, type, latitude, longitude, address, region)
SELECT * FROM (VALUES
  ('Shell Service Station - East Legon', 'fuel', 5.6375, -0.1612, 'Bawaleshi Rd, East Legon, Accra', 'Greater Accra'),
  ('TotalEnergies - Liberation Road', 'fuel', 5.5992, -0.1798, 'Liberation Rd, Airport Residential Area, Accra', 'Greater Accra'),
  ('Goil Fuel Station - 37 Roundabout', 'fuel', 5.5867, -0.1834, '37 Military Hospital Rd, Accra', 'Greater Accra'),
  ('EV Charging Hub - Airport City', 'ev', 5.6025, -0.1752, 'Airport City Road, Accra (Opposite Stanbic Heights)', 'Greater Accra'),
  ('Puma Energy - Spintex Road', 'fuel', 5.6184, -0.1289, 'Spintex Road, Accra', 'Greater Accra'),
  ('EV Charge Station - Accra Mall Parking', 'ev', 5.6152, -0.1704, 'Tetteh Quarshie Interchange, Accra', 'Greater Accra')
) as tmp (name, type, latitude, longitude, address, region)
WHERE NOT EXISTS (
  SELECT 1 FROM public.fuel_ev_stations LIMIT 1
);
