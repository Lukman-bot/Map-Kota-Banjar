/** Bentuk data Open Data yang dipakai UI. Respons mentah API dipetakan ke sini di `open-data.server.ts`. */

export type Cell = string | number | boolean | null;
export type DataRow = Record<string, Cell>;

export interface Column {
  key: string;
  label: string;
  type: "text" | "number";
}

export interface Resource {
  /** CSV, JSON, XLSX, … */
  format: string;
  url: string;
  name: string;
}

export interface Dataset {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  publisher: string;
  /** ISO 8601 */
  updatedAt: string | null;
  license: string | null;
  tags: string[];
  rowCount: number | null;
  columns: Column[];
  resources: Resource[];
}

export interface Paged<T> {
  items: T[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface Category {
  name: string;
  count: number;
}
