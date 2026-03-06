

## Problem

Combo products (e.g., "Smash & Fries Loki") render using the POS-style `ComboSelector` component inside the customer app. This shows bordered cards, Select dropdowns, `VariantSelector` badges, and a completely different visual language compared to the UberEats-style radio list used for regular products (e.g., "Cheese Burger").

## Solution

Create a **customer-specific combo renderer** inside `CustomerProductCustomization.tsx` that replaces the `ComboSelector` for combos. Instead of importing the POS component, it will:

1. **Reuse the same data-fetching logic** from `ComboSelector` (fetch combo config, slots, products, variants) but render everything in the UberEats radio-list style.
2. For each combo slot:
   - Show the slot name as a section header (bold, like "Elige tu opción")
   - Show available variants as a radio list with prices (same style as regular products)
   - If the slot allows product changes, show products as a radio list too
3. Extras and modifiers sections will use the same styling already present in the customer component.

## Implementation Steps

1. **New component: `CustomerComboSelector`** — A customer-themed version that:
   - Fetches combo data the same way as `ComboSelector` (reuse the queries)
   - Renders each slot as a section with header "Nombre del slot" + "Obligatorio • Elegir 1"
   - Variant options rendered as UberEats-style radio rows (dividers, right-aligned radio circles)
   - Product selection (when unlocked) as a radio list instead of a Select dropdown
   - Extras rendered inline with +/- quantity controls (matching existing customer extras style)

2. **Update `CustomerProductCustomization.tsx`**:
   - Replace `<ComboSelector>` import with `<CustomerComboSelector>`
   - Pass the same props (`product`, `onComboItemsChange`, `onComboTotalChange`)

3. **Styling**: All elements use the same white text, `border-border/50` dividers, custom radio circles, and dark theme consistent with the existing UberEats-style sections.

## Key Details

- The `ComboSelector` POS component remains untouched (used only in POS).
- The new customer combo selector will be ~200-300 lines, self-contained in `src/components/customer/CustomerComboSelector.tsx`.
- Combo pricing logic (`fixed` vs `dynamic`, `included_variants`) will be preserved identically.

