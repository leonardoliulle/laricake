import { redirect } from "next/navigation";
import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { PedidosWorkspace } from "@/components/dashboard/pedidos-workspace";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { hasSupabaseEnv } from "@/lib/env";
import {
  deriveNumericUserIdFromAuthUid,
  getStatusOptions,
  isUserAdmin,
  resolveNumericUserId,
} from "@/lib/orders";
import { fetchProductsForCatalog, type ProductRow } from "@/lib/products";
import { createServerSupabaseClient } from "@/lib/supabase-server";

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

export default async function DashboardPage() {
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

  const userIsAdmin = isUserAdmin(user);

  let resolvedUserId = resolveNumericUserId(user);
  let userIdProvisioningError: string | null = null;

  if (resolvedUserId === null) {
    const derivedUserId = deriveNumericUserIdFromAuthUid(user.id);
    const { error: updateUserError } = await supabase.auth.updateUser({
      data: {
        user_id: derivedUserId,
      },
    });

    if (updateUserError) {
      userIdProvisioningError = updateUserError.message;
    } else {
      resolvedUserId = derivedUserId;
    }
  }

  const {
    products: productsData,
    warningMessage: productsWarningMessage,
    sourceTable: productsSourceTable,
  } = await fetchProductsForCatalog(supabase);

  let ordersQuery = supabase
    .from("in_out")
    .select(
      "id, created_at, product_Id, qt, in_out, user_id, current_status, product:product_Id(id, created_at, product, photo_name, photo_path)"
    )
    .order("created_at", { ascending: false });

  if (resolvedUserId !== null) {
    ordersQuery = ordersQuery.eq("user_id", resolvedUserId);
  } else {
    ordersQuery = ordersQuery.limit(0);
  }

  const { data: ordersData } = await ordersQuery;

  const initialProducts = productsData;
  const initialOrders = (ordersData ?? []) as OrderRow[];
  const initialStatusOptions = getStatusOptions(
    initialOrders.map((order) => order.current_status)
  );

  return (
    <main className="flex-1 py-10 sm:py-14">
      <Container className="space-y-6">
        <Card className="space-y-3">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Area de Pedidos</h1>
            <p className="text-sm text-zinc-600">Catalogo de produtos e acompanhamento de pedidos</p>
          </div>

          <p className="text-sm text-zinc-800">
            Logado com <span className="font-medium">{user.email ?? "desconhecido"}</span>
          </p>

          <p className="text-sm text-zinc-700">
            Perfil: <span className="font-medium">{userIsAdmin ? "Admin" : "Usuario"}</span>
          </p>

          {userIsAdmin ? (
            <Link
              href="/dashboard/admin"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50"
            >
              Ir para painel de estoque (admin)
            </Link>
          ) : null}

          {resolvedUserId === null ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Nao foi encontrado um user_id numerico nos metadados da conta. Nao foi possivel definir automaticamente esse valor para permitir criacao e listagem de pedidos em in_out.user_id.
              {userIdProvisioningError ? ` Detalhe: ${userIdProvisioningError}` : ""}
            </p>
          ) : null}

          {productsWarningMessage ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Houve um problema ao carregar produtos da tabela {productsSourceTable}. Detalhes: {productsWarningMessage}
            </p>
          ) : null}

          <LogoutButton />
        </Card>

        <PedidosWorkspace
          initialProducts={initialProducts}
          initialOrders={initialOrders}
          initialStatusOptions={initialStatusOptions}
          resolvedUserId={resolvedUserId}
        />
      </Container>
    </main>
  );
}