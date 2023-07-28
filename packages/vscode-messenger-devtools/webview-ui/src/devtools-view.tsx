/* eslint-disable @typescript-eslint/no-explicit-any */
import { VSCodeBadge } from '@vscode/webview-ui-toolkit/react';
import { CellFocusedEvent } from 'ag-grid-community';
import React from 'react';
import { ExtensionInfo, MessengerEvent } from 'vscode-messenger';
import { BROADCAST, HOST_EXTENSION } from 'vscode-messenger-common';
import { Messenger } from 'vscode-messenger-webview';
import '../css/devtools-view.css';
import '../node_modules/@vscode/codicons/dist/codicon.css';
import '../node_modules/@vscode/codicons/dist/codicon.ttf';
import { Diagram, HighlightData, toLinkId, updateLinks } from './components/diagram';
import { EventTable } from './components/event-table';
import { ReactECharts, collectChartData, createOptions } from './components/react-echart';
import { ViewHeader } from './components/view-header';
import { DevtoolsComponentState, restoreState, storeState, vsCodeApi } from './utilities/view-state';

export interface ExtensionData {
    id: string
    name: string
    active: boolean
    exportsDiagnosticApi: boolean
    info?: ExtensionInfo
    events: ExtendedMessengerEvent[]
}
export interface ExtendedMessengerEvent extends MessengerEvent {
    timeAfterRequest?: number
    methodTooltip?: string
}

class DevtoolsComponent extends React.Component<Record<string, any>, DevtoolsComponentState>{

    messenger: Messenger;
    eventTable: EventTable;

    constructor() {
        super({});
        const storedState = restoreState();
        this.state = {
            selectedExtension: storedState?.selectedExtension ?? '',
            datasetSrc: new Map(storedState?.datasetSrc) ?? new Map(),
            chartsShown: storedState?.chartsShown ?? false,
            diagramShown: storedState?.diagramShown ?? false
        };
        this.eventTable = new EventTable({ gridRowSelected: (e) => this.gridRowSelected(e) });
        this.messenger = new Messenger(vsCodeApi, { debugLog: true });
        this.messenger.onNotification<{ extension: string, event: ExtendedMessengerEvent }>({ method: 'pushData' }, e => this.handleDataPush(e));
        this.messenger.start();
        this.fillExtensionsList(false).then(() => {
            if (this.state.selectedExtension === '' && this.state.datasetSrc.size > 0) {
                // set first entry as selected extension
                this.updateState({ ...this.state, selectedExtension: this.state.datasetSrc.keys().next().value }, true);
            } else {
                this.updateState(this.state, true);
            }
        });

    }

