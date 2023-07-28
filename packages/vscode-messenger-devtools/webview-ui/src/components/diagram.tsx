import React, { useEffect, useRef, useState } from 'react';
import ForceGraph2D, { ForceGraphMethods, GraphData, LinkObject, NodeObject } from 'react-force-graph-2d';

type GraphObjectExtension = {
    name: string;
    value: number;
}

type ComponentNode = NodeObject & GraphObjectExtension & {
    shortName: string;
}
type ComponentLink = LinkObject & GraphObjectExtension

let graphData: GraphData = { nodes: [], links: [] };

let storedState: DiagramState = {
    extensionName: '',
    webviews: [],
    doCenter: false
};

type DiagramState = {
    extensionName: string
    webviews: Array<{ id: string, type: string }>
    doCenter: boolean
}

export function createDiagramData(componentState: DiagramState): GraphData {
    if (!componentState) {
        return graphData;
    }
    const toCompareString = (state: DiagramState) => `${state.extensionName} ${state.webviews.map(wv => wv.id).join(',')}`;
    if (toCompareString(storedState) === toCompareString(componentState)) {
        // same data, just return the existing graph data
        return graphData;
    }
    // reset graphData, store new state
    graphData = { nodes: [], links: [] };

    storedState = componentState;

    const unqualifiedName = (name: string) => name.split('.').pop();

    if (componentState.extensionName) {
        graphData.nodes.push({
            id: 'host extension',
            name: componentState.extensionName,
            shortName: unqualifiedName(componentState.extensionName),
            value: 10
        } as ComponentNode);

    }
    if (componentState.webviews) {
        componentState.webviews.forEach((webview) => {
            graphData.nodes.push({
                id: webview.id,
                name: webview.type,
                shortName: unqualifiedName(webview.type),
                value: 12
            } as ComponentNode);
            graphData.links.push({
                source: 'host extension',
                target: webview.id,
                name: `${'host extension'} to ${webview.id}`,
                value: 9
            } as ComponentLink);
            graphData.links.push({
                source: webview.id,
                target: 'host extension',
                name: `${webview.id} to ${'host extension'}`,
                value: 9
            } as ComponentLink);
        });
    }
    return graphData;
}

export type HighlightData = { link: string, type: string }

export let updateLinks: (update: HighlightData[]) => void = () => void 0;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Diagram(options: DiagramState): JSX.Element {

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
            if (diagramRef.current && options.doCenter) {
                // center diagram after diagram panel is shown
                diagramRef.current.zoomToFit(50, 50);
            }
        }, 250);
    }, [options.doCenter]);

    const graphData = createDiagramData(options);
    let particleSize = 0;
    let particleColor: string | undefined = undefined;

    useEffect(() => {

        highlightLinks.forEach((highlight, index) => {
            const linkObj = graphData.links.find(link => highlight.link === linkId(link));
            if (linkObj) {

                setTimeout(() => {
                    particleSize = 4;
                    particleColor = toParticleColor(highlight.type);
                    diagramRef.current?.emitParticle(linkObj);
                }, index * 450);
                //diagramRef.current?.pauseAnimation();
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
        linkDirectionalParticleSpeed={0.03}
        linkDirectionalParticleColor={particleColor}
        nodeCanvasObject={(rawNode, ctx, _globalScale) => {
            rawNode.vx = 10;
            rawNode.vy = 100;
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
        ctx.arc(node.x, node.y, node.value / 2, 0, 2 * Math.PI, false);
        ctx.fill();
    }
}