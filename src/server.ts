import "dotenv/config";
import app from "./app.js";
// start background workers & jobs
import "./queues/contractUploadQueue.js";
import { startContractUploadChecker } from "./jobs/contractUploadChecker.js";
import { startDocumentsExpiringChecker } from "./jobs/documentsExpiringChecker.js";

const port = process.env.PORT || 5000;

// start periodic contract upload checker
startContractUploadChecker();
// start documents expiry checker
startDocumentsExpiringChecker();

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${port}`);
});
