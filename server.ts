import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import cors from "cors";
import fs from "fs";

const PRODUCTS_FILE = path.join(process.cwd(), "products.json");
const ACTIVITY_FILE = path.join(process.cwd(), "activity.json");
const ORDERS_FILE = path.join(process.cwd(), "orders.json");

// Initialize data files if they don't exist
if (!fs.existsSync(PRODUCTS_FILE)) {
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify([
    { id: 1, name: 'Fresh Milk', price: '₹60/litre', priceNum: 60, img: 'https://freshfarmstore.netlify.app/assets/milk-C5NvplSF.jpg' },
    { id: 2, name: 'Farm Butter', price: '₹550/kg', priceNum: 550, img: 'https://freshfarmstore.netlify.app/assets/butter-DWdOYBeZ.jpg' },
    { id: 3, name: 'Fresh Curd', price: '₹80/kg', priceNum: 80, img: 'https://freshfarmstore.netlify.app/assets/curd-Dzvf-L1q.jpg' },
    { id: 4, name: 'Buttermilk', price: '₹40/litre', priceNum: 40, img: 'https://freshfarmstore.netlify.app/assets/buttermilk-DjZbxi3I.jpg' },
    { id: 5, name: 'Pure Ghee', price: '₹650/kg', priceNum: 650, img: 'https://freshfarmstore.netlify.app/assets/ghee-X09O5WkK.jpg' },
    { id: 6, name: 'Farm Chicken', price: '₹280/kg', priceNum: 280, img: 'https://freshfarmstore.netlify.app/assets/chicken-DY_jt5Bk.jpg' },
    { id: 7, name: 'Native Eggs', price: '₹10/piece', priceNum: 10, img: 'https://freshfarmstore.netlify.app/assets/eggs-BjSj8Vjc.jpg' },
  ]));
}
if (!fs.existsSync(ACTIVITY_FILE)) {
  fs.writeFileSync(ACTIVITY_FILE, JSON.stringify([]));
}
if (!fs.existsSync(ORDERS_FILE)) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify([]));
}

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();
const PORT = 3000;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Cloudinary with the provided keys
try {
  const cloudinaryUrl = process.env.CLOUDINARY_URL || "cloudinary://437753281943692:i6ewcPROpxanIstnrRZi_bRWCpc@dx0thixdl";
  
  console.log("Environment check:");
  console.log("- CLOUDINARY_URL:", process.env.CLOUDINARY_URL ? "Set" : "Not set");

  // Parse the URL to get the components
  // Format: cloudinary://api_key:api_secret@cloud_name
  const match = cloudinaryUrl.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/);
  if (match) {
    cloudinary.config({
      api_key: match[1],
      api_secret: match[2],
      cloud_name: match[3],
      secure: true
    });
    console.log("Cloudinary initialized successfully with parsed URL.");
  } else {
    console.error("Invalid CLOUDINARY_URL format.");
  }
} catch (e) {
  console.error("Failed to initialize Cloudinary:", e);
}

// Setup multer for handling file uploads in memory
const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Product Management
  app.get("/api/products", (req, res) => {
    const products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, "utf-8"));
    res.json(products);
  });

  app.post("/api/products", (req, res) => {
    const products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, "utf-8"));
    const newProduct = { ...req.body, id: Date.now() };
    products.push(newProduct);
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
    res.json(newProduct);
  });

  app.put("/api/products/:id", (req, res) => {
    const products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, "utf-8"));
    const index = products.findIndex((p: any) => p.id === parseInt(req.params.id));
    if (index !== -1) {
      products[index] = { ...products[index], ...req.body };
      fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
      res.json(products[index]);
    } else {
      res.status(404).json({ error: "Product not found" });
    }
  });

  app.delete("/api/products/:id", (req, res) => {
    let products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, "utf-8"));
    products = products.filter((p: any) => p.id !== parseInt(req.params.id));
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
    res.json({ success: true });
  });

  // Activity Tracking
  app.post("/api/track", (req, res) => {
    const activity = JSON.parse(fs.readFileSync(ACTIVITY_FILE, "utf-8"));
    activity.push({ ...req.body, timestamp: new Date().toISOString() });
    // Keep only last 1000 activities
    if (activity.length > 1000) activity.shift();
    fs.writeFileSync(ACTIVITY_FILE, JSON.stringify(activity, null, 2));
    res.json({ success: true });
  });

  app.get("/api/activity", (req, res) => {
    const activity = JSON.parse(fs.readFileSync(ACTIVITY_FILE, "utf-8"));
    res.json(activity);
  });

  // Orders Management
  app.get("/api/orders", (req, res) => {
    const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf-8"));
    res.json(orders);
  });

  app.post("/api/orders", (req, res) => {
    const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf-8"));
    const newOrder = { ...req.body, id: req.body.id || Date.now().toString() };
    orders.push(newOrder);
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
    res.json(newOrder);
  });

  app.put("/api/orders/:id", (req, res) => {
    const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf-8"));
    const index = orders.findIndex((o: any) => o.id === req.params.id);
    if (index !== -1) {
      orders[index] = { ...orders[index], ...req.body };
      fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
      res.json(orders[index]);
    } else {
      res.status(404).json({ error: "Order not found" });
    }
  });

  app.post("/api/process-receipt", (req, res, next) => {
    console.log(`[${new Date().toISOString()}] Incoming receipt upload request`);
    next();
  }, upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        console.error("Upload failed: No file found in the request.");
        return res.status(400).json({ success: false, error: "No image file was received." });
      }

      console.log(`Processing upload: ${req.file.originalname} (${(req.file.size / 1024).toFixed(2)} KB)`);

      // Convert buffer to base64
      const b64 = Buffer.from(req.file.buffer).toString("base64");
      const dataURI = "data:" + req.file.mimetype + ";base64," + b64;

      const result = await cloudinary.uploader.upload(dataURI, {
        folder: "freshfarm_receipts",
        resource_type: "auto"
      });

      console.log("Cloudinary upload successful. URL:", result.secure_url);
      res.json({ success: true, url: result.secure_url });
    } catch (error: any) {
      console.error("Cloudinary Upload Exception:", error);
      res.status(500).json({ 
        success: false, 
        error: "Server failed to upload image to storage.",
        details: error.message 
      });
    }
  });

  // Global error handler for API routes
  app.use("/api", (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("API Error:", err);
    res.status(500).json({ success: false, error: err.message || "Internal Server Error" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
