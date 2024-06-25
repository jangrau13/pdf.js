class WISERLogger {
    constructor(config = {}) {
        if (WISERLogger.instance) {
            return WISERLogger.instance;
        }

        this.config = config;
        this.history = [];

        WISERLogger.instance = this;
    }

    log(message, additionalInfo = {}) {
        const { showFileName = false, showFunctionName = false } = this.config;
        const logEntry = { message, timestamp: new Date().toISOString(), ...additionalInfo };

        if (showFileName || showFunctionName) {
            try {
                throw new Error();
            } catch (e) {
                const stack = e.stack.split('\n');
                const callerInfo = stack[2] ? stack[2].trim() : stack[1].trim();
                if (showFileName) {
                    logEntry.fileName = this.extractFileName(callerInfo);
                }
                if (showFunctionName) {
                    logEntry.functionName = this.extractFunctionName(callerInfo);
                }
            }
        }

        this.history.push(logEntry);
        this.printLog(logEntry);
    }

    extractFileName(stackInfo) {
        const match = stackInfo.match(/\((.*):\d+:\d+\)/);
        return match ? match[1].split('/').pop() : 'unknown file';
    }

    extractFunctionName(stackInfo) {
        const match = stackInfo.match(/at (\S+)/);
        return match ? match[1] : 'anonymous function';
    }

    printLog(logEntry) {
        let logMessage = `${logEntry.timestamp} - ${logEntry.message}`;
        if (logEntry.fileName) {
            logMessage += ` | File: ${logEntry.fileName}`;
        }
        if (logEntry.functionName) {
            logMessage += ` | Function: ${logEntry.functionName}`;
        }
        console.log(logMessage);
    }

    downloadLogs() {
        const blob = new Blob([this.history.map(entry => {
            return `${entry.timestamp} - ${entry.message}` +
                (entry.fileName ? ` | File: ${entry.fileName}` : '') +
                (entry.functionName ? ` | Function: ${entry.functionName}` : '');
        }).join('\n')], { type: 'text/plain' });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'logs.txt';
        a.click();
        URL.revokeObjectURL(url);
    }

    setConfig(config) {
        this.config = { ...this.config, ...config };
    }

    getHistory() {
        return this.history;
    }
}

// Singleton Instance
const wiserLoggerInstance = new WISERLogger({ showFileName: true, showFunctionName: true });

// Exporting for use in worker context
if (typeof self !== 'undefined' && self instanceof WorkerGlobalScope) {
    self.CustomLogger = WISERLogger;
    self.wiserLogger = wiserLoggerInstance;
} else if (typeof window !== 'undefined') {
    window.CustomLogger = WISERLogger;
    window.wiserLogger = wiserLoggerInstance;
}