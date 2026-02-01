

export const BUTTON_STYLES = {
	button: {
		padding: '6px',
		backgroundColor: 'rgba(128, 128, 128, 0.1)',
		color: 'currentColor',
		border: 'none',
		borderRadius: '6px',
		cursor: 'pointer',
		transition: 'all 0.2s ease',
		opacity: '0.7'
	},
	hover: {
		backgroundColor: 'rgba(128, 128, 128, 0.2)',
		opacity: '1'
	}
};

export interface ButtonOptions {
	icon: string;
	onClick: () => void;
	onClickLabel?: string;
	isActive?: boolean;
}

export interface CleanupFunction {
	(): void;
}

export function createControlButton(
 	container: HTMLElement,
 	options: ButtonOptions
 ): { button: HTMLButtonElement; cleanup: CleanupFunction } {
 	const btn = document.createElement('button');
 	btn.innerHTML = options.icon;

 	const mouseEnterHandler = () => {
 		Object.assign(btn.style, BUTTON_STYLES.hover);
 	};

 	const mouseLeaveHandler = () => {
 		if (options.isActive) {
 			btn.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
 			btn.style.opacity = '1';
 		} else {
 			Object.assign(btn.style, BUTTON_STYLES.button);
 		}
 	};

 	const clickHandler = () => {
 		if (options.onClickLabel) {
 			console.log(options.onClickLabel);
 		}
 		options.onClick();
 	};

 	Object.assign(btn.style, BUTTON_STYLES.button);
 	if (options.isActive) {
 		btn.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
 		btn.style.opacity = '1';
 	}
 	btn.addEventListener('mouseenter', mouseEnterHandler);
 	btn.addEventListener('mouseleave', mouseLeaveHandler);
 	btn.addEventListener('click', clickHandler);

 	container.appendChild(btn);

 	const cleanup = () => {
 		btn.removeEventListener('mouseenter', mouseEnterHandler);
 		btn.removeEventListener('mouseleave', mouseLeaveHandler);
 		btn.removeEventListener('click', clickHandler);
 		btn.remove();
 	};

 	return { button: btn, cleanup };
 }
