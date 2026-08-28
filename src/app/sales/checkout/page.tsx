import { Suspense } from "react";
import ConfirmPaymentContent from "./confirm-payment-content";

export default function ConfirmPaymentPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmPaymentContent />
    </Suspense>
  );
}