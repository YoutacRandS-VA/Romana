"use strict";

let socket;
try {

	socket = io('https://192.168.1.90:3100', {
		autoConnect: false
	});
	
	socket.connect();

	socket.on('connect', () => {

		socket.emit('test', 'IT WORKED!!');
	
		socket.on('chat-message', msg => {
			console.log(msg)	
		});
	
		socket.on('new weight dev', weight => {
			console.log(weight)
			document.querySelector('#create-weight__take-weight__weight p').innerText = weight;
		});

		socket.on('transmitting serial data', weight => {
			if (parseInt(weight) !== NaN) {
				document.querySelector('#create-weight__take-weight__weight p').innerText = weight;
			}
		});

		socket.on('serial port connection error', () => {

			if (!!document.querySelector('#create-weight-step-2')) {

				weight_object.tara_type = 'manual';
				
				document.querySelector('#new-weight__widget__tara-type .header-check-type p').innerText = 'MANUAL';
				document.getElementById('create-weight__take-weight__weight').className = 'manual';

				const conn_status = document.querySelector('#create-weight__status-container > div:first-child');
				conn_status.classList.remove('connection-ok');
				conn_status.classList.add('connection-error');

				const tara_status = document.querySelector('#create-weight__status-container > div:last-child');
				tara_status.classList.remove('automatica');
				tara_status.classList.add('manual');
				tara_status.querySelector('p').innerHTML = 'TARA<br>MANUAL';

			}
		})
	
		socket.on('new weight updated', async response => {
	
			console.log(response);
	
			let target, status;
			if (response.data.update.process === 'gross') {
				target = weight_object.gross_weight;
				document.getElementById('tare-weight__gross-weight').innerText = thousand_separator(response.data.update.net) + ' KG';
			}
			else if (response.data.update.process === 'tare') {
				target = weight_object.tare_weight;
				document.getElementById('gross-weight__tara-weight').innerText = thousand_separator(response.data.update.net) + ' KG';
			}
	
			target.date = response.data.update.date;
			target.status = response.data.update.status;
			target.type = response.data.update.tara_type;
			target.user = response.data.update.user;
			target.brute = response.data.update.brute;
			target.net = response.data.update.net;
			status = target.status;
			
			document.getElementById(`${response.data.update.process}-weight__brute`).innerText = thousand_separator(response.data.update.brute) + ' KG';
			document.getElementById(`${response.data.update.process}-weight__net`).innerText = thousand_separator(response.data.update.net) + ' KG';
	
			if (weight_object.gross_weight.status > 1 && weight_object.tare_weight.status > 1) {
				weight_object.final_net_weight = response.data.update.final_net_weight;
				document.getElementById('gross__final-net-weight').innerText = thousand_separator(response.data.update.final_net_weight) + ' KG';
				document.getElementById('tare__final-net-weight').innerText = thousand_separator(response.data.update.final_net_weight) + ' KG';
				document.getElementById('gross-weight__tara-weight').nextElementSibling.innerText = 'PESO NETO TARA';
				document.getElementById('gross__final-net-weight').nextElementSibling.innerText = 'PESO NETO FINAL';
			}
			else if (weight_object.gross_weight.status > 1 && weight_object.tare_weight.status === 1) {
				document.getElementById('gross__final-net-weight').innerText = thousand_separator(response.data.update.net - weight_object.average_weight) + ' KG';
			}
			else if (weight_object.gross_weight.status === 1 && weight_object.tare_weight.status > 1) {
				document.getElementById('gross-weight__tara-weight').innerText = thousand_separator(response.data.update.net) + ' KG';
			}
	
			if (weight_object.tara_type === 'manual') {
				document.getElementById('take-weight__manual-input').value = response.data.update.brute;
				document.getElementById('take-weight__manual-input').classList.add('pulse-up');
			} else document.querySelector('#create-weight__take-weight__weight p').innerText = response.data.update.brute;
	
			document.querySelector('#create-weight__take-weight__weight p').classList.add('pulse-up');
			await delay(700);
			document.querySelector('#create-weight__modal').classList.remove('active');
	
			await delay(500);
	
			if (!!document.querySelector('#create-weight__take-weight-container')) {

				document.querySelector('#create-weight__take-weight-container').remove();
	
				const
				weight_btn = document.getElementById('take-weight-container'),
				cancel_save_btns = document.getElementById('save-cancel-btns');
	
				weight_btn.classList.remove('active');
				cancel_save_btns.classList.add('active');
				document.getElementById('create-weight-step-2').setAttribute('data-status', status);
			}
		})

		//WEIGHT HAS BEEN CREATED BY OTHER USER -> CREATE ROW IN PENDING WEIGHTS TABLE
		socket.on('weight created by another user', weight => {
			
			if (!!document.querySelector(`#pending-weights-table tr[data-weight-id="${weight.id}"]`)) return;

			const tr = document.createElement('tr');
			tr.className = 'hidden';
			tr.setAttribute('data-weight-id', weight.id);
			tr.innerHTML = `
				<td class="weight-id">${thousand_separator(weight.id)}</td>
				<td class="created">${DOMPurify().sanitize(new Date(weight.created).toLocaleString('es-CL'))}</td>
				<td class="cycle"></td>
				<td class="gross-brute">-</td>
				<td class="primary-plates">${DOMPurify().sanitize(weight.primary_plates)}</td>
				<td class="driver">${DOMPurify().sanitize(weight.driver)}</td>
				<td class="client">-</td>
			`;

			if (weight.cycle === 1) tr.querySelector('.cycle').innerHTML = `<div><i class="fad fa-arrow-down"></i><p>RECEPCION</p></div>`;
			else if (weight.cycle === 2) tr.querySelector('.cycle').innerHTML = `<div><i class="fad fa-arrow-up"></i><p>DESPACHO</p></div>`;
			else if (weight.cycle === 3) tr.querySelector('.cycle').innerHTML = `<div><p>INTERNO</p></div>`;
			else if (weight.cycle === 4) tr.querySelector('.cycle').innerHTML = `<div><p>SERVICIO</p></div>`;
			
			document.querySelector('#pending-weights-table tbody').prepend(tr);
			fade_in_animation(tr);
			tr.classList.remove('hidden');
		})

		//WEIGHT IS HAS BEEN CHANGED TO ANNULED OR FINISHED BY OTHER USER
		socket.on('weight status changed by other user', async weight_id => {
			const tr = document.querySelector(`#pending-weights-table tr[data-weight-id="${weight_id}"]`);
			if (!!tr) {
				await fade_out_animation(tr);
				tr.remove();
			}
		})

		//GROSS WEIGHT HAS BEEN UPDATED BY ANOTHER USER -< UPDATES PENDING WEIGHTS TABLE GROSS WEIGHT
		socket.on('gross weight updated in one of the weights that are pending', weight => {
			const tr = document.querySelector(`#pending-weights-table tr[data-weight-id="${weight.id}"]`);
			if (!!tr) tr.querySelector('.gross-brute').innerText = thousand_separator(weight.gross_weight);
		})

		//FIRST DOCUMENT ENTITY IN PENDING WEIGHT HAS BEEN UPDATED
		socket.on('update pending weight entity in pending weights table', weight => {
			const tr = document.querySelector(`#pending-weights-table tr[data-weight-id="${weight.id}"]`);
			if (!!tr) tr.querySelector('.client').innerText = weight.entity_name;
		})



	});

	socket.on('disconnect', () => {
		console.log('socket disconnected');
	});

	const socketReconnect = async () => {
		try {
			await delay(500);
			if (!socket.connected) socket.connect();
		} 
		catch(e) { console.log(`Error reconnecting socket. ${e}`); socketReconnect() }
	}

	window.onfocus = () => {
		if (!socket.connected && screen_width < 768) socketReconnect();
	}

	window.onblur = () => {
		console.log(socket.connected);
		if (socket.connected && screen_width < 768) socket.disconnect();
	}

} catch(socket_error) { console.log(`Error connecting socket. ${socket_error}`) }

//FIRST BREADCRUMB WEIGHT
document.querySelector('#weight__breadcrumb li:first-child').addEventListener('click', async function() {
	
	if (btn_double_clicked(this)) return;

	try {

		const 
		session_token = token.value,
		get_pending_weights = await fetch('/list_pending_weights', {
			method: 'GET', 
			headers: { 
				"Cache-Control" : "no-cache", 
				"Authorization" : session_token 
			}
		}),
		response = await get_pending_weights.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

		document.querySelectorAll('#pending-weights-table tbody tr').forEach(tr => { tr.remove() });
		create_pending_weights_tr(response.pending_weights);

	} catch(error) { error_handler('Error al obtener pesajes pendientes.', error) }

	if (document.querySelector('#create-weight-step-1').classList.contains('active')) {

		const 
		fade_out_div = document.getElementById('create-weight__container'),
		fade_in_div = document.getElementById('weight-menu');

		await fade_out_animation(fade_out_div);
		fade_out_div.classList.remove('animationend');
		fade_in_animation(fade_in_div);

		while (document.querySelector('#weight__breadcrumb').children.length > 1) {
			document.querySelector('#weight__breadcrumb').lastElementChild.remove();
		}

		document.querySelector('#create-weight-step-1').classList.remove('active');

	}
	else if (!!document.querySelector('#create-weight-step-2')) {
		clearInterval(watch_document);
		save_weight_widget();
	} 
	
	else if (!!document.querySelector('#finished-weight__containers').classList.contains('active')) {

		const 
		fade_out_div = document.getElementById('finished-weight__containers'),
		fade_in_div = document.getElementById('weight-menu');
		
		clearInterval(watch_document);

		await fade_out_animation(fade_out_div);
		fade_out_div.classList.remove('animationend', 'active');

		fade_in_animation(fade_in_div);
		fade_in_div.classList.add('active');

		const breadcrumbs = document.querySelector('#weight__breadcrumb');
		while (breadcrumbs.children.length > 1) { breadcrumbs.lastElementChild.remove() }

	}
	else return
});

function create_pending_weights_tr(pending_weights) {
	pending_weights.forEach(weight => {
		const tr = document.createElement('tr');
		tr.setAttribute('data-weight-id', weight.id);
		tr.innerHTML = `
			<td class="weight-id">${thousand_separator(weight.id)}</td>
			<td class="created">${new Date(weight.created).toLocaleString('es-CL')}</td>
			<td class="cycle"></td>
			<td class="gross-brute"></td>
			<td class="primary-plates">${DOMPurify().sanitize(weight.primary_plates)}</td>
			<td class="driver">${DOMPurify().sanitize(weight.driver)}</td>
			<td class="client"></td>`
		;

		if (weight.cycle === 1) tr.querySelector('.cycle').innerHTML = `<div><i class="fad fa-arrow-down"></i><p>RECEPCION</p></div>`;
		else if (weight.cycle === 2) tr.querySelector('.cycle').innerHTML = `<div><i class="fad fa-arrow-up"></i><p>DESPACHO</p></div>`;
		else if (weight.cycle === 3) tr.querySelector('.cycle').innerHTML = `<div><p>INTERNO</p></div>`;
		else if (weight.cycle === 4) tr.querySelector('.cycle').innerHTML = `<div><p>SERVICIO</p></div>`;

		if (weight.gross_brute === 0 || weight.gross_brute === null) tr.querySelector('.gross-brute').innerText = '-';
		else tr.querySelector('.gross-brute').innerText = thousand_separator(weight.gross_brute);

		if (weight.name === null) tr.querySelector('.client').innerText = '-';
		else tr.querySelector('.client').innerText = weight.name;
		
		document.querySelector('#pending-weights-table tbody').appendChild(tr);
	});
}

//CREATE NEW WEIGHT CARD CLICK
document.getElementById('weights-menu__create').addEventListener('click', async function() {

	if (clicked) return;
	prevent_double_click();

	const
	fade_out_div = document.getElementById('weight-menu'),
	fade_in_div = document.getElementById('create-weight__container');

	fade_out_animation(fade_out_div);

    try {
        
        const
        get_template = await fetch('/get_vehicles', { 
			method: 'GET', 
			headers: { 
				"Cache-Control" : "no-cache", 
				"Authorization" : token.value 
			} 
		}),
        response = await get_template.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

		while (!fade_out_div.classList.contains('animationend')) { await delay(10) }
		fade_out_div.classList.remove('animationend');

		document.querySelectorAll('#create-weight__select-vehicle-table tbody tr').forEach(tr => { tr.remove() })

    	response.data.forEach(vehicle => {

			const tr = document.createElement('tr');
            tr.innerHTML = `
				<td class="primary-plates">${DOMPurify().sanitize(vehicle.primary_plates)}</td>
				<td class="secondary-plates"></td>
				<td class="driver">${DOMPurify().sanitize(vehicle.driver)}</td>
				<td class="phone">${DOMPurify().sanitize(vehicle.phone)}</td>
				<td class="internal">
					<div>
						<i></i>
					</div>
				</td>
				<td class="status">
					<div>
						<i></i>
					</div>
				</td>
			`;
			
			tr.querySelector('.secondary-plates').innerText = (vehicle.secondary_plates === null || vehicle.secondary_plates.length === 0) ? '-' : vehicle.secondary_plates;
			
			tr.querySelector('.internal i').className = (vehicle.internal === 0) ? 'far fa-times' : 'far fa-check';
			tr.querySelector('.status i').className = (vehicle.status === 0) ? 'far fa-times' : 'far fa-check';

			document.querySelector('#create-weight__select-vehicle-table .tbl-content tbody').appendChild(tr);
		});

		document.querySelector('.create-weight__vehicles-type.active').classList.remove('active');
		document.getElementById('create-weight__show-vehicles-internal').classList.add('active');

		document.getElementById('create-weight__search-vehicles').addEventListener('input', custom_input_change);
		document.getElementById('create-weight__search-vehicles').addEventListener('input', create_weight_search_vehicle);
		document.getElementById('create-weight-btn').addEventListener('click', create_weight_btn);
		document.querySelectorAll('#select-vehicle-type-container .filter-vehicles').forEach(btn => {
			btn.addEventListener('click', create_weight_filter_vehicles_buttons);
		});

		fade_in_animation(fade_in_div);

		breadcrumbs('add', 'weight', 'CREAR');

        await delay(750);
        document.getElementById('create-weight__search-vehicles').select();
        document.getElementById('create-weight__search-vehicles').focus();

		await delay(300);
		
		fade_out_div.classList.remove('active');
		fade_in_div.classList.add('active');
		document.getElementById('create-weight-step-1').classList.add('active');

    } catch(error) { error_handler('Error al buscar template para crear pesaje', error) }
});

//CREATE NEW WEIGHT -> SELECT CYCLE
document.getElementById('create-weight__cycle').addEventListener('click', e => {

	if (clicked) return;
	prevent_double_click();

	let btn;
	if (e.target.classList.contains('weight__type')) btn = e.target;
	else if (e.target.className === 'weight__type__icon'|| e.target.className === 'container') btn = e.target.parentElement;
	else if (e.target.matches('i') || e.target.matches('h4')) btn = e.target.parentElement.parentElement;
	else return;

	if (!!document.querySelector('#create-weight__cycle > div.active'))
		document.querySelector('#create-weight__cycle > div.active').classList.remove('active');
	
	btn.classList.add('active');

	if (document.querySelector('#create-weight__search-vehicles-container .icon-container .found').classList.contains('active'))
		document.getElementById('create-weight-btn').classList.add('active');
});

//CREATE WEIGHT -> SELECT VEHICLES TABLE
document.querySelector('#create-weight__select-vehicle-table .tbl-content tbody').addEventListener('click', e => {

	if (clicked) return;
	prevent_double_click();

	let tr;
	if (e.target.matches('td')) tr = e.target.parentElement;
	else if (e.target.className === 'icon-container') tr = e.target.parentElement.parentElement;
	else if (e.target.className === 'found' || e.target.className === 'not-found') tr = e.target.parentElement.parentElement.parentElement;
	else if (e.target.matches('i')) tr = e.target.parentElement.parentElement.parentElement.parentElement;
	else return;

	const
	plates = tr.querySelector('.primary-plates').innerText,
	input = document.getElementById('create-weight__search-vehicles');
	input.value = plates;
	input.classList.add('has-content');
	input.dispatchEvent(new Event('input', { bubbles: true }));
	input.click();
});

document.getElementById('select-vhc-create').addEventListener('click', async () => {

	if (clicked) return;
	prevent_double_click();

	const modal = document.getElementById('create-weight__modal');
	try {

		const 
		get_transport_entities = await fetch('/get_transport', {
			method: 'GET',
			headers: {
				"Cache-Control" : 'no-cache',
				"Authorization" : token.value
			}
		}),
		response = await get_transport_entities.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

		const template = await (await fetch('./templates/template-create-vehicle.html')).text();
		modal.innerHTML = template;
	
		const transport_select = modal.querySelector('.create-vehicle__transport-select');
		response.entities.forEach(entity => {
			const option = document.createElement('option');
			option.value = entity.id;
			option.innerText = entity.name;
			transport_select.appendChild(option);
		});

		transport_select.addEventListener('change', e => {
			e.target.parentElement.classList.add('has-content');
			const p = e.target.parentElement.querySelector('p');
			p.innerText = e.target.options[e.target.selectedIndex].innerText;
		});

		modal.querySelector('.create-vehicle__primary-plates').addEventListener('input', custom_input_change);
		modal.querySelector('.create-vehicle__secondary-plates').addEventListener('input', custom_input_change);
		
		modal.querySelector('.create-weight__create-vehicle__back-to-create-weight').addEventListener('click', create_vehicle_close_modal);
		modal.querySelector('.create-weight__create-vehicle__choose-driver-btn').addEventListener('click', create_vehicle_choose_driver);
		
		modal.querySelector('.create-vehicle__primary-plates').addEventListener('input', async e => {
			const tooltip = e.target.parentElement.querySelector('.widget-tooltip');
			if (!tooltip.classList.contains('hidden')) {
				await fade_out(tooltip);
				tooltip.classList.add('hidden');
			}
		});

		//INTERNAL AND ACTIVE CHECKBOX
        modal.querySelectorAll('.create-vehicle__vehicle-data .create-vehicle-data:last-child > div').forEach(div => {
            div.addEventListener('click', function() {
                const input = this.querySelector('input');
                if (input.checked) {
                    input.checked = false;
                    return;
                }
                input.checked = true;
            })
        });

		modal.querySelector('.create-vehicle__active-cbx').checked = true;

		breadcrumbs('add', 'weight', 'CREAR VEHICULO')
		modal.classList.add('active', 'overflow-hidden');

	} catch(error) { error_handler('Error al obtener template de crear vehiculo.', error); return }
});

document.querySelector('#pending-weights-table tbody').addEventListener('click', async (e) => {

	if (clicked) return;
	prevent_double_click();

	let tr;
	if (e.target.matches('tr')) tr = e.target;
	else if (e.target.matches('td')) tr = e.target.parentElement;
	else if (e.target.matches('i') || e.target.matches('p')) tr = e.target.parentElement.parentElement.parentElement;
	else return;
	
	const 
	weight_id = tr.getAttribute('data-weight-id'),
	fade_out_div = document.getElementById('weight-menu'),
	fade_in_div = document.getElementById('create-weight__container');

	fade_out_animation(fade_out_div);

	try {

		const
		get_weight = await fetch('/get_pending_weight', {
			method: 'POST', 
			headers: { "Content-Type" : "application/json",  "Authorization" : token.value }, 
			body: JSON.stringify({ weight_id })
		}),
		response = await get_weight.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

		const template = await (await fetch('./templates/template-weight-step-2.html')).text();

		await load_css('css/weights.css');
		await load_script('js/weight.js');

		document.getElementById('create-weight-step-1').className = 'hidden';

		response.template = template;
		create_weight(response);
		
		while (!fade_out_div.classList.contains('animationend') || !!document.getElementById('create-weight-step-2') === false) {
			await delay(10);
		}
		fade_out_div.classList.remove('animationend');

		document.getElementById('create-weight-step-2').classList.remove('hidden');
		document.getElementById('create-weight-step-2').classList.add('active');

		fade_in_animation(fade_in_div);
		
	} catch (error) { error_handler('Error al obtener datos de pesaje pendiente.', error) }
});

//FINISHED WEIGHTS
function finished_weights_create_trs(rows) {
	return new Promise(resolve => {
		rows.forEach(row => {
			const tr = document.createElement('tr');
			tr.setAttribute('data-weight-id', row.id);
			tr.innerHTML = `
				<td class="edit">
					<div class="edit-container">
						<i class="fas fa-pen-square"></i>
					</div>
				</td>
				<td class="weight">${thousand_separator(row.id)}</td>
				<td class="date">${new Date(row.created).toLocaleString('es-CL')}</td>
				<td class="plates">${row.plates}</td>
				<td class="driver">${row.driver}</td>
				<td class="brute"></td>
				<td class="tare"></td>
				<td class="final"></td>
			`;
			
			tr.querySelector('.driver').innerText = (row.driver === null) ? '-' : row.driver;
			tr.querySelector('.brute').innerText = (row.brute === null) ? '0 KG' : thousand_separator(row.brute) + ' KG';
			tr.querySelector('.tare').innerText = (row.tare === null) ? '0 KG' : thousand_separator(row.tare) + ' KG';
			tr.querySelector('.final').innerText = (row.tare === null) ? '0 KG' : thousand_separator(row.net) + ' KG';

			document.querySelector('#finished-weight__table tbody').appendChild(tr);
		});
		return resolve();
	})
}

const get_finished_weights = async weight_status => {

	const 
	fade_out_div = document.querySelector('#weight-menu'),
	fade_in_div = document.getElementById('finished-weight__containers');

	fade_out_animation(fade_out_div);
	
	try {

		const
		get_finished_weights = await fetch('/get_finished_weights', {
			method: 'POST', 
			headers: { 
				"Content-Type" : "application/json", 
				"Authorization" : token.value 
			}, 
			body: JSON.stringify({ weight_status })
		}),
		response = await get_finished_weights.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

		const template = await (await fetch('./templates/templates-weights-list.html')).text();

		//ANIMATION STUFF
		while (!fade_out_div.classList.contains('animationend')) { await delay(10) }
		fade_out_div.classList.remove('animationend', 'active');

		fade_in_div.innerHTML = template;
		fade_in_div.classList.add('active');

		if (weight_status === 'T') {

			document.getElementById('finished-weight__header').innerText = 'PESAJES TERMINADOS';
			fade_in_div.querySelector('.card').classList.add('purple');
			breadcrumbs('add', 'weight', 'TERMINADOS');
		} else {
			document.getElementById('finished-weight__header').innerText = 'PESAJES ANULADOS';
			fade_in_div.querySelector('.card').classList.add('red');
			breadcrumbs('add', 'weight', 'ANULADOS');
		}

		fade_in_div.querySelector('.card').setAttribute('data-weight-status', weight_status);

		await finished_weights_create_trs(response.data);

		if (response.today) {
			document.getElementById('finished-weight__start-date').value = response.date;
			document.getElementById('finished-weight__end-date').value = response.date;
		}

		document.querySelector('#finished-weights__print-weight').addEventListener('click', finished_weights_print_weight);

		document.querySelector('#finished-weight__cycle-input input').value = 'RECEPCION';
		document.getElementById('finished-weight__cycle-dropdown').setAttribute('data-cycle', 1);

		document.getElementById('finished-weight__start-date').addEventListener('input', finished_weight_function);
		document.getElementById('finished-weight__end-date').addEventListener('input', finished_weight_function);

		document.getElementById('finished-weight__weight-id').addEventListener('input', e => {

			if (e.target.value.length === 0) {
				document.querySelector('.finished-weight__cycle-dropdown.active').click();
				return;
			}

			const weight_id = e.target.value.replace(/[^0-9]/gm, '');
			e.target.value = thousand_separator(weight_id);
			if (weight_id.length === 0) {
				document.querySelectorAll('#finished-weight__table tbody tr').forEach(tr => { tr.remove() });
				e.target.classList.remove('has-content');
			}
			else e.target.classList.add('has-content');
		});
		document.getElementById('finished-weight__weight-id').addEventListener('keydown', finished_weight_id_keydown);

		document.querySelector('#finished-weight__plates').addEventListener('input', finished_weights_plates_input);
		document.querySelector('#finished-weight__plates').addEventListener('keydown', finished_weights_plates_keydown);

		document.getElementById('finished-weight__driver').addEventListener('input', e => {

			if (e.target.value.length > 0 ) e.target.classList.add('has-content');
			else {
				e.target.classList.remove('has-content');
				document.querySelector('.finished-weight__cycle-dropdown.active').click();
			}
		});

		document.getElementById('finished-weight__driver').addEventListener('keydown', finished_weights_driver_keydown);
		document.querySelector('#finished-weight__cycle-dropdown').addEventListener('click', finished_weight_cycle_select);

		document.querySelector('#finished-weight__table tbody').addEventListener('click', finished_weights_table);

		document.querySelector('#finished-weight__containers .close-btn-absolute').addEventListener('click', function() {
			if (btn_double_clicked(this)) return;
			document.querySelector('#weight__breadcrumb li:first-child').click();
		});

		fade_in_animation(fade_in_div);

	} catch(error) { error_handler('Error al obtener pesajes teminados', error) }

}

document.querySelector('#weights-menu__finished').addEventListener('click', () => {

	if (clicked) return;
	prevent_double_click()
	get_finished_weights('T');
	
});

document.querySelector('#weights-menu__deleted').addEventListener('click', () => {
	if (clicked) return;
	prevent_double_click()
	get_finished_weights('N');
});

//FINISHED WEIGHT -> DATES
const finished_weight_function = async e => {

	if (e.target.value.length < 10) return;

	const 
	weight_status = document.querySelector('#finished-weight__containers .card').getAttribute('data-weight-status'),
	start_input = document.getElementById('finished-weight__start-date'),
	end_input = document.getElementById('finished-weight__end-date'),
	start_date = (start_input.value.length < 10 || (end_input.value < start_input.value && e.target.id === 'finished-weight__end-date')) ? end_input.value : start_input.value,
	end_date = (end_input.value.length < 10 || (start_date > end_input.value && e.target.id === 'finished-weight__start-date')) ? start_input.value : end_input.value,
	start_year = parseInt(start_date.split('/')[0]),
	plates = DOMPurify().sanitize(document.getElementById('finished-weight__plates').value),
	driver = DOMPurify().sanitize(document.getElementById('finished-weight__driver').value),
	cycle = DOMPurify().sanitize(document.querySelector('.finished-weight__cycle-dropdown.active').getAttribute('data-cycle'));

	if (start_year < 2019 || start_year > 2040) return;

	try {

		const
		get_weights = await fetch('/get_finished_weight_by_date', {
			method: 'POST', 
			headers: { 
				"Content-Type" : "application/json", 
				"Authorization" : token.value 
			}, 
			body: JSON.stringify({ weight_status, start_date, end_date, plates, driver, cycle })
		}),
		response = await get_weights.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

		start_input.value = start_date;
		end_input.value = end_date;

		document.querySelectorAll('#finished-weight__table tbody tr').forEach(tr => { tr.remove() })

		await finished_weights_create_trs(response.weights);

		document.getElementById('finished-weight__weight-id').value = '';
		document.getElementById('finished-weight__weight-id').classList.remove('has-content');

	} catch(error) { error_handler('Error al buscar pesajes por fecha.', error) }
}

//FINISHED WEIGHTS -> WEIGHT ID INPUT
const finished_weight_id_keydown = async e => {

	if (e.code !== 'Tab' && e.key!== 'Enter') return;

	const weight_id = DOMPurify().sanitize(e.target.value.replace(/[^0-9]/gm, ''));
	if (weight_id.length === 0) return;
	
	try {

		const
		get_weight = await fetch('/get_finished_weight_by_id', {
			method: 'POST', 
			headers: { 
				"Content-Type" : "application/json", 
				"Authorization" : token.value 
			}, 
			body: JSON.stringify({ weight_id })
		}),
		response = await get_weight.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

		document.querySelectorAll('#finished-weight__table tbody tr').forEach(tr => { tr.remove() });

		const tr = document.createElement('tr');
		tr.setAttribute('data-weight-id', response.weight.id);
		tr.innerHTML = `
			<td class="edit">
				<div class="edit-container">
					<i class="fas fa-pen-square"></i>
				</div>
			</td>
			<td class="weight">${thousand_separator(response.weight.id)}</td>
			<td class="date">${new Date(response.weight.created).toLocaleString('es-CL')}</td>
			<td class="plates">${response.weight.plates}</td>
			<td class="driver"></td>
			<td class="brute"></td>
			<td class="tare"></td>
			<td class="final"></td>
		`;

		tr.querySelector('.driver').innerText = (response.weight.driver === null) ? '0 KG' : thousand_separator(response.weight.driver);
		tr.querySelector('.brute').innerText = (response.weight.brute === null) ? '0 KG' : thousand_separator(response.weight.brute) + ' KG';
		tr.querySelector('.tare').innerText = (response.weight.tare === null) ? '0 KG' : thousand_separator(response.weight.tare) + ' KG';
		tr.querySelector('.final').innerText = (response.weight.net === null) ? '0 KG' : thousand_separator(response.weight.net) + ' KG';

		document.querySelector('#finished-weight__table tbody').appendChild(tr);

		document.getElementById('finished-weight__start-date').value = '';
		document.getElementById('finished-weight__end-date').value = '';
		document.getElementById('finished-weight__plates').value = '';
		document.getElementById('finished-weight__driver').value = '';

		document.getElementById('finished-weight__plates').classList.remove('has-content');
		document.getElementById('finished-weight__driver').classList.remove('has-content');
		
		document.getElementById('finished-weight__cycle-input').setAttribute('data-cycle', response.weight.cycle);
		
		const i_class = (response.weight.cycle === 2) ? 'fad fa-arrow-up' : 'fad fa-arrow-down';
		document.querySelector('#finished-weight__cycle-input i').className = i_class;

	} catch(error) { error_handler('Error al buscar pesaje por ID.', error) }
}

//FINISHED WEIGHTS -> SEARCH PLATES
const finished_weights_plates_input = e => {
	const plates = e.target.value;
	if (plates.length > 0) e.target.classList.add('has-content');
	else {
		e.target.classList.remove('has-content');
		document.querySelector('.finished-weight__cycle-dropdown.active').click();
	} 
}

const finished_weights_plates_keydown = async e => {
	
	if (e.code !== 'Tab' && e.key!== 'Enter') return;

	const 
	finished_weights = document.querySelector('#finished-weight__table'),
	weight_status = document.querySelector('#finished-weight__containers .card').getAttribute('data-weight-status'),
	plates = DOMPurify().sanitize(e.target.value.toUpperCase()),
	driver = DOMPurify().sanitize(document.getElementById('finished-weight__driver').value),
	cycle = document.getElementById('finished-weight__cycle-dropdown').getAttribute('data-cycle'),
	start_date = DOMPurify().sanitize(document.getElementById('finished-weight__start-date').value),
	end_date = DOMPurify().sanitize(document.getElementById('finished-weight__end-date').value);

	wait_for_fade_animation(finished_weights);

	try {

		const
		get_weights = await fetch('/get_finished_weights_by_plates', {
			method: 'POST', 
			headers: { 
				"Content-Type" : "application/json", 
				"Authorization" : token.value 
			}, 
			body: JSON.stringify({ weight_status, plates, driver, cycle, start_date, end_date })
		}),
		response = await get_weights.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

		//ANIMATION STUFF
		while (!finished_weights.classList.contains('animationend')) { await delay(10) }
		finished_weights.classList.remove('animationend', 'active');

		document.querySelectorAll('#finished-weight__table tbody tr').forEach(tr => { tr.remove() });

		await finished_weights_create_trs(response.weights);

		finished_weights.classList.add('fadeout-scaled-down', 'active');
		finished_weights.classList.remove('hidden');

		document.getElementById('finished-weight__start-date').value = response.date.start;
		document.getElementById('finished-weight__end-date').value = response.date.end;
		document.getElementById('finished-weight__weight-id').value = '';

		document.getElementById('finished-weight__weight-id').classList.remove('has-content');

		await delay(600)
		finished_weights.classList.remove('fadeout-scaled-down');

	} catch(error) { error_handler('Error al obtener pesaje por patente.', error) }

}

//FINISHED WEIGHTS -> SEARCH FOR DRIVER
const finished_weights_driver_keydown = async e => {

	if (e.code !== 'Tab' && e.key !== 'Enter') return;

	const 
	finished_weights = document.querySelector('#finished-weight__table'),
	weight_status = document.querySelector('#finished-weight__containers .card').getAttribute('data-weight-status'),
	driver = DOMPurify().sanitize(e.target.value),
	plates = DOMPurify().sanitize(document.getElementById('finished-weight__plates').value),
	cycle = document.getElementById('finished-weight__cycle-dropdown').getAttribute('data-cycle'),
	start_date_input = document.getElementById('finished-weight__start-date'),
	start_date = (validate_date(start_date_input.value)) ? start_date_input.value : '',
	end_date_input = document.getElementById('finished-weight__end-date'),
	end_date = (validate_date(end_date_input.value)) ? end_date_input.value : '';

	wait_for_fade_animation(finished_weights);

	try {

		const 
		get_weights = await fetch('/get_finished_weights_by_driver', {
			method: 'POST', 
			headers: { "Content-Type" : "application/json", "Authorization" : token.value }, 
			body: JSON.stringify({ weight_status, driver, plates, cycle, start_date, end_date })
		}),
		response = await get_weights.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

		//ANIMATION STUFF
		while (!finished_weights.classList.contains('animationend')) { await delay(10) }
		finished_weights.classList.remove('animationend', 'active');

		document.querySelectorAll('#finished-weight__table tbody tr').forEach(tr => { tr.remove() });

		await finished_weights_create_trs(response.weights);

		finished_weights.classList.add('fadeout-scaled-down', 'active');
		finished_weights.classList.remove('hidden');

		document.getElementById('finished-weight__start-date').value = response.date.start;
		document.getElementById('finished-weight__end-date').value = response.date.end;
		document.getElementById('finished-weight__weight-id').value = '';

		document.getElementById('finished-weight__weight-id').classList.remove('has-content');

		await delay(600)
		finished_weights.classList.remove('fadeout-scaled-down');

	} catch(error) { error_handler(`Error al buscar pesajes por chofer.`, error) }
}

//FINISHED WEIGHTS -> SELECT CYCLE
const finished_weight_cycle_select = async e => {

	if (clicked) return;
	prevent_double_click();

	let btn;
	if (e.target.matches('i') || e.target.matches('span')) btn = e.target.parentElement;
	else if (e.target.classList.contains('finished-weight__cycle-dropdown')) btn = e.target;
	else return;

	const 
	start_date_input = document.getElementById('finished-weight__start-date'),
	end_date_input = document.getElementById('finished-weight__end-date'),
	tbody = document.querySelector('#finished-weight__table .table-body'),
	data = {
		weight_status: document.querySelector('#finished-weight__containers .card').getAttribute('data-weight-status'),
		cycle: btn.getAttribute('data-cycle'),
		driver: document.getElementById('finished-weight__driver').value,
		plates: document.getElementById('finished-weight__plates').value,
		start_date: (validate_date(start_date_input.value)) ? start_date_input.value : '',
		end_date: (validate_date(end_date_input.value)) ? end_date_input.value : ''
	};
	
	//SANITIZE OBJECT
	for (let key in data) { data[key] = DOMPurify().sanitize(data[key]) }

	wait_for_fade_animation(tbody);

	try {

		const
		get_weights = await fetch('/get_finished_weights_by_cycle', {
			method: 'POST', 
			headers: { 
				"Content-Type" : "application/json", 
				"Authorization" : token.value 
			}, 
			body: JSON.stringify(data)
		}),
		response = await get_weights.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

		while (!tbody.classList.contains('animationend')) { await delay(10) };

		document.querySelectorAll('#finished-weight__table tbody tr').forEach(tr => { tr.remove() });

		await finished_weights_create_trs(response.weights);
		
		tbody.classList.add('fadeout-scaled-down');
		tbody.addEventListener('animationend', function() { this.classList.remove('fadeout-scaled-down') }, { once: true });
		tbody.classList.remove('animationend', 'hidden');

		btn.parentElement.setAttribute('data-cycle', data.cycle);
		
		const cycle_input = document.querySelector('#finished-weight__cycle-input');
		cycle_input.querySelector('input').value = btn.querySelector('span').textContent;

		let cycle_name, i_class;
		if (data.cycle === '1') {
			cycle_name = 'reception';
			i_class = 'fad fa-arrow-down';
		}
		else if (data.cycle === '2') {
			cycle_name = 'dispatch';
			i_class = 'fad fa-arrow-up';

		}
		else if (data.cycle === '3') {
			cycle_name = 'internal';
			i_class = 'fad fa-arrow-down';
		}
		else {
			cycle_name = 'service';
			i_class = 'fad fa-arrow-up';
		}

		cycle_input.className = cycle_name;
		cycle_input.querySelector('i').className = i_class;

		document.getElementById('finished-weight__start-date').value = response.date.start.split(' ')[0];
		document.getElementById('finished-weight__end-date').value = response.date.end.split(' ')[0];
		document.getElementById('finished-weight__weight-id').value = '';
		document.getElementById('finished-weight__weight-id').classList.remove('has-content');

	} catch (error) { error_handler('Error al cambiar ciclo.', error) }
}

