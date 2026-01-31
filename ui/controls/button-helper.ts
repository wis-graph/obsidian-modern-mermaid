

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
}

export function createControlButton(
	container: HTMLElement,
	options: ButtonOptions
): HTMLButtonElement {
	const btn = document.createElement('button');
	btn.innerHTML = options.icon;
	
	Object.assign(btn.style, BUTTON_STYLES.button);
	btn.addEventListener('mouseenter', () => {
		Object.assign(btn.style, BUTTON_STYLES.hover);
	});
	
	btn.addEventListener('mouseleave', () => {
		Object.assign(btn.style, BUTTON_STYLES.button);
	});
	
	btn.addEventListener('click', () => {
		if (options.onClickLabel) {
			console.log(options.onClickLabel);
		}
		options.onClick();
	});
	
	container.appendChild(btn);
	return btn;
}
