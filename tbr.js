async function cargarListaDeseos() {
    const contenedor = document.getElementById('contenedor-tbr');
    const token = localStorage.getItem('token');

    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
    const respuesta = await fetch('/deseos', {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    const datos = await respuesta.json();

    // Si el servidor mandó un error, 'datos' será un objeto, no un array.
    if (!Array.isArray(datos)) {
        console.error("El servidor no envió una lista. Envió esto:", datos);
        contenedor.innerHTML = `<p style="color: red;">Error del servidor: ${datos.error || 'Desconocido'}</p>`;
        return;
    }

    // Si llegamos aquí, 'datos' es un array seguro
    if (datos.length === 0) {
        contenedor.innerHTML = "<p>Aún no tienes libros en tu lista de deseos.</p>";
    } else {
        datos.forEach(libro => {

            const nuevoItemDeseo = document.createElement('div');
            nuevoItemDeseo.classList.add('item-deseo');
            nuevoItemDeseo.innerHTML += `
                    <div class="portada-deseo">
                        <img src="${libro.url_portada}" class="portada" alt="${libro.alt_portada}">
                    </div>
                    <div class="info-deseo">
                        <p class="titulo-deseo"><strong>${libro.titulo}</strong></p>
                        <p><mark>${libro.autor}</mark></p>
                        <p>${libro.descripcion}</p>
                        <button class="btn-eliminar" data-id="${libro.id}">Eliminar</button>
                    </div>`

            contenedor.appendChild(nuevoItemDeseo);
        });
    }
} catch (error) {
    console.error("Error al cargar deseos:", error);
}

asignarEventosEliminar();
}

function asignarEventosEliminar() {
    const botones = document.querySelectorAll('.btn-eliminar');
    
    botones.forEach(boton => {
        boton.addEventListener('click', async () => {
            const idLibro = boton.getAttribute('data-id');
            const token = localStorage.getItem('token');

            const respuesta = await fetch('/deseos', {
                method: 'DELETE',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ id_libro: idLibro })
            });

            if (respuesta.ok) {
                //En lugar de recargar la página, eliminamos el div visualmente
                boton.closest('.item-deseo').remove(); 
            }
        });
    });
}

//Se llama a la función para cargar la TBR al cargar la página
cargarListaDeseos();