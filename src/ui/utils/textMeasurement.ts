import { TOKEN_PLACEHOLDER } from "./tokenUtils";

// Singleton canvas for text measurement to avoid expensive DOM creation
let sharedCanvas: HTMLCanvasElement | null = null;
let sharedContext: CanvasRenderingContext2D | null = null;

/**
 * Get the shared canvas 2D context for text measurement
 */
export function getSharedContext(): CanvasRenderingContext2D | null {
    if (!sharedCanvas) {
        sharedCanvas = document.createElement("canvas");
        sharedContext = sharedCanvas.getContext("2d");
    }
    return sharedContext;
}

/**
 * Build a font string from an element's computed style
 */
function buildFontString(style: CSSStyleDeclaration): string {
    return `${style.fontStyle} ${style.fontVariant} ${style.fontWeight} ${style.fontSize} / ${style.lineHeight} ${style.fontFamily}`;
}

/**
 * Measure the average character width of an element using canvas
 */
export function measureAverageCharWidth(element: HTMLElement): number | null {
    const context = getSharedContext();
    if (!context) return null;

    const style = getComputedStyle(element);
    context.font = buildFontString(style);
    const sample = "mmmmmmmmmm";
    return context.measureText(sample).width / sample.length;
}

/**
 * Measure the width of a specific character using canvas
 */
export function measureCharWidth(element: HTMLElement, character: string): number | null {
    const context = getSharedContext();
    if (!context) return null;

    const style = getComputedStyle(element);
    context.font = buildFontString(style);
    return context.measureText(character).width;
}

/**
 * Measure the placeholder character width using DOM measurement
 * This is more accurate for special characters like TOKEN_PLACEHOLDER
 */
export function measurePlaceholderCharWidthDom(element: HTMLElement): number {
    const style = getComputedStyle(element);
    const span = document.createElement("span");
    span.style.position = "absolute";
    span.style.visibility = "hidden";
    span.style.whiteSpace = "pre";
    span.style.font = buildFontString(style);
    span.style.letterSpacing = style.letterSpacing;
    const sampleCount = 10;
    span.textContent = TOKEN_PLACEHOLDER.repeat(sampleCount);
    document.body.appendChild(span);
    const width = span.getBoundingClientRect().width;
    document.body.removeChild(span);
    return width / sampleCount;
}
