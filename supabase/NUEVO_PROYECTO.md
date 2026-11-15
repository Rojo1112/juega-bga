# Proyecto Supabase propio para JuegaBGA

Hoy la app comparte proyecto con otra aplicación (tablas `patients`, `medications`). Mezclar las dos expone a los usuarios de una app en la otra y complica el cumplimiento de la Ley 1581 de 2012. Lo recomendado es un proyecto aparte.

1. Supabase > New project. Región: América del Sur (São Paulo) si está disponible; si no, la más cercana. Anota la región en la política de tratamiento de datos (transmisión internacional).
2. SQL Editor: pegar y ejecutar `schema.sql` completo en el proyecto nuevo (una sola vez) y, después, `reservas.sql` (reservas de canchas y publicidad).
3. Authentication > Providers > Email: dejar activa la confirmación de correo en producción. Para pruebas puede desactivarse temporalmente.
4. Settings > API Keys: copiar la URL y la llave publicable (`sb_publishable_...`) a `.env.local` (no se sube a GitHub). Nunca usar `service_role` en la app.
5. Cargar canchas verificadas con `seed_venues.sql`.
6. Probar con dos cuentas: que la cuenta A no pueda leer chats ni imágenes de la cuenta B.

## Proyecto actual
Antes de dejarlo, `schema.sql` anterior creó perfiles para todos los usuarios de la otra app. Si se va a seguir usando ese proyecto, borrar esas filas de `public.profiles` que no pertenezcan a JuegaBGA.
