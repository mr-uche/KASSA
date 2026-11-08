import { Suspense } from "react";
import PaymentStatusContent from "./payment-status-content";

export default function PaymentPage() {
  return <Suspense fallback={null}><PaymentStatusContent /></Suspense>;
}