//FINISHED WEIGHTS -> EDIT DOCUMENTS
async function finished_weights_edit_document() {
	
	if (clicked) return;
	prevent_double_click()

	const doc_id = parseInt(this.parentElement.parentElement.getAttribute('data-doc-id'));
	
	try {

		const modal = document.createElement('div');
		//modal.classList.add('hidden');
		modal.id = 'finished-weight__documents_modal';
		
		const weight_id = document.getElementById('finished-weight__modal-container');
		weight_id.addEventListener('transitionend', function() { this.classList.add('animationend') }, { once: true });
		weight_id.classList.remove('active');
		weight_id.parentElement.appendChild(modal);
		
		await edit_document_in_modal(doc_id, modal);

		while (!weight_id.classList.contains('animationend')) { await delay(20) }
		weight_id.classList.remove('animationend');

		//modal.classList.remove('hidden');
		modal.classList.add('active');

	} catch(error) { error_handler('Error al obtener datos del documento.', error) }
}

//FINISHED WEIGHTS -> ANNUL DOCUMENT
async function finished_weights_annul_document() {
	
	if (clicked) return;
	prevent_double_click();

	const 
	doc_div = this.parentElement.parentElement,
	doc_id = doc_div.getAttribute('data-doc-id');

	await weight_object.annul_document(doc_id);

	await fade_out(doc_div);
	doc_div.remove();

	document.querySelector('#finished-weight__modal__net-weight p').innerText = thousand_separator(weight_object.final_net_weight) + ' KG';
	document.querySelector('#finished-weight__modal__weight-kilos .table-body tr:first-child .containers').innerText = thousand_separator(weight_object.gross_weight.containers_weight) + ' KG';
	document.querySelector('#finished-weight__modal__weight-kilos .table-body tr:first-child .net').innerText = thousand_separator(weight_object.gross_weight.net) + ' KG';
}

//FINISHED WEIGHTS -> CHANGE WEIGHT STATUS
const change_weight_status = async (weight_id, status) => {

	weight_id = DOMPurify().sanitize(weight_object.frozen.id);
	status = DOMPurify().sanitize(status);
	try {

		const
		change_weight_status = await fetch('/change_weight_status', {
			method: 'POST',
			headers: {
				"Content-Type" : "application/json",
				"Authorization" : token.value
			},
			body: JSON.stringify({ weight_id, status })
		}),
		response = await change_weight_status.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

		const message_div = document.createElement('div');
		message_div.id = 'message-section';
		message_div.innerHTML = `
			<div id="message-close-btn">
				<i class="far fa-times"></i>
			</div>
			<div id="message-container">
				<p id="annul-weight-p">PESAJE ${thousand_separator(weight_id)}<br>${DOMPurify().sanitize(response.status)}</p>
			</div>
		`;

		document.getElementById('finished-weight__containers').appendChild(message_div);
		message_div.classList.add('active');

		document.querySelector('#finished-weight__modal-container > .close-btn-absolute').click();
		const tr = document.querySelector(`#finished-weight__table tr[data-weight-id="${weight_id}"]`);
		tr.remove();

		await delay(2000);
		message_div.classList.remove('active');
		await delay(500);
		message_div.remove();

	} catch(error) { error_handler('Error al intentar dejar pesaje como pendiente.', error) }
}

//FINISHED WEIGHTS TABLE
const finished_weights_table = async e => {

	if (clicked) return;
	prevent_double_click();

	let tr, edit = false;
	if (e.target.matches('td')) tr = e.target.parentElement;
	else if (e.target.className === 'edit-container') {
		tr = e.target.parentElement.parentElement;
		edit = true;
	}
	else if (e.target.matches('i')) {
		tr = e.target.parentElement.parentElement.parentElement; 
		edit = true;
	}

	if (!edit) {

		if (tr.classList.contains('selected')) {
			tr.classList.remove('selected');
			document.querySelector('#finished-weights__print-weight > div').classList.remove('enabled');
		}
		else {
			document.querySelectorAll('#finished-weight__table tr.selected').forEach(tr => { tr.classList.remove('selected') });
			tr.classList.add('selected');	
			document.querySelector('#finished-weights__print-weight > div').classList.add('enabled');
		}
		return
	}

	const weight_id = tr.getAttribute('data-weight-id');

	try {

		const
		get_weight = await fetch('/get_finished_weight', {
			method: 'POST', 
			headers: { 
				"Content-Type" : "application/json", 
				"Authorization" : token.value 
			}, 
			body: JSON.stringify({ weight_id })
		}),
		response = await get_weight.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

		const 
		template = await (await fetch('./templates/template-finished-weight.html')).text(),
		modal = document.getElementById('finished-weight__modal');

		modal.innerHTML = template;

		modal.querySelector('.close-btn-absolute').addEventListener('click', async () => {

			const 
			close_btn = document.querySelector('#finished-weight__containers > .close-btn-absolute'),
			modal = document.getElementById('finished-weight__modal');

			await fade_out(modal);
			modal.classList.remove('active');
			modal.innerHTML = '';

			fade_in(close_btn);
			close_btn.classList.remove('hidden');

			breadcrumbs('remove', 'weight');
			weight_object = null;

		}, { once: true });

		weight_object = new create_weight_object(response.weight_object);
		response.weight_object.documents.forEach(doc => { 
			const new_doc = new create_document_object(doc);
			doc.rows.forEach(row => {
				new_doc.rows.push(new document_row(row));
			}) 
			weight_object.documents.push(new_doc);
		});

		modal.setAttribute('data-cycle', weight_object.cycle.id);

		const 
		weight = response.weight_object,
		gross_selector = '#finished-weight__modal__weight-kilos .table-body tr:first-child',
		tare_selector = '#finished-weight__modal__weight-kilos .table-body tr:last-child';

		document.querySelector('#finished-weight__modal__created .widget-data p').innerText = weight.frozen.created;
		document.querySelector('#finished-weight__modal__user .widget-data p').innerText = weight.frozen.created_by.name.toUpperCase();
		document.querySelector('#finished-weight__modal__net-weight .widget-data p').innerText = thousand_separator(weight.final_net_weight) + ' KG';
		document.querySelector('#finished-weight__modal__vehicle .widget-data p').innerText = weight.frozen.primary_plates;
		document.querySelector('#finished-weight__modal__driver .widget-data p').innerText = weight.driver.name.toUpperCase();
		
		//GROSS WEIGHT
		document.querySelector(`${gross_selector} .date`).innerText = (weight.gross_weight.date === null) ? '-' : weight.gross_weight.date;
		document.querySelector(`${gross_selector} .user`).innerText = (weight.gross_weight.user.name === null) ? '-' : weight.gross_weight.user.name.toUpperCase();
		document.querySelector(`${gross_selector} .type`).innerText = (weight.gross_weight.type === 'A') ? 'AUTOMATICA' : 'MANUAL';
		document.querySelector(`${gross_selector} .weight`).innerText = thousand_separator(weight.gross_weight.brute) + ' KG';
		document.querySelector(`${gross_selector} .containers`).innerText = thousand_separator(weight.gross_weight.containers_weight) + ' KG';
		document.querySelector(`${gross_selector} .net`).innerText = thousand_separator(weight.gross_weight.net) + ' KG';

		//TARE WEIGHT
		document.querySelector(`${tare_selector} .date`).innerText = (weight.tare_weight.date === null) ? '-' : weight.tare_weight.date;
		document.querySelector(`${tare_selector} .user`).innerText = (weight.tare_weight.user.name === null) ? null : weight.tare_weight.user.name.toUpperCase();
		document.querySelector(`${tare_selector} .type`).innerText = (weight.tare_weight.type === 'A') ? 'AUTOMATICA' : 'MANUAL';
		document.querySelector(`${tare_selector} .weight`).innerText = thousand_separator(weight.tare_weight.brute) + ' KG';
		document.querySelector(`${tare_selector} .containers`).innerText = thousand_separator(weight.tare_weight.containers_weight) + ' KG';
		document.querySelector(`${tare_selector} .net`).innerText = thousand_separator(weight.tare_weight.net) + ' KG';

		//COMMENTS
		document.querySelector('#finished-weight__modal__gross-comments textarea').value = weight_object.gross_weight.comments;
		document.querySelector('#finished-weight__modal__tare-comments textarea').value = weight_object.tare_weight.comments;

		//DOCUMENTS		
		weight.documents.forEach(doc => {
			
			const 
			widget = document.createElement('div'),
			document_header = document.createElement('div'),
			document_body = document.createElement('div'),
			document_footer = document.createElement('div');

			widget.className = 'widget';
			widget.setAttribute('data-doc-id', doc.frozen.id);
			widget.innerHTML = `
				<div class="widget-icon">
					<i class="fal fa-file-alt"></i>
				</div>
			`;
			widget.append(document_header, document_body, document_footer);

			let origin_entity, origin_branch, destination_entity, destination_branch;
			if (weight.cycle.id === 1) {
				origin_entity = (doc.client.entity.name === null) ? '' : doc.client.entity.name;
				origin_branch = (doc.client.branch.name === null) ? '' : doc.client.branch.name;
				destination_entity = (doc.internal.entity.name === null) ? '' : doc.internal.entity.name;
				destination_branch = (doc.internal.branch.name === null) ? '' : doc.internal.branch.name;
			} else {
				origin_entity = (doc.internal.entity.name === null) ? '' : doc.internal.entity.name;
				origin_branch = (doc.internal.branch.name === null) ? '' : doc.internal.branch.name;
				destination_entity = (doc.client.entity.name === null) ? '' : doc.client.entity.name;
				destination_branch = (doc.client.branch.name === null) ? '' : doc.client.branch.name;
			}

			const 
			doc_date = (doc.date === null) ? '-' : new Date(doc.date).toLocaleString('es-CL').split(' ')[0],
			doc_number = (doc.number === null) ? '-' : thousand_separator(doc.number);

			document_header.className = 'document-header';
			document_header.innerHTML = `
				<div class="doc-btn">
					<div>
						<i class="fal fa-file-edit"></i>				
					</div>
					<span>Editar Doc.</span>
				</div>
				<div class="origin">
					<p><b>Origen:</b> ${origin_entity}</p>
					<i class="far fa-level-up"></i>
					<p><b>Sucursal:</b> ${origin_branch}</p>					
				</div>
				<div class="destination">
					<p><b>Destino:</b> ${destination_entity}</p>
					<i class="far fa-level-up"></i>
					<p><b>Sucursal:</b> ${destination_branch}</p>
				</div>
				<div class="doc-header-data">
					<div>
						<i class="fal fa-calendar-alt"></i>
						<p><b>${doc_date}</b></p>
					</div>
					<div>
						<i class="fal fa-file-alt"></i>
						<p><b>Nº Doc:</b> ${doc_number}</p>
					</div>
				</div>
				<div class="doc-btn">
					<div>
						<i class="far fa-trash-alt"></i>			
					</div>
					<span>Anular Doc.</span>	
				</div>
			`;
			document_header.querySelector('.doc-btn:first-child').addEventListener('click', finished_weights_edit_document);
			document_header.querySelector('.doc-btn:last-child').addEventListener('click', finished_weights_annul_document);

			document_body.className = 'document-body';
			document_body.innerHTML = `
				<div class="table-header">
					<table>
						<thead>
							<tr>
								<th class="line-number">Nº</th>
								<th class="container-amount">CANTIDAD</th>
								<th class="container">ENVASE</th>
								<th class="container-weight">PESO ENV.</th>
								<th class="product">PRODUCTO</th>
								<th class="cut">DESCARTE</th>
								<th class="price">PRECIO</th>
								<th class="kilos">KILOS</th>
								<th class="kilos-informed">KG. INF.</th>
								<th class="product-total">TOTAL</th>
							</tr>
						</thead>
					</table>
				</div>
				<div class="table-body">
					<table>
						<tbody></tbody>
					</table>
				</div>
			`;
			
			const 
			tbody = document_body.querySelector('tbody'),
			rows = doc.rows,
			tr_html = `
				<td class="line-number"></td>
				<td class="container-amount"></td>
				<td class="container"></td>
				<td class="container-weight"></td>
				<td class="product"></td>
				<td class="cut"></td>
				<td class="price"></td>
				<td class="kilos"></td>
				<td class="kilos-informed"></td>
				<td class="product-total"></td>
			`;
			
			let kilos = 0, kilos_inf = 0, doc_total = 0, containers = 0;

			for (let i = 0; i < rows.length; i++) {

				const tr = document.createElement('tr');
				tr.setAttribute('data-row-id', rows[i].id);
				tr.innerHTML = tr_html;
				tr.querySelector('.line-number').innerText = i + 1;
				tr.querySelector('.product').innerText = (rows[i].product.name === null) ? '-' : rows[i].product.name;
				tr.querySelector('.cut').innerText = (rows[i].product.cut === null) ? '-' : rows[i].product.cut.toUpperCase();
				tr.querySelector('.price').innerText = (rows[i].product.price === null) ? '-' : '$' + thousand_separator(rows[i].product.price);
				tr.querySelector('.kilos').innerText = (rows[i].product.kilos === null) ? '-' : thousand_separator(rows[i].product.kilos) + ' KG';
				tr.querySelector('.kilos-informed').innerText = (rows[i].product.informed_kilos === null) ? '-' : thousand_separator(rows[i].product.informed_kilos) + ' KG';
				tr.querySelector('.product-total').innerText = (rows[i].product.total === null) ? '-' : '$' + thousand_separator(rows[i].product.total);
				tr.querySelector('.container').innerText = (rows[i].container.name === null) ? '-' : rows[i].container.name;
				tr.querySelector('.container-weight').innerText = (rows[i].container.weight === null) ? '-' : rows[i].container.weight + ' KG';
				tr.querySelector('.container-amount').innerText = (rows[i].container.amount === null) ? '-' : thousand_separator(rows[i].container.amount);
				
				tbody.appendChild(tr);

				containers += 1 * rows[i].container.amount;
				kilos += 1 * rows[i].product.kilos;
				kilos_inf += 1 * rows[i].product.informed_kilos;
				doc_total += 1 * rows[i].product.total;
			}

			document_footer.className = 'document-footer';
			document_footer.innerHTML = `
				<table>
					<tbody></tbody>
				</table>
			`;

			const tr_total = document.createElement('tr');
			tr_total.innerHTML = tr_html;
			tr_total.querySelector('.container-amount').innerText = thousand_separator(containers);
			tr_total.querySelector('.kilos').innerText = thousand_separator(kilos) + ' KG';
			tr_total.querySelector('.kilos-informed').innerText = thousand_separator(kilos_inf) + ' KG';
			tr_total.querySelector('.product-total').innerText = '$' + thousand_separator(doc_total);
			document_footer.querySelector('tbody').appendChild(tr_total);

			document.getElementById('finished-weight__modal__documents-container').append(widget);
		});

		//WEIGHT IS FINISHED BUT KILOS BREAKDOWN IS PENDING
		if (weight_object.status === 'T' && !weight_object.kilos_breakdown) {
			document.querySelector('#finished-weight__kilos_breakdown .widget-tooltip').classList.add('red');
			document.querySelector('#finished-weight__kilos_breakdown .widget-tooltip span').innerText = "DESGLOCE PENDIENTE";
		}

		//BUTTONS EVENT LISTENERS IN THE BOTTOM
		
		//KILOS BREAKDOWN EVENT LISTENER
		modal.querySelector('#finished-weight__kilos_breakdown').addEventListener('click', async () => {

			if (clicked) return;
			prevent_double_click();

			let document_with_product = false;
			const docs = weight_object.documents;
			for (let i = 0; i < docs.length; i++) {
				const rows = docs[i].rows;
				for (let j = 0; j < rows.length; j++) {
					if (rows[j].product.code !== null) {
						document_with_product = true;
						break;
					}
				}
			}

			if (!document_with_product) return;

			const modal = document.createElement('div');
			modal.id = 'finished-weight__documents_modal';

			const finished_weight = document.getElementById('finished-weight__modal-container');
			finished_weight.classList.remove('active');

			finished_weight.parentElement.appendChild(modal);
			documents_kilos_breadown(modal);
		});

		//ADD DOCUMENTS BTN EVENT LISTENER
		modal.querySelector('#finished-weight__add-docs').addEventListener('click', async () => {

			if (clicked) return;
			prevent_double_click();

			const modal = document.createElement('div');
			modal.id = 'finished-weight__documents_modal';

			const finished_weight = document.getElementById('finished-weight__modal-container');
			finished_weight.classList.remove('active');

			finished_weight.parentElement.appendChild(modal);
			add_doc_widget(modal);
		});

		//ADD TARE CONTAINERS BTN EVENT LISTENER
		modal.querySelector('#finished-weight__add-tare-containers').addEventListener('click', async () => {
			
			if (clicked) return;
			prevent_double_click();

			const 
			modal = document.createElement('div'),
			finished_weight = document.getElementById('finished-weight__modal-container');

			modal.id = 'finished-weight__documents_modal';
			finished_weight.classList.remove('active');
			finished_weight.parentElement.appendChild(modal);

			tare_containers_widget(modal);
		});

		//PRINT WEIGHT
		modal.querySelector('#finished-weight__print').addEventListener('click', async () => {
			try {

				await weight_object.print_weight();

			} catch(error) { console.log('Error al intentar imprimir pesaje') }
		});

		//CHANGE WEIGHT STATUS TO PENDING
		document.querySelector('#finished-weight__change-to-pending').addEventListener('click', e => {
			change_weight_status(weight_object.frozen.id, 'I');
		});

		if (document.querySelector('#finished-weight__containers > .card').getAttribute('data-weight-status') === 'T') {
			modal.querySelector('#finished-weight__annul').addEventListener('click', async function() {

				if (btn_double_clicked(this)) return;
	
				try {
	
					const
					weight_id = DOMPurify().sanitize(weight_object.frozen.id),
					delete_weight = await fetch('/annul_weight', {
						method: 'POST', 
						headers: { 
							"Content-Type" : "application/json", 
							"Authorization" : token.value 
						}, 
						body: JSON.stringify({ weight_id })
					}),
					response = await delete_weight.json();
		
					if (response.error !== undefined) throw response.error;
					if (!response.success) throw 'Success response from server is false.';
					
					const message_div = document.createElement('div');
					message_div.id = 'message-section';
					message_div.innerHTML = `
						<div id="message-close-btn">
							<i class="far fa-times"></i>
						</div>
						<div id="message-container">
							<p id="annul-weight-p">PESAJE ${thousand_separator(weight_id)}<br>ANULADO</p>
						</div>
					`;
	
					document.getElementById('finished-weight__containers').appendChild(message_div);
					message_div.classList.add('active');
	
					document.querySelector('#finished-weight__modal-container > .close-btn-absolute').click();
					const tr = document.querySelector(`#finished-weight__table tr[data-weight-id="${weight_id}"]`);
					tr.remove();
	
					await delay(2000);
					message_div.classList.remove('active');
					await delay(500);
					message_div.remove();
					
				} catch (error) { error_handler('Error al eliminar pesaje', error) }
			});
		}
		else {
			modal.querySelector('#finished-weight__annul > i').className = 'far fa-check';
			modal.querySelector('#finished-weight__annul .widget-tooltip span').innerText = 'CAMBIAR ESTADO A TERMINADO';
			modal.querySelector('#finished-weight__annul').addEventListener('click', e => {
				change_weight_status(weight_object.frozen.id, 'T');
			});
		}

		const close_btn = document.querySelector('#finished-weight__containers > .close-btn-absolute');
		await fade_out(close_btn);
		close_btn.classList.add('hidden');

		fade_in(modal, 0, 'flex');
		modal.classList.add('active');
		breadcrumbs('add', 'weight', 'PESAJE ' + thousand_separator(weight.frozen.id));

	} catch(error) { error_handler(`Error al obtener datos del pesage Nº ${weight_id}`, error) }
}

//FINISHED WEIGHTS TABLE -> PRINT BTN
const finished_weights_print_weight = async function() {

	if (btn_double_clicked(this)) return;
	if (!!document.querySelector('#finished-weight__table tr.selected') === false) return;
	if (!document.querySelector('#finished-weights__print-weight > div').classList.contains('enabled')) return;

	const weight_id = document.querySelector('#finished-weight__table tr.selected').getAttribute('data-weight-id');

	try {

		const
		get_weight = await fetch('/get_finished_weight', {
			method: 'POST', 
			headers: { 
				"Content-Type" : "application/json", 
				"Authorization" : token.value 
			}, 
			body: JSON.stringify({ weight_id })
		}),
		response = await get_weight.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

		weight_object = new create_weight_object(response.weight_object);
		response.weight_object.documents.forEach(doc => { 
			const new_doc = new create_document_object(doc);
			doc.rows.forEach(row => {
				new_doc.rows.push(new document_row(row));
			}) 
			weight_object.documents.push(new_doc);
		});

		await weight_object.print_weight();
		weight_object = null;

	} catch(error) { error_handler('Error al intentar imprimir pesaje', error) }
}

//CREATE VEHICLE TABLE ELEMENTS FOR FILTER
function create_weight_filter_vehicles(filter) {
	return new Promise(async (resolve, reject) => {

		try {
			const 
			fetch_vehicles = await fetch('/get_vehicles', {
				method: 'POST',
				headers: { 
					"Content-Type" : "application/json", 
					"Authorization" : token.value 
				},
				body: JSON.stringify({ vehicles: filter })
			}),
			response = await fetch_vehicles.json();
			
			if (response.error !== undefined) throw response.error;
			
			response.data.forEach(vehicle => {
				const tr = document.createElement('tr');
				tr.innerHTML = `
					<td class="primary-plates">${DOMPurify().sanitize(vehicle.primary_plates)}</td>
					<td class="secondary-plates"></td>
					<td class="driver">${DOMPurify().sanitize(vehicle.driver)}</td>
					<td class="phone">${DOMPurify().sanitize(vehicle.phone)}</td>
					<td class="internal">
						<div>
							<i></i>
						</div>
					</td>
					<td class="status">
						<div>
							<i></i>
						</div>
					</td>
				`;
				

				tr.querySelector('.secondary-plates').innerText = (vehicle.secondary_plates === null) ? '-' : vehicle.secondary_plates;

				tr.querySelector('.internal i').className = (vehicle.internal === 0) ? 'far fa-times' : 'far fa-check';
				tr.querySelector('.status i').className = (vehicle.status === 0) ? 'far fa-times' : 'far fa-check';

	
				document.querySelector('#create-weight__select-vehicle-table .tbl-content tbody').appendChild(tr);
			});

			document.querySelector('.create-weight__vehicles-type.active').classList.remove('active');
			document.getElementById('create-weight__show-vehicles-' + filter).classList.add('active');

			resolve();
		} catch (error) { error_handler('Error al buscar lista de vehiculos en /get_vehicles', error); return reject() }
	});
}

/*** SEARCH VEHICLE INPUT ***/
async function create_weight_search_vehicle(e) {

	const
	input = e.target,
	create_weight_btn = document.getElementById('create-weight-btn');

	if (input.value.length < 6) {
		if (input.parentElement.querySelector('.icon-container .active')) input.parentElement.querySelector('.icon-container .active').classList.remove('active');
		if (create_weight_btn.classList.contains('active')) create_weight_btn.classList.remove('active');
		return;
	}

	const partial_plate = DOMPurify().sanitize(input.value);

	try {
		const
		search_vehicle = await fetch('/search_vehicle', {
			method: 'POST',
			headers: { 
				"Content-Type" : "application/json", 
				"Authorization" : token.value 
			},
			body: JSON.stringify({ partial_plate })
		}),
		response = await search_vehicle.json();

		if (response.error !== undefined) throw response.error;
		if (input.parentElement.querySelector('.icon-container .active')) 
			input.parentElement.querySelector('.icon-container .active').classList.remove('active');

		let icon;
		if (response.vehicle_found) {

			icon = input.parentElement.querySelector('.icon-container .found');

			if (!create_weight_btn.classList.contains('active') && !!document.querySelector('#create-weight__cycle > .active')) 
				create_weight_btn.classList.add('active');
		} else {

			icon = input.parentElement.querySelector('.icon-container .not-found');

			if (create_weight_btn.classList.contains('active')) 
				create_weight_btn.classList.remove('active');
		}
		icon.classList.add('active');
	} catch (error) { error_handler('Error al buscar vehículo en /search_vehicle.', error) }
}

async function create_vehicle_close_modal() {
	
	if (clicked) return;
	prevent_double_click();

	const modal = document.getElementById('create-weight__modal')

	modal.classList.remove('active');
	breadcrumbs('remove', 'weight');
	await delay(750);
	modal.innerHTML = '';
	modal.classList.remove('overflow-hidden');
}

async function create_vehicle_select_driver() {

	if (clicked) return;
	prevent_double_click();

	const
	plates = DOMPurify().sanitize(document.querySelector('#create-vehicle__primary-plates').value.replace(/[^a-zA-Z0-9]/gm, '').toUpperCase()),
	tooltip = document.querySelector('#create-weight__create-vehicle__vehicle-data .create-vehicle-data .widget-tooltip');

	if (plates.length < 6) {	
		tooltip.firstElementChild.innerText = 'Patente del vehículo requiere mínimo 6 caracteres.'
		fade_in(tooltip);
		tooltip.classList.remove('hidden');
		return;
	}

	try {

		const
		template = await (await fetch('./templates/template-change-driver.html')).text(),
		check_vehicle = await fetch('/check_primary_plates', {
			method: 'POST', 
			headers: { 
				"Content-Type" : "application/json", 
				"Authorization" : token.value 
			}, 
			body: JSON.stringify({ plates })
		}),
		response = await check_vehicle.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';
		if (response.existing) {
			tooltip.firstElementChild.innerText = 'Patente ya existe en la base de datos';
			fade_in(tooltip);
			tooltip.classList.remove('hidden');
			return;
		}

		const
		modal = document.getElementById('create-weight__modal'),
		this_div = document.getElementById('create-weight__create-vehicle__vehicle-data');

		let driver_div1, driver_div2;

		if (!document.getElementById('create-weight__change-driver')) {

			const div = document.createElement('div');

			div.innerHTML = template;
			driver_div1 = div.querySelector('#create-weight__change-driver-container > div:nth-child(1)');
			driver_div2 = div.querySelector('#create-weight__change-driver-container > div:nth-child(2)');
			driver_div1.classList.add('right');

			document.getElementById('create-weight__create-vehicle-container').append(driver_div1, driver_div2);
			await change_driver_create_tr(response.drivers);

			document.querySelector('#change-driver__type-btns .default-driver').remove();

			document.getElementById('create-weight__change-driver__close-modal').id = 'create-vehicle__select-driver__back-btn';
			document.getElementById('create-vehicle__select-driver__back-btn').addEventListener('click', create_vehicle_select_driver_back_btn);

			document.getElementById('create-weight__change-driver__set-driver').id = 'create-vehicle__select-driver__choose-transport-btn';
			document.getElementById('create-vehicle__select-driver__choose-transport-btn').addEventListener('click', create_vehicle_select_driver_choose_transport_btn);

			document.querySelector('#create-vehicle__select-driver__choose-transport-btn .desc-container p').innerText = 'TRANSPORTE';
			document.querySelector('#create-vehicle__select-driver__choose-transport-btn .desc-container i').className = 'fal fa-layer-plus';

			document.querySelector('#create-weight__change-driver__search-driver input').addEventListener('input', select_driver_search_driver);

			document.getElementById('create-weight__change-driver__create-driver-btn').addEventListener('click', select_driver_create_driver_btn);
			document.getElementById('create-weight__change-driver__back-to-select-driver').addEventListener('click', select_driver_create_driver_back_btn);
			document.getElementById('create-weight__change-driver__create-driver').addEventListener('click', select_driver_create_driver);
			document.getElementById('create-weight__create-driver-rut').addEventListener('input', select_driver_create_driver_rut_input);
			document.getElementById('create-weight__create-driver-rut').addEventListener('keydown', select_driver_create_driver_rut_keydown);
			
			document.querySelectorAll('#create-weight__change-driver__create .input-effect').forEach(input => {
				input.addEventListener('input', custom_input_change);
			});

			document.getElementById('create-driver__active-cbx').checked  = true;

			document.querySelectorAll('#change-driver__type-btns > div:not(.default-driver)').forEach(driver_type => {
				driver_type.addEventListener('click', list_drivers_by_type);
			});

		} else driver_div1 = document.getElementById('create-weight__change-driver');

		const table = modal.querySelector('#create-weight__change-driver .tbl-content tbody');
		mutation_observer = new MutationObserver(() => {
			const btn = modal.querySelector('#create-vehicle__select-driver__choose-transport-btn');
			if (!!table.querySelector('tr.selected') && !btn.classList.contains('enabled')) btn.classList.add('enabled');
			else if (!!table.querySelector('tr.selected') === false && btn.classList.contains('enabled')) btn.classList.remove('enabled');
		});
		mutation_observer.observe(table, { attributes: true });

		this_div.classList.add('left');
		driver_div1.classList.remove('hidden');
		await delay(500);
		this_div.classList.add('hidden');
		driver_div1.classList.remove('right');
	} catch(error) { error_handler('Error al buscar crear vehiculo.', error) }
}

async function create_vehicle_select_driver_back_btn() {
	
	if (clicked) return;
	prevent_double_click();

	const
	current_div = document.getElementById('create-weight__change-driver'),
	previous_div = document.getElementById('create-weight__create-vehicle__vehicle-data');

	current_div.classList.add('right');
	previous_div.classList.remove('hidden');
	await delay(500);
	current_div.classList.add('hidden');
	previous_div.classList.remove('left');
	mutation_observer.disconnect();
	mutation_observer = null;
}

async function create_vehicle_select_driver_choose_transport_btn() {

	if (clicked) return;
	prevent_double_click();

	const current_div = document.getElementById('create-weight__change-driver');
	mutation_observer.disconnect();
	mutation_observer = null;

	if (document.querySelector('#create-document__origin-entity')) {
		const next_div = document.querySelector('#create-document__origin-entity');
		current_div.classList.add('left');
		next_div.classList.remove('hidden');
		await delay(500);
		current_div.classList.add('hidden');
		next_div.classList.remove('right');
		return;
	}

	try {

		const
		get_transport = await fetch('/get_transport', { 
			method: 'GET', 
			headers: { 
				"Cache-Control" : "no-cache", 
				"Authorization" : token.value 
			} 
		}),
		response = await get_transport.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

		const 
		template = await (await fetch('./templates/template-create-document.html')).text(),
		div = document.createElement('div');

		div.innerHTML = template;
		
		const
		entities_div = div.querySelector('#create-document__origin-entity'),
		create_entity_div = div.querySelector('#create-document__origin-create-entity'),
		modal = document.getElementById('create-weight__modal');

		entities_div.classList.add('right', 'hidden');

		document.getElementById('create-weight__create-vehicle-container').append(create_entity_div, entities_div);

		document.querySelector('#create-document__origin-entity .header h3').innerText = 'SELECCIONAR TRANSPORTISTA';

		document.getElementById('create-document__select-entity__close-entity-modal').id = 'create-vehicle__select-transport__back-btn';
		document.getElementById('create-document__select-entity__select-branch').id = 'create-vehicle__select-transport__finish-btn';
		document.getElementById('create-vehicle__select-transport__finish-btn').classList.remove('disabled');
		document.getElementById('create-vehicle__select-transport__finish-btn').classList.add('enabled');
		document.getElementById('create-vehicle__select-transport__back-btn').removeAttribute('onclick');
		
		document.querySelector('#create-vehicle__select-transport__finish-btn .desc-container p').innerText = 'CREAR';
		document.querySelector('#create-vehicle__select-transport__finish-btn .desc-container i').className = 'far fa-check-double';

		const
		entities = response.entities,
		ul = document.querySelector('#create-document__origin-entity-list ul');
		for (let i = 0; i < entities.length; i++) {
			const li = document.createElement('li');
			li.setAttribute('data-entity-id', entities[i].id);
			li.innerText = entities[i].name;
			li.addEventListener('click', e => {
				if (e.target.parentElement.querySelector('.selected'))
					e.target.parentElement.querySelector('.selected').classList.remove('selected');
				e.target.classList.toggle('selected');
			});
			ul.appendChild(li);
		}

		/***************** EVENT LISTENERS ********************/

		//BACK TO SELECT DRIVER
		modal.querySelector('#create-vehicle__select-transport__back-btn').addEventListener('click', create_vehicle_select_transport_back_btn);

		//CREATE ENTITY BTN
		modal.querySelector('#create-document__select-entity__create-entity').addEventListener('click', create_document_create_entity);

		//SEARCH ENTITY
		modal.querySelector('#create-document__select-entity__search-origin').addEventListener('input', create_document_search_client_entity);
		modal.querySelector('#create-document__select-entity__search-origin').addEventListener('keydown', create_document_search_client_jump_to_li);

		//SEARCH ENTITY
		modal.querySelector('#create-document__select-entity__search-origin').addEventListener('input', create_document_search_client_entity);
		modal.querySelector('#create-document__select-entity__search-origin').addEventListener('keydown', create_document_search_client_jump_to_li);
		
		//CREATE ENTITY -> BACK TO ENTITIES BTN
		modal.querySelector('#create-document__create-entity__back-to-entities').addEventListener('click', create_document_create_entity_back_to_entities);
		
		//CUSTOM SELECT FOR INTERNAL ENTITIES AND INTERNAL BRANCH
		document.querySelectorAll('#create-document__header .widget-with-select').forEach(widget => {
			widget.addEventListener('keydown', custom_select_navigate_li);
		});
	
		modal.querySelectorAll('#create-document__header .custom-select ul li:not(.disabled)').forEach(select => {
			select.addEventListener('click', select_option_from_custom_select);
		});

		//SELECT TRANSPORT -> ACCEPT BTN
		document.querySelector('#create-vehicle__select-transport__finish-btn').addEventListener('click', create_vehicle_accept_btn);

		const next_div = current_div.parentElement.lastElementChild;
		current_div.classList.add('left');
		next_div.classList.remove('hidden');
		await delay(500);
		current_div.classList.add('hidden');
		next_div.classList.remove('right');
	} catch(error) { error_handler('Error al obtener entidades para transportista.', error) }

}

async function create_vehicle_select_transport_back_btn() {
	
	if (clicked) return;
	prevent_double_click();

	const
	current_div = document.querySelector('#create-document__origin-entity'),
	previous_div = document.querySelector('#create-weight__change-driver'),
	table = document.querySelector('#create-weight__change-driver .tbl-content tbody');

	mutation_observer = new MutationObserver(() => {
		const btn = modal.querySelector('#create-vehicle__select-driver__choose-transport-btn');
		if (!!table.querySelector('tr.selected') && !btn.classList.contains('enabled')) btn.classList.add('enabled');
		else if (!!table.querySelector('tr.selected') === false && btn.classList.contains('enabled')) btn.classList.remove('enabled');
	});
	mutation_observer.observe(table, { attributes: true });

	current_div.classList.add('right');
	previous_div.classList.remove('hidden');
	await delay(500);
	current_div.classList.add('hidden');
	previous_div.classList.remove('left');
}

//FILTER VEHICLES WITH BUTTONS
async function create_weight_filter_vehicles_buttons() {

	if (clicked) return;
	prevent_double_click();

	const 
	btn = this,
	filter = btn.id.replace('create-weight__show-vehicles-', '');

	document.querySelectorAll('#create-weight__select-vehicle-table .tbl-content tr').forEach(tr => { tr.remove() });
	await create_weight_filter_vehicles(filter);

}

