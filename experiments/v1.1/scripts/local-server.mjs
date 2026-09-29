import { closeSync, existsSync, openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pidPath = resolve(projectRoot, ".local-server.pid");
const stdoutPath = resolve(projectRoot, ".local-server.out.log");
const stderrPath = resolve(projectRoot, ".local-server.err.log");
const vinextCli = resolve(projectRoot, "node_modules", "vinext", "dist", "cli.js");
// 实验副本默认使用 3001，避免和正式项目的 3000 端口互相占用。
const localPort = process.env.AMADEUS_PORT ?? "3001";
const localUrl = `http://127.0.0.1:${localPort}/`;

function readPid() {
  if (!existsSync(pidPath)) return undefined;
  const pid = Number.parseInt(readFileSync(pidPath, "utf8").trim(), 10);
  return Number.isInteger(pid) && pid > 0 ? pid : undefined;
}

function isRunning(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function removePidFile() {
  if (existsSync(pidPath)) unlinkSync(pidPath);
}

async function isReady() {
  try {
    const response = await fetch(localUrl, { signal: AbortSignal.timeout(1500) });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitUntilReady(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isReady()) return true;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
  }
  return false;
}

function tail(path, maxLines = 30) {
  if (!existsSync(path)) return "";
  return readFileSync(path, "utf8").split(/\r?\n/).slice(-maxLines).join("\n");
}

async function start() {
  const existingPid = readPid();
  if (isRunning(existingPid)) {
    if (await isReady()) {
      console.log(`Amadeus 已在运行：${localUrl}`);
      return;
    }
    throw new Error(`检测到进程 ${existingPid} 仍在运行，但网站没有响应。请先运行 npm run local:stop。`);
  }
  removePidFile();

  if (await isReady()) {
    console.log(`Amadeus 已在运行：${localUrl}`);
    return;
  }
  if (!existsSync(vinextCli)) {
    throw new Error("未找到本地依赖，请先运行 npm install。");
  }

  const stdoutFd = openSync(stdoutPath, "w");
  const stderrFd = openSync(stderrPath, "w");
  const child = spawn(
    process.execPath,
    [vinextCli, "dev", "--hostname", "127.0.0.1", "--port", localPort],
    {
      cwd: projectRoot,
      detached: true,
      env: process.env,
      stdio: ["ignore", stdoutFd, stderrFd],
      windowsHide: true,
    },
  );
  writeFileSync(pidPath, `${child.pid}\n`, "utf8");
  child.unref();
  closeSync(stdoutFd);
  closeSync(stderrFd);

  if (!(await waitUntilReady())) {
    try {
      process.kill(child.pid);
    } catch {
      // The child may already have exited.
    }
    removePidFile();
    const errorOutput = tail(stderrPath) || tail(stdoutPath);
    throw new Error(`本地服务启动失败。\n${errorOutput}`);
  }

  console.log(`Amadeus 本地服务已启动：${localUrl}`);
}

async function stop() {
  const pid = readPid();
  if (!isRunning(pid)) {
    removePidFile();
    console.log("Amadeus 本地服务当前未运行。");
    return;
  }
  process.kill(pid);
  removePidFile();
  console.log("Amadeus 本地服务已停止。");
}

async function status() {
  const pid = readPid();
  const running = isRunning(pid);
  const ready = await isReady();
  if (ready) {
    const pidLabel = running ? `（PID ${pid}）` : "";
    console.log(`Amadeus 正常运行：${localUrl}${pidLabel}`);
    return;
  }
  if (running) {
    console.log(`Amadeus 进程存在但网站未响应（PID ${pid}）。`);
    process.exitCode = 1;
    return;
  }
  console.log("Amadeus 本地服务当前未运行。");
  process.exitCode = 1;
}

const action = process.argv[2] ?? "start";

try {
  if (action === "start") await start();
  else if (action === "stop") await stop();
  else if (action === "status") await status();
  else throw new Error(`未知操作：${action}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
