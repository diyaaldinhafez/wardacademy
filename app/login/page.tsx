import type { Metadata } from "next";
import LoginScreen from "@/components/LoginScreen";

export const metadata: Metadata = {
  title: "Log in — Ward Academy",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <LoginScreen />;
}
