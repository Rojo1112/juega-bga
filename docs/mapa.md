# Mapa del proyecto JuegaBGA

Mapa sacado del código de la rama `main`. Cada diagrama dice de dónde sale debajo de su frase. Si cambia una tabla, un estado, una ruta o un flujo crítico, este archivo se actualiza en el mismo cambio.

## 1. Arquitectura

La app (web y móvil) habla con Supabase para la sesión, los datos, los cambios en vivo y las imágenes; la web se publica desde GitHub en Vercel.

```mermaid
flowchart LR
    I["GitHub: repositorio, rama main"]
    V["Vercel: construye y sirve la web"]
    W["App web"]
    M["App móvil (Expo)"]
    subgraph SUP["Supabase"]
        AU["Auth: registro, ingreso y sesión"]
        DB["Base de datos: tablas, RLS y funciones"]
        RT["Realtime: messages y match_members"]
        B1["Storage bucket chat-images (privado)"]
        B2["Storage bucket post-images (público)"]
        B3["Storage bucket ad-images (público)"]
    end
    I -->|"push a main, Vercel construye"| V
    V -->|"sirve el sitio"| W
    W -->|"ingresa y se registra"| AU
    M -->|"ingresa y se registra"| AU
    AU -->|"trigger crea el perfil"| DB
    W -->|"lee y escribe con sesión"| DB
    M -->|"lee y escribe con sesión"| DB
    DB -->|"publica cambios"| RT
    RT -->|"avisa a chats y partidos"| W
    RT -->|"avisa a chats y partidos"| M
    W -->|"sube y lee fotos de chat"| B1
    W -->|"sube y lee fotos de publicaciones"| B2
    W -->|"muestra anuncios"| B3
    M -->|"sube y lee fotos de chat"| B1
    M -->|"sube y lee fotos de publicaciones"| B2
    M -->|"muestra anuncios"| B3
```

Archivos: `src/lib/supabase.ts`, `src/lib/images.ts`, `vercel.json`, `supabase/schema.sql`, `supabase/reservas.sql`

## 2. Modelo de datos

Son 17 tablas, así que el modelo se parte en dos. Se omite `auth.users`, que gestiona Supabase; `profiles.id` apunta a ella.

### 2a. Partidos y chats

Quién convoca, quién pide unirse, los chats del partido y los directos, y las tablas de comunidad y bloqueos.

```mermaid
erDiagram
    sports {
        text id PK
    }
    profiles {
        uuid id PK
        timestamptz terms_accepted_at "consentimiento Ley 1581"
        text terms_version
    }
    user_sports {
        uuid user_id PK, FK
        text sport_id PK, FK
        skill_level level
    }
    venues {
        uuid id PK
        text name
    }
    matches {
        uuid id PK
        uuid creator_id FK "convocante"
        text sport_id FK
        uuid venue_id FK "opcional"
        timestamptz starts_at
        int players_needed "cupos que faltan"
        match_status status "abierto, completo, cancelado"
    }
    match_members {
        uuid match_id PK, FK
        uuid user_id PK, FK
        member_status status "pendiente, aceptado, rechazado, en_espera"
    }
    conversations {
        uuid id PK
        uuid match_id UK, FK "vacío en chats directos"
    }
    conversation_members {
        uuid conversation_id PK, FK
        uuid user_id PK, FK
    }
    messages {
        uuid id PK
        uuid conversation_id FK
        uuid sender_id FK
        text image_path "ruta en chat-images"
    }
    posts {
        uuid id PK
        uuid author_id FK
        text sport_id FK "vacío si no es de un deporte"
        text image_path "ruta en post-images"
    }
    blocks {
        uuid blocker_id PK, FK
        uuid blocked_id PK, FK
    }
    reports {
        uuid id PK
        uuid reporter_id FK
        uuid reported_id FK
    }
    sports ||--o{ user_sports : "tiene"
    profiles ||--o{ user_sports : "practica"
    sports ||--o{ matches : "deporte"
    profiles ||--o{ matches : "convoca"
    venues |o--o{ matches : "sede opcional"
    matches ||--o{ match_members : "solicitudes"
    profiles ||--o{ match_members : "pide unirse"
    matches ||--o| conversations : "chat del partido"
    conversations ||--o{ conversation_members : "miembros"
    profiles ||--o{ conversation_members : "participa"
    conversations ||--o{ messages : "mensajes"
    profiles ||--o{ messages : "envía"
    sports |o--o{ posts : "muro por deporte"
    profiles ||--o{ posts : "publica"
    profiles ||--o{ blocks : "bloquea"
    profiles ||--o{ blocks : "es bloqueado"
    profiles ||--o{ reports : "reporta"
    profiles ||--o{ reports : "es reportado"
```

