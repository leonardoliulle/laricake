import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { AdminStockWorkspace } from "@/components/dashboard/admin-stock-workspace";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { hasSupabaseEnv } from "@/lib/env";
import {
  isUserAdmin,
} from "@/lib/orders";
import { createServerSupabaseClient } from "@/lib/supabase-server";

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

export default async function AdminDashboardPage() {
  if (!hasSupabaseEnv) {
    redirect("/login");
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!isUserAdmin(user)) {
    redirect("/dashboard");
  }

  const [productsResult, ordersResult, orderItemsResult, movementsResult] = await Promise.all([
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

  const warningMessages: string[] = [];

  if (productsResult.error) {
    warningMessages.push(`l_products: ${productsResult.error.message}`);
  }

  if (ordersResult.error) {
    warningMessages.push(`l_orders: ${ordersResult.error.message}`);
  }

  if (orderItemsResult.error) {
    warningMessages.push(`l_order_items: ${orderItemsResult.error.message}`);
  }

  if (movementsResult.error) {
    warningMessages.push(`l_inventory_movements: ${movementsResult.error.message}`);
  }

  const initialProducts = (productsResult.data ?? []) as ProductRow[];
  const initialOrders = (ordersResult.data ?? []) as OrderRow[];
  const initialOrderItems = (orderItemsResult.data ?? []) as OrderItemRow[];
  const initialMovements = (movementsResult.data ?? []) as InventoryMovementRow[];

  return (
    <main className="flex-1 py-10 sm:py-14">
      <Container className="space-y-6">
        <Card className="space-y-3">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Painel Admin de Estoque</h1>
            <p className="text-sm text-zinc-600">
              CRUD completo para alimentar tabelas de produtos, pedidos, itens e movimentos.
            </p>
          </div>

          <p className="text-sm text-zinc-800">
            Logado com <span className="font-medium">{user.email ?? "desconhecido"}</span>
          </p>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50"
            >
              Voltar para area de pedidos
            </Link>

            <LogoutButton />
          </div>

          {warningMessages.length > 0 ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Falha ao carregar alguns dados: {warningMessages.join(" | ")}
            </p>
          ) : null}
        </Card>

        <AdminStockWorkspace
          initialProducts={initialProducts}
          initialOrders={initialOrders}
          initialOrderItems={initialOrderItems}
          initialMovements={initialMovements}
        />
      </Container>
    </main>
  );
}
