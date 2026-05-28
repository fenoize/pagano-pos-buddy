UPDATE branches SET opening_hours = (
  SELECT jsonb_object_agg(
    day_key,
    day_val || jsonb_build_object('closes_next_day', false)
  )
  FROM jsonb_each(opening_hours) AS t(day_key, day_val)
)
WHERE opening_hours IS NOT NULL
  AND NOT (opening_hours->'mon' ? 'closes_next_day');