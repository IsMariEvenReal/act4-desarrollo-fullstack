const formLogin = document.getElementById('form-login');

formLogin.addEventListener('submit', async (e) => {
    e.preventDefault(); // Evita que la página se recargue (comportamiento por defecto)

    // Creamos el objeto con los datos exactos que espera el backend
    const datosEnvio = {
        email: document.getElementById('Email').value,
        password: document.getElementById('Pass').value,
    };

    try {
        const respuesta = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datosEnvio)
        });

        const resultado = await respuesta.json();

        if (respuesta.ok) {
            console.log(resultado);
            localStorage.setItem('token', resultado.token);
            console.log("Token guardado con éxito:", localStorage.getItem('token'));
            alert("¡Bienvenide de nuevo!");
            window.location.href = "tbr.html";
        } else {
            alert("Error: " + resultado.error);
        }
    } catch (error) {
        console.error("Error en la conexión:", error);
        alert("No se pudo conectar con el servidor. Intenta de nuevo más tarde.");
    }
});