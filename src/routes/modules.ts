// scaffold: import and export module routers

import attendance from "../modules/attendance/router";
import auth from "../modules/auth/router";
import employee from "../modules/employee/router";
import payroll from "../modules/payroll/router";
import performanceEvaluation from "../modules/performance-evaluation/router";
import recruitment from "../modules/recruitment/router";
import reports from "../modules/reports/router";
import trainings from "../modules/trainings/router";

export default [
  { path: "/attendance", router: attendance },
  { path: "/auth", router: auth },
  { path: "/employees", router: employee },
  { path: "/payroll", router: payroll },
  { path: "/performance", router: performanceEvaluation },
  { path: "/recruitment", router: recruitment },
  { path: "/reports", router: reports },
  { path: "/trainings", router: trainings },
];