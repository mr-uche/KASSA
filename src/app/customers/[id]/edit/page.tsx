"use client";

import { useParams } from "next/navigation";
import CustomerEditor from "@/components/customers/CustomerEditor";

export default function EditCustomerPage() {
  const { id } = useParams<{ id: string }>();
  return <CustomerEditor customerId={id} />;
}
