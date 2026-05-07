import { dayjs } from '@/config/date-and-time/dayjs'
import { TIMEZONE } from '@/config/date-and-time/constants'
import path from 'node:path'
import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import LokiTransport from 'winston-loki'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

type BaseFields = Record<string, unknown>

// Config provider injected by the app (e.g., GlobalSettings via GlobalConfigService)
// Note: Winston DailyRotateFile doesn't support dynamic maxSize updates,
// so this is kept for API compatibility but maxSize is set at initialization
type LoggerConfigProvider = { getMaxSizeMB?: () => number | Promise<number> }
export function configureLogger(_provider: LoggerConfigProvider) {
	// Kept for backwards compatibility
}

// Default log directory
const LOG_BASE_DIR = process.env.LOG_DIR || path.join('logs', 'app')

// Default log level - will be updated when SystemConfigService loads
let globalMinLevel: LogLevel = 'debug'

// Tries to capture the file:line:column where the logger was called
function getCallerLocation():
	| { file?: string; line?: number; column?: number; pretty?: string }
	| undefined {
	const original = Error.prepareStackTrace
	try {
		Error.prepareStackTrace = (_, stack) =>
			stack as unknown as NodeJS.CallSite[]
		const err = new Error()
		Error.captureStackTrace(err, getCallerLocation)
		const frames = (err.stack as unknown as NodeJS.CallSite[]) || []

		const loggerFile = __filename

		let target: NodeJS.CallSite | undefined
		for (const f of frames) {
			const file = f.getFileName?.() || ''
			if (!file) continue
			if (file === loggerFile) continue
			if (file.includes('/infra/logging/logger')) continue
			if (file.startsWith('node:')) continue
			if (file.includes('/node_modules/')) continue
			if (file.endsWith('/internal/modules/cjs/loader.js')) continue
			target = f
			break
		}

		if (!target) target = frames[3] || frames[2]
		if (!target) return undefined

		const file = target.getFileName?.()
		const line = target.getLineNumber?.()
		const column = target.getColumnNumber?.()
		const pretty =
			file && line && column ? `${file}:${line}:${column}` : undefined
		return {
			file: file || undefined,
			line: line || undefined,
			column: column || undefined,
			pretty,
		}
	} catch {
		return undefined
	} finally {
		Error.prepareStackTrace = original
	}
}

// Get OpenTelemetry trace context (best-effort)
function getTraceContext(): { traceId?: string; spanId?: string } {
	try {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const api = require('@opentelemetry/api')
		const span = api.trace.getActiveSpan?.()
		const sc = span?.spanContext?.()
		return {
			traceId: sc?.traceId,
			spanId: sc?.spanId,
		}
	} catch {
		return {}
	}
}

// Process error objects for serialization
function processError(err: unknown): Record<string, unknown> {
	if (!(err instanceof Error)) {
		return { message: String(err) }
	}
	return {
		message: err.message,
		stack: err.stack,
		name: err.name,
		...('code' in err && { code: err.code }),
		...('statusCode' in err && { statusCode: err.statusCode }),
		...('details' in err && { details: err.details }),
	}
}

// Custom format to add caller location and trace context
const customFormat = winston.format(info => {
	// Add timestamp in configured timezone
	info.timestamp = dayjs().tz(TIMEZONE).format('YYYY-MM-DDTHH:mm:ss.SSSZ')

	// Add caller location
	const caller = getCallerLocation()
	if (caller?.pretty) {
		info.caller = caller.pretty
	}

	// Add OpenTelemetry trace context
	const trace = getTraceContext()
	if (trace.traceId) info.trace_id = trace.traceId
	if (trace.spanId) info.span_id = trace.spanId

	return info
})()

// Console format for development (colorized and readable)
const devConsoleFormat = winston.format.combine(
	winston.format.colorize(),
	winston.format.printf(({ level, message, timestamp, caller, ...meta }) => {
		const callerStr = caller ? ` 📑 ${caller}` : ''
		const metaStr =
			Object.keys(meta).length > 0 ? `\n${JSON.stringify(meta, null, 2)}` : ''
		return `[${level} - ${timestamp}]${callerStr}\n${message}${metaStr}`
	})
)

// JSON format for production
const prodFormat = winston.format.combine(winston.format.json())

