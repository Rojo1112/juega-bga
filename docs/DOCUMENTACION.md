# Documentación de JuegaBGA

Repositorio **privado**. No se publica código ni documentación. Acceso solo para colaboradores invitados con permiso de escritura.

## 1. Arquitectura
```
App Expo (web / iOS / Android)
   │  llave publicable + sesión del usuario
   ▼
Supabase: Auth ── Postgres (RLS + triggers) ── Storage ── Realtime
   │
   └─ Reserva: enlace a EasyCancha (sin integración por API)
```
Estructura: `src/app` (rutas y pantallas), `src/components`, `src/constants` (deportes, tema), `src/hooks`, `src/lib` (Supabase, sesión, imágenes, chats, partidos, tipos), `supabase/` (SQL y guías).

Flujo de un partido: se crea → se genera su chat y el convocante queda aceptado → otros piden unirse (`pendiente`) → el convocante acepta o rechaza → los aceptados entran al chat → al llenarse el partido pasa a `completo` → nuevos interesados van a `en_espera` → si se libera un cupo, el primero de la lista pasa a `pendiente`.

## 2. Datos y seguridad
- Todas las tablas tienen RLS. Perfiles, deportes, canchas, partidos, participantes y publicaciones son visibles para usuarios con sesión; chats, miembros y mensajes solo para miembros de la conversación.
- Imágenes de chat: bucket privado con URL firmada de 1 hora; imágenes de publicaciones: bucket público, subida solo a la carpeta propia.
- Controles de integridad: límites de longitud, cupos con bloqueo de fila, el convocante no puede traspasar el partido.
- Eliminación de cuenta: `delete_my_account()` borra el usuario y, en cascada, sus datos. Los archivos de Storage requieren limpieza aparte.
- Moderación: `blocks` (bloquear impide chats directos y mensajes en ambos sentidos) y `reports` (se leen desde el panel de Supabase). Límite de 30 mensajes por minuto por persona.
- Consentimiento: el registro exige 18+ y aceptar términos y política; la BD lo valida y guarda fecha y versión.
- Riesgos abiertos: las imágenes de chat de una cuenta eliminada quedan huérfanas en Storage; los reportes no tienen panel propio; la sesión se guarda en almacenamiento local (aceptable según Supabase para Expo).

## 3. Desarrollo
```bash
npm ci
cp .env.example .env.local    # completar URL y llave publicable
npx expo start                # w = web, QR = Expo Go
npx tsc --noEmit
npx expo lint
```
Nota: `tsc` puede quejarse de `expo-env.d.ts` hasta que `expo start` lo genere; no es un error del código. `npm audit` reporta avisos en dependencias indirectas de las herramientas de Expo (`node-forge`, `zod`).

## 4. Despliegue
1. **Backend:** proyecto Supabase propio (región cercana, p. ej. São Paulo), ejecutar `supabase/schema.sql` una vez, confirmación de correo activa. Guía en `supabase/NUEVO_PROYECTO.md`.
2. **Web:** `npx expo export --platform web`, publicar `dist/` en un hosting estático con acceso restringido si se desea mantenerla privada.
3. **Móvil:** `npx eas-cli@latest build` para iOS y Android; `eas submit` a App Store Connect y Google Play. Variables públicas en EAS como variables de entorno del proyecto, nunca `service_role`.
4. **Datos iniciales:** canchas verificadas con `supabase/seed_venues.sql`.

## 5. Cumplimiento
Ver `docs/PROMPT_MAESTRO.md` (marco legal y de tiendas). Pendientes: política de datos, términos, autorización en registro, 18+, PQR, RNBD si aplica.

## 6. Bitácora
1. Estado del arte comparativo (Playtomic, Pickleheads, Juol, Wannaplay, Spond, WhatsApp, EasyCancha): JuegaBGA ocupa el nicho multideporte + chat privado + reserva.
2. Esquema inicial, app completa, repositorio privado, proyecto Supabase configurado, colaborador con permiso de escritura.
3. Revisión y reforzamiento del esquema, plantilla de canchas y guía de proyecto nuevo.
4. Documentación (este archivo y el prompt maestro).
5. Cierre funcional: consentimiento y 18+, bloquear y reportar, límite de mensajes, eliminar cuenta, textos legales en borrador y versión web verificada. Esquema probado en Postgres local.
