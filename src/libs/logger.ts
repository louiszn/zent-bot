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
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public log(...args: any[]): void {
		console.log(...args);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public info(...args: any[]): void {
		this.logInformation(LogLevel.Info, ...args);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public success(...args: any[]): void {
		this.logInformation(LogLevel.Success, ...args);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public error(...args: any[]): void {
		this.logInformation(LogLevel.Error, ...args);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public warn(...args: any[]): void {
		this.logInformation(LogLevel.Warn, ...args);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private logInformation(level: LogLevel, ...args: any[]) {
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