Archivos: `supabase/schema.sql`

### 2b. Reservas y publicidad

Sedes con aprobación del administrador, sus canchas y horarios, las reservas, los anuncios y quién es administrador. `ads` no tiene relaciones: se muestra por fechas.

```mermaid
erDiagram
    profiles {
        uuid id PK
    }
    sports {
        text id PK
    }
    venues {
        uuid id PK
        uuid owner_id FK "dueño de la sede"
        boolean approved "la aprueba un administrador"
    }
    courts {
        uuid id PK
        uuid venue_id FK
        text sport_id FK
        int price_per_slot "pesos colombianos"
        int slot_minutes "30, 60, 90 o 120"
        boolean active
    }
    court_hours {
        uuid court_id PK, FK
        smallint weekday PK "0 domingo a 6 sábado"
        time opens
        time closes
    }
    bookings {
        uuid id PK
        uuid court_id FK
        uuid user_id FK
        timestamptz starts_at
        timestamptz ends_at
        booking_status status "confirmada, cancelada"
    }
    ads {
        uuid id PK
        text placement "inicio, canchas, comunidad"
        date starts_on
        date ends_on
    }
    app_admins {
        uuid user_id PK, FK
    }
    profiles |o--o{ venues : "dueño"
    venues ||--o{ courts : "canchas"
    sports ||--o{ courts : "deporte"
    courts ||--o{ court_hours : "horario semanal"
    courts ||--o{ bookings : "reservas"
    profiles ||--o{ bookings : "reserva"
    profiles ||--o| app_admins : "es administrador"
```

Archivos: `supabase/reservas.sql`, `supabase/schema.sql`

## 3. Pantallas y navegación

Todas las rutas de `src/app` pasan por el guardia de sesión de `_layout.tsx`, salvo `login` y `legal/[doc]`. Las pantallas de administración se comprueban dentro de la propia pantalla. Las de dueño de sede tienen la lista filtrada por `owner_id`, y la edición la limita la base de datos (RLS).

### 3a. Acceso y pestañas

Entrada sin sesión, pestañas principales y administración.

```mermaid
flowchart TD
    L["login: sin sesión"]
    LG["legal/[doc]: público"]
    subgraph TABS["Pestañas (sesión)"]
        T1["index: Partidos"]
        T2["canchas: Canchas"]
        T3["comunidad: Comunidad"]
        T4["chats: Chats"]
        T5["perfil: Perfil"]
    end
    AD["admin: sesión y solo administradores"]
    L -->|"ingresa o se registra"| T1
    L -->|"Términos y privacidad"| LG
    T5 -->|"cerrar sesión"| L
    T5 -->|"solo si is_admin es verdadero"| AD
```

Archivos: `src/app/_layout.tsx`, `src/app/(tabs)/_layout.tsx`, `src/app/login.tsx`, `src/app/legal/[doc].tsx`, `src/app/(tabs)/perfil.tsx`, `src/app/admin.tsx`

### 3b. Pantallas de detalle

Lo que se abre desde las pestañas. Todas piden sesión.

```mermaid
flowchart TD
    E1["Pestaña Partidos"]
    E2["Pestaña Canchas"]
    E3["Pestaña Comunidad"]
    E4["Pestaña Chats"]
    E5["Pestaña Perfil"]
    NU["partido/nuevo: Armar partido (modal)"]
    PD["partido/[id]: Partido"]
    CH["chat/[id]: Chat"]
    JU["jugador/[id]: Jugador"]
    CA["cancha/[id]: Reservar cancha"]
    RE["reservas: Mis reservas"]
    SE["sedes/index: Mis sedes"]
    SD["sedes/[id]: Sede (dueño)"]
    E1 -->|"Armar partido"| NU
    E1 -->|"toca tarjeta"| PD
    NU -->|"crea y va al partido"| PD
    PD -->|"abre el chat del partido"| CH
    CH -->|"toca el partido"| PD
    PD -->|"toca un jugador"| JU
    E3 -->|"toca autor"| JU
    JU -->|"escribir, chat directo"| CH
    E4 -->|"toca conversación"| CH
    E2 -->|"toca cancha"| CA
    E2 -->|"Mis reservas"| RE
    CA -->|"reserva confirmada"| RE
    E5 -->|"Administrar mis sedes"| SE
    SE -->|"toca sede"| SD
```

