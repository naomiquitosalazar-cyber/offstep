import { pool } from './db';

export interface Producto {
  id_producto: number;
  nombre: string;
  referencia: string;
  precio: number;
  stock: number;
  id_categoria: number;
}

export async function getProductosPorCategoria(
  id_categoria: number
): Promise<Producto[]> {
  try {
    const result = await pool.query({
      text: `
        SELECT id_producto, nombre, referencia, precio, stock, id_categoria
        FROM productos
        WHERE id_categoria = $1
        ORDER BY id_producto
      `,
      values: [id_categoria]
    });

    return result.rows;
  } catch (error) {
    console.error('Error al obtener los productos:', error);
    return [];
  }
}

export async function getProductoById(id: number): Promise<Producto | null> {
  try {
    const result = await pool.query({
      text: `
        SELECT id_producto, nombre, referencia, precio, stock, id_categoria
        FROM productos
        WHERE id_producto = $1
      `,
      values: [id]
    });

    return result.rows[0] ?? null;
  } catch (error) {
    console.error('Error al obtener el producto:', error);
    return null;
  }
}