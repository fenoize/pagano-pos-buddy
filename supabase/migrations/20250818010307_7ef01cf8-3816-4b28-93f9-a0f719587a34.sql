-- Seed basic configuration data
INSERT INTO public.config (key, value) VALUES 
  ('delivery_config', '{"minFee": 1500, "perKm": 500}'),
  ('extras', '[
    {"key": "queso_extra", "label": "Queso Extra", "price": 500, "inventory": {"queso": 1}},
    {"key": "tocino", "label": "Tocino", "price": 800, "inventory": {"tocino": 1}},
    {"key": "palta", "label": "Palta", "price": 600, "inventory": {"palta": 0.5}},
    {"key": "huevo", "label": "Huevo", "price": 400, "inventory": {"huevo": 1}}
  ]'),
  ('recipes', '{
    "burger": {
      "simple": {"carne": 1, "pan": 1, "lechuga": 0.2, "tomate": 0.3},
      "doble": {"carne": 2, "pan": 1, "lechuga": 0.3, "tomate": 0.4}, 
      "triple": {"carne": 3, "pan": 1, "lechuga": 0.4, "tomate": 0.5}
    },
    "combo": {"papas": 1, "bebida": 1}
  }')
ON CONFLICT (key) DO NOTHING;

-- Seed some basic products
INSERT INTO public.products (name, prices) VALUES 
  ('Hamburguesa Clásica', '{
    "combo": {"simple": 4500, "doble": 6500, "triple": 8500},
    "only": {"simple": 3200, "doble": 4800, "triple": 6400}
  }'),
  ('Hamburguesa Completa', '{
    "combo": {"simple": 5200, "doble": 7200, "triple": 9200}, 
    "only": {"simple": 3900, "doble": 5500, "triple": 7100}
  }'),
  ('Hamburguesa Premium', '{
    "combo": {"simple": 6000, "doble": 8000, "triple": 10000},
    "only": {"simple": 4700, "doble": 6300, "triple": 7900}
  }')
ON CONFLICT DO NOTHING;

-- Seed basic inventory
INSERT INTO public.inventory (ingredient, stock) VALUES 
  ('carne', 50),
  ('pan', 30), 
  ('lechuga', 20),
  ('tomate', 15),
  ('queso', 25),
  ('tocino', 20),
  ('palta', 10),
  ('huevo', 24),
  ('papas', 40),
  ('bebida', 35)
ON CONFLICT (ingredient) DO UPDATE SET stock = EXCLUDED.stock;