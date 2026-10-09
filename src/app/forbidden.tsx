import { getVerifiedServerPrincipal } from "@/data/server/identity-provider.server";

export default async function Forbidden() {
  const principal = await getVerifiedServerPrincipal().catch(() => null);
  const email = principal?.verifiedEmail ?? "未验证身份";
  return <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-3 px-6">
    <h1 className="text-2xl font-semibold">暂无访问权限</h1>
    <p className="text-sm">当前账号：{email}</p>
    <p className="text-sm text-muted-foreground">当前账号尚未配置 EHS Dashboard 访问范围。如需访问，请联系系统管理员。</p>
  </main>;
}
