import React, { useState, useEffect } from 'react';
import './Buttons.css';

const DevicesList = () => {
	const [devices, setDevices] = useState([]);

	const hostname = 'http://' + window.location.host.match(/^([^:]+)/)[1] + ':4001';

	const readDevicesAndFilters = async () => {
		const devicesResponse = await fetch(hostname + '/devices');
		const devices = await devicesResponse.json();
		devices.forEach(device => device.state = 'free');

		const filtersResponse = await fetch(hostname + '/filters');
		const filters = await filtersResponse.json();
		filters.mac.forEach(mac => {
			let device = devices.find(device2 => device2.mac == mac);
			device.state = 'restricted';
		});

		setDevices(devices);
	}

	useEffect(readDevicesAndFilters, []);

	const deviceClicked = async device => {
		const prevDeviceState = device.state;
		
		setDevices(prevState => {
			const newState = JSON.parse(JSON.stringify(prevState));
			let modifiedDevice = newState.filter(dev => dev.mac == device.mac)[0];
			modifiedDevice.state = 'pending';
			return newState;
		});

		const response = await fetch(hostname + '/' + ((prevDeviceState == 'restricted') ? 'enable' : 'disable'),
			{
				method: 'put',
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					mac: device.mac
				})
			});

		if (response.status == 200) {
			await readDevicesAndFilters();
		}
		else {
			const responseJson = await response.json();
			console.log('error: ' + responseJson);
		}
	}

	return (
		<div>
			{devices.map(device => (
				<div>
					<span className={'button ' + device.state} key={device.mac} onClick={async () => await deviceClicked(device)}>
						<span className="deviceName">{device.name}</span>
						{device.mac}
						<br />
						{device.hostname}
					</span>
				</div>
			))}
		</div>
	);

}

export default DevicesList;
