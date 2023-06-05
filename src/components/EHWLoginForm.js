/*
 * EHWEHWLoginForm.js
 */
class EHWEHWLoginForm extends HTMLElement {
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
				});
			});
			if (response.ok) {
				this.shadowRoot.append('Logged out');
				console.log(response);
			}
		});
		this.shadowRoot.innerHTML = `
			<style>
			:host {
				position: absolute;
				display: grid;
				justify-content: center;
				align-items: center;
				background: black;
			}
			form {
				width: 300px;
				padding: 20px;
				border: 1px solid #ccc;
				background: #f3f3f3;
				border-radius: 1rem;
			}
			form * {
				border-radius: 1rem;
			}
			input {
				width: 100%;
				margin-bottom: 10px;
				padding: 10px;
				box-sizing: border-box;
				border: 1px solid #ccc;
			}
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
			.failed {
				display: none;
				color: red;
				text-align: center;
				margin-top: 10px;
			}
			*:required:placeholder-shown ~ button{
				background-color: lightgrey;
				cursor: auto;
			}
			</style>
			<script>
				console.log(document.location.hostname);
				async function login(e) {
					e.preventDefault();
					let login = {
						username: document.querySelector('input[name=username]').value,
						password: document.querySelector('input[name=password]').value,
						type: 'login'
					}
					let response = await fetch('https://${document.location.hostname}/ehw_login', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify(login)
					});
					if (response.ok) {
						console.log('passed');
						document.location.reload();
					} else {
						document.querySelector('.failed').style.display = 'block';
					}
				}
			</script>
			<form>
				<input name=username placeholder=Username required>
				<input type=password name=password placeholder=Password required>
				<button type=button onclick=login(event)>Login</button>
			</form>
			<div class=failed>Login failed</div>
		`;
		this.shadowRoot.append(button);
	}
}
customElements.define('ehw-logout', EHWEHWLoginForm);