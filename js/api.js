async function request(url, opciones = {}) {
  const { publico = false, ...resto } = opciones;
  const config = { ...resto };
  config.headers = {};

  if (resto.body && !(resto.body instanceof FormData)) {
    config.headers["Content-Type"] = "application/json";
  }

  const token = obtenerToken();

  if (token && !publico) {
    config.headers["Authorization"] = "Bearer " + token;
  }

  let respuesta;

  try {
    respuesta = await fetch(url, config);
  } catch (error) {
    throw new Error("No se pudo conectar con el servidor (revisá la consola, F12)");
  }

  let datos = null;

  try {
    datos = await respuesta.json();
  } catch (error) {
  }

  if (!respuesta.ok) {
    if (respuesta.status === 401 && !publico) {
      cerrarSesionLocal();
      window.dispatchEvent(new Event("sesion-vencida"));
    }

    const mensaje = (datos && (datos.error || datos.mensaje))
      || "Error HTTP " + respuesta.status;

    const e = new Error(mensaje);
    e.status = respuesta.status;
    throw e;
  }

  return datos;
}

function construirUrl(filtros = {}) {
  const params = new URLSearchParams();

  for (const clave in filtros) {
    const valor = String(filtros[clave]).trim();
    if (valor !== "") params.append(clave, valor);
  }

  const query = params.toString();
  return query ? API_URL + "?" + query : API_URL;
}

async function apiListar(filtros = {}) {
  try {
    const datos = await request(construirUrl(filtros));
    return Array.isArray(datos) ? datos : [datos];
  } catch (error) {
    if (error.status === 404) return [];
    throw error;
  }
}

async function apiCrear(producto) {
  return await request(API_URL, {
    method: "POST",
    body: JSON.stringify(producto)
  });
}

async function apiEditar(id, producto) {
  return await request(API_URL + "?id=" + id, {
    method: "PUT",
    body: JSON.stringify(producto)
  });
}

async function apiEliminar(id) {
  return await request(API_URL + "?id=" + id, {
    method: "DELETE"
  });
}


async function apiSubirImagen(id, archivo) {
  const datos = new FormData();
  datos.append("imagen", archivo);

  return await request(
    IMAGEN_URL + "?id=" + encodeURIComponent(id),
    {
      method: "POST",
      body: datos
    }
  );
}

async function apiRegistro(credenciales) {
  return await request(REGISTRO_URL, {
    method: "POST",
    body: JSON.stringify(credenciales),
    publico: true
  });
}

async function apiLogin(credenciales) {
  return await request(LOGIN_URL, {
    method: "POST",
    body: JSON.stringify(credenciales),
    publico: true
  });
}

async function apiLogout() {
  return await request(LOGOUT_URL, { method: "POST" });
}

async function apiListarUsuarios() {
  return await request(USUARIOS_URL);
}

async function apiCambiarRol(id, rol) {
  return await request(
    USUARIOS_URL + "?id=" + encodeURIComponent(id),
    {
      method: "PUT",
      body: JSON.stringify({ rol: rol })
    }
  );
}