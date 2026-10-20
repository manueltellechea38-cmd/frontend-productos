const tbody = document.querySelector("#tabla-body");
const contador = document.querySelector("#contador");
const estado = document.querySelector("#estado");
const formulario = document.querySelector("#form-producto");
const estadoForm = document.querySelector("#estado-form");
const campoNombre = document.querySelector("#nombre");
const campoPrecio = document.querySelector("#precio");
const botonGuardar = formulario.querySelector('[type="submit"]');
const botonCancelar = document.querySelector("#cancelar");
const tituloForm = formulario.parentElement.querySelector("h2");

const inImagen = document.querySelector("#imagen");
const errImagen = document.querySelector("#err-imagen");
const vistaPrevia = document.querySelector("#vista-previa");

const TIPOS_IMAGEN = ["image/jpeg", "image/png", "image/webp"];
const TAMANO_MAXIMO_IMAGEN = 2 * 1024 * 1024;

let idEdicion = null;
let imagenActual = null;
let urlTemporal = null;

function mostrarMensaje(texto, esError = false) {
  const div = document.createElement("div");
  div.className = esError ? "mensaje error" : "mensaje";
  div.textContent = texto;
  document.querySelector("#mensajes").appendChild(div);
  setTimeout(() => div.remove(), 3500);
}

function crearCelda(texto, clase) {
  const td = document.createElement("td");
  td.textContent = texto;
  if (clase) td.className = clase;
  return td;
}

function urlFoto(imagen) {
  return imagen ? UPLOADS_URL + encodeURIComponent(imagen) : null;
}

function crearCeldaFoto(imagen) {
  const td = document.createElement("td");

  if (imagen) {
    const img = document.createElement("img");
    img.src = urlFoto(imagen);
    img.alt = "";
    img.className = "miniatura";
    img.loading = "lazy";
    td.appendChild(img);
  } else {
    td.textContent = "-";
  }

  return td;
}

function mostrarVistaPrevia(url, temporal = false) {
  if (urlTemporal) {
    URL.revokeObjectURL(urlTemporal);
    urlTemporal = null;
  }

  if (!url) {
    vistaPrevia.removeAttribute("src");
    vistaPrevia.hidden = true;
    return;
  }

  if (temporal) urlTemporal = url;

  vistaPrevia.src = url;
  vistaPrevia.hidden = false;
}

function validarImagen() {
  errImagen.textContent = "";
  inImagen.classList.remove("invalido");

  const archivo = inImagen.files[0];
  if (!archivo) return true;

  if (!TIPOS_IMAGEN.includes(archivo.type)) {
    errImagen.textContent = "Formato no permitido: usa JPG, PNG o WEBP";
    inImagen.classList.add("invalido");
    return false;
  }

  if (archivo.size > TAMANO_MAXIMO_IMAGEN) {
    errImagen.textContent = "La foto no puede superar 2 MB";
    inImagen.classList.add("invalido");
    return false;
  }

  return true;
}

inImagen.addEventListener("change", () => {
  const valida = validarImagen();
  const archivo = inImagen.files[0];

  if (valida && archivo) {
    mostrarVistaPrevia(URL.createObjectURL(archivo), true);
  } else {
    if (!valida) inImagen.value = "";
    mostrarVistaPrevia(urlFoto(imagenActual));
  }
});

function limpiarFormulario() {
  idEdicion = null;
  imagenActual = null;
  formulario.reset();
  tituloForm.textContent = "Crear producto";
  botonGuardar.textContent = "Guardar";
  botonCancelar.hidden = true;
  estadoForm.textContent = "";
  errImagen.textContent = "";
  inImagen.classList.remove("invalido");
  mostrarVistaPrevia(null);
}

