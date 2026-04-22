
/// <reference types="vite/client" />
import React, { useState, useEffect, useMemo, memo, Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { AdminPanel } from './AdminPanel';
import { db, handleFirestoreError, OperationType } from './firebase';
import { collection, getDocs, addDoc, updateDoc, doc, query, orderBy, limit, onSnapshot, setDoc, getDoc } from 'firebase/firestore';

import CryptoJS from 'crypto-js';

// --- Error Boundary ---
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    const { hasError, error } = this.state;
    if (hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsedError = JSON.parse(error?.message || "{}");
        if (parsedError.error) {
          errorMessage = `Firebase Error: ${parsedError.error} during ${parsedError.operationType} on ${parsedError.path}`;
        }
      } catch (e) {
        errorMessage = error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-red-100">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-exclamation-triangle text-2xl"></i>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Application Error</h2>
            <p className="text-gray-600 mb-6">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-primary-brand text-white py-4 rounded-xl font-bold hover:bg-black transition-all"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

// --- Components ---

const ProductCard = memo(({ product, isInCart, onAdd, isWishlisted, onToggleWishlist }: any) => (
  <div className="bg-white rounded-2xl overflow-hidden border border-natural-dark shadow-soft group transition-all hover:shadow-lg relative">
    <div className="aspect-square relative overflow-hidden p-2">
      <img 
        src={product.img} 
        className="w-full h-full object-cover rounded-xl transition-transform duration-700 group-hover:scale-105" 
        alt={product.name} 
        loading="lazy"
      />
      <div className="absolute top-4 right-4 z-20">
        <button 
          onClick={(e) => { e.stopPropagation(); onToggleWishlist(product.id); }}
          className={`w-10 h-10 rounded-full flex items-center justify-center shadow-xl backdrop-blur-md transition-all active:scale-90 ${isWishlisted ? 'bg-red-500 text-white' : 'bg-white/90 text-gray-400 hover:text-red-500'}`}
        >
          <i className={`fas fa-heart ${isWishlisted ? 'animate-pulse' : ''}`}></i>
        </button>
      </div>
      <div className="absolute inset-x-0 bottom-3 px-4 flex justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all">
        <button 
          onClick={() => onAdd(product)}
          disabled={isInCart}
          className={`px-6 py-2 rounded-lg font-bold text-[10px] shadow-xl flex items-center gap-2 transition-all ${isInCart ? 'bg-gray-400 text-white' : 'bg-primary-brand text-white hover:bg-black active:scale-95'}`}
        >
          <i className={`fas ${isInCart ? 'fa-check' : 'fa-cart-shopping'}`}></i> {isInCart ? 'Added' : 'Order Now'}
        </button>
      </div>
    </div>
    <div className="p-4 text-center">
      <h3 className="text-base font-bold text-primary-brand mb-0.5">{product.name}</h3>
      <p className="text-primary-dark font-black text-sm">{product.price}</p>
    </div>
  </div>
));

// --- Data ---
const PRODUCTS = [
  { id: 1, name: 'Fresh Milk', price: '₹60/litre', priceNum: 60, img: 'https://freshfarmstore.netlify.app/assets/milk-C5NvplSF.jpg' },
  { id: 2, name: 'Farm Butter', price: '₹550/kg', priceNum: 550, img: 'https://freshfarmstore.netlify.app/assets/butter-DWdOYBeZ.jpg' },
  { id: 3, name: 'Fresh Curd', price: '₹80/kg', priceNum: 80, img: 'https://freshfarmstore.netlify.app/assets/curd-Dzvf-L1q.jpg' },
  { id: 4, name: 'Buttermilk', price: '₹40/litre', priceNum: 40, img: 'https://freshfarmstore.netlify.app/assets/buttermilk-DjZbxi3I.jpg' },
  { id: 5, name: 'Pure Ghee', price: '₹650/kg', priceNum: 650, img: 'https://freshfarmstore.netlify.app/assets/ghee-X09O5WkK.jpg' },
  { id: 6, name: 'Farm Chicken', price: '₹280/kg', priceNum: 280, img: 'https://freshfarmstore.netlify.app/assets/chicken-DY_jt5Bk.jpg' },
  { id: 7, name: 'Native Eggs', price: '₹10/piece', priceNum: 10, img: 'https://freshfarmstore.netlify.app/assets/eggs-BjSj8Vjc.jpg' },
];

const TESTIMONIALS = [
  { id: 1, text: '"The milk and curd quality is exceptional! Fresh and tasty every time. My family loves the buttermilk too."', author: 'Priya Kumar', initial: 'P', color: 'bg-green-100 text-green-700' },
  { id: 2, text: '"Best ghee in Namakkal! The aroma and taste reminds me of my grandmother\'s homemade ghee. Highly recommended!"', author: 'Rajesh Sharma', initial: 'R', color: 'bg-blue-100 text-blue-700' },
  { id: 3, text: '"Fresh Farm\'s native eggs are so nutritious. The yolk color tells you they\'re from healthy hens. Great quality chicken too!"', author: 'Lakshmi Devi', initial: 'L', color: 'bg-yellow-100 text-yellow-700' },
];

type OrderStatus = 'completed' | 'cancelled';
interface Order {
  id: string;
  date: string;
  items: any[];
  total: number;
  status: OrderStatus;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
}

const App = () => {
  const [view, setView] = useState<'home' | 'cart' | 'checkout' | 'history' | 'admin' | 'admin-login'>('home');
  const [cart, setCart] = useState<any[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => localStorage.getItem('freshfarm_admin_logged_in') === 'true');
  const [adminCredentials, setAdminCredentials] = useState({ email: '', password: '' });
  const [products, setProducts] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<number[]>(() => {
    const saved = localStorage.getItem('freshfarm_wishlist');
    return saved ? JSON.parse(saved) : [];
  });
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('freshfarm_orders');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch('/api/health');
        if (response.ok) {
          const data = await response.json();
          console.log("Backend health check successful:", data);
        } else {
          console.error("Backend health check failed with status:", response.status);
        }
      } catch (error) {
        console.error("Backend health check failed. The server might be unreachable or still starting up.", error);
      }
    };
    checkBackend();

    const fetchInitialData = async () => {
      try {
        // 1. Fetch Products from Firestore
        const productsRef = collection(db, 'products');
        let productsSnap;
        try {
          productsSnap = await getDocs(productsRef);
        } catch (err) {
          handleFirestoreError(err, OperationType.LIST, 'products');
          return; // handleFirestoreError throws, but for TS
        }
        
        let productsData = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Seed if empty (for first run)
        if (productsData.length === 0) {
          // Only attempt seeding if we are not anonymous or if we want to try anyway but handle it gracefully
          console.log("Products collection is empty. Seeding might be required.");
          
          const initialProducts = [
            { name: 'Fresh Milk', price: '₹60/litre', priceNum: 60, img: 'https://freshfarmstore.netlify.app/assets/milk-C5NvplSF.jpg' },
            { name: 'Farm Butter', price: '₹550/kg', priceNum: 550, img: 'https://freshfarmstore.netlify.app/assets/butter-DWdOYBeZ.jpg' },
            { name: 'Fresh Curd', price: '₹80/kg', priceNum: 80, img: 'https://freshfarmstore.netlify.app/assets/curd-Dzvf-L1q.jpg' },
            { name: 'Buttermilk', price: '₹40/litre', priceNum: 40, img: 'https://freshfarmstore.netlify.app/assets/buttermilk-DjZbxi3I.jpg' },
            { name: 'Pure Ghee', price: '₹650/kg', priceNum: 650, img: 'https://freshfarmstore.netlify.app/assets/ghee-X09O5WkK.jpg' },
            { name: 'Farm Chicken', price: '₹280/kg', priceNum: 280, img: 'https://freshfarmstore.netlify.app/assets/chicken-DY_jt5Bk.jpg' },
            { name: 'Native Eggs', price: '₹10/piece', priceNum: 10, img: 'https://freshfarmstore.netlify.app/assets/eggs-BjSj8Vjc.jpg' },
          ];
          
          let seededCount = 0;
          for (const p of initialProducts) {
            try {
              await addDoc(productsRef, p);
              seededCount++;
            } catch (err: any) {
              // If it's a permission error, it just means this user isn't an admin.
              // We don't want to crash the app for guests.
              if (err.code === 'permission-denied' || (err.message && err.message.includes('permission'))) {
                console.warn("Permission denied while seeding products. This is expected for non-admin users.");
                break; // Stop trying to seed if we don't have permission
              } else {
                handleFirestoreError(err, OperationType.CREATE, 'products');
              }
            }
          }
          
          if (seededCount > 0) {
            const newSnap = await getDocs(productsRef);
            productsData = newSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProducts(productsData);
          }
        } else {
          setProducts(productsData);
        }

        // 2. Fetch Orders from Firestore
        const ordersRef = collection(db, 'orders');
        let ordersSnap;
        try {
          ordersSnap = await getDocs(ordersRef);
        } catch (err) {
          handleFirestoreError(err, OperationType.LIST, 'orders');
          return;
        }
        const ordersData = ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any;
        setOrders(ordersData);

      } catch (error) {
        console.error("Error fetching initial data:", error);
      }
    };
    fetchInitialData();
    trackActivity('page_view', 'Home Page');
  }, []);

  useEffect(() => {
    localStorage.setItem('freshfarm_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  const trackActivity = async (type: string, details?: string) => {
    try {
      await addDoc(collection(db, 'activities'), {
        type,
        details,
        userId: formData.phone || 'guest',
        userName: formData.name || 'Guest',
        timestamp: new Date().toISOString()
      }).catch(err => handleFirestoreError(err, OperationType.CREATE, 'activities'));
    } catch (e) {
      // Silent fail for tracking unless it's a permission error we want to see in console
      console.error("Tracking failed:", e);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminCredentials.email === 'kishoreparthiban12@gmail.com' && adminCredentials.password === 'kishoreadmin') {
      setIsAdminLoggedIn(true);
      localStorage.setItem('freshfarm_admin_logged_in', 'true');
      setView('admin');
      trackActivity('login', 'Admin Login Successful');
    } else {
      alert("Invalid email or password");
    }
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    localStorage.removeItem('freshfarm_admin_logged_in');
    setView('home');
    trackActivity('logout', 'Admin Logout');
  };

  useEffect(() => {
    localStorage.setItem('freshfarm_orders', JSON.stringify(orders));
  }, [orders]);

  const totalAmount = useMemo(() => cart.reduce((acc, curr) => acc + (curr.priceNum * curr.qty), 0), [cart]);
  const totalQty = useMemo(() => cart.reduce((acc, curr) => acc + curr.qty, 0), [cart]);

  useEffect(() => {
    trackActivity('page_view', `Viewed ${view} page`);
  }, [view]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    localStorage.setItem('freshfarm_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  const toggleWishlist = (productId: number) => {
    const product = products.find(p => p.id === productId);
    const productName = product ? product.name : `ID: ${productId}`;
    
    setWishlist(prev => {
      const isWishlisted = prev.includes(productId);
      if (isWishlisted) {
        trackActivity('wishlist_remove', `Removed product ${productName} from wishlist`);
        return prev.filter(id => id !== productId);
      } else {
        trackActivity('wishlist_add', `Added product ${productName} to wishlist`);
        return [...prev, productId];
      }
    });
  };

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) return prev;
      return [...prev, { ...product, qty: 1 }];
    });
    setNotification(`${product.name} added!`);
    trackActivity('add_to_cart', `Added ${product.name} to cart`);
    setTimeout(() => setNotification(null), 2000);
  };

  const updateQty = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) return { ...item, qty: Math.max(1, item.qty + delta) };
      return item;
    }));
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const copyUPI = () => {
    navigator.clipboard.writeText("kishorekpdj2006-1@okaxis").then(() => {
      setNotification("UPI ID Copied!");
      setTimeout(() => setNotification(null), 2000);
    });
  };

  const handleCheckoutStart = () => {
    setView('checkout');
    trackActivity('checkout_start', `Started checkout with ${cart.length} items`);
  };

  const handleOrder = async () => {
    if (!formData.name || !formData.phone || !formData.address || !screenshot) {
      alert("Please fill all details and upload the payment screenshot!");
      return;
    }

    setIsUploading(true);
    try {
      let downloadUrl = "Upload failed - Customer will send directly";
      let uploadSuccess = false;

      // Compress image before upload for reliable mobile performance
      const compressImage = async (file: File): Promise<Blob | File> => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
              const canvas = document.createElement('canvas');
              // More aggressive compression for mobile reliability
              const MAX_WIDTH = 800; 
              const MAX_HEIGHT = 800;
              let width = img.width;
              let height = img.height;

              if (width > height) {
                if (width > MAX_WIDTH) {
                  height *= MAX_WIDTH / width;
                  width = MAX_WIDTH;
                }
              } else {
                if (height > MAX_HEIGHT) {
                  width *= MAX_HEIGHT / height;
                  height = MAX_HEIGHT;
                }
              }
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);
              }
              
              canvas.toBlob((blob) => {
                if (blob) {
                  console.log(`Compressed image from ${(file.size / 1024).toFixed(2)}KB to ${(blob.size / 1024).toFixed(2)}KB`);
                  resolve(blob);
                } else {
                  resolve(file);
                }
              }, 'image/jpeg', 0.7); // 0.7 quality is usually plenty for receipts
            };
            img.onerror = () => resolve(file);
          };
          reader.onerror = () => resolve(file);
        });
      };

      let fileToUpload: File | Blob = screenshot;
      let fileName = screenshot.name || 'receipt.jpg';
      try {
        if (screenshot.size > 500 * 1024) { // Compress if > 500KB
          fileToUpload = await compressImage(screenshot);
          fileName = 'receipt.jpg';
        }
      } catch (e) {
        console.error("Compression failed, using original file", e);
      }

      // 1. Upload to Cloudinary directly from frontend
      const orderId = Math.random().toString(36).substr(2, 9).toUpperCase();
      try {
        console.log(`Attempting direct upload to Cloudinary`);
        
        const cloudName = "dx0thixdl";
        const apiKey = "437753281943692";
        const apiSecret = "i6ewcPROpxanIstnrRZi_bRWCpc";
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const folder = "freshfarm_receipts";
        
        // Generate signature
        const strToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
        const signature = CryptoJS.SHA1(strToSign).toString(CryptoJS.enc.Hex);

        const cloudinaryFormData = new FormData();
        cloudinaryFormData.append('file', fileToUpload, fileName);
        cloudinaryFormData.append('api_key', apiKey);
        cloudinaryFormData.append('timestamp', timestamp);
        cloudinaryFormData.append('signature', signature);
        cloudinaryFormData.append('folder', folder);

        const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
        
        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          body: cloudinaryFormData
        });
        
        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          downloadUrl = uploadData.secure_url;
          uploadSuccess = true;
          console.log("Cloudinary direct upload successful:", downloadUrl);
        } else {
          const errorText = await uploadResponse.text();
          console.error(`Cloudinary HTTP error! status: ${uploadResponse.status}, body: ${errorText}`);
          alert(`Server error during upload. Please try again or send receipt directly on WhatsApp.`);
        }
      } catch (uploadErr: any) {
        console.error(`Cloudinary Upload Exception:`, uploadErr);
        alert(`Network error during upload. Please check your connection or try again.`);
      }

      // 2. Prepare Messages
      const orderItems = cart.map(item => `• ${item.name} (${item.qty} Qty) - ₹${item.priceNum * item.qty}`).join('\n');
      
      // WhatsApp Message Setup
      let waMessageText = `*NEW ORDER FROM FRESH FARM*\n\n` +
                          `*🆔 ORDER ID:* #${orderId}\n` +
                          `*👤 CUSTOMER DETAILS*\n` +
                          `Name: ${formData.name}\n` +
                          `WhatsApp: ${formData.phone}\n` +
                          `Address: ${formData.address}\n\n` +
                          `*🛒 BUYING DETAILS*\n` +
                          `${orderItems}\n\n` +
                          `*💰 TOTAL AMOUNT: ₹${totalAmount}*\n\n` +
                          `*✅ PAYMENT STATUS*\n`;
                          
      if (uploadSuccess) {
        waMessageText += `*Payment Proof:* ${downloadUrl}\n\n*Please verify the receipt link above.*`;
      } else {
        waMessageText += `*⚠️ Receipt upload failed during checkout.*\n*Please attach your payment screenshot here in this chat to confirm your order.*`;
      }
      
      const encodedWaMessage = encodeURIComponent(waMessageText);
      const whatsappUrl = `https://wa.me/919385467210?text=${encodedWaMessage}`;
      
      // 3. Save to Google Sheets (if configured)
      const googleSheetUrl = import.meta.env.VITE_GOOGLE_SHEET_URL || (import.meta.env as any).VITE_GOOGLE_SI || "https://script.google.com/macros/s/AKfycbz7BkcbAdCSTKOqrjnEkT9708ekXJHqZp-08KLKEZ6pi45OFBhUhhc735bClcPpIpUB/exec";
      if (googleSheetUrl) {
        try {
          await fetch(googleSheetUrl, {
            method: 'POST',
            mode: 'no-cors', // no-cors is required for simple Google Apps Script web apps
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'create',
              orderId: orderId,
              date: new Date().toLocaleString(),
              name: formData.name,
              phone: formData.phone,
              address: formData.address,
              orderItems: `[ID: #${orderId}] \n` + orderItems,
              totalAmount: totalAmount,
              paymentProof: downloadUrl,
              status: 'New'
            })
          });
          console.log("Successfully sent to Google Sheets");
        } catch (sheetError) {
          console.error("Failed to save to Google Sheets:", sheetError);
        }
      }

      // 4. Trigger WhatsApp action
      // Open WhatsApp in a new tab
      window.open(whatsappUrl, '_blank');
      
      const newOrderData = {
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        items: cart.map(item => ({ id: item.id, name: item.name, qty: item.qty, priceNum: item.priceNum })),
        totalAmount: totalAmount,
        screenshotUrl: downloadUrl,
        uid: formData.phone || 'guest',
        createdAt: new Date().toISOString(),
        status: 'pending'
      };

      // 1. Persist to Firestore
      try {
        let docRef;
        try {
          docRef = await addDoc(collection(db, 'orders'), newOrderData);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'orders');
          return;
        }
        
        const orderId = docRef.id;
        
        // Update local state with the new order
        const newOrder: Order = {
          id: orderId,
          date: newOrderData.createdAt,
          items: [...cart],
          total: totalAmount,
          status: 'completed', // Local display status
          customerName: formData.name,
          customerPhone: formData.phone,
          customerAddress: formData.address
        };
        setOrders(prev => [newOrder, ...prev]);
      } catch (e) {
        console.error("Failed to persist order to Firestore", e);
      }
      
      setNotification(uploadSuccess ? "Order placed! Opening WhatsApp..." : "Order placed! Please attach receipt in WhatsApp.");
      
      setTimeout(() => {
        setView('home');
        setCart([]);
        setFormData({ name: '', phone: '', address: '' });
        setScreenshot(null);
        setNotification(null);
      }, 3000);
    } catch (error) {
      console.error("Unexpected Error:", error);
      alert("An unexpected error occurred. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (window.confirm("Are you sure you want to cancel this order?")) {
      const orderToCancel = orders.find(o => o.id === orderId);
      
      // 0. Update Firestore
      try {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o));
        
        await updateDoc(doc(db, 'orders', orderId), { status: 'cancelled' })
          .catch(err => handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`));
        
        // Track cancellation activity
        trackActivity('order_cancel', `Order #${orderId} was cancelled by the customer`);
      } catch (e) {
        console.error("Failed to update order on Firestore", e);
        // Rollback if failed
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'pending' } : o));
      }

      // 1. Send cancellation to Google Sheets
      const googleSheetUrl = import.meta.env.VITE_GOOGLE_SHEET_URL || "https://script.google.com/macros/s/AKfycbz7BkcbAdCSTKOqrjnEkT9708ekXJHqZp-08KLKEZ6pi45OFBhUhhc735bClcPpIpUB/exec";
      try {
        await fetch(googleSheetUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'cancel',
            orderId: orderId,
            date: new Date().toLocaleString(),
            name: orderToCancel?.customerName || "CANCELLED ORDER",
            phone: orderToCancel?.customerPhone || "-",
            address: orderToCancel?.customerAddress || "-",
            orderItems: `Order ID: #${orderId} has been cancelled by the customer.`,
            totalAmount: orderToCancel?.total || 0,
            paymentProof: "CANCELLED",
            status: 'Cancelled'
          })
        });
      } catch (e) {
        console.error("Failed to update sheet", e);
      }

      // 2. Open WhatsApp to notify owner
      const waMessageText = `*❌ ORDER CANCELLED ❌*\n\n` +
                            `*Order ID:* #${orderId}\n` +
                            `*Status:* Cancelled by customer\n\n` +
                            `Please remove this order from your records.`;
      const encodedWaMessage = encodeURIComponent(waMessageText);
      const whatsappUrl = `https://wa.me/919385467210?text=${encodedWaMessage}`;
      window.open(whatsappUrl, '_blank');

      setNotification("Order cancelled successfully");
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const openMaps = () => {
    window.open('https://www.google.com/maps/search/?api=1&query=Koothampoondi,+Tiruchengode,+Namakkal+-+637202', '_blank');
  };

  if (view === 'admin-login') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-6">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-md border border-natural-dark">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-primary-brand rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
              <i className="fas fa-user-shield text-white text-3xl"></i>
            </div>
            <h2 className="text-3xl font-bold text-primary-brand">Admin Access</h2>
            <p className="text-gray-500 mt-2">Enter administrator password</p>
          </div>
          
          <form onSubmit={handleAdminLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
              <input 
                type="email"
                required
                className="w-full px-4 py-4 rounded-xl border-2 border-natural-dark focus:border-primary-brand outline-none transition-all"
                placeholder="admin@example.com"
                value={adminCredentials.email}
                onChange={(e) => setAdminCredentials({ ...adminCredentials, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
              <input 
                type="password"
                required
                className="w-full px-4 py-4 rounded-xl border-2 border-natural-dark focus:border-primary-brand outline-none transition-all"
                placeholder="••••••••"
                value={adminCredentials.password}
                onChange={(e) => setAdminCredentials({ ...adminCredentials, password: e.target.value })}
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-primary-brand text-white py-4 rounded-xl font-bold hover:bg-black transition-all shadow-lg active:scale-95"
            >
              Sign In
            </button>
            <button 
              type="button"
              onClick={() => setView('home')}
              className="w-full text-gray-500 font-bold py-2 hover:text-primary-brand transition-all"
            >
              Back to Store
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (view === 'admin' && isAdminLoggedIn) {
    return <AdminPanel onLogout={handleAdminLogout} onBackToStore={() => setView('home')} />;
  }

  if (view === 'home') {
    return (
      <div className="min-h-screen bg-cream overflow-x-hidden">
        {/* Navigation Bar */}
        <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${isScrolled ? 'bg-white shadow-md py-3' : 'bg-white/90 py-5'}`}>
          <div className="container mx-auto px-6 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
              <div className="w-10 h-10 bg-[#3A5A40] rounded-full flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 21h4a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-2.414-2.414A1 1 0 0113 5.586V4h-2v1.586a1 1 0 01-.293.707L8.293 8.707A1 1 0 008 9.414V19a2 2 0 002 2z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 4h6"></path></svg>
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-bold leading-none text-primary-brand tracking-tight">Fresh Farm</h1>
                <p className="text-[8px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1">Fresh • Natural • Healthy</p>
              </div>
            </div>
            
            <div className="hidden lg:flex items-center gap-10 font-bold text-sm text-gray-700">
              <button onClick={() => scrollToSection('home')} className="hover:text-primary-dark transition-colors">Home</button>
              <button onClick={() => scrollToSection('about')} className="hover:text-primary-dark transition-colors">About</button>
              <button onClick={() => scrollToSection('products')} className="hover:text-primary-dark transition-colors">Products</button>
              <button onClick={() => scrollToSection('testimonials')} className="hover:text-primary-dark transition-colors">Feedback</button>
              <button onClick={() => scrollToSection('contact')} className="hover:text-primary-dark transition-colors">Contact</button>
              <button onClick={() => setView('history')} className="hover:text-primary-dark transition-colors text-primary-brand">My Orders</button>
              <button 
                onClick={() => isAdminLoggedIn ? setView('admin') : setView('admin-login')} 
                className="bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 transition-all flex items-center gap-2"
              >
                <i className="fas fa-user-shield"></i> Admin
              </button>
            </div>
            
            <div className="flex items-center gap-4">
              <a href="tel:+919385467210" className="hidden lg:flex bg-primary-brand text-white px-8 py-3 rounded-full font-bold items-center gap-2 hover:bg-black transition-all shadow-lg text-sm">
                <i className="fas fa-phone-alt"></i> Call Now
              </a>
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden w-10 h-10 bg-cream rounded-full flex items-center justify-center text-primary-brand shadow-sm border border-natural-dark">
                <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
              </button>
            </div>
          </div>
        </nav>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed top-[72px] left-0 right-0 bg-white border-b border-natural-dark shadow-xl z-[90] animate-in slide-in-from-top-2">
            <div className="flex flex-col p-4 font-bold text-gray-600">
              <button onClick={() => { scrollToSection('home'); setIsMobileMenuOpen(false); }} className="p-4 text-left border-b border-natural-light">Home</button>
              <button onClick={() => { scrollToSection('about'); setIsMobileMenuOpen(false); }} className="p-4 text-left border-b border-natural-light">About</button>
              <button onClick={() => { scrollToSection('products'); setIsMobileMenuOpen(false); }} className="p-4 text-left border-b border-natural-light">Products</button>
              <button onClick={() => { scrollToSection('testimonials'); setIsMobileMenuOpen(false); }} className="p-4 text-left border-b border-natural-light">Feedback</button>
              <button onClick={() => { scrollToSection('contact'); setIsMobileMenuOpen(false); }} className="p-4 text-left border-b border-natural-light">Contact</button>
              <button onClick={() => { setView('history'); setIsMobileMenuOpen(false); }} className="p-4 text-left text-primary-brand">My Orders</button>
              <button onClick={() => { isAdminLoggedIn ? setView('admin') : setView('admin-login'); setIsMobileMenuOpen(false); }} className="p-4 text-left bg-gray-50 flex items-center gap-3">
                <i className="fas fa-user-shield"></i> Admin Panel
              </button>
            </div>
          </div>
        )}

        {/* Hero Section - Exact Match from Image */}
        <header id="home" className="relative min-h-screen flex items-center pt-20 overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img 
              src="https://freshfarmstore.netlify.app/assets/hero-dairy-Ca4_X8zH.jpg" 
              className="w-full h-full object-cover" 
              alt="Natural dairy and farm products setup" 
            />
            <div className="absolute inset-0 bg-black/40"></div>
          </div>
          
          <div className="container mx-auto px-6 relative z-10 text-white py-20">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 bg-[#4ade80]/20 backdrop-blur-md px-4 py-1.5 rounded-full mb-8 border border-[#4ade80]/30 animate-in">
                <span className="w-2 h-2 bg-[#4ade80] rounded-full shadow-[0_0_10px_#4ade80]"></span>
                <span className="font-bold text-[11px] tracking-tight text-white">Now Open in Namakkal</span>
              </div>
              
              <h1 className="text-5xl md:text-[90px] font-bold leading-[1] mb-8 animate-in delay-100">
                Fresh <span className="text-[#4ade80]">Natural</span> <br />Healthy Choice
              </h1>
              
              <p className="text-lg md:text-xl text-white/90 font-medium mb-12 max-w-2xl leading-relaxed animate-in delay-200 font-['Plus_Jakarta_Sans']">
                Premium quality dairy & poultry products at affordable prices. Your trusted store for healthy living.
              </p>
              
              <div className="flex flex-col md:flex-row gap-4 animate-in delay-300 mb-12">
                <button onClick={() => window.open('https://wa.me/919385467210?text=Hello%20Fresh%20Farm!%20I%20would%20like%20to%20place%20an%20order.', '_blank')} className="w-full md:w-auto justify-center bg-[#2D5016] text-white px-8 py-3.5 rounded-xl font-bold flex items-center gap-3 hover:bg-[#1a300d] transition-all shadow-xl text-sm active:scale-95">
                  <i className="fab fa-whatsapp text-lg"></i> Order on WhatsApp
                </button>
                <div className="flex gap-4 w-full md:w-auto">
                  <button onClick={() => scrollToSection('products')} className="flex-1 justify-center bg-white/5 backdrop-blur-sm border border-white text-white px-4 py-3.5 rounded-xl font-bold hover:bg-white hover:text-primary-brand transition-all flex items-center gap-2 text-sm active:scale-95">
                    <i className="fas fa-shopping-bag"></i> View Products
                  </button>
                  <button onClick={openMaps} className="flex-1 justify-center bg-white/5 backdrop-blur-sm border border-white text-white px-4 py-3.5 rounded-xl font-bold hover:bg-white hover:text-primary-brand transition-all flex items-center gap-2 text-sm active:scale-95">
                    <i className="fas fa-location-dot"></i> Visit Store
                  </button>
                </div>
              </div>

              {/* Hero Feature Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in delay-400">
                {[
                  { icon: 'fa-star', title: 'Premium Quality', desc: 'Hand-picked fresh products' },
                  { icon: 'fa-shield-halved', title: '100% Natural', desc: 'No chemicals or preservatives' },
                  { icon: 'fa-truck-fast', title: 'Fast Delivery', desc: 'Same day delivery available' }
                ].map((f, i) => (
                  <div key={i} className="bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-2xl flex items-center gap-5 group hover:bg-white/20 transition-all">
                    <div className="w-10 h-10 rounded-full border border-[#4ade80]/50 flex items-center justify-center text-[#4ade80] shrink-0 group-hover:scale-110 transition-transform">
                      <i className={`fas ${f.icon} text-lg`}></i>
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base leading-tight">{f.title}</h4>
                      <p className="text-white/80 text-[11px] font-medium mt-1">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 animate-bounce opacity-50">
            <div className="w-6 h-10 border-2 border-white rounded-full flex justify-center p-1">
              <div className="w-1 h-2 bg-white rounded-full"></div>
            </div>
          </div>
        </header>

        {/* Section: About - Exact implementation from image */}
        <section id="about" className="py-24 bg-white">
          <div className="container mx-auto px-6">
            <div className="flex flex-col lg:flex-row items-start gap-16">
              {/* Left Side: Content & Stats */}
              <div className="lg:w-1/2 space-y-8">
                <div className="flex items-center gap-2 text-primary-brand font-bold tracking-wider uppercase text-xs">
                  <i className="fas fa-bottle-water"></i> ABOUT US
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-primary-brand leading-tight">
                  Your Trusted Source for Fresh Dairy & Poultry
                </h2>
                <div className="space-y-6 text-gray-500 leading-relaxed font-medium">
                  <p>
                    At Fresh Farm, we bring you the finest dairy and poultry products straight from local farms to your table. Our commitment to quality, freshness, and purity has made us the preferred choice for health-conscious families in Namakkal.
                  </p>
                  <p>
                    Every product is carefully sourced, tested for quality, and delivered fresh to ensure you get nothing but the best. From creamy milk to golden ghee, from farm-fresh eggs to premium chicken - we take pride in offering products that nourish your family.
                  </p>
                </div>
                
                <div className="grid grid-cols-3 gap-4 pt-4">
                  {[
                    { label: 'Happy Customers', value: '500+' },
                    { label: 'Products', value: '7+' },
                    { label: 'Rating', value: '4.9★' }
                  ].map((stat, i) => (
                    <div key={i} className="bg-cream rounded-xl p-6 text-center border border-natural-light shadow-soft">
                      <div className="text-2xl font-black text-primary-brand mb-1">{stat.value}</div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Side: 2x2 Feature Grid */}
              <div className="lg:w-1/2 w-full">
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-6">
                  {[
                    { icon: 'fa-shield-halved', title: '100% Natural', desc: 'No chemicals or preservatives in our products' },
                    { icon: 'fa-heart', title: 'Farm Fresh', desc: 'Directly sourced from local farms daily' },
                    { icon: 'fa-star', title: 'Premium Quality', desc: 'Hand-picked and quality tested products' },
                    { icon: 'fa-users', title: 'Customer Trust', desc: '4.9★ rated by 500+ happy customers' }
                  ].map((feature, i) => (
                    <div key={i} className="bg-white rounded-2xl p-8 border border-natural-light shadow-soft hover:shadow-md transition-all space-y-4">
                      <div className="w-12 h-12 rounded-xl bg-natural-light flex items-center justify-center text-primary-brand">
                        <i className={`fas ${feature.icon} text-xl`}></i>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-bold text-lg text-primary-brand">{feature.title}</h4>
                        <p className="text-xs text-gray-400 font-medium leading-relaxed">{feature.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Products */}
        <section id="products" className="py-24 bg-cream border-y border-natural-dark">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16 space-y-4">
              <div className="inline-flex items-center gap-3 text-primary-brand font-bold tracking-[0.2em] uppercase text-[10px]">
                <span className="w-10 h-[2px] bg-primary-brand"></span> OUR SHOP
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-primary-brand">Our Products</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {products.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  isInCart={cart.some(item => item.id === product.id)} 
                  isWishlisted={wishlist.includes(product.id)}
                  onAdd={addToCart} 
                  onToggleWishlist={toggleWishlist}
                />
              ))}
            </div>

            {cart.length > 0 && (
              <div className="mt-16 flex justify-center">
                <button 
                  onClick={() => setView('cart')}
                  className="bg-primary-brand text-white px-10 py-5 rounded-full shadow-2xl flex items-center justify-between w-full max-w-[360px] font-bold text-lg hover:scale-105 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-white text-primary-brand w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black">{totalQty}</div>
                    <span>My Basket</span>
                  </div>
                  <span>₹{totalAmount}</span>
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Section: Feedback */}
        <section id="testimonials" className="py-24 bg-white">
          <div className="container mx-auto px-6">
            <div className="text-center mb-20 space-y-4">
              <div className="inline-flex items-center gap-3 text-primary-brand font-bold tracking-[0.2em] uppercase text-[10px]">
                <span className="w-10 h-[2px] bg-primary-brand"></span> FEEDBACK
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-primary-brand">Happy Customers</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {TESTIMONIALS.map((t) => (
                <div key={t.id} className="bg-cream border border-natural-dark p-10 rounded-[2.5rem] shadow-soft relative group hover:shadow-lg transition-all">
                  <div className="flex gap-1.5 mb-6">
                    {[1,2,3,4,5].map(s => <i key={s} className="fas fa-star text-primary-dark text-[10px]"></i>)}
                  </div>
                  <p className="text-gray-600 font-bold leading-relaxed mb-10 text-base italic opacity-80">"{t.text}"</p>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 ${t.color} rounded-xl flex items-center justify-center font-bold text-lg shadow-sm`}>
                      {t.initial}
                    </div>
                    <div className="font-bold text-primary-brand text-lg">{t.author}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-primary-brand py-16 text-white text-center relative overflow-hidden">
          <div className="container mx-auto px-6 relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Ready for a Healthy Choice?</h2>
            <p className="text-white/70 font-bold text-base mb-10 max-w-xl mx-auto">Get fresh farm-to-table delivery right in Namakkal today.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <button onClick={() => window.open('https://wa.me/919385467210?text=Hello%20Fresh%20Farm!%20I%20would%20like%20to%20place%20an%20order.', '_blank')} className="bg-white text-primary-brand px-10 py-4 rounded-full font-bold text-lg flex items-center gap-3 shadow-2xl hover:scale-105 transition-all">
                <i className="fab fa-whatsapp text-2xl"></i> Order via WhatsApp
              </button>
              <a href="tel:+919385467210" className="bg-transparent border-2 border-white text-white px-10 py-4 rounded-full font-bold text-lg flex items-center gap-3 hover:bg-white hover:text-primary-brand transition-all">
                <i className="fas fa-phone-alt"></i> Call Now
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer id="contact" className="bg-[#1A1A1A] text-white pt-20 pb-10">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-16 mb-16 text-center md:text-left">
              <div className="space-y-8">
                <div className="flex items-center justify-center md:justify-start gap-4">
                  <div className="w-10 h-10 bg-primary-brand rounded-full flex items-center justify-center">
                    <i className="fas fa-leaf text-white text-base"></i>
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight">Fresh Farm</h3>
                </div>
                <p className="text-gray-500 font-bold text-xs leading-relaxed max-w-xs mx-auto md:mx-0">
                  Premium dairy and poultry products sourced directly from local farms. Pure goodness delivered to your family.
                </p>
              </div>

              <div className="space-y-8">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary">Location</h4>
                <ul className="space-y-5 font-bold text-gray-400 text-xs">
                  <li className="flex justify-center md:justify-start gap-4">
                    <i className="fas fa-map-marker-alt mt-1 text-primary"></i>
                    <span className="leading-relaxed">Koothampoondi, Tiruchengode,<br />Namakkal - 637202</span>
                  </li>
                  <li className="flex justify-center md:justify-start gap-4">
                    <i className="fas fa-envelope text-primary"></i>
                    <span>kishoreparthiban12@gmail.com</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-8">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary">Delivery Hours</h4>
                <div className="bg-white/5 p-6 rounded-2xl border border-white/5 mx-auto md:mx-0 max-w-[240px]">
                  <p className="text-gray-400 text-[10px] font-bold">Mon - Sat: 7:00 AM - 10:00 AM</p>
                  <p className="text-gray-400 text-[10px] font-bold mt-2">Sun: 7:00 AM - 4:00 PM</p>
                </div>
              </div>
            </div>

            {/* Social Media Center Row */}
            <div className="flex justify-center gap-8 py-8 mb-4 border-t border-white/5">
                <a href="#" className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-primary-brand hover:text-white transition-all shadow-xl"><i className="fab fa-facebook-f text-lg"></i></a>
                <a href="#" className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-primary-brand hover:text-white transition-all shadow-xl"><i className="fab fa-instagram text-lg"></i></a>
                <a href="#" className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-primary-brand hover:text-white transition-all shadow-xl"><i className="fab fa-whatsapp text-lg"></i></a>
            </div>
            
            <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-gray-600 font-bold text-[8px] uppercase tracking-[0.5em]">
              <div>© 2026 FRESH FARM STORE. ALL RIGHTS RESERVED.</div>
              <div className="flex items-center gap-2">
                MADE IN NAMAKKAL <i className="fas fa-heart text-red-500 text-[9px] animate-pulse"></i>
              </div>
            </div>
          </div>
        </footer>

        {/* Floating WhatsApp Action Button */}
        <button 
          onClick={() => window.open('https://wa.me/919385467210?text=Hello%20Fresh%20Farm!%20I%20would%20like%20to%20place%20an%20order.', '_blank')}
          className="fixed bottom-8 right-8 z-[150] w-14 h-14 bg-[#25D366] text-white rounded-full shadow-3xl flex items-center justify-center text-2xl hover:scale-110 transition-all active:scale-95"
        >
          <i className="fab fa-whatsapp"></i>
        </button>

        {/* Notifications */}
        {notification && (
          <div className="fixed top-24 right-8 z-[200] bg-primary-brand text-white px-8 py-4 rounded-xl shadow-3xl font-bold flex items-center gap-3 animate-slide-in text-sm border border-white/10">
            <i className="fas fa-check-circle text-primary"></i> {notification}
          </div>
        )}
      </div>
    );
  }

  if (view === 'history') {
    return (
      <div className="min-h-screen bg-cream flex flex-col animate-in font-['Plus_Jakarta_Sans']">
        <nav className="fixed top-0 left-0 right-0 bg-white border-b border-natural-dark px-8 py-5 flex items-center gap-6 z-50 shadow-sm">
          <button onClick={() => setView('home')} className="w-10 h-10 rounded-full bg-natural-light flex items-center justify-center text-gray-500 hover:bg-primary-brand hover:text-white transition-all shadow-sm"><i className="fas fa-arrow-left"></i></button>
          <h1 className="text-2xl font-bold text-primary-brand">Order History</h1>
        </nav>
        <main className="pt-32 pb-20 container mx-auto px-6 max-w-2xl flex-1">
          {orders.filter(order => order.status !== 'cancelled').length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl p-12 shadow-soft border border-natural-dark">
              <i className="fas fa-receipt text-6xl text-natural-light mb-8 block"></i>
              <h2 className="text-2xl font-bold text-gray-300">No orders yet</h2>
              <button onClick={() => setView('home')} className="mt-10 bg-primary-brand text-white px-10 py-4 rounded-full font-bold hover:bg-black transition-all shadow-xl">Start Shopping</button>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.filter(order => order.status !== 'cancelled').map(order => (
                <div key={order.id} className="bg-white rounded-[2rem] p-6 border border-natural-dark shadow-soft">
                  <div className="flex justify-between items-start mb-4 border-b border-natural-light pb-4">
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Order #{order.id}</p>
                      <p className="text-sm font-bold text-gray-600">{order.date}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${order.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {order.status}
                    </div>
                  </div>
                  <div className="space-y-3 mb-6">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm font-bold text-gray-600">
                        <span>{item.qty}x {item.name}</span>
                        <span>₹{item.priceNum * item.qty}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-natural-light">
                    <span className="font-bold text-gray-400 uppercase text-xs tracking-wider">Total</span>
                    <span className="font-black text-primary-brand text-xl">₹{order.total}</span>
                  </div>
                  <button onClick={() => handleCancelOrder(order.id)} className="w-full mt-6 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white py-3 rounded-xl font-bold text-sm transition-colors border border-red-100 hover:border-red-500">
                    Cancel Order
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Notifications */}
        {notification && (
          <div className="fixed top-24 right-8 z-[200] bg-primary-brand text-white px-8 py-4 rounded-xl shadow-3xl font-bold flex items-center gap-3 animate-slide-in text-sm border border-white/10">
            <i className="fas fa-check-circle text-primary"></i> {notification}
          </div>
        )}
      </div>
    );
  }

  // Cart/Checkout View logic stays the same but with refined email
  if (view === 'cart' || view === 'checkout') {
     return (
      <div className="min-h-screen bg-cream flex flex-col animate-in font-['Plus_Jakarta_Sans']">
        <nav className="fixed top-0 left-0 right-0 bg-white border-b border-natural-dark px-8 py-5 flex items-center gap-6 z-50 shadow-sm">
          <button onClick={() => setView('home')} className="w-10 h-10 rounded-full bg-natural-light flex items-center justify-center text-gray-500 hover:bg-primary-brand hover:text-white transition-all shadow-sm"><i className="fas fa-arrow-left"></i></button>
          <h1 className="text-2xl font-bold text-primary-brand">{view === 'cart' ? 'My Shopping Basket' : 'Final Details'}</h1>
        </nav>
        <main className="pt-32 pb-44 container mx-auto px-6 max-w-2xl flex-1">
          {view === 'cart' ? (
            <div className="space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl p-12 shadow-soft border border-natural-dark">
                  <i className="fas fa-basket-shopping text-6xl text-natural-light mb-8 block"></i>
                  <h2 className="text-2xl font-bold text-gray-300">Your basket is empty</h2>
                  <button onClick={() => setView('home')} className="mt-10 bg-primary-brand text-white px-10 py-4 rounded-full font-bold hover:bg-black transition-all shadow-xl">Back to Farm</button>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="bg-white rounded-2xl p-6 flex items-center gap-6 shadow-soft border border-natural-dark hover:shadow-md transition-all">
                    <img src={item.img} className="w-20 h-20 rounded-xl object-cover shadow-sm" alt={item.name} />
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-primary-brand mb-0.5">{item.name}</h4>
                      <p className="text-primary-dark font-black text-base">₹{item.priceNum}</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="bg-natural-light p-1.5 rounded-xl flex items-center gap-4 border border-natural-dark">
                        <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 bg-white rounded-lg shadow-sm text-primary-brand flex items-center justify-center hover:bg-gray-100 transition-colors"><i className="fas fa-minus text-xs"></i></button>
                        <span className="font-bold text-lg w-6 text-center">{item.qty}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 bg-white rounded-lg shadow-sm text-primary-brand flex items-center justify-center hover:bg-gray-100 transition-colors"><i className="fas fa-plus text-xs"></i></button>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="text-red-400 p-4 hover:bg-red-50 rounded-xl transition-all"><i className="fas fa-trash-can text-lg"></i></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-8">
               <section className="bg-white rounded-[2.5rem] p-8 border border-natural-dark shadow-soft space-y-6">
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.4em]">Order Summary</h3>
                <div className="space-y-4 font-bold text-gray-600 text-base">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center">
                      <span>{item.name} <span className="text-gray-400 mx-2">×</span> {item.qty}</span>
                      <span className="text-primary-brand font-black">₹{item.priceNum * item.qty}</span>
                    </div>
                  ))}
                  <div className="pt-8 border-t border-natural-light flex justify-between text-primary-brand text-3xl font-bold">
                    <span>Total</span>
                    <span>₹{totalAmount}</span>
                  </div>
                </div>
              </section>
              
              <section className="bg-white rounded-[2.5rem] p-8 border border-natural-dark shadow-soft space-y-10">
                  <div className="text-center">
                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.5em] mb-6">Quick Pay via Apps</p>
                    <div className="grid grid-cols-3 gap-3 mb-10">
                      {[
                        { name: 'GPay', icon: 'https://cdn.worldvectorlogo.com/logos/google-pay-1.svg', color: 'hover:border-blue-400' },
                        { name: 'PhonePe', icon: 'https://cdn.worldvectorlogo.com/logos/phonepe-1.svg', color: 'hover:border-purple-400' },
                        { name: 'Paytm', icon: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Paytm_Logo_%28standalone%29.svg', color: 'hover:border-sky-400' }
                      ].map((app) => (
                        <button 
                          key={app.name}
                          onClick={() => window.location.href = `upi://pay?pa=kishorekpdj2006-1@okaxis&pn=Fresh%20Farm&am=${totalAmount}&cu=INR`}
                          className={`flex flex-col items-center justify-center gap-2 p-4 bg-white border border-natural-dark rounded-2xl transition-all shadow-soft active:scale-95 ${app.color}`}
                        >
                          <img src={app.icon} className="w-8 h-8 object-contain" alt={app.name} referrerPolicy="no-referrer" />
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{app.name}</span>
                        </button>
                      ))}
                    </div>

                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.5em] mb-6">Or Scan QR Code</p>
                    <div className="bg-cream p-5 rounded-2xl mb-10 flex items-center justify-between border border-natural-dark shadow-inner">
                        <span className="text-xs font-bold text-primary-brand truncate mr-4">kishorekpdj2006-1@okaxis</span>
                        <button onClick={copyUPI} className="bg-white text-primary-brand px-5 py-2 rounded-xl text-[10px] font-bold shadow-sm border border-natural-dark active:scale-95">COPY</button>
                    </div>
                    <div className="flex justify-center mb-6 p-8 bg-white rounded-[2rem] border border-natural-dark shadow-2xl w-fit mx-auto relative overflow-hidden group">
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=kishorekpdj2006-1@okaxis&pn=Fresh%20Farm&am=${totalAmount}`} alt="Payment QR Code" className="w-48 h-48 rounded-2xl" />
                    </div>
                    <p className="text-gray-400 text-xs font-medium leading-relaxed">Pay ₹{totalAmount} and upload the receipt below.</p>
                  </div>

                  <div className="space-y-4">
                      <input type="text" className="w-full bg-cream border border-natural-dark px-8 py-5 rounded-2xl text-base font-bold outline-none focus:ring-4 focus:ring-primary-brand/5 transition-all" placeholder="Customer Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                      <input type="tel" maxLength={11} className="w-full bg-cream border border-natural-dark px-8 py-5 rounded-2xl text-base font-bold outline-none focus:ring-4 focus:ring-primary-brand/5 transition-all" placeholder="WhatsApp Phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                      <textarea rows={3} className="w-full bg-cream border border-natural-dark px-8 py-5 rounded-2xl text-base font-bold outline-none focus:ring-4 focus:ring-primary-brand/5 transition-all resize-none" placeholder="Delivery Address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                  </div>

                  <div className="border-4 border-dashed border-natural-dark rounded-3xl p-10 text-center relative cursor-pointer group bg-cream/50 hover:bg-white hover:border-primary-brand/20 transition-all">
                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={e => setScreenshot(e.target.files ? e.target.files[0] : null)} />
                    <div className="flex flex-col items-center">
                        {screenshot ? (
                          <div className="w-full space-y-4">
                            <div className="relative w-32 h-32 mx-auto rounded-2xl overflow-hidden border-2 border-primary-brand shadow-lg">
                              <img src={URL.createObjectURL(screenshot)} className="w-full h-full object-cover" alt="Payment Preview" />
                              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <i className="fas fa-sync-alt text-white text-xl"></i>
                              </div>
                            </div>
                            <h4 className="text-[10px] font-bold text-primary-brand uppercase tracking-[0.3em]">Receipt Selected: {screenshot.name}</h4>
                            <p className="text-[9px] text-gray-400 font-bold italic">Click to change photo</p>
                          </div>
                        ) : (
                          <>
                            <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-soft mb-6 group-hover:scale-110 transition-transform border border-natural-dark">
                              <i className="fas fa-arrow-up-from-bracket text-3xl text-primary-brand"></i>
                            </div>
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em]">Upload Payment Receipt</h4>
                          </>
                        )}
                    </div>
                  </div>
              </section>
            </div>
          )}
        </main>
        {cart.length > 0 && (
          <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-natural-dark p-10 z-50 shadow-[0_-15px_40px_rgba(0,0,0,0.03)]">
            <div className="container mx-auto max-w-2xl flex flex-col gap-6">
              <div className="flex justify-between items-center px-6">
                <span className="text-gray-400 font-bold text-xs uppercase tracking-[0.4em]">Total Amount</span>
                <span className="text-4xl font-bold text-primary-brand">₹{totalAmount}</span>
              </div>
              <button 
                onClick={view === 'cart' ? handleCheckoutStart : handleOrder} 
                disabled={isUploading}
                className={`w-full ${view === 'cart' ? 'bg-primary-brand' : 'bg-[#25D366]'} text-white py-5 rounded-full font-bold text-xl shadow-3xl hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isUploading ? (
                  <span className="flex items-center justify-center gap-3">
                    <i className="fas fa-spinner fa-spin"></i> Processing...
                  </span>
                ) : (
                  view === 'cart' ? 'Proceed to Checkout' : 'Complete Order'
                )}
              </button>
            </div>
          </footer>
        )}

        {/* Uploading Overlay */}
        {isUploading && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center">
            <div className="bg-white p-10 rounded-[2.5rem] text-center space-y-6 shadow-2xl animate-in">
              <div className="w-16 h-16 border-4 border-primary-brand border-t-transparent rounded-full animate-spin mx-auto"></div>
              <h3 className="text-xl font-bold text-primary-brand">Processing Order...</h3>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Uploading Receipt securely</p>
            </div>
          </div>
        )}

        {/* Notifications */}
        {notification && (
          <div className="fixed top-24 right-8 z-[200] bg-primary-brand text-white px-8 py-4 rounded-xl shadow-3xl font-bold flex items-center gap-3 animate-slide-in text-sm border border-white/10">
            <i className="fas fa-check-circle text-primary"></i> {notification}
          </div>
        )}
      </div>
    );
  }

  return null;
};

createRoot(document.getElementById('root')!).render(<App />);
