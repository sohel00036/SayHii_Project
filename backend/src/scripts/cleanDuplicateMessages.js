import { config } from "dotenv";
import { connectDB } from "../lib/db.js";
import Message from "../models/message.model.js";

config();

async function cleanDuplicates() {
  await connectDB();
  const msgs = await Message.find().sort({ createdAt: 1 }).lean();
  let count = 0;
  for (let i = 1; i < msgs.length; i++) {
    if (
      msgs[i].senderId.toString() === msgs[i - 1].senderId.toString() &&
      msgs[i].text === msgs[i - 1].text &&
      Math.abs(new Date(msgs[i].createdAt) - new Date(msgs[i - 1].createdAt)) < 10000
    ) {
      await Message.deleteOne({ _id: msgs[i]._id });
      count++;
    }
  }
  console.log("Removed duplicate messages from DB:", count);
  process.exit(0);
}

cleanDuplicates().catch(console.error);
