// Starter roles are editable by the owner. Never grant staff administration or
// financial/settings permissions implicitly; owners may add those explicitly.
export const DEFAULT_STAFF_ROLES = [
  {
    "name": "Manager",
    "description": "Manage branch sales, transactions and inventory",
    "permissions": [
      "View dashboard",
      "Manage sales",
      "View transactions",
      "Manage products & inventory"
    ]
  },
  {
    "name": "Cashier",
    "description": "Record sales and view transactions in the assigned branch",
    "permissions": [
      "View dashboard",
      "Manage sales",
      "View transactions"
    ]
  },
  {
    "name": "Inventory Officer",
    "description": "Manage products and inventory in the assigned branch",
    "permissions": [
      "View dashboard",
      "Manage products & inventory"
    ]
  }
];
