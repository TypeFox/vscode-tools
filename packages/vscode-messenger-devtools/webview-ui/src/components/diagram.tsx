import React, { useEffect, useRef, useState } from 'react';
import ForceGraph2D, { ForceGraphMethods, GraphData, LinkObject, NodeObject } from 'react-force-graph-2d';
import { HOST_EXTENSION_NAME } from '../devtools-view';

type GraphObjectExtension = {
    name: string;
    value: number;
}

type ComponentNode = NodeObject & GraphObjectExtension & {
    shortName: string;
    outdated: boolean;
}
type ComponentLink = LinkObject & GraphObjectExtension

let graphData: GraphData = { nodes: [], links: [] };

let storedProps: DiagramProps = {
    extensionName: '',
    webviews: [],
    outdatedWebviews: [],
    doCenter: false
};

type WebviewInfo = {
    id: string
    type: string
}

type DiagramProps = {
    extensionName: string
    webviews: WebviewInfo[]
    outdatedWebviews: string[]
    doCenter: boolean
}

function createDiagramData(componentProps: DiagramProps): GraphData {
    if (!componentProps) {
        return graphData;
    }
    const toCompareString = (state: DiagramProps) =>
        `${state.extensionName} ${[...state.webviews.map(wv => wv.id), ...state.outdatedWebviews.map(wvId => '#' + wvId)].join(',')}`;
    if (toCompareString(storedProps) === toCompareString(componentProps)) {
        // same data, just return the existing graph data
        return graphData;
    }
    // reset graphData, store new state
    graphData = { nodes: [], links: [] };

    storedProps = componentProps;

    const unqualifiedName = (name: string) => name.split('.').pop();

    if (componentProps.extensionName) {
        graphData.nodes.push({
            id: HOST_EXTENSION_NAME,
            name: componentProps.extensionName,
            shortName: unqualifiedName(componentProps.extensionName),
            nodeLabel: 'Host',
            outdated: false,
            value: 10
        } as ComponentNode);

    }

    const createNodeAndLinks = (webview: WebviewInfo, outdated = false) => {
        const linkDist = outdated ? 30 : 40;
        graphData.nodes.push({
            id: webview.id,
            name: webview.type,
            shortName: unqualifiedName(webview.type),
            outdated,
            value: outdated ? 7 : 7,
        } as ComponentNode);
        // connect both ends to send particles both directions
        graphData.links.push({
            source: HOST_EXTENSION_NAME,
            target: webview.id,
            name: `${HOST_EXTENSION_NAME} to ${webview.id}`,
            value: linkDist
        } as ComponentLink);
        graphData.links.push({
            source: webview.id,
            target: HOST_EXTENSION_NAME,
            name: `${webview.id} to ${HOST_EXTENSION_NAME}`,
            value: linkDist
        } as ComponentLink);
    };
    componentProps.webviews.forEach(view => createNodeAndLinks(view));
    componentProps.outdatedWebviews.forEach(view =>
        createNodeAndLinks({ id: view, type: view }, true)
    );
    return graphData;
}

export type HighlightData = { link: string | string[], type: string }

export let updateLinks: (update: HighlightData[]) => void = () => void 0;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Diagram(props: DiagramProps): JSX.Element {

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [highlightLinks, setHighlightLinks] = useState(Array<HighlightData>());
    updateLinks = setHighlightLinks;

    function toParticleColor(type: string | undefined): string {
        switch (type) {
            case 'request': return '#3794ff';
            case 'response': return '#487e02';
            case 'notification': return '#cca700';
            default: return '';
        }
    }
    const diagramRef = useRef<ForceGraphMethods>();

    useEffect(() => {
        setTimeout(() => {
            if (diagramRef.current && props.doCenter) {
                // set distance between nodes
                diagramRef.current.d3Force('link')?.distance((link: { value: number }) => link.value);
                // center diagram after diagram panel is shown
                diagramRef.current.zoomToFit(500, 50);
            }
        }, 150);
    }, [props.doCenter]);

    const graphData = createDiagramData(props);
    let particleSize = 0;
    let particleColor: string | undefined = undefined;

    useEffect(() => {
        highlightLinks.forEach((highlight, index) => {
            const initiateParticle = (linkStr: string) => {
                const linkObj = graphData.links.find(link => linkStr === linkId(link));
                if (linkObj) {

                    setTimeout(() => {
                        particleSize = 4;
                        particleColor = toParticleColor(highlight.type);
                        diagramRef.current?.emitParticle(linkObj);
                    }, index * 600);
                }
            };
            if (Array.isArray(highlight.link)) {
                // broadcast case
                highlight.link.forEach(initiateParticle);
            } else {
                initiateParticle(highlight.link);
            }
        });
    }, [highlightLinks]);

    return <ForceGraph2D
        ref={diagramRef}
        graphData={graphData}
        height={200}
        nodeAutoColorBy="name" // uses Node's property name
        nodeLabel="shortName"
        linkAutoColorBy="name"
        linkDirectionalParticles={particleSize}
        linkDirectionalParticleSpeed={0.01}
        linkDirectionalParticleColor={particleColor}
        nodeCanvasObject={(rawNode, ctx, _globalScale) => {
            rawNode.vx = 10;
            rawNode.vy = 10;
            paintNode(rawNode, (rawNode as { color: string }).color, ctx);
        }}
        nodePointerAreaPaint={paintNode}
    />;

}

function linkId(link: LinkObject): string {
    return toLinkId((link.source as NodeObject).id, (link.target as NodeObject).id);
}

export function toLinkId(source: string | number | undefined, target: string | number | undefined): string {
    return `${source}->${target}`;
}

function paintNode(rawNode: NodeObject, color: string, ctx: CanvasRenderingContext2D) {
    const node = rawNode as NodeObject & ComponentNode;
    if (node.x && node.y) {
        ctx.fillStyle = color;
        ctx.beginPath();
        const radius = node.value;
        const circleData = { x: node.x, y: node.y, radius: node.outdated ? radius - 3 : radius };
        ctx.arc(circleData.x, circleData.y, circleData.radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.closePath();

        if (node.outdated) {
            ctx.setLineDash([1, 1]);
            ctx.beginPath();
            ctx.strokeStyle = '#aabbbb';
            ctx.arc(circleData.x, circleData.y, circleData.radius + 1, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.closePath();
        }
    }
}