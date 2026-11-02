
import type { APIRoute } from 'astro';
import { pool } from '../../lib/db';
import { createClient } from '@supabase/supabase-js';

export const POST: APIRoute = async ({ request }) => {
  try {
    const autorizacion = request.headers.get('Authorization');

    if (!autorizacion?.startsWith('Bearer ')) {
      return new Response('Debes iniciar sesión.', { status: 401 });
    }

    const token = autorizacion.slice(7);

    const supabaseAuth = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY
    );

    const { data, error } = await supabaseAuth.auth.getUser(token);

    if (error || !data.user?.email) {
      return new Response('La sesión no es válida.', { status: 401 });
    }

    const datos = await request.json();

    const nombre = String(datos.nombre ?? '').trim();
    const telefono = String(datos.telefono ?? '').trim();
    const direccion = String(datos.direccion ?? '').trim();
    const email = data.user.email;

    if (!nombre) {
      return new Response('El nombre es obligatorio.', { status: 400 });
    }

    await pool.query(
      `INSERT INTO public.clientes
        (nombre, email, telefono, direccion)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email)
       DO UPDATE SET
         nombre = EXCLUDED.nombre,
         telefono = EXCLUDED.telefono,
         direccion = EXCLUDED.direccion`,
      [nombre, email, telefono || null, direccion || null]
    );

    return new Response(
      JSON.stringify({ ok: true }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error al guardar el perfil:', error);

    return new Response('No se pudieron guardar los datos.', {
      status: 500
    });
  }
};
