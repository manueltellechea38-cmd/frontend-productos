const CLAVE_SESION = "sesion-productos";

const ROLES = ["usuario", "editor", "admin"];

const PERMISOS = {
  ver: ["usuario", "editor", "admin"],
  editar: ["editor", "admin"],
  eliminar: ["admin"],
  usuarios: ["admin"]
};

function guardarSesion(datos) {
  const sesion = {
    token: datos.token,
    usuario: datos.usuario,
    vence: Date.now() + datos.expira_en * 1000
  };

  localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
}

function leerSesion() {
  try {
    const sesion = JSON.parse(localStorage.getItem(CLAVE_SESION));

    if (
      sesion &&
      sesion.token &&
      sesion.usuario &&
      Date.now() < sesion.vence
    ) {
      return sesion;
    }
  } catch (error) {
    // Si lo guardado no es JSON valido, se trata como sin sesion.
  }

  localStorage.removeItem(CLAVE_SESION);
  return null;
}

function obtenerToken() {
  const sesion = leerSesion();
  return sesion ? sesion.token : null;
}

function obtenerUsuario() {
  const sesion = leerSesion();
  return sesion ? sesion.usuario : null;
}

function cerrarSesionLocal() {
  localStorage.removeItem(CLAVE_SESION);
}

function puede(accion) {
  const usuario = obtenerUsuario();

  return usuario !== null &&
    (PERMISOS[accion] || []).includes(usuario.rol);
}