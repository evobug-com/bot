export const createLogger = (module: string) => {
	return (level: string, message: string, ...args: unknown[]) => {
		if (process.env.NODE_ENV === "development" && level === "debug") {
			console.log(`[${module}] [${level}] ${message}`, ...args);
		} else if (level !== "debug") {
			console.log(`[${module}] [${level}] ${message}`, ...args);
		}
	};
};