/**************************************** WEIGHT FUNCTIONS ****************************************/

//WEIGHT OBJECT
let weight_object;
class create_weight_object {

	print_weight() {
		return new Promise(async (resolve, reject) => {
			try {
				
				const 
				weight_id = this.frozen.id,
				get_weight = await fetch('/get_finished_weight', {
					method: 'POST', 
					headers: { 
						"Content-Type" : "application/json",
						"Authorization" : token.value
					}, 
					body: JSON.stringify({ weight_id })
				}),
				response = await get_weight.json();
			
				if (response.error !== undefined) throw response.error;
				if (!response.success) throw 'Success response from server is false.';

				await load_script('js/qz-tray.js');
				await load_script('js/print.js');

				//PRINT WITH DOT MATRIX
				try {
					
					if (!await qz.websocket.isActive()) await qz.websocket.connect();
					console.log("connected to socket");
			
					const printer = await qz.printers.find("OKI");
					console.log(`Printer ${printer} found!`);

					const config = qz.configs.create(printer);
					console.log('ok')

					await print_with_dot_matrix(config, response.weight_object);
					return resolve();
			
				} catch(print_error) { console.log(`Couldn't connect to printer. ${print_error}`) }

				//CREATE WINDOW AND PRINT WITH BROWSER
				const mywindow = window.open('https://192.168.1.90:3000/print', 'PRINT');
				
				mywindow.document.body.onload = async () => {

					await mywindow.print_with_browser(response.weight_object);

					await delay(100)
					//mywindow.document.close(); // necessary for IE >= 10
					mywindow.focus(); // necessary for IE >= 10*/

					mywindow.print();

					//mywindow.close();

					return resolve();
				}
				
			} catch(error) { error_handler('Error al intentar imprimir pesaje', error); return reject(error) }
		})
	}

	update_driver(driver_id, set_driver_as_default) {
		return new Promise(async (resolve, reject) => {
			driver_id = DOMPurify().sanitize(driver_id);
			const weight_id = DOMPurify().sanitize(this.frozen.id);
			try {
				const update = await fetch('/update_driver', {
					method: 'POST', 
					headers: { 
						"Content-Type" : "application/json",
						"Authorization" : token.value
					}, 
					body: JSON.stringify({ weight_id, driver_id, set_driver_as_default })
				}),
				response = await update.json();

				if (response.error !== undefined) throw response.error;
				if (!response.success) throw 'Success response from server is false.';

				this.driver.id = response.driver.id;
				this.driver.name = response.driver.name;
				this.driver.rut = response.driver.rut;
				return resolve();
			} catch(error) { error_handler('Error al actualizar chofer en pesaje en /update_driver', error); return reject(error) }
		})
	}

	annul_document(doc_id) {
		return new Promise(async (resolve, reject) => {
			doc_id = DOMPurify().sanitize(doc_id);
			try {
				const
				annul = await fetch('/annul_document', {
					method: 'POST', 
					headers: { 
						"Content-Type" : "application/json",
						"Authorization" : token.value 
					}, 
					body: JSON.stringify({ doc_id })
				}),
				response = await annul.json();

				if (response.error !== undefined) throw response.error;
				if (!response.success) throw 'Success response from server is false.';

				weight_object.gross_weight.containers_weight = response.containers_weight;
				weight_object.gross_weight.net = response.gross_net;
				weight_object.final_net_weight = response.final_net_weight;

				const docs = weight_object.documents;
				for (let i = 0; i < docs.length; i++) {
					if (docs[i].frozen.id === parseInt(doc_id)) {
						weight_object.documents.splice(i, 1);
					}
				}

				return resolve(true);
			} catch (error) { error_handler('Error al anular documento en /annul_document', error); reject(error) }
		})
	}

	save_weight() {
		return new Promise(async (resolve, reject) => {
			try {

				const
				weight_id = DOMPurify().sanitize(this.frozen.id),
				process = DOMPurify().sanitize(this.process),
				save_weight = await fetch('/save_weight', {
					method: 'POST', 
					headers: { 
						"Content-Type" : "application/json",
						"Authorization" : token.value
					}, 
					body: JSON.stringify({ weight_id, process })
				}),
				response = await save_weight.json();

				if (response.error !== undefined) throw response.error;
				if (!response.success) throw 'Success response from server is false.';
				
				if (response.process === 'gross') this.gross_weight.status = response.status;
				else this.tare_weight.status = response.status;
				
				return resolve(true);
			} catch(error) { error_handler('Error al guardar peso.', error); return reject(error) }
		})
	}

	constructor(weight_object) {
		this.average_weight = weight_object.average_weight;
		this.cycle = weight_object.cycle;
		this.documents = [];
		this.default_data = weight_object.default_data;
		this.driver = weight_object.driver;
		this.frozen = weight_object.frozen;
		Object.freeze(this.frozen);
		this.gross_weight = weight_object.gross_weight;
		this.last_weights = weight_object.last_weights;
		this.final_net_weight = weight_object.final_net_weight;
		this.kilos = weight_object.kilos;
		this.kilos_breakdown = weight_object.kilos_breakdown;
		this.process = weight_object.default_data.process;
		this.secondary_plates = weight_object.secondary_plates;					
		this.status = weight_object.status;
		this.tara_type = 'automatica';
		this.tare_containers = weight_object.tare_containers;
		this.tare_weight = weight_object.tare_weight;
		this.transport = weight_object.transport;
	}
}

function create_weight(response) {
	return new Promise(async (resolve, reject) => {

		const 
		status = (response.weight_object.default_data.process === 'gross') ? response.weight_object.gross_weight.status : response.weight_object.tare_weight.status,
		step_2 = document.createElement('div');
		
		document.getElementById('create-weight__container').appendChild(step_2);
		step_2.className = 'hidden';
		step_2.setAttribute('data-process', response.weight_object.default_data.process);
		step_2.setAttribute('data-status', status);
		step_2.setAttribute('data-cycle', response.weight_object.cycle.id);
		step_2.innerHTML = response.template;
	
		console.log(response.weight_object)

		weight_object = new create_weight_object(response.weight_object);
		response.weight_object.documents.forEach(doc => { 
			const new_doc = new create_document_object(doc);
			doc.rows.forEach(row => {
				new_doc.rows.push(new document_row(row));
			}) 
			weight_object.documents.push(new_doc);
			create_documents_table_row(new_doc);
		});

		if (weight_object.kilos_breakdown) {
			try {

				const
				get_breakdown = await fetch('/kilos_breakdown', {
					method: 'POST', 
					headers: { 
						"Content-Type" : "application/json",
						"Authorization" : token.value 
					}, 
					body: JSON.stringify({ weight_id: weight_object.frozen.id })
				}),
				response = await get_breakdown.json();

				if (response.error !== undefined) throw response.error;
				if (!response.success) throw 'Success response from server is false.';

				weight_object.breakdown = response.breakdown;

			} catch(error) { error_handler('Error al obtener desgloce de kilos.', error); return reject(error) }
		}
	
		//EVENT LISTENERS
		//step_2.querySelector('.close-btn-absolute').addEventListener('click', save_weight_widget);
		document.getElementById('new-weight__widget__tara-type').addEventListener('click', change_tara_widget);		
		document.getElementById('new-weight__widget__cycle-type').addEventListener('click', change_cycle_widget);
		document.getElementById('new-weight__widget__process-type').addEventListener('click', change_process_widget);
		document.querySelector('#new-weight__add-secondary-plates').addEventListener('keydown', add_secondary_plates);
		document.getElementById('new-weight__widget__driver-data').addEventListener('click', change_driver_widget);
		document.getElementById('add-doc').addEventListener('click', function() {
			if (clicked) return;
			prevent_double_click();

			const modal = document.getElementById('create-weight__modal');
			add_doc_widget(modal);
		});
		document.querySelector('#take-weight-container').addEventListener('click', take_weight_widget);
	
		document.querySelectorAll('#save-cancel-btns > div').forEach(save_cancel_weight => {
			save_cancel_weight.addEventListener('mouseenter', save_cancel_mouse_enter);
			save_cancel_weight.addEventListener('mouseleave', save_cancel_mouse_leave);
			save_cancel_weight.addEventListener('click', save_cancel_click);
		});
	
		document.querySelector('#weight__documents-table tbody').addEventListener('click', document_table_click);
	
		document.querySelector('#new_weight__comments textarea').addEventListener('keydown', weight_comments_update);
		document.querySelector('#new_weight__comments textarea').addEventListener('input', e => {
			const textarea = e.target;
			if (textarea.value.length===0 && textarea.classList.contains('has-content')) { textarea.className = '' } 
			else if (textarea.value.length > 0 && !textarea.classList.contains('has-content')) { textarea.className = 'has-content' }
		});
		document.getElementById('weight__add-containers-btn').addEventListener('click', () => {
			
			if (clicked) return;
			prevent_double_click();
			tare_containers_widget(document.getElementById('create-weight__modal'));	
		});
		document.querySelector('#weight__empty-containers-table tbody').addEventListener('click', tare_containers_delete);
	
		document.getElementById('new-weight__widget__kilos-breakdown').addEventListener('click', () => {
			const modal = document.getElementById('create-weight__modal');
			documents_kilos_breadown(modal);
		});
		document.getElementById('new-weight__widget__delete-weight').addEventListener('click', annul_weight_widget);
		document.getElementById('new-weight__widget__print-weight').addEventListener('click', () => {
			weight_object.print_weight();
		});
		document.getElementById('new-weight__widget__finalize').addEventListener('click', finalize_weight_widget);
	
		document.querySelector('#new-weight__widget__created .widget-data p').innerText = weight_object.frozen.created;
		document.querySelector('#new-weight__widget__created_by .widget-data p').innerText = weight_object.frozen.created_by.name;
		document.querySelector('#new-weight__widget__cycle-type .header-check-type p').innerText = weight_object.cycle.name;
		document.querySelector('#new-weight__widget__vehicle-data .widget-data:nth-child(2) p').innerText = weight_object.frozen.primary_plates;
		document.querySelector('#new-weight__widget__vehicle-data .widget-data:nth-child(4) input').value = weight_object.secondary_plates;
		document.querySelector('#new-weight__widget__driver-data .widget-data:nth-child(2) p').innerText = weight_object.driver.name;
		document.querySelector('#new-weight__widget__driver-data .widget-data:nth-child(4) p').innerText = weight_object.driver.rut;
		document.querySelector('#new-weight__widget__transport-data .widget-data:nth-child(2) p').innerText = weight_object.transport.name;
		document.querySelector('#new-weight__widget__transport-data .widget-data:nth-child(4) p').innerText = weight_object.transport.rut;
	
		const process_name = (weight_object.process === 'gross') ? 'PESO BRUTO' : 'PESO TARA';
		document.querySelector('#new-weight__widget__process-type .header-check-type p').innerText = process_name;
	
		if (weight_object.last_weights.length > 0) {
			const weights = weight_object.last_weights;	
			weights.forEach(weight => {
				const
				tr = document.createElement('tr'),
				td1 = document.createElement('td'),
				td2 = document.createElement('td'),
				td3 = document.createElement('td');
		
				tr.append(td1, td2, td3);
				td1.innerText = thousand_separator(weight.id);
				td2.innerText = new Date(weight.tare_date).toLocaleString('es-CL').split(' ')[0];
				td3.innerText = thousand_separator(weight.tare_net);
				document.querySelector('#tara-history-table .tbl-content tbody').appendChild(tr);
			})
		} else document.getElementById('gross-weight__tara-weight').innerText = '---';
		
		create_tare_containers_body_row();
	
		const comments = document.querySelector('#new_weight__comments textarea');
		comments.value = (weight_object.default_data.process === 'gross') ? weight_object.gross_weight.comments : weight_object.tare_weight.comments;

		if (comments.value.length > 0) comments.classList.add('has-content');
	
		//WEIGHT DATA IN FOOTER

		document.querySelector('#take-weight-btn h5').innerHTML = (weight_object.default_data.process === 'gross') ? 'PESAR<br>BRUTO' : 'PESAR<br>TARA';

		document.getElementById('gross-weight__containers').innerText = `${thousand_separator(weight_object.gross_weight.containers_weight)} KG`;
		document.getElementById('tare-weight__containers').innerText = `${thousand_separator(weight_object.tare_weight.containers_weight)} KG`;

		const doc_kilos = (weight_object.cycle.id===1) ? weight_object.kilos.informed : weight_object.kilos.internal;
	
		document.getElementById('gross-weight__docs-weight').innerText = `${thousand_separator(doc_kilos)} KG`;
		document.getElementById('tare-weight__docs-weight').innerText = `${thousand_separator(doc_kilos)} KG`;
	
		document.getElementById('gross-weight__brute').innerText = `${thousand_separator(weight_object.gross_weight.brute)} KG`;
		document.getElementById('tare-weight__brute').innerText = `${thousand_separator(weight_object.tare_weight.brute)} KG`;
	
		document.getElementById('gross-weight__net').innerText = `${thousand_separator(weight_object.gross_weight.net)} KG`;
		document.getElementById('tare-weight__gross-weight').innerText = `${thousand_separator(weight_object.gross_weight.net)} KG`;
	
		if (weight_object.tare_weight.status > 1 || weight_object.final_net_weight > 0) {
			document.getElementById('gross-weight__tara-weight').innerText = `${thousand_separator(weight_object.tare_weight.net)} KG`;
			document.getElementById('gross-weight__tara-weight').nextElementSibling.innerText = 'PESO NETO TARA';
			
			document.getElementById('gross__final-net-weight').innerText = `${thousand_separator(weight_object.final_net_weight)} KG`;
			document.getElementById('gross__final-net-weight').nextElementSibling.innerText = 'PESO NETO FINAL';
		} else {
			document.getElementById('gross-weight__tara-weight').innerText = `${thousand_separator(weight_object.average_weight)} KG`;
			if (weight_object.gross_weight.status > 1) document.getElementById('gross__final-net-weight').innerText = `${thousand_separator(weight_object.gross_weight.net - weight_object.average_weight)} KG`;
		}
		
		document.getElementById('tare-weight__net').innerText = `${thousand_separator(weight_object.tare_weight.net)} KG`;
		document.getElementById('tare__final-net-weight').innerText = `${thousand_separator(weight_object.final_net_weight)} KG`;
		
		breadcrumbs('add', 'weight', 'PESAJE ' + thousand_separator(weight_object.frozen.id));
		step_2.id = 'create-weight-step-2';
		return resolve();
	})	
}

async function create_weight_btn() {

	if (clicked || !this.classList.contains('active') ) return;
	prevent_double_click();

	const
	cycle = parseInt(document.querySelector('.weight__type.active').getAttribute('data-weight-type')),
	plates = document.getElementById('create-weight__search-vehicles').value,
	step_1 = document.getElementById('create-weight-step-1');

	step_1.classList.add('fadeout-scaled-up');
	step_1.addEventListener('animationend', () => { step_1.classList.add('animationend') }, { once: true });

	try {

		const
		new_weight = await fetch('/create_new_weight', { 
			method: 'POST', 
			headers: { 
				"Content-Type" : "application/json",
				"Authorization" : token.value 
			}, 
			body: JSON.stringify({ cycle, plates }) 
		}),
		response = await new_weight.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

		const template = await (await fetch('./templates/template-weight-step-2.html')).text();
		response.template = template;

		breadcrumbs('remove', 'weight');
		await create_weight(response);

		while (!step_1.classList.contains('animationend') || !!document.getElementById('create-weight-step-2') === false) { await delay(20) }

		const step_2 = document.getElementById('create-weight-step-2');

		step_1.classList.add('hidden');
		step_2.classList.remove('hidden');
		step_2.classList.add('fadeout-scaled-down', 'active');

		await delay(550);
		step_2.classList.remove('fadeout-scaled-down');
		step_1.classList.remove('fadeout-scaled-up', 'animationend', 'active');

		document.querySelectorAll('#create-weight__select-vehicle-table .tbl-content tbody tr').forEach(tr => {
			tr.remove();
		});

		const plates_input = document.getElementById('create-weight__search-vehicles');
		plates_input.value = '';
		plates_input.classList.remove('has-content');
		plates_input.parentElement.querySelector('.icon-container .active').classList.remove('active');
		document.querySelector('#create-weight-btn').classList.remove('active');
		document.querySelector('#create-weight__cycle > .active').classList.remove('active');

		socket.emit('new weight created by other user', weight_object.frozen.id);
		
	} catch (error) { error_handler('Error al crear pesaje.', error); return }
}

/****************** CHANGE TARA FUNCTIONS ******************/
async function change_tara_widget() {

	if (clicked) return;
	prevent_double_click();

	const modal = document.getElementById('create-weight__modal');
	try {

		const template = await (await fetch('./templates/template-change-tara.html')).text();

		modal.innerHTML = template;
		modal.querySelector('#create-weight__change-tara__close-modal').addEventListener('click', header_check_close_modal);
		document.querySelector('#create-weight__change-tara__set-tara').addEventListener('click', select_tara_type_accept_btn);
	
		modal.querySelector(`#create-weight__change-tara-type .select-tara-type[data-type="${weight_object.tara_type}"]`).classList.add('active');
		modal.querySelector(`#create-weight__change-tara-type .select-tara-type-info .${weight_object.tara_type}`).classList.add('active');

		modal.classList.add('active');

	} catch (error) { error_handler('Error al obtener template para cambiar tipo de tara.', error) }
}

async function select_tara_type_accept_btn() {

	if (btn_double_clicked(this)) return;

	const 
	type = DOMPurify().sanitize(document.querySelector('#create-weight__change-tara-type .select-tara-type.active').getAttribute('data-type')),
	weight_id = DOMPurify().sanitize(weight_object.frozen.id),
	process = DOMPurify().sanitize(weight_object.process);

	if (type === weight_object.tara_type) {
		document.querySelector('#create-weight__change-tara__close-modal').click();
		return;
	}

	try {
		const
		update = await fetch('/update_tara', {
			method: 'POST', 
			headers: { 
				"Content-Type" : "application/json",
				"Authorization" : token.value 
			}, 
			body: JSON.stringify({ weight_id, process, type })
		}),
		response = await update.json();
		
		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';
		if (response.unauthorized_message !== undefined) throw response.unauthorized_message;
		
		weight_object.tara_type = type;
		document.querySelector('#new-weight__widget__tara-type .header-check-type p').innerText = type.toUpperCase();

		document.getElementById('message-container').innerHTML = `<h4>TIPO DE TARA</h4><div id="message-h3"><i class="fad fa-check"></i><h3><b>${type.toUpperCase()}</b></h3></div>`;
		document.querySelector('#create-weight__change-tara__close-modal').click();
		await delay(400);

		document.getElementById('message-section').classList.add('active');
		await delay(1750);

		document.getElementById('message-section').classList.remove('active');
		await delay(500);
		document.getElementById('message-container').innerHTML = '';
		
	} catch(error) { error_handler('Error al actualizar el tipo de tara en /update_tara.', error)  }
}

async function header_check_close_modal() {

	if (clicked) return;
	prevent_double_click();

	const modal = document.querySelector('#create-weight__modal');
	modal.classList.remove('active');
	
	await delay(500);
	modal.firstElementChild.remove();
}

function change_tara_type_select_tara(that) {

	if (clicked) return;
	prevent_double_click();

	const 
	btn = that,
	type = btn.getAttribute('data-type');	

	document.querySelector('#create-weight__change-tara-type .select-tara-type.active').classList.remove('active');
	document.querySelector('#create-weight__change-tara-type .select-tara-type-info .active').classList.remove('active');
	document.querySelector(`#create-weight__change-tara-type .select-tara-type[data-type="${type}"]`).classList.add('active');
	document.querySelector(`#create-weight__change-tara-type .select-tara-type-info .${type}`).classList.add('active');
}

/****************** CHANGE CYCLE FUNCTIONS ******************/
async function change_cycle_widget() {

	if (clicked) return;
	prevent_double_click();

	const modal = document.getElementById('create-weight__modal');
	try {

		const template = await (await fetch('./templates/template-change-cycle.html')).text();
		modal.innerHTML = template;

		modal.querySelectorAll('#create-weight__change-cycle-type .select-cycle-type').forEach(btn => {
			btn.addEventListener('click', change_cycle_type_select_cycle);
		})

		modal.querySelector('#create-weight__change-cycle__close-modal').addEventListener('click', header_check_close_modal);
		modal.querySelector('#create-weight__change-cycle__set-cycle').addEventListener('click', change_cycle_type_accept_btn);
		
		modal.querySelector(`#create-weight__change-cycle-type .select-cycle-type[data-type="${weight_object.cycle.id}"]`).classList.add('active');
		modal.querySelector(`#create-weight__change-cycle-type .select-cycle-type-description p[data-type="${weight_object.cycle.id}"]`).classList.add('active');
		
		modal.classList.add('active');

	} catch(e) { console.log(`Error getting cycle type template. ${e}`) }
}

async function change_cycle_type_accept_btn() {

	if (btn_double_clicked(this)) return;

	const cycle = parseInt(document.querySelector('#create-weight__change-cycle-type .select-cycle-type.active').getAttribute('data-type'));

	if (weight_object.cycle.id === cycle) {
		document.querySelector('#create-weight__change-cycle__close-modal').click();
		return;
	}

	const weight_id = DOMPurify().sanitize(weight_object.frozen.id);

	try {
		const
		update = await fetch('/update_cycle', {
			method: 'POST', 
			headers: { 
				"Content-Type" : "application/json",
				"Authorization" : token.value 
			}, 
			body: JSON.stringify({ weight_id, cycle })
		}),
		response = await update.json();

		console.log(response)

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';
		if (response.documents.existing) throw response.documents.message;
		if (response.documents.docs.length > 0) throw `Documento ${thousand_separator(response.documents.docs[0].doc_number)} para entidad ${response.documents.docs[0].entity_name} ya existe.`;

		//REPLACE CURRENT WEIGHT OBJECT WITH UPDATED ONE ->>>>>>>> LEFT AS COMMENTS BECAUSE DOCS DONT GET CHANGED
		/*
		weight_object = new create_weight_object(response.weight_object);
		response.weight_object.documents.forEach(doc => { 
			const new_doc = new create_document_object(doc);
			doc.rows.forEach(row => {
				new_doc.rows.push(new document_row(row));
			}) 
			weight_object.documents.push(new_doc);
			create_documents_table_row(new_doc);
		});
		*/

		weight_object.cycle.id = response.cycle.id
		weight_object.cycle.name = response.cycle.name;
		
		document.getElementById('create-weight-step-2').setAttribute('data-cycle', weight_object.cycle.id);

		if (weight_object.cycle.id === 2) {
			document.getElementById('gross-weight__tara-weight').nextElementSibling.innerText = 'PESO NETO TARA';
			document.getElementById('gross__final-net-weight').nextElementSibling.innerText = 'PESO NETO FINAL';
		} else if (weight_object.cycle.id === 1) {
			document.getElementById('gross-weight__tara-weight').nextElementSibling.innerText = 'TARA APROXIMADA';
			document.getElementById('gross__final-net-weight').nextElementSibling.innerText = 'NETO APROXIMADO';
		}		
		
		document.querySelector('#new-weight__widget__cycle-type .header-check-type p').innerText = weight_object.cycle.name.toUpperCase();
		document.getElementById('message-container').innerHTML = `<h4>CICLO ACTUALIZADO</h4><div id="message-h3"><i class="fad fa-check"></i><h3><b>${weight_object.cycle.name.toUpperCase()}</b></h3></div>`;
		document.querySelector('#create-weight__change-cycle__close-modal').click();
		await delay(400);

		document.getElementById('message-section').classList.add('active');
		await delay(1750);

		document.getElementById('message-section').classList.remove('active');
		await delay(500);
		document.getElementById('message-container').innerHTML = '';

	} catch(error) { error_handler('Error al actualizar el ciclo del pesaje en /update_cycle', error) }
}

function change_cycle_type_select_cycle() {

	if (clicked) return;
	prevent_double_click();

	const 
	btn = this,
	cycle = btn.getAttribute('data-type');

	document.querySelector('#create-weight__change-cycle-type .select-cycle-type.active').classList.remove('active');
	document.querySelector('#create-weight__change-cycle-type .select-cycle-type-description p.active').classList.remove('active');
	document.querySelector(`#create-weight__change-cycle-type .select-cycle-type[data-type="${cycle}"]`).classList.add('active');
	document.querySelector(`#create-weight__change-cycle-type .select-cycle-type-description p[data-type="${cycle}"]`).classList.add('active');
}

/****************** CHANGE PROCESS FUNCTIONS ******************/
async function change_process_widget() {

	if (clicked) return;
	prevent_double_click();

	const modal = document.getElementById('create-weight__modal');
	try {

		const 
		template = await (await fetch('./templates/template-change-process.html')).text(),
		current_process = weight_object.process;

		modal.innerHTML = template;

		//EVENT LISTENERS
		modal.querySelector('#create-weight__change-process__close-modal').addEventListener('click', header_check_close_modal);
		modal.querySelector('#create-weight__change-process__accept-btn').addEventListener('click', change_process_accept_btn);
		
		modal.querySelector(`#create-weight__change-process-type .select-process-type[data-process="${current_process}"]`).classList.add('active');
		modal.querySelector(`#create-weight__change-process-type .select-process-description p[data-process="${current_process}"]`).classList.add('active');

		modal.classList.add('active');

	} catch(error) { error_handler('Error al obtener template para cambiar proceso.', error) }
}

function change_process_type(that) {

	if (clicked) return;
	prevent_double_click();

	const 
	btn = that,
	process = btn.getAttribute('data-process');

	document.querySelector('#create-weight__change-process-type .select-process-description .active').classList.remove('active');
	document.querySelector('#create-weight__change-process-type .select-process-type.active').classList.remove('active');
	document.querySelector(`#create-weight__change-process-type .select-process-type[data-process="${process}"]`).classList.add('active');
	document.querySelector(`#create-weight__change-process-type .select-process-description p[data-process="${process}"]`).classList.add('active');
}

async function change_process_accept_btn() {

	if (btn_double_clicked(this)) return;

	try {

		const
		process = document.querySelector('#create-weight__change-process-type .select-process-type.active').getAttribute('data-process'),
		description = document.querySelector('#create-weight__change-process-type .select-process-type.active h5').innerText;
		
		if (weight_object.process === process) {
			document.getElementById('create-weight__change-process__close-modal').click();
			return;
		}

		
		const error_status = 'No se puede cambiar proceso si es que existe un peso sin guardar';
		if ((process === 'gross' && weight_object.tare_weight.status === 2) || (process === 'tare') && weight_object.gross_weight.status === 2) 
			throw error_status;

		weight_object.process = process;
		document.querySelector('#new-weight__widget__process-type .header-check-type p').innerText = description;
		
		if (weight_object.process === 'gross' && weight_object.tare_weight.brute > 0) {
			document.getElementById('gross-weight__tara-weight').nextElementSibling.innerText = 'PESO NETO TARA';
			document.getElementById('gross__final-net-weight').nextElementSibling.innerText = 'PESO NETO FINAL';
		}

		const target  = (weight_object.process === 'tare') ? weight_object.tare_weight : weight_object.gross_weight;

		document.getElementById('create-weight-step-2').setAttribute('data-process', weight_object.process);
		document.getElementById('create-weight-step-2').setAttribute('data-status', target.status);

		document.querySelector('#take-weight-btn h5').innerHTML = (weight_object.process === 'gross') ? 'PESAR<br>BRUTO' : 'PESAR<br>TARA';

		document.querySelector('#new_weight__comments textarea').value = target.comments;
		if (target.comments.length > 0) document.querySelector('#new_weight__comments textarea').classList.add('has-content');

		document.getElementById('message-container').innerHTML = `<h4>PROCESO ACTUALIZADO</h4><div id="message-h3"><i class="fad fa-check"></i><h3><b>${DOMPurify().sanitize(description)}</b></h3></div>`;
		document.querySelector('#create-weight__change-process__close-modal').click();
		await delay(400);

		document.getElementById('message-section').classList.add('active');
		await delay(1750);

		document.getElementById('message-section').classList.remove('active');
		await delay(500);
		document.getElementById('message-container').innerHTML = '';
	
	} catch(error) { error_handler('Error al intentar cambiar proceso', error) }
}

/****************** ADD SECONDARY PLATES INPUT ******************/
async function add_secondary_plates(e) {

	if (e.code !== 'Tab') return;
	
	const plates = (e.target.value.length === 0) ? null : DOMPurify().sanitize(e.target.value).toUpperCase();
	if (plates === weight_object.secondary_plates) return;

	const weight_id = DOMPurify().sanitize(weight_object.frozen.id);
	try {

		const
		update = await fetch('/update_secondary_plates', {
			method: 'POST', 
			headers: { 
				"Content-Type" : "application/json",
				"Authorization" : token.value  
			}, 
			body: JSON.stringify({ weight_id, plates })
		}),
		response = await update.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';
		
		weight_object.secondary_plates = response.plates;
		document.getElementById('new-weight__add-secondary-plates').value = response.plates;

		document.getElementById('message-container').innerHTML = `
			<div id="weight__secondary-plates-updated">
				<i class="fad fa-check"></i>
				<h4><b>ACOPLADO<br>ACTUALIZADO</b></h4>
			</div>
		`;

		document.getElementById('message-section').classList.add('active');
		await delay(1750);

		document.getElementById('message-section').classList.remove('active');
	} catch(error) { error_handler('Error al actualizar patente del acoplado en /update_secondary_plates.', error) }
}

/****************** CHANGE DRIVER FUNCTIONS ******************/
function change_driver_select_tr(e) {
	
	if (clicked) return;
	prevent_double_click();

	let tr;
	if (e.target.matches('td')) tr = e.target.parentElement;
	else if (e.target.matches('div')) {
		if (e.target.className === 'icon-container') tr = e.target.parentElement.parentElement;
		else tr = e.target.parentElement.parentElement.parentElement;
	}
	else if (e.target.matches('i')) tr = e.target.parentElement.parentElement.parentElement.parentElement;
	else return;

	if (tr.classList.contains('selected')) {
		tr.classList.remove('selected');
		document.getElementById('create-weight__change-driver__set-driver').classList.remove('enabled');
		return;
	}

	if (tr.parentElement.querySelector('.selected')) tr.parentElement.querySelector('.selected').classList.remove('selected');
	tr.classList.add('selected');
	document.querySelector('.content-container.active .create-weight__change-driver__set-driver').classList.add('enabled');


	if (!!document.getElementById('create-weight__change-driver__set-driver')) 
		document.getElementById('create-weight__change-driver__set-driver').focus();
	else if (!!document.getElementById('create-vehicle__select-driver__choose-transport-btn'))
		document.getElementById('create-vehicle__select-driver__choose-transport-btn').focus();
}

function change_driver_create_tr(drivers) {
	return new Promise(resolve => {
		
		const table = document.querySelector('.content-container.active .create-weight__change-driver .tbl-content tbody');
		drivers.forEach(driver => {
			const tr = document.createElement('tr');
			tr.setAttribute('data-driver-id', driver.id);
			tr.innerHTML = `
			<td class="driver">${DOMPurify().sanitize(driver.name)}</td>
			<td class="rut">${DOMPurify().sanitize(driver.rut)}</td>
			<td class="phone">${DOMPurify().sanitize(driver.phone)}</td>
			<td class="internal">
				<div>
					<i></i>
				</div>
			</td>
			<td class="status">
				<div>
					<i></i>
				</div>
			</td>`;

			tr.querySelector('.internal i').className = (driver.internal === 0) ? 'far fa-times': 'far fa-check';
			tr.querySelector('.status i').className = (driver.active === 0) ? 'far fa-times': 'far fa-check';

			table.appendChild(tr);
		});
		resolve();		
	})
}

//CLOSE SELECT DRIVER MODAL
async function select_driver_close_modal() {
	
	if (clicked) return;
	prevent_double_click()

	const modal = document.querySelector('#create-weight__modal');
	modal.classList.remove('active');
	await delay(500);
	mutation_observer.disconnect();
	mutation_observer = null;
	document.querySelector('.content-container.active .create-weight__change-driver-container').remove();
}

//SELECT DRIVER ACCEPT BTN
async function select_driver_accept() {
	
	if (btn_double_clicked(this)) return;

	if (!document.querySelector('.content-container.active .create-weight__change-driver__set-driver').classList.contains('enabled')) return;
	
	const 
	active_container = document.querySelector('.content-container.active'),
	driver_id = active_container.querySelector('.create-weight__change-driver .tbl-content tr.selected').getAttribute('data-driver-id'),
	set_driver_as_default = (active_container.querySelector('.select-driver__default-cbx').checked) ? true: false;

	try {

		await weight_object.update_driver(driver_id, set_driver_as_default);

		document.querySelector('#new-weight__widget__driver-data .widget-data:nth-child(2) p').innerText = weight_object.driver.name;
		document.querySelector('#new-weight__widget__driver-data .widget-data:nth-child(4) p').innerText = weight_object.driver.rut;
		document.querySelector('.content-container.active .create-weight__change-driver__close-modal').click();

	} catch(error) { error_handler('Error al seleccionar chofer.', error) }
}

//OPEN MODAL TO CHANGE DRIVER
async function change_driver_widget(e) {

	if (clicked) return;
	prevent_double_click();

	const 
	modal = document.getElementById('create-weight__modal'),
	active_container = document.querySelector('.content-container.active');

	try {

		const template = await (await fetch('./templates/template-change-driver.html')).text();
		
		modal.innerHTML = template;

		modal.querySelector('.default-driver').addEventListener('click', function() {
			
			const input_cbx = this.querySelector('input');
			if (input_cbx.checked) {
				input_cbx.checked = false;
				return
			}
			input_cbx.checked = true;
		});

		active_container.querySelector('.create-weight__change-driver tbody').addEventListener('click', change_driver_select_tr);
		active_container.querySelector('.create-weight__change-driver__close-modal').addEventListener('click', select_driver_close_modal);
		active_container.querySelector('.create-weight__change-driver__search-driver input').addEventListener('input', select_driver_search_driver);
		active_container.querySelector('.create-weight__change-driver__set-driver').addEventListener('click', select_driver_accept);
		active_container.querySelector('.create-weight__change-driver__create-driver-btn').addEventListener('click', select_driver_create_driver_btn);
		document.getElementById('create-weight__change-driver__back-to-select-driver').addEventListener('click', select_driver_create_driver_back_btn);
		document.getElementById('create-weight__change-driver__create-driver').addEventListener('click', select_driver_create_driver);
		document.getElementById('create-weight__create-driver-rut').addEventListener('input', select_driver_create_driver_rut_input);
		document.getElementById('create-weight__create-driver-rut').addEventListener('keydown', select_driver_create_driver_rut_keydown);
		
		document.querySelectorAll('#create-weight__change-driver__create .input-effect').forEach(input => {
			input.addEventListener('input', custom_input_change);
		});

		document.getElementById('create-driver__active-cbx').checked  = true;

		active_container.querySelectorAll('.change-driver__type-btns > div:not(.default-driver)').forEach(driver_type => {
			driver_type.addEventListener('click', list_drivers_by_type);
		});
		
		active_container.querySelector('.select-driver__default-cbx ~ .lbl').innerText = `ASIGNAR A ${weight_object.frozen.primary_plates}`;

		try {

			const table = active_container.querySelector('.create-weight__change-driver .tbl-content tbody');
			mutation_observer = new MutationObserver(() => {
				const btn = active_container.querySelector('.create-weight__change-driver__set-driver');
				if (!!table.querySelector('tr.selected') && !btn.classList.contains('enabled')) btn.classList.add('enabled');
				else if (!!table.querySelector('tr.selected') === false && btn.classList.contains('enabled')) btn.classList.remove('enabled');
			});
			mutation_observer.observe(table, { attributes: true });

			const
			driver_type = 'internal',
			get_drivers = await fetch('/get_drivers', { 
				method: 'POST', 
				headers: { 
					"Content-Type" : "application/json",
					"Authorization" : token.value 
				}, 
				body: JSON.stringify({ driver_type }) 
			}),
			response = await get_drivers.json();

			if (response.error !== undefined) throw response.error;
			if (!response.success) throw 'Success response from server is false.';
			
			const drivers = response.drivers;
			await change_driver_create_tr(drivers);

			modal.classList.add('active');	

		} catch(error) { error_handler('Error al buscar choferes en /get_drivers', error) }
	} catch(error) { error_handler('Error al buscar template para cambiar chofer.', error) }
}

