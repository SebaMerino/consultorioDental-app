# Consultorio Dental

Aplicacion web para la gestion de pacientes, turnos, agenda y ficha odontologica.

## Tecnologia

- HTML, CSS y JavaScript sin framework.
- Supabase para autenticacion y persistencia.
- Netlify para el despliegue.

## Publicacion

El repositorio contiene el sitio estatico completo. Netlify debe publicar la raiz del repositorio, donde se encuentra `index.html`.

En Supabase, las tablas `pacientes`, `turnos` y `config` deben mantener RLS activo con politicas que filtren por `user_id = auth.uid()`.

La clave incluida en `js/supabaseClient.js` es una clave publishable del frontend. Nunca agregar claves `service_role`, contrasenas, tokens privados ni archivos `.env` al repositorio.

## Base de datos

`migracion.sql` contiene cambios de esquema aplicables en Supabase. Ejecutar solo las partes que aun no hayan sido aplicadas.
