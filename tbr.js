async function cargarListaDeseos() {
    const contenedor = document.getElementById('contenedor-tbr');
    const token = localStorage.getItem('token');

    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
    const respuesta = await fetch('http://localhost:3000/deseos', {
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
            contenedor.innerHTML += `
                <table class="item-deseo">
                    <tr>
                        <td rowspan="4"><img src=${libro.url_portada} class="portada"
                        alt=${libro.alt_portada}></td>
                        <th>${libro.titulo}</th>
                    </tr>
                    <tr>
                        <td class="Aut"><mark>${libro.autor}</mark></td>
                    </tr>
                    <tr>
                        <td>${libro.descripcion}</td>
                    </tr>
                    <tr>
                        <td>
                            <button class="btn-eliminar" data-id=${libro.id}>Eliminar</button>
                        </td>
                    </tr>
                </table>`
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

            const respuesta = await fetch('http://localhost:3000/deseos', {
                method: 'DELETE',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ id_libro: idLibro })
            });

            if (respuesta.ok) {
                //En lugar de recargar la página, eliminamos la tabla visualmente
                boton.closest('table').remove(); 
            }
        });
    });
}

//Se llama a la función para cargar la TBR al cargar la página
cargarListaDeseos();