async function list_drivers_by_type() {

	const
	btn = this,
	active_container = document.querySelector('.content-container.active'),
	driver_type = btn.getAttribute('data-type'),
	table = active_container.querySelector('.create-weight__change-driver .tbl-content tbody'),
	container = btn.parentElement;

	try {
		const 
		drivers = await fetch('/get_drivers', {
			method: 'POST', 
			headers: { 
				"Content-Type" : "application/json",
				"Authorization" : token.value 
			}, 
			body: JSON.stringify({ driver_type })
		}),
		response = await drivers.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

		active_container.querySelector('.create-weight__change-driver__set-driver').classList.remove('enabled');

		if (!!table.classList.contains('row-selected')) table.classList.remove('row-selected');
		active_container.querySelectorAll('.create-weight__change-driver .tbl-content tr').forEach(tr => { tr.remove() });
		container.querySelector('.active').classList.remove('active');
		change_driver_create_tr(response.drivers);
		btn.classList.add('active');

	} catch(error) { error_handler('Error al buscar template para cambiar chofer /get_drivers', error) }
}

async function select_driver_search_driver(e) {

	if (e.target.value.length === 0 && e.target.classList.contains('has-content')) e.target.classList.remove('has-content');
	else if (e.target.value.length > 0 && !e.target.classList.contains('has-content')) e.target.classList.add('has-content');
	const 
	driver = DOMPurify().sanitize(e.target.value),
	active_container = document.querySelector('.content-container.active');

	if (driver.length === 0) {

		const driver_type = active_container.querySelector('.change-driver__type-btns > .active').getAttribute('data-type');
		try {
			const
			drivers = await fetch('/get_drivers', {
				method: 'POST', 
				headers: { 
					"Content-Type" : "application/json",
					"Authorization" : token.value 
				}, 
				body: JSON.stringify({ driver_type })
			}),
			response = await drivers.json();
			
			if (response.error !== undefined) throw response.error;
			if (!response.success) throw 'Success response from server is false.';

			active_container.querySelectorAll('.create-weight__change-driver .tbl-content tr').forEach(tr => { tr.remove() });

			change_driver_create_tr(response.drivers);			
		}
		catch(error) { error_handler('Error al buscar template para cambiar chofer en /get_drivers', error) }
		finally { return }
	}

	try {
		const 
		search_driver = await fetch('/search_driver', {
			method: 'POST', 
			headers: { 
				"Content-Type" : "application/json",
				"Authorization" : token.value 
			}, 
			body: JSON.stringify({ driver })
		}),
		response = await search_driver.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

		active_container.querySelectorAll('.create-weight__change-driver .tbl-content tr').forEach(tr => { tr.remove() });

		change_driver_create_tr(response.drivers);		
	} catch (error) { console.log(`Error searching from driver. ${error}`) }
}

async function select_driver_create_driver_btn() {

	if (clicked) return;
	prevent_double_click();

	const 
	current_div = document.querySelector('.content-container.active .create-weight__change-driver'),
	next_div = document.querySelector('#create-weight__change-driver__create');

	next_div.classList.remove('hidden');
	current_div.classList.add('down');
	await delay(500);

	current_div.classList.add('hidden');
	next_div.classList.remove('up');
	await delay(500)

	document.querySelector('#create-weight__create-driver-name').focus();

}

async function select_driver_create_driver_back_btn() {

	if (clicked) return;
	prevent_double_click();

	const 
	current_div = document.getElementById('create-weight__change-driver__create'),
	next_div = document.querySelector('.content-container.active .create-weight__change-driver');

	next_div.classList.remove('hidden');
	current_div.classList.add('up');
	await delay(500);

	next_div.classList.remove('down');
	current_div.classList.add('hidden');

}

async function select_driver_create_driver_rut_input(e) {
	e.preventDefault();
	const tooltip = document.querySelector('#create-weight__create-driver-rut ~ .widget-tooltip');
	if (!tooltip.classList.contains('hidden')) {
		await fade_out(tooltip);
		tooltip.classList.add('hidden');
	}
	const rut = e.target.value.replace(/[^0-9k.-]/gmi, '');
	e.target.value = rut;
	return;
}

async function select_driver_create_driver_rut_keydown(e) {

	if (e.code !== 'Tab' && e.key !== 'Enter') return;
	e.preventDefault();

	const
	rut = e.target.value,
	tooltip = document.querySelector('#create-weight__create-driver-rut ~ .widget-tooltip');
	
	if (validate_rut(rut) && !tooltip.classList.contains('hidden')) {
		await fade_out(tooltip);
		tooltip.classList.add('hidden');
	}
	else if (!validate_rut(rut) && tooltip.classList.contains('hidden')) {
		fade_in(tooltip);
		tooltip.classList.remove('hidden');
	}
	document.getElementById('create-driver__internal-cbx').focus();
}

async function select_driver_create_driver() {

	if (btn_double_clicked(this)) return;

	const
	data = {
		name: document.getElementById('create-weight__create-driver-name').value,
		rut: document.getElementById('create-weight__create-driver-rut').value,
		phone: document.getElementById('create-weight__create-driver-phone').value
	};

	if (data.name.length === 0 || data.rut.length === 0) return;

	if (!validate_rut(data.rut)) {
		const tooltip = document.querySelector('#create-weight__create-driver-rut ~ .widget-tooltip');
		fade_in(tooltip);
		tooltip.classList.remove('hidden');
		return;
	}

	//SANITIZE OBJECT
	for (let key in data) { data[key] = DOMPurify().sanitize(data[key]) }

	data.internal = (document.getElementById('create-driver__internal-cbx').checked) ? 1 : 0,
	data.active = (document.getElementById('create-driver__active-cbx').checked) ? 1 : 0;

	try {

		const
		create_driver = await fetch('/create_driver', {
			method: 'POST', 
			headers: { 
				"Content-Type" : "application/json",
				"Authorization" : token.value 
			}, 
			body: JSON.stringify(data)
		}),
		response = await create_driver.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) {
			if (response.existing_driver === undefined) throw 'Success response from server is false.';
			else throw `Error al crear chofer. Chofer con rut ${response.existing_driver.rut} ya existe -> ${response.existing_driver.name}`;
		}

		const
		table = document.querySelector('.content-container.active .create-weight__change-driver .tbl-content tbody'),
		tr = document.createElement('tr');

		tr.setAttribute('data-driver-id', response.driver.id);
		tr.innerHTML = `
			<td class="driver">${DOMPurify().sanitize(response.driver.name)}</td>
			<td class="rut">${DOMPurify().sanitize(response.driver.rut)}</td>
			<td class="phone">${DOMPurify().sanitize(response.driver.phone)}</td>
			<td class="internal">
				<div>
					<i></i>
				</div>
			</td>
			<td class="status">
				<div>
					<i></i>
				</div>
			</td>
		`;

		tr.querySelector('.internal i').className = (response.driver.internal === 0) ? 'far fa-times' : 'far fa-check'; 
		tr.querySelector('.status i').className = (response.driver.active === 0) ? 'far fa-times' : 'far fa-check'; 

		table.prepend(tr);
		select_driver_create_driver_back_btn();

		await delay(500);
		tr.click();

		document.getElementById('create-weight__create-driver-name').value = '';
		document.getElementById('create-weight__create-driver-name').classList.remove('has-content');
		document.getElementById('create-weight__create-driver-rut').value = '';
		document.getElementById('create-weight__create-driver-rut').classList.remove('has-content');
		document.getElementById('create-weight__create-driver-phone').value = '';
		document.getElementById('create-weight__create-driver-phone').classList.remove('has-content');
		
	} catch (error) { error_handler('Error al crear chofer en /create_driver', error) }
}

/****************** WEIGHT DOCUMENTS FUNCTIONS ******************/

function print_doc_break_line(description, description_start, description_end, second_line_start) {
	
	const description_max_length = description_end - description_start - 1;  //39

	if (description.length < description_max_length) return { first_line: description, second_line: '' };

	const 
	separator = (description.substring(description.length, description.length - 1) === ' ') ? ' ' : '-',
	first_line = description.slice(0, description_max_length) + separator,
	second_line_partial = description.slice(description_max_length),
	//second_line = (second_line_partial.length > description_end - second_line_start) ? second_line_partial : second_line_partial.slice(0, (description_end + (description_start - second_line_start) - 3)) + '...';
	second_line = second_line_partial;
	return { first_line, second_line };
}

function print_doc_spaces(left_description_spaces, left_description, total_spaces) {

	const spaces = total_spaces - left_description_spaces - left_description.length;

    let empty_spaces = '';
    for (let i = 0; i < spaces; i++) { empty_spaces += ' ' }

    return empty_spaces;
}

function print_doc_body_string(amount, product, price) {
	let str = '   ' + amount;

	const product_left_spaces = print_doc_spaces(4, amount, 11);
	str += product_left_spaces + product;

	const price_left_spaces = print_doc_spaces(0, str, 66);
	str += price_left_spaces + price;

	return str;
}

function print_doc_center_text(text) {

	let spaces = 38; //41
	for (let i = 1; i < text.length; i++) {
		if (i % 2 === 0) spaces -= 1;
	}

	let str_spaces = '';
	for (let i = 0; i < spaces; i++) {
		str_spaces += ' ';
	}

	return str_spaces + text;
}

function change_kilos_breakdown_status() {
	return new Promise(async (resolve, reject) => {
		try {

			const
			weight_id = weight_object.frozen.id,
			change_status = await fetch('/change_kilos_breakdown_status', {
				method: 'POST',
				headers: {
					"Content-Type" : "application/json",
					"Authorization" : token.value
				},
				body: JSON.stringify({ weight_id })
			}),
			response = await change_status.json();
	
			if (response.error !== undefined) throw response.error;
			if (!response.success) throw 'Success response from server is false.';
	
			weight_object.kilos_breakdown = false;
			weight_object.breakdown = null;

			return resolve();
	
		} catch(error) { error_handler('Error al intentar cambiar estado de desgloce de kilos.', error); return reject() }	
	})
}

//DOCUMENT OBJECT
let document_object, watch_document;
class create_document_object {

	watch_object() {

		const watch = {
			containers: this.containers,
			containers_weight: this.containers_weight,
			kilos: this.kilos,
			total: this.total
		}

		watch_document = setInterval(async () => {

			if (!weight_object.kilos_breakdown) {
				clearInterval(watch_document);
				return;
			}

			for (let key in watch) {
				if (watch[key] !== this[key]) {
					console.log('Value changed for ' + key + ' !!!!');
					await change_kilos_breakdown_status();
					clearInterval(watch_document);
					break;
				}
			}

		}, 50);
	}

	print_document() {
		return new Promise(async (resolve, reject) => {
			try {

				const 
				doc_id = this.frozen.id,
				get_document = await fetch('/print_document', {
					method: 'POST', 
					headers: { "Content-Type" : "application/json" }, 
					body: JSON.stringify({ doc_id })
				}),
				response = await get_document.json();

				if (response.error !== undefined) throw response.error;
				if (!response.success) throw 'Success response from server is false.';

				const { doc_data } = response;

				await load_script('js/qz-tray.js');

				//PRINT WITH DOT MATRIX
				let config;
				try {
					
					if (!await qz.websocket.isActive()) await qz.websocket.connect();
					console.log("connected")
			
					const printer = await qz.printers.find("OKI");
					console.log(`Printer ${printer} found !`);

					config = qz.configs.create(printer);

				} catch(print_error) { console.log(`Couldn't connect to printer.`); return }

				const 
				months_array = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'],
				doc_date = new Date(doc_data.date),
				year = doc_date.getFullYear(),
				month = months_array[doc_date.getMonth()],
				day = (doc_date.getDate() < 10) ? '0' + doc_date.getDate() : doc_date.getDate(),
				day_and_month = `                                                ${day}    ${month}`,
				address = print_doc_break_line(doc_data.entity.address.replace(/[º°]/gm, 'ø').replace(/[ñ]/gmi, '¥'), 8, 47, 3),
				giro = print_doc_break_line(doc_data.entity.giro, 8, 34, 31),
				line_jump = '\x0A';

				const data = [
					line_jump, line_jump, line_jump, line_jump, line_jump, line_jump, line_jump, line_jump,
					`                                                         ${thousand_separator(doc_data.number)}` + '\r\n',//9
					line_jump, line_jump, line_jump, line_jump,

				  //'01234567890123456789012345678901234567890123456789012345678901234567890123456789',
				  //'1         1         2         3         4         5         6         7         ',
					day_and_month + print_doc_spaces(0, day_and_month, 69) + year + '\r\n', //14
				  //'                                               10      DICIEMBRE      2021' + '\x0A', //14
					line_jump,
					`         ${doc_data.entity.name.toUpperCase()}` + '\r\n', //16
					line_jump,
					'         ' + address.first_line.toUpperCase() + print_doc_spaces(9, address.first_line, 52) + doc_data.entity.rut + '\r\n',  //18
					'   ' + address.second_line.toUpperCase() + '\r\n', //19
					'        ' + doc_data.entity.comuna.toUpperCase() + print_doc_spaces(8, doc_data.entity.comuna, 34) + giro.first_line.toUpperCase() + '\r\n', //20
					'                               ' + giro.second_line.toUpperCase() + '\r\n', //20
					line_jump, line_jump, line_jump
				];

				doc_data.rows.forEach(async row => {
					
					if (row.product.code === 'TRASLADO') {
						const traslado_description = await get_traslado_description();
						data.push(`       ${traslado_description}` + '\r\n');
					} else {

						const 
						product_name = (row.product.name === null) ? '' : row.product.name,
						product_cut = (row.product.cut === null) ? '' : row.product.cut,
						product_amount = (row.product.kilos === null) ? '' : thousand_separator(row.product.kilos),
						product_price = (row.product.price === null) ? '' : '$' + thousand_separator(row.product.price),
						product = 'KG ' + product_name.toUpperCase() + ' DESCARTE ' + product_cut.toUpperCase();
	
						if (product_name.length > 0) {
							const product_line = print_doc_body_string(product_amount, product, product_price);
							data.push(product_line + '\r\n');
						}
	
						const
						container_amount = (row.container.amount === null) ? '' : thousand_separator(row.container.amount),
						container_name = (row.container.name === null) ? '' : row.container.name.toUpperCase();
	
						if (container_name.length > 0) {
							const container_line = '    ' + container_amount + print_doc_spaces(4, container_amount, 11) + container_name;
							data.push(container_line + '\r\n');
						}
	
						if (product_name.length > 0 || container_name.length > 0) data.push('   _____' + '\r\n');
					}

				});

				console.log(data.length)

				while (data.length < 40) { data.push(line_jump) }

				const
				driver_name = doc_data.driver.name,
				driver_rut = doc_data.driver.rut,
				primary_plates = doc_data.vehicle.primary_plates,
				secondary_plates = (doc_data.vehicle.secondary_plates === null) ? '' : ' - ' + doc_data.vehicle.secondary_plates,
				plates = primary_plates + secondary_plates,
				sii_id = (document_object.sale) ? '05379020' : '05375101',
				sale_type_first_list = (document_object.sale) ? 'GUIA CONSTITUYE VENTA' : 'GUIA NO CONSTITUYE VENTA',
				sale_type_second_line = (document_object.sale) ? '' : 'SOLO TRASLADO DE MATERIAL PROPIO';

			  			//'01234567890123456789012345678901234567890123456789012345678901234567890123456789',
			  			//'1         1         2         3         4         5         6         7         ',
				data.push(print_doc_center_text(`ID: ${sii_id} - VEHICULO: ${plates}`) + '\r\n');
				data.push(print_doc_center_text(`CHOFER: ${driver_name.toUpperCase()} - RUT: ${driver_rut}`) + '\r\n');
				data.push(print_doc_center_text(sale_type_first_list) + '\r\n');
				data.push(print_doc_center_text(sale_type_second_line) + '\r\n');

				/*
				data.push(`                        ID: 05375101 - VEHICULO: ${plates}` + '\x0A' + '\x0A');
				data.push(`                       CHOFER: ${driver_name.toUpperCase()} - RUT: ${driver_rut}` + '\x0A');
				data.push('                            GUIA NO CONSTITUYE VENTA' + '\x0A' + '\x0A');
				data.push('                       SOLO TRASLADO DE MATERIAL PROPIO' + '\x0A' + '\x0A');
				*/

				data.forEach(d => { console.log(d) })
				qz.print(config, data);

				return resolve()
			} catch(e) { error_handler('Error al intentar imprimir pesaje', e); return reject() }
		});
	}

	update_doc_number(doc_number) {
		return new Promise(async (resolve, reject) => {
			doc_number = DOMPurify().sanitize(doc_number);
			const doc_id = DOMPurify().sanitize(this.frozen.id);

			try {
				const	
				update = await fetch('/update_doc_number', {
					method: 'POST', 
					headers: { 
						"Content-Type" : "application/json",
						"Authorization" : token.value 
					}, 
					body: JSON.stringify({ doc_id, doc_number })
				}),
				response = await update.json();

				if (response.error !== undefined) throw response.error;
				if (!response.success) throw 'Success response from server is false.';

				if (response.doc_number === null) this.number = null;
				else this.number = parseInt(response.doc_number);

				this.existing_document = response.existing_document;
				return resolve(true);
			}
			catch (error) { error_handler('Error al actualizar número de documento /update_doc_number', error); return reject(error) }
		})
	}

	update_doc_date(doc_date) {
		return new Promise(async (resolve, reject) => {
			doc_date = DOMPurify().sanitize(doc_date + ' 00:00:00');
			const doc_id = DOMPurify().sanitize(this.frozen.id);
			try {
				const	
				update = await fetch('/update_doc_date', {
					method: 'POST', 
					headers: { 
						"Content-Type" : "application/json",
						"Authorization" : token.value 
					}, 
					body: JSON.stringify({ doc_id, doc_date })
				}),
				response = await update.json();

				if (response.error !== undefined) throw response.error;
				if (!response.success) throw 'Success response from server is false.';

				this.date = doc_date;
				return resolve();

			}
			catch (error) { error_handler('Error al actualizar fecha del documento en /update_doc_date', error); reject(error) }
		})
	}

	update_client(client_id) {
		return new Promise(async (resolve, reject) => {

			client_id = DOMPurify().sanitize(client_id);
			const document_id = DOMPurify().sanitize(this.frozen.id);
			try {
				const
				update_client_entity = await fetch('/update_client_entity', {
					method: 'POST', 
					headers: { 
						"Content-Type" : "application/json",
						"Authorization" : token.value 
					}, 
					body: JSON.stringify({ document_id, client_id })
				}),
				response = await update_client_entity.json();

				if (response.error !== undefined) throw response.error;
				if (!response.success) throw 'Success response from server is false.';

				this.client.entity.id = response.entity.id;
				this.client.entity.name = response.entity.name;

				if (response.last_record.found) {
					this.internal.entity.id = response.last_record.entity.id;
					this.internal.entity.name = response.last_record.entity.name;
					this.internal.branch.id = response.last_record.branch.id;
					this.internal.branch.name = response.last_record.branch.name;
				} else {
					this.internal.entity.id = null;
					this.internal.entity.name = null;
					this.internal.branch.id = null;
					this.internal.branch.name = null;
				}
				return resolve(response.branches);
			} catch(error) { error_handler('Error al seleccionar entidad de cliente/proveedor en /select_client_entity', error); return reject(); }
		})
	}

	update_branch(branch_id) {
		return new Promise(async (resolve,reject) => {
			
			branch_id = DOMPurify().sanitize(branch_id);

			const
			doc_number = DOMPurify().sanitize(document_object.number),
			document_id = DOMPurify().sanitize(this.frozen.id),
			document_electronic = this.electronic;

			try {
				const
				update = await fetch('/document_update_branch', {
					method: 'POST', 
					headers: { 
						"Content-Type" : "application/json",
						"Authorization" : token.value 
					}, 
					body: JSON.stringify({ branch_id, doc_number, document_id, document_electronic })
				}),
				response = await update.json();

				if (response.error !== undefined) throw response.error;
				
				this.existing_document = response.existing_document;
				this.client.branch.id = response.branch_id;
				this.client.branch.name = response.branch_name;
				
				//if (response.existing_document) this.number = null;
				this.electronic = response.last_document_electronic;

				return resolve(true);
			} catch(error) { error_handler('Error al actualizar sucursal de cliente/proveedor en /document_update_branch', error); return reject(error) }
		})
	}

	update_internal(target_id, target_table) {
		return new Promise(async (resolve, reject) => {
			target_id = DOMPurify().sanitize(target_id);
			target_table = DOMPurify().sanitize(target_table);
			const document_id = DOMPurify().sanitize(this.frozen.id);

			try {
				const
				update = await fetch('/document_select_internal', {
					method: 'POST', 
					headers: { 
						"Content-Type" : "application/json",
						"Authorization" : token.value 
					}, 
					body: JSON.stringify({ target_id, target_table, document_id })
				}),
				response = await update.json();

				if (response.error !== undefined) throw response.error;
				if (!response.success) throw 'Success response from server is false.';

				if (target_table==='internal-entities') {
					this.internal.entity.id = response.id;
					this.internal.entity.name = response.name
				} else {
					this.internal.branch.id = response.id;
					this.internal.branch.name = response.name
				}
				return resolve(true);
			} catch (error) { error_handler('Error al seleccionar entidad interna en /document_select_internal', error); reject(error) }
		})
	}

	constructor(doc) {
		this.frozen = doc.frozen
		Object.freeze(this.frozen);
		this.number = doc.number;
		this.date = doc.date;
		this.sale = doc.sale;
		this.electronic = doc.electronic;
		this.comments = doc.comments;
		this.client = doc.client;
		this.internal = doc.internal;
		this.kilos = doc.kilos;
		this.containers = doc.containers;
		this.containers_weight = doc.containers_weight;
		this.rows = [];
		this.total = doc.total;
	}
}

//ROW OBJECT FOR DOCUMENT OBJECT
class document_row {

	update_product(code) {
		return new Promise( async (resolve, reject) => {

			code = DOMPurify().sanitize(code);

			const
			row_id = DOMPurify().sanitize(this.id),
			entity_id = DOMPurify().sanitize(document_object.client.entity.id);

			try {

				const
				update = await fetch('/update_product', {
					method: 'POST',
					headers: {
						"Content-Type" : "application/json",
						"Authorization" : token.value 
					},
					body: JSON.stringify({ row_id, code, entity_id })
				}),
				response = await update.json();
			
				if (response.error !== undefined) throw response.error;
				if (!response.success) throw 'Success response from server is false.';
				
				if (response.found) {
					this.product.code = response.code;
					this.product.name = response.name;
					this.product.last_price.found = response.last_price.found;
					this.product.last_price.price = response.last_price.price;
				} else {
					this.product.code = null;
					this.product.name = null;
					this.product.last_price.found = null;
					this.product.last_price.price = null;
				}
				return resolve(true);
			} catch (error) { error_handler('Error al actualizar product en /update_product', error); return reject(error); }
		})
	}

	update_cut(cut) {
		return new Promise(async (resolve, reject) => {
			cut = DOMPurify().sanitize(cut);
			const row_id = this.id;
			
			try {

				const
				update_cut = await fetch('/update_cut', {
					method: 'POST', 
					headers: { 
						"Content-Type" : "application/json",
						"Authorization" : token.value
					}, 
					body: JSON.stringify({ row_id, cut })
				}),
				response = await update_cut.json();

				if (response.error !== undefined) throw response.error;
				if (!response.success) throw 'Success response from server is false.';

				this.product.cut = cut;

				if (response.cut === cut) return resolve(true);
				else return resolve(false);

			} catch(error) { error_handler('Error al seleccionar tipo de descarte', error); return reject(error) }
		});
	}

	update_price(price) {
		return new Promise(async (resolve, reject) => {
			price = DOMPurify().sanitize(price);
			const row_id = DOMPurify().sanitize(this.id);

			try {
				const
				update = await fetch('/update_price', {
					method: 'POST', 
					headers: { 
						"Content-Type" : "application/json",
						"Authorization" : token.value 
					}, 
					body: JSON.stringify({ row_id, price })
				}),
				response = await update.json();
	
				if (response.error !== undefined) throw response.error;
				if (!response.success) throw 'Success response from server is false.';

				this.product.price = response.price;
				this.product.total = response.product_total;
				document_object.total = response.doc_total;
				resolve(true)
			}
			catch (error) { error_handler('Error al actualizar precio en /update_price', error); return reject(error) }
		})
	}

	update_kilos(kilos) {
		return new Promise(async (resolve, reject) => {
			kilos = DOMPurify().sanitize(kilos);
			const row_id = DOMPurify().sanitize(this.id);
			try {
				const
				update = await fetch('/update_kilos', {
					method: 'POST', 
					headers: { 
						"Content-Type" : "application/json",
						"Authorization" : token.value 
					}, 
					body: JSON.stringify({ row_id, kilos })
				}),
				response = await update.json();
	
				if (response.error !== undefined) throw response.error;
				if (!response.success) throw 'Success response from server is false.';

				this.product.total = response.product_total;

				if (weight_object.cycle.id === 1) this.product.informed_kilos = response.kilos;
				else this.product.kilos = response.kilos;

				document_object.kilos = response.doc_kilos;
				document_object.total = response.doc_total;
				resolve(true);
			}
			catch (error) { error_handler('Error al actualizar kilos en /update_kilos', error); return reject(error) }
		})
	}

	update_container(code) {
		return new Promise(async (resolve, reject) => {

			code = DOMPurify().sanitize(code);
			const row_id = DOMPurify().sanitize(this.id);
			try {	
				const
				update = await fetch('/update_container', {
					method: 'POST', 
					headers: { 
						"Content-Type" : "application/json",
						"Authorization" : token.value 
					}, 
					body: JSON.stringify({ row_id, code })
				}),
				response = await update.json();

				if (response.error !== undefined) throw response.error;
				if (!response.success) throw 'Success response from server is false.';

				if (response.found) {
					this.container.code = response.container.code;
					this.container.name = response.container.name;
					this.container.weight = response.container.weight;
				} else {
					this.container.code = null;
					this.container.name = null;
					this.container.weight = null;	
				}

				document_object.containers_weight = response.document.containers_weight;
				return resolve(true);
			} catch (error) { error_handler('Error al actualizar envase en /update_container', error); return reject(error) }
		})
	}

	update_container_amount(amount) {
		return new Promise(async (resolve,reject) => {

			amount = DOMPurify().sanitize(amount);
			const row_id = DOMPurify().sanitize(this.id);
			try {
				const
				update = await fetch('/update_container_amount', {
					method: 'POST', 
					headers: { 
						"Content-Type" : "application/json",
						"Authorization" : token.value 
					}, 
					body: JSON.stringify({ row_id, amount })
				}),
				response = await update.json();

				if (response.error !== undefined) throw response.error;
				if (!response.success) throw 'Success response from server is false.';

				document_object.containers_weight = response.document.containers_weight;
				document_object.containers = response.document.containers_amount;

				this.container.amount = response.container_amount;

				return resolve(true);
			} catch(error) { error_handler('Error al actualizar cantidad de envases en /update_container_amount', error); return reject(error) }
		})
	}

	annul_row() {
		return new Promise(async (resolve, reject) => {

			const row_id = DOMPurify().sanitize(this.id);
			try {	
				const
				annul = await fetch('/annul_row', {
					method: 'POST', 
					headers: { 
						"Content-Type" : "application/json",
						"Authorization" : token.value 
					}, 
					body: JSON.stringify({ row_id })
				}),
				response = await annul.json();

				if (response.error !== undefined) throw response.error;
				if (!response.success) throw 'Success response from server is false.';

				if (response.single_row) {
					this.product.code = null;
					this.product.name = null;
					this.product.kilos = null;
					this.product.price = null;
					this.product.total = null;
					this.container.code = null;
					this.container.name = null;
					this.container.weight = null;
					this.container.amount = null;
				} else {
					const row_index = document_object.rows.indexOf(this);
					document_object.rows.splice(row_index, 1);
				} 
				return resolve(true);
			} catch(error) { error_handler('Error al anular fila en documento en /annul_row', error); return reject(error) }
		})
	}

	constructor(row) {
		this.id = row.id
		this.product = row.product;
		this.container = row.container;
	}
}

//OPEN MODAL TO CREATE NEW DOCUMENT
let create_document_origin_list, mutation_observer;
function modal_event_listeners(modal) {
	return new Promise(resolve => {

		document.querySelector('#create-document__details-container').setAttribute('data-cycle-id', weight_object.cycle.id);

		modal.querySelector('#create-document__doc-number input').addEventListener('keydown', create_document_update_doc_number);
		modal.querySelector('#create-document__doc-number input').addEventListener('input', e => {
			const number = e.target.value.replace(/[^0-9]/gm, '');
			e.target.value = thousand_separator(number);
			if (number.length === 0 && e.target.classList.contains('has-content')) {
				e.target.classList.toggle('has-content');
				e.target.dispatchEvent(new KeyboardEvent('keydown', { 'code': 'Tab' }))
			}
			else if (number.length > 0 && !e.target.classList.contains('has-content')) e.target.classList.toggle('has-content');
		});
	
		modal.querySelector('#create-document__doc-date input').addEventListener('keydown', create_document_doc_date_update);
		modal.querySelector('#create-document__doc-date input').addEventListener('input', create_document_doc_date_input);

		//SEARCH ENTITY
		modal.querySelector('#create-document__select-entity__search-origin').addEventListener('input', create_document_search_client_entity);
		modal.querySelector('#create-document__select-entity__search-origin').addEventListener('keydown', create_document_search_client_jump_to_li);
		
		//SELECT ENTITY AND SELECT BRANCH
		modal.querySelector('#create-document__select-entity__select-branch').addEventListener('click', create_document_select_entity);
	
		//SELEC BRANCH AND CLOSE ENTITY MODAL
		modal.querySelector('#create-document__select-origin-branch-btn').addEventListener('click', create_document_select_client_branch);
	
		//CUSTOM SELECT FOR INTERNAL ENTITIES AND INTERNAL BRANCH
		modal.querySelectorAll('#create-document__header .widget-with-select').forEach(select => {
			select.addEventListener('keydown', custom_select_navigate_li);
			select.addEventListener('mouseenter', custom_select_hover);
			select.addEventListener('mouseleave', custom_select_hover);
		});
	
		modal.querySelectorAll('#create-document__header .custom-select ul li:not(.disabled)').forEach(li => {
			li.addEventListener('click', select_option_from_custom_select);
		});
	
		modal.querySelector('#create-document__back-to-origin-btn').addEventListener('click', create_document_back_to_entities);
	
		modal.querySelector('#create-document__comments').addEventListener('input', comments_textarea);
		modal.querySelector('#create-document__comments').addEventListener('keydown', create_document_comments_save);

		const client_list = modal.querySelector('#create-document__origin-entity-list ul');
		client_list.addEventListener('click', async e => {
			await create_document_client_li(e);
			document.getElementById('create-document__select-entity__select-branch').focus();
		});
		client_list.addEventListener('keydown', create_document_client_li);

		modal.querySelector('#create-document__origin-branch-list .table-body').addEventListener('click', async e => {
			await create_document_client_li(e);
			document.getElementById('create-document__select-origin-branch-btn').focus();
		});
		modal.querySelector('#create-document__origin-branch-list .table-body').addEventListener('keydown', create_document_client_li);
		
		//CLOSE DOCUMENT MODAL
		modal.querySelector('#create-document__footer__back-btn').addEventListener('click', close_create_document_modal);

		//DELETE DOCUMENT
		modal.querySelector('#create-document__footer__delete-btn').addEventListener('click', e => {
			display_annul_document_message();
		});

		//ELECTRONIC DOCUMENT
		modal.querySelector('#create-document__footer__electronic').addEventListener('click', change_document_electronic_status);

		//PRINT DOCUMENT
		modal.querySelector('#create-document__footer__print-document').addEventListener('click', () => { document_object.print_document() });
		
		modal.querySelector('#create-document__header__truck .widget-data p').innerText = weight_object.frozen.primary_plates;
		modal.querySelector('#create-document__header__created .widget p').innerText = document_object.frozen.created;
		modal.querySelector('#create-document__header__user .widget p').innerText = document_object.frozen.user.name;

		//SALE OR TRANSPORT DOCUMENT
		document.getElementById('create-document__footer__doc-type').addEventListener('click', async e => {

			try {

				const
				doc_id = DOMPurify().sanitize(document_object.frozen.id),
				type = (document_object.sale) ? false : true, //TOGGLE TYPE OF DOC
				change_doc_type = await fetch('/change_doc_type', {
					method: 'POST',
					headers: {
						"Content-Type" : "application/json",
						"Authorization" : token.value
					},
					body: JSON.stringify({ doc_id, type })
				}),
				response = await change_doc_type.json();

				if (response.error !== undefined) throw response.error;
				if (!response.success) throw 'Success response from server is false.';

				let type_txt;
				if (type) type_txt = 'VENTA';
				else type_txt = 'TRASLADO';

				document_object.sale = type;
				document.querySelector('#create-document__footer__doc-type .widget-button span').innerHTML = `TIPO DOC.<br>${type_txt}`;

			} catch(error) { error_handler('Error al intentar cambiar tipo de documento.', error) }
		});

		if (document_object.sale) 
			document.querySelector('#create-document__footer__doc-type .widget-button span').innerHTML = 'TIPO DOC.<br>VENTA';

		if (weight_object.cycle.id === 3) {

			const doc = weight_object.documents[0];
			modal.querySelector('#create-document__doc-number input').value = (doc.number === null) ? '' : thousand_separator(doc.number);
			modal.querySelector('#create-document__doc-number input').classList.add('has-content');
			modal.querySelector('#create-document__doc-number .widget').classList.add('saved');

			modal.querySelector('#create-document__doc-date input').value = (doc.date === null) ? '' : doc.date.split(' ')[0];
			modal.querySelector('#create-document__doc-date input').classList.add('has-content');
			modal.querySelector('#create-document__doc-date .widget').classList.add('saved');

			modal.querySelector('#create-document__header__origin-entity .widget-data-absolute p').innerText = doc.client.entity.name;
			modal.querySelector('#create-document__header__origin-branch .widget-data-absolute p').innerText = doc.client.branch.name;

			modal.querySelector('#create-document__header__destination-entity .widget-data-absolute p').innerText = doc.internal.entity.name;
			modal.querySelector('#create-document__header__destination-branch .widget-data-absolute p').innerText = doc.internal.branch.name;

			modal.querySelectorAll('.widget .custom-select').forEach(select => { select.remove() })

		} else {

			if (weight_object.cycle.id === 1) {

				document.getElementById('create-document__footer__doc-type').remove();
				document.getElementById('create-document__footer__print-document').remove();
			}
			else if (weight_object.cycle.id===2) {
	
				document.querySelector('#create-document__header__destination-entity .widget-data-absolute h5').innerText = 'ORIGEN';
				document.querySelector('#create-document__header__origin-entity .widget-data-absolute h5').innerText = 'DESTINO';
			}

			modal.querySelector('#create-document__header__origin-entity .widget').addEventListener('click', open_entity_modal);
			modal.querySelector('#create-document__header__origin-entity .widget').addEventListener('keydown', open_entity_modal);			
		}
		resolve();
	})
}

function modal_internal_entities(internal_data) {
	return new Promise(resolve => {
		
		const
		entities = internal_data.entities,
		branches = internal_data.branches, 
		entities_ul = document.querySelector('#create-document__header__destination-entity .custom-select ul'),
		branches_ul = document.querySelector('#create-document__header__destination-branch .custom-select ul');

		entities_ul.innerHTML = `<li class="disabled">Seleccionar Entidad</li>`;
		entities.forEach(entity => {
			const li = document.createElement('li');
			li.setAttribute('data-target-id', entity.id);
			li.innerText = entity.short_name;
			entities_ul.appendChild(li);
		})

		branches_ul.innerHTML = `<li class="disabled">Seleccionar Sucursal</li>`;
		branches.forEach(branch => {
			const li = document.createElement('li');
			li.setAttribute('data-target-id', branch.id);
			li.innerText = branch.name;
			branches_ul.appendChild(li);
		})
		resolve();		
	})
}

