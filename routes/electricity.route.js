import express from "express";
import * as dataController from "../controllers/data.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { asyncWrapper } from "../middlewares/error.middleware.js";
import { buyElectricityController } from "../controllers/electricity.controller.js";

const router = express.Router();

router.post("/buy", buyElectricityController);

export default router;