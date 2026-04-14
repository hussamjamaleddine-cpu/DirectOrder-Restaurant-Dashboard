import { useState, useEffect } from 'react';
import { store, MenuItem } from '@/lib/store';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, X } from 'lucide-react';

interface CartItem {
  menuItemId: number;
  name: string;
  quantity: number;
  price: number;
  selectedVariant?: string;
  selectedAddons: string[];
  specialRequest: string;
}

export default function CustomerOrder() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [expandedCartItem, setExpandedCartItem] = useState<number | null>(null);
  const settings = store.getSettings();

  useEffect(() => {
    const menuData = store.getMenu();
    const catsData = store.getCategories();
    setMenu(menuData);
    setCategories(catsData);
    if (catsData.length > 0) {
      setSelectedCategory(catsData[0]);
    }
  }, []);

  const filteredMenu = selectedCategory
    ? menu.filter((item) => item.category === selectedCategory && item.status === 'available')
    : [];

  const getMenuItemById = (id: number) => menu.find((m) => m.id === id);

  const addToCart = (item: MenuItem) => {
    const newItem: CartItem = {
      menuItemId: item.id,
      name: item.name,
      quantity: 1,
      price: item.priceLBP,
      selectedVariant: undefined,
      selectedAddons: [],
      specialRequest: '',
    };
    setCart([...cart, newItem]);
    toast.success(`${item.name} added to cart`);
  };

  const updateQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(index);
    } else {
      const updated = [...cart];
      updated[index].quantity = quantity;
      setCart(updated);
    }
  };

  const updateVariant = (index: number, variant: string) => {
    const updated = [...cart];
    const menuItem = getMenuItemById(updated[index].menuItemId);
    if (menuItem) {
      const variantData = menuItem.variants.find((v) => v.name === variant);
      if (variantData) {
        updated[index].selectedVariant = variant;
        updated[index].price = menuItem.priceLBP + variantData.extraLBP;
      }
    }
    setCart(updated);
  };

  const toggleAddon = (index: number, addonName: string) => {
    const updated = [...cart];
    const menuItem = getMenuItemById(updated[index].menuItemId);
    if (menuItem) {
      const addonData = menuItem.addons.find((a) => a.name === addonName);
      if (addonData) {
        if (updated[index].selectedAddons.includes(addonName)) {
          updated[index].selectedAddons = updated[index].selectedAddons.filter((a) => a !== addonName);
          updated[index].price -= addonData.extraLBP;
        } else {
          updated[index].selectedAddons.push(addonName);
          updated[index].price += addonData.extraLBP;
        }
      }
    }
    setCart(updated);
  };

  const updateSpecialRequest = (index: number, request: string) => {
    const updated = [...cart];
    updated[index].specialRequest = request;
    setCart(updated);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const canShowCustomization = (menuItem: MenuItem | undefined) => {
    if (!menuItem) return false;
    const hasVariants = menuItem.variants.length > 0;
    const hasAddons = menuItem.addons.length > 0 && settings.enableAddons && (menuItem.allowAddons !== false);
    const canHaveSpecialRequest = settings.enableSpecialRequests && (menuItem.allowSpecialRequests !== false);
    return hasVariants || hasAddons || canHaveSpecialRequest;
  };

  const subtotalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const vatAmount = subtotalPrice * (settings.vatPercentage / 100);
  const totalPrice = subtotalPrice + vatAmount;
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handlePlaceOrder = () => {
    if (!customerName.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (!customerPhone.trim()) {
      toast.error('Please enter your phone number');
      return;
    }
    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    // Create order message
    const orderItems = cart
      .map((item) => {
        let itemStr = `${item.quantity}x ${item.name}`;
        if (item.selectedVariant) {
          itemStr += ` (${item.selectedVariant})`;
        }
        if (item.selectedAddons.length > 0) {
          itemStr += ` + ${item.selectedAddons.join(', ')}`;
        }
        if (item.specialRequest) {
          itemStr += ` [${item.specialRequest}]`;
        }
        return itemStr;
      })
      .join('\n');

    const message = `
🍽️ *New Order from DirectOrder*

*Customer:* ${customerName}
*Phone:* ${customerPhone}

*Items:*
${orderItems}

*Total:* ${totalPrice.toLocaleString()} LBP

Please confirm this order!
    `.trim();

    const encodedMsg = encodeURIComponent(message);
    const restaurantPhone = settings.phone || '9611234567';
    const phone = restaurantPhone.replace(/\D/g, '');

    // Open WhatsApp
    window.open(`https://wa.me/${phone}?text=${encodedMsg}`, '_blank');

    // Save order to dashboard with VAT
    const orders = store.getOrders();
    const subtotalLBP = subtotalPrice;
    const subtotalUSD = subtotalLBP / settings.exchangeRate;
    const vatLBP = subtotalLBP * (settings.vatPercentage / 100);
    const vatUSD = subtotalUSD * (settings.vatPercentage / 100);
    const totalLBP = subtotalLBP + vatLBP;
    const totalUSD = subtotalUSD + vatUSD;
    
    const newOrder = {
      id: `ORD-${Date.now()}`,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      type: 'delivery' as const,
      items: cart.map((c) => ({
        menuItemId: c.menuItemId,
        name: c.name,
        quantity: c.quantity,
        unitPriceLBP: c.price / c.quantity,
        unitPriceUSD: (c.price / c.quantity) / settings.exchangeRate,
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
      status: 'new' as const,
      paymentMethod: 'cash' as const,
      createdAt: Date.now(),
    };
    store.setOrders([...orders, newOrder]);

    setOrderPlaced(true);
    setTimeout(() => {
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setOrderPlaced(false);
    }, 3000);
  };

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Order Placed!</h2>
          <p className="text-gray-600 mb-4">
            Your order has been sent to the {settings.businessType === 'restaurant' ? 'restaurant' : 'business'} via WhatsApp.
          </p>
          <p className="text-sm text-gray-500">
            You'll receive a confirmation shortly. Thank you!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 pb-32">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🍽️ {settings.name}</h1>
            <p className="text-sm text-gray-600">Order Online</p>
          </div>
          <button
            onClick={() => setShowCart(true)}
            className="relative px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-semibold transition-colors"
          >
            🛒 Cart
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-r from-amber-800 to-orange-700 text-white py-8 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-2">{settings.name}</h2>
          <p className="text-amber-100 mb-4">{settings.address || 'Order Online'}</p>
          <div className="flex justify-center gap-6 text-sm">
            <span>📱 Easy Ordering</span>
            <span>💳 Multiple Payment</span>
            <span>🚚 Fast Delivery</span>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="sticky top-16 z-40 bg-white border-b border-gray-200 overflow-x-auto">
        <div className="max-w-2xl mx-auto flex gap-2 px-4 py-3">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {filteredMenu.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No items available in this category</p>
          </div>
        ) : (
          filteredMenu.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex gap-4">
                <div className="text-4xl">{item.emoji || '🍽️'}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900">{item.name}</h3>
                    {item.status === '86' && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                        Out of Stock
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                  )}
                  <p className="font-bold text-emerald-600">
                    {item.priceLBP.toLocaleString()} LBP
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={() => addToCart(item)}
                  className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-full font-semibold transition-colors"
                >
                  + Add
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cart Drawer */}
      {showCart && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50">
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Your Order</h2>
              <button
                onClick={() => setShowCart(false)}
                className="text-2xl text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="p-4 space-y-4">
              {cart.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Your cart is empty</p>
              ) : (
                <>
                  {cart.map((item, index) => {
                    const menuItem = getMenuItemById(item.menuItemId);
                    const isExpanded = expandedCartItem === index;
                    const showCustomizeButton = canShowCustomization(menuItem);

                    return (
                      <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* Cart Item Header */}
                        <div className="p-4 bg-gray-50">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-bold text-gray-900">{item.name}</p>
                              {item.selectedVariant && (
                                <p className="text-xs text-gray-600">Variant: {item.selectedVariant}</p>
                              )}
                              {item.selectedAddons.length > 0 && (
                                <p className="text-xs text-emerald-600">+{item.selectedAddons.join(', ')}</p>
                              )}
                              {item.specialRequest && (
                                <p className="text-xs text-blue-600 italic">"{item.specialRequest}"</p>
                              )}
                            </div>
                            <button
                              onClick={() => removeFromCart(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="flex justify-between items-center">
                            <p className="text-sm text-emerald-600 font-mono font-bold">
                              {(item.price * item.quantity).toLocaleString()} LBP
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateQuantity(index, item.quantity - 1)}
                                className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                              >
                                −
                              </button>
                              <span className="w-6 text-center font-bold">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(index, item.quantity + 1)}
                                className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Expandable Options */}
                        {showCustomizeButton && (
                          <>
                            <button
                              onClick={() => setExpandedCartItem(isExpanded ? null : index)}
                              className="w-full p-3 flex items-center justify-between bg-white hover:bg-gray-50 border-t border-gray-200 text-sm font-semibold text-gray-700"
                            >
                              <span>⚙️ Customize</span>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>

                            {isExpanded && menuItem && (
                              <div className="p-4 bg-blue-50 space-y-4 border-t border-gray-200">
                                {/* Variants */}
                                {menuItem.variants.length > 0 && (
                                  <div>
                                    <p className="text-xs font-bold text-gray-700 uppercase mb-2">Variants</p>
                                    <div className="space-y-2">
                                      {menuItem.variants.map((variant) => (
                                        <label key={variant.name} className="flex items-center gap-2 cursor-pointer">
                                          <input
                                            type="radio"
                                            name={`variant-${index}`}
                                            checked={item.selectedVariant === variant.name}
                                            onChange={() => updateVariant(index, variant.name)}
                                            className="w-4 h-4"
                                          />
                                          <span className="text-sm text-gray-700">
                                            {variant.name} (+{variant.extraLBP.toLocaleString()} LBP)
                                          </span>
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Add-ons */}
                                {menuItem.addons.length > 0 && settings.enableAddons && menuItem.allowAddons !== false && (
                                  <div>
                                    <p className="text-xs font-bold text-gray-700 uppercase mb-2">Add-ons</p>
                                    <div className="space-y-2">
                                      {menuItem.addons.map((addon) => (
                                        <label key={addon.name} className="flex items-center gap-2 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={item.selectedAddons.includes(addon.name)}
                                            onChange={() => toggleAddon(index, addon.name)}
                                            className="w-4 h-4"
                                          />
                                          <span className="text-sm text-gray-700">
                                            {addon.name} (+{addon.extraLBP.toLocaleString()} LBP)
                                          </span>
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Special Request */}
                                {settings.enableSpecialRequests && menuItem.allowSpecialRequests !== false && (
                                  <div>
                                    <p className="text-xs font-bold text-gray-700 uppercase mb-2">Special Request</p>
                                    <textarea
                                      value={item.specialRequest}
                                      onChange={(e) => updateSpecialRequest(index, e.target.value)}
                                      placeholder="e.g. extra sauce, no onions, well done..."
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                      rows={2}
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}

                  <div className="border-t border-gray-200 pt-4">
                    <div className="mb-4 space-y-2">
                      <input
                        type="text"
                        placeholder="Your name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <input
                        type="tel"
                        placeholder="Your phone"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div className="space-y-2 mb-4 pb-3 border-b border-gray-200">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-mono">{subtotalPrice.toLocaleString()} LBP</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">VAT ({settings.vatPercentage}%):</span>
                        <span className="font-mono text-blue-600">{Math.round(vatAmount).toLocaleString()} LBP</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span className="text-emerald-600">{Math.round(totalPrice).toLocaleString()} LBP</span>
                      </div>
                    </div>

                    <button
                      onClick={handlePlaceOrder}
                      className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      💬 Order via WhatsApp
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