async function add_doc_widget(modal) {

	const weight_id = weight_object.frozen.id;

	try {

		const
		create_document = await fetch('/create_new_document', {
			method: 'POST', 
			headers: { 
				"Content-Type" : "application/json",
				"Authorization" : token.value 
			}, 
			body: JSON.stringify({ weight_id})
		}),
		response = await create_document.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

		const template = await (await fetch('./templates/template-create-document.html')).text();
		modal.innerHTML = template;

		document_object = new create_document_object(response.document);
		document_object.rows.push(new document_row(response.document.rows[0]));
		weight_object.documents.push(document_object);

		create_document_create_body_row(document_object.rows[0]);

		if (weight_object.cycle.id !== 3) modal_internal_entities(response.internal);
		await modal_event_listeners(modal);
		
		//WATCH FOR CHANGES IF KILOS BREAKDOWN HAS BEEN DONE
		if (weight_object.kilos_breakdown) document_object.watch_object();

		modal.classList.add('active');

		breadcrumbs('add', 'weight', 'CREAR DOCUMENTO');
		breadcrumbs('add', 'weight', weight_object.cycle.name.toUpperCase());

		await delay(700);

		if (weight_object.cycle.id === 3) modal.querySelector('#create-document__body__table-container tr .product-code input').focus();
		else modal.querySelector('#create-document__doc-number input').focus();
		
	} catch (error) { error_handler('Error al crear documento.', error) }
}

//CREATE TABLE WHEN EXITING DOCUMENT MODAL
function create_documents_table_row(doc) {

	const
	doc_id = doc.frozen.id,
	documents_table = document.querySelector('#weight__documents-table tbody');

	let tr;
	if (!!document.querySelector(`#weight__documents-table  tbody tr[data-doc-id="${doc_id}"]`))
		tr = document.querySelector(`#weight__documents-table tbody tr[data-doc-id="${doc_id}"]`);
	else {
		tr = document.createElement('tr');
		tr.setAttribute('data-doc-id', doc_id);
		tr.innerHTML = `<td class="line-number"></td><td class="delete"><i class="fas fa-times-circle"></i></td><td class="entity"></td><td class="date"></td><td class="doc-number"></td><td class="containers"></td><td class="kilos"></td><td class="total"></td>`;
		documents_table.appendChild(tr);	
	}

	tr.querySelector('.line-number').innerText = Array.from(tr.parentElement.children).indexOf(tr) + 1;
	
	let date = doc.date;
	if (date !== null) date = new Date(date).toLocaleString('es-CL').split(' ')[0];
	tr.querySelector('.date').innerText = date;

	let doc_number = doc.number;
	if (doc_number !== null) doc_number = thousand_separator(doc.number);
	tr.querySelector('.doc-number').innerText = doc_number;

	tr.querySelector('.entity').innerText = doc.client.entity.name;

	let total_containers = doc.containers;
	if (total_containers !== null) total_containers = thousand_separator(doc.containers);
	tr.querySelector('.containers').innerText = total_containers;

	let total_kilos = doc.kilos;
	if (total_kilos !== null) total_kilos = thousand_separator(doc.kilos);
	tr.querySelector('.kilos').innerText = total_kilos;

	let doc_total = doc.total;
	if (doc_total !== null ) doc_total = `$ ${thousand_separator(doc.total)}`;
	tr.querySelector('.total').innerText = doc_total;

}

//CLOSE MODAL TO CREATE NEW DOCUMENT
async function close_create_document_modal() {

	if (clicked) return;
	prevent_double_click();

	const doc = document_object;

	//CHECK ROWS INPUTS DATA
	let doc_with_data = false;
	const inputs = document.querySelectorAll('#create-document__body__table-container input');
	for (let i = 0; i < inputs.length; i++) {
		if (inputs[i].value.length > 0 && inputs[i].parentElement.classList.contains('saved')) {
			doc_with_data = true;
			break;
		}
	}

	//IF DOC HAS NO DATA -> SET ROWS TO RECYCABLE
	if (!doc_with_data && doc.client.entity.id === null && doc.client.branch.id === null && 
		doc.internal.entity.id === null && doc.internal.branch.id === null && doc.number === null && doc.date === null && 
		doc.kilos === 0 && doc.containers === 0 && doc.total === 0) {
		try {
			const
			doc_id = DOMPurify().sanitize(document_object.frozen.id),
			update_doc_status = await fetch('/update_doc_status', {
				method: 'POST', 
				headers: { 
					"Content-Type" : "application/json",
					"Authorization" : token.value 
				}, 
				body: JSON.stringify({ doc_id })
			}),
			response = await update_doc_status.json();
			
			if (response.error !== undefined) throw response.error;
			if (!response.success) throw 'Success response from server is false.';
			
			const docs = weight_object.documents;
			for (let i = 0; i < docs.length; i++) {
				if (docs[i].frozen.id === parseInt(doc_id)) {
					
					const documents_table_tr = document.querySelector(`#weight__documents-table tr[data-doc-id="${weight_object.documents[i].frozen.id}"]`);
					if (!!documents_table_tr) documents_table_tr.remove();
					
					weight_object.documents.splice(i, 1);
					break;
				}
			}

		} catch(error) { error_handler('Error al actualizar estado de documento en /update_doc_status', error) }
	}

	//DOCUMENT HAS DATA AND THEREFORE GETS SAVED
	else {

		doc_with_data = true;

		//RECYCLE LAST DOCUMENT ROW IF IT'S EMPTY
		if (doc.rows.length > 1) {
			let last_row_with_content = false;
			const last_row_inputs = document.querySelectorAll('#create-document__body .tbl-content tr:last-child input');
			for (let i = 0; i < last_row_inputs.length; i++) {
				if (last_row_inputs[i].value !== '') {
					last_row_with_content = true;
					break;
				}
			}

			if (!last_row_with_content) {
				try {
					const
					row_id = document_object.rows[document_object.rows.length - 1].id,
					recycle_row = await fetch('/recycle_row', {
						method: 'POST', 
						headers: { 
							"Content-Type" : "application/json",
							"Authorization" : token.value 
						}, 
						body: JSON.stringify({ row_id })
					}),
					response = await recycle_row.json();

					if (response.error !== undefined) throw response.error;
					if (!response.success) throw 'Success response from server is false.';
					document_object.rows.splice(document_object.rows.length - 1, 1);
				} catch(err) { error_handler('Error al reciclar fila vacía en /recycle_row', err) }
			}
		}

		//SAVE DOCUMENT
		const weight_id = DOMPurify().sanitize(weight_object.frozen.id);

		try {

			const
			doc_totals = await fetch('/get_weight_totals', {
				method: 'POST', 
				headers: { 
					"Content-Type" : "application/json",
					"Authorization" : token.value 
				}, 
				body: JSON.stringify({ weight_id })
			}),
			response = await doc_totals.json();

			if (response.error !== undefined) throw response.error;
			if (!response.success) throw 'Success response from server is false.';

			weight_object.gross_weight.containers_weight = response.gross_containers;
			weight_object.gross_weight.net = response.gross_net;

			if (response.cycle === 1) weight_object.kilos.informed = response.kilos;
			else weight_object.kilos.internal = response.kilos;

			weight_object.final_net_weight = response.final_net_weight;

		} catch(error) { error_handler('Error al obtener totales de documento en /get_document_totals', error) }
	}

	clearInterval(watch_document);


	//WHEN EXITING DOCUMENT IN CREATE WEIGHT
	if (!!document.querySelector('#create-weight-step-2') ) {

		if (doc_with_data) {
			create_documents_table_row(document_object);

			document.getElementById('gross-weight__containers').innerText = `${thousand_separator(weight_object.gross_weight.containers_weight)} KG`;
	
			const doc_kilos = (weight_object.cycle.id === 1) ? weight_object.kilos.informed : weight_object.kilos.internal;
	
			document.getElementById('gross-weight__docs-weight').innerText = `${thousand_separator(doc_kilos)} KG`;
			document.getElementById('tare-weight__docs-weight').innerText = `${thousand_separator(doc_kilos)} KG`;
	
			document.getElementById('gross-weight__net').innerText = `${thousand_separator(weight_object.gross_weight.net)} KG`;
			document.getElementById('tare-weight__gross-weight').innerText = `${thousand_separator(weight_object.gross_weight.net)} KG`;
			
			if (weight_object.gross_weight.status > 1 && weight_object.tare_weight.status === 1) 
				document.getElementById('gross__final-net-weight').innerText = `${thousand_separator(weight_object.gross_weight.net - weight_object.average_weight)} KG`;
			
			else if (weight_object.gross_weight.status > 1 && weight_object.tare_weight.status > 1)
				document.getElementById('gross__final-net-weight').innerText = `${thousand_separator(weight_object.final_net_weight)} KG`;	
		}
	
		document.getElementById('create-weight__modal').classList.remove('active');
	}

	//WHEN EXITING DOCUMENT IN FINISHED WEIGHTS
	else if (!!document.querySelector('#finished-weight__modal-container')) {

		if (doc_with_data) {

			//FINAL NET WEIGHT
			document.querySelector('#finished-weight__modal__net-weight .widget-data p').innerText = thousand_separator(weight_object.final_net_weight) + ' KG';

			//BRUTE DATA
			document.querySelector('#finished-weight__modal__weight-kilos tbody tr:first-child .containers').innerText = thousand_separator(weight_object.gross_weight.containers_weight) + ' KG';
			document.querySelector('#finished-weight__modal__weight-kilos tbody tr:first-child .net').innerText = thousand_separator(weight_object.gross_weight.net) + ' KG';

			//DOCUMENT DATA
			if (!!document.querySelector(`#finished-weight__modal__documents-container .widget[data-doc-id="${doc.frozen.id}"]`) === false) {
				const new_widget = document.createElement('div');
				new_widget.setAttribute('data-doc-id', doc.frozen.id);
				new_widget.className = 'widget';
				new_widget.innerHTML = `
					<div class="widget-icon">
						<i class="fal fa-file-alt"></i>
					</div>
					<div class="document-header">
						<div class="doc-btn">
							<div>
								<i class="fal fa-file-edit"></i>				
							</div>
							<span>Editar Doc.</span>
						</div>
						<div class="origin">
							<p><b>Origen:</b> Soc. Comercial Lepefer y Cia Ltda.</p>
							<i class="far fa-level-up"></i>
							<p><b>Sucursal:</b> Secado El Convento</p>					
						</div>
						<div class="destination">
							<p><b>Destino:</b> Soc. Comercial Lepefer y Cia Ltda.</p>
							<i class="far fa-level-up"></i>
							<p><b>Sucursal:</b> Secado El Convento</p>
						</div>
						<div class="doc-header-data">
							<div>
								<i class="fal fa-calendar-alt"></i>
								<p><b>26-04-2021</b></p>
							</div>
							<div>
								<i class="fal fa-file-alt"></i>
								<p><b>Nº Doc:</b> 33.740</p>
							</div>
						</div>
						<div class="doc-btn">
							<div>
								<i class="far fa-trash-alt"></i>			
							</div>
							<span>Anular Doc.</span>	
						</div>
					</div>
					<div class="document-body">
						<div class="table-header">
							<table>
								<thead>
									<tr>
										<th class="line-number">Nº</th>
										<th class="container-amount">CANTIDAD</th>
										<th class="container">ENVASE</th>
										<th class="container-weight">PESO ENV.</th>
										<th class="product">PRODUCTO</th>
										<th class="cut">DESCARTE</th>
										<th class="price">PRECIO</th>
										<th class="kilos">KILOS</th>
										<th class="kilos-informed">KG. INF.</th>
										<th class="product-total">TOTAL</th>
									</tr>
								</thead>
							</table>
						</div>
						<div class="table-body">
							<table>
								<tbody></tbody>
							</table>
						</div>
					</div>
					<div class="document-footer">
						<table>
							<tbody>
								<tr>
									<td class="line-number"></td>
									<td class="container-amount"></td>
									<td class="container"></td>
									<td class="container-weight"></td>
									<td class="product"></td>
									<td class="cut"></td>
									<td class="price"></td>
									<td class="kilos"></td>
									<td class="kilos-informed"></td>
									<td class="product-total"></td>
								</tr>
							</tbody>
						</table>
					</div>
				`;
				document.getElementById('finished-weight__modal__documents-container').appendChild(new_widget);
			}

			const doc_widget = document.querySelector(`#finished-weight__modal__documents-container .widget[data-doc-id="${doc.frozen.id}"]`);

			let origin_entity, origin_branch, destination_entity, destination_branch;
			if (weight_object.cycle.id === 1) {
				
				origin_entity = (doc.client.entity.name === null) ? '' : doc.client.entity.name;
				origin_branch = (doc.client.branch.name === null) ? '' : doc.client.branch.name;
				
				destination_entity = (doc.internal.entity.name === null) ? '' : doc.internal.entity.name;
				destination_branch = (doc.internal.branch.name === null) ? '' : doc.internal.branch.name;
			} else {

				origin_entity = (doc.internal.entity.name === null) ? '' : doc.internal.entity.name;
				origin_branch = (doc.internal.branch.name === null) ? '' : doc.internal.branch.name;
				
				destination_entity = (doc.client.entity.name === null) ? '' : doc.client.entity.name;
				destination_branch = (doc.client.branch.name === null) ? '' : doc.client.branch.name;
			}

			const 
			doc_date = (doc.date === null) ? '-' : `<b>${new Date(doc.date).toLocaleString('es-CL').split(' ')[0]}</b>`,
			doc_number = (doc.number === null) ? '-' : `<b>Nº Doc: ${thousand_separator(doc.number)}</b>`;

			doc_widget.querySelector('.origin p:first-child').innerHTML = '<b>ORIGEN: </b>' + origin_entity;
			doc_widget.querySelector('.origin p:last-child').innerHTML = '<b>SUCURSAL: </b>' + origin_branch;
			
			doc_widget.querySelector('.destination p:first-child').innerHTML = '<b>DESTINO: </b>' + destination_entity;
			doc_widget.querySelector('.destination p:last-child').innerHTML = '<b>SUCURSAL: </b>' + destination_branch;

			doc_widget.querySelector('.doc-header-data div:first-child p').innerHTML = doc_date;
			doc_widget.querySelector('.doc-header-data div:last-child p').innerHTML = doc_number;

			//DOCUMENT ROWS DETAILS
			doc_widget.querySelectorAll('.document-body tbody tr').forEach(tr => { tr.remove() });

			let containers = 0, kilos = 0, informed_kilos = 0, total = 0;
			const rows = doc.rows;
			for (let i = 0; i < rows.length; i++) {

				const 
				tr = document.createElement('tr'),
				container_amount = (rows[i].container.amount === null) ? '' : thousand_separator(rows[i].container.amount),
				container_name = (rows[i].container.name === null) ? '' : rows[i].container.name,
				container_weight = (rows[i].container.weight === null) ? '' : thousand_separator(rows[i].container.weight) + ' KG',
				product_name = (rows[i].product.name === null) ? '' : rows[i].product.name,
				product_cut = (rows[i].product.cut === null) ? '' : rows[i].product.cut.toUpperCase(),
				product_price = (rows[i].product.price === null) ? '' : '$' + thousand_separator(rows[i].product.price),
				product_kilos = (rows[i].product.kilos === null) ? '' : thousand_separator(rows[i].product.kilos) + ' KG',
				product_inf_kilos = (rows[i].product.informed_kilos === null) ? '' : thousand_separator(rows[i].product.informed_kilos) + ' KG',
				product_total = (rows[i].product.total === null) ? '' : '$' + thousand_separator(rows[i].product.total);

				tr.setAttribute('data-row-id', rows[i].id);
				tr.innerHTML = `
					<td class="line-number">${i + 1}</td>
					<td class="container-amount">${container_amount}</td>
					<td class="container">${container_name}</td>
					<td class="container-weight">${container_weight}</td>
					<td class="product">${product_name}</td>
					<td class="cut">${product_cut}</td>
					<td class="price">${product_price}</td>
					<td class="kilos">${product_kilos}</td>
					<td class="kilos-informed">${product_inf_kilos}</td>
					<td class="product-total">${product_total}</td>
				`;
				containers += 1 * rows[i].container.amount;
				kilos += 1 * rows[i].product.kilos;
				informed_kilos += 1 * rows[i].product.informed_kilos;
				total += 1 * rows[i].product.total;
				doc_widget.querySelector('.document-body tbody').appendChild(tr);
			}
			
			//DOC TOTALS
			doc_widget.querySelector('.document-footer .container-amount').innerText = thousand_separator(containers);
			doc_widget.querySelector('.document-footer .kilos').innerText = thousand_separator(kilos) + ' KG';
			doc_widget.querySelector('.document-footer .kilos-informed').innerText = thousand_separator(informed_kilos) + ' KG';
			doc_widget.querySelector('.document-footer .product-total').innerText = '$' + thousand_separator(total);

			doc_widget.querySelector('.doc-btn:first-child').addEventListener('click', finished_weights_edit_document);
			doc_widget.querySelector('.doc-btn:last-child').addEventListener('click', finished_weights_annul_document);
		}
		
		document.getElementById('finished-weight__documents_modal').classList.remove('active');
		document.getElementById('finished-weight__modal-container').classList.add('active');


		if (!weight_object.kilos_breakdown) {
			await delay(600);
			document.querySelector('#finished-weight__kilos_breakdown .widget-tooltip').classList.add('red');
			document.querySelector('#finished-weight__kilos_breakdown .widget-tooltip span').innerText = "DESGLOCE PENDIENTE";
		}
	}

	document.getElementById('create-weight__modal-container').remove();

	document_object = null;
	breadcrumbs('remove', 'weight');
	breadcrumbs('remove', 'weight');
}

//DOCUMENT CHANGE ELECTRONIC STATUS
function update_document_electronic_status(doc_id, new_status) {
	return new Promise(async (resolve, reject) => {
		try {

			

			

		} catch(error) { return reject(error) }
	})
}

async function change_document_electronic_status() {
	
	if (clicked) return;
	prevent_double_click();

	const 
	btn = this,
	new_electronic_status = (document_object.electronic) ? false : true, //OPPOSITE OF WHAT IS CURRENT STATUS TO TOGGLE IT
	doc_id = document_object.frozen.id;

	try {

		const
		update_status = await fetch('/update_document_electronic_status', {
			method: 'POST',
			headers: {
				"Content-Type" : "application/json",
				"Authorization" : token.value
			},
			body: JSON.stringify({ new_electronic_status, doc_id })
		}),
		response = await update_status.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';
		
		document_object.electronic = new_electronic_status;
		btn.classList.toggle('enabled');

	} catch(error) { error_handler('Error al intentar cambiar estado de documento electronico', error) }
}

//CREATE DOCUMENTS ROWS
function create_document_create_body_row(row) {
	return new Promise(async (resolve, reject) => {
		
		const tr = document.createElement('tr');
		tr.setAttribute('data-row-id', row.id);
		tr.innerHTML = `
			<td class="row-number saved" tabindex="-1">
				<span>1</span>
				<i class="fal fa-times-circle"></i>
			</td>
			<td class="product-code"><input data-type="text" class="input-effect">
				<span class="focus-border"></span>
			</td>
			<td class="product-name"><input data-type="text" class="input-effect" max="128">
				<span class="focus-border"></span>
				<ul></ul>
			</td>
			<td class="cut">
				<select>
					<option disabled selected value="none">SELECCIONAR</option>
					<option value="Parron">PARRON</option>
					<option value="Packing">PACKING</option>
				</select>
			</td>
			<td class="product-price"><input data-type="text" class="input-effect">
				<span class="focus-border"></span>
			</td>
			<td class="product-kilos"><input data-type="text" class="input-effect">
				<span class="focus-border"></span>
			</td>
			<td class="product-total"></td><td class="container-code">
				<input data-type="text" class="input-effect">
				<span class="focus-border"></span>
			</td>
			<td class="container-name"><input data-type="text" class="input-effect">
				<span class="focus-border"></span>
				<ul></ul>
			</td>
			<td class="container-weight"><input data-type="text" class="input-effect">
				<span class="focus-border"></span>
			</td>
			<td class="container-amount"><input data-type="text" class="input-effect">
				<span class="focus-border"></span>
			</td>`
		;

		document.querySelector('#create-document__body .tbl-content tbody').appendChild(tr);
		tr.querySelector('.row-number span').innerText = tr.parentElement.children.length;

		tr.querySelector(`.product-code input`).value = row.product.code;
		try {
			tr.querySelector(`.product-name input`).value = (row.product.code === 'TRASLADO') ? await get_traslado_description(row.id) : row.product.name;
		} catch(error) { return reject(error) }

		const cut = (row.product.cut === null) ? 'none' : row.product.cut;
		tr.querySelector('.cut select').value = cut;

		let price = row.product.price;
		if (price !== null) price = '$' + thousand_separator(price);
		tr.querySelector(`.product-price input`).value = price;
		
		let kilos = (weight_object.cycle.id === 1) ? row.product.informed_kilos : row.product.kilos;
		if (kilos !== null) kilos = thousand_separator(kilos);
		tr.querySelector(`.product-kilos input`).value = kilos;

		const total = 1 * row.product.total;
		if (total > 0) tr.querySelector(`.product-total`).innerText = '$' + thousand_separator(total);
		
		tr.querySelector(`.container-code input`).value = row.container.code;
		tr.querySelector(`.container-name input`).value = row.container.name;
		
		tr.querySelector(`.container-weight input`).value = row.container.weight;

		const container_amount = (row.container.amount === null) ? null : thousand_separator(row.container.amount);
		tr.querySelector(`.container-amount input`).value = container_amount;

		tr.querySelectorAll('input').forEach(input => {
			input.addEventListener('keydown', navigate_document_with_arrows);
		});

		tr.querySelector('.row-number i').addEventListener('click', delete_document_row);
		tr.querySelector('.product-code input').addEventListener('keydown', product_code_search);
		tr.querySelector('.product-name input').addEventListener('keydown', product_name_jump_to_li);
		tr.querySelector('.product-name input').addEventListener('keydown', update_traslado_description);
		tr.querySelector('.product-name ul').addEventListener('click', product_name_select_li);
		tr.querySelector('.cut select').addEventListener('change', product_cut_select);
		tr.querySelector('.product-price input').addEventListener('keydown', product_price_update)
		tr.querySelector('.product-kilos input').addEventListener('keydown', product_kilos_update);
		tr.querySelector('.container-code input').addEventListener('keydown', container_code_search);
		tr.querySelector('.container-name input').addEventListener('keydown', container_name_jump_to_li);
		tr.querySelector('.container-name ul').addEventListener('click', container_name_select_li);
		tr.querySelector('.container-amount input').addEventListener('keydown', container_amount_update);
		tr.querySelector('.container-amount input').addEventListener('input', countainer_amount_set_to_null);

		tr.querySelector('.product-code input').addEventListener('input', product_code_set_to_null);
		tr.querySelector('.product-name input').addEventListener('input', product_name_search);
		tr.querySelector('.product-price input').addEventListener('input', product_price_set_to_null);
		tr.querySelector('.product-kilos input').addEventListener('input', product_kilos_set_to_null);
		tr.querySelector('.container-code input').addEventListener('input', container_code_set_to_null);
		tr.querySelector('.container-name input').addEventListener('input', search_container_by_name);
		resolve();
	});
}

function edit_document_in_modal(doc_id, modal) {
	return new Promise(async (resolve, reject) => {
		try {

			const
			get_entities = await fetch('/get_document_entities', { 
				method: 'GET', 
				headers: { 
					"Cache-Control" : "no-cache",
					"Authorization" : token.value 
				} 
			}),
			response = await get_entities.json();
	
			if (response.error !== undefined) throw response.error;
			if (!response.success) throw 'Success response from server is false.';

			const template = await (await fetch('./templates/template-create-document.html')).text();

			modal.innerHTML = template;
	
			for (let i = 0; i < weight_object.documents.length; i++) {
				if (weight_object.documents[i].frozen.id === doc_id) {
					document_object = weight_object.documents[i];
					break;
				}	
			}

			//WATCH FOR CHANGES IF KILOS BREAKDOWN HAS BEEN DONE
			if (weight_object.kilos_breakdown) document_object.watch_object();
	
			await modal_internal_entities(response.internal);
			modal_event_listeners(modal);
			
			let doc_number = document_object.number;
			if (doc_number !== null) {
				doc_number = thousand_separator(doc_number);
				modal.querySelector('#create-document__doc-number .widget').classList.add('saved');
				modal.querySelector('#create-document__doc-number input').classList.add('has-content');
			}
			modal.querySelector('#create-document__doc-number input').value = doc_number;
	
			let doc_date = document_object.date;
			console.log(doc_date)
			if (doc_date !== null) {
				doc_date = doc_date.split(' ')[0];
				modal.querySelector('#create-document__doc-date .widget').classList.add('saved');
				modal.querySelector('#create-document__doc-date input').classList.add('has-content');
			}
			modal.querySelector('#create-document__doc-date input').value = doc_date;
	
			modal.querySelector('#create-document__header__origin-entity .widget-data-absolute p').innerText = document_object.client.entity.name;
			if (document_object.client.entity.name !== null) 
				modal.querySelector('#create-document__header__origin-entity .widget').classList.add('saved');
			
			modal.querySelector('#create-document__header__origin-branch .widget-data-absolute p').innerText = document_object.client.branch.name;
			if (document_object.client.branch.name !== null) 
				modal.querySelector('#create-document__header__origin-branch .widget').classList.add('saved');
			
			modal.querySelector('#create-document__header__destination-entity .widget-data-absolute p').innerText = document_object.internal.entity.name;
			if (document_object.internal.entity.name !== null) 
				modal.querySelector('#create-document__header__destination-entity .widget').classList.add('saved');
	
			modal.querySelector('#create-document__header__destination-branch .widget-data-absolute p').innerText = document_object.internal.branch.name;
			if (document_object.internal.branch.name !== null) 
				modal.querySelector('#create-document__header__destination-branch .widget').classList.add('saved');
	
			const 
			rows = document_object.rows,
			table = modal.querySelector('#create-document__body__table-container .tbl-content tbody');
			
			for (let i = 0; i < rows.length; i++) {
				await create_document_create_body_row(rows[i]);
			}	
	
			const comments = (document_object.comments === null) ? '' : document_object.comments;
			modal.querySelector('#create-document__comments').value = comments;
			if (comments.length > 0) {
				modal.querySelector('#create-document__comments').classList.add('has-content');
				modal.querySelector('#create-document__body__document-comments').classList.add('saved');
			}
	
			const inputs = table.querySelectorAll('td input');
			inputs.forEach(input => { if (input.value.length > 0) input.parentElement.classList.add('saved') });
	
			const totals = table.querySelectorAll('.product-total');
			totals.forEach(total => { if (total.innerText !== '') total.classList.add('saved') });
	
			const selects = table.querySelectorAll('.cut select');
			selects.forEach(select => { if (select.value !== 'none') select.parentElement.classList.add('saved') });

			if (document_object.electronic) document.querySelector('#create-document__footer__electronic').classList.add('enabled');
	
			modal.querySelector('#create-document__footer__total-product-kilos .widget-data p').innerText = thousand_separator(document_object.kilos);
			modal.querySelector('#create-document__footer__total-containers .widget-data p').innerText = thousand_separator(document_object.containers);
			modal.querySelector('#create-document__footer__total-document .widget-data p').innerText = thousand_separator(document_object.total);
			
			breadcrumbs('add', 'weight', 'EDITAR DOCUMENTO');
			breadcrumbs('add', 'weight', weight_object.cycle.name.toUpperCase());
			
			return resolve();
		} catch (error) { error_handler('Error al intentar editar document.', error); return reject() }
	})
}

async function delete_document(doc_id) {
	try {

		const 
		delete_document = await fetch('/delete_document', {
			method: 'POST', 
			headers: { 
				"Content-Type" : "application/json",
				"Authorization" : token.value 
			}, 
			body: JSON.stringify({ doc_id })
		}),
		response = await delete_document.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

		const docs = weight_object.documents;
		for (let i = 0; i < docs.length; i++) { 
			if (docs[i].frozen.id === doc_id) { 
				weight_object.documents.splice(i, 1);
				break;
			} 
		}

		let docs_total = 0;
		docs.forEach(doc => { docs_total += doc.kilos });

		weight_object.gross_weight.containers = response.gross_containers;
		weight_object.gross_weight.net = response.gross_net;
		weight_object.final_net_weight = response.final_net_weight;

		document.getElementById('gross-weight__containers').innerText = `${thousand_separator(1 * weight_object.gross_weight.containers)} KG`;
		document.getElementById('gross-weight__net').innerText = `${thousand_separator(1 * weight_object.gross_weight.net)} KG`;
		document.getElementById('tare-weight__gross-weight').innerText = `${thousand_separator(1 * weight_object.gross_weight.net)} KG`;

		document.getElementById('gross-weight__docs-weight').innerText = `${thousand_separator(docs_total)} KG`;
		document.getElementById('tare-weight__docs-weight').innerText = `${thousand_separator(docs_total)} KG`;

		if (weight_object.tare_weight.status > 1) {
			document.getElementById('tare__final-net-weight').innerText = `${thousand_separator(1 * weight_object.final_net_weight)} KG`;
			document.getElementById('gross__final-net-weight').innerText = `${thousand_separator(1 * weight_object.final_net_weight)} KG`;	
		}

		document.querySelector(`#weight__documents-table .table-body tr[data-doc-id="${doc_id}"]`).remove();

		const table_rows = document.querySelectorAll('#weight__documents-table .table-body tr');
		for (let j = 0; j < table_rows.length; j++) { table_rows[j].querySelector('.line-number').innerText = j + 1 }
		
	} catch(error) { error_handler('Error al eliminar documento.', error) }
}

async function document_table_click(e) {

	if (clicked) return;
	prevent_double_click();

	if (e.target.matches('td')) {

		const doc_id = parseInt(e.target.parentElement.getAttribute('data-doc-id'));

		//if (e.target.className === 'delete') delete_document(doc_id);
		if (e.target.className === 'delete') display_annul_document_message();
		else {
			const modal = document.getElementById('create-weight__modal');
			await edit_document_in_modal(doc_id, modal);
			modal.classList.add('active');
		}
	}

	else if (e.target.matches('i')) {
		const doc_id = parseInt(e.target.parentElement.parentElement.getAttribute('data-doc-id'));
		//delete_document(doc_id);
		display_annul_document_message(doc_id);
	}

	else return;
}

//CREATE DOCUMENT -> UPDATE DOCUMENT NUMBER -> KEYDOWN EVENT
async function create_document_update_doc_number(e) {

	/*
	if (document_object.electronic) {
		e.target.value = thousand_separator(document_object.number);
		return;
	}
	*/

	if (e.code !== 'Tab' && e.key!== 'Enter' ) return;

	e.preventDefault();

	const doc_number = (e.target.value.replace(/\D/g, '').length === 0) ? null : parseInt(e.target.value.replace(/\D/g, ''));

	if (doc_number === document_object.number) {
		if (e.shiftKey) document.querySelector('#create-document__footer__delete-btn .widget').focus()
		else document.querySelector('#create-document__doc-date input').focus();
		return;
	}

	const 
	tooltip = document.querySelector('#create-document__doc-number .widget-tooltip'),
	widget = document.querySelector('#create-document__doc-number .widget');

	if (!tooltip.classList.contains('hidden')) {
		fade_out(tooltip);
		tooltip.classList.add('hidden');
	}

	animate_on_data_saved(widget);

	try {
		const update = await document_object.update_doc_number(doc_number);
		if (update) {

			if (document_object.number === null) widget.classList.remove('saved');
			else widget.classList.add('saved');

			if (document_object.existing_document) {

				tooltip.querySelector('span').innerText = `Nº de documento ${doc_number} ya existe para origen.`
				fade_in(tooltip, 250, 'block');
				//tooltip.classList.remove('hidden');
				//document.querySelector('#create-document__doc-number input').value = '';
				return;
			} 
			if (doc_number !== null) document.querySelector('#create-document__doc-date input').focus();
		}
	}
	catch(e) { console.log(`Error updating Document Number. Error msg: ${e}`) }
}

//CREATE DOCUMENT -> UPDATE DOCUMENT DATE -> KEYDOWN EVENT
async function create_document_doc_date_update(e) {
	
	/*
	if (document_object.electronic) {
		e.target.value = document_object.date;
		return;
	}
	*/

	if (e.code !== 'Tab' && e.key !== 'Enter') return;
	if (e.target.value.length > 0 && !validate_date(e.target.value)) return;

	const date = (e.target.value.length === 0) ? null : e.target.value;
	if (date === document_object.date) return;

	const widget = document.querySelector('#create-document__doc-date .widget');
	animate_on_data_saved(widget);

	try {	

		const year = parseInt(date.substring(0, 4));
		if (year === NaN || year < 2019) throw 'Fecha inválida para documento.'

		await document_object.update_doc_date(date);

		if (date === null) {
			widget.classList.remove('saved');
			e.target.classList.remove('has-content');
		}

		else {
			widget.classList.add('saved');
			e.target.classList.add('has-content');
		}

		//document.querySelector('#create-document__header__origin-entity .widget').focus();
		
	} catch(error) { error_handler('Error al ingresar fecha de documento.', error) }
}

async function create_document_doc_date_input(e) {

	const date = e.target.value;

	if (date.length < 10) return;
	if (!validate_date(date)) return;
	console.log(date)
	if (parseInt(date.substring(0, 4)) === NaN || parseInt(date.substring(0, 4)) < 2019) return;
	if (date === document_object.date) return;

	const widget = document.querySelector('#create-document__doc-date .widget');
	animate_on_data_saved(widget);

	try {

		await document_object.update_doc_date(date);
		
		widget.classList.add('saved');
		e.target.classList.add('has-content');

		//document.querySelector('#create-document__header__origin-entity .widget').focus();
		
	} catch(error) { console.log(`Error updating document date: Error msg: ${error}`) }
}

function create_document_select_entity_create_li(entities) {

	const ul = document.querySelector('#create-document__origin-entity-list ul');

	for (let i = 0; i < entities.length; i++) {
		const li = document.createElement('li');
		li.setAttribute('data-entity-id', entities[i].id);
		li.setAttribute('tabindex', -1);
		li.setAttribute('data-navigation', true);
		li.setAttribute('data-prev-tab-selector', '#create-document__select-entity__select-branch');
		li.innerText = entities[i].name;
		ul.appendChild(li);
	}
}

function create_document_client_li(e) {
	return new Promise(resolve => {
	
		if (e.type === 'keydown') {
			e.preventDefault();
			if (e.code !== 'ArrowDown' && e.code !== 'ArrowUp' && e.code !=='Space' && e.key!== 'Enter') return resolve();

			const li = e.target;
			const ul = li.parentElement;
			if (ul.classList.contains('table-body')) {
				if (e.code === 'ArrowUp') {
					if (li === li.parentElement.firstElementChild) li.parentElement.lastElementChild.focus();
					else li.previousElementSibling.focus();
				}
				else if (e.code === 'ArrowDown') {
					if (li === li.parentElement.lastElementChild) li.parentElement.firstChild.focus();
					else li.nextElementSibling.focus();
				}
				else if (e.code==='Space' || e.key==='Enter') li.firstElementChild.click();
				else return resolve();
			} else {
				const input = document.querySelector('#create-document__select-entity__search-origin');
				if (e.code==='ArrowDown') {
					if (li === li.parentElement.lastChild) input.focus();
					else li.nextElementSibling.focus();
				}
				else if (e.code==='ArrowUp') {
					if (li === li.parentElement.firstChild) input.focus();
					else li.previousElementSibling.focus();
				}
				else if (e.code==='Space' || e.key==='Enter') li.click();
				else return resolve();
			}
		}
	
		else if (e.type === 'click') {
			let li;
			if (e.target.matches('li')) li = e.target;
			else if (e.target.matches('div') && e.target.parentElement.classList.contains('table-row')) li = e.target.parentElement;
			else return resolve();

			const ul = li.parentElement;
			if (li.classList.contains('selected')) {
				li.classList.remove('selected');
				ul.classList.remove('li-selected');
				return resolve();
			}
	
			if (ul.querySelector('.selected')) ul.querySelector('.selected').classList.remove('selected');
			li.classList.add('selected');
			if (!ul.classList.contains('li-selected')) ul.classList.add('li-selected');
		}	
		return resolve();
	})
}

