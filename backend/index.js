const express      = require("express");
const cors         = require("cors");
const errorHandler = require("./middleware/errorHandler");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth",     require("./routes/auth"));
app.use("/api/chat",     require("./routes/chat"));
app.use("/api/journal",  require("./routes/journal"));
app.use("/api/habits",   require("./routes/habits"));
app.use("/api/insights", require("./routes/insights"));

// Health check
app.get("/api/health", (_, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString() })
);

// Global error handler — must be last
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);