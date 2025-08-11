// server.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 8080;

app.use(express.static(__dirname)); // serve all files in current folder

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
