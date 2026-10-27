import { describe, expect, it } from "vitest";
import { repoFromGithubUrl } from "./github";

describe("repoFromGithubUrl", () => {
  it("parses repository API URLs", () => {
    expect(
      repoFromGithubUrl("https://api.github.com/repos/acme/app/pulls/12")
    ).toEqual({ owner: "acme", repo: "app" });
    expect(
      repoFromGithubUrl("https://api.github.com/repos/acme/app")
    ).toEqual({ owner: "acme", repo: "app" });
  });

  it("decodes encoded repository names", () => {
    expect(
      repoFromGithubUrl("https://api.github.com/repos/acme/my%20repo/issues/1/comments")
    ).toEqual({ owner: "acme", repo: "my repo" });
  });

  it("ignores non-repository URLs", () => {
    expect(repoFromGithubUrl("https://api.github.com/user")).toBeNull();
    expect(repoFromGithubUrl("https://api.github.com/users/acme")).toBeNull();
    expect(repoFromGithubUrl("https://example.com/repos/acme/app")).toBeNull();
  });
});
