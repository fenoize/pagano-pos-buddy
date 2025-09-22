-- Configure the JWT secret using the secret from Supabase
SELECT set_config('app.jwt_secret', current_setting('secrets.APP_JWT_SECRET', true), true);