    render() {

        const charSeries = collectChartData(this.selectedExtensionData()?.events ?? []);
        const optionSize = createOptions(charSeries.series[0], charSeries.senderY, '  (chars)');
        const optionCount = createOptions(charSeries.series[1], charSeries.senderY);

        const selectedExt = this.selectedExtensionData();
        const updateState = (selectedId: string) => {
            this.updateState({ ...this.state, selectedExtension: selectedId }, true);
        };

        const headerToggleDiagram = () => {
            this.updateState({ ...this.state, diagramShown: !this.state.diagramShown, chartsShown: false }, false);
            const diagramDiv = document.getElementById('diagram');
            if (diagramDiv) {
                if (diagramDiv.style.display === 'none') {
                    diagramDiv.style.display = 'flex';
                    diagramDiv.style.visibility = 'visible';
                    if (updateLinks)
                        updateLinks([]);
                } else {
                    diagramDiv.style.display = 'none';
                    diagramDiv.style.visibility = 'hidden';
                }
            }
        };
        const onToggleCharts =
            () => {
                this.updateState({ ...this.state, chartsShown: !this.state.chartsShown, diagramShown: false }, false);
                const chartsDiv = document.getElementById('charts');
                if (chartsDiv) {
                    if (chartsDiv.style.display === 'none') {
                        chartsDiv.style.display = 'flex';
                        chartsDiv.style.visibility = 'visible';
                        optionCount.animation = true; // triggers chats resize
                    } else {
                        chartsDiv.style.display = 'none';
                        chartsDiv.style.visibility = 'hidden';
                        optionCount.animation = false;
                    }
                }
            };
        return (
            <>
                <ViewHeader
                    state={{ selectedExtension: this.state.selectedExtension, extensions: Array.from(this.state.datasetSrc.values()) }}
                    onExtensionSelected={(extId: string) => updateState(extId)}
                    onRefreshClicked={() => this.fillExtensionsList(true)}
                    onClearClicked={async (extId: string | undefined) => await this.clearExtensionData(extId)}
                    onToggleDiagram={headerToggleDiagram}
                    onToggleCharts={onToggleCharts}
                />
                <div id='ext-info'>
                    <span className='info-param-name'>Status:</span>
                    <span
                        className={
                            'ext-info-badge codicon codicon-'
                            + (!selectedExt?.active ? 'warning' : (!selectedExt?.exportsDiagnosticApi ? 'stop' : 'pass'))
                        }
                        title={
                            'Extension '
                            + (!selectedExt?.active ? 'is not active' :
                                (!selectedExt?.exportsDiagnosticApi ? "doesn't export diagnostic API" : 'is active and exports diagnostic API.'))
                        } />

                    <span className='info-param-name'>Views:</span>
                    <VSCodeBadge className='ext-info-badge' title={
                        'Registered views:\n' + (selectedExt?.info?.webviews ?? []).map(entry => '  ' + entry.id).join('\n')
                    }>{selectedExt?.info?.webviews.length ?? 0}</VSCodeBadge>

                    <span className='info-param-name'>Listeners:</span>
                    <VSCodeBadge className='ext-info-badge'
                        title='Number of registered diagnostic listeners.'>{selectedExt?.info?.diagnosticListeners ?? 0}</VSCodeBadge>

                    <span className='info-param-name'>Handlers:</span>
                    <VSCodeBadge className='ext-info-badge'
                        title={
                            'Number of added method handlers: \n' + (selectedExt?.info?.handlers ?? []).map(entry => '  ' + entry.method + ': ' + entry.count).join('\n')
                        }>{Array.from(selectedExt?.info?.handlers?.values() ?? []).length}</VSCodeBadge>

                    <span className='info-param-name'>Events:</span>
                    <VSCodeBadge className='ext-info-badge'>{selectedExt?.events.length ?? 0}</VSCodeBadge>
                </div>

                {/* Table Component */}
                {this.eventTable.render()}

                {/* Chart Components */}
                <div id='charts' style={{ display: this.state.chartsShown ? 'flex' : 'none' }}>
                    <ReactECharts option={optionCount} />
                    <ReactECharts option={optionSize} />
                </div>
                <div id='diagram' style={{ display: this.state.diagramShown ? 'flex' : 'none', height: '200px', width: '100%' }} >
                    {
                        this.state.diagramShown &&
                        <Diagram extensionName={selectedExt?.name ?? ''}
                            webviews={selectedExt?.info?.webviews ?? []}
                            doCenter={this.state.diagramShown}
                        />
                    }
                </div>
            </>
        );
    }

