"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";

type ProductRow = {
  id: number;
  created_at: string;
  product: string | null;
  photo_name: string | null;
  photo_path: string | null;
};

type StockMovementRow = {
  id: number;
  created_at: string;
  product_Id: number | null;
  qt: number | null;
  in_out: boolean | null;
  user_id: number | null;
  current_status: string | null;
  product: ProductRow | ProductRow[] | null;
};

type AdminStockWorkspaceProps = {
  initialProducts: ProductRow[];
  initialMovements: StockMovementRow[];
  resolvedUserId: number | null;
};

function getMovementProduct(movement: StockMovementRow) {
  if (Array.isArray(movement.product)) {
    return movement.product[0] ?? null;
  }

  return movement.product;
}

function formatMovementDate(dateValue: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(dateValue));
}

export function AdminStockWorkspace({
  initialProducts,
  initialMovements,
  resolvedUserId,
}: AdminStockWorkspaceProps) {
  const supabase = createBrowserSupabaseClient();

  const [products] = useState<ProductRow[]>(initialProducts);
  const [movements, setMovements] = useState<StockMovementRow[]>(initialMovements);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    initialProducts[0]?.id ?? null
  );
  const [quantity, setQuantity] = useState("1");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) ?? null,
    [products, selectedProductId]
  );

  const stockByProductId = useMemo(() => {
    const balanceMap = new Map<number, number>();

    for (const product of products) {
      balanceMap.set(product.id, 0);
    }

    for (const movement of movements) {
      if (movement.product_Id === null) {
        continue;
      }

      const quantityValue = Number.isFinite(movement.qt) ? Number(movement.qt) : 0;

      if (!Number.isInteger(quantityValue) || quantityValue <= 0) {
        continue;
      }

      const currentBalance = balanceMap.get(movement.product_Id) ?? 0;
      const nextBalance = movement.in_out === true
        ? currentBalance + quantityValue
        : currentBalance - quantityValue;

      balanceMap.set(movement.product_Id, nextBalance);
    }

    return balanceMap;
  }, [movements, products]);

  async function refreshMovements() {
    setIsRefreshing(true);

    const { data, error } = await supabase
      .from("in_out")
      .select(
        "id, created_at, product_Id, qt, in_out, user_id, current_status, product:product_Id(id, product, photo_name, photo_path)"
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      setErrorMessage(error.message);
      setIsRefreshing(false);
      return;
    }

    setMovements((data ?? []) as StockMovementRow[]);
    setIsRefreshing(false);
  }

  async function handleAddStock() {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (resolvedUserId === null) {
      setErrorMessage("Nao foi possivel identificar um user_id numerico para registrar entrada.");
      return;
    }

    if (!selectedProduct) {
      setErrorMessage("Selecione um produto para registrar entrada de estoque.");
      return;
    }

    const parsedQuantity = Number.parseInt(quantity, 10);

    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      setErrorMessage("A quantidade deve ser um numero inteiro maior que zero.");
      return;
    }

    setIsSaving(true);

    const { error } = await supabase.from("in_out").insert({
      product_Id: selectedProduct.id,
      qt: parsedQuantity,
      in_out: true,
      user_id: resolvedUserId,
      current_status: null,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsSaving(false);
      return;
    }

    setSuccessMessage("Entrada de estoque registrada com sucesso.");
    setQuantity("1");
    await refreshMovements();
    setIsSaving(false);
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Entrada de Estoque</h2>
          <p className="text-sm text-zinc-600">
            Use in_out = true para registrar produtos disponiveis no estoque.
          </p>
        </div>

        {errorMessage ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        {successMessage ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {successMessage}
          </p>
        ) : null}

        <Card className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-zinc-700">Produto</span>
            <select
              className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-500"
              value={selectedProductId ?? ""}
              onChange={(event) => {
                const nextValue = Number.parseInt(event.target.value, 10);
                setSelectedProductId(Number.isInteger(nextValue) ? nextValue : null);
              }}
            >
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.product?.trim() || `Produto #${product.id}`}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-zinc-700">Quantidade de entrada</span>
            <input
              type="number"
              min={1}
              step={1}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-500"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleAddStock} disabled={isSaving || selectedProduct === null}>
              {isSaving ? "Salvando entrada..." : "Registrar entrada"}
            </Button>

            <Button variant="secondary" onClick={() => void refreshMovements()} disabled={isRefreshing}>
              {isRefreshing ? "Atualizando..." : "Atualizar movimentos"}
            </Button>
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Saldo atual por produto</h2>
          <p className="text-sm text-zinc-600">
            Saldo = soma de entradas (true) menos soma de saidas (false).
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const productName = product.product?.trim() || `Produto #${product.id}`;
            const balance = stockByProductId.get(product.id) ?? 0;
            const balanceColorClass =
              balance > 0 ? "text-emerald-700" : balance < 0 ? "text-red-700" : "text-zinc-700";

            return (
              <Card key={product.id} className="space-y-2">
                <p className="text-sm font-semibold text-zinc-900">{productName}</p>
                <p className="text-xs text-zinc-500">ID: {product.id}</p>
                <p className={`text-base font-semibold ${balanceColorClass}`}>Saldo: {balance}</p>
              </Card>
            );
          })}

          {products.length === 0 ? (
            <Card>
              <p className="text-sm text-zinc-600">Nenhum produto cadastrado.</p>
            </Card>
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Historico de Movimentos</h2>
          <p className="text-sm text-zinc-600">
            Entradas usam in_out = true. Saidas de pedido usam in_out = false.
          </p>
        </div>

        <div className="grid gap-3">
          {movements.map((movement) => {
            const movementProduct = getMovementProduct(movement);
            const movementProductName =
              movementProduct?.product?.trim() || `Produto #${movement.product_Id ?? "-"}`;
            const movementType = movement.in_out === true ? "Entrada" : "Saida";

            return (
              <Card key={movement.id} className="space-y-2">
                <p className="text-sm font-semibold text-zinc-900">{movementProductName}</p>
                <p className="text-sm text-zinc-600">Tipo: {movementType}</p>
                <p className="text-sm text-zinc-600">Quantidade: {movement.qt ?? 0}</p>
                <p className="text-sm text-zinc-600">Usuario: {movement.user_id ?? "-"}</p>
                <p className="text-sm text-zinc-600">Data: {formatMovementDate(movement.created_at)}</p>
              </Card>
            );
          })}

          {movements.length === 0 ? (
            <Card>
              <p className="text-sm text-zinc-600">Nenhum movimento registrado.</p>
            </Card>
          ) : null}
        </div>
      </section>
    </div>
  );
}
