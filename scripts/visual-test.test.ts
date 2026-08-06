import { afterEach, describe, expect, test } from "bun:test";
import { chmod, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dir, "..");
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true }))
  );
});

async function runVisualTest(
  args: string[],
  path: string,
  environment: Record<string, string> = {}
): Promise<{ exitCode: number; output: string }> {
  const process = Bun.spawn(
    [
      "/bin/bash",
      join(repositoryRoot, "scripts/test-in-docker.sh"),
      "visual",
      ...args,
    ],
    {
      cwd: repositoryRoot,
      env: { ...Bun.env, ...environment, PATH: path },
      stderr: "pipe",
      stdout: "pipe",
    }
  );

  const [exitCode, stdout, stderr] = await Promise.all([
    process.exited,
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
  ]);

  return { exitCode, output: `${stdout}${stderr}` };
}

describe("visual-test command", () => {
  test("explains that Docker is required when its runtime is unavailable", async () => {
    const result = await runVisualTest([], "/usr/bin:/bin");

    expect(result.exitCode).not.toBe(0);
    expect(result.output).toContain(
      "Visual tests require a running Docker daemon."
    );
  });

  test("runs comparisons and updates in the same Docker image", async () => {
    const directory = await mkdtemp(join(tmpdir(), "visual-test-"));
    temporaryDirectories.push(directory);
    const dockerLog = join(directory, "docker.log");
    const fakeDocker = join(directory, "docker");
    await Bun.write(
      fakeDocker,
      `#!/usr/bin/env bash
if [[ "$1" == "info" ]]; then
  exit 0
fi
printf '%s\\n' "$*" >> "$FAKE_DOCKER_LOG"
`
    );
    await chmod(fakeDocker, 0o755);

    const path = `${directory}:/usr/bin:/bin`;
    const environment = { FAKE_DOCKER_LOG: dockerLog };
    const compare = await runVisualTest([], path, environment);
    const update = await runVisualTest(["--update"], path, environment);
    const invocations = await Bun.file(dockerLog).text();

    expect(compare.exitCode).toBe(0);
    expect(update.exitCode).toBe(0);
    expect(invocations).toContain(
      "build --file Dockerfile.visual-test --tag english-draft-visual-test:1.62.1 ."
    );
    expect(invocations).toContain(
      "run --rm --init --ipc=host --volume " +
        `${repositoryRoot}:/work --volume /work/node_modules --workdir /work ` +
        "english-draft-visual-test:1.62.1"
    );
    expect(invocations).toContain(
      "run --rm --init --ipc=host --volume " +
        `${repositoryRoot}:/work --volume /work/node_modules --workdir /work ` +
        "--env UPDATE_SNAPSHOTS=1 english-draft-visual-test:1.62.1"
    );
  });
});
