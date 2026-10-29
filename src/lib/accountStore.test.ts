import { beforeEach, describe, expect, it } from "vitest";
import { forgetAccount, readAccounts, saveAccount } from "./accountStore";

const account = (n: number) => ({ userId: `user-${n}`, email: `u${n}@test.localhost`, accessToken: `a${n}`, refreshToken: `r${n}` });

describe("accountStore", () => {
  beforeEach(() => localStorage.clear());

  it("keeps the latest account first and replaces an existing entry", () => {
    saveAccount(account(1));
    saveAccount(account(2));
    saveAccount({ ...account(1), refreshToken: "r1-new" });
    const list = readAccounts();
    expect(list.map((a) => a.userId)).toEqual(["user-1", "user-2"]);
    expect(list[0].refreshToken).toBe("r1-new");
  });

  it("keeps at most five accounts", () => {
    for (let i = 1; i <= 7; i++) saveAccount(account(i));
    expect(readAccounts().map((a) => a.userId)).toEqual(["user-7", "user-6", "user-5", "user-4", "user-3"]);
  });

  it("forgets an account", () => {
    saveAccount(account(1));
    saveAccount(account(2));
    forgetAccount("user-1");
    expect(readAccounts().map((a) => a.userId)).toEqual(["user-2"]);
  });

  it("ignores broken storage", () => {
    localStorage.setItem("criticore-accounts", "{not json");
    expect(readAccounts()).toEqual([]);
    localStorage.setItem("criticore-accounts", JSON.stringify([{ userId: 1 }, account(3)]));
    expect(readAccounts().map((a) => a.userId)).toEqual(["user-3"]);
  });
});
