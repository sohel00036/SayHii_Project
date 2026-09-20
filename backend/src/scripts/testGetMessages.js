import { config } from "dotenv";
import { connectDB } from "../lib/db.js";
import Message from "../models/message.model.js";

config();

async function testGetMessages() {
  await connectDB();
  const myId = "68d80f6a0c6d1f0e17d9dfdb"; // Rahuyol ID
  const userToChatId = "685939c307dffd1febf0e9e9"; // Monica ID

  const messages = await Message.find({
    $or: [
      { senderId: myId, receiverId: userToChatId },
      { senderId: userToChatId, receiverId: myId },
    ],
  });

  console.log("Count returned by Message.find:", messages.length);
  messages.forEach((m) => {
    console.log(`- ID: ${m._id} | From: ${m.senderId} | Text: "${m.text}"`);
  });

  process.exit(0);
}

testGetMessages();
