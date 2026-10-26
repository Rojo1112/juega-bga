# JuegaBGA

App para armar partidos en Bucaramanga: fútbol, pádel, pickleball, tenis, baloncesto y voleibol.
Funciona en web, iOS y Android con un solo código (Expo + React Native) y usa Supabase como backend.

## Qué hace

- **Partidos:** alguien publica un partido (deporte, día, hora, cancha, cupos, nivel y costo por persona).
  Otros piden unirse y quien convoca acepta o rechaza. Al llenarse los cupos el partido queda completo
  y los nuevos interesados entran a una lista de espera.
- **Chat privado del partido:** al ser aceptado, la persona entra sola al chat del grupo, con texto e imágenes.
- **Chats directos** entre dos jugadores, desde el perfil de cada uno.
- **Comunidad:** muro con publicaciones (y fotos) por deporte.
- **Perfil:** nombre, barrio, deportes y nivel en cada uno.
- **EasyCancha:** cada partido tiene un botón "Reservar en EasyCancha". Si la cancha tiene su enlace
  propio en la tabla `venues`, abre ese; si no, abre easycancha.com.

## Puesta en marcha

1. Crea un proyecto gratis en [supabase.com](https://supabase.com).
2. En **SQL Editor**, pega todo [`supabase/schema.sql`](supabase/schema.sql) y ejecútalo una vez.
3. Copia `.env.example` como `.env.local` y pega la URL y la llave publicable del proyecto
   (botón **Connect** en Supabase).
4. Instala y arranca:

   ```bash
   npm install
   npx expo start
   ```

   Presiona `w` para abrirla en el navegador, o escanea el QR con la app **Expo Go** en tu celular.

### Cargar canchas

Las canchas se agregan desde Supabase > **Table Editor** > `venues`:
nombre, dirección, barrio, deportes (`sport_ids`, por ejemplo `{futbol}` o `{padel,tenis}`)
y, si existe, el enlace de la cancha en EasyCancha (`easycancha_url`).
Si una cancha no está registrada, quien convoca puede escribir el lugar a mano.

## Estructura

| Carpeta | Contenido |
| --- | --- |
| `src/app/(tabs)` | Pestañas: Partidos, Comunidad, Chats y Perfil |
| `src/app/partido` | Armar partido y detalle con solicitudes |
| `src/app/chat` | Chat en tiempo real con imágenes |
| `src/app/jugador` | Perfil público de un jugador |
| `src/lib` | Conexión a Supabase, sesión, imágenes y tipos |
| `supabase/schema.sql` | Tablas, reglas de seguridad (RLS), almacenamiento de imágenes y tiempo real |

## Comandos útiles

```bash
npx tsc --noEmit   # revisar tipos
npx expo lint      # revisar estilo
```

Para publicar en App Store y Google Play se usa EAS (`npx eas-cli@latest build`), que compila en la nube.
