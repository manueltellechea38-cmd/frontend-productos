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

  if (productos.length === 0) {
    const tr = document.createElement("tr");
    const td = crearCelda("No hay productos para mostrar");
    td.colSpan = 5;
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

    const acciones = document.createElement("td");

    const editar = document.createElement("button");
    editar.type = "button";
    editar.textContent = "Editar";
    editar.addEventListener("click", () => comenzarEdicion(p));

    const eliminar = document.createElement("button");
    eliminar.type = "button";
    eliminar.textContent = "Eliminar";
    eliminar.className = "peligro";
    eliminar.addEventListener("click", () => eliminarProducto(p, eliminar));

    acciones.append(editar, eliminar);
    tr.appendChild(acciones);
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

document.addEventListener("DOMContentLoaded", cargarProductos);
