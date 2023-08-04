/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import * as vscode from 'vscode';
import { JsonAny } from 'vscode-messenger-common';

/**
 * Messenger Diagnostic API
 */
export interface MessengerDiagnostic {
    /**
     * @return Some important information about the extension.
     */
    extensionInfo: () => ExtensionInfo;

    /**
     * Adds event listener that will be notified on new events.
     * @return a disposable that removes provided listener from the listeners list.
     */
    addEventListener: (listener: (event: MessengerEvent) => void) => vscode.Disposable;

    /**
     * Allow to remove attached event listener.
     *
     * **Note**: vscode.Disposable returned by addEventListener can also be used to remove the listener from listener list.
     * @return `true` if listener was found and removed
     */
    removeEventListener: (listener: (event: MessengerEvent) => void) => boolean;

}

export interface ExtensionInfo {
    /**
     * @return Information about registered web views
     */
    webviews: Array<{ type: string, id: string }>;

    /**
     * @return Number of currently registered diagnostic listeners.
     */
    diagnosticListeners: number;

    /**
     * @return Number of currently pending requests.
     */
    pendingRequest: number;

    /**
     * @return Number and type of currently registered handlers.
     */
    handlers: Array<{ method: string, count: number }>;

}

export function isMessengerDiagnostic(obj: unknown): obj is MessengerDiagnostic {
    return typeof obj === 'object' && obj !== null
        && !!(obj as MessengerDiagnostic).extensionInfo
        && !!(obj as MessengerDiagnostic).addEventListener
        && !!(obj as MessengerDiagnostic).removeEventListener;
}

export type EventType = 'notification' | 'request' | 'response' | 'unknown';

export interface MessengerEvent {
    id?: string | undefined,
    type: EventType,
    sender: string,
    receiver: string,
    method?: string | undefined,
    error?: string | undefined,
    size: number,
    timestamp: number,
    parameter?: JsonAny | undefined
}

/**
 * Configurations to control the behavior of diagnostic message provider.
 */
export interface DiagnosticOptions {

    /**
     *  If `true` request/notification parameter will be added to the diagnostic MessengerEvent as payload.
     *  If you don't want to expose potential sensible Data to public API set it to false.
     *  Default is: `false`
     */
    withParameterData?: boolean
}
