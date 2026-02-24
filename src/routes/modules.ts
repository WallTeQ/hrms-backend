import attendance from "../modules/attendance/router.js";
import auth from "../modules/auth/router.js";
import employee from "../modules/employee/router.js";
import payroll from "../modules/payroll/router.js";
import departments from "../modules/departments/router.js";
import performanceEvaluation from "../modules/performance-evaluation/router.js";
import recruitment from "../modules/recruitment/router.js";
import reports from "../modules/reports/router.js";
import trainings from "../modules/trainings/router.js";
import user from "../modules/user/router.js";
import tasks from "../modules/tasks/router.js";
import shifts from "../modules/shifts/router.js";

export default [
  { path: "/attendance", router: attendance },
  { path: "/auth", router: auth },
  { path: "/employees", router: employee },
  { path: "/payroll", router: payroll },
  { path: "/departments", router: departments },
  { path: "/performance", router: performanceEvaluation },
  { path: "/recruitment", router: recruitment },
  { path: "/reports", router: reports },
  { path: "/trainings", router: trainings },
  { path: "/users", router: user },
  { path: "/tasks", router: tasks },
  { path: "/shifts", router: shifts },
];