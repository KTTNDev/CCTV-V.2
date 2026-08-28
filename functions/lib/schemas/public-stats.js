"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicStatsSchema = void 0;
const zod_1 = require("zod");
exports.publicStatsSchema = zod_1.z
    .object({
    recordVisit: zod_1.z
        .boolean()
        .optional()
        .default(false),
})
    .strict();
//# sourceMappingURL=public-stats.js.map