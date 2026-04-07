
-- Remove all product_variant_options for combo products (combos inherit from their slots)
DELETE FROM product_variant_options
WHERE product_id IN (SELECT product_id FROM combo_products);

-- Remove all product_variant_groups for combo products
DELETE FROM product_variant_groups
WHERE product_id IN (SELECT product_id FROM combo_products);
