export function unreachable(checkArg: never): never {
    throw new Error("reached never");
}
