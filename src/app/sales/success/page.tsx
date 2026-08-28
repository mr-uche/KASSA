import { Suspense } from "react";
import PaymentSuccessfulContent from "./payment-successful-content";

export default function PaymentSuccessfulPage() {
  return (
    <Suspense fallback={null}>
      <PaymentSuccessfulContent />
    </Suspense>
  );
}