import { Plugin } from "@vizality/entities";
import { storage } from "@vizality/api";
import { clipboard } from "@vizality/api/native";

export default class MessageLogger extends Plugin {
    constructor() {
        super();
        this.logs = storage.get("messageLogs", []);
    }

    async start() {
        this.logMessage = this.logMessage.bind(this);
        this.onMessageDelete = this.onMessageDelete.bind(this);
        this.onMessageEdit = this.onMessageEdit.bind(this);
        this.copyLogs = this.copyLogs.bind(this);
        this.resetLogs = this.resetLogs.bind(this);
        this.viewLogs = this.viewLogs.bind(this);

        vizality.api.messages.on("messageCreate", this.logMessage);
        vizality.api.messages.on("messageDelete", this.onMessageDelete);
        vizality.api.messages.on("messageUpdate", this.onMessageEdit);

        vizality.api.commands.register({
            command: "log",
            description: "Manage message logging.",
            executor: (args) => {
                if (args[0] === "reset") return this.resetLogs();
                if (args[0] === "view") return this.viewLogs();
                if (args[0] === "copy") return this.copyLogs();
                return { send: false, result: "Usage: /log view | /log copy | /log reset" };
            }
        });
    }

    logMessage(message) {
        this.logs.push({
            type: "Message",
            id: message.id,
            content: message.content,
            author: message.author.username,
            timestamp: new Date().toLocaleString()
        });
        storage.set("messageLogs", this.logs);
    }

    onMessageDelete(message) {
        this.logs.push({
            type: "Deleted",
            id: message.id,
            content: message.content || "[Unknown: Possibly Cached]",
            author: message.author?.username || "[Unknown]",
            timestamp: new Date().toLocaleString()
        });
        storage.set("messageLogs", this.logs);
    }

    onMessageEdit(oldMessage, newMessage) {
        this.logs.push({
            type: "Edited",
            id: oldMessage.id,
            oldContent: oldMessage.content,
            newContent: newMessage.content,
            author: oldMessage.author.username,
            timestamp: new Date().toLocaleString()
        });
        storage.set("messageLogs", this.logs);
    }

    viewLogs() {
        if (this.logs.length === 0) return { send: false, result: "No messages logged yet." };

        let previewLogs = this.logs.slice(-100).map(log =>
            `[${log.timestamp}] ${log.type} | ${log.author}: ${log.content || log.oldContent + " → " + log.newContent}`
        ).join("\n");

        return { send: false, result: `Last 100 Logs:\n\`\`\`${previewLogs}\`\`\`` };
    }

    copyLogs() {
        if (this.logs.length === 0) return { send: false, result: "No logs to copy." };

        let logData = this.logs.map(log =>
            `[${log.timestamp}] ${log.type} | ${log.author}: ${log.content || log.oldContent + " → " + log.newContent}`
        ).join("\n");

        clipboard.copy(logData);
        return { send: false, result: "Logs copied to clipboard!" };
    }

    resetLogs() {
        this.logs = [];
        storage.set("messageLogs", []);
        return { send: false, result: "Message logs reset." };
    }

    stop() {
        vizality.api.messages.off("messageCreate", this.logMessage);
        vizality.api.messages.off("messageDelete", this.onMessageDelete);
        vizality.api.messages.off("messageUpdate", this.onMessageEdit);
        vizality.api.commands.unregister("log");
    }
}
