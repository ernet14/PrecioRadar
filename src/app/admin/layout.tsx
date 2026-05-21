import type { Metadata } from "next";
import { requireAdmin } from "@/lib/supabase/auth";
import { AdminTabs } from "./AdminTabs";

export const metadata: Metadata = {
  title: {
    default: "Admin",
    template: "%s - Admin",
  },
  robots: { follow: false, index: false },
};

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Defensa en profundidad: cada ruta /admin/* queda gateada desde el layout,
  // aunque una página nueva olvide llamar a requireAdmin.
  await requireAdmin();

  return (
    <>
      <AdminTabs />
      {children}
    </>
  );
}
