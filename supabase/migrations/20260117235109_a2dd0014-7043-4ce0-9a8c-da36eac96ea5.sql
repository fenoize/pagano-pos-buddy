
INSERT INTO delivery_payments (
  order_id, 
  delivery_person_id, 
  base_amount, 
  gross_amount, 
  net_amount, 
  tax_amount, 
  tax_percentage,
  status,
  has_invoice,
  company_pays_tax
) VALUES 
  ('7aef20f6-3a70-42b3-a542-4b30d57e1f4a', '4f236478-6e8d-4686-8300-a3a60bfb3e34', 2000, 2000, 2000, 0, 0, 'pending', false, false),
  ('5ff39a88-02e0-45bf-9fcf-10a489a42280', '4f236478-6e8d-4686-8300-a3a60bfb3e34', 2000, 2000, 2000, 0, 0, 'pending', false, false),
  ('fd322d6d-bab4-42a4-a9a8-9495bb5fa12f', '4f236478-6e8d-4686-8300-a3a60bfb3e34', 2000, 2000, 2000, 0, 0, 'pending', false, false),
  ('be4fbe9f-7867-4563-b67b-0f5950955751', '4f236478-6e8d-4686-8300-a3a60bfb3e34', 2000, 2000, 2000, 0, 0, 'pending', false, false);