//CREATE DOCUMENT -> ORIGIN WIDGET
async function open_entity_modal(e) {

	/*if (document_object.electronic) return;*/

	if (e.type === 'click' || (e.type === 'keydown' && (e.code === 'Space' || e.key === 'Enter'))) {
		
		if (clicked) return;
		prevent_double_click();

		try {
			const
			fetch_entities = await fetch('/get_entities_for_document', { 
				method: 'GET', 
				headers: { 
					"Cache-Control" : "no-cache",
					"Authorization" : token.value 
				} 
			}),
			response = await fetch_entities.json();

			if (response.error !== undefined) throw response.error;
			if (!response.success) throw 'Success response from server is false.';

			create_document_select_entity_create_li(response.entities);

			const
			fade_out_target = document.getElementById('create-document__details-container'),
			fade_in_target = document.getElementById('create-document__select-entities-container'),
			client_list = document.querySelector('#create-document__origin-entity-list ul');

			mutation_observer = new MutationObserver(() => {
				document.getElementById('create-document__select-entity__select-branch').classList.toggle('enabled');
			});
			mutation_observer.observe(client_list, { attributes: true });

			document.getElementById('create-weight__modal-container').classList.add('overflow-hidden');

			await fade_out(fade_out_target);
			fade_out_target.classList.add('hidden');
			fade_in(fade_in_target);
			fade_in_target.classList.remove('hidden');
			document.getElementById('create-document__select-entity__search-origin').focus();	

		} catch(error) { error_handler('Error al buscar lista de entidades en /get_entities_for_document', error) }
		
		if (clicked) return;
		prevent_double_click();
	}
}

//CREATE DOCUMENT -> SELECT ENTITY -> CLOSE MODAL
function close_entity_modal() {
	return new Promise(async resolve => {

		if (clicked) return resolve();
		prevent_double_click();
	
		mutation_observer.disconnect();
		mutation_observer = null;
	
		const
		show = document.getElementById('create-document__details-container'),
		hide = document.getElementById('create-document__select-entities-container');
	
		await fade_out(hide);
		hide.classList.add('hidden');
		fade_in(show, 0, 'grid');
		show.classList.remove('hidden');
		document.querySelectorAll('#create-document__origin-entity-list li').forEach(li => { li.remove() })
	
		document.getElementById('create-document__select-entity__select-branch').classList.remove('enabled');
		document.getElementById('create-document__select-origin-branch-btn').classList.remove('enabled');	
		
		document.querySelector('#create-document__origin-entity-list ul').classList.remove('li-selected');
		document.querySelector('#create-document__origin-branch-list .table-body').classList.remove('li-selected');

		document.getElementById('create-weight__modal-container').classList.remove('overflow-hidden');
		return resolve();
	})
}

//CREATE DOCUMENT -> SELECT CLIENT ENTITY -> SEARCH FOR ORIGIN ENTITY IN INPUT
async function create_document_search_client_entity(e) {

	if (e.target.value.length === 0) e.target.classList.remove('has-content');
	else e.target.classList.add('has-content');

	const
	ul = document.querySelector('#create-document__origin-entity-list ul'),
	entity_to_search = DOMPurify().sanitize(e.target.value);
	
	try {
		const
		search_entity = await fetch('/search_for_entity', {
			method: 'POST', 
			headers: { 
				"Content-Type": "application/json",
				"Authorization" : token.value 
			}, 
			body: JSON.stringify({ entity_to_search })
		}),
		response = await search_entity.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

		ul.querySelectorAll('li').forEach(li => { li.remove() });
	
		const
		target_btn = document.getElementById('create-document__select-origin-btn'),
		entities = response.entities;

		create_document_select_entity_create_li(entities, target_btn);
		if (entities.length===1) ul.firstChild.click();
		else { if (ul.classList.contains('li-selected')) ul.classList.remove('li-selected') }	
	} catch(error) { error_handler('Error al buscar entidad en /search_for_entity', error) }
}

//CREATE DOCUMENT -> SELECT ENTITY -> SEARCH CLIENT ENTITY INPUT -> KEYDOWN EVENT
function create_document_search_client_jump_to_li(e) {
	if (e.code !== 'ArrowDown' && e.code !== 'ArrowUp') return;
	e.preventDefault();
	if (e.code==='ArrowDown') document.querySelector('#create-document__origin-entity-list ul').firstChild.focus();
	else if (e.code==='ArrowUp') document.querySelector('#create-document__origin-entity-list ul').lastChild.focus();
}

/******************************************************* ******************************************/

//ORIGIN -> GO TO SELECT BRANCH BUTTON
async function create_document_select_entity() {

	if (btn_double_clicked(this)) return;
	if (!document.querySelector('#create-document__origin-entity-list li.selected')) return;

	const 
	li = document.querySelector('#create-document__origin-entity-list li.selected'),
	origin_id = parseInt(li.getAttribute('data-entity-id')),
	mutation_target = document.querySelector('#create-document__origin-branch .table-content .table-body');
	
	try {

		const branches = await document_object.update_client(origin_id);
		document.querySelector('#create-document__header__origin-entity .widget').classList.add('saved');
		document.querySelector('#create-document__header__origin-entity .widget-data-absolute p').innerText = document_object.client.entity.name;
		
		if (document_object.internal.entity.id !== null) {
		
			const
			internal_entity = document_object.internal.entity.id,
			internal_branch = document_object.internal.branch.id;
			document.querySelector(`#create-document__header__destination-entity .custom-select li[data-target-id="${internal_entity}"]`).click();
			document.querySelector(`#create-document__header__destination-branch .custom-select li[data-target-id="${internal_branch}"]`).click();
		}

		mutation_observer.disconnect();
		mutation_observer = null;
		
		mutation_observer = new MutationObserver(() => {

			const target_btn = document.getElementById('create-document__select-origin-branch-btn');
			target_btn.classList.toggle('disabled');
			target_btn.classList.toggle('enabled');
		});
		mutation_observer.observe(mutation_target, { attributes: true });

		document.querySelector('#create-document__origin-branch div:nth-child(1) h3').innerText = document_object.client.entity.name;

		for (let i = 0; i < branches.length; i++) {

			const
			tr = document.createElement('div'),
			td1 = document.createElement('div'),
			td2 = document.createElement('div'),
			td3 = document.createElement('div'),
			td4 = document.createElement('div');

			tr.classList.add('table-row');
			tr.setAttribute('data-suc-id', branches[i].id);
			tr.setAttribute('tabindex', -1);
			tr.setAttribute('data-navigation', true);

			td1.innerText = i + 1;
			td2.innerText = branches[i].name;
			td3.innerText = branches[i].address;
			td4.innerText = branches[i].comuna;

			//tr.addEventListener('click', () => { select_li(tr, target_btn) });
			tr.addEventListener('keydown', (e) => {
				e.preventDefault();
				const li = e.target;
				if (li.parentElement.children.length > 1) {
					if (e.code === 'ArrowDown') {
						if (li === li.parentElement.lastChild) li.parentElement.firstChild.focus();
						else li.nextElementSibling.focus();
					} else if (e.code === 'ArrowUp') {
						if (li === li.parentElement.firstChild) li.parentElement.lastChild.focus();
						else li.previousElementSibling.focus();
					} else if (e.code==='Space' || e.key==='Enter') li.click();
					return;
				}
			})
			tr.append(td1, td2, td3, td4);
			document.querySelector('#create-document__origin-branch .table-content .table-body').appendChild(tr);
		}

		const 
		active_div = document.querySelector('#create-weight__modal-container .create-document-absolute.active'),
		next_div = active_div.nextElementSibling;

		next_div.classList.remove('hidden');
		active_div.classList.add('left');
		await delay(500);

		next_div.classList.remove('right');
		await delay(500);

		if (branches.length === 1) {
			next_div.querySelector('.table-content .table-row:first-child > div:first-child').click();
			document.getElementById('create-document__select-origin-branch-btn').focus();				
		} else if (branches.length > 1) next_div.querySelector('.table-content .table-row:nth-child(1)').focus();

		active_div.classList.remove('active');
		next_div.classList.add('active');
		document.getElementById('create-document__origin-entity').classList.add('hidden');
	}
	catch(error) { error_handler('Error al seleccionar entidad.', error) }
}

//ORIGIN -> BRANCHES -> BACK TO ORIGIN BUTTON
async function create_document_back_to_entities() {

	if (clicked) return;
	prevent_double_click();

	const 
	current_div = document.getElementById('create-document__origin-branch'),
	next_div = current_div.previousElementSibling;
	next_div.classList.remove('hidden'),
	create_document_origin_list = document.querySelector('#create-document__origin-entity-list ul');
		
	mutation_observer.disconnect();
	mutation_observer = null;

	mutation_observer = new MutationObserver(() => {
		document.getElementById('create-document__select-entity__select-branch').classList.toggle('enabled');
	});
	mutation_observer.observe(create_document_origin_list, { attributes: true });

	current_div.classList.add('right');
	await delay(500);

	next_div.classList.remove('left')
	await delay(500);

	current_div.classList.remove('active');
	current_div.classList.add('hidden');
	next_div.classList.add('active');

	document.querySelectorAll('#create-document__origin-branch .table-content .table-row').forEach(tr => { tr.remove() });
	
	if (!!document.querySelector('#create-document__select-origin-branch-btn.enabled')) {
		document.querySelector('#create-document__select-origin-branch-btn').classList.toggle('enabled');
		document.querySelector('#create-document__select-origin-branch-btn').classList.toggle('disabled');
	}
	if (!!current_div.querySelector('.table-content .table-body').classList.contains('li-selected')) {
		current_div.querySelector('.table-content .table-body').classList.remove('li-selected');
	}
}

//ORIGIN -> BRANCHES -> FINISH CLIENT ENTITY AND BRANCH
async function create_document_select_client_branch() {

	const btn = this;
	if (!btn.classList.contains('enabled')) return;
	if (btn_double_clicked(btn)) return;

	const
	selected_row = document.querySelector('#create-document__origin-branch-list .table-row.selected'),
	branch_id = selected_row.getAttribute('data-suc-id'),
	doc_number = document_object.number,
	current_electronic_status = document_object.electronic;
	
	try {

		const update = await document_object.update_branch(branch_id);
		if (update) {

			document.querySelector('#create-document__header__origin-branch .widget').classList.add('saved');
			document.querySelector('#create-document__header__origin-branch .widget-data-absolute p').innerText = document_object.client.branch.name;
		
			await delay(750);
			document.querySelector('#create-document__origin-branch .header h3').innerText = '';
			document.querySelectorAll('#create-document__origin-branch-list .table-row').forEach(row => { row.remove() });

			await close_entity_modal();

			//CHANGE ELECTRONIC STATUS IF IT HAS CHANGED
			if (document_object.electronic !== current_electronic_status) 
				document.querySelector('#create-document__footer__electronic').classList.toggle('enabled');
			
			document.querySelector('#create-document__origin-branch').classList.remove('active');
			document.querySelector('#create-document__origin-branch').classList.add('right');
			document.querySelector('#create-document__origin-entity').classList.remove('left', 'hidden');
			document.querySelector('#create-document__origin-entity').classList.add('active');

			const tooltip = document.querySelector('#create-document__doc-number .widget-tooltip');

			if (document_object.existing_document){

				tooltip.querySelector('span').innerText = `Nº de documento ${doc_number} ya existe para origen.`
				fade_in(tooltip, 250, 'block');
				tooltip.classList.remove('hidden');
				//document.querySelector('#create-document__doc-number input').value = '';
				//document.querySelector('#create-document__doc-number .widget').classList.remove('saved');
				return;

			} else {

				if (!tooltip.classList.contains('hidden')) {
					await fade_out(tooltip);
					tooltip.classList.add('hidden');
				}

				if (document_object.internal.entity.id === null) 
					document.querySelector('#create-document__header__destination-entity .widget').focus();
				else 
					document.querySelector('#create-document__body__table-container .tbl-content tr:last-child .product-code input').focus();
			}

			//UPDATE PENDING WEIGHTS TABLE FOR OTHER USERS IF ITS THE FIRST DOCUMENT
			if (weight_object.documents.length === 1) {
				socket.emit('weight object first documents client entity has been updated', {
					id: weight_object.frozen.id,
					entity_name: document_object.client.entity.name
				});
			}
		}
	} catch (e) { console.log(`Error updating client branch in entity modal. Error msg: ${e}`) }
}

function widget_focus_input(that) { that.querySelector('input').focus() }

async function create_document_comments_save(e) {

	if (e.code !== 'Tab' && e.key!== 'Enter') return;
	e.preventDefault();
	
	const
	comments_parent = e.target.parentElement,
	comments = DOMPurify().sanitize(e.target.value),
	doc_id = DOMPurify().sanitize(document_object.frozen.id);

	if (comments === document_object.comments) {
		document.querySelector('#create-document__footer__back-btn .widget').focus();
		return;
	}

	//animate_on_data_saved(comments_parent);
	try {
		const
		save_comments = await fetch('/update_document_comments', {
			method: 'POST', 
			headers: { 
				"Content-Type" : "application/json",
				"Authorization" : token.value 
			}, 
			body: JSON.stringify({ comments, doc_id })
		}),
		response = await save_comments.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

		document_object.comments = comments;
		comments_parent.classList.add('saved');
	}
	catch(error) { error_handler('Error al actualizar comentarios en documento en /update_document_comments', error) }
	finally {
		if (!e.shiftKey) document.querySelector('#create-document__footer__back-btn .widget').focus();
	}
}

async function display_annul_document_message(doc_id) {

	const annul_div = document.createElement('div');
	annul_div.id = 'message-annul-weight';
	document.getElementById('message-container').appendChild(annul_div);
	annul_div.innerHTML = `
		<h3>¿ ANULAR DOCUMENTO ?</h3>
		<div class="row">
			<button id="annul-document__back-btn" class="svg-wrapper enabled red">
				<svg height="45" width="160" xmlns="http://www.w3.org/2000/svg">
					<rect class="shape" height="45" width="160"></rect>
				</svg>
				<div class="desc-container">
					<i class="fas fa-times-circle"></i>
					<p>CANCELAR</p>
				</div>
			</button>
			<button id="annul-document__accept-btn" class="svg-wrapper enabled green">
				<svg height="45" width="160" xmlns="http://www.w3.org/2000/svg">
					<rect class="shape" height="45" width="160"></rect>
				</svg>
				<div class="desc-container">
					<i class="fas fa-check-circle"></i>
					<p>ANULAR</p>
				</div>
			</button>
		</div>
	`;

	if (doc_id !== undefined) annul_div.setAttribute('data-doc-id', doc_id);

	document.querySelector('#annul-document__accept-btn').addEventListener('click', async function() {

		const btn = this;
		if (btn_double_clicked(btn)) return;

		const doc_id = (document.getElementById('message-annul-weight').hasAttribute('data-doc-id')) ?
			document.getElementById('message-annul-weight').getAttribute('data-doc-id') : document_object.frozen.id;

		await annul_document(doc_id);
	});

	document.querySelector('#annul-document__back-btn').addEventListener('click', async function() {

		const btn = this;
		if (btn_double_clicked(btn)) return;

		document.getElementById('message-section').classList.remove('active', 'centered');
		await delay(500);
		document.getElementById('message-annul-weight').remove();

	});

	document.getElementById('message-section').classList.add('centered', 'active');
}

function annul_document(doc_id) {
	return new Promise(async (resolve, reject) => {
		console.log(doc_id)
		try {

			const annul = await weight_object.annul_document(doc_id);
			if (annul) {

				//REMOVE DOCUMENT FROM TABLE IN WEIGHT WINDOW
				if (!!document.querySelector(`#weight__documents-table tr[data-doc-id="${doc_id}"]`)) {
					
					document.querySelector(`#weight__documents-table tr[data-doc-id="${doc_id}"]`).remove();

					//RESET LINE NUMBER IN TABLE
					const weight_doc_list = document.querySelectorAll('#weight__documents-table .table-body .line-number');
					for (let j = 0; j < weight_doc_list.length; j++) { weight_doc_list[j].innerText = j + 1 }
				}

				document.querySelector('#annul-document__back-btn').click();

				//ANNUL INSIDE DOCUMENT MODAL
				if (document.querySelector('#create-weight__modal').classList.contains('active')) {

					document.querySelector('#create-weight__modal').classList.remove('active');
					breadcrumbs('remove', 'weight');
					breadcrumbs('remove', 'weight');
					await delay(500);
					document_object = null;
					document.querySelector('#create-weight__modal-container').remove();	
				}

				//UPDATE PENDING WEIGHTS TABLE FOR OTHER USERS ANNULED DOCUMENT WAS THE FIRST ONE
				if (weight_object.documents.length === 0) {
					socket.emit('weight object first documents client entity has been updated', {
						id: weight_object.frozen.id,
						entity_name: '-'
					});
				}
			}
			return resolve();
		} catch(e) { console.log(`Error annulling document. ${e}`); return reject() }
	})
}

/*********************************************************************************************************************
*********************************************** DOCUMENT ROWS RELATED FUNCTIONS **************************************
**********************************************************************************************************************/

function navigate_li(e) {
	e.preventDefault();

	const
	li = e.target,
	input = li.parentElement.parentElement.querySelector('input');

	if (e.code==='ArrowDown') { 
		if (li === li.parentElement.lastChild) input.focus();
		else li.nextElementSibling.focus();
	}
	
	else if (e.code==='ArrowUp') {
		if (li === li.parentElement.firstChild) input.focus();
		else li.previousElementSibling.focus();
	}
	else if (e.code==='Space') li.click();
	return;
}

//CREATE DOCUMENT -> DELETE ROW
async function delete_document_row(e) {

	const
	row_element = e.target.parentElement.parentElement,
	row_id = parseInt(row_element.getAttribute('data-row-id')),
	row_object = await get_row_object(row_id),
	tbody = row_element.parentElement;
		
	const annul = await row_object.annul_row();

	if (annul) {

		if (row_element.parentElement.children.length === 1) {

			const inputs = row_element.querySelectorAll('input');
			inputs.forEach(input => { input.value = '' })
			row_element.querySelector('td.product-total').innerText = '';

			row_element.querySelectorAll('td:not(td:first-child)').forEach(td => { td.classList.remove('saved') });

			const cut_select = row_element.querySelector('select');
			cut_select.options[0].selected = true;

			row_element.querySelector('.product-code input').focus();
			return;
		}
		row_element.remove();
		const row_number = tbody.querySelectorAll('.row-number span');
		for (let i = 0; i < row_number.length; i++) { row_number[i].innerText = i + 1 }	
	}
}

//CREATE DOCUMENT -> ANIMATE TD WHEN SAVED SUCCESFULL
function animate_on_data_saved(element) {
	return new Promise((resolve, reject) => {
		element.classList.add('fadeout-scaledup');
		setTimeout(() => {
			element.classList.remove('fadeout-scaledup');
			resolve();
		}, 750);
	})
}

function get_row_object(id) {
	return new Promise(resolve => {
		document_object.rows.forEach(row => {
			if (row.id === id) return resolve(row);
		})	
	})
}

function navigate_document_with_arrows(e) {

	if (e.keyCode < 37 || e.keyCode > 40) return;

	const 
	td = e.target.parentElement,
	tr = td.parentElement;

	if (tr.parentElement.children.length === 1) return;
	if (!!td.querySelector('ul') && td.querySelector('ul').children.length > 0) return;

	const td_index = Array.from(tr.children).indexOf(td);

	let target_tr;
	if (e.code === 'ArrowLeft') {

		if (e.target.value.length > 0) return;
		if (td_index === 1) tr.querySelector('.container-amount input').focus();
		else if (td.classList.contains('container-code')) tr.querySelector('.product-kilos input').focus();
		else td.previousElementSibling.querySelector('input').focus();
	}
	else if (e.code === 'ArrowRight') {

		if (e.target.value.length > 0) return;
		if (td_index === tr.children.length - 1) tr.querySelector('.product-code input').focus();
		else if (td.classList.contains('product-kilos')) tr.querySelector('.container-code input').focus();
		else td.nextElementSibling.querySelector('input').focus();
	}
	else if (e.code === 'ArrowUp') {
		
		if (tr.previousElementSibling === null) target_tr = tr.parentElement.lastElementChild;
		else target_tr = tr.previousElementSibling;
		target_tr.querySelector(`td:nth-child(${td_index + 1}) input`).focus();
	}
	else if (e.code === 'ArrowDown'){

		if (tr.nextElementSibling === null) target_tr = tr.parentElement.firstElementChild;
		else target_tr = tr.nextElementSibling;
		target_tr.querySelector(`td:nth-child(${td_index + 1}) input`).focus();
	}
}
/************************************* PRODUCT CODE RELATED FUNCTIONS *************************************/

//CREATE DOCUMENT -> PRODUCT CODE -> SEARCH PRODUCT -> KEYDOWN EVENT
async function product_code_search(e) {

	if (e.code !== 'Tab' && e.key !== 'Enter') return;
	e.preventDefault();
	
	const
	product_code = e.target.value,
	el = e.target,
	row_element = el.parentElement.parentElement,
	row_id = parseInt(row_element.getAttribute('data-row-id')),
	row_object = await get_row_object(row_id);

	if (product_code === row_object.product.code || (product_code.length === 0 && row_object.product.code === null)){
		if (e.shiftKey) el.parentElement.previousElementSibling.focus();
		else el.parentElement.nextElementSibling.querySelector('input').focus();
		return;
	}

	el.parentElement.classList.remove('saved');

	try {

		const update = await row_object.update_product(product_code);
		if (update) {

			row_element.querySelector('.product-code').classList.add('saved');
			row_element.querySelector('.product-code input').value = row_object.product.code;

			row_element.querySelector('.product-name').classList.add('saved');
			row_element.querySelector('.product-name input').value = row_object.product.name;

			if (row_object.product.last_price.found) {
				row_element.querySelector('.product-price input').value = '$' + thousand_separator(row_object.product.last_price.price);
				row_element.querySelector('.product-price').classList.remove('saved');
			}

		} else {
			row_element.querySelector('.product-code').classList.remove('saved');
			row_element.querySelector('.product-name').classList.remove('saved');
			row_element.querySelector('.product-code input').value = '';
			row_element.querySelector('.product-name input').value = '';
		}

	} catch (e) { console.log(`Error updating product. Error msg: ${e}`); return }

	if (e.shiftKey) row_element.querySelector('.row-number').focus();
	else {
		if (row_element.querySelector('.product-code input').value.length === 0) row_element.querySelector('.product-name input').focus();
		else row_element.querySelector('.cut select').focus();
	}	
}

//CREATE DOCUMENT -> PRODUCT CODE -> SET PRODUCT TO NULL -> INPUT EVENT
async function product_code_set_to_null(e) {

	const
	row_element = e.target.parentElement.parentElement,
	row_id = parseInt(row_element.getAttribute('data-row-id')),
	row_object = await get_row_object(row_id);

	/*
	if (document_object.electronic) {
		e.preventDefault();
		e.target.value = row_object.product.code;
		return;
	}
	*/

	if (e.target.value.length > 0) return;
	if (row_object.product.code === null) return;

	try {
		const update = await row_object.update_product('');
		if (update) {

			row_element.querySelector('.product-code').classList.remove('saved');
			row_element.querySelector('.product-code input').value = row_object.product.code;

			row_element.querySelector('.product-name').classList.remove('saved');
			row_element.querySelector('.product-name input').value = row_object.product.name;

			if (row_object.product.last_price.found) {
				row_element.querySelector('.product-price input').value = '$' + thousand_separator(row_object.product.last_price.price);
				row_element.querySelector('.product-price').classList.remove('saved');
			}

			const td = e.target.parentElement;
			if (td.classList.contains('saved')) td.classList.remove('saved');
			if (td.nextElementSibling.classList.contains('saved')) td.nextElementSibling.classList.remove('saved');
			const ul = row_element.querySelector('.product-name ul');
			while (ul.firstChild) ul.firstChild.remove();	
		}	
	} catch (e) { console.log(`Error updating product code to ${null}. Error msg: ${e}`); return }
}

/************************************* PRODUCT NAME RELATED FUNCTIONS *************************************/

//CREATE DOCUMENT -> PRODUCT NAME -> SEARCH PRODUCT -> INPUT EVENT
async function product_name_search(e) {

	const
	el = e.target,
	ul = el.parentElement.querySelector('ul'),
	row_element = ul.parentElement.parentElement,
	row_id = parseInt(row_element.getAttribute('data-row-id')),
	row_object = await get_row_object(row_id);
	
	if (row_object.product.code === 'TRASLADO') return;

	/*
	if (document_object.electronic) {
		e.preventDefault();
		e.target.value = row_object.product.name;
		return;
	}
	*/

	while (ul.firstChild) { ul.firstChild.remove() }
	
	//SET CODE TO NOTHING
	if (el.value.length===0) {

		if (row_object.product.code !== null) {
			try {
				const update = await row_object.update_product('');
				if (update) {

					row_element.querySelector('.product-name input').value = '';
					row_element.querySelector('.product-code input').value = '';
					row_element.querySelector('.product-name').classList.remove('saved');
					row_element.querySelector('.product-code').classList.remove('saved');
				}
			}
			catch (e) { console.log(`Error setting product to ${null} in search product by name input. Error msg: ${e}`) }
		}
		return
	}

	const product = DOMPurify().sanitize(el.value);
	try {
		const
		search_name = await fetch('/search_product_by_name', {
			method: 'POST',
			headers: { 
				"Content-Type" : "application/json",
				"Authorization" : token.value 
			},
			body: JSON.stringify({ product })
		}),
		response = await search_name.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';
		
		response.products.forEach(product => {
			const li = document.createElement('li');
			li.innerText = product.name;
			li.setAttribute('data-product-code', product.code);
			li.setAttribute('data-product-type', product.type);
			li.setAttribute('tabindex', -1);
			li.setAttribute('data-navigation', true);
			li.addEventListener('keydown', navigate_li);
			ul.appendChild(li);
		});
	} catch (error) { error_handler('Error al buscar producto en /search_product_by_name.', error) }
}

//CREATE DOCUMENT -> PRODUCT NAME -> LI CLICKED
async function product_name_select_li(e) {

	if (!e.target.matches('li')) return;

	const
	li = e.target,
	product_code = li.getAttribute('data-product-code'),
	ul = li.parentElement,
	row_element = ul.parentElement.parentElement,
	row_id = parseInt(row_element.getAttribute('data-row-id')),
	row_object = await get_row_object(row_id);

	try {

		const update = await row_object.update_product(product_code);
		if (update) {

			row_element.querySelector('.product-code').classList.add('saved');
			row_element.querySelector('.product-code input').value = row_object.product.code;

			row_element.querySelector('.product-name').classList.add('saved');
			row_element.querySelector('.product-name input').value = row_object.product.name;

			const price_input = row_element.querySelector('.product-price input');
			if (row_object.product.last_price.found) {
				price_input.value = '$' + thousand_separator(row_object.product.last_price.price);
				price_input.parentElement.classList.remove('saved');
			}

			while (ul.firstChild) ul.firstChild.remove();
			animate_on_data_saved(row_element.querySelector('.product-code'));
			await animate_on_data_saved(ul.parentElement);
			
			if (li.getAttribute('data-product-type') === 'Pasas') {
				const select = row_element.querySelector('.cut select');
				select.value = 'parron';
				row_element.querySelector('.product-price input').focus();
				return;
			}
			row_element.querySelector('.cut select').focus();
		}	
	} catch (e) { console.log(`Error selecting product from list. Error msg: ${e}`) }
}

//CREATE DOCUMENT -> PRODUCT NAME -> FOCUS FROM INPUT TO LI -> KEYDOWN EVENT
function product_name_jump_to_li(e) {

	if (e.code !== 'Tab' && e.code !== 'ArrowDown' && e.code !== 'ArrowUp' && e.code !== 'Space') return;

	const ul = e.target.parentElement.querySelector('ul');
	if (ul.children.length === 0) return;

	if (e.code==='Tab') ul.innerHTML = '';
	else if (e.code==='ArrowDown') { e.preventDefault(); ul.firstChild.focus() }
	else if (e.code==='ArrowUp') { e.preventDefault(); ul.lastChild.focus() }
	return;
}

//CREATE DOCUMENT -> PRODUCT NAME -> TRASLADO CODE -> KEYDOWN EVENT
async function update_traslado_description(e) {
	
	if (e.code !== 'Tab' && e.key !== 'Enter') return;

	const
	row_element = e.target.parentElement.parentElement,
	row_id = parseInt(row_element.getAttribute('data-row-id')),
	row_object = await get_row_object(row_id);

	if (row_object.product.code !== 'TRASLADO') return;

	const td = e.target.parentElement;
	td.classList.remove('saved');
	animate_on_data_saved(td);

	try {

		const
		row_id = row_object.id,
		description = DOMPurify().sanitize(e.target.value),
		update_description = await fetch('/update_traslado_description', {
			method: 'POST',
			headers: {
				"Content-Type" : "application/json",
				"Authorization" : token.value
			},
			body: JSON.stringify({row_id, description })
		}),
		response = await update_description.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

		td.classList.add('saved');

	} catch(error) { error_handler('Error al intentar guardar descripcion del traslado.', error) }
}

const get_traslado_description = row_id => {
	return new Promise(async (resolve, reject) => {
		try {

			row_id = DOMPurify().sanitize(row_id);
			const
			get_description = await fetch('/get_traslado_description', {
				method: 'POST',
				headers: {
					"Content-Type" : "application/json",
					"Authorization" : token.value
				},
				body: JSON.stringify({ row_id })
			}),
			response = await get_description.json();

			if (response.error !== undefined) throw response.error;
			if (!response.success) throw 'Success response from server is false.';

			return resolve(response.description);

		} catch(error) { error_handler('Error al intentar obtener descripción de traslado.', error); return reject() }
	})
}

/************************************* PRODUCT CUT RELATED FUNCTIONS *************************************/

async function product_cut_select(e) {

	const 
	select = e.target,
	cut = select.options[select.selectedIndex].value,
	td = e.target.parentElement,
	row_element = td.parentElement,
	row_id = parseInt(row_element.getAttribute('data-row-id')),
	row_object = await get_row_object(row_id);

	/*
	if (document_object.electronic) {
		select.value = row_object.product.cut;
		return;
	}
	*/

	if (row_object.product.cut === cut) return;
	
	try {

		const update = await row_object.update_cut(cut);
		if (update) {
			td.classList.add('saved');
			row_element.querySelector('.product-price input').focus();
			return;
		}

		td.querySelector('select').value = 'none';

	} catch(error) { error_handler('Error al seleccionar descarte de producto.', error) }
}
/************************************* PRODUCT PRICE RELATED FUNCTIONS *************************************/

//CREATE DOCUMENT -> PRODUCT PRICE -> UPDATE PRICE -> KEYDOWN EVENT
async function product_price_update(e) {
	
	if (e.code !== 'Tab' && e.key !== 'Enter') return;
	e.preventDefault();
	
	const
	price = e.target.value.replace(/\D/gm, ''),
	td = e.target.parentElement,
	row_element = td.parentElement,
	row_id = parseInt(row_element.getAttribute('data-row-id')),
	row_object = await get_row_object(row_id);

	if (1 * price === 1 * row_object.product.price) {
		if (e.shiftKey) td.previousElementSibling.querySelector('select').focus();
		else td.nextElementSibling.querySelector('input').focus();
		return;
	}

	animate_on_data_saved(td);

	try {
		const update = await row_object.update_price(price);
		if (update) {

			if (row_object.product.price === null) {
				td.classList.remove('saved')
				td.querySelector('input').value = null;
				row_element.querySelector('.product-total').innerText = null;
			} else {
				td.classList.add('saved');
				td.querySelector('input').value = '$' + thousand_separator(row_object.product.price);
				if (row_object.product.total > 0) {
					animate_on_data_saved(row_element.querySelector('.product-total'));
					row_element.querySelector('.product-total').innerText = '$' + thousand_separator(row_object.product.total);
					row_element.querySelector('.product-total').classList.add('saved');	
				}
			}

			document.querySelector('#create-document__footer__total-document .widget-data p').innerText = `$${thousand_separator(document_object.total)}`;
			if (e.shiftKey) { row_element.querySelector('.product-name input').focus(); return }
			row_element.querySelector('.product-kilos input').focus();
		}
	} catch (e) { console.log(`Error updating price. Error msg: ${e}`); return }
}

//CREATE DOCUMENT -> PRODUCT PRICE -> SET PRICE TO NULL -> INPUT EVENT
async function product_price_set_to_null(e) {

	const
	row_element = e.target.parentElement.parentElement,
	row_id = parseInt(row_element.getAttribute('data-row-id')),
	row_object = await get_row_object(row_id);

	/*
	if (document_object.electronic) {
		e.target.value = (row_object.product.price === null) ? '' : '$' + thousand_separator(row_object.product.price);
		return;
	}
	*/

	if (e.target.value.length > 0) return;

	if (row_object.product.price !== null) {
		try {
			const update = await row_object.update_price('');
			if (update) {

				const total = row_element.querySelector('.product-total');
				total.innerText = '';
				row_element.querySelector('.product-price').classList.remove('saved');
				total.classList.remove('saved');
				document.querySelector('#create-document__footer__total-document .widget-data p').innerText = `$${thousand_separator(document_object.total)}`;
			}
		} catch (error) { console.log(`Error setting price to ${null}. Error msg: ${error}`) }	
	}
}

/************************************* PRODUCT KILOS RELATED FUNCTIONS *************************************/

//CREATE DOCUMENT -> PRODUCT KILOS -> UPDATE KILOS -> KEYDOWN EVENT
async function product_kilos_update(e) {

	if (e.code !== 'Tab' && e.key!== 'Enter') return;
	e.preventDefault();

	const
	kilos = e.target.value.replace(/[^0-9]/g, ''),
	td = e.target.parentElement,
	row_element = td.parentElement,
	row_id = parseInt(row_element.getAttribute('data-row-id')),
	row_object = await get_row_object(row_id),
	row_kilos = (weight_object.cycle.id === 1) ? row_object.product.informed_kilos : row_object.product.kilos;

	if (1 * kilos === 1 * row_kilos) {

		//CURRENT ROW ISNT FIRST AND CURRENT AND PREVIOUS PRODUCT IS THE SAME AND KILOS INPUT IS EMPTY
		const row_index = document_object.rows.indexOf(row_object);
		if (row_index > 0 && (row_object.product.code === document_object.rows[row_index - 1].product.code && document_object.rows[row_index - 1].product.code !== null) && kilos.length === 0 && !e.shiftKey) {
			average_same_product(row_object);
			return;
		}

		if (e.shiftKey) td.previousElementSibling.querySelector('input').focus();
		else td.nextElementSibling.nextElementSibling.querySelector('input').focus();
		return;
	}

	animate_on_data_saved(td);
	try {

		const update = await row_object.update_kilos(kilos);
		if (update) {

			const 
			total = row_element.querySelector('.product-total'),
			target_kilos = (weight_object.cycle.id === 1) ? row_object.product.informed_kilos : row_object.product.kilos;

			if (target_kilos === 0) {

				td.querySelector('input').value = null;
				total.innerText = null;
				total.classList.remove('saved');

			} else {

				td.classList.add('saved');
				td.querySelector('input').value = thousand_separator(target_kilos);

				if (row_object.product.total !== 0) {
					animate_on_data_saved(total);
					total.innerText = '$' + thousand_separator(row_object.product.total);
					total.classList.add('saved');
				}

			}
			document.querySelector('#create-document__footer__total-product-kilos .widget-data p').innerText = `${thousand_separator(document_object.kilos)}`;
			document.querySelector('#create-document__footer__total-document .widget-data p').innerText = `$${thousand_separator(document_object.total)}`;

			if (e.shiftKey) { td.previousElementSibling.querySelector('input').focus(); return }
			td.parentElement.querySelector('.container-code input').focus();
		}	
	} catch (e) { console.log(`Error updating kilos. Error msg: ${e}`) }
}

