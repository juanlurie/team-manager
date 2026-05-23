export interface CoffeeRunMenuItem {
  id: string;
  name: string;
  price: number;
  category: string | null;
  maxQuantity: number | null;
  remainingQuantity: number | null;
  isAvailable: boolean;
  sortOrder: number;
}

export interface TemplateItem {
  id: string;
  name: string;
  price: number | null;
  category: string | null;
  sortOrder: number;
}

export interface CoffeeRunOrderItem {
  id: string;
  menuItemId: string;
  menuItemName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface CoffeeRunOrder {
  id: string;
  teamMemberId: string;
  teamMemberName: string;
  status: string;
  notes: string | null;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  items: CoffeeRunOrderItem[];
}

export interface CoffeeRunList {
  id: string;
  initiatorName: string;
  title: string | null;
  status: string;
  menuItemCount: number;
  orderCount: number;
  totalAmount: number;
  createdAt: string;
  orderDeadline: string | null;
  closedAt: string | null;
  location: string | null;
}

export interface CoffeeRunDetail {
  id: string;
  initiatorId: string;
  initiatorName: string;
  title: string | null;
  description: string | null;
  location: string | null;
  status: string;
  currentUserOrderId: string | null;
  createdAt: string;
  orderDeadline: string | null;
  closedAt: string | null;
  cancelledAt: string | null;
  menuItems: CoffeeRunMenuItem[];
  orders: CoffeeRunOrder[];
}

export interface RunSummaryDetail {
  runId: string;
  grandTotal: number;
  totalItems: number;
  people: PersonSummary[];
  items: ItemSummary[];
}

export interface PersonSummary {
  memberId: string;
  memberName: string;
  total: number;
  itemCount: number;
}

export interface ItemSummary {
  name: string;
  category: string | null;
  totalQuantity: number;
  totalAmount: number;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface OrderItemEntry {
  menuItemId: string;
  quantity: number;
}

export interface CreateMenuItemRequest {
  name: string;
  price: number;
  category?: string;
  maxQuantity?: number;
  sortOrder?: number;
}

export interface UpdateMenuItemRequest {
  name?: string;
  price?: number;
  category?: string;
  maxQuantity?: number;
  isAvailable?: boolean;
  sortOrder?: number;
}

export interface CreateOrderRequest {
  notes?: string;
  items: OrderItemEntry[];
}

export interface UpdateOrderRequest {
  notes?: string;
  items?: OrderItemEntry[];
}

export interface UpdateOrderStatusRequest {
  status: string;
}

export interface CreateRunRequest {
  title?: string;
  description?: string;
  location?: string;
  orderDeadline?: string;
  templateId?: string;
  copyMenuFromRunId?: string;
}

export interface UpdateRunRequest {
  title?: string;
  description?: string;
  location?: string;
  orderDeadline?: string;
}

export interface MenuTemplateList {
  id: string;
  name: string;
  scope: string;
  itemCount: number;
  createdByName: string;
  createdAt: string;
  isArchived: boolean;
}

export interface MenuTemplateDetail {
  id: string;
  name: string;
  scope: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  items: TemplateItem[];
}

export interface CreateMenuTemplateRequest {
  name: string;
  scope?: string;
  copyFromRunId?: string;
  copyFromTemplateId?: string;
}

export interface ImportMenuTemplateRequest {
  name: string;
  items: { name: string; price?: number | null }[];
}

export interface UpdateMenuTemplateRequest {
  name?: string;
  scope?: string;
}

export interface CreateTemplateItemRequest {
  name: string;
  price?: number | null;
  category?: string;
  sortOrder?: number;
}

export interface UpdateTemplateItemRequest {
  name?: string;
  price?: number | null;
  category?: string;
  sortOrder?: number;
}
