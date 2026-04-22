import React, { useState, useEffect, useMemo } from 'react';
import { db, handleFirestoreError, OperationType } from './firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, limit, onSnapshot, setDoc } from 'firebase/firestore';
import { 
  Users, 
  ShoppingBag, 
  Activity, 
  BarChart3, 
  ShoppingCart, 
  Heart, 
  Package, 
  LogOut, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  ChevronRight,
  User,
  Clock,
  Eye,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Menu,
  X
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// --- Types ---
interface Product {
  id: string;
  name: string;
  price: string;
  priceNum: number;
  img: string;
}

interface ActivityLog {
  type: 'page_view' | 'product_view' | 'add_to_cart' | 'search' | 'login' | 'logout' | 'wishlist_add';
  userId?: string;
  userName?: string;
  details?: string;
  timestamp: string;
}

interface Order {
  id: string;
  date: string;
  items: any[];
  total: number;
  status: 'completed' | 'cancelled' | 'pending' | 'failed';
  customerName: string;
  customerPhone: string;
  customerAddress: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  regDate: string;
  lastLogin: string;
  status: 'active' | 'blocked';
  orders: Order[];
  cart: any[];
  wishlist: any[];
}

// --- Admin Panel Component ---
export const AdminPanel = ({ onLogout, onBackToStore }: { onLogout: () => void, onBackToStore: () => void }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Product Form State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productForm, setProductForm] = useState({ name: '', price: '', priceNum: 0, img: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Products
      const productsRef = collection(db, 'products');
      let productsSnap;
      try {
        productsSnap = await getDocs(productsRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'products');
        return;
      }
      const prodData = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
      
      // 2. Fetch Activities
      const activitiesRef = collection(db, 'activities');
      let activitiesSnap;
      try {
        activitiesSnap = await getDocs(activitiesRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'activities');
        return;
      }
      const actData = activitiesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ActivityLog[];
      
      // 3. Fetch Orders
      const ordersRef = collection(db, 'orders');
      let ordersSnap;
      try {
        ordersSnap = await getDocs(ordersRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'orders');
        return;
      }
      const ordData = ordersSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          date: data.createdAt || data.date,
          items: data.items || [],
          total: data.totalAmount || data.total || 0,
          status: data.status || 'pending',
          customerName: data.name || data.customerName || 'Unknown',
          customerPhone: data.phone || data.customerPhone || 'Unknown',
          customerAddress: data.address || data.customerAddress || 'Unknown'
        };
      }) as Order[];
      
      setProducts(prodData);
      setActivities(actData);
      setOrders(ordData);

      // Derive customers from orders and activities
      const customerMap = new Map();
      ordData.forEach((o: Order) => {
        if (!customerMap.has(o.customerPhone)) {
          customerMap.set(o.customerPhone, {
            id: o.customerPhone,
            name: o.customerName,
            email: `${o.customerName.toLowerCase().replace(/ /g, '.')}@example.com`,
            phone: o.customerPhone,
            address: o.customerAddress,
            regDate: o.date,
            lastLogin: o.date,
            status: 'active',
            orders: [],
            cart: [],
            wishlist: []
          });
        }
        customerMap.get(o.customerPhone).orders.push(o);
      });
      setCustomers(Array.from(customerMap.values()));

    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Product Actions ---
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingProduct) {
        // Update existing product
        const productRef = doc(db, 'products', editingProduct.id);
        try {
          await updateDoc(productRef, productForm);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `products/${editingProduct.id}`);
        }
      } else {
        // Create new product
        try {
          await addDoc(collection(db, 'products'), productForm);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'products');
        }
      }
      
      fetchData();
      setIsProductModalOpen(false);
      setEditingProduct(null);
      setProductForm({ name: '', price: '', priceNum: 0, img: '' });
    } catch (error) {
      console.error("Error saving product:", error);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      try {
        await deleteDoc(doc(db, 'products', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
      }
      fetchData();
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  };

  // --- Stats Calculations ---
  const stats = useMemo(() => {
    const totalRevenue = orders.reduce((acc, o) => acc + (o.status === 'completed' ? o.total : 0), 0);
    const completedOrders = orders.filter(o => o.status === 'completed').length;
    const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
    const activeCustomers = customers.length;
    
    // Calculate growth based on orders in the last 7 days vs previous 7 days
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const recentOrders = orders.filter(o => new Date(o.date) >= sevenDaysAgo && o.status === 'completed');
    const previousOrders = orders.filter(o => new Date(o.date) >= fourteenDaysAgo && new Date(o.date) < sevenDaysAgo && o.status === 'completed');

    const recentRevenue = recentOrders.reduce((acc, o) => acc + o.total, 0);
    const previousRevenue = previousOrders.reduce((acc, o) => acc + o.total, 0);

    const growth = previousRevenue === 0 ? 100 : ((recentRevenue - previousRevenue) / previousRevenue) * 100;

    return {
      revenue: totalRevenue,
      orders: completedOrders,
      cancelled: cancelledOrders,
      customers: activeCustomers,
      growth: growth.toFixed(1)
    };
  }, [orders, customers]);

  const chartData = useMemo(() => {
    // Generate daily data for the last 7 days from real orders
    const days = Array.from({ length: 7 }).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    });

    return days.map(day => {
      const dayOrders = orders.filter(o => new Date(o.date).toLocaleDateString('en-US', { weekday: 'short' }) === day && o.status === 'completed');
      const dayRevenue = dayOrders.reduce((acc, o) => acc + o.total, 0);
      const dayCustomers = new Set(dayOrders.map(o => o.customerPhone)).size;
      
      return {
        name: day,
        sales: dayRevenue,
        customers: dayCustomers
      };
    });
  }, [orders]);

  const abandonedCarts = useMemo(() => {
    // Look for checkout_start without order_placed (simplified)
    const checkouts = activities.filter(a => a.type === 'checkout_start' as any);
    return checkouts.map(c => ({
      id: Math.random().toString(36).substr(2, 9),
      time: c.timestamp,
      details: c.details,
      userName: c.userName || 'Guest'
    })).reverse();
  }, [activities]);

  const wishlistInsights = useMemo(() => {
    const wishlistAdds = activities.filter(a => a.type === 'wishlist_add' as any);
    const counts: Record<string, number> = {};
    wishlistAdds.forEach(a => {
      const productName = a.details?.replace('Added product ', '').replace(' to wishlist', '') || 'Unknown';
      counts[productName] = (counts[productName] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [activities]);

  const consumerInsights = useMemo(() => {
    const topSpenders = [...customers]
      .map(c => ({
        ...c,
        totalSpent: c.orders.reduce((acc, o) => acc + o.total, 0),
        orderCount: c.orders.length
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    const activityByHour = Array.from({ length: 24 }).map((_, i) => ({
      hour: `${i}:00`,
      count: activities.filter(a => new Date(a.timestamp).getHours() === i).length
    }));

    const popularProducts = [...products]
      .map(p => ({
        ...p,
        viewCount: activities.filter(a => a.type === 'product_view' as any && a.details?.includes(p.name)).length,
        orderCount: orders.filter(o => o.items.some(item => item.name === p.name)).length
      }))
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 5);

    return { topSpenders, activityByHour, popularProducts };
  }, [customers, activities, products, orders]);

  const recentCancellations = useMemo(() => {
    return activities.filter(a => a.type === 'order_cancel' as any).reverse();
  }, [activities]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-brand"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-brand rounded-lg flex items-center justify-center text-white">
            <Package size={18} />
          </div>
          <span className="font-bold text-lg text-primary-brand">FreshFarm Admin</span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 flex flex-col z-50 transition-transform duration-300 md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-gray-200 hidden md:block">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-brand rounded-lg flex items-center justify-center text-white">
              <Package size={20} />
            </div>
            <span className="font-bold text-xl text-primary-brand">FreshFarm Admin</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {[
            { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
            { id: 'customers', icon: Users, label: 'Customers' },
            { id: 'monitoring', icon: Eye, label: 'Consumer Monitoring' },
            { id: 'orders', icon: ShoppingBag, label: 'Orders' },
            { id: 'products', icon: Package, label: 'Products' },
            { id: 'activity', icon: Activity, label: 'Activity' },
            { id: 'cart', icon: ShoppingCart, label: 'Abandoned Carts' },
            { id: 'wishlist', icon: Heart, label: 'Wishlist' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id 
                  ? 'bg-primary-brand text-white shadow-lg shadow-primary-brand/20' 
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all font-medium"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
          <button 
            onClick={onBackToStore}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 transition-all font-medium mt-2"
          >
            <ShoppingBag size={20} />
            <span>Back to Store</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 capitalize">{activeTab}</h1>
            <p className="text-gray-500">Welcome back, Admin!</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 md:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search..." 
                className="w-full md:w-64 pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-brand/20"
              />
            </div>
            <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-white shadow-sm overflow-hidden flex-shrink-0">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Kishore" alt="Admin" />
            </div>
          </div>
        </header>

        {/* Tab Content */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Revenue', value: `₹${stats.revenue}`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100', trend: '+12%' },
                { label: 'Completed Orders', value: stats.orders, icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-100', trend: '+5%' },
                { label: 'Total Customers', value: stats.customers, icon: Users, color: 'text-purple-600', bg: 'bg-purple-100', trend: '+8%' },
                { label: 'Cancelled Orders', value: stats.cancelled, icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', trend: '-2%' },
              ].map((stat, i) => (
                <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                      <stat.icon size={24} />
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${stat.trend.startsWith('+') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                      {stat.trend}
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm font-medium">{stat.label}</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</h3>
                </div>
              ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-gray-900">Sales Overview</h3>
                  <select className="text-sm border-none bg-gray-50 rounded-lg px-2 py-1 focus:ring-0">
                    <option>Last 7 Days</option>
                    <option>Last 30 Days</option>
                  </select>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#4CAF50" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                      <Tooltip 
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                      />
                      <Area type="monotone" dataKey="sales" stroke="#4CAF50" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-6">Customer Growth</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                      <Tooltip 
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                        cursor={{fill: '#f9fafb'}}
                      />
                      <Bar dataKey="customers" fill="#8B5CF6" radius={[4, 4, 0, 0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Recent Activity & Orders */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                  <h3 className="font-bold text-gray-900">Recent Orders</h3>
                  <button className="text-primary-brand text-sm font-bold hover:underline">View All</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                        <th className="px-6 py-4 font-bold">Order ID</th>
                        <th className="px-6 py-4 font-bold">Customer</th>
                        <th className="px-6 py-4 font-bold">Status</th>
                        <th className="px-6 py-4 font-bold">Amount</th>
                        <th className="px-6 py-4 font-bold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {orders.slice(0, 5).map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-gray-900">#{order.id}</td>
                          <td className="px-6 py-4 text-gray-600">{order.customerName}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                              order.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-gray-900">₹{order.total}</td>
                          <td className="px-6 py-4">
                            <button className="text-gray-400 hover:text-primary-brand">
                              <ChevronRight size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50">
                  <h3 className="font-bold text-gray-900">Live Activity</h3>
                </div>
                <div className="p-6 space-y-6">
                  {activities.slice(-5).reverse().map((log, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                        {log.type === 'login' ? <User size={18} /> : <Eye size={18} />}
                      </div>
                      <div>
                        <p className="text-sm text-gray-900 font-medium">
                          <span className="font-bold">{log.userName || 'Guest'}</span> {log.details || 'visited the site'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">{new Date(log.timestamp).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Cancellations Widget */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                  <h3 className="font-bold text-gray-900">Recent Cancellations</h3>
                  <XCircle className="text-red-500" size={20} />
                </div>
                <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
                  {recentCancellations.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm italic">No recent cancellations</div>
                  ) : (
                    recentCancellations.slice(0, 5).map((cancel, i) => (
                      <div key={i} className="p-3 bg-red-50 rounded-xl border border-red-100">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Cancelled</span>
                          <span className="text-[10px] text-gray-400">{new Date(cancel.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-xs font-bold text-gray-900">{cancel.userName || 'Guest'}</p>
                        <p className="text-[10px] text-gray-600 mt-1">{cancel.details}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-xl text-gray-900">Manage Inventory</h3>
              <button 
                onClick={() => {
                  setEditingProduct(null);
                  setProductForm({ name: '', price: '', priceNum: 0, img: '' });
                  setIsProductModalOpen(true);
                }}
                className="bg-primary-brand text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-black transition-all shadow-lg shadow-primary-brand/20"
              >
                <Plus size={18} /> Add New Product
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <div key={product.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group">
                  <div className="aspect-video relative overflow-hidden">
                    <img src={product.img} alt={product.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    <div className="absolute top-3 right-3 flex gap-2">
                      <button 
                        onClick={() => {
                          setEditingProduct(product);
                          setProductForm({ ...product });
                          setIsProductModalOpen(true);
                        }}
                        className="w-8 h-8 bg-white/90 backdrop-blur rounded-lg flex items-center justify-center text-blue-600 shadow-sm hover:bg-blue-600 hover:text-white transition-all"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteProduct(product.id)}
                        className="w-8 h-8 bg-white/90 backdrop-blur rounded-lg flex items-center justify-center text-red-600 shadow-sm hover:bg-red-600 hover:text-white transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="p-5">
                    <h4 className="font-bold text-gray-900">{product.name}</h4>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-primary-brand font-black">{product.price}</span>
                      <span className="text-xs text-gray-400">ID: #{product.id}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'monitoring' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Top Spenders */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <TrendingUp className="text-green-500" size={20} />
                  Top Spenders
                </h3>
                <div className="space-y-4">
                  {consumerInsights.topSpenders.map((customer, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-brand/10 flex items-center justify-center text-primary-brand font-bold">
                          {customer.name[0]}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{customer.name}</p>
                          <p className="text-xs text-gray-500">{customer.phone}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary-brand">₹{customer.totalSpent}</p>
                        <p className="text-xs text-gray-500">{customer.orderCount} orders</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity Heatmap */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Clock className="text-blue-500" size={20} />
                  Activity by Hour
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={consumerInsights.activityByHour}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10}} />
                      <Tooltip />
                      <Area type="monotone" dataKey="count" stroke="#3B82F6" fill="#DBEAFE" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Popular Products Insights */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                <ShoppingBag className="text-purple-500" size={20} />
                Product Performance
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-gray-400 text-sm uppercase tracking-wider">
                      <th className="pb-4 font-medium">Product</th>
                      <th className="pb-4 font-medium">Views</th>
                      <th className="pb-4 font-medium">Orders</th>
                      <th className="pb-4 font-medium">Conversion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {consumerInsights.popularProducts.map((product, i) => (
                      <tr key={i} className="group hover:bg-gray-50 transition-colors">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <img src={product.img} className="w-10 h-10 rounded-lg object-cover" alt="" />
                            <span className="font-bold text-gray-900">{product.name}</span>
                          </div>
                        </td>
                        <td className="py-4 text-gray-600">{product.viewCount}</td>
                        <td className="py-4 text-gray-600">{product.orderCount}</td>
                        <td className="py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary-brand" 
                                style={{ width: `${(product.orderCount / (product.viewCount || 1) * 100).toFixed(0)}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-gray-500">
                              {(product.orderCount / (product.viewCount || 1) * 100).toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'customers' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50">
              <h3 className="font-bold text-gray-900">Customer Directory</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-6 py-4 font-bold">Customer</th>
                    <th className="px-6 py-4 font-bold">Contact</th>
                    <th className="px-6 py-4 font-bold">Location</th>
                    <th className="px-6 py-4 font-bold">Orders</th>
                    <th className="px-6 py-4 font-bold">Status</th>
                    <th className="px-6 py-4 font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-brand/10 text-primary-brand flex items-center justify-center font-bold">
                            {customer.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{customer.name}</p>
                            <p className="text-xs text-gray-400">Joined {new Date(customer.regDate).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600">{customer.email}</p>
                        <p className="text-xs text-gray-400">{customer.phone}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                        {customer.address}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-gray-900">{customer.orders.length}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                          customer.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                        }`}>
                          {customer.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button className="text-primary-brand font-bold text-xs hover:underline">Details</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-900">All Orders</h3>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-bold uppercase">Completed: {orders.filter(o => o.status === 'completed').length}</span>
                <span className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-bold uppercase">Cancelled: {orders.filter(o => o.status === 'cancelled').length}</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-6 py-4 font-bold">Order ID</th>
                    <th className="px-6 py-4 font-bold">Date</th>
                    <th className="px-6 py-4 font-bold">Customer</th>
                    <th className="px-6 py-4 font-bold">Items</th>
                    <th className="px-6 py-4 font-bold">Total</th>
                    <th className="px-6 py-4 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {orders.slice().reverse().map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">#{order.id}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{new Date(order.date).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900">{order.customerName}</p>
                        <p className="text-xs text-gray-400">{order.customerPhone}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {order.items.length} items
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900">₹{order.total}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                          order.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50">
              <h3 className="font-bold text-gray-900">Full Activity Log</h3>
            </div>
            <div className="p-6 space-y-4">
              {activities.slice().reverse().map((log, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${
                      log.type === 'add_to_cart' ? 'bg-blue-500' : 
                      log.type === 'checkout_start' as any ? 'bg-orange-500' :
                      log.type === 'wishlist_add' ? 'bg-red-500' : 
                      log.type === 'order_cancel' as any ? 'bg-red-600' : 'bg-gray-400'
                    }`}>
                      {log.type === 'add_to_cart' ? <ShoppingCart size={18} /> : 
                       log.type === 'checkout_start' as any ? <ShoppingBag size={18} /> :
                       log.type === 'wishlist_add' ? <Heart size={18} /> : 
                       log.type === 'order_cancel' as any ? <XCircle size={18} /> : <Eye size={18} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{log.userName || 'Guest User'}</p>
                      <p className="text-xs text-gray-500">{log.details}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{new Date(log.timestamp).toLocaleTimeString()}</p>
                    <p className="text-[10px] text-gray-300">{new Date(log.timestamp).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'cart' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-50">
                <h3 className="font-bold text-gray-900">Abandoned Checkout Attempts</h3>
                <p className="text-xs text-gray-400 mt-1">Users who reached the checkout page but didn't complete payment</p>
              </div>
              <div className="p-6 space-y-4">
                {abandonedCarts.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">No abandoned carts found</div>
                ) : (
                  abandonedCarts.map((cart, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 md:p-6 bg-orange-50/50 rounded-2xl border border-orange-100 gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center shrink-0">
                          <ShoppingCart size={24} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{cart.userName}</p>
                          <p className="text-sm text-gray-600">{cart.details}</p>
                          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                            <Clock size={12} /> {new Date(cart.time).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <button className="bg-white text-orange-600 px-4 py-2 rounded-lg text-xs font-bold border border-orange-200 hover:bg-orange-600 hover:text-white transition-all w-full sm:w-auto">
                        Send Reminder
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'wishlist' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-50">
                <h3 className="font-bold text-gray-900">Most Wishlisted Products</h3>
              </div>
              <div className="p-6 space-y-4">
                {wishlistInsights.map((item, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-xl gap-2">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-red-100 text-red-500 rounded-lg flex items-center justify-center font-bold shrink-0">
                        {i + 1}
                      </div>
                      <span className="font-bold text-gray-900">{item.name}</span>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-2">
                      <Heart size={16} className="text-red-500 fill-red-500" />
                      <span className="font-black text-primary-brand">{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
                <TrendingUp size={40} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Wishlist Conversion</h3>
              <p className="text-gray-500 text-sm mb-6">Analyze how many wishlisted items eventually turn into orders.</p>
              <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden">
                <div className="bg-primary-brand h-full w-[35%]" />
              </div>
              <p className="text-xs font-bold text-primary-brand mt-3">35% Conversion Rate</p>
            </div>
          </div>
        )}
      </main>

      {/* Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-2xl font-bold text-gray-900">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <button onClick={() => setIsProductModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleSaveProduct} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Product Name</label>
                <input 
                  required
                  type="text" 
                  value={productForm.name}
                  onChange={e => setProductForm({...productForm, name: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-brand/20"
                  placeholder="e.g. Fresh Milk"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Display Price</label>
                  <input 
                    required
                    type="text" 
                    value={productForm.price}
                    onChange={e => setProductForm({...productForm, price: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-brand/20"
                    placeholder="₹60/litre"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Numeric Price (₹)</label>
                  <input 
                    required
                    type="number" 
                    value={productForm.priceNum}
                    onChange={e => setProductForm({...productForm, priceNum: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-brand/20"
                    placeholder="60"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Image URL</label>
                <input 
                  required
                  type="url" 
                  value={productForm.img}
                  onChange={e => setProductForm({...productForm, img: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-brand/20"
                  placeholder="https://..."
                />
              </div>
              <div className="pt-4 flex gap-4">
                <button 
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="flex-1 px-6 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-3 bg-primary-brand text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg shadow-primary-brand/20"
                >
                  {editingProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
