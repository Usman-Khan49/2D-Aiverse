import "dotenv/config";

import { createServer } from "node:http";
import { createHttpApp } from "./http/server.js";

const port = Number(process.env.PORT ?? 4000);
const app = createHttpApp();
const server = createServer(app);


server.listen(port, () => {
	console.log(`Backend listening on http://localhost:${port}`);
});



