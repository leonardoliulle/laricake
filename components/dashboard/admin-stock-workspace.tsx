"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";

type ProductRow = {
  id: number;
  name: string;
  price: number;
  stock_qty: number;
};

type OrderRow = {
  id: number;
  customer_id: number | null;
  status: string;
  total: number;
};

type OrderItemRow = {
  order_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
};

type InventoryMovementRow = {
  id: number;
  product_id: number | null;
  quantity: number;
  type: string;
  reference: string | null;
  created_at: string;
};

type AdminStockWorkspaceProps = {
  initialProducts: ProductRow[];
  initialOrders: OrderRow[];
  initialOrderItems: OrderItemRow[];
  initialMovements: InventoryMovementRow[];
};

type OrderItemKey = {
  order_id: number;
  product_id: number;
};

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function parsePositiveNumber(value: string) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
}

function parseNonNegativeNumber(value: string) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return null;
  }

  return parsedValue;
}

function parseInteger(value: string, allowNull = false) {
  if (allowNull && value.trim().length === 0) {
    return null;
  }

  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isInteger(parsedValue)) {
    return null;
  }

  return parsedValue;
}

export function AdminStockWorkspace({
  initialProducts,
  initialOrders,
  initialOrderItems,
  initialMovements,
}: AdminStockWorkspaceProps) {
  const supabase = createBrowserSupabaseClient();

  const [products, setProducts] = useState<ProductRow[]>(initialProducts);
  const [orders, setOrders] = useState<OrderRow[]>(initialOrders);
  const [orderItems, setOrderItems] = useState<OrderItemRow[]>(initialOrderItems);
  const [movements, setMovements] = useState<InventoryMovementRow[]>(initialMovements);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("0");
  const [productStockQty, setProductStockQty] = useState("0");

  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [orderCustomerId, setOrderCustomerId] = useState("");
  const [orderStatus, setOrderStatus] = useState("PENDING");
  const [orderTotal, setOrderTotal] = useState("0");

  const [isSavingItem, setIsSavingItem] = useState(false);
  const [editingItemKey, setEditingItemKey] = useState<OrderItemKey | null>(null);
  const [itemOrderId, setItemOrderId] = useState<string>(String(initialOrders[0]?.id ?? ""));
  const [itemProductId, setItemProductId] = useState<string>(String(initialProducts[0]?.id ?? ""));
  const [itemQuantity, setItemQuantity] = useState("1");
  const [itemUnitPrice, setItemUnitPrice] = useState("0");

  const [isSavingMovement, setIsSavingMovement] = useState(false);
  const [editingMovementId, setEditingMovementId] = useState<number | null>(null);
  const [movementProductId, setMovementProductId] = useState<string>(
    String(initialProducts[0]?.id ?? "")
  );
  const [movementQuantity, setMovementQuantity] = useState("1");
  const [movementType, setMovementType] = useState("IN");
  const [movementReference, setMovementReference] = useState("");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const productsById = useMemo(() => {
    const map = new Map<number, ProductRow>();

    for (const product of products) {
      map.set(product.id, product);
    }

    return map;
  }, [products]);

  const ordersById = useMemo(() => {
    const map = new Map<number, OrderRow>();

    for (const order of orders) {
      map.set(order.id, order);
    }

    return map;
  }, [orders]);

  async function refreshAll() {
    setIsRefreshing(true);
    setErrorMessage(null);

    const [{ data: productsData, error: productsError }, { data: ordersData, error: ordersError }, { data: itemsData, error: itemsError }, { data: movementsData, error: movementsError }] = await Promise.all([
      supabase.from("l_products").select("id, name, price, stock_qty").order("id", { ascending: true }),
      supabase.from("l_orders").select("id, customer_id, status, total").order("id", { ascending: false }),
      supabase
        .from("l_order_items")
        .select("order_id, product_id, quantity, unit_price")
        .order("order_id", { ascending: false }),
      supabase
        .from("l_inventory_movements")
        .select("id, product_id, quantity, type, reference, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    const firstError = productsError ?? ordersError ?? itemsError ?? movementsError;

    if (firstError) {
      setErrorMessage(firstError.message);
      setIsRefreshing(false);
      return;
    }

    setProducts((productsData ?? []) as ProductRow[]);
    setOrders((ordersData ?? []) as OrderRow[]);
    setOrderItems((itemsData ?? []) as OrderItemRow[]);
    setMovements((movementsData ?? []) as InventoryMovementRow[]);
    setIsRefreshing(false);
  }

  function resetProductForm() {
    setEditingProductId(null);
    setProductName("");
    setProductPrice("0");
    setProductStockQty("0");
  }

  function startEditProduct(product: ProductRow) {
    setEditingProductId(product.id);
    setProductName(product.name);
    setProductPrice(String(product.price));
    setProductStockQty(String(product.stock_qty));
  }

  async function saveProduct() {
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedName = productName.trim();
    const parsedPrice = parseNonNegativeNumber(productPrice);
    const parsedStockQty = parseInteger(productStockQty);

    if (trimmedName.length === 0) {
      setErrorMessage("Informe o nome do produto.");
      return;
    }

    if (parsedPrice === null) {
      setErrorMessage("Preco invalido.");
      return;
    }

    if (parsedStockQty === null || parsedStockQty < 0) {
      setErrorMessage("Estoque invalido.");
      return;
    }

    setIsSavingProduct(true);

    if (editingProductId === null) {
      const { error } = await supabase.from("l_products").insert({
        name: trimmedName,
        price: parsedPrice,
        stock_qty: parsedStockQty,
      });

      if (error) {
        setErrorMessage(error.message);
        setIsSavingProduct(false);
        return;
      }

      setSuccessMessage("Produto criado com sucesso.");
    } else {
      const { error } = await supabase
        .from("l_products")
        .update({
          name: trimmedName,
          price: parsedPrice,
          stock_qty: parsedStockQty,
        })
        .eq("id", editingProductId);

      if (error) {
        setErrorMessage(error.message);
        setIsSavingProduct(false);
        return;
      }

      setSuccessMessage("Produto atualizado com sucesso.");
    }

    await refreshAll();
    resetProductForm();
    setIsSavingProduct(false);
  }

  async function deleteProduct(productId: number) {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSavingProduct(true);

    const { error } = await supabase.from("l_products").delete().eq("id", productId);

    if (error) {
      setErrorMessage(error.message);
      setIsSavingProduct(false);
      return;
    }

    setSuccessMessage("Produto removido com sucesso.");
    await refreshAll();

    if (editingProductId === productId) {
      resetProductForm();
    }

    setIsSavingProduct(false);
  }

  function resetOrderForm() {
    setEditingOrderId(null);
    setOrderCustomerId("");
    setOrderStatus("PENDING");
    setOrderTotal("0");
  }

  function startEditOrder(order: OrderRow) {
    setEditingOrderId(order.id);
    setOrderCustomerId(order.customer_id === null ? "" : String(order.customer_id));
    setOrderStatus(order.status);
    setOrderTotal(String(order.total));
  }

  async function saveOrder() {
    setErrorMessage(null);
    setSuccessMessage(null);

    const parsedCustomerId = parseInteger(orderCustomerId, true);
    const parsedTotal = parseNonNegativeNumber(orderTotal);
    const normalizedStatus = orderStatus.trim().toUpperCase();

    if (parsedTotal === null) {
      setErrorMessage("Total invalido.");
      return;
    }

    if (normalizedStatus.length === 0) {
      setErrorMessage("Informe o status do pedido.");
      return;
    }

    setIsSavingOrder(true);

    if (editingOrderId === null) {
      const { error } = await supabase.from("l_orders").insert({
        customer_id: parsedCustomerId,
        status: normalizedStatus,
        total: parsedTotal,
      });

      if (error) {
        setErrorMessage(error.message);
        setIsSavingOrder(false);
        return;
      }

      setSuccessMessage("Pedido criado com sucesso.");
    } else {
      const { error } = await supabase
        .from("l_orders")
        .update({
          customer_id: parsedCustomerId,
          status: normalizedStatus,
          total: parsedTotal,
        })
        .eq("id", editingOrderId);

      if (error) {
        setErrorMessage(error.message);
        setIsSavingOrder(false);
        return;
      }

      setSuccessMessage("Pedido atualizado com sucesso.");
    }

    await refreshAll();
    resetOrderForm();
    setIsSavingOrder(false);
  }

  async function deleteOrder(orderId: number) {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSavingOrder(true);

    const { error } = await supabase.from("l_orders").delete().eq("id", orderId);

    if (error) {
      setErrorMessage(error.message);
      setIsSavingOrder(false);
      return;
    }

    setSuccessMessage("Pedido removido com sucesso.");
    await refreshAll();

    if (editingOrderId === orderId) {
      resetOrderForm();
    }

    setIsSavingOrder(false);
  }

  function resetItemForm() {
    setEditingItemKey(null);
    setItemOrderId(String(orders[0]?.id ?? ""));
    setItemProductId(String(products[0]?.id ?? ""));
    setItemQuantity("1");
    setItemUnitPrice("0");
  }

  function startEditItem(item: OrderItemRow) {
    setEditingItemKey({ order_id: item.order_id, product_id: item.product_id });
    setItemOrderId(String(item.order_id));
    setItemProductId(String(item.product_id));
    setItemQuantity(String(item.quantity));
    setItemUnitPrice(String(item.unit_price));
  }

  async function saveOrderItem() {
    setErrorMessage(null);
    setSuccessMessage(null);

    const parsedOrderId = parseInteger(itemOrderId);
    const parsedProductId = parseInteger(itemProductId);
    const parsedQuantity = parsePositiveNumber(itemQuantity);
    const parsedUnitPrice = parseNonNegativeNumber(itemUnitPrice);

    if (parsedOrderId === null) {
      setErrorMessage("Selecione um pedido valido.");
      return;
    }

    if (parsedProductId === null) {
      setErrorMessage("Selecione um produto valido.");
      return;
    }

    if (parsedQuantity === null) {
      setErrorMessage("Quantidade invalida.");
      return;
    }

    if (parsedUnitPrice === null) {
      setErrorMessage("Preco unitario invalido.");
      return;
    }

    setIsSavingItem(true);

    if (editingItemKey === null) {
      const { error } = await supabase.from("l_order_items").insert({
        order_id: parsedOrderId,
        product_id: parsedProductId,
        quantity: parsedQuantity,
        unit_price: parsedUnitPrice,
      });

      if (error) {
        setErrorMessage(error.message);
        setIsSavingItem(false);
        return;
      }

      setSuccessMessage("Item do pedido criado com sucesso.");
    } else {
      const { error } = await supabase
        .from("l_order_items")
        .update({
          order_id: parsedOrderId,
          product_id: parsedProductId,
          quantity: parsedQuantity,
          unit_price: parsedUnitPrice,
        })
        .eq("order_id", editingItemKey.order_id)
        .eq("product_id", editingItemKey.product_id);

      if (error) {
        setErrorMessage(error.message);
        setIsSavingItem(false);
        return;
      }

      setSuccessMessage("Item do pedido atualizado com sucesso.");
    }

    await refreshAll();
    resetItemForm();
    setIsSavingItem(false);
  }

  async function deleteOrderItem(item: OrderItemRow) {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSavingItem(true);

    const { error } = await supabase
      .from("l_order_items")
      .delete()
      .eq("order_id", item.order_id)
      .eq("product_id", item.product_id);

    if (error) {
      setErrorMessage(error.message);
      setIsSavingItem(false);
      return;
    }

    setSuccessMessage("Item do pedido removido com sucesso.");
    await refreshAll();

    if (
      editingItemKey &&
      editingItemKey.order_id === item.order_id &&
      editingItemKey.product_id === item.product_id
    ) {
      resetItemForm();
    }

    setIsSavingItem(false);
  }

  function resetMovementForm() {
    setEditingMovementId(null);
    setMovementProductId(String(products[0]?.id ?? ""));
    setMovementQuantity("1");
    setMovementType("IN");
    setMovementReference("");
  }

  function startEditMovement(movement: InventoryMovementRow) {
    setEditingMovementId(movement.id);
    setMovementProductId(movement.product_id === null ? "" : String(movement.product_id));
    setMovementQuantity(String(movement.quantity));
    setMovementType(movement.type);
    setMovementReference(movement.reference ?? "");
  }

  async function saveMovement() {
    setErrorMessage(null);
    setSuccessMessage(null);

    const parsedProductId = parseInteger(movementProductId);
    const parsedQuantity = parsePositiveNumber(movementQuantity);
    const normalizedType = movementType.trim().toUpperCase();
    const normalizedReference = movementReference.trim();

    if (parsedProductId === null) {
      setErrorMessage("Selecione um produto valido para o movimento.");
      return;
    }

    if (parsedQuantity === null) {
      setErrorMessage("Quantidade do movimento invalida.");
      return;
    }

    if (normalizedType.length === 0) {
      setErrorMessage("Informe o tipo do movimento.");
      return;
    }

    setIsSavingMovement(true);

    if (editingMovementId === null) {
      const { error } = await supabase.from("l_inventory_movements").insert({
        product_id: parsedProductId,
        quantity: parsedQuantity,
        type: normalizedType,
        reference: normalizedReference.length > 0 ? normalizedReference : null,
      });

      if (error) {
        setErrorMessage(error.message);
        setIsSavingMovement(false);
        return;
      }

      setSuccessMessage("Movimento criado com sucesso.");
    } else {
      const { error } = await supabase
        .from("l_inventory_movements")
        .update({
          product_id: parsedProductId,
          quantity: parsedQuantity,
          type: normalizedType,
          reference: normalizedReference.length > 0 ? normalizedReference : null,
        })
        .eq("id", editingMovementId);

      if (error) {
        setErrorMessage(error.message);
        setIsSavingMovement(false);
        return;
      }

      setSuccessMessage("Movimento atualizado com sucesso.");
    }

    await refreshAll();
    resetMovementForm();
    setIsSavingMovement(false);
  }

  async function deleteMovement(movementId: number) {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSavingMovement(true);

    const { error } = await supabase
      .from("l_inventory_movements")
      .delete()
      .eq("id", movementId);

    if (error) {
      setErrorMessage(error.message);
      setIsSavingMovement(false);
      return;
    }

    setSuccessMessage("Movimento removido com sucesso.");
    await refreshAll();

    if (editingMovementId === movementId) {
      resetMovementForm();
    }

    setIsSavingMovement(false);
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">CRUD de Tabelas l_*</h2>
          <p className="text-sm text-zinc-600">
            Cadastre e mantenha dados em l_products, l_orders, l_order_items e l_inventory_movements.
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

        <Button variant="secondary" onClick={() => void refreshAll()} disabled={isRefreshing}>
          {isRefreshing ? "Atualizando tabelas..." : "Atualizar dados"}
        </Button>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">l_products</h2>
          <p className="text-sm text-zinc-600">Campos: id, name, price, stock_qty.</p>
        </div>

        <Card className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-zinc-700">Nome</span>
            <input
              type="text"
              value={productName}
              onChange={(event) => setProductName(event.target.value)}
              className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-500"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-zinc-700">Preco</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={productPrice}
              onChange={(event) => setProductPrice(event.target.value)}
              className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-500"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-zinc-700">Estoque</span>
            <input
              type="number"
              min={0}
              step={1}
              value={productStockQty}
              onChange={(event) => setProductStockQty(event.target.value)}
              className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-500"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void saveProduct()} disabled={isSavingProduct}>
              {isSavingProduct ? "Salvando..." : editingProductId === null ? "Criar produto" : "Atualizar produto"}
            </Button>
            <Button variant="secondary" onClick={resetProductForm} disabled={isSavingProduct}>
              Limpar
            </Button>
          </div>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Card key={product.id} className="space-y-2">
              <p className="text-sm font-semibold text-zinc-900">{product.name}</p>
              <p className="text-xs text-zinc-600">ID: {product.id}</p>
              <p className="text-sm text-zinc-600">Preco: {product.price}</p>
              <p className="text-sm text-zinc-600">Estoque: {product.stock_qty}</p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => startEditProduct(product)}>
                  Editar
                </Button>
                <Button variant="secondary" onClick={() => void deleteProduct(product.id)}>
                  Excluir
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">l_orders</h2>
          <p className="text-sm text-zinc-600">Campos: id, customer_id, status, total.</p>
        </div>

        <Card className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-zinc-700">Customer ID (opcional)</span>
            <input
              type="number"
              step={1}
              value={orderCustomerId}
              onChange={(event) => setOrderCustomerId(event.target.value)}
              className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-500"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-zinc-700">Status</span>
            <input
              type="text"
              value={orderStatus}
              onChange={(event) => setOrderStatus(event.target.value)}
              className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-500"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-zinc-700">Total</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={orderTotal}
              onChange={(event) => setOrderTotal(event.target.value)}
              className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-500"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void saveOrder()} disabled={isSavingOrder}>
              {isSavingOrder ? "Salvando..." : editingOrderId === null ? "Criar pedido" : "Atualizar pedido"}
            </Button>
            <Button variant="secondary" onClick={resetOrderForm} disabled={isSavingOrder}>
              Limpar
            </Button>
          </div>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => (
            <Card key={order.id} className="space-y-2">
              <p className="text-sm font-semibold text-zinc-900">Pedido #{order.id}</p>
              <p className="text-xs text-zinc-600">Customer: {order.customer_id ?? "-"}</p>
              <p className="text-sm text-zinc-600">Status: {order.status}</p>
              <p className="text-sm text-zinc-600">Total: {order.total}</p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => startEditOrder(order)}>
                  Editar
                </Button>
                <Button variant="secondary" onClick={() => void deleteOrder(order.id)}>
                  Excluir
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">l_order_items</h2>
          <p className="text-sm text-zinc-600">
            Campos: order_id, product_id, quantity, unit_price.
          </p>
        </div>

        <Card className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-zinc-700">Pedido</span>
            <select
              className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-500"
              value={itemOrderId}
              onChange={(event) => setItemOrderId(event.target.value)}
            >
              <option value="">Selecione</option>
              {orders.map((order) => (
                <option key={order.id} value={order.id}>
                  Pedido #{order.id}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-zinc-700">Produto</span>
            <select
              className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-500"
              value={itemProductId}
              onChange={(event) => setItemProductId(event.target.value)}
            >
              <option value="">Selecione</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-zinc-700">Quantidade</span>
            <input
              type="number"
              min={1}
              step="0.01"
              value={itemQuantity}
              onChange={(event) => setItemQuantity(event.target.value)}
              className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-500"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-zinc-700">Preco unitario</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={itemUnitPrice}
              onChange={(event) => setItemUnitPrice(event.target.value)}
              className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-500"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void saveOrderItem()} disabled={isSavingItem}>
              {isSavingItem ? "Salvando..." : editingItemKey === null ? "Criar item" : "Atualizar item"}
            </Button>
            <Button variant="secondary" onClick={resetItemForm} disabled={isSavingItem}>
              Limpar
            </Button>
          </div>
        </Card>

        <div className="grid gap-3">
          {orderItems.map((item) => {
            const product = productsById.get(item.product_id);
            const order = ordersById.get(item.order_id);

            return (
              <Card key={`${item.order_id}-${item.product_id}`} className="space-y-2">
                <p className="text-sm font-semibold text-zinc-900">
                  Pedido #{item.order_id} - {product?.name ?? `Produto #${item.product_id}`}
                </p>
                <p className="text-sm text-zinc-600">Quantidade: {item.quantity}</p>
                <p className="text-sm text-zinc-600">Preco unitario: {item.unit_price}</p>
                <p className="text-xs text-zinc-500">Status pedido: {order?.status ?? "-"}</p>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => startEditItem(item)}>
                    Editar
                  </Button>
                  <Button variant="secondary" onClick={() => void deleteOrderItem(item)}>
                    Excluir
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">l_inventory_movements</h2>
          <p className="text-sm text-zinc-600">
            Campos: id, product_id, quantity, type, reference, created_at.
          </p>
        </div>

        <Card className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-zinc-700">Produto</span>
            <select
              className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-500"
              value={movementProductId}
              onChange={(event) => setMovementProductId(event.target.value)}
            >
              <option value="">Selecione</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-zinc-700">Quantidade</span>
            <input
              type="number"
              min={1}
              step="0.01"
              value={movementQuantity}
              onChange={(event) => setMovementQuantity(event.target.value)}
              className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-500"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-zinc-700">Tipo</span>
            <input
              type="text"
              value={movementType}
              onChange={(event) => setMovementType(event.target.value)}
              className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-500"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-zinc-700">Referencia</span>
            <input
              type="text"
              value={movementReference}
              onChange={(event) => setMovementReference(event.target.value)}
              className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-500"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void saveMovement()} disabled={isSavingMovement}>
              {isSavingMovement
                ? "Salvando..."
                : editingMovementId === null
                  ? "Criar movimento"
                  : "Atualizar movimento"}
            </Button>
            <Button variant="secondary" onClick={resetMovementForm} disabled={isSavingMovement}>
              Limpar
            </Button>
          </div>
        </Card>

        <div className="grid gap-3">
          {movements.map((movement) => {
            const movementProduct =
              movement.product_id === null ? null : productsById.get(movement.product_id) ?? null;

            return (
              <Card key={movement.id} className="space-y-2">
                <p className="text-sm font-semibold text-zinc-900">
                  {movementProduct?.name ?? `Produto #${movement.product_id ?? "-"}`}
                </p>
                <p className="text-sm text-zinc-600">Tipo: {movement.type}</p>
                <p className="text-sm text-zinc-600">Quantidade: {movement.quantity}</p>
                <p className="text-sm text-zinc-600">Referencia: {movement.reference ?? "-"}</p>
                <p className="text-sm text-zinc-600">Data: {formatDateTime(movement.created_at)}</p>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => startEditMovement(movement)}>
                    Editar
                  </Button>
                  <Button variant="secondary" onClick={() => void deleteMovement(movement.id)}>
                    Excluir
                  </Button>
                </div>
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
