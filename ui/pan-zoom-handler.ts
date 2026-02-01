import { ModernMermaidSettings } from '../../types';

export interface PanZoomState {
	scale: number;
	translateX: number;
	translateY: number;
	panning: boolean;
	startX: number;
	startY: number;
	pointX: number;
	pointY: number;
}

	export class PanZoomHandler {
 	private state: PanZoomState = {
 		scale: 1,
 		translateX: 0,
 		translateY: 0,
 		panning: false,
 		startX: 0,
 		startY: 0,
 		pointX: 0,
 		pointY: 0
 	};
 	private isPanningActive: boolean = false;
 	private locked: boolean = true;
 	private enableTouchpadPan: boolean = false;

 	constructor(
 		private wrapper: HTMLElement,
 		private svgElement: SVGElement | null,
 		private settings: ModernMermaidSettings,
 		locked: boolean = true,
 		enableTouchpadPan: boolean = false
 	) {
 		this.locked = locked;
 		this.enableTouchpadPan = enableTouchpadPan;
 		if (this.svgElement) {
 			this.svgElement.style.transformOrigin = '0 0';
 		}
 	}

	setup(): void {
		this.wrapper.addEventListener('mousedown', this.handleMouseDown);
		this.wrapper.addEventListener('wheel', this.handleWheel, { passive: false, capture: true });
		this.wrapper.addEventListener('dblclick', this.handleDoubleClick);
	}

	destroy(): void {
		if (this.isPanningActive) {
			window.removeEventListener('mousemove', this.handleWindowMouseMove);
			window.removeEventListener('mouseup', this.handleWindowMouseUp);
		}
		this.wrapper.removeEventListener('mousedown', this.handleMouseDown);
		this.wrapper.removeEventListener('wheel', this.handleWheel);
		this.wrapper.removeEventListener('dblclick', this.handleDoubleClick);
	}

private handleMouseDown = (e: MouseEvent) => {
		e.preventDefault();
		this.state.startX = e.clientX - this.state.translateX;
		this.state.startY = e.clientY - this.state.translateY;
		this.state.panning = true;
		this.isPanningActive = true;
		this.wrapper.style.cursor = 'grabbing';
		window.addEventListener('mousemove', this.handleWindowMouseMove);
		window.addEventListener('mouseup', this.handleWindowMouseUp);
	};

	private handleWindowMouseUp = () => {
		this.state.panning = false;
		this.isPanningActive = false;
		this.wrapper.style.cursor = 'grab';
		window.removeEventListener('mousemove', this.handleWindowMouseMove);
		window.removeEventListener('mouseup', this.handleWindowMouseUp);
	};

	private handleWindowMouseMove = (e: MouseEvent) => {
		if (!this.state.panning) return;
		e.preventDefault();
		this.state.translateX = e.clientX - this.state.startX;
		this.state.translateY = e.clientY - this.state.startY;
		this.updateTransform();
	};

	private handleWheel = (e: WheelEvent) => {
		const delta = -Math.sign(e.deltaY);
		const currentScale = this.state.scale;

		if (e.ctrlKey || e.metaKey) {
			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation();

			const newScale = Math.min(Math.max(1, currentScale + delta * 0.05), 3);

			if (newScale === currentScale) {
				return;
			}

			if (!this.svgElement) {
				return;
			}

			const wrapperRect = this.wrapper.getBoundingClientRect();
			const mouseX = e.clientX - wrapperRect.left;
			const mouseY = e.clientY - wrapperRect.top;

			const mouseXInSVG = (mouseX - this.state.translateX) / currentScale;
			const mouseYInSVG = (mouseY - this.state.translateY) / currentScale;

			this.state.scale = newScale;

			this.state.translateX = mouseX - mouseXInSVG * newScale;
			this.state.translateY = mouseY - mouseYInSVG * newScale;

			this.updateTransform();
			return;
		}

		if (this.locked) {
			return;
		}

		if (this.enableTouchpadPan && Math.abs(e.deltaX) > 0) {
			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation();

			if (!this.svgElement) {
				return;
			}

			this.state.translateX -= e.deltaX;
			this.state.translateY -= e.deltaY;

			this.updateTransform();
		}
	};

private handleDoubleClick = (e: MouseEvent) => {
		e.preventDefault();

		const currentScale = this.state.scale;
		const targetScale = currentScale === 1 ? this.settings.doubleClickZoomLevel : 1;

		if (targetScale === 1) {
			this.state.scale = 1;
			this.state.translateX = 0;
			this.state.translateY = 0;
			this.updateTransform(true);
			return;
		}

		if (!this.svgElement) {
			return;
		}

		const svgRect = this.svgElement.getBoundingClientRect();
		const mouseX = e.clientX - svgRect.left;
		const mouseY = e.clientY - svgRect.top;

		const mouseXInSVG = (mouseX - this.state.translateX) / currentScale;
		const mouseYInSVG = (mouseY - this.state.translateY) / currentScale;

		this.state.scale = targetScale;

		this.state.translateX = mouseX - mouseXInSVG * targetScale;
		this.state.translateY = mouseY - mouseYInSVG * targetScale;

		this.updateTransform(true);
	};

	private updateTransform(withTransition: boolean = false): void {
		if (this.svgElement) {
			this.svgElement.style.transition = withTransition ? 'transform 0.2s ease-out' : '';
			this.svgElement.style.transform = `translate(${this.state.translateX}px, ${this.state.translateY}px) scale(${this.state.scale})`;
		}
	}

	zoomIn(): void {
		this.state.scale = Math.min(3, this.state.scale + 0.2);
		this.updateTransform();
	}

	zoomOut(): void {
		this.state.scale = Math.max(1, this.state.scale - 0.2);
		this.updateTransform();
	}

	reset(): void {
		this.state.scale = 1;
		this.state.translateX = 0;
		this.state.translateY = 0;
		this.updateTransform();
	}

	getState(): PanZoomState {
		return { ...this.state };
	}

	setLocked(locked: boolean): void {
		this.locked = locked;
	}
}
