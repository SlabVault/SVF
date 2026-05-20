import { AdminLoginForm } from "@/components/admin-login-form";
import { Card } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/breadcrumbs";

export default function AdminLoginPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-5 sm:py-16">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Admin", href: "/admin" },
          { label: "Login", href: "/admin/login" },
        ]}
      />

      <div className="mx-auto max-w-md">
        <Card className="space-y-6 bg-gradient-to-br from-vault-panel/50 to-vault-deep/50 p-8">
          <div className="space-y-2 text-center">
            <h1 className="font-display text-2xl font-semibold">Admin Login</h1>
            <p className="text-sm text-muted">
              Enter your admin password to access the dashboard
            </p>
          </div>

          <AdminLoginForm />
        </Card>
      </div>
    </div>
  );
}