    private handleDataPush(dataEvent: { extension: string, event: ExtendedMessengerEvent }): void {
        if (!this.state.datasetSrc.has(dataEvent.extension)) {
            this.updateExtensionData({ id: dataEvent.extension, name: '', active: true, exportsDiagnosticApi: true, events: [] });
        }
        const extensionData = this.state.datasetSrc.get(dataEvent.extension)!;

        const highlight: HighlightData[] = [];

        if (dataEvent.event.type === 'response' && dataEvent.event.timestamp) {
            // Take max 200 entries to look-up
            const request = extensionData.events.slice(0, 200).find(event => event.type === 'request' && event.id === dataEvent.event.id);
            if (request && request.timestamp) {
                dataEvent.event.timeAfterRequest = dataEvent.event.timestamp - request.timestamp;
                highlight.push({ link: toLinkId(dataEvent.event.receiver, dataEvent.event.sender), type: 'request' });
            }
        }

        if (dataEvent.event.type === 'notification' || dataEvent.event.type === 'request') {
            if (dataEvent.event.parameter) {
                dataEvent.event.methodTooltip = `Parameter (max 500 chars):\n ${JSON.stringify(dataEvent.event.parameter, undefined, '  ').substring(0, 499)}`;
            } else {
                dataEvent.event.methodTooltip = 'Parameters are empty or suppressed using diagnostic API options.';
            }
        }

        extensionData.events.unshift(dataEvent.event);

        highlight.push(...this.createHighlightData(extensionData, dataEvent.event));
        this.updateDiagramEventHighlight(...highlight);

        this.updateState(this.state, this.state.selectedExtension === dataEvent.extension);
    }

    updateDiagramEventHighlight(...highlights: HighlightData[]): void {
        if (updateLinks) {
            updateLinks(highlights);
        }
    }

    createHighlightData(extensionData: ExtensionData, msgEvent: ExtendedMessengerEvent): HighlightData[] {
        const viewsByType = extensionData.info?.webviews.filter(view => msgEvent.receiver === BROADCAST.type || view.type === msgEvent.receiver) ?? [];
        if (viewsByType.length > 0) {
            if (msgEvent.receiver === BROADCAST.type) {
                // for broadcast, events first send to the extension host
                return [
                    { link: toLinkId(msgEvent.sender, 'host extension'), type: msgEvent.type },
                    ...viewsByType.filter(view => view.id !== msgEvent.sender)
                        .map(view => { return { link: toLinkId('host extension', view.id), type: msgEvent.type }; })
                ];
            }
            // webview type receiver
            return viewsByType.map(view => { return { link: toLinkId(msgEvent.sender, view.id), type: msgEvent.type }; });
        } else {
            return [{ link: toLinkId(msgEvent.sender, msgEvent.receiver), type: msgEvent.type }];
        }
    }

    updateState(newState: DevtoolsComponentState, refreshTable: boolean) {
        this.setState(newState, () => {
            // Callback after `this.state`was updated
            storeState(this.state);
            if (refreshTable) {
                // refresh table
                this.eventTable.getGridApi()?.setRowData(this.selectedExtensionData()?.events ?? []);
            }
        });
    }

    selectedExtensionData(): ExtensionData | undefined {
        return this.state.datasetSrc.get(this.state.selectedExtension);
    }

    async fillExtensionsList(refresh: boolean): Promise<void> {
        const extensions = await this.messenger.sendRequest<{ refresh: boolean }, ExtensionData[]>({ method: 'extensionList' }, HOST_EXTENSION, { refresh });
        extensions.forEach(ext => this.updateExtensionData(ext));
        this.updateState(this.state, true);
    }

    async clearExtensionData(extensionId: string | undefined): Promise<void> {
        if (!extensionId) {
            return;
        }
        const extData = this.state.datasetSrc.get(extensionId);
        if (extData) {
            extData.events = [];
            this.updateState(this.state, true);
        }
    }

    updateExtensionData(ext: ExtensionData) {
        const data = this.state.datasetSrc;
        if (!data.has(ext.id)) {
            data.set(ext.id, { ...ext, events: [] }); // received ExtensionData don't have events
        } else {
            const existing = data.get(ext.id);
            // merge data
            data.set(ext.id, { ...ext, events: existing?.events ?? [] });
        }
    }

    gridRowSelected(event: CellFocusedEvent<ExtendedMessengerEvent>): void {
        const selectedExt = this.selectedExtensionData();
        if (selectedExt && event.rowIndex !== null) {
            const row = event.api.getDisplayedRowAtIndex(event.rowIndex);
            if (row?.data) {
                this.updateDiagramEventHighlight(...this.createHighlightData(selectedExt, row.data));
            }
        }
    }
}

export default DevtoolsComponent;
