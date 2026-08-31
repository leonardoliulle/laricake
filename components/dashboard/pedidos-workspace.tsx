"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";
import {
  getOrderStatusLabel,
  getStatusOptions,
  normalizeOrderStatus,
} from "@/lib/orders";

type ProductRow = {
  id: number;
  created_at: string;
  product: string | null;
  photo_name: string | null;
  photo_path: string | null;
};

type OrderRow = {
  id: number;
  created_at: string;
  product_Id: number | null;
  qt: number | null;
  in_out: boolean | null;
  user_id: number | null;
  current_status: string | null;
  product: ProductRow | ProductRow[] | null;
};

type PedidosWorkspaceProps = {
  initialProducts: ProductRow[];
  initialOrders: OrderRow[];
  initialStatusOptions: string[];
  resolvedUserId: number | null;
};

type ProductImageProps = {
  src: string | null;
  alt: string;
  className?: string;
};

function ProductImage({ src, alt, className = "" }: ProductImageProps) {
  const [hasImageError, setHasImageError] = useState(false);

  if (!src || hasImageError) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg bg-zinc-100 text-xs text-zinc-500 ${className}`}
      >
        Imagem indisponivel
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`rounded-lg object-cover ${className}`}
      onError={() => setHasImageError(true)}
    />
  );
}

function getOrderProduct(order: OrderRow) {
  if (Array.isArray(order.product)) {
    return order.product[0] ?? null;
  }

  return order.product;
}

function formatPedidoDate(dateValue: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(dateValue));
}

export function PedidosWorkspace({
  initialProducts,
  initialOrders,
  initialStatusOptions,
  resolvedUserId,
}: PedidosWorkspaceProps) {
  const supabase = createBrowserSupabaseClient();

  const [products] = useState<ProductRow[]>(initialProducts);
  const [orders, setOrders] = useState<OrderRow[]>(initialOrders);
  const [statusOptions, setStatusOptions] = useState<string[]>(initialStatusOptions);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    initialProducts[0]?.id ?? null
  );
  const [quantity, setQuantity] = useState("1");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) ?? null,
    [products, selectedProductId]
  );

  const normalizedStatusOptions = useMemo(
    () => getStatusOptions(statusOptions),
    [statusOptions]
  );

  const defaultCreateStatus = useMemo(() => {
    const pendingStatus = normalizedStatusOptions.find((status) => status === "PENDING");
    return pendingStatus ?? normalizedStatusOptions[0] ?? "PENDING";
  }, [normalizedStatusOptions]);

  const filteredOrders = useMemo(() => {
    if (activeFilter === "ALL") {
      return orders;
    }

    return orders.filter(
      (order) => normalizeOrderStatus(order.current_status) === normalizeOrderStatus(activeFilter)
    );
  }, [activeFilter, orders]);

  async function refreshOrders() {
    if (resolvedUserId === null) {
      setOrders([]);
      return;
    }

    setIsLoadingOrders(true);

    const query = supabase
      .from("in_out")
      .select(
        "id, created_at, product_Id, qt, in_out, user_id, current_status, product:product_Id(id, product, photo_name, photo_path)"
      )
      .eq("user_id", resolvedUserId)
      .order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      setErrorMessage(error.message);
      setIsLoadingOrders(false);
      return;
    }

    const fetchedOrders = (data ?? []) as OrderRow[];
    setOrders(fetchedOrders);

    const fetchedStatusOptions = getStatusOptions(
      fetchedOrders.map((order) => order.current_status)
    );
    setStatusOptions(fetchedStatusOptions);

    setIsLoadingOrders(false);
  }

  async function handleCreateOrder() {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (resolvedUserId === null) {
      setErrorMessage(
        "Nao foi possivel identificar o seu user_id numerico. Atualize os metadados da conta para criar pedidos."
      );
      return;
    }

    if (!selectedProduct) {
      setErrorMessage("Selecione um produto para criar o pedido.");
      return;
    }

    const parsedQuantity = Number.parseInt(quantity, 10);

    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      setErrorMessage("A quantidade deve ser um numero inteiro maior que zero.");
      return;
    }

    setIsCreatingOrder(true);

    const { error } = await supabase.from("in_out").insert({
      product_Id: selectedProduct.id,
      qt: parsedQuantity,
      in_out: false,
      user_id: resolvedUserId,
      current_status: defaultCreateStatus,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsCreatingOrder(false);
      return;
    }

    setSuccessMessage("Pedido criado com sucesso.");
    setQuantity("1");
    await refreshOrders();
    setIsCreatingOrder(false);
  }

  async function handleUpdateStatus(orderId: number, newStatus: string) {
    setErrorMessage(null);
    setSuccessMessage(null);
    setEditingOrderId(orderId);

    let query = supabase
      .from("in_out")
      .update({ current_status: normalizeOrderStatus(newStatus) })
      .eq("id", orderId);

    if (resolvedUserId !== null) {
      query = query.eq("user_id", resolvedUserId);
    }

    const { error } = await query;

    if (error) {
      setErrorMessage(error.message);
      setEditingOrderId(null);
      return;
    }

    setSuccessMessage("Status atualizado com sucesso.");
    await refreshOrders();
    setEditingOrderId(null);
  }

  async function handleDeleteOrder(orderId: number) {
    setErrorMessage(null);
    setSuccessMessage(null);
    setDeletingOrderId(orderId);

    let query = supabase.from("in_out").delete().eq("id", orderId);

    if (resolvedUserId !== null) {
      query = query.eq("user_id", resolvedUserId);
    }

    const { error } = await query;

    if (error) {
      setErrorMessage(error.message);
      setDeletingOrderId(null);
      return;
    }

    setSuccessMessage("Pedido excluido com sucesso.");
    await refreshOrders();
    setDeletingOrderId(null);
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Catalogo de Produtos</h2>
          <p className="text-sm text-zinc-600">
            Quando voce cria um pedido, o sistema grava uma saida de estoque com in_out = false.
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

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const isSelected = selectedProductId === product.id;
            const productName = product.product?.trim() || `Produto #${product.id}`;

            return (
              <Card key={product.id} className="space-y-3">
                <ProductImage
                  src={product.photo_path}
                  alt={productName}
                  className="h-36 w-full"
                />

                <div className="space-y-1">
                  <p className="text-sm font-semibold text-zinc-900">{productName}</p>
                  <p className="text-xs text-zinc-500">ID: {product.id}</p>
                </div>

                <Button
                  variant={isSelected ? "primary" : "secondary"}
                  className="w-full"
                  onClick={() => setSelectedProductId(product.id)}
                >
                  {isSelected ? "Selecionado" : "Adicionar ao pedido"}
                </Button>
              </Card>
            );
          })}

          {products.length === 0 ? (
            <Card>
              <p className="text-sm text-zinc-600">Nenhum produto disponivel no momento.</p>
            </Card>
          ) : null}
        </div>

        <Card className="space-y-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold">Fazer pedido</h3>
            <p className="text-sm text-zinc-600">
              {selectedProduct
                ? `Produto selecionado: ${selectedProduct.product?.trim() || `Produto #${selectedProduct.id}`}`
                : "Selecione um produto acima para continuar."}
            </p>
          </div>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-zinc-700">Quantidade</span>
            <input
              type="number"
              min={1}
              step={1}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-500"
            />
          </label>

          <Button
            className="w-full sm:w-auto"
            onClick={handleCreateOrder}
            disabled={isCreatingOrder || selectedProduct === null}
          >
            {isCreatingOrder ? "Criando pedido..." : "Fazer pedido"}
          </Button>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Meus Pedidos</h2>
          <p className="text-sm text-zinc-600">
            Organize seus pedidos por status e acompanhe cada etapa.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeFilter === "ALL" ? "primary" : "secondary"}
            onClick={() => setActiveFilter("ALL")}
          >
            Todos
          </Button>

          {normalizedStatusOptions.map((status) => (
            <Button
              key={status}
              variant={activeFilter === status ? "primary" : "secondary"}
              onClick={() => setActiveFilter(status)}
            >
              {getOrderStatusLabel(status)}
            </Button>
          ))}
        </div>

        {isLoadingOrders ? (
          <p className="text-sm text-zinc-600">Atualizando pedidos...</p>
        ) : null}

        <div className="grid gap-3">
          {filteredOrders.map((order) => {
            const orderProduct = getOrderProduct(order);
            const orderProductName = orderProduct?.product?.trim() || `Produto #${order.product_Id ?? "-"}`;
            const currentStatus = normalizeOrderStatus(order.current_status);

            return (
              <Card key={order.id} className="space-y-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <ProductImage
                    src={orderProduct?.photo_path ?? null}
                    alt={orderProductName}
                    className="h-24 w-full sm:w-28"
                  />

                  <div className="flex-1 space-y-2">
                    <p className="text-sm font-semibold text-zinc-900">{orderProductName}</p>
                    <p className="text-sm text-zinc-600">Quantidade: {order.qt ?? 0}</p>
                    <p className="text-sm text-zinc-600">
                      Status atual: <span className="font-medium text-zinc-900">{currentStatus}</span>
                    </p>
                    <p className="text-sm text-zinc-600">{formatPedidoDate(order.created_at)}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <select
                    className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-500"
                    defaultValue={currentStatus}
                    onChange={(event) => {
                      void handleUpdateStatus(order.id, event.target.value);
                    }}
                    disabled={editingOrderId === order.id}
                  >
                    {normalizedStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>

                  <Button
                    variant="secondary"
                    onClick={() => void handleUpdateStatus(order.id, "CANCELLED")}
                    disabled={editingOrderId === order.id || currentStatus === "CANCELLED"}
                  >
                    Cancelar
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={() => void handleDeleteOrder(order.id)}
                    disabled={deletingOrderId === order.id}
                  >
                    {deletingOrderId === order.id ? "Excluindo..." : "Excluir"}
                  </Button>
                </div>
              </Card>
            );
          })}

          {filteredOrders.length === 0 ? (
            <Card>
              <p className="text-sm text-zinc-600">
                Nenhum pedido encontrado para o filtro selecionado.
              </p>
            </Card>
          ) : null}
        </div>
      </section>
    </div>
  );
}
