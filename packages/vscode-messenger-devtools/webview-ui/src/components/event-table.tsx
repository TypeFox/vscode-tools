/* eslint-disable @typescript-eslint/no-explicit-any */
import { ColDef, GridApi } from 'ag-grid-community';
import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-alpine-dark.css';
import 'ag-grid-community/dist/styles/ag-theme-alpine.css';
import { AgGridReact } from 'ag-grid-react';
import React from 'react';
import { MessengerEvent } from 'vscode-messenger';
import { ExtendedMessengerEvent } from '../devtools-view';

const columnDefs: ColDef[] = [
    {
        field: 'type',
        initialWidth: 110,
        cellRenderer: (params: any) => {
            const rowType = params.data.type ?? 'unknown';
            const error = params.data.error ? <span className='table-cell codicon codicon-stop' title={params.data.error}></span> : undefined;
            return <div className={'rowType_' + rowType} style={{ display: 'flex', alignContent: 'space-between' }}><span style={{ flexGrow: 1 }}>{params.value}</span>{error}</div>;
        }
    },
    { field: 'sender', initialWidth: 180 },
    { field: 'receiver', initialWidth: 180 },
    {
        field: 'method', initialWidth: 135,
        tooltipField: 'methodTooltip'
    },
    {
        field: 'size', headerName: 'Size (Time)', initialWidth: 135,
        cellRenderer: (params: any) => {
            const event = (params.data as ExtendedMessengerEvent);
            const charsCount = Intl.NumberFormat('en', { notation: 'compact' }).format(event.size);
            if (event.type === 'response' && typeof event.timeAfterRequest === 'number') {
                const tookMs = event.timeAfterRequest % 1000;
                const tookSec = Math.trunc(event.timeAfterRequest / 1000);
                const secPart = (tookSec > 0) ? `${tookSec}s ` : '';
                return `${charsCount} (${secPart}${tookMs}ms)`;
            }
            return charsCount;

        }
    },
    { field: 'id' },
    {
        field: 'timestamp',
        initialWidth: 135,
        cellRenderer: (params: any) => {
            const time = params.data.timestamp;
            if (typeof time === 'number') {
                const date = new Date(time);
                const prependZero = (n: number) => ('0' + n).slice(-2);
                return `${prependZero(date.getHours())}:${prependZero(date.getMinutes())}:${prependZero(date.getSeconds())}-${('00' + date.getMilliseconds()).slice(-3)}`;
            }
            return String(time);
        }
    },
    { field: 'error' },
];

/**
 *  Table that shows messages exchanged between the extension and the webviews.
 */
export class EventTable extends React.Component {

    gridRefObj: React.RefObject<AgGridReact<MessengerEvent>>;
    props: { gridRowSelected: (e: any) => void };

    constructor(props: { gridRowSelected: (e: any) => void }) {
        super({});
        this.props = props;
        this.gridRefObj = React.createRef();
    }

    getGridApi(): GridApi<MessengerEvent> | undefined {
        return this.gridRefObj.current?.api;
    }

    render(): JSX.Element {
        return (
            <div id='event-table'
                className={getComputedStyle(document.getElementById('root')!).getPropertyValue('--event-table-class')}>
                <AgGridReact
                    ref={this.gridRefObj}
                    columnDefs={
                        columnDefs.map(col => {
                            return {
                                filter: true, resizable: true, sortable: true,
                                cellStyle: (params: any) => {
                                    if (params.value === 'Police') {
                                        //mark police cells as red
                                        return { color: 'red', backgroundColor: 'green' };
                                    }
                                    return null;
                                },
                                tooltipField: col.field,
                                ...col
                            };
                        })}
                    rowHeight={25}
                    headerHeight={28}
                    enableBrowserTooltips={true}
                    onCellFocused={(e) => this.props.gridRowSelected(e)}
                >
                </AgGridReact>
            </div>
        );
    }
}