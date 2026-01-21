// Central routes index - registers module routers

import express from "express";
import modules from "./modules.js";

const router = express.Router();

for (const m of modules) {
  router.use(m.path, m.router);
}

export default router;