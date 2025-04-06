const express = require("express");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const { logger } = require("./utils/logging");
const authRoutes = require("./routes/authRoutes");
const documentRoutes = require("./routes/documentRoutes");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const {
  SecretsManagerClient,
  GetSecretValueCommand,
} = require("@aws-sdk/client-secrets-manager");

const conf = { secret: null };
const secret_name = "editor-keys";

const client = new SecretsManagerClient({
  region: "eu-north-1",
});

async function getConfiguration() {
  try {
    const response = await secretsClient.send(
      new GetSecretValueCommand({
        SecretId: process.env.KEYS_SECRET_ARN,
      })
    );

    if (!response.SecretString) {
      throw new Error("Secret string is empty");
    }

    const secret = JSON.parse(response.SecretString);
    conf.secret = secret;
  } catch (error) {
    console.error("Failed to retrieve KEYS secret:", error);
  }
}
getConfiguration();


const app = express();
const corsOptions = {
  origin: "http://localhost:5173", // Your frontend origin
  credentials: true, // Required for cookies, authorization headers
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));
const PORT = process.env.PORT || 3000;

app.use(helmet()); // secure http headers
app.use(compression()); // compress responses
app.use(express.json()); // parse json bodies
// Parse application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Enable cookie parsing
app.use(morgan("combined", { stream: logger.stream })); // Log HTTP requests
// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});
app.use(limiter);


app.use("/auth", authRoutes);
app.use("/documents", documentRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

module.exports = { app, conf };
