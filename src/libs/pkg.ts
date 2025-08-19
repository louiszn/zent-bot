import { readFile } from "fs/promises";

import type { PackageJson } from "type-fest";

const pkgContent = await readFile("package.json", "utf-8");
const pkg = JSON.parse(pkgContent) as PackageJson;

export default pkg;
