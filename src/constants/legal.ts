// BORRADOR: completar los datos entre corchetes y revisar con un abogado antes de publicar.
// Si cambia el texto, subir TERMS_VERSION para pedir una nueva aceptación.
export const TERMS_VERSION = '1';
export const CONTROLLER_NAME = '[NOMBRE O RAZÓN SOCIAL DEL RESPONSABLE]';
export const CONTACT_EMAIL = '[CORREO DE CONTACTO PARA DATOS Y PQR]';

export type LegalDocId = 'privacidad' | 'terminos';
export type LegalDoc = { title: string; sections: { heading: string; body: string }[] };

export const LEGAL_DOCS: Record<LegalDocId, LegalDoc> = {
  privacidad: {
    title: 'Política de tratamiento de datos',
    sections: [
      {
        heading: 'Responsable',
        body: `${CONTROLLER_NAME} es responsable del tratamiento de tus datos personales en JuegaBGA. Contacto: ${CONTACT_EMAIL}.`,
      },
      {
        heading: 'Qué datos recogemos',
        body: 'Nombre, correo, barrio, descripción personal, deportes y nivel, partidos que creas o a los que te unes, mensajes, imágenes y publicaciones. No pedimos datos sensibles; te pedimos no incluirlos en tu perfil, mensajes ni publicaciones.',
      },
      {
        heading: 'Para qué los usamos',
        body: 'Crear tu cuenta, mostrarte a otros jugadores, organizar partidos, habilitar los chats del grupo y los directos, publicar en la comunidad, moderar el uso de la app y atender reclamos. No vendemos tus datos.',
      },
      {
        heading: 'Quién los ve',
        body: 'Tu nombre, barrio, descripción y deportes los ven los demás usuarios con sesión. Los chats del partido solo los ven sus miembros. Las imágenes de publicaciones son visibles para quien tenga el enlace.',
      },
      {
        heading: 'Proveedores y transmisión internacional',
        body: 'Usamos Supabase para alojar los datos. Sus servidores pueden estar fuera de Colombia. Al aceptar esta política autorizas esa transmisión, que se hace con medidas de seguridad y con proveedores que cumplen estándares equivalentes de protección.',
      },
      {
        heading: 'Tus derechos',
        body: `Conforme a la Ley 1581 de 2012 y el Decreto 1074 de 2015 puedes conocer, actualizar, rectificar y suprimir tus datos y revocar tu autorización. Puedes eliminar tu cuenta desde Perfil. También puedes escribir a ${CONTACT_EMAIL}: las consultas se responden en máximo 10 días hábiles y los reclamos en máximo 15 días hábiles. Si no estás de acuerdo con la respuesta puedes acudir a la Superintendencia de Industria y Comercio.`,
      },
      {
        heading: 'Menores de edad',
        body: 'JuegaBGA es solo para mayores de 18 años. No tratamos datos de menores a sabiendas; si detectamos una cuenta de un menor, la eliminamos.',
      },
      {
        heading: 'Conservación y seguridad',
        body: 'Conservamos tus datos mientras tengas cuenta. Al eliminarla se borran tu perfil, partidos, mensajes y publicaciones. Aplicamos controles de acceso y cifrado en tránsito, pero ningún sistema es infalible; si ocurre un incidente de seguridad que te afecte, te avisaremos y lo reportaremos a la autoridad.',
      },
    ],
  },
  terminos: {
    title: 'Términos y condiciones',
    sections: [
      {
        heading: 'Qué es JuegaBGA',
        body: 'JuegaBGA ayuda a mayores de 18 años a encontrar con quién jugar en Bucaramanga y su área. No organizamos los partidos, no somos dueños de las canchas y no somos parte de lo que ocurra entre jugadores.',
      },
      {
        heading: 'Tu cuenta',
        body: 'Debes ser mayor de 18 años, dar datos verdaderos y cuidar tu contraseña. Eres responsable de lo que se haga con tu cuenta.',
      },
      {
        heading: 'Cómo comportarte',
        body: 'Respeta a los demás. No está permitido acosar, discriminar, amenazar, publicar contenido ilegal, sexual o violento, hacer spam ni suplantar a otras personas. Puedes bloquear y reportar a cualquier jugador. Podemos suspender o eliminar cuentas y contenido que incumplan estas reglas.',
      },
      {
        heading: 'Costos y reservas',
        body: 'El costo por persona que ves en un partido lo define quien convoca y es solo informativo. JuegaBGA no cobra ni procesa pagos entre jugadores. La reserva de la cancha se hace en EasyCancha o directamente con el club, bajo sus propias condiciones; no garantizamos disponibilidad ni precios.',
      },
      {
        heading: 'Riesgos del deporte',
        body: 'Practicar deporte implica riesgos. Cada persona participa bajo su responsabilidad y decide con quién y dónde juega. Encuéntrate en lugares públicos y concurridos.',
      },
      {
        heading: 'Tu contenido',
        body: 'Eres responsable de lo que publicas y nos autorizas a mostrarlo dentro de la app para que funcione el servicio.',
      },
      {
        heading: 'Cambios y ley aplicable',
        body: `Podemos actualizar estos términos y te pediremos aceptarlos de nuevo. Se rigen por las leyes de Colombia. Dudas o reclamos: ${CONTACT_EMAIL}.`,
      },
    ],
  },
};
