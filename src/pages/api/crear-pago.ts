
import type { APIRoute } from 'astro';
import { pool } from '../../lib/db';
import { stripe } from '../../lib/stripe';
import { createClient } from '@supabase/supabase-js';

export const POST: APIRoute = async ({ request }) => {
  try {
    // 1. Comprobar autenticación
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

    // 2. Recibir productos del carrito
    const datos = await request.json();
    const items = datos.items;

    if (!Array.isArray(items) || items.length === 0) {
      return new Response('El carrito está vacío.', { status: 400 });
    }

    const cantidades = new Map<number, number>();

    for (const item of items) {
      const id = Number(item.id);
      const cantidad = Number(item.cantidad);

      if (
        !Number.isInteger(id) ||
        id <= 0 ||
        !Number.isInteger(cantidad) ||
        cantidad <= 0
      ) {
        return new Response('Producto o cantidad no válidos.', {
          status: 400
        });
      }

      cantidades.set(
        id,
        (cantidades.get(id) ?? 0) + cantidad
      );
    }

    const ids = Array.from(cantidades.keys());

    // 3. Consultar precios y stock reales en PostgreSQL
    const resultado = await pool.query(
      `SELECT id_producto, nombre, precio, stock
       FROM public.productos
       WHERE id_producto = ANY($1::int[])`,
      [ids]
    );

    if (resultado.rows.length !== ids.length) {
      return new Response('Hay productos que no existen.', {
        status: 400
      });
    }

    // 4. Validar stock y preparar productos para Stripe
    const lineItems = resultado.rows.map((producto) => {
      const cantidad = cantidades.get(
        Number(producto.id_producto)
      )!;

      if (
        !Number.isFinite(Number(producto.precio)) ||
        Number(producto.precio) <= 0
      ) {
        throw new Error('Precio de producto no válido.');
      }

      if (cantidad > Number(producto.stock)) {
        throw new Error(
          `Stock insuficiente para ${producto.nombre}.`
        );
      }

      return {
        price_data: {
          currency: 'eur',
          product_data: {
            name: producto.nombre
          },
          unit_amount: Math.round(
            Number(producto.precio) * 100
          )
        },
        quantity: cantidad
      };
    });

    // 5. Crear sesión de pago en Stripe
    const origen = new URL(request.url).origin;

    const sesion = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: data.user.email,
      line_items: lineItems,
      success_url: `${origen}/compra-completada?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origen}/carrito`
    });

    return new Response(
      JSON.stringify({ url: sesion.url }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('Error al crear el pago:', error);

    return new Response(
      'No se pudo iniciar el proceso de pago.',
      { status: 500 }
    );
  }
};
