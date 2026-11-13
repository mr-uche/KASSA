export type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  icon: string;
};

// Figma-inspired sample items. This is NOT inventory from the KASSA backend.
export const products: Product[] = [
  { id: 'WATER-001', name: 'Bottled Water', price: 800, stock: 36, category: 'Beverages', icon: '💧' },
  { id: 'JUICE-001', name: 'Orange Juice', price: 2500, stock: 18, category: 'Beverages', icon: '🍊' },
  { id: 'RICE-001', name: 'Rice 1kg', price: 2000, stock: 12, category: 'Groceries', icon: '🍚' },
  { id: 'BREAD-001', name: 'Bread', price: 1500, stock: 25, category: 'Groceries', icon: '🍞' },
  { id: 'SOAP-001', name: 'Hand Soap', price: 1200, stock: 21, category: 'Other', icon: '🧼' },
  { id: 'MILK-001', name: 'Milk', price: 1800, stock: 17, category: 'Groceries', icon: '🥛' },
];

export const transactions = [
  { id: 'KAS-1001', name: 'Mary Adeyemi', channel: 'Transfer', time: '9:14 AM', amount: 12400, status: 'Success' },
  { id: 'KAS-1002', name: 'Walk-in customer', channel: 'Cash', time: '9:26 AM', amount: 3200, status: 'Success' },
  { id: 'KAS-1003', name: 'Chuka Nwosu', channel: 'POS', time: '9:41 AM', amount: 8750, status: 'Failed' },
  { id: 'KAS-1004', name: 'Ifeoma Bassey', channel: 'Cash', time: '10:02 AM', amount: 4100, status: 'Success' },
] as const;