function comenzarEdicion(producto) {
  idEdicion = producto.id;
  campoNombre.value = producto.nombre;
  campoPrecio.value = producto.precio;

  imagenActual = producto.imagen || null;
  inImagen.value = "";
  errImagen.textContent = "";
  inImagen.classList.remove("invalido");
  mostrarVistaPrevia(urlFoto(imagenActual));

  tituloForm.textContent = "Editar producto #" + producto.id;
  botonGuardar.textContent = "Actualizar";
  botonCancelar.hidden = false;
  estadoForm.textContent = "";
  campoNombre.focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function eliminarProducto(producto, boton) {
  if (!confirm('Eliminar "' + producto.nombre + '"?')) return;

  boton.disabled = true;

  try {
    const respuesta = await apiEliminar(producto.id);
    mostrarMensaje(respuesta.mensaje);

    if (String(idEdicion) === String(producto.id)) {
      limpiarFormulario();
    }

    await cargarProductos();
  } catch (error) {
    mostrarMensaje(error.message, true);
  } finally {
    boton.disabled = false;
  }
}

function dibujarTabla(productos) {
  tbody.innerHTML = "";
  contador.textContent = productos.length;

  const puedeEditar = puede("editar");
  const puedeEliminar = puede("eliminar");
  const hayAcciones = puedeEditar || puedeEliminar;

  if (productos.length === 0) {
    const tr = document.createElement("tr");
    const td = crearCelda("No hay productos para mostrar");
    td.colSpan = hayAcciones ? 5 : 4;
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  for (const p of productos) {
    const tr = document.createElement("tr");

    tr.appendChild(crearCelda(p.id));
    tr.appendChild(crearCeldaFoto(p.imagen));
    tr.appendChild(crearCelda(p.nombre));
    tr.appendChild(
      crearCelda("$ " + Number(p.precio).toFixed(2), "derecha")
    );

    if (hayAcciones) {
      const acciones = document.createElement("td");

      if (puedeEditar) {
        const editar = document.createElement("button");
        editar.type = "button";
        editar.textContent = "Editar";
        editar.addEventListener("click", () => comenzarEdicion(p));
        acciones.appendChild(editar);
      }

      if (puedeEliminar) {
        const eliminar = document.createElement("button");
        eliminar.type = "button";
        eliminar.textContent = "Eliminar";
        eliminar.className = "peligro";
        eliminar.addEventListener(
          "click",
          () => eliminarProducto(p, eliminar)
        );
        acciones.appendChild(eliminar);
      }

      tr.appendChild(acciones);
    }

    tbody.appendChild(tr);
  }
}

function leerFiltros() {
  const orden = document.querySelector("#f-orden").value;

  return {
    id: document.querySelector("#f-id").value,
    nombre: document.querySelector("#f-nombre").value,
    orden,
    direccion: orden
      ? document.querySelector("#f-direccion").value
      : ""
  };
}

async function cargarProductos() {
  const filtros = leerFiltros();

  document.querySelector("#url-actual").textContent =
    "Peticion: GET " + construirUrl(filtros);

  estado.textContent = "Cargando productos...";

  try {
    const productos = await apiListar(filtros);
    dibujarTabla(productos);
    estado.textContent = "";
  } catch (error) {
    dibujarTabla([]);
    estado.textContent = error.message;
    mostrarMensaje(error.message, true);
  }
}

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const nombre = campoNombre.value.trim();
  const precio = Number(campoPrecio.value);
  const imagenOk = validarImagen();

  if (
    nombre === "" ||
    nombre.length > 100 ||
    campoPrecio.value === "" ||
    !Number.isFinite(precio) ||
    precio < 0 ||
    precio > 99999999.99
  ) {
    estadoForm.textContent = "Revisa el nombre y el precio.";
    return;
  }

  if (!imagenOk) return;

  const archivo = inImagen.files[0];

  botonGuardar.disabled = true;
  botonCancelar.disabled = true;
  estadoForm.textContent = "Guardando...";

  try {
    const producto = { nombre, precio };
    let idProducto;

    if (idEdicion === null) {
      const respuesta = await apiCrear(producto);
      idProducto = respuesta.id;
      mostrarMensaje(respuesta.mensaje);
    } else {
      idProducto = idEdicion;
      const respuesta = await apiEditar(idProducto, producto);
      mostrarMensaje(respuesta.mensaje);
    }

    if (archivo) {
      try {
        await apiSubirImagen(idProducto, archivo);
        mostrarMensaje("Foto guardada");
      } catch (error) {
        mostrarMensaje(
          "El producto se guardo, pero la foto fallo: " + error.message,
          true
        );
      }
    }

    limpiarFormulario();
    await cargarProductos();
  } catch (error) {
    estadoForm.textContent = error.message;
    mostrarMensaje(error.message, true);
  } finally {
    botonGuardar.disabled = false;
    botonCancelar.disabled = false;
  }
});