Archivos: `src/app/_layout.tsx`, `src/app/partido/nuevo.tsx`, `src/app/partido/[id].tsx`, `src/app/chat/[id].tsx`, `src/app/jugador/[id].tsx`, `src/app/cancha/[id].tsx`, `src/app/reservas.tsx`, `src/app/sedes/index.tsx`, `src/app/sedes/[id].tsx`

## 4. Flujos críticos

### 4a. Registro con consentimiento

La app valida nombre y casillas antes de enviar; el trigger de la base de datos vuelve a exigir el consentimiento y es quien crea el perfil.

```mermaid
sequenceDiagram
    participant P as Persona
    participant A as App (login.tsx)
    participant U as Supabase Auth
    participant T as handle_new_user
    participant D as Tabla profiles
    P->>A: nombre, correo, clave, mayor de 18 y acepta términos
    A->>A: valida nombre y casillas antes de enviar
    A->>U: signUp con accepted_terms, is_adult y terms_version
    U->>T: inserta en auth.users y dispara on_auth_user_created
    T->>T: exige accepted_terms e is_adult
    alt faltan confirmaciones
        T-->>U: rechaza, debes aceptar términos y ser mayor de 18
        U-->>A: error
        A-->>P: muestra el error
    else datos completos
        T->>D: crea perfil con terms_accepted_at y terms_version
        U-->>A: usuario creado
        alt confirmación de correo activa
            A-->>P: te enviamos un correo para confirmar tu cuenta
        else sin confirmación
            A-->>P: entra a la app
        end
    end
```

Archivos: `src/app/login.tsx`, `supabase/schema.sql` (funciones `handle_new_user` y trigger `on_auth_user_created`)

### 4b. Unirse a un partido y aceptar

Quien pide unirse entra como pendiente si hay cupo, o en espera si el partido está completo. El convocante acepta; la base de datos comprueba el cupo y, al aceptar, agrega a la persona al chat del partido.

```mermaid
sequenceDiagram
    participant J as Jugador
    participant A as App (partido/[id])
    participant D as Base de datos
    participant C as Convocante
    J->>A: pulsa Unirme
    A->>D: inserta en match_members, pendiente o en_espera
    D->>D: RLS pedir unirme exige partido abierto o completo según el estado
    D->>D: sync_match_member recalcula el estado del partido
    D-->>C: Realtime avisa de la solicitud
    C->>A: pulsa Aceptar en una solicitud pendiente
    A->>D: actualiza match_members a aceptado
    D->>D: check_match_capacity bloquea el partido y exige cupo libre
    alt hay cupo
        D->>D: sync_match_member agrega al chat y marca completo si se llena
        D-->>A: solicitud aceptada
        A-->>C: lista actualizada
    else sin cupo
        D-->>A: El partido ya está completo
        A-->>C: muestra el error
    end
```

Si alguien sale del partido y libera un cupo, `sync_match_member` pasa al primero de la lista de espera a pendiente. Archivos: `src/app/partido/[id].tsx`, `supabase/schema.sql` (funciones `check_match_capacity` y `sync_match_member`, triggers `before_match_member_change` y `on_match_member_change`)

### 4c. Reservar una cancha

La app pide los turnos ocupados sin saber quién reservó; la base de datos valida todas las reglas dentro de `book_court`.

```mermaid
sequenceDiagram
    participant J as Jugador
    participant A as App (cancha/[id])
    participant D as Base de datos
    J->>A: elige día y turno
    A->>D: rpc court_busy con cancha y día
    D-->>A: turnos ocupados, sin revelar quién reservó
    A-->>J: muestra los turnos libres según court_hours
    J->>A: pulsa Reservar
    A->>D: rpc book_court con cancha e inicio
    D->>D: valida sesión, cancha activa y sede aprobada
    D->>D: valida que no sea pasado, máximo 30 días y horario de court_hours
    D->>D: valida tope de 5 reservas activas
    alt turno libre
        D-->>A: id de la reserva
        A-->>J: va a Mis reservas
    else turno ya reservado
        D-->>A: Ese horario ya está reservado
        A-->>J: muestra el error y recarga los turnos
    else no cumple una regla
        D-->>A: mensaje de la regla que falla
        A-->>J: muestra el error
    end
```

Archivos: `src/app/cancha/[id].tsx`, `supabase/reservas.sql` (funciones `court_busy` y `book_court`)

### 4d. Eliminar cuenta

La app borra primero las imágenes de la persona en Storage y luego llama a `delete_my_account`, que borra el usuario de Auth y, en cascada, sus datos.

