//Se definen los divs, formularios, etc.
const divLibros = document.getElementById('ult-libros');
const divProx = document.getElementById('prox-libro');
const contactForm = document.getElementById('form-contacto');
const divBotones = document.getElementById('nav-botones');
const btnAdelante = document.getElementById('btn-adelante');
let pagActual = 1;

async function cargarProxLanzamiento() {
    try {
        const respuesta = await fetch('/prox');
        const data = await respuesta.json();

        const p = data.proximo; //Abreviamos para leer mejor el código

        const divProxPortada = document.createElement("div");
        divProxPortada.classList.add('prox-portada');
        divProxPortada.innerHTML = `<img src="${p.url_portada}" class="portada" alt="${p.alt_portada}">`
        divProx.appendChild(divProxPortada);

        const divProxInfo = document.createElement("div");
        divProxInfo.classList.add('prox-info');
        divProxInfo.innerHTML = `<p><strong>${p.titulo}</strong></p>
                                <p><mark>${p.autor}</mark></p>
                                <p>${p.descripcion}</p>`
        divProx.appendChild(divProxInfo);
        }
        catch (error){
            console.error("Error al cargar el último lanzamiento", error);
        }
}

async function cargarCatalogo() {
    try {
            const respuesta = await fetch(`/catalogo?page=${pagActual}`);
            const data = await respuesta.json();
            divLibros.innerHTML = '';
            // Aquí iteramos sobre el catálogo
            data.catalogo.forEach(libro => {

            const nuevoDivLibro = document.createElement('div');
            nuevoDivLibro.classList.add('libro');

            nuevoDivLibro.innerHTML += `<img src="${libro.url_portada}" class="portada" alt="${libro.alt_portada}">
            <p><strong>${libro.titulo}</strong></p>
            <p><mark>${libro.autor}</mark></p>
            <p>${libro.descripcion}</p>
            <button class="btn-deseo" data-id="${libro.id}">Añadir a TBR</button>`

            divLibros.appendChild(nuevoDivLibro);
        })
        renderizarPaginacion(data.totalPaginas);
        asignarEventosDeseos();
        } catch (error) {
            console.error("Error al cargar la editorial:", error);
        }
}

cargarProxLanzamiento();
cargarCatalogo();

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

function renderizarPaginacion(pags) {

    console.log("--> Intentando renderizar. Valor recibido:", pags);

    divBotones.innerHTML = '';
    for(let i=1; i<=pags; i++) {
        const nuevoBoton = document.createElement('button');
        nuevoBoton.textContent = i;
        nuevoBoton.dataset.pagina = i;
        if(i == pagActual) {
            nuevoBoton.classList.add('activo');
        }
        divBotones.appendChild(nuevoBoton);
    }
}

divBotones.addEventListener('click', async(e) => {
    const objetivo = e.target.closest('button');
    if(objetivo){
        const nuevaPagina = objetivo.dataset.pagina;
        pagActual = nuevaPagina;
        cargarCatalogo();
    }
})