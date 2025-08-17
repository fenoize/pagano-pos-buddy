-- Create enums
CREATE TYPE public.app_role AS ENUM ('Administrador', 'Caja', 'Cocina', 'Reparto', 'Viewer');
CREATE TYPE public.order_status AS ENUM ('Pendiente', 'En preparación', 'En pausa', 'Listo', 'Entregado', 'Cancelado');
CREATE TYPE public.fulfillment_type AS ENUM ('retiro', 'delivery');
CREATE TYPE public.payment_method AS ENUM ('efectivo', 'mp', 'pos', 'mixto');
CREATE TYPE public.cash_movement_type AS ENUM ('ingreso', 'egreso');

-- Users table (extends auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  pass_hash TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'Viewer',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  prices JSONB NOT NULL, -- {combo: {simple: price, doble: price, triple: price}, only: {...}}
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Customers table
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  phone TEXT,
  rut TEXT UNIQUE,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number SERIAL,
  customer_id UUID REFERENCES public.customers(id),
  fulfillment fulfillment_type NOT NULL DEFAULT 'retiro',
  delivery_address TEXT,
  delivery_number TEXT,
  delivery_comuna TEXT,
  delivery_distance DECIMAL(5,2), -- km
  items JSONB NOT NULL, -- array of order items
  subtotal INTEGER NOT NULL, -- in CLP cents
  delivery_fee INTEGER DEFAULT 0,
  discount INTEGER DEFAULT 0,
  total INTEGER NOT NULL,
  payment_efectivo INTEGER DEFAULT 0,
  payment_mp INTEGER DEFAULT 0,
  payment_pos INTEGER DEFAULT 0,
  payment_method payment_method NOT NULL,
  status order_status DEFAULT 'Pendiente',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Cash movements table
CREATE TABLE public.cash_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID,
  type cash_movement_type NOT NULL,
  amount INTEGER NOT NULL, -- in CLP cents
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Cash sessions table  
CREATE TABLE public.cash_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  opening_cash INTEGER NOT NULL DEFAULT 0,
  closed_at TIMESTAMP WITH TIME ZONE,
  closing_cash INTEGER,
  user_id UUID NOT NULL
);

-- Inventory table
CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient TEXT UNIQUE NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Configuration table
CREATE TABLE public.config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow authenticated users to access all data for now (can be refined later)
CREATE POLICY "Allow authenticated read access" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated all access" ON public.customers FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated all access" ON public.orders FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated all access" ON public.cash_movements FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated all access" ON public.cash_sessions FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated all access" ON public.inventory FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated all access" ON public.config FOR ALL TO authenticated USING (true);

-- Insert seed data
-- Default admin user
INSERT INTO public.users (username, pass_hash, role) 
VALUES ('administrador', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrador'); -- password: 12345678

-- Seed products with pricing structure
INSERT INTO public.products (name, prices) VALUES
('Chesse Burger', '{"combo": {"simple": 7690, "doble": 10590, "triple": 13490}, "only": {"simple": 6690, "doble": 9590, "triple": 12490}}'),
('Oklahoma', '{"combo": {"simple": 7690, "doble": 10590, "triple": 13490}, "only": {"simple": 6690, "doble": 9590, "triple": 12490}}'),
('Big Pagana', '{"combo": {"simple": 8190, "doble": 11090, "triple": 13990}, "only": {"simple": 7190, "doble": 10090, "triple": 12990}}'),
('Old School', '{"combo": {"simple": 8190, "doble": 11090, "triple": 13990}, "only": {"simple": 7190, "doble": 10090, "triple": 12990}}'),
('Paltona', '{"combo": {"simple": 8890, "doble": 11790, "triple": 14690}, "only": {"simple": 7890, "doble": 10790, "triple": 13690}}'),
('Loki', '{"combo": {"simple": 8890, "doble": 11790, "triple": 14690}, "only": {"simple": 7890, "doble": 10790, "triple": 13690}}'),
('Melt', '{"combo": {"simple": 9890, "doble": 12790, "triple": 15690}, "only": {"simple": 8890, "doble": 11790, "triple": 14690}}'),
('Smoke House', '{"combo": {"simple": 9890, "doble": 12790, "triple": 15690}, "only": {"simple": 8890, "doble": 11790, "triple": 14690}}'),
('Americana', '{"combo": {"simple": 10090, "doble": 12990, "triple": 15890}, "only": {"simple": 9090, "doble": 11990, "triple": 14890}}');

-- Seed inventory
INSERT INTO public.inventory (ingredient, stock) VALUES
('patty', 200),
('bun', 150),
('cheese_slice', 300),
('fries_portion', 200),
('tocino_strip', 50),
('salsa_pagana', 30),
('lechuga', 100);

-- Seed configuration
INSERT INTO public.config (key, value) VALUES
('delivery', '{"minFee": 2000, "perKm": 1000}'),
('currency', '"CLP"'),
('tax_included_percent', '19'),
('extras', '[
  {"key": "extra_tocino", "label": "Extra tocino", "price": 1200, "inventory": {"tocino_strip": 1}},
  {"key": "extra_queso", "label": "Extra doble queso", "price": 900, "inventory": {"cheese_slice": 1}},
  {"key": "salsa_pagana", "label": "Extra salsa pagana", "price": 600, "inventory": {"salsa_pagana": 1}},
  {"key": "extra_lechuga", "label": "Extra lechuga", "price": 300, "inventory": {"lechuga": 1}}
]'),
('modifiers_free', '["Sin pepinillos", "Sin cebolla", "Poco queso", "Pan sin tostar", "Punto +", "Punto -"]'),
('recipes', '{
  "burger": {
    "simple": {"patty": 1, "bun": 1, "cheese_slice": 1},
    "doble": {"patty": 2, "bun": 1, "cheese_slice": 2},
    "triple": {"patty": 3, "bun": 1, "cheese_slice": 3}
  },
  "combo": {"fries_portion": 1}
}');

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_config_updated_at BEFORE UPDATE ON public.config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();