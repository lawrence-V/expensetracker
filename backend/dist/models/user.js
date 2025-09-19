"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformUserToResponse = void 0;
const transformUserToResponse = (user) => ({
    id: user._id.toHexString(),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    createdAt: user.createdAt,
});
exports.transformUserToResponse = transformUserToResponse;
//# sourceMappingURL=user.js.map