import { createApplicationServer } from "./app.js";
import { loadServerEnv } from "./env.js";

const env = loadServerEnv();
const server = createApplicationServer(process.env);
server.listen(env.PORT, () => {
  console.info(`Profile2Resume listening on port ${env.PORT}`);
});
