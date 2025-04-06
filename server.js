require("dotenv").config();
const { initializeDatabase, sequelize } = require("./db");
const {app} = require("./app");
const { initializeModels } = require("./models/models");

const PORT = process.env.PORT || 3000;

async function start() {
  await initializeDatabase();
  initializeModels();

  try {
    // 3. Start server
    app.listen(PORT, () => {
      console.log(
        `Server running on port ${PORT} (${
          process.env.NODE_ENV || "development"
        })`
      );
    });
  } catch (error) {
    console.error("Startup failed:", error);
    process.exit(1);
  }
}

start();
