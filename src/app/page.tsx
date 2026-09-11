import { redirect } from "next/navigation";
import { routes } from "@/config/navigation";

export default function HomePage() {
  redirect(routes.overview.href);
}
