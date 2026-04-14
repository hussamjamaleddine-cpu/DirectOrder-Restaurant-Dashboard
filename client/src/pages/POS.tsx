import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { store, MenuItem, Order, OrderItem, Customer } from '@/lib/store';
import { Plus, Minus, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface CartItem extends OrderItem {
  menuItem: MenuItem;
  specialRequest?: string;
}

export default function POS() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderType, setOrderType] = useState<'dinein' | 'takeaway' | 'delivery'>('dinein');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  
  // Delivery-specific fields
  const [deliveryType, setDeliveryType] = useState<'staff' | 'thirdparty'>('staff');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryAssignee, setDeliveryAssignee] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [deliveryCompany, setDeliveryCompany] = useState('');
  
  // Available staff and companies
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);

  useEffect(() => {
    const menuData = store.getMenu();
    const catsData = store.getCategories();
    const staff = store.getStaffMembers().filter(s => s.role === 'delivery' && s.active);
    const comps = store.getCompanies();
    
    setMenu(menuData);
    setCategories(catsData);
    setStaffMembers(staff);
    setCompanies(comps);
    
    if (catsData.length > 0) {
      setSelectedCategory(catsData[0]);
    }
  }, []);

  const filteredMenu = selectedCategory
    ? menu.filter((item) => item.category === selectedCategory && item.status === 'available')
    : menu.filter((item) => item.status === 'available');

  const addToCart = (item: MenuItem) => {
    setCart([
      ...cart,
      {
        menuItemId: item.id,
        name: item.name,
        quantity: 1,
        unitPriceLBP: item.priceLBP,
        unitPriceUSD: item.priceUSD,
        selectedVariant: undefined,
        selectedAddons: [],
        specialRequest: '',
        menuItem: item,
      },
    ]);
  };

  const removeFromCart = (menuItemId: number) => {
    setCart(cart.filter((c) => c.menuItemId !== menuItemId));
  };

  const updateQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter((_, i) => i !== index));
    } else {
      const updated = [...cart];
      updated[index].quantity = quantity;
      setCart(updated);
    }
  };

  const updateVariant = (index: number, variantName: string) => {
    const updated = [...cart];
    const item = updated[index];
    const variant = item.menuItem.variants.find((v) => v.name === variantName);
    const settings = store.getSettings();
    if (variant) {
      item.selectedVariant = variantName;
      item.unitPriceLBP = item.menuItem.priceLBP + variant.extraLBP;
      item.unitPriceUSD = item.unitPriceLBP / settings.exchangeRate;
      setCart(updated);
    }
  };

  const toggleAddon = (index: number, addonName: string) => {
    const updated = [...cart];
    const item = updated[index];
    const addon = item.menuItem.addons.find((a) => a.name === addonName);
    const settings = store.getSettings();
    if (addon) {
      if (item.selectedAddons.includes(addonName)) {
        item.selectedAddons = item.selectedAddons.filter((a) => a !== addonName);
        item.unitPriceLBP -= addon.extraLBP;
      } else {
        item.selectedAddons.push(addonName);
        item.unitPriceLBP += addon.extraLBP;
      }
      item.unitPriceUSD = item.unitPriceLBP / settings.exchangeRate;
      setCart(updated);
    }
  };

  const updateSpecialRequest = (index: number, request: string) => {
    const updated = [...cart];
    updated[index].specialRequest = request;
    setCart(updated);
  };

  const calculateTotals = () => {
    const settings = store.getSettings();
    const subtotalUSD = cart.reduce((sum, item) => sum + item.quantity * item.unitPriceUSD, 0);
    const subtotalLBP = cart.reduce((sum, item) => sum + item.quantity * item.unitPriceLBP, 0);
    
    // Calculate VAT
    const vatUSD = subtotalUSD * (settings.vatPercentage / 100);
    const vatLBP = subtotalLBP * (settings.vatPercentage / 100);
    
    // Calculate totals including VAT
    const totalUSD = subtotalUSD + vatUSD;
    const totalLBP = subtotalLBP + vatLBP;
    
    return { subtotalUSD, subtotalLBP, vatUSD, vatLBP, totalUSD, totalLBP };
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    if (!customerName.trim()) {
      toast.error('Please enter customer name');
      return;
    }
    if (!customerPhone.trim()) {
      toast.error('Please enter customer phone');
      return;
    }

    // Validate delivery fields if delivery order
    if (orderType === 'delivery') {
      if (!deliveryAddress.trim()) {
        toast.error('Please enter delivery address');
        return;
      }
      if (deliveryType === 'staff' && !deliveryAssignee) {
        toast.error('Please select a delivery staff member');
        return;
      }
      if (deliveryType === 'thirdparty' && !deliveryCompany) {
        toast.error('Please select a delivery company');
        return;
      }
    }

    const { subtotalUSD, subtotalLBP, vatUSD, vatLBP, totalUSD, totalLBP } = calculateTotals();
    const orderId = `ORD-${Date.now()}`;

    // Create order with VAT and delivery details
    const newOrder: Order = {
      id: orderId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      type: orderType,
      items: cart.map((c) => ({
        menuItemId: c.menuItemId,
        name: c.name,
        quantity: c.quantity,
        unitPriceLBP: c.unitPriceLBP,
        unitPriceUSD: c.unitPriceUSD,
        selectedVariant: c.selectedVariant,
        selectedAddons: c.selectedAddons,
        specialRequest: c.specialRequest,
      })),
      subtotalLBP,
      subtotalUSD,
      vatLBP,
      vatUSD,
      totalLBP,
      totalUSD,
      status: 'new',
      paymentMethod,
      createdAt: Date.now(),
      ...(orderType === 'delivery' && {
        address: deliveryAddress.trim(),
        deliveryType,
        deliveryAssignee: deliveryType === 'staff' ? deliveryAssignee : undefined,
        deliveryCompany: deliveryType === 'thirdparty' ? deliveryCompany : undefined,
        deliveryPhone: deliveryPhone.trim() || undefined,
        deliveryStatus: 'pending',
      }),
    };

    // Save order
    const orders = store.getOrders();
    store.setOrders([...orders, newOrder]);

    // Add/update customer
    const customers = store.getCustomers();
    const existingCustomer = customers.find((c) => c.phone === customerPhone.trim());
    if (existingCustomer) {
      existingCustomer.totalOrders += 1;
      existingCustomer.totalSpentLBP += totalLBP;
      existingCustomer.lastOrderAt = Date.now();
    } else {
      customers.push({
        id: `CUST-${Date.now()}`,
        name: customerName.trim(),
        phone: customerPhone.trim(),
        totalOrders: 1,
        totalSpentLBP: totalLBP,
        lastOrderAt: Date.now(),
        color: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'][Math.floor(Math.random() * 5)],
        loyaltyPoints: 0,
        loyaltyTier: 'bronze',
        joinedAt: Date.now(),
      });
    }
    store.setCustomers(customers);

    toast.success(`Order ${orderId} created!`);
    
    // Reset form
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setOrderType('dinein');
    setPaymentMethod('cash');
    setDeliveryAddress('');
    setDeliveryAssignee('');
    setDeliveryPhone('');
    setDeliveryCompany('');
    setDeliveryType('staff');
  };

  const { subtotalUSD, subtotalLBP, vatUSD, vatLBP, totalUSD, totalLBP } = calculateTotals();
  const settings = store.getSettings();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Menu Section */}
      <div className="lg:col-span-2 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Select Items</h3>
          
          {/* Category Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Menu Items Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filteredMenu.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No items available</p>
              </div>
            ) : (
              filteredMenu.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="p-3 bg-white border-2 border-gray-200 rounded-lg hover:border-emerald-500 hover:shadow-md transition-all text-left"
                >
                  <div className="text-2xl mb-1">{item.emoji || '🍽️'}</div>
                  <p className="font-semibold text-sm text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs text-emerald-600 font-mono font-bold">
                    ${item.priceUSD.toFixed(2)}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Cart Section */}
      <div className="lg:col-span-1 space-y-4">
        <Card className="border-0 shadow-sm sticky top-4 max-h-[90vh] overflow-y-auto">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">🛒 Cart ({cart.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Customer Info */}
            <div className="space-y-2">
              <Input
                placeholder="Customer name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
              <Input
                placeholder="Phone number"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>

            {/* Order Type */}
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase block mb-2">
                Order Type
              </label>
              <div className="flex gap-2">
                {(['dinein', 'takeaway', 'delivery'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setOrderType(type)}
                    className={`flex-1 py-2 px-2 rounded text-xs font-semibold transition-colors ${
                      orderType === type
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {type === 'dinein' ? '🪑' : type === 'takeaway' ? '📦' : '🚗'}
                    <span className="block text-xs mt-1">{type}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Delivery Options (shown only when delivery is selected) */}
            {orderType === 'delivery' && (
              <div className="border-t pt-3 space-y-3 bg-blue-50 p-3 rounded">
                <h4 className="font-semibold text-sm text-gray-900">🚚 Delivery Details</h4>
                
                {/* Delivery Address */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Address *</label>
                  <Input
                    placeholder="Enter delivery address"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="text-sm"
                  />
                </div>

                {/* Delivery Type Selection */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-2">Delivery By *</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDeliveryType('staff')}
                      className={`flex-1 py-2 px-2 rounded text-xs font-semibold transition-colors ${
                        deliveryType === 'staff'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300'
                      }`}
                    >
                      👤 Staff
                    </button>
                    <button
                      onClick={() => setDeliveryType('thirdparty')}
                      className={`flex-1 py-2 px-2 rounded text-xs font-semibold transition-colors ${
                        deliveryType === 'thirdparty'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300'
                      }`}
                    >
                      🏢 Third-Party
                    </button>
                  </div>
                </div>

                {/* Staff Selection */}
                {deliveryType === 'staff' && (
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Select Driver *</label>
                    <select
                      value={deliveryAssignee}
                      onChange={(e) => setDeliveryAssignee(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    >
                      <option value="">-- Choose a driver --</option>
                      {staffMembers.map((staff) => (
                        <option key={staff.id} value={staff.name}>
                          {staff.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Third-Party Company Selection */}
                {deliveryType === 'thirdparty' && (
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Select Company *</label>
                    <select
                      value={deliveryCompany}
                      onChange={(e) => setDeliveryCompany(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    >
                      <option value="">-- Choose a company --</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.name}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Optional Delivery Phone */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Phone (Optional)</label>
                  <Input
                    placeholder="Delivery contact phone"
                    value={deliveryPhone}
                    onChange={(e) => setDeliveryPhone(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
            )}

            {/* Cart Items */}
            <div className="border-t pt-3 max-h-96 overflow-y-auto space-y-3">
              {cart.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">Cart is empty</p>
              ) : (
                cart.map((item, idx) => (
                  <div key={idx} className="space-y-2 p-2 bg-gray-50 rounded border border-gray-100">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">{item.name}</p>
                        <p className="text-xs text-emerald-600 font-mono">
                          ${(item.quantity * item.unitPriceUSD).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQuantity(idx, item.quantity - 1)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-semibold w-5 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(idx, item.quantity + 1)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => updateQuantity(idx, 0)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Customization Controls */}
                    <div className="space-y-2 pl-1 border-l-2 border-emerald-200">
                      {item.menuItem.variants.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.menuItem.variants.map((v) => (
                            <button
                              key={v.name}
                              onClick={() => updateVariant(idx, v.name)}
                              className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                item.selectedVariant === v.name
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-white text-gray-600 border-gray-300'
                              }`}
                            >
                              {v.name}
                            </button>
                          ))}
                        </div>
                      )}
                      
                      {item.menuItem.addons.length > 0 && settings.enableAddons && (
                        <div className="flex flex-wrap gap-1">
                          {item.menuItem.addons.map((a) => (
                            <button
                              key={a.name}
                              onClick={() => toggleAddon(idx, a.name)}
                              className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                item.selectedAddons.includes(a.name)
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white text-gray-600 border-gray-300'
                              }`}
                            >
                              + {a.name}
                            </button>
                          ))}
                        </div>
                      )}

                      {settings.enableSpecialRequests && (
                        <input
                          type="text"
                          placeholder="Special request..."
                          value={item.specialRequest || ''}
                          onChange={(e) => updateSpecialRequest(idx, e.target.value)}
                          className="w-full text-[10px] px-2 py-1 border border-gray-200 rounded bg-white"
                        />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Totals */}
            <div className="border-t pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-mono font-semibold">${subtotalUSD.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">VAT ({settings.vatPercentage}%):</span>
                <span className="font-mono font-semibold text-blue-600">
                  ${vatUSD.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span className="font-mono text-emerald-600">
                  ${totalUSD.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-gray-600 text-center">
                {totalLBP.toLocaleString('en-US', { maximumFractionDigits: 0 })} LBP
              </p>
            </div>

            {/* Payment Method */}
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase block mb-2">
                Payment
              </label>
              <div className="flex gap-2">
                {(['cash', 'card'] as const).map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`flex-1 py-2 px-2 rounded text-xs font-semibold transition-colors ${
                      paymentMethod === method
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {method === 'cash' ? '💵' : '💳'} {method}
                  </button>
                ))}
              </div>
            </div>

            {/* Checkout Button */}
            <Button
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3"
            >
              ✓ Checkout
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
