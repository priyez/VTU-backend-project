import axios from "axios";
import { User, Transaction } from "../models/user.model.js";

export const buyElectricityController = async (req, res) => {
  const { userId, meterNumber, amount, provider } = req.body;

  try {
    // 1️⃣ Validate input
    if (!userId || !meterNumber || !amount || !provider) {
      return res.status(400).json({
        message: "userId, meterNumber, amount, and provider are required",
      });
    }

    // 2️⃣ Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 3️⃣ Check balance
    if (user.walletBalance < amount) {
      await Transaction.create({
        userId,
        type: "electricity",
        amount,
        status: "failed",
        description: "Insufficient balance",
      });

      return res.status(400).json({ message: "Insufficient balance" });
    }

    // 4️⃣ Deduct balance (HOLD)
    user.walletBalance -= amount;
    await user.save();

    // 5️⃣ Create pending transaction
    const txn = await Transaction.create({
      userId,
      type: "electricity",
      amount,
      status: "pending",
      description: `Processing electricity payment for ${meterNumber}`,
    });

    // 6️⃣ Call provider API
    const apiResponse = await axios.post(
      "https://datastationapi.com/api/eletricity",
      { meterNumber, amount, provider },
      {
        headers: {
          Authorization: "Token 6dc4deabae242ff77c992f7277ba47cbb7c95486 ",
          "Content-Type": "application/json",
        },
      }
    );

    // 7️⃣ Handle success
    if (apiResponse.data.status === "success") {
      txn.status = "success";
      txn.description = "Electricity purchase successful";
      await txn.save();

      return res.json({
        message: "Electricity purchase successful",
        balance: user.walletBalance,
        data: apiResponse.data,
      });
    }

    // 8️⃣ Handle failure → refund
    user.walletBalance += amount;
    await user.save();

    txn.status = "failed";
    txn.description = "Provider failed — refunded";
    await txn.save();

    return res.status(400).json({
      message: "Transaction failed — refunded",
    });
  } catch (error) {
    console.error(error);

    // Server error → refund
    if (userId && amount) {
      await User.findByIdAndUpdate(userId, {
        $inc: { walletBalance: amount },
      });
    }

    await Transaction.create({
      userId,
      type: "electricity",
      amount,
      status: "failed",
      description: "Server error — refunded",
    });

    res.status(500).json({
      message: "Something went wrong — refunded",
    });
  }
};