
import type { APIRoute } from 'astro';
import { pool } from '../../lib/db';
import { createClient } from '@supabase/supabase-js';

export const GET: APIRoute = async ({ request }) => {
  try {
    const autorizacion = request.headers.get('Authorization');

    if (!autorizacion?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Debes iniciar sesión.' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const token = autorizacion.slice(7);

    const supabaseAuth = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY
    );

    const { data, error } = await supabaseAuth.auth.getUser(token);

    if (error || !data.user?.email) {
      return new Response(
        JSON.stringify({ error: 'La sesión no es válida.' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const resultado = await pool.query(
      `SELECT nombre, telefono, direccion
       FROM public.clientes
       WHERE email = $1
       LIMIT 1`,
      [data.user.email]
    );

    return new Response(
      JSON.stringify({
        cliente: resultado.rows[0] ?? null
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error al cargar el perfil:', error);

    return new Response(
      JSON.stringify({ error: 'No se pudieron cargar los datos.' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
