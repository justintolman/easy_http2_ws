/*
 * EHWLogoutButton.js
 */
class EHWLogoutButton extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({mode: 'open'});
		let button = document.createElement('button');
		button.type = 'button';
		button.innerText = 'Logout';
		button.addEventListener('click', async () => {
			let response = await fetch('/ehw_auth', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					action: 'logout'
				})
			});
			if (response.ok) {
				this.shadowRoot.append('Logged out');
				console.log(response);
			}
		});
		this.shadowRoot.innerHTML = `
			<style>
				button {
					width: 100%;
					font-size: 1em;
					font-weight: bold;
					height: 3rem;
					background: #28d;
					border: 0;
					cursor: pointer;
					color: #fff;
				}
				button:hover {
					background: #17c;
				}
			</style>
		`;
		this.shadowRoot.append(button);
	}
}
customElements.define('ehw-logout', EHWLogoutButton);