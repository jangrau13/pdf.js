import log from 'loglevel'
import prefix from "loglevel-plugin-prefix";

log.noConflict()
prefix.reg(log);

prefix.apply(log, {
    template: '[%t] %l (%n):',
    levelFormatter(level) {
        return level.toUpperCase();
    },
    nameFormatter(name) {
        return name || 'wiserEventBus';
    },
    timestampFormatter(date) {
        return date.toISOString();
    },
});


const WiserEventBus = {
    events: {},
    on(event, listener) {
        log.info('received event', event)
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
    },
    off(event, listenerToRemove) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(listener => listener !== listenerToRemove);
    },
    emit(event, data) {
        if (!this.events[event]) return;
        this.events[event].forEach(listener => listener(data));
    },
};
export default WiserEventBus;

