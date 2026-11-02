import { pool } from './db';

export interface Categoria {
  id_categoria: number;
  nombre: string;
  descripcion: string;
}

export async function getCategorias(): Promise<Categoria[]> {
  try {
    const result = await pool.query({

      text: `
        SELECT id_categoria, nombre, descripcion
        FROM categorias
        ORDER BY id_categoria
      `
    });

    return result.rows;
  } catch (error) {
    console.error('Error al obtener las categorías:', error);
    return [];
  }
}