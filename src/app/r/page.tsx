import { redirect } from "next/navigation";

/** `/r` sans code → inscription (évite un 404 nu). */
export default function ReferralIndexPage() {
  redirect("/register");
}
