import {
	bgRedBright,
	bgYellowBright,
	black,
	blackBright,
	cyanBright,
	greenBright,
} from "colorette";
import { formatTime } from "../utils/string.js";

enum LogLevel {
	Info = 0,
	Error = 1,
	Warn = 2,
	Success = 3,
}

class Logger {
	public log(...args: unknown[]): void {
		console.log(...args);
	}

	public info(...args: unknown[]): void {
		this.logInformation(LogLevel.Info, ...args);
	}

	public success(...args: unknown[]): void {
		this.logInformation(LogLevel.Success, ...args);
	}

	public error(...args: unknown[]): void {
		this.logInformation(LogLevel.Error, ...args);
	}

	public warn(...args: unknown[]): void {
		this.logInformation(LogLevel.Warn, ...args);
	}

	private logInformation(level: LogLevel, ...args: unknown[]) {
		this.log(blackBright(formatTime(new Date())), this.getLevelTag(level), ...args);
	}

	private getLevelTag(level: LogLevel) {
		switch (level) {
			case LogLevel.Info:
				return cyanBright("i");
			case LogLevel.Success:
				return greenBright("✔");
			case LogLevel.Warn:
				return black(bgYellowBright(" WARN "));
			case LogLevel.Error:
				return black(bgRedBright(" ERROR "));
			default:
				return "-";
		}
	}
}

const logger = new Logger();

export default logger;
