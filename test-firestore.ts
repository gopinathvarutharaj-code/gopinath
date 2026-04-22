import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function test() {
  try {
    const newOrderData = {
      name: "Gopi",
      phone: "6382599927",
      address: "Haii",
      items: [{ id: "1", name: "Fresh Curd", qty: 1, priceNum: 80 }],
      totalAmount: 80,
      screenshotUrl: "https://res.cloudinary.com/dx0thixdl/image/upload/v1774880047/freshfarm_receipts/ohuizepefjs9ygove65j.png",
      uid: "6382599927",
      createdAt: new Date().toISOString(),
      status: "pending"
    };

    const docRef = await addDoc(collection(db, "orders"), newOrderData);
    console.log("Success! Document ID:", docRef.id);
  } catch (e: any) {
    console.error("Error:", e.message);
  }
}

test();