botonCancelar.addEventListener("click", limpiarFormulario);

const formFiltros = document.querySelector("#form-filtros");
let temporizadorBusqueda;

formFiltros.addEventListener("submit", (evento) => {
  evento.preventDefault();
  clearTimeout(temporizadorBusqueda);
  cargarProductos();
});

document.querySelector("#btn-limpiar").addEventListener("click", () => {
  clearTimeout(temporizadorBusqueda);
  formFiltros.reset();
  cargarProductos();
});

document.querySelector("#f-orden").addEventListener("change", cargarProductos);
document.querySelector("#f-direccion").addEventListener("change", cargarProductos);

document.querySelector("#btn-baratos").addEventListener("click", () => {
  document.querySelector("#f-orden").value = "precio";
  document.querySelector("#f-direccion").value = "asc";
  cargarProductos();
});

function programarBusqueda() {
  clearTimeout(temporizadorBusqueda);
  temporizadorBusqueda = setTimeout(cargarProductos, 350);
}

document.querySelector("#f-nombre").addEventListener("input", programarBusqueda);
document.querySelector("#f-id").addEventListener("input", programarBusqueda);



// ---- Acceso y sesion ----
const vistaAcceso = document.querySelector("#vista-acceso");
const formAcceso = document.querySelector("#form-acceso");
const tituloAcceso = document.querySelector("#titulo-acceso");
const inAEmail = document.querySelector("#a-email");
const inAPassword = document.querySelector("#a-password");
const errAEmail = document.querySelector("#err-a-email");
const errAPassword = document.querySelector("#err-a-password");
const btnAcceso = document.querySelector("#btn-acceso");
const btnCambiarModo = document.querySelector("#btn-cambiar-modo");

const zonaUsuario = document.querySelector("#zona-usuario");
const usuarioEmail = document.querySelector("#usuario-email");
const usuarioRol = document.querySelector("#usuario-rol");
const vistaApp = document.querySelector("#vista-app");
const seccionForm = document.querySelector("#seccion-form");
const thAcciones = document.querySelector("#th-acciones");
const seccionUsuarios = document.querySelector("#seccion-usuarios");

let modoRegistro = false;

function cambiarModoAcceso(registro) {
  modoRegistro = registro;
  tituloAcceso.textContent = registro ? "Crear cuenta" : "Iniciar sesión";
  btnAcceso.textContent = registro ? "Registrarme" : "Entrar";
  btnCambiarModo.textContent = registro
    ? "Ya tengo cuenta"
    : "Crear una cuenta";

  inAPassword.autocomplete = registro
    ? "new-password"
    : "current-password";

  errAEmail.textContent = "";
  errAPassword.textContent = "";
  inAEmail.classList.remove("invalido");
  inAPassword.classList.remove("invalido");
}

btnCambiarModo.addEventListener("click", () => {
  cambiarModoAcceso(!modoRegistro);
});

function validarAcceso() {
  let valido = true;

  errAEmail.textContent = "";
  errAPassword.textContent = "";
  inAEmail.classList.remove("invalido");
  inAPassword.classList.remove("invalido");

  const email = inAEmail.value.trim();

  if (
    email === "" ||
    email.length > 100 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    errAEmail.textContent = "Ingresá un email válido";
    inAEmail.classList.add("invalido");
    valido = false;
  }

  const password = inAPassword.value;

  if (password === "") {
    errAPassword.textContent = "La contraseña es obligatoria";
    inAPassword.classList.add("invalido");
    valido = false;
  } else if (modoRegistro && password.length < 8) {
    errAPassword.textContent = "Mínimo 8 caracteres";
    inAPassword.classList.add("invalido");
    valido = false;
  } else if (modoRegistro && password.length > 72) {
    errAPassword.textContent = "Máximo 72 caracteres";
    inAPassword.classList.add("invalido");
    valido = false;
  }

  return valido;
}

