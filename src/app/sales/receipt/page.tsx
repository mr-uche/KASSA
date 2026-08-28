import { Suspense } from "react";
import ReceiptContent from "./receipt-content";

export default function ReceiptPage() {
  return (
    <Suspense fallback={null}>
      <ReceiptContent />
    </Suspense>
  );
}