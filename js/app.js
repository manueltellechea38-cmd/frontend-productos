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

let idEdicion = null;

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

function limpiarFormulario() {
  idEdicion = null;
  formulario.reset();
  tituloForm.textContent = "Crear producto";
  botonGuardar.textContent = "Guardar";
  botonCancelar.hidden = true;
  estadoForm.textContent = "";
}

function comenzarEdicion(producto) {
  idEdicion = producto.id;
  campoNombre.value = producto.nombre;
  campoPrecio.value = producto.precio;
  tituloForm.textContent = "Editar producto #" + producto.id;
  botonGuardar.textContent = "Actualizar";
  botonCancelar.hidden = false;
  estadoForm.textContent = "";
  campoNombre.focus();
}

async function eliminarProducto(producto, boton) {
  if (!confirm('Eliminar "' + producto.nombre + '"?')) return;

  boton.disabled = true;

  try {
    const respuesta = await apiEliminar(producto.id);
    mostrarMensaje(respuesta.mensaje);

    if (idEdicion === producto.id) limpiarFormulario();

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
    td.colSpan = 4;
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  for (const p of productos) {
    const tr = document.createElement("tr");
    tr.appendChild(crearCelda(p.id));
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

async function cargarProductos() {
  estado.textContent = "Cargando productos...";

  try {
    const filtros = leerFiltros();
    document.querySelector("#url-actual").textContent =
      "Peticion: GET " + construirUrl(filtros);
    const productos = await apiListar(filtros);
    dibujarTabla(productos);
    estado.textContent = "";
  } catch (error) {
    estado.textContent = error.message;
    mostrarMensaje(error.message, true);
  }
}

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const nombre = campoNombre.value.trim();
  const precio = Number(campoPrecio.value);

  if (nombre === "") {
    estadoForm.textContent = "Escribi un nombre.";
    return;
  }

  botonGuardar.disabled = true;
  botonCancelar.disabled = true;
  estadoForm.textContent = "Guardando...";

  try {
    const producto = { nombre, precio };

    const respuesta = idEdicion === null
      ? await apiCrear(producto)
      : await apiEditar(idEdicion, producto);

    limpiarFormulario();
    mostrarMensaje(respuesta.mensaje);
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
document.addEventListener("DOMContentLoaded", cargarProductos);


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

const formFiltros = document.querySelector("#form-filtros");

formFiltros.addEventListener("submit", (evento) => {
  evento.preventDefault();
  cargarProductos();
});

document.querySelector("#btn-limpiar").addEventListener("click", () => {
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

let temporizadorBusqueda;

function programarBusqueda() {
  clearTimeout(temporizadorBusqueda);

  temporizadorBusqueda = setTimeout(() => {
    cargarProductos();
  }, 350);
}

document.querySelector("#f-nombre").addEventListener(
  "input",
  programarBusqueda
);

document.querySelector("#f-id").addEventListener(
  "input",
  programarBusqueda
);
