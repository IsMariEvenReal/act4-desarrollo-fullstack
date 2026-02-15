//Se definen las filas de la tabla HTML que será llenada
const filaPortadas = document.getElementById('fila-portadas');
const filaTitulos = document.getElementById('fila-titulos');
const filaAutores = document.getElementById('fila-autores');
const filaDescripciones = document.getElementById('fila-descripciones');
const filaBotones = document.getElementById('añadir-a-deseos');
const contactForm = document.getElementById('form-contacto');

async function cargarContenido() {
    try {
        const respuesta = await fetch('/catalogo');
        const data = await respuesta.json();

        if (data.proximo) {
            const p = data.proximo; //Abreviamos para leer mejor el código

            //Insertamos la imagen de portada
            const celdaImagen = document.getElementById('prox-portada-celda');
            celdaImagen.innerHTML = `<img src="${p.url_portada}" 
                                        class="portada" 
                                        alt="${p.alt_portada}">`;

            //Se llena el texto de las demás celdas
            document.getElementById('prox-titulo').textContent = p.titulo;
            
            //Para el autor, usamos innerHTML para conservar la etiqueta <mark>
            document.getElementById('prox-autor').innerHTML = `<mark>${p.autor}</mark>`;
            
            document.getElementById('prox-descripcion').textContent = p.descripcion;
        }

        // Aquí iteramos sobre data.catalogo
        data.catalogo.forEach(libro => {
            filaPortadas.innerHTML += `
                <td>
                    <img src="${libro.url_portada}" 
                         class="portada" 
                         alt="${libro.alt_portada}">
                </td>`;

            filaTitulos.innerHTML += `<th>${libro.titulo}</th>`;
            filaAutores.innerHTML += `<td><mark>${libro.autor}</mark></td>`;
            filaDescripciones.innerHTML += `<td>${libro.descripcion}</td>`;

            filaBotones.innerHTML += `
                <td>
                    <button class="btn-deseo" data-id="${libro.id}">
                        Añadir a TBR
                    </button>
                </td>`;
        });
        asignarEventosDeseos();

    } catch (error) {
        console.error("Error al cargar la editorial:", error);
    }
}

cargarContenido();

contactForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Evita que la página se recargue (comportamiento por defecto)

    // Creamos el objeto con los datos exactos que espera el backend
    const datosEnvio = {
        nombre: document.getElementById('Nombre').value,
        email: document.getElementById('Email').value,
        mensaje: document.getElementById('Mensaje').value,
    };

    try {
        const respuesta = await fetch('/contacto', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datosEnvio)
        });

        const resultado = await respuesta.json();

        if (respuesta.ok) {
            alert("¡Mensaje enviado! Te responderemos lo más pronto posible.");
            contactForm.reset(); // Limpia el formulario después de enviar
        } else {
            alert("Error: " + resultado.error);
        }
    } catch (error) {
        console.error("Error en la conexión:", error);
        alert("No se pudo conectar con el servidor. Intenta de nuevo más tarde.");
    }
});

function asignarEventosDeseos() {
    const botones = document.querySelectorAll('.btn-deseo');

    botones.forEach(boton => {
        boton.addEventListener('click', async () => {
            const idLibro = boton.getAttribute('data-id');
            const token = localStorage.getItem('token');
            console.log("Enviando este token: ", token)

            //Si no existe un token (es decir, no hay sesión activa), se redirige inmediatamente a la página de inicio de sesión
            if (!token) {
                alert("Para añadir libros a tu lista, primero debes iniciar sesión.");
                window.location.href = 'login.html'; 
                return; // Detenemos la ejecución aquí
            }

            //Si hay token, el código sigue normalmente
            try {
                const respuesta = await fetch('/deseos', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ id_libro: idLibro })
                });

                const resultado = await respuesta.json();

                if (respuesta.ok) {
                    alert("¡Libro añadido!");
                    boton.textContent = "✅ En tu lista";
                    boton.disabled = true;
                } else {
                    alert("Error: " + resultado.error);
                }
            } catch (error) {
                console.error("Error al añadir a deseos:", error);
            }
        });
    });
}