import { afterEach, describe, expect, it, vi } from "vitest";

const connect = vi.fn();
const disconnect = vi.fn();

vi.mock("mongoose", () => ({
  default: {
    connect,
    disconnect,
    connection: { readyState: 0 },
  },
}));

describe("MongoDB connection", () => {
  afterEach(() => {
    connect.mockReset();
    disconnect.mockReset();
    vi.resetModules();
  });

  it("rejects missing configuration without attempting a connection", async () => {
    const { connectToDatabase, DatabaseConfigurationError } = await import("../src/server/db.js");

    await expect(connectToDatabase({})).rejects.toBeInstanceOf(DatabaseConfigurationError);
    expect(connect).not.toHaveBeenCalled();
  });

  it("reuses the in-flight connection during hot reloads", async () => {
    const connection = { connection: "mock" };
    connect.mockResolvedValue(connection);
    const { connectToDatabase } = await import("../src/server/db.js");
    const env = { MONGODB_URI: "mongodb://localhost/failure-test" };

    const first = connectToDatabase(env);
    const second = connectToDatabase(env);

    await expect(first).resolves.toBe(connection);
    await expect(second).resolves.toBe(connection);
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it("clears the cache after a connection failure", async () => {
    connect.mockRejectedValueOnce(new Error("unavailable")).mockResolvedValue({ connection: "ok" });
    const { connectToDatabase } = await import("../src/server/db.js");
    const env = { MONGODB_URI: "mongodb://localhost/test" };

    await expect(connectToDatabase(env)).rejects.toThrow("unavailable");
    await expect(connectToDatabase(env)).resolves.toEqual({ connection: "ok" });
    expect(connect).toHaveBeenCalledTimes(2);
  });
});