// Determine if we're in development (uses process.env directly as this runs at import time)
const nodeEnv = process.env.NODE_ENV || 'development'
const isDev = nodeEnv === 'development' || nodeEnv === 'test'

// Build transports array
const transports: winston.transport[] = []

// Console transport
transports.push(
	new winston.transports.Console({
		format: isDev ? devConsoleFormat : prodFormat,
	})
)

// Daily rotate file transport
const fileTransport = new DailyRotateFile({
	dirname: path.resolve(process.cwd(), LOG_BASE_DIR),
	filename: 'app-%DATE%.log',
	datePattern: 'YYYY-MM-DD',
	maxSize: '5m', // Will be updated dynamically if configProvider is set
	maxFiles: '30d',
	format: winston.format.combine(winston.format.json()),
})

transports.push(fileTransport)

// Loki transport will be added dynamically after SystemConfigService loads

// Create the base Winston logger
const winstonLogger = winston.createLogger({
	level: globalMinLevel,
	format: winston.format.combine(
		customFormat,
		winston.format.errors({ stack: true })
	),
	transports,
	exitOnError: false,
})

// Logger interface (same as before)
export type Logger = {
	child(extra: BaseFields): Logger
	debug(msg: string, extra?: BaseFields): void
	info(msg: string, extra?: BaseFields): void
	warn(msg: string, extra?: BaseFields): void
	error(msg: string, extra?: BaseFields & { err?: unknown }): void
}

// Create a logger with base fields
export function createLogger(base: BaseFields = {}): Logger {
	const baseFields = { ...base, component: base['component'] || 'app' }

	// Create a child logger with default metadata
	const childWinston = winstonLogger.child(baseFields)

	return {
		child(extra: BaseFields): Logger {
			return createLogger({ ...baseFields, ...extra })
		},
		debug(msg: string, extra?: BaseFields) {
			childWinston.debug(msg, extra)
		},
		info(msg: string, extra?: BaseFields) {
			childWinston.info(msg, extra)
		},
		warn(msg: string, extra?: BaseFields) {
			childWinston.warn(msg, extra)
		},
		error(msg: string, extra?: BaseFields & { err?: unknown }) {
			const processedExtra = { ...(extra || {}) }
			if (processedExtra.err) {
				processedExtra.err = processError(processedExtra.err)
			}
			childWinston.error(msg, processedExtra)
		},
	}
}

export const logger = createLogger({ component: 'app' })

// Track if Loki has been configured
let lokiConfigured = false

/**
 * Configures and adds Loki transport dynamically.
 * Should be called after SystemConfigService loads the observability config.
 */
export function configureLokiTransport(config: {
	lokiUrl: string
	lokiUsername?: string
	lokiPassword?: string
	serviceName?: string
	logLevel?: LogLevel
}): void {
	if (lokiConfigured) {
		console.log('[LOGGER] Loki transport already configured, skipping')
		return
	}

	const lokiTransport = new LokiTransport({
		host: config.lokiUrl,
		basicAuth:
			config.lokiUsername && config.lokiPassword
				? `${config.lokiUsername}:${config.lokiPassword}`
				: undefined,
		labels: {
			app: config.serviceName || 'wpp-bot-api',
			env: nodeEnv,
		},
		json: true,
		format: winston.format.json(),
		replaceTimestamp: true,
		onConnectionError: (err: Error) => {
			console.error('[LOKI] Connection error:', err.message)
		},
	})

	winstonLogger.add(lokiTransport)
	lokiConfigured = true

	// Update log level if provided
	if (config.logLevel) {
		winstonLogger.level = config.logLevel
		globalMinLevel = config.logLevel
	}

	console.log(
		`[LOGGER] Loki transport added | host=${config.lokiUrl} | level=${winstonLogger.level}`
	)
}

/**
 * Updates the global log level.
 */
export function setLogLevel(level: LogLevel): void {
	winstonLogger.level = level
	globalMinLevel = level
	console.log(`[LOGGER] Log level updated to: ${level}`)
}

// Log startup info
const activeTransports = ['console', 'file']
console.log(
	`[LOGGER] Initialized | level=${globalMinLevel} | transports=${activeTransports.join(',')} | env=${nodeEnv}`
)