formAcceso.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  if (!validarAcceso()) return;

  const credenciales = {
    email: inAEmail.value.trim(),
    password: inAPassword.value
  };

  btnAcceso.disabled = true;

  try {
    if (modoRegistro) {
      await apiRegistro(credenciales);
      mostrarMensaje("Cuenta creada correctamente");
    }

    const datos = await apiLogin(credenciales);
    guardarSesion(datos);
    formAcceso.reset();
    cambiarModoAcceso(false);
    aplicarSesion();
    mostrarMensaje("Bienvenido, " + datos.usuario.email);
  } catch (error) {
    mostrarMensaje(error.message, true);
  } finally {
    btnAcceso.disabled = false;
  }
});

document.querySelector("#btn-logout").addEventListener("click", async () => {
  try {
    await apiLogout();
  } catch (error) {
    // Aunque falle la peticion, cerramos en este navegador.
  }

  cerrarSesionLocal();
  aplicarSesion();
  mostrarMensaje("Sesión cerrada");
});

function aplicarSesion() {
  const usuario = obtenerUsuario();
  const conSesion = usuario !== null;

  vistaAcceso.hidden = conSesion;
  vistaApp.hidden = !conSesion;
  zonaUsuario.hidden = !conSesion;

  if (!conSesion) {
    clearTimeout(temporizadorBusqueda);
    limpiarFormulario();
    formFiltros.reset();
    tbody.innerHTML = "";
    contador.textContent = "0";
    return;
  }

  usuarioEmail.textContent = usuario.email;
  usuarioRol.textContent = usuario.rol;
  usuarioRol.dataset.rol = usuario.rol;

  seccionForm.hidden = !puede("editar");
  thAcciones.hidden = !(puede("editar") || puede("eliminar"));

  // El panel se conecta en el siguiente paso.
  seccionUsuarios.hidden = !puede("usuarios");
  if (puede("usuarios")) cargarUsuarios();

  cargarProductos();
}

window.addEventListener("sesion-vencida", aplicarSesion);
document.addEventListener("DOMContentLoaded", aplicarSesion);
// ---- Usuarios y roles: solo administrador ----
const usuariosBody = document.querySelector("#usuarios-body");
const contadorUsuarios = document.querySelector("#contador-usuarios");

function dibujarUsuarios(usuarios) {
  usuariosBody.innerHTML = "";
  contadorUsuarios.textContent = usuarios.length;

  const yo = obtenerUsuario();

  for (const u of usuarios) {
    const tr = document.createElement("tr");
    tr.appendChild(crearCelda(u.id));
    tr.appendChild(crearCelda(u.email));

    const select = document.createElement("select");

    for (const rol of ROLES) {
      const opcion = document.createElement("option");
      opcion.value = rol;
      opcion.textContent = rol;
      select.appendChild(opcion);
    }

    select.value = u.rol;
    select.disabled = yo !== null && Number(u.id) === Number(yo.id);

    select.addEventListener("change", () => {
      cambiarRol(u, select.value);
    });

    const td = document.createElement("td");
    td.appendChild(select);
    tr.appendChild(td);
    usuariosBody.appendChild(tr);
  }
}

async function cargarUsuarios() {
  try {
    dibujarUsuarios(await apiListarUsuarios());
  } catch (error) {
    mostrarMensaje(error.message, true);
  }
}

async function cambiarRol(usuario, rolNuevo) {
  try {
    await apiCambiarRol(usuario.id, rolNuevo);
    mostrarMensaje("Rol de " + usuario.email + ": " + rolNuevo);
  } catch (error) {
    mostrarMensaje(error.message, true);
  }

  await cargarUsuarios();
}