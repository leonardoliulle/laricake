import { type SupabaseClient } from "@supabase/supabase-js";

export type ProductRow = {
  id: number;
  created_at: string;
  product: string | null;
  photo_name: string | null;
  photo_path: string | null;
};

type FetchProductsResult = {
  products: ProductRow[];
  sourceTable: string;
  warningMessage: string | null;
};

function readStringField(record: Record<string, unknown>, fieldNames: string[]) {
  for (const fieldName of fieldNames) {
    const value = record[fieldName];

    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return null;
}

function normalizeProductRows(records: Array<Record<string, unknown>>) {
  const normalizedRows: ProductRow[] = [];

  for (const record of records) {
    const idCandidate = record.id;
    const id = typeof idCandidate === "number" ? idCandidate : Number.parseInt(String(idCandidate), 10);

    if (!Number.isSafeInteger(id) || id <= 0) {
      continue;
    }

    const createdAtCandidate = record.created_at;
    const createdAt =
      typeof createdAtCandidate === "string" && createdAtCandidate.length > 0
        ? createdAtCandidate
        : new Date(0).toISOString();

    normalizedRows.push({
      id,
      created_at: createdAt,
      product: readStringField(record, ["product", "nome", "name", "title"]),
      photo_name: readStringField(record, ["photo_name", "nome_foto", "image_name", "filename"]),
      photo_path: readStringField(record, ["photo_path", "photo_url", "image", "image_url", "foto", "foto_url"]),
    });
  }

  return normalizedRows;
}

export async function fetchProductsForCatalog(supabase: SupabaseClient): Promise<FetchProductsResult> {
  const tableName = "products";
  const { data, error } = await supabase
    .from(tableName)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return {
      products: [],
      sourceTable: tableName,
      warningMessage: error.message,
    };
  }

  return {
    products: normalizeProductRows((data ?? []) as Array<Record<string, unknown>>),
    sourceTable: tableName,
    warningMessage: null,
  };
}