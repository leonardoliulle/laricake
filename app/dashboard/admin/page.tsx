import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { AdminStockWorkspace } from "@/components/dashboard/admin-stock-workspace";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { hasSupabaseEnv } from "@/lib/env";
import {
  deriveNumericUserIdFromAuthUid,
  isUserAdmin,
  resolveNumericUserId,
} from "@/lib/orders";
import { fetchProductsForCatalog, type ProductRow } from "@/lib/products";
import { createServerSupabaseClient } from "@/lib/supabase-server";

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

  let resolvedUserId = resolveNumericUserId(user);

  if (resolvedUserId === null) {
    const derivedUserId = deriveNumericUserIdFromAuthUid(user.id);
    const { error: updateUserError } = await supabase.auth.updateUser({
      data: {
        user_id: derivedUserId,
      },
    });

    if (!updateUserError) {
      resolvedUserId = derivedUserId;
    }
  }

  const { products: productsData } = await fetchProductsForCatalog(supabase);

  const { data: stockMovementsData } = await supabase
    .from("in_out")
    .select(
      "id, created_at, product_Id, qt, in_out, user_id, current_status, product:product_Id(id, created_at, product, photo_name, photo_path)"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const initialProducts = productsData;
  const initialMovements = (stockMovementsData ?? []) as StockMovementRow[];

  return (
    <main className="flex-1 py-10 sm:py-14">
      <Container className="space-y-6">
        <Card className="space-y-3">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Painel Admin de Estoque</h1>
            <p className="text-sm text-zinc-600">
              Entradas de estoque (in_out = true) e visao global dos movimentos.
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
        </Card>

        <AdminStockWorkspace
          initialProducts={initialProducts}
          initialMovements={initialMovements}
          resolvedUserId={resolvedUserId}
        />
      </Container>
    </main>
  );
}
