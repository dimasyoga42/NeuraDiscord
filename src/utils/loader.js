import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

export const loadCommands = async (app) => {
  const commandPath = path.resolve("./src/commands");

  const files = fs
    .readdirSync(commandPath)
    .filter((file) => file.endsWith(".js"));

  for (const file of files) {
    const filePath = path.join(commandPath, file);

    const command = await import(pathToFileURL(filePath));

    if (!command.default?.name) continue;

    app.commands.set(command.default.name, command.default);

    console.log(`loaded command ${command.default.name}`);
  }
};

export const loadEvents = async (app) => {
  const eventPath = path.resolve("./src/events");

  const files = fs
    .readdirSync(eventPath)
    .filter((file) => file.endsWith(".js"));

  for (const file of files) {
    const filePath = path.join(eventPath, file);

    const event = await import(pathToFileURL(filePath));

    const execute = (...args) => event.default.execute(...args, app);

    if (event.default.once) {
      app.once(event.default.name, execute);
    } else {
      app.on(event.default.name, execute);
    }

    console.log(`loaded event ${event.default.name}`);
  }
};
