import "dotenv/config";
import { createApp, log } from "./app";

(async () => {
  const { httpServer } = await createApp({
    enableVite: process.env.NODE_ENV !== "production",
    serveClient: process.env.NODE_ENV === "production",
  });

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5002", 10);

  httpServer.listen(port, () => {
    log(`serving on http://localhost:${port}`);
  });

})();