//CREATE DOCUMENT -> PRODUCT KILOS -> SET KILOS TO NULL -> INPUT EVENT
async function product_kilos_set_to_null(e) {

	const
	row_element = e.target.parentElement.parentElement,
	row_id = parseInt(row_element.getAttribute('data-row-id')),
	row_object = await get_row_object(row_id);

	/*
	if (document_object.electronic) {
		const kilos = (weight_object.cycle.id === 1) ? row_object.product.informed_kilos : row_object.product.kilos;
		e.target.value = (kilos === null) ? '' : thousand_separator(kilos);
		return;
	}
	*/

	const target_kilos = (weight_object.cycle.id === 1) ? row_object.informed_kilos : row_object.kilos;

	if (e.target.value.length > 0) return;
	if (target_kilos === null) return;

	try {

		const update = await row_object.update_kilos('');
		if (update) {

			e.target.parentElement.classList.remove('saved');

			const total = row_element.querySelector('.product-total');
			total.classList.remove('saved');
			total.innerText = null;

			document.querySelector('#create-document__footer__total-product-kilos .widget-data p').innerText = `${thousand_separator(document_object.kilos)}`;
			document.querySelector('#create-document__footer__total-document .widget-data p').innerText = `$${thousand_separator(document_object.total)}`;
		}
	}
	catch (e) { console.log(`Error setting kilos to ${null}. Error msg: ${e}`) }	
}

async function average_same_product(row) {
	
	const 
	rows = [],
	row_index = document_object.rows.indexOf(row);

	//ROW IF THE FIRST ONE SO GET OUT
	if (row_index === 0) return;

	let product_kilos = 0, containers = 0;
	for (let i = row_index; i >= 0; i--) {

		if (document_object.rows[i].product.code !== row.product.code || document_object.rows[i].product.cut !== row.product.cut) break;

		const kilos = (weight_object.cycle.id === 1) ? document_object.rows[i].product.informed_kilos : document_object.rows[i].product.kilos;
		product_kilos += kilos;
		rows.push(document_object.rows[i]);
		containers += document_object.rows[i].container.amount;
	}

	//PRODUCT HAS ONLY ONE ROW
	if (rows.length === 1) {
		document.querySelector(`#create-document__body__table-container tr[data-row-id="${row.id}"] .container-code input`).focus();
		return;
	}

	const 
	average = Math.floor(product_kilos / containers),
	remainder = product_kilos % containers;

	rows.reverse();

	for (let i = 0; i < rows.length - 1; i++) {

		const 
		tr = document.querySelector(`#create-document__body__table-container tr[data-row-id="${rows[i].id}"]`),
		input = tr.querySelector('.product-kilos input');

		try {
			const row_averaged_kilos = average * rows[i].container.amount;
			await rows[i].update_kilos(row_averaged_kilos);
			input.value = thousand_separator(row_averaged_kilos);
			
			tr.querySelector('.product-total').innerText = (rows[i].product.price === null) ? '' : '$' + thousand_separator(rows[i].product.price * row_averaged_kilos);
		
		} catch(error) { error_handler('Error al actualizar kilos.', error); return; }
	}

	const 
	last_tr = document.querySelector(`#create-document__body__table-container tr[data-row-id="${rows[rows.length - 1].id}"]`),
	last_input = last_tr.querySelector('.product-kilos input');

	last_input.value = (average * rows[rows.length - 1].container.amount) + remainder;
	last_input.dispatchEvent(new KeyboardEvent('keydown', { 'code': 'Tab' }));

}

/************************************* CONTAINER CODE RELATED FUNCTIONS *************************************/

//CREATE DOCUMENT -> CONTAINER CODE -> SEARCH CONTAINER -> KEYDOWN EVENT
async function container_code_search(e) {

	if (e.code !== 'Tab') return;
	e.preventDefault();

	const
	container_code = (e.target.value.length === 0) ? null : DOMPurify().sanitize(e.target.value),
	input = e.target,
	row_element = input.parentElement.parentElement,
	row_id = parseInt(row_element.getAttribute('data-row-id')),
	row_object = await get_row_object(row_id);

	if (e.shiftKey) {
		row_element.querySelector('.product-kilos input').focus();
		return;
	}

	if (container_code === row_object.container.code) {
		if (e.shiftKey) row_element.querySelector('.product-kilos input').focus();
		else row_element.querySelector('.container-name input').focus();
		return
	}

	const
	td_code = input.parentElement,
	td_name = td_code.nextElementSibling,
	td_weight = td_name.nextElementSibling;

	animate_on_data_saved(td_code);
	animate_on_data_saved(td_name);
	animate_on_data_saved(td_weight);

	try {

		const update = await row_object.update_container(container_code);
		if (update) {

			td_code.classList.add('saved');
			td_name.querySelector('input').value = row_object.container.name;
			td_name.classList.add('saved');
			td_weight.querySelector('input').value = row_object.container.weight;
			td_weight.classList.add('saved');
			if (e.shiftKey) row_element.querySelector('.product-kilos input').focus();
			else row_element.querySelector('.container-amount input').focus();
			return
		}
		
		row_element.querySelector('.container-code').classList.remove('saved')
		row_element.querySelector('.container-name').classList.remove('saved');
		row_element.querySelector('.container-weight').classList.remove('saved');
		row_element.querySelector('.container-name input').value = '';
		row_element.querySelector('.container-weight input').value = '';
		row_element.querySelector('.container-name input').focus();

	} catch(e) { console.log(`Error setting container code. Error msg: ${e}`) }
}

//CREATE DOCUMENT -> CONTAINER CODE -> SET CONTAINER NO NULL -> INPUT EVENT
async function container_code_set_to_null(e) {

	const
	row_element = e.target.parentElement.parentElement,
	row_id = parseInt(row_element.getAttribute('data-row-id')),
	row_object = await get_row_object(row_id);

	/*
	if (document_object.electronic) {
		e.target.value = row_object.container.code;
		return;
	}
	*/
	
	if (e.target.value.length > 0) return;
	if (row_object.container.code === null) return;

	try {

		const update = await row_object.update_container('');
		if (update) {
			row_element.querySelector('.container-code input').value = '';
			row_element.querySelector('.container-name input').value = '';
			row_element.querySelector('.container-weight input').value = '';
			row_element.querySelector('.container-code').classList.remove('saved');
			row_element.querySelector('.container-name').classList.remove('saved');
			row_element.querySelector('.container-weight').classList.remove('saved');
		}
	} catch (e) { console.log(`Error setting container code to ${null}. Error msg: ${e}` ) }	
}

/************************************* CONTAINER NAME RELATED FUNCTIONS *************************************/

//CREATE DOCUMENT -> CONTAINER NAME -> LI CLICKED
async function container_name_select_li(e) {

	if (!e.target.matches('li')) return;
	
	const
	li = e.target,
	code = li.getAttribute('data-container-code'),
	ul = li.parentElement,
	this_td = ul.parentElement,
	row = this_td.parentElement,
	row_id = parseInt(row.getAttribute('data-row-id')),
	row_object = await get_row_object(row_id),
	code_input = this_td.previousElementSibling.querySelector('input'),
	weight_input = this_td.nextElementSibling.querySelector('input'),
	amount_input = this_td.nextElementSibling.nextElementSibling.querySelector('input');
		
	animate_on_data_saved(this_td.previousElementSibling);
	animate_on_data_saved(this_td);
	animate_on_data_saved(this_td.nextElementSibling);

	try {
		const update = await row_object.update_container(code);
		if (update) {

			this_td.previousElementSibling.classList.add('saved');
			this_td.classList.add('saved');
			this_td.nextElementSibling.classList.add('saved');

			code_input.value = row_object.container.code;
			this_td.querySelector('input').value = row_object.container.name;
			weight_input.value = row_object.container.weight;
			while (ul.firstChild) ul.firstChild.remove();
			amount_input.focus();
		}
	} catch (e) { console.log(`Error selecting container li. ${e}`) }
}

//CREATE DOCUMENT -> CONTAINER NAME -> SEARCH CONTAINER -> INPUT EVENT
async function search_container_by_name(e) {

	const
	el = e.target,
	row_element = e.target.parentElement.parentElement,
	row_id = parseInt(row_element.getAttribute('data-row-id')),
	row_object = await get_row_object(row_id),
	ul = el.parentElement.querySelector('ul');

	/*
	if (document_object.electronic) {
		e.target.value = row_object.container.name;
		return;
	}
	*/

	while (ul.firstChild) { ul.firstChild.remove() }

	//SET CODE TO NOTHING
	if (el.value.length===0) {
				
		if (row_object.container.code !== null) {
			try {
				const update = await row_object.update_container('');
				if (update) {
					const
					code_input = row_element.querySelector('.container-code input'),
					weight_input = row_element.querySelector('.container-weight input');

					code_input.value = null;
					weight_input = null;
					code_input.parentElement.classList.remove('saved');
					el.parentElement.classList.remove('saved');
					weight_input.parentElement.classList.remove('saved');
				}
			}
			catch (e) { console.log(`Error setting container to ${null}. Error msg: ${e}`) }
			finally { return }
		}
	}

	try {
		const
		container = DOMPurify().sanitize(el.value),
		search_name = await fetch('/search_container_by_name', {
			method: 'POST',
			headers: { 
				"Content-Type" : "application/json",
				"Authorization" : token.value 
			},
			body: JSON.stringify({ container })
		}),
		response = await search_name.json();

		if (response.error !== undefined) throw response.error;
		
		response.containers.forEach(container => {
			const li = document.createElement('li');
			li.innerText = container.name;
			li.setAttribute('data-container-code', container.code);
			li.setAttribute('data-container-weight', container.weight);
			li.setAttribute('tabindex', -1);
			li.setAttribute('data-navigation', true);
			li.addEventListener('keydown', navigate_li);
			ul.appendChild(li);
		});
	} catch (error) { error_handler('Error al buscar envase en /search_container_by_name', error) }
}

//CREATE DOCUMENT -> CONTAINER NAME -> FOCUS FROM INPUT TO LI -> KEYDOWN EVENT
function container_name_jump_to_li(e) {
	if (e.code !== 'Tab' && e.code !== 'ArrowDown' && e.code !== 'ArrowUp') return;
	const ul = e.target.parentElement.querySelector('ul');
	if (ul.children.length === 0) return;
	if (e.code==='Tab') {
		while (ul.firstChild) { ul.firstChild.remove() }
		return;
	}
	else if (e.code==='ArrowDown') { e.preventDefault(); ul.firstChild.focus() }
	else if (e.code==='ArrowUp') { e.preventDefault(); ul.lastChild.focus() }
	return
}

//CREATE DOCUMENT -> CONTAINER AMOUNT -> UPDATE
async function countainer_amount_set_to_null(e) {

	const
	input = e.target,
	row_element = input.parentElement.parentElement,
	row_id = parseInt(row_element.getAttribute('data-row-id')),
	row_object = await get_row_object(row_id);

	/*
	if (document_object.electronic) {
		input.value = (row_object.container.amount === null) ? '' : thousand_separator(row_object.container.amount);
		return;
	}
	*/

	if (e.target.value.length > 0) return;

	const update = await row_object.update_container_amount('');
	if (update) {
		input.parentElement.classList.remove('saved');
	}
}

//CREATE DOCUMENT -> CONTAINER AMOUNT -> UPDATE
async function container_amount_update(e) {

	if (e.code !== 'Tab' && e.key !== 'Enter') return;
	if (e.shiftKey) return;
	e.preventDefault();

	const 
	container_amount = (e.target.value.replace(/\D/gm, '') === '') ? 0 : parseInt(e.target.value.replace(/\D/gm, '')),
	input = e.target,
	row_element = input.parentElement.parentElement,
	row_id = parseInt(row_element.getAttribute('data-row-id')),
	row_object = await get_row_object(row_id);

	if ( container_amount !== (1 * row_object.container.amount) ) {
		animate_on_data_saved(input.parentElement);
		try {

			const update = await row_object.update_container_amount(container_amount);
			if (update) {
				input.value = thousand_separator(row_object.container.amount);
				input.parentElement.classList.add('saved');
				document.querySelector('#create-document__footer__total-containers .widget-data p').innerText = `${thousand_separator(document_object.containers)}`;
			}
		}
		catch (e) { console.log(`Error updating container amount. ${e}`); return; }
	}

	if (e.shiftKey || e.key === 'Enter') return;
	
	if ((row_element.parentElement.children.length > 6 && row_element === row_element.parentElement.lastElementChild)) {
		document.getElementById('create-document__comments').focus();
		return
	}

	//IF NEXT ROW EXISTS -> MOVE TO NEXT ROW AND FOCUS ON PRODUCT CODE
	if (row_element.nextElementSibling !== null) {
		row_element.nextElementSibling.querySelector('.product-code input').focus();
		return;
	}

	//CHECKS IF ANY INPUT HAS CONTENT
	console.log('check')
	let row_with_content = false;
	console.log(row_element)
	const row_inputs = row_element.querySelectorAll('input');
	for (let i = 0; i < row_inputs.length; i++) { 
		if (row_inputs[i].value.length > 0) {
			row_with_content = true;
			break;
		}
	}

	//CREATE NEW ROW
	if (row_with_content) {

		try {	
	
			const
			document_id = document_object.frozen.id,
			create_new_row = await fetch('/create_new_document_row', {
				method: 'POST', 
				headers: { 
					"Content-Type" : "application/json",
					"Authorization" : token.value 
				}, 
				body: JSON.stringify({ document_id })
			}),
			response = await create_new_row.json();

			const new_row =  await new document_row(response.row);
			document_object.rows.push(new_row);
			create_document_create_body_row(new_row);
			row_element.nextElementSibling.querySelector('.product-code input').focus();
			return;
		} catch (error) { error_handler('Error al crear nueva fila para document.', error) }	
	}

	//LAST ROW INPUT ARE ALL EMPTY
	if (row_element.parentElement.children.length > 1) row_element.remove();
	document.querySelector('#create-document__comments').focus();		
}

function comments_textarea(e) {

	
	//if (document_object.electronic) e.target.value = document_object.comments;

	const textarea = this;
	if (textarea.value.length===0 && textarea.classList.contains('has-content')) { textarea.className = '' } 
	else if (textarea.value.length > 0 && !textarea.classList.contains('has-content')) { textarea.className = 'has-content' }
}

//CREATE DOCUMENT -> SELECT IN WIDGET
async function create_document_open_custom_select(that) {
	const ul = that.nextElementSibling;
	ul.classList.toggle('active')
}

function custom_select_navigate_li(e) {
	e.preventDefault();
	e.stopPropagation();

	if (e.code==='Space' || e.key==='Enter') e.target.nextElementSibling.querySelector('.selected-option').click();
	else if (e.code==='ArrowDown')
	return;
}

function custom_select_hover(e) {
	const div = this;
	if (e.type === 'mouseenter') {
		div.classList.add('hovered');
		return;
	}
	div.classList.remove('hovered');
}

//CREATE DOCUMENT -> SELECT LI FROM CUSTOM DROPDOWN LIST
async function select_option_from_custom_select() {

	if (btn_double_clicked(this)) return;

	//if (document_object.electronic) return;
	//PREVENT DOUBLE CLICK SHOULDNT BE HERE

	const
	select = this.parentElement.parentElement,
	ul = this.parentElement,
	target_table = select.getAttribute('data-target'),
	target_id = this.getAttribute('data-target-id'),
	selected_text = this.innerText;

	try {

		const update = await document_object.update_internal(target_id, target_table);

		if (update) {

			select.nextElementSibling.classList.add('saved');
			select.querySelector('.selected-option p').innerText = selected_text;
			
			if (target_table === 'internal-entities') select.nextElementSibling.querySelector('.widget-data-absolute p').innerText = document_object.internal.entity.name;
			else select.nextElementSibling.querySelector('.widget-data-absolute p').innerText = document_object.internal.branch.name;
			
			ul.classList.remove('active')	
		}
	}
	catch(e) { console.log(`Error selecting option from custom select. Error msg: ${e}`) }
}

async function take_weight_widget(e) {

	if (clicked) return;
	prevent_double_click();

	const modal = document.querySelector('#create-weight__modal');
	try {

		const template = await (await fetch('./templates/template-take-weight.html')).text();
		modal.innerHTML = template;

		modal.querySelector('#create-weight__take-weight_close-modal').addEventListener('click', take_weight_back_to_weight);
		modal.querySelector('#create-weight__take-weight__set-weight').addEventListener('click', take_weight_accept_btn);
		modal.querySelector('#take-weight__manual-input').addEventListener('input', (e) => {
			e.preventDefault();
			const el = e.target;
			el.value = el.value.replace(/\D/gm, '');
			if (el.classList.contains('has-content') && el.value.length === 0) el.classList.remove('has-content');
			else if (!el.classList.contains('has-content') && el.value.length > 0) el.classList.add('has-content');
		});

		modal.querySelector('#take-weight__manual-input').addEventListener('keydown', e => {
			if (e.key !== 'Enter') return;
			document.getElementById('create-weight__take-weight__set-weight').click();
		});

		document.getElementById('create-weight__take-weight__weight').classList.add(weight_object.tara_type);
		document.querySelector('#create-weight__status-container .take-weight__connection-status:nth-child(2)').classList.add(weight_object.tara_type);

		const tara_p = document.querySelector('#create-weight__status-container .take-weight__connection-status:nth-child(2) p');
		if (weight_object.tara_type==='automatica') tara_p.innerHTML = 'TARA<br>AUTOMATICA';
		else tara_p.innerHTML = 'TARA<br>MANUAL';
		
		modal.classList.add('active');

		await delay(500);
		socket.emit('open serial', jwt_decode(token.value).userId);

		document.querySelector('#take-weight__manual-input').focus();
	} catch(e) { console.log(`Error fetching Take Weight Template. ${e}`) }
}

async function take_weight_back_to_weight() {

	if (clicked) return;
	prevent_double_click();

	socket.emit('cancel-serial', 'close');
	document.querySelector('#create-weight__modal').classList.remove('active');
	await delay(500);
	document.querySelector('#create-weight__take-weight-container').remove();
}

async function take_weight_accept_btn() {
	// STATIC USER. CHANGE IT LATER!!!

	if (clicked) return;
	prevent_double_click();

	const weight_data = { 
		id: DOMPurify().sanitize(weight_object.frozen.id), 
		user: jwt_decode(token.value).userId, 
		tara_type: DOMPurify().sanitize(weight_object.tara_type), 
		process: DOMPurify().sanitize(weight_object.process),
		input_weight: DOMPurify().sanitize(document.getElementById('take-weight__manual-input').value)
	}
	socket.emit('close-serial', weight_data);
}

function save_cancel_mouse_enter(e) {
	if (e.target.id==='save-weight') e.target.parentElement.classList.add('save');
	else e.target.parentElement.classList.add('cancel');
}

function save_cancel_mouse_leave(e) {
	if (e.target.id==='save-weight') e.target.parentElement.classList.remove('save');
	else e.target.parentElement.classList.remove('cancel');
}

async function save_cancel_click() {

	if (clicked) return;
	prevent_double_click();

	const
	el = this,
	parent = el.parentElement;
	
	if (el.id === 'cancel-weight') {
		try {

			const
				weight_id = DOMPurify().sanitize(weight_object.frozen.id),
				process = DOMPurify().sanitize(weight_object.process),
				reset_weight = await fetch('/reset_weight_data', {
					method: 'POST', 
					headers: { 
						"Content-Type" : "application/json",
						"Authorization" : token.value 
					}, 
					body: JSON.stringify({ weight_id, process })
				}),
				response = await reset_weight.json();

				if (response.error !== undefined) throw response.error;
				if (!response.success) throw 'Success response from server is false.';

				let target;
				if (process === 'gross') {

					target = weight_object.gross_weight;
					document.getElementById('gross-weight__brute').innerText = '0 KG';
					document.getElementById('gross-weight__net').innerText = '0 KG';

					if (weight_object.average_weight !== null) 
						document.getElementById('gross__final-net-weight').innerText = '0 KG';	

				} else {

					target = weight_object.tare_weight;
					document.getElementById('tare-weight__brute').innerText = '0 KG';
					document.getElementById('tare-weight__net').innerText = '0 KG';

					if (weight_object.gross_weight.brute > 0) 
						document.getElementById('tare__final-net-weight').innerText = '0 KG';
				}

				target.brute = response.data.brute;
				target.date = response.data.date;
				target.status = response.data.status;
				target.type = response.data.type;
				target.user = response.data.user;

				document.getElementById('create-weight-step-2').setAttribute('data-status', target.status);
			
		} catch(error) { error_handler(`Error al cancelar datos pesaje. ${error}`) }
		return
	}

	//SAVE WEIGHT
	try {
		const update = await weight_object.save_weight();
		if (update) {
			
			document.getElementById('create-weight-step-2').setAttribute('data-status', 3);
			parent.nextElementSibling.classList.add('animate');
			
			socket.emit('gross weight updated by another user', { 
				id: weight_object.frozen.id, 
				gross_weight: weight_object.gross_weight.brute
			});

			await delay(2000);
			parent.nextElementSibling.classList.remove('animate');
			
		}
	} catch(error) { error_handler('Error al actualizar estado del pesaje en /update_weight_status', error) }	
}

async function weight_comments_update(e) {

	if (e.code !== 'Tab') return;

	const 
	comments = DOMPurify().sanitize(e.target.value),
	process = DOMPurify().sanitize(weight_object.process),
	target = (process === 'gross') ? weight_object.gross_weight : weight_object.tare_weight;

	if (comments === target.comments) return;
	e.preventDefault();
	
	const weight_id = DOMPurify().sanitize(weight_object.frozen.id);

	try {

		const
		update_comments = await fetch('/update_weight_comments', {
			method: 'POST', 
			headers: { 
				"Content-Type" : "application/json",
				"Authorization" : token.value 
			}, 
			body: JSON.stringify({ weight_id, process, comments })
		}),
		response = await update_comments.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

		target.comments = comments;

		document.getElementById('message-container').innerHTML = `
			<p style="font-weight:700">COMENTARIOS<br>ACTUALIZADOS</p>
		`;

		document.getElementById('message-section').classList.add('active');
		await delay(1750);

		document.getElementById('message-section').classList.remove('active');
		await delay(500);
		document.getElementById('message-container').innerHTML = '';

	} catch(error) { error_handler('Error al actualizar comentarios del pesaje en /update_weight_comments.', error) }
}

/****************** TARE CONTAINERS FUNCTIONS ******************/
let watch_tare_containers; //FOR WATCHING TARE CONTAINER CHANGES AFTER KILOS BREAKDOWN HAS BEEN DONE

async function tare_containers_widget(modal) {

	try {

		const template = await (await fetch('./templates/template-tare-containers.html')).text();
		modal.innerHTML = template;

		const tare_containers = weight_object.tare_containers;
		if (tare_containers.length === 0) await add_containers_create_new_line();
		else {
			const 
			table = document.querySelector('#weight__tare-containers__add-table tbody'),
			template = `
				<td class="line-number"></td>
				<td class="delete">
					<i class="fal fa-times-circle"></i>
				</td>
				<td class="code">
					<div class="input-container">
						<input type="text" class="input-effect">
						<span class="focus-border"></span>
					</div>
				</td>
				<td class="description">
					<div class="input-container">
						<input type="text" class="input-effect">
						<span class="focus-border"></span>
						<ul></ul>
					</div>
				</td>
				<td class="weight">
					<div class="input-container">
					<input type="text" class="input-effect">
					<span class="focus-border"></span>
					</div>
				</td>
				<td class="amount">
					<div class="input-container">
						<input type="text" class="input-effect">
						<span class="focus-border"></span>
					</div>
				</td>
			`;
			
			for (let i = 0; i < tare_containers.length; i++) {
				const tr = document.createElement('tr');
				tr.setAttribute('data-row-id', tare_containers[i].id);
				tr.innerHTML = template;

				tr.querySelector('.line-number').innerText = i + 1;
				tr.querySelector('.delete').addEventListener('click', add_containers_delete_row);

				tr.querySelector('.code input').value = tare_containers[i].code;
				tr.querySelector('.code input').addEventListener('keydown', add_containers_set_code);

				tr.querySelector('.description input').value = tare_containers[i].name;
				tr.querySelector('.description input').addEventListener('input', add_containers_search_by_name);

				tr.querySelector('.weight input').value = tare_containers[i].weight;
				tr.querySelector('.weight input').addEventListener('keydown', add_containers_update_weight);
				
				tr.querySelector('.amount input').value = tare_containers[i].amount;
				tr.querySelector('.amount input').addEventListener('keydown', add_containers_update_amount);
				table.appendChild(tr);
			}
		}

		modal.querySelector('#weight__tare-containers__accept-btn').addEventListener('click', add_containers_accept_btn);
		modal.querySelector('#weight__tare-containers__close').addEventListener('click', add_containers_accept_btn);

		if (weight_object.kilos_breakdown) {

			const watch = [];
			for (let i = 0; i < weight_object.tare_containers.length; i++) {
				const tci = {
					amount: weight_object.tare_containers[i].amount,
					code: weight_object.tare_containers[i].code,
					name: weight_object.tare_containers[i].name,
					weight: weight_object.tare_containers[i].weight
				}
				watch.push(tci);
			}
	
			watch_tare_containers = setInterval(async () => {
	
				if (!weight_object.kilos_breakdown) {
					clearInterval(watch_tare_containers);
					return;
				}

				//CHECK IF ROWS LENGTH IN WATCH DOESNT MATCH TARE CONTAINERS LENGTH
				if (weight_object.tare_containers.length !== watch.length) {
					await change_kilos_breakdown_status();
					clearInterval(watch_tare_containers);
					return;
				}

				//WATCH FOR CHANGES IN EVERY KEY IN OBJECT
				for (let i = 0; i < watch.length; i++) {
					
					for (let key in watch[i]) {
						if (watch[i][key] !== weight_object.tare_containers[i][key]) {

							await change_kilos_breakdown_status();
							clearInterval(watch_tare_containers);
							break;

						}
					}
				}
	
			}, 100);
		}

		modal.classList.add('active');

	} catch(error) { error_handler('Error al obtener template para envases de peso tara', error) }
}

function add_containers_create_new_line() {
	return new Promise(async (resolve, reject) => {
		try {
			const
			weight_id = weight_object.frozen.id,
			create_line = await fetch('/create_empty_containers_line', {
				method: 'POST', 
				headers: { 
					"Content-Type" : "application/json",
					"Authorization" : token.value 
				}, 
				body: JSON.stringify({ weight_id })
			}),
			response = await create_line.json();
		
			weight_object.tare_containers.push({ 
				id: response.row_id, 
				code: null, 
				name: null, 
				weight: null, 
				amount: null, 
				saved: false 
			});

			const tr = document.createElement('tr');
			document.querySelector('#weight__tare-containers__add-table tbody').appendChild(tr);
			tr.setAttribute('data-row-id', response.row_id);

			tr.innerHTML = `
				<td class="line-number">${tr.parentElement.children.length}</td>
				<td class="delete">
					<i class="fal fa-times-circle"></i>
				</td>
				<td class="code">
					<div class="input-container">
						<input type="text" class="input-effect">
						<span class="focus-border"></span>
					</div>
				</td>
				<td class="description">
					<div class="input-container">
						<input type="text" class="input-effect">
						<span class="focus-border"></span>
						<ul></ul>
					</div>
				</td>
				<td class="weight">
					<div class="input-container">
						<input type="text" class="input-effect">
						<span class="focus-border"></span>
					</div>
				</td>
				<td class="amount">
					<div class="input-container">
						<input type="text" class="input-effect">
						<span class="focus-border"></span>
					</div>
				</td>
			`;
			
			tr.querySelector('.delete').addEventListener('click', add_containers_delete_row);
			tr.querySelector('.code input').addEventListener('keydown', add_containers_set_code);
			tr.querySelector('.description input').addEventListener('input', add_containers_search_by_name);
			tr.querySelector('.weight input').addEventListener('keydown', add_containers_update_weight);
			tr.querySelector('.amount input').addEventListener('keydown', add_containers_update_amount);
			tr.querySelector('.code input').focus();

			return resolve();
		} catch(error) { error_handler('Error al crear nueva linea para envases tara.', error); return reject(error) }
	})
}

async function add_containers_delete_row() {

	if (clicked) return;
	prevent_double_click();

	const
	tr = this.parentElement,
	row_id = tr.getAttribute('data-row-id'),
	first_row = (tr.parentElement.children.length === 1) ? true : false;

	try {

		const
		delete_row = await fetch('/delete_tare_containers_row', {
			method: 'POST', 
			headers: { 
				"Content-Type" : "application/json",
				"Authorization" : token.value 
			}, 
			body: JSON.stringify({ row_id, first_row })
		}),
		response = await delete_row.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

		if (first_row) {
			weight_object.tare_containers[0].code = null;
			weight_object.tare_containers[0].name = null;
			weight_object.tare_containers[0].weight = null;
			weight_object.tare_containers[0].amount = null;

			weight_object.tare_weight.containers_weight = 0;
			
			tr.querySelectorAll('input').forEach(input => { input.value = '' });

		} else {
			const row_index = Array.from(tr.parentElement.children).indexOf(tr);
			weight_object.tare_containers.splice(row_index, 1);
			tr.remove();
		}

		
		if (!!document.querySelector('#create-weight-step-2')) {

			const table_tr = document.querySelector(`#weight__empty-containers-table tr[data-row-id="${row_id}"]`);
			if (!!table_tr) table_tr.remove();

			const td_number = document.querySelectorAll('#weight__tare-containers__add-table .tbl-content .line-number');
			for (let i = 0; i < td_number.length; i++) { td_number[i].innerText = i + 1 }

		}

	} catch(error) { error_handler('Error al eliminar fila con envases vacíos.', error) }
}

async function add_containers_set_code(e) {

	if (e.code !== 'Tab' && e.key!== 'Enter') return;
	e.preventDefault();

	const
	code = DOMPurify().sanitize(e.target.value),
	td = e.target.parentElement.parentElement,
	tr = td.parentElement,
	row_id = DOMPurify().sanitize(tr.getAttribute('data-row-id')),
	row_index = Array.from(tr.parentElement.children).indexOf(tr);

	if (code === weight_object.tare_containers[row_index].code) {
		tr.querySelector('.description input').focus();
		return;
	}

	try {

		const
		update_code = await fetch('/update_tare_container', {
			method: 'POST', 
			headers: { 
				"Content-Type" : "application/json",
				"Authorization" : token.value 
			}, 
			body: JSON.stringify({ row_id, code })
		}),
		response = await update_code.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

		weight_object.tare_containers[row_index].code = (code.length === 0) ? null : response.container.code;
		weight_object.tare_containers[row_index].weight = (code.length === 0) ? null :  response.container.weight;
		weight_object.tare_containers[row_index].name = (code.length === 0) ? null : response.container.name;

		tr.querySelector('.description input').value = response.container.name;
		tr.querySelector('.weight input').value = response.container.weight;

		const table_row = document.querySelector(`#weight__empty-containers-table .tbl-content tr[data-row-id="${row_id}"]`);
		if (table_row) {
			table_row.querySelector('.code').innerText = response.container.code;
			table_row.querySelector('.description').innerText = response.container.name;
			table_row.querySelector('.weight').innerText = response.container.weight;
		}
		
		if (response.container.code !== null && e.code === 'Tab') tr.querySelector('.amount input').focus();

	} catch(error) { error_handler('Error al buscar envase por código', error) }
}

async function add_containers_search_by_name(e) {

	const row = e.target.parentElement.parentElement.parentElement;

	if (e.target.value.length === 0) {

		const code_input = row.querySelector('.code input');
		code_input.value = '';
		code_input.dispatchEvent(new KeyboardEvent('keydown', { 'code': 'Tab' }))
		return;
	}

	const
	partial_name = DOMPurify().sanitize(e.target.value),
	ul = e.target.parentElement.querySelector('ul');

	ul.querySelectorAll('li').forEach(li => { li.remove() })

	try {

		const
		search_container = await fetch('/search_tare_container_by_name', {
			method: 'POST', 
			headers: { 
				"Content-Type" : "application/json",
				"Authorization" : token.value 
			}, 
			body: JSON.stringify({ partial_name })
		}),
		response = await search_container.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

		const containers = response.containers;
		containers.forEach(container => {
			const li = document.createElement('li');
			li.setAttribute('data-code', container.code);
			li.innerText = container.name;
			li.addEventListener('click', add_containers_select_container_from_li);
			ul.appendChild(li);
		})
	} catch(error) { error_handler('Error al buscar envase por descripción.', error) }
}

function add_containers_select_container_from_li() {

	if (clicked) return;
	prevent_double_click();

	const
	li = this,
	container_code = li.getAttribute('data-code'),
	ul = li.parentElement,
	tr = ul.parentElement.parentElement.parentElement,
	code_input = tr.querySelector('.code input');

	while (ul.firstChild) { ul.firstChild.remove() }

	code_input.value = container_code;
	code_input.dispatchEvent(new KeyboardEvent('keydown', { 'code': 'Tab' }));
}

async function add_containers_update_weight(e) {

	if (e.code !== 'Tab' && e.key!== 'Enter') return;
	if (e.shiftKey) return;

	const 
	val = e.target.value.replace(/[^0-9,]/gm, '').replace(',', '.'),
	weight = (val.length === 0) ? null : parseFloat(val),
	input = e.target,
	tr = e.target.parentElement.parentElement.parentElement,
	row_id = tr.getAttribute('data-row-id'),
	row_index = Array.from(tr.parentElement.children).indexOf(tr);

	if (weight === weight_object.tare_containers[row_index].weight) return;
	e.preventDefault();

	try {

		const
		update_weight = await fetch('/update_tare_container_weight', {
			method: 'POST', 
			headers: { 
				"Content-Type" : "application/json",
				"Authorization" : token.value 
			}, 
			body: JSON.stringify({ row_id, weight })
		}),
		response = await update_weight.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

		weight_object.tare_containers[row_index].weight = response.container_weight;
		input.value = response.container_weight;

		const table_row = document.querySelector(`#weight__empty-containers-table .tbl-content tr[data-row-id="${row_id}"]`);
		if (table_row) table_row.querySelector('.weight').innerText = response.container_weight;
		if (e.code === 'Tab') tr.querySelector('.amount input').focus();

	} catch(error) { error_handler('Error al actualizar peso de envase.', error) }
}

async function add_containers_update_amount(e) {

	if (e.code !== 'Tab' && e.key !=='Enter') return;
	if (e.shiftKey) return;

	const 
	val = e.target.value.replace(/\D/gm, ''),
	amount = (val.length === 0) ? null : parseInt(val),
	input = e.target,
	tr = e.target.parentElement.parentElement.parentElement,
	row_id = tr.getAttribute('data-row-id'),
	row_index = Array.from(tr.parentElement.children).indexOf(tr);

	e.preventDefault();

	if (amount !== weight_object.tare_containers[row_index].amount) {
		try {

			const
			update_amount = await fetch('/update_tare_container_amount', {
				method: 'POST', 
				headers: { 
					"Content-Type" : "application/json",
					"Authorization" : token.value 
				}, 
				body: JSON.stringify({ row_id, amount })
			}),
			response = await update_amount.json();
	
			if (response.error !== undefined) throw response.error;
			if (!response.success) throw 'Success response from server is false.';
	
			weight_object.tare_containers[row_index].amount = response.container_amount;
			input.value = response.container_amount;

			const table_row = document.querySelector(`#weight__empty-containers-table .tbl-content tr[data-row-id="${row_id}"]`);
			if (table_row) table_row.querySelector('.amount').innerText = response.container_amount;

			if (weight_object.kilos_breakdown) await change_kilos_breakdown_status();
				
		} catch(error) { error_handler('Error al actualizar cantidad de envases.', error) }	
	}
	
	//CREATE NEW ROW IF INPUTS ARE EMPTY
	let row_with_content = false;
	const inputs = tr.querySelectorAll('input');
	for (let i = 0; i < inputs.length; i++) {
		if (inputs[i].value.length > 0) {
			row_with_content = true;
			break;
		}
	}

	if (e.code === 'Tab') {
		if (e.shiftKey) tr.querySelector('.weight input').focus();
		else {
			if (tr.nextElementSibling === null) {
				if (row_with_content) await add_containers_create_new_line();
				else document.getElementById('weight__tare-containers__accept-btn').focus();
			} else tr.nextElementSibling.querySelector('.code input').focus();
		}
	} else if (e.key === 'Enter' && tr.nextElementSibling === null) document.getElementById('weight__tare-containers__accept-btn').focus();
}

