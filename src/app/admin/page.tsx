import type { Metadata } from "next";
import Admin from "./Admin";

export const metadata: Metadata = {
  title: "Admin · Enhcept",
  robots: { index: false, follow: false },
};

// Static shell; the client component checks the session by calling the admin API (401 shows the login card).
export default function AdminPage() {
  return <Admin />;
}
