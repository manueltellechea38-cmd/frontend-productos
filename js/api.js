async function request(url, opciones = {}) {
  const config = { ...opciones };

  if (opciones.body) {
    config.headers = { "Content-Type": "application/json" };
  }

  let respuesta;

  try {
    respuesta = await fetch(url, config);
  } catch (error) {
    throw new Error("No se pudo conectar con el servidor. Revisa la consola (F12).");
  }

  let datos = null;

  try {
    datos = await respuesta.json();
  } catch (error) {
    throw new Error("El servidor no devolvio JSON valido.");
  }

  if (!respuesta.ok) {
    const e = new Error(
      datos.error || datos.mensaje || "Error HTTP " + respuesta.status
    );
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

