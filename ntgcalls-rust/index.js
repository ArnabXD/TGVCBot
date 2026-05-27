import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

const addonPath = join(__dirname, "ntgcalls.node");
const { NtgCalls } = require(addonPath);

export { NtgCalls };
