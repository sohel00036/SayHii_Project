import { config } from "dotenv";
import { connectDB } from "../lib/db.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";

config();

async function checkDb() {
  await connectDB();
  const msgs = await Message.find()
    .sort({ createdAt: -1 })
    .limit(10)
    .populate("senderId", "fullName email")
    .populate("receiverId", "fullName email")
    .lean();

  console.log("=== LAST 10 MESSAGES IN DB ===");
  msgs.forEach((m, idx) => {
    console.log(`\n[${idx + 1}] ID: ${m._id}`);
    console.log(`From: ${m.senderId?.fullName} (${m.senderId?._id})`);
    console.log(`To: ${m.receiverId?.fullName} (${m.receiverId?._id})`);
    console.log(`Text: "${m.text}"`);
    console.log(`Time: ${m.createdAt}`);
  });

  process.exit(0);
}

checkDb().catch(console.error);
