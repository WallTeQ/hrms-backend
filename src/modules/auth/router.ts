import express from "express";
import { validate } from "../../middlewares/validate";
import { RegisterSchema, LoginSchema, RequestOtpSchema, VerifyOtpSchema, CompleteSignupSchema, UpdateUserSchema } from "./schema";
import * as controller from "./controller";
import { createRateLimiter, loginLockMiddleware } from "../../middlewares/security";

const router = express.Router();

router.post("/register", validate(RegisterSchema), controller.register);
// auth endpoints are sensitive: apply per-endpoint rate limiting + login lock middleware
router.post("/login", createRateLimiter({ prefix: "auth:login", windowSeconds: 60, max: Number(process.env.AUTH_LOGIN_RATE_LIMIT || 10) }), loginLockMiddleware(), validate(LoginSchema), controller.login);
// logout will revoke the current bearer token
router.post("/logout", controller.logout);
router.post("/signup/request", createRateLimiter({ prefix: "auth:signup", windowSeconds: 60, max: Number(process.env.AUTH_SIGNUP_RATE_LIMIT || 5) }), validate(RequestOtpSchema), controller.requestSignupOtp);
router.post("/signup/verify", validate(VerifyOtpSchema), controller.verifySignupOtp);
router.post("/signup/complete", validate(CompleteSignupSchema), controller.completeSignup);
router.patch("/:id", validate(UpdateUserSchema), controller.updateUser);
router.get("/:id", controller.getUser);
router.get("/", controller.listUsers);
router.delete("/:id", controller.deleteUser);

export default router;