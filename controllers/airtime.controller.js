import axios from "axios";
import { User, Transaction } from "../models/user.model.js";

export const AirtimeController = async (req, res) => {
  try {
    const { userId, phone, amount } = req.body;

    // ========================
    // Validate
    // ========================
    if (!userId || !phone || !amount) {
      return res.status(400).json({
        message: "userId, phone and amount required",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ========================
    // Check balance
    // ========================
    if (user.walletBalance < amount) {
      await Transaction.create({
        userId,
        type: "airtime",
        amount,
        status: "failed",
        description: "Insufficient balance",
      });

      return res.status(400).json({
        message: "Insufficient balance",
      });
    }

    // ========================
    // 1️⃣ Deduct first (HOLD)
    // ========================
    user.walletBalance -= amount;
    await user.save();

    // ========================
    // 2️⃣ Create pending txn
    // ========================
    const txn = await Transaction.create({
      userId,
      type: "airtime",
      amount,
      status: "pending",
      description: `Processing airtime for ${phone}`,
    });

    // ========================
    // 3️⃣ Call provider (NO extra try here)
    // ========================
    const response = await axios.post(
      "https://datastationapi.com/api/topup/",
      {
        phone,
        amount,
      },
      {
        headers: {
          Authorization: "Token YOUR_API_KEY",
          "Content-Type": "application/json",
        },
      }
    );

    const apiResponse = response.data;

    // ========================
    // SUCCESS
    // ========================
    if (apiResponse?.status === "success") {
      txn.status = "success";
      txn.description = "Airtime purchase successful";
      await txn.save();

      return res.json({
        message: "Airtime purchase successful",
        balance: user.walletBalance,
        data: apiResponse,
      });
    }

    // ========================
    // ❌ FAILED → REFUND
    // ========================
    user.walletBalance += amount;
    await user.save();

    txn.status = "failed";
    txn.description = "Provider failed — refunded";
    await txn.save();

    return res.status(400).json({
      message: "Transaction failed — refunded",
    });

  } catch (error) {
    console.error("Airtime Error:", error);

    const { userId, amount } = req.body;

    // Refund if error
    if (userId && amount) {
      await User.findByIdAndUpdate(userId, {
        $inc: { walletBalance: amount },
      });
    }

    await Transaction.create({
      userId,
      type: "airtime",
      amount,
      status: "failed",
      description: "Server error — refunded",
    });

    return res.status(500).json({
      message: "Something went wrong — refunded",
    });
  }
};