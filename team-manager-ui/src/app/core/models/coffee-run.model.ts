export interface CoffeeRunMenuItem {
  id: string;
  name: string;
  price: number;
}

export interface CoffeeRunOrderItem {
  id: string;
  menuItemId: string;
  menuItemName: string;
  menuItemPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface CoffeeRunOrder {
  id: string;
  teamMemberId: string;
  teamMemberName: string;
  notes: string | null;
  items: CoffeeRunOrderItem[];
  total: number;
  createdAt: string;
}

export interface CoffeeRunList {
  id: string;
  initiatorName: string;
  status: 'Open' | 'Closed';
  menuItemCount: number;
  orderCount: number;
  createdAt: string;
}

export interface CoffeeRunDetail {
  id: string;
  initiatorId: string;
  initiatorName: string;
  status: 'Open' | 'Closed';
  currentUserOrderId: string | null;
  menuItems: CoffeeRunMenuItem[];
  orders: CoffeeRunOrder[];
  createdAt: string;
}

export interface OrderItemEntry {
  menuItemId: string;
  quantity: number;
}

export interface CreateMenuItemRequest {
  name: string;
  price: number;
}

export interface UpdateMenuItemRequest {
  name?: string;
  price?: number;
}

export interface CreateOrderRequest {
  notes?: string;
  items: OrderItemEntry[];
}

export interface UpdateOrderRequest {
  notes?: string;
  items?: OrderItemEntry[];
}

export interface MenuTemplateList {
  id: string;
  name: string;
  itemCount: number;
  createdAt: string;
}

export interface MenuTemplateDetail {
  id: string;
  name: string;
  items: CoffeeRunMenuItem[];
  createdAt: string;
}

export interface CreateMenuTemplateRequest {
  name: string;
  copyFromRunId: string;
}
