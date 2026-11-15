# Estado del proyecto JuegaBGA

Actualizado: 2026-11-15. Fuente de verdad del trabajo en curso; el mapa está en `docs/mapa.md`.

## Objetivo
App web y móvil para armar partidos (fútbol, pádel, pickleball, tenis, baloncesto, voleibol) en Bucaramanga, con chats privados y reserva de canchas propia con publicidad propia. Etapa actual: dejar el producto probado de punta a punta y listo para abrir al público.

## Reglas del responsable
- "Nada de lo que se suba a GitHub puede mencionar" herramientas de asistencia ni a sus fabricantes; todo figura a nombre del responsable. Nunca se sube `.claude/`.
- "Código mínimo: resuelve lo pedido, sin extras, abstracciones ni archivos no solicitados."
- "Antes de cerrar: lint, typecheck y pruebas. Informa fallos tal cual."
- Diseño: "no utilices emojis para los diseños, crea diseños propios animados"; "debe poder adaptarse a todas las resoluciones"; "algo detallado, futurista y que se vea caro".
- "Siempre barato", pero sin perder calidad: comprobar en vez de responder de memoria.
- Las llaves secretas nunca van en el chat ni en la app; solo la publicable en `EXPO_PUBLIC_*`.

## Dónde está cada cosa
- Repositorio: `Rojo1112/juega-bga` (privado), rama principal `main`. Cada subida a `main` publica.
- Publicado en: https://juega-bga.vercel.app
- Base de datos: proyecto de Supabase `oyppeiqsjyjzqdgzszgz`. Hay otro proyecto antiguo compartido con otra aplicación que no se toca.
- Rama `reservas`: ya fusionada en `main`; no tiene nada pendiente.
- Llaves: la publicable va en las variables de Vercel (tipo normal, no secreto) y en `.env.local` (sin versionar). Para ejecutar SQL desde fuera hace falta un token de acceso personal de la cuenta (`sbp_...`), que se pide por el formulario seguro.

## Decisiones tomadas
| Decisión | Por qué | Quién |
| --- | --- | --- |
| Sistema de reservas propio, sin depender de EasyCancha | Poder apartar canchas y vender publicidad | Responsable |
| Cada dueño carga su sede; un administrador la aprueba | Reparte el trabajo y evita sedes falsas | Responsable |
| Publicidad con banners propios, sin redes de anuncios | Sin rastreo ni consentimientos extra, y más fácil de aprobar en tiendas | Responsable |
| Pago "como EasyCancha" (en línea); por ahora la reserva queda confirmada con pago en la cancha | Falta la cuenta de comercio en una pasarela | Responsable / equipo técnico |
| Confirmación de correo apagada en Supabase | Permitir pruebas con cuentas reales; el correo incluido tiene tope por hora | Responsable |
| Las reservas y aprobaciones se hacen por funciones del servidor, no por escritura directa | Que la app no pueda saltarse horarios, topes ni aprobaciones | Equipo técnico |
| Identidad visual "cancha de noche bajo reflectores", con canchas a escala en lugar de iconos | Diseño propio del tema, sin emojis | Equipo técnico |

## Hecho y comprobado
- Esquema completo aplicado en Supabase (`supabase/schema.sql` y luego `supabase/reservas.sql`) — consulta a la base real.
- Permisos por defecto de Supabase retirados y concedidos uno a uno — consulta de permisos reales.
- 44 pruebas contra la base real con dos cuentas de prueba: cuenta, partidos, chats, bloqueo, comunidad, sedes, canchas, horarios, reservas, cancelación, anuncios y borrado de cuenta — todas pasan; datos de prueba eliminados.
- Sitio publicado con el diseño nuevo y el peloteo animado en el ingreso — visto en navegador limpio.
- Rejilla de tarjetas a 360 y 1280 px — vista en capturas con datos de prueba.
- Dirección del sitio en Supabase apuntando a la publicada — respuesta de la configuración.
- Sin emojis en `src/` — control automático.
- Diagramas de `docs/mapa.md` — 14 de 14 pasan el validador; nombres comprobados contra el código.

## Hecho sin comprobar
- Pantallas de reservas, panel del dueño y administración: pasan revisión de tipos y de estilo, pero no se han visto en pantalla ni usado pulsando botones.
- Subida de imágenes (publicaciones, chat, anuncios): no entró en las pruebas contra la base real.
- Barra de cinco pestañas a 360 px: calculada, no vista.
- Animación del ingreso en voleibol y pickleball: mismo código que tenis y pádel, que sí se vieron.

## Siguiente paso
1. Que el responsable cree su cuenta en el sitio y agregarla a `public.app_admins` para que vea "Administración".
2. Recorrer en pantalla, con esa cuenta: registrar sede, aprobarla, crear cancha y horario, reservar, cancelar y subir un anuncio.
3. Corregir lo que salga de ese recorrido.

## Pendiente del responsable
- Borrar en Supabase el token `sbp_` y la llave secreta que quedaron escritos en un chat, y crear nuevos cuando hagan falta.
- Completar `src/constants/legal.ts` (nombre del responsable de los datos y correo de contacto) y hacer revisar los textos por un abogado.
- Abrir cuenta de comercio en una pasarela de pago para cobrar reservas en línea.
- Cargar sedes y canchas reales.
- Antes de abrir al público: volver a encender la confirmación de correo con un servicio de envío propio.

## Pendientes técnicos
- Tope de chats directos nuevos con desconocidos (hoy cualquiera puede escribir a cualquiera).
- El convocante puede poner una solicitud en cualquier estado llamando directo a la base; la pantalla solo ofrece aceptar y rechazar.
- Si falla el borrado de imágenes al eliminar una cuenta, la cuenta se borra igual y quedan archivos sueltos.
- Subir foto de perfil: la columna existe, la función no.
- Sesión cifrada en el dispositivo y cuota de imágenes por usuario.
- Tarjetas de una misma fila con alturas distintas cuando un lugar tiene nombre largo.
- Configuración para compilar la app móvil para tiendas (no hay `eas.json`).
- Avisos de dependencias en herramientas de desarrollo; no llegan a la app. No aplicar el arreglo automático, que baja de versión el entorno.

## Lecciones
- Supabase concede por defecto todos los permisos sobre las tablas → retirar todo y conceder lo necesario; una base local de pruebas no lo reproduce, hay que probar contra la real.
- Tres llaves de Supabase distintas: publicable (app), secreta (servidor) y token de acceso personal `sbp_` (ejecutar SQL). Un valor que no es token responde 401 "JWT could not be decoded".
- Subir pantallas a `main` antes de aplicar su SQL publica una pestaña que solo muestra un error → primero la base, después el código, y mientras tanto rama aparte.
- Variables `EXPO_PUBLIC_*` en Vercel deben ser de tipo normal y requieren volver a desplegar.
- "La página sigue igual" tras publicar suele ser la caché del navegador → comprobar en limpio antes de buscar un fallo.
- El instalador de Expo puede estar bloqueado por la red del entorno → instalar con npm.
- Para valores animados usar `.set()`; la revisión de estilo rechaza asignar a `.value`.

## Cómo comprobar y publicar
- Comprobar: `npx tsc --noEmit`, `npx expo lint`, `npx expo export --platform web`.
- Publicar: si hay cambios de base de datos, aplicarlos primero en Supabase dentro de una transacción y guardarlos en `supabase/`; después subir a `main`.
- Volver atrás: revertir el commit en `main` (Vercel vuelve a publicar); los cambios de base de datos se deshacen con un SQL inverso escrito a mano.
