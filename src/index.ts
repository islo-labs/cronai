import { spawnSync } from "node:child_process";
import { program } from "commander";
import { loadConfig, loadCredentials } from "./config.js";
import { Scheduler } from "./scheduler.js";
import { runShift } from "./runner.js";
import { notifySlack } from "./notify.js";

program
  .name("itsovertime")
  .description("Cron for AI agents")
  .version("0.1.0")
  .option("-c, --config <path>", "Path to config file");

// Default command: start TUI
program
  .command("start", { isDefault: true })
  .description("Start the scheduler with TUI dashboard")
  .action(async (_, cmd) => {
    const opts = cmd.optsWithGlobals();
    const config = loadConfig(opts.config);
    const credentials = loadCredentials();
    const scheduler = new Scheduler(config.shifts, credentials, config.configPath);

    const { render } = await import("ink");
    const React = await import("react");
    const { App } = await import("./app.js");

    const onResume = (sessionId: string, shiftName: string) => {
      scheduler.stop().then(() => {
        console.log(`\nResuming session for "${shiftName}"...\n`);
        spawnSync("claude", ["--resume", sessionId], {
          stdio: "inherit",
          cwd: process.cwd(),
          env: process.env,
        });
        process.exit(0);
      });
    };

    const { unmount, waitUntilExit } = render(
      React.createElement(App, { scheduler, onResume })
    );

    const shutdown = async () => {
      await scheduler.stop();
      unmount();
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    await waitUntilExit();
  });

// Run a single shift immediately
program
  .command("run <shift>")
  .description("Run a single shift immediately (no TUI)")
  .action(async (shiftName: string, _, cmd) => {
    const opts = cmd.optsWithGlobals();
    const config = loadConfig(opts.config);
    const credentials = loadCredentials();
    const shift = config.shifts.find((s) => s.name === shiftName);

    if (!shift) {
      console.error(
        `Shift "${shiftName}" not found. Available: ${config.shifts.map((s) => s.name).join(", ")}`
      );
      process.exit(1);
      return;
    }

    console.log(`Running "${shiftName}"...`);
    const result = await runShift(shift, credentials);

    console.log(result.output);
    if (result.error) console.error(result.error);

    const duration = (result.durationMs / 1000).toFixed(1);
    const cost = result.cost ? ` | $${result.cost.toFixed(4)}` : "";
    console.log(
      `\n${result.success ? "✓" : "✗"} ${duration}s${cost}`
    );

    if (shift.notify === "slack") {
      await notifySlack(shiftName, result, credentials);
    }

    process.exit(result.success ? 0 : 1);
  });

// Init wizard
program
  .command("init")
  .description("Set up itsovertime: connect services and create config")
  .action(async () => {
    const { init } = await import("./init.js");
    await init();
  });

program.parse();
