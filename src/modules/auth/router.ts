import express from "express";
import { validate } from "../../middlewares/validate.js";
import { authMiddleware } from "../../middlewares/auth.js";
import { RegisterSchema, LoginSchema, RequestOtpSchema, VerifyOtpSchema, CompleteSignupSchema, RequestPasswordResetOtpSchema, VerifyPasswordResetOtpSchema, ResetPasswordSchema, ChangePasswordSchema } from "./schema.js";
import * as controller from "./controller.js";
import { createRateLimiter, loginLockMiddleware } from "../../middlewares/security.js";

const router = express.Router();

router.post("/register", validate(RegisterSchema), controller.register);
// auth endpoints are sensitive: apply per-endpoint rate limiting + login lock middleware
router.post("/login", createRateLimiter({ prefix: "auth:login", windowSeconds: 60, max: Number(process.env.AUTH_LOGIN_RATE_LIMIT || 10) }), loginLockMiddleware(), validate(LoginSchema), controller.login);
// logout will revoke the current bearer token

router.post("/logout", authMiddleware, controller.logout);
router.post("/refresh", controller.refreshToken);
router.post("/signup/request", createRateLimiter({ prefix: "auth:signup", windowSeconds: 60, max: Number(process.env.AUTH_SIGNUP_RATE_LIMIT || 5) }), validate(RequestOtpSchema), controller.requestSignupOtp);
router.post("/signup/verify", validate(VerifyOtpSchema), controller.verifySignupOtp);
router.post("/signup/complete", validate(CompleteSignupSchema), controller.completeSignup);
// Password reset routes
router.post("/reset/request", createRateLimiter({ prefix: "auth:reset", windowSeconds: 60, max: Number(process.env.AUTH_RESET_RATE_LIMIT || 5) }), validate(RequestPasswordResetOtpSchema), controller.requestPasswordResetOtp);
router.post("/reset/verify", validate(VerifyPasswordResetOtpSchema), controller.verifyPasswordResetOtp);
router.post("/reset/password", validate(ResetPasswordSchema), controller.resetPassword);

// Change password (requires auth)
router.post("/change-password", authMiddleware, validate(ChangePasswordSchema), controller.changePassword);

export default router;