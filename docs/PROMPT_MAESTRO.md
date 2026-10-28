# Prompt maestro de JuegaBGA

Documento privado. Úsalo como instrucción inicial para cualquier persona o agente de código que continúe el proyecto. No contiene credenciales.

## Rol y objetivo
Eres ingeniero de software senior. Continúas **JuegaBGA**, app para armar partidos de fútbol, pádel, pickleball, tenis, baloncesto y voleibol en Bucaramanga (Colombia), con chats privados por grupo y reserva de cancha en EasyCancha. Funciona en web, iOS y Android con un solo código.

## Stack
- Expo SDK 58, React Native 0.88, React 19, TypeScript estricto, Expo Router (rutas en `src/app/`).
- Supabase: Postgres con RLS, Auth, Realtime y Storage.
- Compilación y publicación con EAS.
- Antes de tocar APIs de Expo, leer la doc de la versión en `package.json` y `https://docs.expo.dev/llms.txt`. Instalar paquetes con `npx expo install`.

## Reglas de trabajo
1. Código mínimo: haz solo lo pedido; reutiliza lo existente; imita estilo y densidad de comentarios.
2. Lee solo lo necesario (buscar primero, leer rangos). No releas archivos.
3. Cierra cada tarea con `npx tsc --noEmit` y `npx expo lint`; informa fallos tal cual.
4. Repositorio **privado**. Commits atómicos a nombre del dueño, en español, sin coautores ni líneas de atribución de herramientas. Nunca subir `.env*`, carpetas de configuración de herramientas ni llaves.
5. Seguridad y cumplimiento antes que funcionalidad nueva (secciones siguientes).

## Arquitectura (resumen)
- Cliente único (Expo) que habla directo con Supabase usando la llave **publicable**; la autorización la hace Postgres con RLS, no el cliente.
- Tablas: `sports`, `profiles`, `user_sports`, `venues`, `matches`, `match_members`, `conversations`, `conversation_members`, `messages`, `posts`.
- Triggers: crear perfil al registrarse; al crear partido se crea su chat y el convocante queda aceptado; control de cupos con bloqueo de fila; los aceptados entran al chat; el partido pasa a `completo` al llenarse; lista de espera que avanza al liberarse un cupo.
- Funciones: `start_direct_chat`, `is_conversation_member`, `delete_my_account`.
- Storage: `chat-images` (privado, URL firmada, ruta `<conversation_id>/<archivo>`) y `post-images` (público, ruta `<user_id>/<archivo>`); máximo 5 MB, solo jpeg/png/webp.
- Tiempo real: `messages` y `match_members`.
- Detalle en `docs/DOCUMENTACION.md`.

## Seguridad (obligatorio)
- RLS activo en toda tabla y bucket; políticas mínimas por `auth.uid()`. Probar con dos cuentas que A no lee datos de B.
- Nunca `service_role` en la app. Solo `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Validar en cliente y en BD (checks de longitud). Funciones `SECURITY DEFINER` con `search_path` fijo.
- Producción: confirmación de correo activa, proyecto Supabase propio y exclusivo de JuegaBGA, `npm audit` revisado, sin datos personales en logs.
- Marco: OWASP Top 10, ASVS, MASVS.

## Cumplimiento (Colombia)
Ley 1581 de 2012 y Decreto 1074 de 2015 (datos personales), Ley 1273 de 2009 (delitos informáticos), Ley 527 de 1999, Ley 1480 de 2011, Ley 1098 de 2006 (menores: exigir 18+). Entregables: política de tratamiento de datos, términos y condiciones, casilla de autorización con fecha y versión, eliminación de cuenta, canal PQR, aviso de transmisión internacional (Supabase), revisar obligación de RNBD ante la SIC. Validar con abogado.

## Tiendas móviles
Apple: eliminación de cuenta dentro de la app, reportar y bloquear usuarios por contenido de usuarios, etiquetas y manifiesto de privacidad. Google Play: sección de seguridad de datos, política de privacidad pública, flujo de eliminación de cuenta, API objetivo vigente. Verificar reglas en la documentación oficial antes de publicar.

## Estado actual
Hecho: esquema, pantallas (login, partidos, perfil, comunidad, chats de grupo y directos, reserva EasyCancha), reforzamiento del esquema (límites, buckets, eliminación de cuenta, bloqueo de cupos), guía de proyecto nuevo, plantilla de canchas.
Pendiente, por prioridad:
1. Crear proyecto Supabase propio y ejecutar `supabase/schema.sql`; apuntar `.env.local`.
2. Cargar canchas verificadas (`supabase/seed_venues.sql`).
3. Pruebas funcionales con dos cuentas: partido, solicitud, chat de grupo, chat directo, imágenes, comunidad, perfil.
4. UI de reportar/bloquear usuarios, botón de eliminar cuenta (`delete_my_account`), mayoría de edad y autorización de datos en el registro.
5. Textos legales (política, términos) y revisión con abogado.
6. Builds EAS, fichas de tiendas y publicación.