```mermaid
sequenceDiagram
    participant P as Persona
    participant A as App (perfil)
    participant S as Storage
    participant D as Base de datos
    participant U as Supabase Auth
    P->>A: pulsa Eliminar mi cuenta y confirma
    A->>S: borra sus fotos en post-images
    A->>D: consulta image_path de sus mensajes
    A->>S: borra sus fotos en chat-images
    A->>D: rpc delete_my_account
    D->>U: delete from auth.users donde id es auth.uid()
    U->>D: cascada a perfil, partidos, mensajes, publicaciones, reservas, bloqueos y reportes
    D-->>A: sin error
    A->>U: cerrar sesión
    A-->>P: vuelve al ingreso
```

Archivos: `src/app/(tabs)/perfil.tsx`, `src/lib/images.ts` (funciones `removeMyPostImages` y `removeMyChatImages`), `supabase/schema.sql` (función `delete_my_account`)

## 5. Estados

Son columnas de tipo enum, salvo la sede, que solo tiene el booleano `approved`. Los nombres de la sede son etiquetas del diagrama.

### 5a. Partido (`match_status`)

```mermaid
stateDiagram-v2
    [*] --> abierto : el convocante crea el partido
    abierto --> completo : los aceptados llenan los cupos
    completo --> abierto : se libera un cupo
    abierto --> cancelado : el convocante cancela
    completo --> cancelado : el convocante cancela
    cancelado --> [*]
```

Archivos: `supabase/schema.sql` (tipo `match_status`, función `sync_match_member`)

### 5b. Solicitud de jugador (`member_status`)

La pantalla solo ofrece aceptar o rechazar las solicitudes pendientes. La política RLS del convocante permite cambiar cualquier estado, pero la app no lo usa.

```mermaid
stateDiagram-v2
    [*] --> pendiente : pide unirse con cupo libre
    [*] --> en_espera : pide unirse con partido completo
    en_espera --> pendiente : se libera un cupo, primero de la lista
    pendiente --> aceptado : el convocante acepta
    pendiente --> rechazado : el convocante rechaza
    pendiente --> [*] : el jugador sale
    en_espera --> [*] : el jugador sale
    aceptado --> [*] : el jugador sale
    rechazado --> [*] : el jugador sale
```

Archivos: `supabase/schema.sql` (tipo `member_status`, políticas de `match_members`, función `sync_match_member`)

### 5c. Reserva (`booking_status`)

```mermaid
stateDiagram-v2
    [*] --> confirmada : book_court
    confirmada --> cancelada : cancel_booking, el jugador hasta 2 horas antes o el dueño hasta el inicio
    cancelada --> [*]
```

Archivos: `supabase/reservas.sql` (tipo `booking_status`, funciones `book_court` y `cancel_booking`)

### 5d. Sede (`approved`)

```mermaid
stateDiagram-v2
    [*] --> pendiente : el dueño registra la sede, approved es falso
    pendiente --> aprobada : el administrador aprueba
    aprobada --> pendiente : el administrador quita la aprobación
```

Archivos: `supabase/reservas.sql` (columna `approved` en `venues`, función `approve_venue`)

## 6. Despliegue

De la rama `main` al sitio publicado, y lo que se aplica a mano en Supabase. El orden importa: `reservas.sql` quita una política creada en `schema.sql`, así que va después. La app móvil no tiene configuración de build en el repo (no hay `eas.json`).

```mermaid
flowchart TD
    C["Cambio en la rama main de GitHub"]
    V["Vercel construye: npx expo export --platform web"]
    D["Carpeta dist con el sitio"]
    R["Vercel aplica vercel.json: todas las rutas a index.html"]
    S["Sitio web publicado"]
    E["Variables EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]
    subgraph MAN["A mano en Supabase, una vez por proyecto, en este orden"]
        M1["1. SQL Editor: pegar y ejecutar supabase/schema.sql"]
        M2["2. SQL Editor: pegar y ejecutar supabase/reservas.sql"]
        M3["3. Opcional: supabase/seed_venues.sql (hoy no tiene sentencias activas)"]
        M1 --> M2 --> M3
    end
    C -->|"Vercel construye la rama"| V
    V --> D
    D --> R
    R --> S
    E -->|"se usan al construir"| V
```

Archivos: `vercel.json`, `package.json`, `supabase/NUEVO_PROYECTO.md`, `supabase/schema.sql`, `supabase/reservas.sql`, `supabase/seed_venues.sql`
