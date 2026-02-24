import "dotenv/config";
import app from "./app.js";
// start background workers & jobs
import "./queues/contractUploadQueue.js";
import { startContractUploadChecker } from "./jobs/contractUploadChecker.js";
import { startDocumentsExpiringChecker } from "./jobs/documentsExpiringChecker.js";
import { startRetirementReminderChecker } from "./jobs/retirementAlert.js";
import { startTaskOverdueChecker } from "./jobs/taskOverdueChecker.js";
import { startLeaveCarryForwardExpiryChecker } from "./jobs/leaveCarryForwardExpiry.js";
import { startPerformanceGenerator } from "./jobs/performanceGenerator.js";

const port = process.env.PORT || 5000;

// start periodic contract upload checker
startContractUploadChecker();
// start documents expiry checker
startDocumentsExpiringChecker();
// start retirement reminder checker
startRetirementReminderChecker();
// start overdue task checker
startTaskOverdueChecker();
// start leave carry-forward expiry checker
startLeaveCarryForwardExpiryChecker();
// start automated performance generation (runs monthly by default)
startPerformanceGenerator();

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${port}`);
});