function create_tare_containers_body_row() {

	const 
	table = document.querySelector('#weight__empty-containers-table tbody'),
	tare_containers = weight_object.tare_containers;

	for (let i = 0; i < tare_containers.length; i++) {

		if (document.querySelector(`#weight__empty-containers-table tr[data-row-id="${tare_containers[i].id}"]`)) {

			const tr = document.querySelector(`#weight__empty-containers-table tr[data-row-id="${tare_containers[i].id}"]`);
			tr.querySelector('.code').innerText = tare_containers[i].code;
			tr.querySelector('.description').innerText = tare_containers[i].name;
			tr.querySelector('.weight').innerText = tare_containers[i].weight + ' KG';
			tr.querySelector('.amount').innerText = tare_containers[i].amount = thousand_separator(1 * tare_containers[i].amount);

		} else {

			if (tare_containers[i].amount * 1 !== 0 || tare_containers[i].code !== null || tare_containers[i].name !== null || tare_containers[i].weight * 1 !== 0) {
				
				const 
				tr = document.createElement('tr'),
				code = (tare_containers[i].code === null) ? '' : tare_containers[i].code,
				name = (tare_containers[i].name === null) ? '' : tare_containers[i].name,
				weight = (tare_containers[i].weight === null) ? '' : tare_containers[i].weight + ' KG',
				amount = (tare_containers[i].amount === null) ? '' : thousand_separator(tare_containers[i].amount);

				tr.setAttribute('data-row-id', tare_containers[i].id);
				tr.innerHTML = `
					<td class="line-number">${i + 1}</td>
					<td class="delete"><i class="fas fa-times-circle"></i></td>
					<td class="code">${code}</td>
					<td class="description">${name}</td>
					<td class="weight">${weight}</td>
					<td class="amount">${amount}</td>
				`;

				table.appendChild(tr);
				tare_containers[i].saved = true;

			}
		}
	}
}

async function add_containers_accept_btn() {

	if (clicked) return;
	prevent_double_click();

	const weight_id = weight_object.frozen.id;

	try {

		const
		get_totals = await fetch('/get_tare_containers_totals', {
			method: 'POST', 
			headers: { 
				"Content-Type" : "application/json",
				"Authorization" : token.value 
			}, 
			body: JSON.stringify({ weight_id })
		}),
		response = await get_totals.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

		clearInterval(watch_tare_containers);

		weight_object.tare_weight.containers_weight = response.totals.tare_containers;
		weight_object.tare_weight.net = response.totals.tare_net;
		weight_object.final_net_weight = response.totals.final_net_weight;

		//REMOVE RECYCLED ROWS FROM TARE CONTAINERS
		response.recycled_rows_ids.forEach(id => {
			for (let i = 0; i < weight_object.tare_containers.length; i++) {
				if (id === weight_object.tare_containers[i].id) {
					
					weight_object.tare_containers.splice(i, 1);
					const tare_containers_tr = document.querySelector(`#weight__empty-containers-table tr[data-row-id="${id}"]`);
					if (!!tare_containers_tr) tare_containers_tr.remove();
					
				}
			}
		});

		if (response.kilos_breakdown !== undefined) {
			weight_object.kilos_breakdown = false;
			weight_object.breakdown = null;
		}

		//EXIT WHEN CREATING WEIGHT
		if (!!document.querySelector('#create-weight-step-2')) {

			create_tare_containers_body_row();

			document.getElementById('tare-weight__containers').innerText = thousand_separator(weight_object.tare_weight.containers_weight) + ' KG';
			document.getElementById('tare-weight__net').innerText = thousand_separator(weight_object.tare_weight.net) + ' KG';
			document.getElementById('tare__final-net-weight').innerText = thousand_separator(weight_object.final_net_weight) + ' KG';
			document.getElementById('gross__final-net-weight').innerText = thousand_separator(weight_object.final_net_weight) + ' KG';

			const modal = document.getElementById('create-weight__modal');
			modal.classList.remove('active');

		}

		else if (!!document.querySelector('#finished-weight__documents_modal')) {

			const modal = document.getElementById('finished-weight__documents_modal');

			document.querySelector('#finished-weight__modal__net-weight p').innerText = thousand_separator(weight_object.final_net_weight) + ' KG';
			document.querySelector('#finished-weight__modal__weight-kilos tbody tr:last-child .containers').innerText = thousand_separator(weight_object.tare_weight.containers_weight) + ' KG';
			document.querySelector('#finished-weight__modal__weight-kilos tbody tr:last-child .net').innerText = thousand_separator(weight_object.tare_weight.net);

			modal.classList.remove('active');
			document.getElementById('finished-weight__modal-container').classList.add('active');
			await delay(200);
			modal.remove();

			if (weight_object.status === 'T' && !weight_object.kilos_breakdown) {
				document.querySelector('#finished-weight__kilos_breakdown .widget-tooltip').classList.add('red');
				document.querySelector('#finished-weight__kilos_breakdown .widget-tooltip span').innerText = "DESGLOCE PENDIENTE";
			}
		}

	} catch(error) { error_handler('Error al obtener total de envases vacíos.', error) }
}

async function tare_containers_delete(e) {

	const btn = this;
	if (btn_double_clicked(btn)) return;

	if (e.target.matches('td') && e.target.className !== 'delete') {
		document.querySelector('#weight__add-containers-btn').click();
		return;
	}

	const
	tr = e.target.parentElement.parentElement,
	row_id = DOMPurify().sanitize(tr.getAttribute('data-row-id')),
	first_row = false;

	try {

		const
		delete_row = await fetch('/delete_tare_containers_row', {
			method: 'POST', 
			headers: { 
				"Content-Type" : "application/json",
				"Authorization" : token.value 
			}, 
			body: JSON.stringify({ row_id, first_row })
		}),
		response = await delete_row.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

		weight_object.tare_weight.containers_weight = response.totals.tare_containers;
		weight_object.tare_weight.net = response.totals.tare_net;
		weight_object.final_net_weight = response.totals.final_net_weight;

		const row_index = Array.from(tr.parentElement.children).indexOf(tr);
		weight_object.tare_containers.splice(row_index, 1);
		tr.remove();

		document.getElementById('tare-weight__containers').innerText = thousand_separator(weight_object.tare_weight.containers_weight) + ' KG';
		document.getElementById('tare-weight__net').innerText = thousand_separator(weight_object.tare_weight.net) + ' KG';
		document.getElementById('tare__final-net-weight').innerText = thousand_separator(weight_object.final_net_weight) + ' KG';
		document.getElementById('gross__final-net-weight').innerText = thousand_separator(weight_object.final_net_weight) + ' KG';

		const rows = document.querySelectorAll('#weight__empty-containers-table tbody .line-number');
		for (let i = 0; i < rows.length; i++) { rows[i].innerText = i + 1 }

	} catch(error) { error_handler('Error al eliminar fila con envases vacíos.', error) }
}

async function annul_weight_widget() {
	
	if (clicked) return;
	prevent_double_click();

	if (!!document.getElementById('message-annul-weight')) return;

	const annul_div = document.createElement('div');
	annul_div.id = 'message-annul-weight';
	document.getElementById('message-container').appendChild(annul_div);
	annul_div.innerHTML = `
		<h3>¿ ANULAR PESAJE ?</h3>
		<div class="row">
			<button id="annul-weight__back-btn" class="svg-wrapper enabled red">
				<svg height="45" width="160" xmlns="http://www.w3.org/2000/svg">
					<rect class="shape" height="45" width="160"></rect>
				</svg>
				<div class="desc-container">
					<i class="fas fa-times-circle"></i>
					<p>CANCELAR</p>
				</div>
			</button>
			<button id="annul-weight__accept-btn" class="svg-wrapper enabled green">
				<svg height="45" width="160" xmlns="http://www.w3.org/2000/svg">
					<rect class="shape" height="45" width="160"></rect>
				</svg>
				<div class="desc-container">
					<i class="fas fa-check-circle"></i>
					<p>ANULAR</p>
				</div>
			</button>
		</div>`
	;

	document.querySelector('#annul-weight__accept-btn').addEventListener('click', annul_weight);
	document.querySelector('#annul-weight__back-btn').addEventListener('click', async () => {
		document.getElementById('message-section').classList.remove('active', 'centered');
		await delay(500);
		document.getElementById('message-annul-weight').remove();
	});
	document.getElementById('message-section').classList.add('centered', 'active');
	await delay(500);
}

async function annul_weight() {

	try {
		const
		weight_id = DOMPurify().sanitize(weight_object.frozen.id),
		delete_weight = await fetch('/annul_weight', {
			method: 'POST', 
			headers: { 
				"Content-Type" : "application/json",
				"Authorization" : token.value 
			}, 
			body: JSON.stringify({ weight_id })
		}),
		response = await delete_weight.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

		socket.emit('weight status changed', weight_id);

		document.querySelectorAll('#pending-weights-table tbody tr').forEach(tr => { tr.remove() });
		create_pending_weights_tr(response.pending_weights);

		weight_object = null;
		fade_animation(document.getElementById('create-weight__container'), document.getElementById('weight-menu'));
		await delay(750);		
		document.getElementById('create-weight-step-2').remove();
		//document.getElementById('message-container').firstElementChild.remove();
		//document.getElementById('message-section').classList.remove('active', 'centered');

		while (document.getElementById('weight__breadcrumb').children.length > 1) { document.getElementById('weight__breadcrumb').lastElementChild.remove() }

		document.getElementById('create-weight-step-1').classList.remove('hidden');

	} catch(error) { error_handler('Error al eliminar pesaje', error) }
}

async function finalize_weight_widget() {
	
	if (clicked) return;
	prevent_double_click();

	if (weight_object.documents.length > 0) {

		let weight_with_products = false;
		weight_object.documents.forEach(document => {
			if (!weight_with_products) {
				for (let i = 0; i < document.rows.length; i++) {
					if (document.rows[i].product.code !== null) {
						weight_with_products = true;
						break;
					}
				}	
			}
		});
		
		//KILOS BREAKDOWN HASN'T BEEN DONE
		if (weight_with_products && !weight_object.kilos_breakdown) {
			const tooltip = document.querySelector('#new-weight__widget__kilos-breakdown__tooltip');
			tooltip.firstElementChild.innerText = 'Desgloce de kilos pendiente';	
			
			fade_in(tooltip);
			tooltip.classList.remove('hidden');
			
			await delay(4500);

			await fade_out(tooltip);
			tooltip.classList.add('hidden');
		}
		else if (weight_object.driver.id === null) {

			error_handler('Pesaje sin chofer.', 'Para poder finalizar el pesaje este debe tener un chofer asignado')

		}
		else finalize_weight_message();
	}
	else {
		if (weight_object.driver.id === null)
			error_handler('Pesaje sin chofer.', 'Para poder finalizar el pesaje este debe tener un chofer asignado.')
		else
			finalize_weight_message();
	}

	await delay(500);
}

async function documents_kilos_breadown(modal) {

	const tooltip = document.querySelector('#new-weight__widget__kilos-breakdown__tooltip');
	if (weight_object.gross_weight.status < 3 || weight_object.tare_weight.status < 3 || weight_object.documents.length === 0) {

		let tooltiptext;
		if (weight_object.documents.length === 0) tooltiptext = 'Pesaje sin documentos';
		else tooltiptext = (weight_object.gross_weight.status < 3) ? 'Peso Bruto vacío' : 'Peso Tara vacío';
		
		tooltip.firstElementChild.innerText = tooltiptext;
		fade_in(tooltip);
		tooltip.classList.remove('hidden');
		
		await delay(4500);

		await fade_out(tooltip);
		tooltip.classList.add('hidden');
		return;
	}

	const weight_id = weight_object.frozen.id;
	try {

		const
		get_kilos_for_breakdown = await fetch('/kilos_breakdown', {
			method: 'POST', 
			headers: { 
				"Content-Type" : "application/json",
				"Authorization" : token.value 
			}, 
			body: JSON.stringify({ weight_id })
		}),
		response = await get_kilos_for_breakdown.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

		const template = await (await fetch('./templates/template-kilos-breakdown.html')).text();

		weight_object.breakdown = response.breakdown;
		modal.innerHTML = template;
		document.getElementById('kilos-breakdown').setAttribute('data-cycle', weight_object.cycle.id);

		let kilos_informed = true; //to check if all doc kilos have value different to NULL or 0
		weight_object.breakdown.docs.forEach(doc => {

			const table_container = document.createElement('div');
			document.querySelector('#kilos-breakdown .body').appendChild(table_container);
			table_container.className = 'table-container';
			table_container.setAttribute('data-doc-id', doc.id);
			table_container.innerHTML = `
				<div class="header-data"><h4></h4><div class="separator"><i class="fas fa-chevron-right"></i></div><h4></h4><div class="separator"><i class="fas fa-chevron-right"></i></div><h4></h4></div>
				<div class="table-header">
					<table>
						<thead>
							<tr><th class="line-number">Nº</th>
							<th class="container">ENVASE</th>
							<th class="container-amount">CANTIDAD</th>
							<th class="product">PRODUCTO</th>
							<th class="informed">KG DOC.</th>
							<th class="difference">DIF.</th>
							<th class="breakdown">KG REAL</th>
						</tr></thead>
					</table>
				</div>
				<div class="table-body"><table><tbody></tbody></table></div>`
			;

			const doc_number = (doc.number === null) ? null : thousand_separator(doc.number);

			table_container.querySelector('.header-data h4:first-child').innerText = doc.entity.name;
			table_container.querySelector('.header-data h4:nth-child(3)').innerText = `SUCURSAL : ${doc.branch.name}`;
			table_container.querySelector('.header-data h4:last-child').innerText = `DOC : ${doc_number}`;

			doc.rows.forEach(row => {

				const tr = document.createElement('tr');
				tr.setAttribute('data-row-id', row.id);
				table_container.querySelector('tbody').appendChild(tr);
				tr.innerHTML = `
					<td class="line-number"></td>
					<td class="container"></td>
					<td class="container-amount"></td>
					<td class="product"></td>
					<td class="informed"></td>
					<td class="difference">-</td>
					<td class="breakdown">
						<div class="breakdown-container">
							<input spellcheck="false" type="text" class="input-effect">
							<span class="focus-border"></span>
						</div>
					</td>`
				;
				tr.querySelector('.line-number').innerText = tr.parentElement.children.length;
				tr.querySelector('.container').innerText = row.container.name;
				tr.querySelector('.container-amount').innerText = row.container.amount;
				tr.querySelector('.product').innerText = row.product.name;

				let doc_kilos, input_kilos;
				if (weight_object.cycle.id === 1) {
					doc_kilos = row.product.informed_kilos;
					input_kilos = row.product.kilos;
					row.product.new_kilos += row.product.kilos;
				}
				else {
					doc_kilos = row.product.kilos;
					input_kilos = row.product.informed_kilos;
					row.product.new_kilos += row.product.informed_kilos;
				}
				
				//to check if average by informed will be available
				if (kilos_informed && doc_kilos * 1 === 0) kilos_informed = false;

				tr.querySelector('.breakdown input').setAttribute('data-amount', input_kilos);
				if (input_kilos !== null) {
					tr.querySelector('.difference').innerText = thousand_separator(input_kilos - doc_kilos);
					input_kilos = thousand_separator(input_kilos);
				}

				if (doc_kilos === null) doc_kilos = 0;
				tr.querySelector('.informed').innerText = thousand_separator(doc_kilos);
				tr.querySelector('.breakdown input').value = input_kilos;

				tr.querySelector('.breakdown input').addEventListener('input', e => {
					const val = e.target.value.replace(/[^0-9]/gm, '');
					e.target.value = thousand_separator(val);
				});
				tr.querySelector('.breakdown input').addEventListener('keydown', e => {
					if (e.code !== 'Tab' && e.key !== 'Enter' && e.code !== 'ArrowUp' && e.code !== 'ArrowDown') return;
					
					const
					row = e.target.parentElement.parentElement.parentElement,
					table_container = row.parentElement.parentElement.parentElement.parentElement;

					if (e.code === 'ArrowUp') {
						if (row.previousElementSibling === null) {

							if (table_container.previousElementSibling === null) 
								table_container.parentElement.querySelector('.table-container:last-child tbody tr:last-child .breakdown input').focus();
							else table_container.previousElementSibling.querySelector('tbody tr:last-child .breakdown input').focus();
						}
						else row.previousElementSibling.querySelector('.breakdown input').focus();
						return;
					}
					else if (e.code === 'ArrowDown') {
						if (row.nextElementSibling === null) {
							if (table_container.nextElementSibling === null)
								table_container.parentElement.querySelector('.table-container:first-child tbody tr:first-child .breakdown input').focus();
							else table_container.nextElementSibling.querySelector('tbody tr:first-child .breakdown input').focus();
						}
						else row.nextElementSibling.querySelector('.breakdown input').focus();
						return;
					}

					const
					input = e.target, 
					original_value = parseInt(input.getAttribute('data-amount')),
					new_value = input.value.replace(/[^0-9]/gm, ''),
					updated = (new_value === '') ? 0 : parseInt(new_value);
					 
					if (original_value !== new_value && weight_object.kilos_breakdown) weight_object.kilos_breakdown = false;

					if (original_value === updated) return;

					const
					row_id = parseInt(row.getAttribute('data-row-id')),
					doc_id = parseInt(table_container.getAttribute('data-doc-id'));

					let row_difference;
					weight_object.breakdown.docs.forEach(doc => {
						if (doc.id === doc_id) {
							doc.rows.forEach(row => {
								if (row.id === row_id) {
									row.product.new_kilos = updated;
									let row_kilos;
									if (weight_object.cycle.id === 1) row_kilos = row.product.informed_kilos;
									else row_kilos = row.product.kilos;
									row_difference = updated - row_kilos;
								}
							})
						}
					})

					row.querySelector('.difference').innerText = thousand_separator(row_difference);
					input.setAttribute('data-amount', updated);

					let check_total = 0;
					weight_object.breakdown.docs.forEach(doc => { doc.rows.forEach(row => { check_total += row.product.new_kilos }) });
					document.querySelector('#kilos-breakdown__total-difference .widget-button p').innerHTML = `${thousand_separator(check_total - weight_object.final_net_weight)} KILOS<br>DIFERENCIA`;

					if (check_total - weight_object.final_net_weight === 0) animate_on_data_saved(document.getElementById('kilos-breakdown__total-difference'));
				});
			})
		});

		let check_total = 0;
		weight_object.breakdown.docs.forEach(doc => { doc.rows.forEach(row => { check_total += row.product.new_kilos }) });

		const total_kilos = (weight_object.cycle.id === 1) ? weight_object.breakdown.kilos : weight_object.breakdown.informed_kilos;

		document.querySelector('#kilos-breakdown__final-net-weight .widget-button p').innerHTML = `NETO PESAJE<br>${thousand_separator(weight_object.final_net_weight)} KG`
		document.querySelector('#kilos-breakdown__total-difference .widget-button p').innerHTML = `${thousand_separator(weight_object.final_net_weight - total_kilos)} KILOS<br>DIFERENCIA`;
		
		document.getElementById('kilos-breakdown__average-by-bins-amount').addEventListener('click', kilos_breakdown_average_by_bins);
		document.getElementById('kilos-breakdown__average-by-kilos-informed').addEventListener('click', kilos_breakdown_average_by_kg_informed);
		document.getElementById('kilos-breakdown__upload-data').addEventListener('click', upload_kilos_breakdown);
		document.getElementById('close-kilos-breakdown-container').addEventListener('click', close_kilos_breakdown);
		
		if (!kilos_informed) 
			document.querySelector('#kilos-breakdown__average-by-kilos-informed .widget').classList.add('disabled');
		
		modal.classList.add('active');

	} catch(error) { error_handler('Error al hacer desgloce de kilos de pesaje', error) }
}

function kilos_breakdown_average_by_bins() {

	const 
	cycle = weight_object.cycle.id,
	kilos = weight_object.final_net_weight,
	containers = weight_object.breakdown.containers;

	//SUM ROWS LENGTH OF ALL DOCUMENTS AND CHECKS IF THERE ARE KILOS IN EACH ROW
	let total_rows = 0, kilos_informed = false;
	weight_object.breakdown.docs.forEach(doc => { 
		total_rows += doc.rows.length;
		doc.rows.forEach(row => {
			if (!kilos_informed) {
				if ((row.product.kilos * 1) > 0 || (row.product.informed_kilos * 1) > 0) kilos_informed = true;
			}
		})
	});

	const
	average = Math.floor(kilos / containers),
	remainder = kilos - (average * containers);

	let new_kilos_total = 0;
	weight_object.breakdown.docs.forEach(doc => {
		doc.rows.forEach(row => {

			let row_kilos;
			if (cycle === 1) row_kilos = 1 * row.product.informed_kilos;
			else row_kilos = 1 * row.product.kilos;

			let new_kilos;
			if (row_kilos === 0) new_kilos = (row.container.amount * average) + Math.ceil(remainder / total_rows);
			else {
				const percentage = row_kilos / kilos;
				new_kilos = (row.container.amount * average) + Math.ceil(remainder * percentage);
			}

			row.product.new_kilos = new_kilos;
			new_kilos_total += new_kilos;
			document.querySelector(`#kilos-breakdown .table-container[data-doc-id="${doc.id}"] tr[data-row-id="${row.id}"] .breakdown input`).value = thousand_separator(new_kilos);
			

			//NULL OR 0 FOR BOTH KILOS FIELDS IN ROW
			if (row.product.kilos * 1 === 0 && row.product.informed_kilos * 1 === 0) {
				document.querySelector(`#kilos-breakdown .table-container[data-doc-id="${doc.id}"] tr[data-row-id="${row.id}"] .difference`).innerText = 0;
				document.querySelector(`#kilos-breakdown .table-container[data-doc-id="${doc.id}"] tr[data-row-id="${row.id}"] .informed`).innerText = thousand_separator(new_kilos);				
			}
			else {
				document.querySelector(`#kilos-breakdown .table-container[data-doc-id="${doc.id}"] tr[data-row-id="${row.id}"] .difference`).innerText = thousand_separator(new_kilos - row_kilos);
			}
		});
	});

	//CHECK DIFFERENCE AND ADD IT TO LAST ROW --- BEGIN ---
	const
	difference = kilos - new_kilos_total,
	last_doc = weight_object.breakdown.docs[weight_object.breakdown.docs.length - 1],
	last_row = last_doc.rows[last_doc.rows.length - 1];

	let last_row_kilos;
	if (cycle === 1) last_row_kilos = last_row.product.informed_kilos;
	else last_row_kilos = last_row.product.kilos;

	last_row.product.new_kilos += difference;
	document.querySelector(`#kilos-breakdown tbody tr[data-row-id="${last_row.id}"] .breakdown input`).value = thousand_separator(last_row.product.new_kilos);
	
	//NULL OR 0 FOR BOTH KILOS FIELDS IN ROW
	if (last_row.product.kilos * 1 === 0 && last_row.product.informed_kilos * 1 === 0) {
		document.querySelector(`#kilos-breakdown tbody tr[data-row-id="${last_row.id}"] .difference`).innerText = 0;
		document.querySelector(`#kilos-breakdown tbody tr[data-row-id="${last_row.id}"] .informed`).innerText = thousand_separator(last_row.product.new_kilos);
	}
	else {
		document.querySelector(`#kilos-breakdown tbody tr[data-row-id="${last_row.id}"] .difference`).innerText = thousand_separator(last_row.product.new_kilos - last_row_kilos);
	}
	//CHECK DIFFERENCE AND ADD IT TO LAST ROW --- END ---

	let check_total = 0;
	weight_object.breakdown.docs.forEach(doc => { doc.rows.forEach(row => check_total += row.product.new_kilos) });
	document.querySelector('#kilos-breakdown__total-difference .widget-button p').innerHTML = `${thousand_separator(check_total - kilos)} KILOS<br>DIFERENCIA`;

	if ((check_total - kilos === 0)) animate_on_data_saved(document.getElementById('kilos-breakdown__total-difference'));
}

function kilos_breakdown_average_by_kg_informed() {

	if (this.querySelector('.widget').classList.contains('disabled')) return;

	const cycle = weight_object.cycle.id;

	let allowed = true;
	weight_object.breakdown.docs.forEach(doc => {
		if (allowed) {
			doc.rows.forEach(row => {
				if (allowed) {
					let kilos;
					if (cycle === 1) kilos = row.product.informed_kilos;
					else kilos = row.product.kilos;
					if (kilos === null || kilos === 0) allowed = false;
				}
			})	
		}
	});
	if (!allowed) return; //DISPLAY MESSAGE -> NOT ALL ROWS HAVE INFORMED KILOS AND ALL THE CODE BELOW DOESNT WORK

	let net_weight;
	if (cycle === 1) net_weight = weight_object.kilos.informed;
	else net_weight = weight_object.kilos.internal;

	const largest = { value: 0 };
	let new_net_weight = 0;
	weight_object.breakdown.docs.forEach(doc => {
		doc.rows.forEach(row => {

			let row_kilos;
			if (cycle === 1) row_kilos = row.product.informed_kilos;
			else row_kilos = row.product.kilos;

			const
			percentage = row_kilos / net_weight,
			new_kilos = Math.floor(percentage * weight_object.final_net_weight),
			row_difference = new_kilos - row_kilos;
			
			if (new_kilos > largest.value) {
				largest.value = new_kilos;
				largest.doc = doc.id;
				largest.row = row.id
				largest.new_kilos = new_kilos;
				largest.row_kilos = row_kilos;
			}

			row.product.new_kilos = new_kilos;
			new_net_weight += new_kilos;
			document.querySelector(`#kilos-breakdown .table-container[data-doc-id="${doc.id}"] tr[data-row-id="${row.id}"] .breakdown input`).value = thousand_separator(new_kilos);
			document.querySelector(`#kilos-breakdown .table-container[data-doc-id="${doc.id}"] tr[data-row-id="${row.id}"] .difference`).innerText = thousand_separator(row_difference);
		})
	});

	const difference = weight_object.final_net_weight - new_net_weight;
	weight_object.breakdown.docs.forEach(doc => {
		if (doc.id === largest.doc) {
			doc.rows.forEach(row => {
				if (row.id === largest.row) {
					row.product.new_kilos += difference;
					largest.new_kilos += difference;
				}
			})
		}
	})

	document.querySelector(`#kilos-breakdown .table-container[data-doc-id="${largest.doc}"] tr[data-row-id="${largest.row}"] .breakdown input`).value = thousand_separator(largest.new_kilos);
	document.querySelector(`#kilos-breakdown .table-container[data-doc-id="${largest.doc}"] tr[data-row-id="${largest.row}"] .difference`).innerText = thousand_separator(largest.new_kilos - largest.row_kilos);

	let check_total = 0;
	weight_object.breakdown.docs.forEach(doc => { doc.rows.forEach(row => { check_total += row.product.new_kilos }) })
	document.querySelector('#kilos-breakdown__total-difference .widget-button p').innerHTML = `${thousand_separator(check_total - weight_object.final_net_weight)} KILOS<br>DIFERENCIA`;
	if (check_total - weight_object.final_net_weight ===0 ) animate_on_data_saved(document.getElementById('kilos-breakdown__total-difference'));
}

async function upload_kilos_breakdown() {

	const btn = this;
	if (btn_double_clicked(btn)) return;
	if (btn.querySelector('.widget').classList.contains('disabled')) return;

	let breakdown_total = 0, rows = [], kilos_informed = false;
	weight_object.breakdown.docs.forEach(doc => { 
		doc.rows.forEach(row => { 
			breakdown_total += row.product.new_kilos;
			let upload_row = row;
			upload_row.doc_id = doc.id;
			rows.push(upload_row);
			if (!kilos_informed) {
				if ((row.product.kilos * 1) > 0 || (row.product.informed_kilos * 1) > 0) kilos_informed = true;
			}
		});
	});

	//GET OUT IF EVERY SINGLE KILO IS NOT ACCOUNTED FOR IN BREAKDOWN
	if (breakdown_total !== weight_object.final_net_weight) {
		const tooltip = btn.querySelector('.widget-tooltip')
		fade_in(tooltip);
		tooltip.classList.remove('hidden');

		await delay(5000)

		await fade_out(tooltip);
		tooltip.classList.add('hidden');
		
		return;
	}

	const weight_id = weight_object.frozen.id;
	try {
		
		const 
		save_breakdown = await fetch('/save_kilos_breakdown', {
			method: 'POST', 
			headers: { 
				"Content-Type" : "application/json",
				"Authorization" : token.value 
			}, 
			body: JSON.stringify({ weight_id, rows, kilos_informed })
		}),
		response = await save_breakdown.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

		weight_object.kilos.informed = response.informed_kilos;
		weight_object.kilos.internal = response.kilos;

		//REPLACE DOC WITH UPDATE DOCUMENT FROM SERVER
		weight_object.documents = [];
		response.documents.forEach(doc => {
			const new_doc = new create_document_object(doc);
			doc.rows.forEach(row => {
				new_doc.rows.push(new document_row(row));
			})
			weight_object.documents.push(new_doc);
		});
		weight_object.kilos_breakdown = true;

		if (!!document.querySelector('#create-weight-step-2')) {

			weight_object.documents.forEach(doc => {
				const tr = document.querySelector(`#weight__documents-table tbody tr[data-doc-id="${doc.frozen.id}"]`);
				tr.querySelector('.kilos').innerText = thousand_separator(1 * doc.kilos);;
				tr.querySelector('.total').innerText = '$' + thousand_separator(1 * doc.total);
			});

		}

		else if (!!document.querySelector('#finished-weight__modal-container')) {

			if (document.querySelector('#finished-weight__kilos_breakdown .widget-tooltip').classList.contains('red')) {
				document.querySelector('#finished-weight__kilos_breakdown .widget-tooltip').classList.remove('red');
				document.querySelector('#finished-weight__kilos_breakdown .widget-tooltip span').innerText = 'DESGLOCE DE KILOS';
			}
		}

		close_kilos_breakdown();
		await delay(750);
	
		if (!!document.querySelector('#create-weight-step-2')) print_weight_message();
		
	} catch(error) { error_handler('Error al guardar datos de desgloce.', error) }	
}

async function close_kilos_breakdown() {
 
	if (clicked) return;
	prevent_double_click();

	let modal, close_btn;

	//EXITING WHEN CREATING WEIGHT
	if (!!document.querySelector('#create-weight-step-2')) {

		document.getElementById('create-weight__modal').classList.remove('active');
		await delay(550);
		
		modal = document.getElementById('create-weight__modal');
	}

	//EXITING ON FINISHED WEIGHTS
	else if (!!document.querySelector('#finished-weight__modal')) {

		weight_object.documents.forEach(doc => {
			doc.rows.forEach(row => {
				const tr = document.querySelector(`#finished-weight__modal__documents-container tr[data-row-id="${row.id}"]`);
				tr.querySelector('.kilos').innerText = (row.product.kilos === null) ? '-' :  thousand_separator(row.product.kilos) + ' KG';
				tr.querySelector('.kilos-informed').innerText = (row.product.informed_kilos === null) ? '-' : thousand_separator(row.product.informed_kilos) + ' KG';
			})
		})

		document.getElementById('finished-weight__documents_modal').classList.remove('active');
		document.getElementById('finished-weight__modal-container').classList.add('active');

		await delay(550);
		document.getElementById('finished-weight__documents_modal').remove();

	}	
}

async function print_weight_message() {

	if(!!document.querySelector('#message-finalize-weight')) return;

	const finalize_div = document.createElement('div');
	finalize_div.id = 'message-print-weight';
	document.getElementById('message-container').appendChild(finalize_div);
	finalize_div.innerHTML = `
		<h3>¿ IMPRIMIR PESAJE ?</h3>
		<div class="row">
			<button id="print-weight__back-btn" class="svg-wrapper enabled red">
				<svg height="45" width="160" xmlns="http://www.w3.org/2000/svg">
					<rect class="shape" height="45" width="160"></rect>
				</svg>
				<div class="desc-container">
					<i class="fas fa-times-circle"></i>
					<p>CANCELAR</p>
				</div>
			</button>
			<button id="print-weight__accept-btn" class="svg-wrapper enabled green">
				<svg height="45" width="160" xmlns="http://www.w3.org/2000/svg">
					<rect class="shape" height="45" width="160"></rect>
				</svg>
				<div class="desc-container">
					<i class="fas fa-check-circle"></i>
					<p>IMPRIMIR</p>
				</div>
			</button>
		</div>`
	;
	document.querySelector('#print-weight__accept-btn').addEventListener('click', async function() {

		const btn = this;
		if (btn_double_clicked(btn)) return;

		document.querySelector('#new-weight__widget__print-weight').click();
		await delay(1500);
		document.querySelector('#print-weight__back-btn').click();

		await delay(600);
		finalize_weight_message()

	});
	document.querySelector('#print-weight__back-btn').addEventListener('click', async function() {

		const btn = this;
		if (btn_double_clicked(btn)) return;

		document.getElementById('message-section').classList.remove('active', 'centered');
		await delay(500);
		document.getElementById('message-print-weight').remove();
	});
	document.getElementById('message-section').classList.add('active', 'centered');
}

async function finalize_weight_message() {

	if(!!document.querySelector('#message-finalize-weight')) return;

	const finalize_div = document.createElement('div');
	finalize_div.id = 'message-finalize-weight';
	document.getElementById('message-container').appendChild(finalize_div);
	finalize_div.innerHTML = `
		<h3>¿ FINALIZAR PESAJE ?</h3>
		<div class="row">
			<button id="finalize-weight__back-btn" class="svg-wrapper enabled red">
				<svg height="45" width="160" xmlns="http://www.w3.org/2000/svg">
					<rect class="shape" height="45" width="160"></rect>
				</svg>
				<div class="desc-container">
					<i class="fas fa-times-circle"></i>
					<p>CANCELAR</p>
				</div>
			</button>
			<button id="finalize-weight__accept-btn" class="svg-wrapper enabled green">
				<svg height="45" width="160" xmlns="http://www.w3.org/2000/svg">
					<rect class="shape" height="45" width="160"></rect>
				</svg>
				<div class="desc-container">
					<i class="fas fa-check-circle"></i>
					<p>FINALIZAR</p>
				</div>
			</button>
		</div>`
	;
	document.querySelector('#finalize-weight__accept-btn').addEventListener('click', finalize_weight);
	document.querySelector('#finalize-weight__back-btn').addEventListener('click', async () => {
		document.getElementById('message-section').classList.remove('active', 'centered');
		await delay(500);
		document.getElementById('message-finalize-weight').remove();
	});
	document.getElementById('message-section').classList.add('active', 'centered');
}

async function finalize_weight() {

	if (btn_double_clicked(this)) return;

	const weight_id = DOMPurify().sanitize(weight_object.frozen.id);
	try {

		const
		finalize_weight = await fetch('/finalize_weight', {
			method: 'POST', 
			headers: { 
				"Content-Type" : "application/json",
				"Authorization" : token.value 
			}, 
			body: JSON.stringify({ weight_id })
		}),
		response = await finalize_weight.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

		socket.emit('weight status changed', weight_id);

		document.querySelectorAll('#pending-weights-table tbody tr').forEach(tr => { tr.remove() });

		create_pending_weights_tr(response.pending_weights);

		weight_object = null;
		document.querySelector('#weight__breadcrumb li:first-child').click();
		await delay(750);

		document.getElementById('create-weight-step-1').classList.remove('hidden');

	} catch(error) { error_handler('Error al intentar finalizar pesaje', error) }
}

async function save_weight_widget() {
	
	if (clicked) return;
	prevent_double_click();

	const 
	breadcrumbs = document.getElementById('weight__breadcrumb'),
	fade_out_div = document.getElementById('create-weight__container'),
	fade_in_div = document.getElementById('weight-menu');
	weight_object = null;

	fade_out_animation(fade_out_div);

	try {

		const 
		get_pending_weights = await fetch('/list_pending_weights', {
			method: 'GET', 
			headers: { 
				"Cache-Control" : "no-cache",
				"Authorization" : token.value 
			}
		}),
		response = await get_pending_weights.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

		while (!fade_out_div.classList.contains('animationend')) { await delay(10) }
		fade_out_div.classList.remove('animationend');

		document.querySelectorAll('#pending-weights-table tbody tr').forEach(tr => { tr.remove() });

		create_pending_weights_tr(response.pending_weights);

	} catch(error) { error_handler('Error al obtener pesajes pendientes', error) }

	document.getElementById('create-weight-step-1').classList.remove('hidden');
	fade_in_animation(fade_in_div);

	while (breadcrumbs.children.length > 1) { breadcrumbs.lastElementChild.remove() }
	document.getElementById('create-weight-step-2').remove();
	document.getElementById('create-weight__modal').innerHTML = '';
	document.getElementById('create-weight__modal').classList.remove('active');
}